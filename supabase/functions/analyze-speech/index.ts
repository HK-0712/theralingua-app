// supabase/functions/analyze-speech/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 證書內容 ，從環境變數中讀取
// 稍後我們會在 Supabase 儀表板中設置這個環境變數
const CERT_PEM = Deno.env.get('ASR_CERT_PEM');

// ASR 伺服器的固定 URL
const ASR_SERVER_URL = 'https://203.176.210.154:8443/analyze';

Deno.serve(async (req ) => {
  // 處理 OPTIONS 預檢請求 (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. 創建一個有 service_role 權限的 Supabase 客戶端
    //    這樣它才能繞過 RLS 讀取 secure_storage 表
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. 從 "鑰匙櫃" 中讀取 API Key
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('secure_storage')
      .select('key_value')
      .eq('key_name', 'ASR_API_KEY')
      .single();

    if (apiKeyError || !apiKeyData) {
      throw new Error('Failed to retrieve API key from database.');
    }
    const apiKey = apiKeyData.key_value;

    // 3. 從前端請求中解析出 FormData
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const targetWord = formData.get('target_word') as string;

    // 簡單驗證
    if (!(audioFile instanceof File)) {
      throw new Error('No audio file provided or invalid format.');
    }
    if (!targetWord) {
      throw new Error('Target word is required.');
    }

    // 4. 構造對 ASR 伺服器的請求
    const asrRequestData = new FormData();
    asrRequestData.append('file', audioFile);
    asrRequestData.append('target_word', targetWord);

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
    };

    // 5. 發起 fetch 請求到 ASR 伺服器
    //    注意：Deno 的 fetch 不直接支持 `verify`，但我們可以傳入 CA 證書
    //    如果 ASR 伺服器使用的是自簽名證書，這一步是必須的
    const response = await fetch(ASR_SERVER_URL, {
      method: 'POST',
      headers: headers,
      body: asrRequestData,
      // @ts-ignore: Deno-specific TLS options
      tls: {
        caCerts: CERT_PEM ? [CERT_PEM] : [],
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ASR server returned an error: ${response.status} ${errorBody}`);
    }

    // 6. 將 ASR 伺服器的響應返回給前端
    const asrResult = await response.json();

    // 返回成功的響應
    return new Response(
      JSON.stringify(asrResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // 統一處理錯誤
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
