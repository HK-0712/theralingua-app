// src/App.jsx (Corrected Final Version with All Imports)

import React, { useCallback, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { getUserData } from './api/supabaseAPI';

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
import ResetPassword from './components/ResetPassword';
import AuthCallback from './pages/AuthCallback'; // ✨ 這是我之前遺漏的導入語句

// =================================================================
// ==   自定義 Hooks (Custom Hooks)                               ==
// =================================================================
const useUser = () => {
  const session = useSession();
  const userId = session?.user?.id;
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserData(userId),
    enabled: !!userId,
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
  const queryClient = useQueryClient();

  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const { data: userData, isLoading: isLoadingProfile, isError } = useUser();
  const hasCompletedTest = !!userData?.settings?.sug_lvl;

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const handleLogout = useCallback(async () => {
    await supabaseClient.auth.signOut();
    queryClient.clear();
    navigate('/login');
  }, [navigate, supabaseClient, queryClient]);

  const onTestComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
    navigate('/introduction');
  }, [navigate, queryClient]);

  const handlePasswordUpdated = () => {
    // 隱藏重置密碼界面
    setShowPasswordReset(false);
    // 調用我們已經寫好的 handleLogout 函數！
    // handleLogout 會負責：
    // 1. 登出 Supabase
    // 2. 清理 React Query 緩存
    // 3. 導航到 /login 頁面
    handleLogout(); 
  };

  const MainLayout = ({ children }) => (
    <div className="app-container">
      {showPasswordReset && <ResetPassword onPasswordUpdated={handlePasswordUpdated} />}
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

  const isAuthLoading = useSession() === undefined;
  if (isAuthLoading || (session && isLoadingProfile)) {
    return <div style={{ padding: 20, textAlign: 'center', fontSize: '1.2rem' }}>Loading Application...</div>;
  }
  if (isError) {
      return (
          <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
              <p>Error: Failed to load user profile. The session might be corrupted.</p>
              <button onClick={handleLogout}>Logout and try again</button>
          </div>
      );
  }
  const PrivateRoute = ({ children }) => {
    return session ? children : <Navigate to="/login" state={{ from: location }} replace />;
  };

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to={location.state?.from?.pathname || "/introduction"} replace /> : <ClickSpark><Login /></ClickSpark>} />
      <Route path="/" element={<Navigate to="/introduction" replace />} />
      
      {/* 添加 /auth/callback 路由 */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
      <Route path="/practice" element={<PrivateRoute><MainLayout><Practice practiceLanguage={userData?.settings?.language || 'en'} /></MainLayout></PrivateRoute>} />
      <Route path="/records" element={<PrivateRoute><MainLayout><Records /></MainLayout></PrivateRoute>} />
      <Route path="/initial-test" element={<PrivateRoute><MainLayout>{hasCompletedTest ? <Navigate to={location.state?.returnTo || "/introduction"} replace /> : <InitialTest onTestComplete={onTestComplete} />}</MainLayout></PrivateRoute>} />
      
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
