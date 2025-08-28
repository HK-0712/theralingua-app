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

// --- 全螢幕載入元件 (保持不變) ---
const FullScreenLoader = () => (
  <div style={{
    position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'var(--background-light)', zIndex: 9999,
  }}>
    <div style={{ fontSize: '1.5rem', color: 'var(--text-medium)', fontWeight: '600' }}>
      Loading Application...
    </div>
  </div>
);

// --- 自定義 Hook: 獲取用戶數據 (保持不變) ---
const useUser = () => {
  const session = useSession();
  const userId = session?.user?.id;
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getFullUserProfile(userId), 
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
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
  
  // =================================================================
  // == ✨✨✨ 核心錯誤修復 ✨✨✨
  // == Supabase 的一對一關聯返回的是物件，不是陣列，所以我們移除 [0]
  // =================================================================
  const userSettings = useMemo(() => profileData?.settings || {}, [profileData]);
  const practiceLanguage = userSettings?.language || 'en';

  // 2. 然後，基於練習語言，從 status 陣列中篩選出正確的狀態
  const userStatus = useMemo(() => {
    if (!profileData?.status) return {};
    // .find() 會返回第一個匹配的元素，或者 undefined
    return profileData.status.find(s => s.language === practiceLanguage) || {};
  }, [profileData, practiceLanguage]);

  // 3. 最後，將所有數據合併成一個清晰、準確的對象
  const combinedUserData = useMemo(() => {
    if (!session || !profileData) return null;
    return { 
      ...profileData, 
      email: session.user.email,
      settings: userSettings, // 使用我們已經計算好的 settings
      status: userStatus,     // 使用我們精準篩選出的 status
    };
  }, [session, profileData, userSettings, userStatus]);

  // 現在這個邏輯可以正確工作了
  const hasCompletedTest = !!userSettings?.sug_lvl;

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setShowPasswordReset(true);
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

  // --- 共享佈局元件 (保持不變) ---
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

  if (session && isLoadingProfile) return <FullScreenLoader />;
  if (isError) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
        <p>Error: Failed to load user profile.</p>
        <button onClick={handleLogout}>Logout and try again</button>
      </div>
    );
  }

  // --- 路由守衛 (保持不變) ---
  const PrivateRoute = ({ children }) => {
    return session ? children : <Navigate to="/login" state={{ from: location }} replace />;
  };

  // --- 路由結構 (保持不變) ---
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

// --- 帶有認證載入邏輯的 App 包裹器 (保持不變) ---
const AppWithAuth = () => {
  const session = useSession();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (session !== undefined) {
      const timer = setTimeout(() => setInitialLoad(false), 100);
      return () => clearTimeout(timer);
    }
  }, [session]);

  if (initialLoad) return <FullScreenLoader />;

  return <App />;
};

// --- 最終導出的根元件 (保持不變) ---
export default function AppWrapper() {
  return (
    <BrowserRouter>
      <SessionContextProvider supabaseClient={supabase}>
        <AppWithAuth />
      </SessionContextProvider>
    </BrowserRouter>
  );
}
