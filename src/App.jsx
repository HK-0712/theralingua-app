// src/App.jsx (The Final DEBUGGING Version)

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './supabaseClient';

// ... 所有 import 保持不變 ...
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
  const isLoading = session === undefined;
  if (isLoading) {
    console.log("🕵️‍♂️ [PrivateRoute] Status: Loading session...");
    return <div>Loading authentication status...</div>;
  }
  if (!session) {
    console.log("🕵️‍♂️ [PrivateRoute] Status: No session found. Redirecting to /login.");
  }
  return session ? children : <Navigate to="/login" replace />;
};

function App() {
  const navigate = useNavigate();
  const session = useSession();
  const supabaseClient = useSupabaseClient();

  const [userData, setUserData] = useState(null);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // ======================= 偵錯日誌植入點 =======================
  console.log("--- 🔄 App Component Rendered ---");
  console.log(`SESSION: ${session ? session.user.id : 'null'}`);
  console.log(`USER_DATA: ${userData ? JSON.stringify(userData) : 'null'}`);
  console.log(`IS_LOADING_PROFILE: ${isLoadingProfile}`);
  console.log("---------------------------------");
  // ============================================================

  useEffect(() => {
    console.log("--- ⚡️ useEffect Triggered ---");
    console.log(`SESSION in useEffect: ${session ? 'Exists' : 'null'}`);

    if (session) {
      if (!userData) {
        console.log("🚀 [useEffect] Condition met: Session exists, userData is null. Starting to fetch...");
        setIsLoadingProfile(true);
        supabaseClient
          .from('profiles')
          .select('*, user_settings(*)')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error("❌ [useEffect] FATAL ERROR while fetching user data:", error);
              // 如果獲取失敗，登出用戶
              supabaseClient.auth.signOut();
            } else {
              console.log("✅ [useEffect] User data fetched successfully:", data);
              const finalUserData = { 
                ...data,
                email: session.user.email, 
                created_at: session.user.created_at,
              };
              setUserData(finalUserData);
              setHasCompletedTest(!!finalUserData.user_settings?.sug_lvl);
              console.log("✅ [useEffect] State updated. hasCompletedTest is now:", !!finalUserData.user_settings?.sug_lvl);
            }
            setIsLoadingProfile(false);
          });
      }
    } else {
      console.log("🧹 [useEffect] Condition met: No session. Clearing user data.");
      setUserData(null);
      setHasCompletedTest(false);
    }
  }, [session, userData, supabaseClient]);

  const handleLogout = useCallback(async () => {
    console.log("🚪 [handleLogout] User clicked logout.");
    await supabaseClient.auth.signOut();
    navigate('/login');
  }, [supabaseClient, navigate]);

  // ... onTestComplete 和 handleProfileUpdate 保持不變 ...
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

  const TestLayout = ({ children }) => (
    <div className="app-container">
      <Header activePage="InitialTest" onNavigate={navigate} onLogout={handleLogout} hasCompletedTest={hasCompletedTest} />
      <ClickSpark>{children}</ClickSpark>
      <MiniProfile userData={userData} />
      <LanguageSelector />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" /> : <ClickSpark><Login /></ClickSpark>} />
      <Route 
        path="/" 
        element={
          <PrivateRoute>
            {isLoadingProfile ? (
              <div>Loading user profile...</div>
            ) : (
              userData && (hasCompletedTest ? <Navigate to="/introduction" /> : <Navigate to="/initial-test" />)
            )}
          </PrivateRoute>
        } 
      />
      {/* ... 其他路由保持不變 ... */}
      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
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
      <Route path="/practice" element={<PrivateRoute>{hasCompletedTest ? <MainLayout><Practice /></MainLayout> : <Navigate to="/initial-test" />}</PrivateRoute>} />
      <Route path="/records" element={<PrivateRoute>{hasCompletedTest ? <MainLayout><Records /></MainLayout> : <Navigate to="/initial-test" />}</PrivateRoute>} />
      <Route 
        path="/initial-test" 
        element={
          <PrivateRoute>
            {hasCompletedTest 
              ? <Navigate to="/introduction" /> 
              : <TestLayout><InitialTest onTestComplete={onTestComplete} /></TestLayout>
            }
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
