import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// 這個組件沒有 UI，只處理邏輯
export default function AuthCallback() {
  const navigate = useNavigate();
  const supabaseClient = useSupabaseClient();

  useEffect(() => {
    // onAuthStateChange 會在 Supabase 處理完 URL hash 後觸發
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      // 無論是登入、註冊確認還是密碼重置，只要 session 存在，就導航到主頁
      // Supabase Auth Helpers 會觸發 App.jsx 中的另一個 onAuthStateChange 來處理 PASSWORD_RECOVERY UI
      if (session) {
        // 取消訂閱，避免內存洩漏
        subscription.unsubscribe();
        // 導航到主應用區域
        navigate('/introduction');
      }
    });

    return () => {
      // 組件卸載時也取消訂閱
      subscription.unsubscribe();
    };
  }, [supabaseClient, navigate]);

  // 顯示一個全局的加載指示器
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontSize: '1.5rem',
      fontWeight: 'bold'
    }}>
      Verifying authentication...
    </div>
  );
}
