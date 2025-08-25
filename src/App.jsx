// src/App.jsx

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { getFullUserProfile } from './api/supabaseAPI'; 

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

// --- 全螢幕載入元件 ---
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

// --- 自定義 Hook: 獲取用戶數據 ---
const useUser = () => {
  const session = useSession();
  const userId = session?.user?.id;
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getFullUserProfile(userId), 
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 分鐘
  });
};

// --- App 主元件 ---
function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();

  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const { data: profileData, isLoading: isLoadingProfile, isError } = useUser();
  
  const hasCompletedTest = !!profileData?.settings?.[0]?.sug_lvl;

  const combinedUserData = useMemo(() => {
    if (!session || !profileData) return null;
    return { 
      ...profileData, 
      email: session.user.email,
      settings: profileData.settings?.[0] || {},
      status: profileData.status?.[0] || {}
    };
  }, [session, profileData]);

  const practiceLanguage = combinedUserData?.settings?.language || 'en';

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        navigate('/login');
      }
    });
    return () => subscription.unsubscribe();
  }, [supabaseClient, navigate, queryClient]);

  const handleLogout = useCallback(async () => {
    await supabaseClient.auth.signOut();
  }, [supabaseClient]);

  const onTestComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
    navigate('/introduction');
  }, [navigate, queryClient]);

  const handlePasswordUpdated = () => {
    setShowPasswordReset(false);
    handleLogout(); 
  };

  // --- 共享佈局元件 ---
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

  if (session && isLoadingProfile) {
    return <FullScreenLoader />;
  }
  
  if (isError) {
      return (
          <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
              <p>Error: Failed to load user profile.</p>
              <button onClick={handleLogout}>Logout and try again</button>
          </div>
      );
  }

  // --- 路由守衛 ---
  const PrivateRoute = ({ children }) => {
    return session ? children : <Navigate to="/login" state={{ from: location }} replace />;
  };

  // --- 路由結構 ---
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to={location.state?.from?.pathname || "/introduction"} replace /> : <ClickSpark><Login /></ClickSpark>} />
      <Route path="/" element={<Navigate to="/introduction" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
      
      <Route 
        path="/practice" 
        element={<PrivateRoute><MainLayout><Practice practiceLanguage={practiceLanguage} /></MainLayout></PrivateRoute>} 
      />
      
      <Route 
        path="/records" 
        element={<PrivateRoute><MainLayout><Records /></MainLayout></PrivateRoute>} 
      />
      
      <Route 
        path="/initial-test" 
        element={
          <PrivateRoute>
            <MainLayout>
              {hasCompletedTest ? (
                <Navigate to={location.state?.from?.pathname || "/introduction"} replace />
              ) : (
                <InitialTest onTestComplete={onTestComplete} practiceLanguage={practiceLanguage} />
              )}
            </MainLayout>
          </PrivateRoute>
        } 
      />
      
      <Route path="*" element={<p>Page Not Found</p>} />
    </Routes>
  );
}

// --- 帶有認證載入邏輯的 App 包裹器 ---
const AppWithAuth = () => {
  const session = useSession();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (session !== undefined) {
      const timer = setTimeout(() => {
        setInitialLoad(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [session]);

  if (initialLoad) {
    return <FullScreenLoader />;
  }

  return <App />;
};

// --- 最終導出的根元件 ---
export default function AppWrapper() {
  return (
    <BrowserRouter>
      <SessionContextProvider supabaseClient={supabase}>
        <AppWithAuth />
      </SessionContextProvider>
    </BrowserRouter>
  );
}
