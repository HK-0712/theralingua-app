// src/App.jsx (React Query Refactored Version)

import React, { useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { getUserData } from './api/supabaseAPI'; // 導入我們的 API

// Pages and Components
import Login from './pages/Login';
import Introduction from './pages/Introduction';
import Practice from './pages/Practice';
import Records from './pages/Records';
import Profile from './pages/Profile';
import InitialTest from './pages/InitialTest';
import ClickSpark from './components/ClickSpark';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import MiniProfile from './components/MiniProfile';
import './styles/App.css';

// =================================================================
// ==   自定義 Hooks (Custom Hooks)                               ==
// =================================================================

/**
 * 專門用來獲取當前登入用戶數據的 Hook。
 * 它封裝了 React Query 的 useQuery 邏輯。
 */
const useUser = () => {
  const session = useSession();
  const userId = session?.user?.id;

  return useQuery({
    // 1. queryKey: 這是此查詢的唯一標識符。
    //    - ['user', userId] 意味著這個查詢與特定用戶相關。
    //    - 當 userId 變化時 (登入/登出)，React Query 會自動處理。
    queryKey: ['user', userId],

    // 2. queryFn: 這是實際執行數據獲取的異步函數。
    //    - 我們調用之前在 supabaseAPI.js 中定義的函數。
    queryFn: () => getUserData(userId),

    // 3. enabled: 這是一個關鍵選項！
    //    - 只有在 userId 存在時 (即用戶已登入)，這個查詢才會被觸發。
    //    - 這從根本上解決了在 session 未加載時就嘗試獲取數據的問題。
    enabled: !!userId,

    // 4. staleTime: 數據在 5 分鐘內被視為新鮮，避免不必要的重複獲取。
    staleTime: 1000 * 60 * 5,
  });
};


// =================================================================
// ==   核心 App 組件                                             ==
// =================================================================

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient(); // 獲取 queryClient 實例

  // ✨ 核心變更：用我們的自定義 Hook 取代所有 useState 和 useEffect
  const { data: userData, isLoading: isLoadingProfile, isError } = useUser();

  // 從 userData 中派生出是否完成測試的狀態
  const hasCompletedTest = !!userData?.settings?.sug_lvl;

  const handleLogout = useCallback(async () => {
    await supabaseClient.auth.signOut();
    // 登出時，清空 React Query 的緩存
    queryClient.clear();
    navigate('/login');
  }, [navigate, supabaseClient, queryClient]);

  // 這個函數現在只在 InitialTest 完成時被調用，用於導航和讓數據失效。
  // 它不再需要手動更新本地 state。
  const onTestComplete = useCallback(() => {
    // 讓用戶數據失效，React Query 會自動重新獲取最新狀態
    queryClient.invalidateQueries({ queryKey: ['user'] });
    navigate('/introduction');
  }, [navigate, queryClient]);

  // MainLayout 現在直接從 useUser hook 獲取數據，不再需要 props 傳遞
  const MainLayout = ({ children }) => (
    <div className="app-container">
      <Header
        activePage={location.pathname.split('/')[1] || 'introduction'}
        onNavigate={navigate}
        onLogout={handleLogout}
        hasCompletedTest={hasCompletedTest}
      />
      <ClickSpark>{children}</ClickSpark>
      <MiniProfile userData={userData} />
      <LanguageSelector />
    </div>
  );

  // --- 路由守衛和加載邏輯 ---
  // 這是解決「閃爍」問題的關鍵：
  // 1. session === undefined: Supabase auth 正在初始化。
  // 2. session && isLoadingProfile: 已登入，但我們的 useUser hook 正在獲取 profile。
  // 在這兩種「加載中」的狀態下，我們都顯示一個全局的加載指示器。
  const isAuthLoading = useSession() === undefined;
  if (isAuthLoading || (session && isLoadingProfile)) {
    return <div style={{ padding: 20, textAlign: 'center', fontSize: '1.2rem' }}>Loading Application...</div>;
  }

  // 如果獲取用戶數據出錯，顯示錯誤信息並提供登出選項
  if (isError) {
      return (
          <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
              <p>Error: Failed to load user profile. The session might be corrupted.</p>
              <button onClick={handleLogout}>Logout and try again</button>
          </div>
      );
  }

  // --- 路由定義 ---
  // PrivateRoute 現在只檢查 session 是否存在
  const PrivateRoute = ({ children }) => {
    return session ? children : <Navigate to="/login" state={{ from: location }} replace />;
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to={location.state?.from?.pathname || "/introduction"} replace /> : <ClickSpark><Login /></ClickSpark>}
      />

      <Route path="/" element={<Navigate to="/introduction" replace />} />

      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
      
      {/* Profile 頁面現在不再需要 onProfileUpdate prop */}
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />

      <Route
        path="/practice"
        element={
          <PrivateRoute>
            <MainLayout>
              {!hasCompletedTest ? (
                <Navigate to="/initial-test" state={{ returnTo: '/practice' }} replace />
              ) : (
                // 將用戶選擇的練習語言傳遞下去
                <Practice practiceLanguage={userData?.settings?.language || 'en'} />
              )}
            </MainLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/records"
        element={
          <PrivateRoute>
            <MainLayout>
              {!hasCompletedTest ? (
                <Navigate to="/initial-test" state={{ returnTo: '/records' }} replace />
              ) : (
                <Records />
              )}
            </MainLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/initial-test"
        element={
          <PrivateRoute>
            <MainLayout>
              {hasCompletedTest ? (
                <Navigate to={location.state?.returnTo || "/introduction"} replace />
              ) : (
                <InitialTest onTestComplete={onTestComplete} />
              )}
            </MainLayout>
          </PrivateRoute>
        }
      />

      <Route path="*" element={<p>Page Not Found</p>} />
    </Routes>
  );
}

// AppWrapper 保持不變
export default function AppWrapper() {
  return (
    <BrowserRouter>
      <SessionContextProvider supabaseClient={supabase}>
        <App />
      </SessionContextProvider>
    </BrowserRouter>
  );
}
