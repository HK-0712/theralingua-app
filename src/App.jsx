// src/App.jsx (Final version to support the new MiniProfile)

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
// ✨ 這裡的 getUserData 函數需要能夠獲取 status 表的資料
import { getUserData } from './api/supabaseAPI'; 

// ... (其他導入語句保持不變)
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


// =================================================================
// ==   自定義 Hooks (Custom Hooks)                               ==
// =================================================================
const useUser = () => {
  const session = useSession();
  const userId = session?.user?.id;
  return useQuery({
    queryKey: ['user', userId],
    // ✨ 假設 getUserData 現在會返回 { ..., settings: {...}, status: {...} }
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

  const { data: profileData, isLoading: isLoadingProfile, isError } = useUser();
  const hasCompletedTest = !!profileData?.settings?.sug_lvl;

  const combinedUserData = useMemo(() => {
    if (!profileData) return null;
    
    return {
      ...profileData,
      email: session?.user?.email,
    };
  }, [session, profileData]);

  // ... (useEffect 和其他函數保持不變)
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

  // ... (其餘的 JSX 和路由保持不變)
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
      
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} />
      <Route path="/practice" element={<PrivateRoute><MainLayout><Practice practiceLanguage={combinedUserData?.settings?.language || 'en'} /></MainLayout></PrivateRoute>} />
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
