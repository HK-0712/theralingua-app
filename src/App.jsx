// src/App.jsx (The Final Version with Correct Guarding)

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './supabaseClient';

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


const PrivateRoute = ({ children }) => {
  const session = useSession();
  const location = useLocation(); // 使用 location 來建立返回路徑
  const isLoading = session === undefined;

  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }
  
  if (!session) {
    // 保存當前 URL，以便登入後返回（使用 location.pathname 保留 query/hash）
    return <Navigate to="/login" state={{ from: location.pathname + location.search + location.hash }} replace />;
  }

  return children;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation(); // 供整個 App 使用（例如 login redirect / initial-test returnTo）
  const session = useSession();
  const supabaseClient = useSupabaseClient();

  const [userData, setUserData] = useState(null);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);
  // ✨ 核心修正 1: 讓 isLoadingProfile 的初始值為 true，這更符合邏輯
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session) {
        // 我們不再需要在異步函數開始時設定 loading，因為初始值已經是 true
        // setIsLoadingProfile(true); 
        try {
          const { data, error } = await supabaseClient
            .from('profiles')
            .select('*, user_settings(*)')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;

          const finalUserData = { 
            ...data,
            email: session.user.email, 
            created_at: session.user.created_at,
          };
          setUserData(finalUserData);
          setHasCompletedTest(!!finalUserData.user_settings?.sug_lvl);

        } catch (error) {
          console.error("Error fetching user data:", error);
          await supabaseClient.auth.signOut();
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setUserData(null);
        setHasCompletedTest(false);
        setIsLoadingProfile(false); // 確保在登出時也設置為 false
      }
    };

    fetchUserData();
  }, [session, supabaseClient]);

  const handleLogout = useCallback(async () => {
    await supabaseClient.auth.signOut();
    navigate('/login');
  }, [navigate, supabaseClient]);

  const onTestComplete = useCallback(async () => {
    if (!session) return;
    try {
        const { error } = await supabaseClient
            .from('user_settings')
            .update({ sug_lvl: 'Primary-School' })
            .eq('user_id', session.user.id);
        if (error) throw error;
        
        setHasCompletedTest(true);
        setUserData(prev => ({
            ...prev,
            user_settings: { ...prev.user_settings, sug_lvl: 'Primary-School' }
        }));
        navigate('/introduction');
    } catch(error) {
        console.error("Failed to mark test as complete:", error);
    }
  }, [session, supabaseClient, navigate]);

  const handleProfileUpdate = useCallback((updatedData) => {
    setUserData(updatedData);
  }, []);


  const MainLayout = ({ children }) => (
    <div className="app-container">
      <Header activePage={window.location.pathname.split('/')[1] || 'introduction'} onNavigate={navigate} onLogout={handleLogout} hasCompletedTest={hasCompletedTest} />
      <ClickSpark>{children}</ClickSpark>
      <MiniProfile userData={userData} />
      <LanguageSelector />
    </div>
  );

  // 等待條件：如果 session 還在初始化（undefined），或 session 存在但 profile 還在載入，
  // 都不要渲染 Routes，以免在未完全知道狀態前造成錯誤的導向。
  if (session === undefined || (session && isLoadingProfile)) {
    return <div style={{padding:20}}>Loading authentication/profile...</div>;
  }

  return (
    <Routes>
      {/* /login 現在會在登入後導回原始想去的路徑（若有） */}
      <Route 
        path="/login" 
        element={session ? <Navigate to={location.state?.from || "/"} replace /> : <ClickSpark><Login /></ClickSpark>} 
      />
      
      {/* 根路由 - 僅在直接訪問 "/" 時顯示 Introduction */}
      <Route 
        path="/" 
        element={
          <PrivateRoute>
            <MainLayout>
              <Introduction />
            </MainLayout>
          </PrivateRoute>
        } 
      />

      {/* 其他路由保持 URL，僅在必要情況下（未完成初測）導向 initial-test，並且附帶 returnTo */}
      <Route 
        path="/introduction" 
        element={
          <PrivateRoute>
            <MainLayout>
              <Introduction />
            </MainLayout>
          </PrivateRoute>
        } 
      />

      <Route 
        path="/profile" 
        element={
          <PrivateRoute>
            <MainLayout>
              <Profile key={session?.user.id} userData={userData} onProfileUpdate={handleProfileUpdate} />
            </MainLayout>
          </PrivateRoute>
        } 
      />

      <Route 
        path="/practice" 
        element={
          <PrivateRoute>
            <MainLayout>
              {!hasCompletedTest ? (
                <Navigate to="/initial-test" state={{ returnTo: '/practice' }} replace />
              ) : (
                <Practice />
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
                // 若來到這裡但已完成測驗，回到先前想去的頁面（若有），否則到 introduction
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

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <SessionContextProvider supabaseClient={supabase}>
        <App />
      </SessionContextProvider>
    </BrowserRouter>
  );
}

