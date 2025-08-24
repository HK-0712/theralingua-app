// src/App.jsx (The final, robust solution for the screen flash issue)

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { getUserData } from './api/supabaseAPI'; 

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
import AuthCallback from './pages/AuthCallback';

// --- ✨ 核心修改 1：創建一個全螢幕載入元件 ✨ ---
const FullScreenLoader = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--background-light)',
    zIndex: 9999,
  }}>
    <div style={{ fontSize: '1.5rem', color: 'var(--text-medium)', fontWeight: '600' }}>
      Loading Application...
    </div>
  </div>
);

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

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();

  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const { data: profileData, isLoading: isLoadingProfile, isError } = useUser();
  const hasCompletedTest = !!profileData?.settings?.sug_lvl;

  const combinedUserData = useMemo(() => {
    if (!profileData) return null;
    return { ...profileData, email: session?.user?.email };
  }, [session, profileData]);

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setShowPasswordReset(true);
    });
    return () => subscription.unsubscribe();
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
    setShowPasswordReset(false);
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
      <MiniProfile userData={combinedUserData} />
      <LanguageSelector />
    </div>
  );

  // ✨ 核心修改 2：移除 App 內部所有載入判斷邏輯 ✨
  // 讓 App 元件只專注於已登入後的狀態
  if (session && isLoadingProfile) {
    return <FullScreenLoader />; // 在獲取 profile 時，依然顯示載入畫面
  }
  
  if (isError) {
      return (
          <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
              <p>Error: Failed to load user profile.</p>
              <button onClick={handleLogout}>Logout and try again</button>
          </div>
      );
  }

  const PrivateRoute = ({ children }) => {
    // 這個判斷現在是絕對安全的，因為 AppWrapper 確保了 session 狀態的確定性
    return session ? children : <Navigate to="/login" state={{ from: location }} replace />;
  };

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to={location.state?.from?.pathname || "/introduction"} replace /> : <ClickSpark><Login /></ClickSpark>} />
      <Route path="/" element={<Navigate to="/introduction" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
      <Route path="/practice" element={<PrivateRoute><MainLayout><Practice practiceLanguage={combinedUserData?.settings?.language || 'en'} /></MainLayout></PrivateRoute>} />
      <Route path="/records" element={<PrivateRoute><MainLayout><Records /></MainLayout></PrivateRoute>} />
      <Route path="/initial-test" element={<PrivateRoute><MainLayout>{hasCompletedTest ? <Navigate to={location.state?.from?.pathname || "/introduction"} replace /> : <InitialTest onTestComplete={onTestComplete} />}</MainLayout></PrivateRoute>} />
      <Route path="*" element={<p>Page Not Found</p>} />
    </Routes>
  );
}

// --- ✨ 核心修改 3：將所有載入邏輯集中到 AppWrapper 中 ✨ ---
const AppWithAuth = () => {
  const session = useSession();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // 當 session 狀態從 undefined 變為確定值 (null 或 session 物件) 時
    if (session !== undefined) {
      // 我們強制凍結畫面 0.5 秒，確保所有 DOM 和 JS 都已準備就緒
      const timer = setTimeout(() => {
        setInitialLoad(false);
      }, 100); // 0.1 秒凍結時間
      return () => clearTimeout(timer);
    }
  }, [session]);

  // 在初始載入完成前，只渲染載入畫面，不渲染 App
  if (initialLoad) {
    return <FullScreenLoader />;
  }

  // 初始載入完成後，才渲染真正的 App
  return <App />;
};

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <SessionContextProvider supabaseClient={supabase}>
        <AppWithAuth />
      </SessionContextProvider>
    </BrowserRouter>
  );
}
