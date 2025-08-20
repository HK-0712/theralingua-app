// src/App.jsx (The final, fully-featured, and absolutely correct version)

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

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
  const isAuthenticated = !!localStorage.getItem('accessToken');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const MainAppRoute = ({ children, hasCompletedTest }) => {
  return hasCompletedTest ? children : <Navigate to="/initial-test" replace />;
};

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [practiceLanguage] = useState(() => localStorage.getItem('practiceLanguage') || 'en');
  const [userData, setUserData] = useState(null);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        setIsAuthenticated(true);
        try {
          const response = await fetch('http://127.0.0.1:8000/api/profile/', {
            headers: { 'Authorization': `Bearer ${token}` },
          } );
          if (response.ok) {
            const data = await response.json();
            setUserData(data);
            setHasCompletedTest(data.is_initial_test_completed);
            if (data.is_initial_test_completed) {
              localStorage.setItem('hasCompletedInitialTest', 'true');
            }
          } else {
            handleLogout();
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          handleLogout();
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserData(null);
    setHasCompletedTest(false);
    navigate('/login');
  };

  const onTestComplete = () => {
    setHasCompletedTest(true);
    localStorage.setItem('hasCompletedInitialTest', 'true');
    navigate('/introduction');
  };

  const MainLayout = ({ children }) => {
    const getActivePage = (pathname) => {
      if (pathname.startsWith('/introduction')) return 'Introduction';
      if (pathname.startsWith('/practice')) return 'Practice';
      if (pathname.startsWith('/records')) return 'Records';
      if (pathname.startsWith('/profile')) return 'Profile';
      return '';
    };
    return (
      <div className="app-container">
        <Header activePage={getActivePage(window.location.pathname)} onNavigate={navigate} onLogout={handleLogout} hasCompletedTest={hasCompletedTest} />
        <ClickSpark>{children}</ClickSpark>
        <MiniProfile userData={userData} />
        <LanguageSelector />
      </div>
    );
  };

  // --- ✨ 核心修正: 將 ClickSpark 和 LanguageSelector 添加回來 ✨ ---
  const TestLayout = ({ children }) => {
    return (
      <div className="app-container">
        <Header activePage="InitialTest" onNavigate={navigate} onLogout={handleLogout} hasCompletedTest={hasCompletedTest} />
        {/* 1. 用 ClickSpark 包裹 children，恢復點擊特效 */}
        <ClickSpark>{children}</ClickSpark>
        <MiniProfile userData={userData} />
        {/* 2. 重新添加 LanguageSelector 元件 */}
        <LanguageSelector />
      </div>
    );
  };

  if (isLoading && isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <ClickSpark><Login onLoginSuccess={handleLoginSuccess} /></ClickSpark>} />
      <Route path="/" element={<PrivateRoute>{hasCompletedTest ? <Navigate to="/introduction" /> : <Navigate to="/initial-test" />}</PrivateRoute>} />
      
      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile setUserData={setUserData} /></MainLayout></PrivateRoute>} />
      <Route path="/practice" element={<PrivateRoute><MainAppRoute hasCompletedTest={hasCompletedTest}><MainLayout><Practice practiceLanguage={practiceLanguage} /></MainLayout></MainAppRoute></PrivateRoute>} />
      <Route path="/records" element={<PrivateRoute><MainAppRoute hasCompletedTest={hasCompletedTest}><MainLayout><Records practiceLanguage={practiceLanguage} /></MainLayout></MainAppRoute></PrivateRoute>} />
      
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
      <App />
    </BrowserRouter>
  );
}
