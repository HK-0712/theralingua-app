// supabase/functions/analyze-speech/index.ts (The Final, Syntax-Corrected Version)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ==============================================================================
// 步驟 1: 核心資源與輔助函數 (TypeScript 移植版 )
// ==============================================================================

// 音標列表 (從 Python 移植)
const CMUDICT_PHONEMES: string[] = [
    'p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h',
    'tʃ', 'dʒ', 'm', 'n', 'ŋ', 'l', 'r', 'w', 'j', 'i', 'ɪ', 'ɛ', 'æ', 'u',
    'ʊ', 'ɑ', 'ʌ', 'ə', 'aɪ', 'aʊ', 'ɔɪ', 'eɪ', 'oʊ', 'ɝ'
];
const SORTED_CMUDICT_PHONEMES = [...CMUDICT_PHONEMES].sort((a, b) => b.length - a.length);

function cleanIpaString(ipaString: string): string {
    if (!ipaString) return '';
    return ipaString.replace(/ɡ/g, 'g').replace(/ɫ/g, 'l').replace(/ɹ/g, 'r')
                    .replace(/[ˈˌː]/g, "")
                    .replace(/[\/\[\]()]/g, '')
                    .trim();
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
        } else {
            i += 1;
        }
    }
    return phonemes;
}

interface AlignmentError {
    type: 'Substitution' | 'Deletion' | 'Insertion';
    target: string | null;
    actual: string | null;
}

// ✨✨✨ 唯一的語法修正發生在這個函數中 ✨✨✨
function alignAndFindErrors(targetPhonemes: string[], actualPhonemes: string[]): {
    errors: AlignmentError[],
    errorCount: number,
    alignedTarget: string[],
    alignedActual: string[]
} {
    const substitutionCost = 1, indelCost = 1;
    const n = targetPhonemes.length, m = actualPhonemes.length;
    
    // 定義 DP 表格元素的類型
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
            // 修正 reduce 的用法，為其提供一個初始值
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
            alignedTarget.push(targetPhoneme);
            alignedActual.push(actualPhoneme);
            if (targetPhoneme !== actualPhoneme) {
                errors.push({ type: 'Substitution', target: targetPhoneme, actual: actualPhoneme });
            }
            i--; j--;
        } else if (direction === 'up') {
            alignedTarget.push(targetPhonemes[i - 1]);
            alignedActual.push('-');
            errors.push({ type: 'Deletion', target: targetPhonemes[i - 1], actual: null });
            i--;
        } else { // 'left'
            alignedTarget.push('-');
            alignedActual.push(actualPhonemes[j - 1]);
            errors.push({ type: 'Insertion', target: null, actual: actualPhonemes[j - 1] });
            j--;
        }
    }
    
    return {
        errors: errors.reverse(),
        errorCount: errors.length,
        alignedTarget: alignedTarget.reverse(),
        alignedActual: alignedActual.reverse()
    };
}

// ==============================================================================
// 步驟 2: 主服務函數 (保持不變)
// ==============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const targetWord = formData.get('target_word') as string;
    const language = formData.get('language') as string;

    if (!(audioFile instanceof File) || !targetWord || !language) {
      throw new Error('Missing file, target_word, or language parameter.');
    }

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

    const targetPhonemes = segmentIpa(asrResult.target_ipa);
    const userPhonemes = segmentIpa(asrResult.asr_ipa);
    
    const { errors, errorCount, alignedTarget, alignedActual } = alignAndFindErrors(targetPhonemes, userPhonemes);

    const finalResult = {
        target_word: asrResult.target_word,
        possible_ipa: [asrResult.target_ipa],
        user_ipa: asrResult.asr_ipa,
        best_match_ipa: asrResult.target_ipa,
        aligned_target: alignedTarget,
        aligned_user: alignedActual,
        error_count: errorCount,
        phoneme_count: targetPhonemes.length,
        error_summary: errors
    };

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
