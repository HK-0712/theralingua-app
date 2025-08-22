// src/App.jsx (Final Corrected Version)
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
  const isLoading = session === undefined;

  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }

  return session ? children : <Navigate to="/login" replace />;
};

function App() {
  const navigate = useNavigate();
  const session = useSession();
  const supabaseClient = useSupabaseClient();

  const [userData, setUserData] = useState(null);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session) {
        setIsLoading(true);
        try {
          const { data, error } = await supabaseClient
            .from('profiles')
            .select('*, user_settings(*)')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;

          const finalUserData = { ...data, email: session.user.email };
          setUserData(finalUserData);
          setHasCompletedTest(!!data.user_settings?.sug_lvl);

        } catch (error) {
          console.error("Error fetching user data:", error);
          handleLogout();
        } finally {
          setIsLoading(false);
        }
      } else {
        setUserData(null);
        setHasCompletedTest(false);
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [session, supabaseClient]);

  const handleLogout = useCallback(async () => {
    await supabaseClient.auth.signOut();
    navigate('/login');
  }, [navigate, supabaseClient]);

  const onTestComplete = async () => {
    if (!session) return;
    try {
        const { error } = await supabaseClient
            .from('user_settings')
            .update({ sug_lvl: 'Primary-School' })
            .eq('user_id', session.user.id);
        if (error) throw error;
        setHasCompletedTest(true);
        navigate('/introduction');
    } catch(error) {
        console.error("Failed to mark test as complete:", error);
    }
  };

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

  if (isLoading && session) {
    return <div>Loading user profile...</div>;
  }

  return (
    <Routes>
      {/* 核心修正：將 onLoginSuccess={() => navigate('/')} 傳遞給 Login 組件 */}
      <Route path="/login" element={session ? <Navigate to="/" /> : <ClickSpark><Login onLoginSuccess={() => navigate('/')} /></ClickSpark>} />
      
      <Route path="/" element={<PrivateRoute>{hasCompletedTest ? <Navigate to="/introduction" /> : <Navigate to="/initial-test" />}</PrivateRoute>} />
      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile key={session?.user.id} /></MainLayout></PrivateRoute>} />
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