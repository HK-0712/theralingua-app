// supabase/functions/analyze-speech/index.ts (Final Corrected Version)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ==============================================================================
// 核心資源與輔助函數 (這部分完全沒有變更 )
// ==============================================================================

const CMUDICT_PHONEMES: string[] = [
    'p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h',
    'tʃ', 'dʒ', 'm', 'n', 'ŋ', 'l', 'r', 'w', 'j', 'i', 'ɪ', 'ɛ', 'æ', 'u',
    'ʊ', 'ɑ', 'ʌ', 'ə', 'aɪ', 'aʊ', 'ɔɪ', 'eɪ', 'oʊ', 'ɝ'
];
const SORTED_CMUDICT_PHONEMES = [...CMUDICT_PHONEMES].sort((a, b ) => b.length - a.length);

function cleanIpaString(ipaString: string): string {
    if (!ipaString) return '';
    return ipaString.replace(/ɡ/g, 'g').replace(/ɫ/g, 'l').replace(/ɹ/g, 'r')
                    .replace(/[ˈˌː]/g, "").replace(/[\/\[\]()]/g, '').trim();
}

function segmentIpa(ipaString: string): string[] {
    const phonemes: string[] = [];
    const cleanedIpa = cleanIpaString(ipaString);
    let i = 0;
    while (i < cleanedIpa.length) {
        const match = SORTED_CMUDICT_PHONEMES.find(p => cleanedIpa.startsWith(p, i));
        if (match) {
            phonemes.push(match);
            i += match.length;
        } else { i += 1; }
    }
    return phonemes;
}

interface AlignmentError {
    type: 'Substitution' | 'Deletion' | 'Insertion';
    target: string | null;
    actual: string | null;
}

function alignAndFindErrors(targetPhonemes: string[], actualPhonemes: string[]): {
    errors: AlignmentError[], errorCount: number, alignedTarget: string[], alignedActual: string[]
} {
    const substitutionCost = 1, indelCost = 1;
    const n = targetPhonemes.length, m = actualPhonemes.length;
    type DP_Cell = { cost: number, dir: 'diag' | 'left' | 'up' | '' };
    const dp: DP_Cell[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill({ cost: 0, dir: '' }));
    for (let i = 1; i <= n; i++) dp[i][0] = { cost: i * indelCost, dir: 'up' };
    for (let j = 1; j <= m; j++) dp[0][j] = { cost: j * indelCost, dir: 'left' };
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = targetPhonemes[i - 1] === actualPhonemes[j - 1] ? 0 : substitutionCost;
            const scores: DP_Cell[] = [
                { cost: dp[i - 1][j - 1].cost + cost, dir: 'diag' as const },
                { cost: dp[i][j - 1].cost + indelCost, dir: 'left' as const },
                { cost: dp[i - 1][j].cost + indelCost, dir: 'up' as const }
            ];
            dp[i][j] = scores.reduce((min, s) => s.cost < min.cost ? s : min, scores[0]);
        }
    }
    const errors: AlignmentError[] = [];
    const alignedTarget: string[] = [];
    const alignedActual: string[] = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
        const direction = dp[i][j].dir;
        if (direction === 'diag') {
            const targetPhoneme = targetPhonemes[i - 1];
            const actualPhoneme = actualPhonemes[j - 1];
            alignedTarget.push(targetPhoneme); alignedActual.push(actualPhoneme);
            if (targetPhoneme !== actualPhoneme) errors.push({ type: 'Substitution', target: targetPhoneme, actual: actualPhoneme });
            i--; j--;
        } else if (direction === 'up') {
            alignedTarget.push(targetPhonemes[i - 1]); alignedActual.push('-');
            errors.push({ type: 'Deletion', target: targetPhonemes[i - 1], actual: null });
            i--;
        } else {
            alignedTarget.push('-'); alignedActual.push(actualPhonemes[j - 1]);
            errors.push({ type: 'Insertion', target: null, actual: actualPhonemes[j - 1] });
            j--;
        }
    }
    return { errors: errors.reverse(), errorCount: errors.length, alignedTarget: alignedTarget.reverse(), alignedActual: alignedActual.reverse() };
}

function getErrorPhonemes(errors: AlignmentError[]): string[] {
    const errorPhonemes = errors
        .filter(err => (err.type === 'Substitution' || err.type === 'Deletion') && err.target)
        .map(err => err.target!);
    return [...new Set(errorPhonemes)].sort();
}

// generateFullLog 函數現在是正確的，無需修改
function generateFullLog(result: {
    target_word: string, possible_ipa: string[], user_ipa: string,
    best_match_ipa: string, aligned_target: string[], aligned_user: string[],
    error_count: number, phoneme_count: number, error_summary: string[],
    difficulty_level: string 
}): string {
    const allPhonemes = [...result.aligned_target, ...result.aligned_user];
    const maxLen = allPhonemes.length > 0 ? Math.max(...allPhonemes.map(p => p.length)) : 1;
    const formatPhoneme = (p: string) => p.padEnd(maxLen, ' ');
    const targetLine = result.aligned_target.map(formatPhoneme).join(' ');
    const userLine = result.aligned_user.map(formatPhoneme).join(' ');

    return `【Diagnosis Layer】
  - Target: '${result.target_word}', Possible IPAs: [${result.possible_ipa.map(p => `'${p}'`).join(', ')}]
  - User Input: ${result.user_ipa}
  - Best Match: '${result.best_match_ipa}'
  - Difficulty Level: ${result.difficulty_level}
【Phoneme Alignment】
  Target: [ ${targetLine} ]
  User  : [ ${userLine} ]
  - Diagnosis Complete: Found ${result.error_count} error(s) in a ${result.phoneme_count}-phoneme word.
  - Detected Errors: [${result.error_summary.map(p => `'${p}'`).join(', ')}]`;
}

function getDynamicErrorThreshold(phonemeCount: number): number {
    if (phonemeCount <= 2) return phonemeCount + 1;
    if (phonemeCount >= 3 && phonemeCount <= 5) return 2;
    if (phonemeCount >= 6) return 3;
    return 3;
}

function areErrorsOnlyInsertion(errors: AlignmentError[]): boolean {
    if (errors.length === 0) return false;
    return errors.every(err => err.type === 'Insertion');
}

async function getNewPracticeWord(supabaseAdmin: SupabaseClient, params: { phoneme: string; difficulty_level: string; language: string; }): Promise<string | null> {
    try {
        const { data, error } = await supabaseAdmin.functions.invoke('generate-practice-word', {
            body: params
        });
        if (error) throw error;
        return data?.practice_word || null;
    } catch (e) {
        console.error("Error invoking 'generate-practice-word' function:", e.message);
        return null;
    }
}

// ==============================================================================
// 主服務函數 (最終修正版)
// ==============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    // 1. 解析請求 (不變)
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const targetWord = formData.get('target_word') as string;
    const language = formData.get('language') as string;

    if (!(audioFile instanceof File) || !targetWord || !language) {
      throw new Error('Missing file, target_word, or language parameter.');
    }

    // 2. 初始化 Supabase 客戶端並調用 ASR (不變)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const urlKey = `ASR_URL_${language.toUpperCase()}`;
    const { data: urlData, error: urlError } = await supabaseAdmin.from('secure_storage').select('key_value').eq('key_name', urlKey).single();
    if (urlError || !urlData) throw new Error(`Could not find ASR URL for language '${language}'.`);
    const asrServerUrl = urlData.key_value;

    const apiKeyKey = 'ASR_API_KEY';
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin.from('secure_storage').select('key_value').eq('key_name', apiKeyKey).single();
    if (apiKeyError || !apiKeyData) throw new Error('Could not find ASR API Key.');
    const apiKey = apiKeyData.key_value;

    const asrRequestData = new FormData();
    asrRequestData.append('file', audioFile);
    asrRequestData.append('target_word', targetWord);
    const headers = { 'Authorization': `Bearer ${apiKey}` };

    const asrResponse = await fetch(asrServerUrl, { method: 'POST', headers, body: asrRequestData });
    if (!asrResponse.ok) {
      const errorBody = await asrResponse.text();
      throw new Error(`ASR server returned an error: ${asrResponse.status} ${errorBody}`);
    }
    const asrResult = await asrResponse.json();

    // 3. 執行發音分析 (不變)
    const targetPhonemes = segmentIpa(asrResult.target_ipa);
    const userPhonemes = segmentIpa(asrResult.asr_ipa);
    const { errors, errorCount, alignedTarget, alignedActual } = alignAndFindErrors(targetPhonemes, userPhonemes);
    const errorPhonemes = getErrorPhonemes(errors);

    const finalResult = {
        target_word: asrResult.target_word,
        possible_ipa: [asrResult.target_ipa],
        user_ipa: asrResult.asr_ipa,
        best_match_ipa: asrResult.target_ipa,
        aligned_target: alignedTarget,
        aligned_user: alignedActual,
        error_count: errorCount,
        phoneme_count: targetPhonemes.length,
        error_summary: errorPhonemes
    };

    // 4. 獲取用戶 ID (不變)
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
        throw new Error("User not found or invalid token.");
    }
    const userId = user.id;

    // ✨✨✨【核心修正 1】: 在所有邏輯開始前，先獲取用戶狀態 ✨✨✨
    const { data: userStatus, error: userStatusError } = await supabaseAdmin
        .from('user_status')
        .select('cur_lvl')
        .eq('user_id', userId)
        .eq('language', language)
        .single();

    // 如果獲取失敗，提供一個安全的預設值
    if (userStatusError) {
        console.error(`Could not fetch user level for ${userId}:`, userStatusError.message);
    }
    const currentDifficulty = userStatus?.cur_lvl || 'Primary-School';

    const referer = req.headers.get('referer') || '';
    const isInitialTest = referer.includes('/initial-test');

    // ✨✨✨【核心修正 2】: 將獲取到的難度等級傳遞給 generateFullLog ✨✨✨
    let fullLogText = generateFullLog({ ...finalResult, difficulty_level: currentDifficulty });
    let errorSummaryForDb = errorPhonemes.join(', ');

    if (!isInitialTest) {
        const phonemeCount = finalResult.phoneme_count;
        const allowedErrors = getDynamicErrorThreshold(phonemeCount);
        let decisionLog = "\n【Decision & Generation Layer】\n";

        if (errorCount > allowedErrors) {
            decisionLog += `  - Decision: The number of errors (${errorCount}) is too high for a word of this length (threshold: ${allowedErrors}). Let's try this word again.`;
        } else if (errorCount === 0) {
            decisionLog += "  - Decision: Perfect pronunciation! No practice needed.";
        } else if (areErrorsOnlyInsertion(errors)) {
            decisionLog += "  - Decision: Only insertion errors. Your pronunciation is very accurate! You just added some extra sounds. Try to match the target word's syllables exactly.";
        } else {
            const trainablePhonemes = getErrorPhonemes(errors);
            if (trainablePhonemes.length > 0) {
                decisionLog += `  - Decision: Initiating practice generation for [${trainablePhonemes.map(p => `'${p}'`).join(', ')}].`;
                
                // ✨✨✨【核心修正 3】: 直接使用我們已經獲取到的 currentDifficulty ✨✨✨
                const difficultyForLlm = currentDifficulty.toLowerCase().replace(/-/g, '_');

                const newWord = await getNewPracticeWord(supabaseAdmin, {
                    phoneme: trainablePhonemes[0],
                    difficulty_level: difficultyForLlm, // 使用正確的難度等級
                    language: language
                });

                if (newWord) {
                    decisionLog += `\n      ➡️  Recommended Practice Word: "${newWord}"`;
                } else {
                    decisionLog += `\n      ➡️  Could not generate a practice word for ['${trainablePhonemes[0]}'] at this difficulty.`;
                }
            } else {
                 decisionLog += "  - Decision: Errors found, but they are not trainable.";
            }
        }
        fullLogText += decisionLog;
    }

    // 5. 更新 user_status 表 (不變)
    const { error: updateError } = await supabaseAdmin
      .from('user_status')
      .update({
        cur_err: errorSummaryForDb,
        cur_log: fullLogText,
      })
      .eq('user_id', userId)
      .eq('language', language);

    if (updateError) {
      console.error(`Failed to update user_status for user ${userId}:`, updateError);
    }

    // 6. 返回響應 (不變)
    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge Function Internal Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
