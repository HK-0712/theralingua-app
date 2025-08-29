// supabase/functions/generate-practice-word/index.ts (The Final, Correct & Simple Version)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 這個函數現在只負責轉發請求 ，不做任何額外處理
async function callLlmService(
  supabaseAdmin: SupabaseClient,
  params: { phoneme: string; difficulty_level: string; language: string; }
): Promise<any> {
  const { phoneme, difficulty_level, language } = params;

  // 1. 獲取正確的 URL 和通用的 Key
  const urlKey = `ASR_URL_${language.toUpperCase()}`;
  const { data: llmUrlData } = await supabaseAdmin.from('secure_storage').select('key_value').eq('key_name', urlKey).single();
  const { data: llmKeyData } = await supabaseAdmin.from('secure_storage').select('key_value').eq('key_name', 'ASR_API_KEY').single();

  if (!llmUrlData || !llmKeyData) {
    throw new Error("Backend service URL or API Key is missing in the database.");
  }

  const llmUrl = llmUrlData.key_value;
  const llmApiKey = llmKeyData.key_value;

  // 2. ✨✨✨ [核心修正] 嚴格按照 Postman 成功案例構建 form-data 請求體 ✨✨✨
  const requestBody = new FormData();
  requestBody.append('phoneme', phoneme);
  requestBody.append('difficulty_level', difficulty_level);

  // 3. 發送請求
  const llmResponse = await fetch(llmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${llmApiKey}`,
      // 注意：當 body 是 FormData 時，不要手動設置 'Content-Type'
    },
    body: requestBody,
  });

  if (!llmResponse.ok) {
    const errorBody = await llmResponse.text();
    throw new Error(`Backend LLM service failed: ${errorBody}`);
  }

  return await llmResponse.json();
}

// 主服務函數
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ✨✨✨ [核心修正] 請求體是 form-data，不是 JSON ✨✨✨
    const formData = await req.formData();
    const phoneme = formData.get('phoneme') as string;
    const difficulty_level = formData.get('difficulty_level') as string;
    const language = formData.get('language') as string;

    if (!phoneme || !difficulty_level || !language) {
      throw new Error("Missing 'phoneme', 'difficulty_level', or 'language' in request form-data.");
    }

    // 直接調用服務
    const llmData = await callLlmService(supabaseAdmin, { phoneme, difficulty_level, language });

    // 返回成功結果
    return new Response(
      JSON.stringify(llmData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge Function Internal Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
