// src/App.jsx (The final, truly robust version)

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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

const MainAppRoute = ({ children }) => {
  const hasCompletedTest = !!localStorage.getItem('hasCompletedInitialTest');
  return hasCompletedTest ? children : <Navigate to="/initial-test" replace />;
};

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [practiceLanguage, setPracticeLanguage] = useState(() => localStorage.getItem('practiceLanguage') || 'en');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await fetch('http://127.0.0.1:8000/api/profile/', {
            headers: { 'Authorization': `Bearer ${token}` },
          } );
          if (response.ok) {
            const data = await response.json();
            setUserData(data);
          } else {
            // 如果獲取資料失敗 (例如 token 過期)，則登出
            handleLogout();
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // 網路錯誤也可能需要登出
          handleLogout();
        }
      }
    };
    if (isAuthenticated) {
      fetchUserData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('practiceLanguage', practiceLanguage);
  }, [practiceLanguage]);

  // --- ✨ 核心修正: 讓登入成功後的跳轉更直接、更健壯 ---
  const handleLoginSuccess = () => {
    // 1. 同步設定狀態，這會觸發 useEffect 去獲取使用者資料
    setIsAuthenticated(true);
    // 2. 不再等待非同步操作，立即導航到主頁
    //    PrivateRoute 會保護這個路由，而此時 token 已經存在，所以導航會成功
    navigate('/'); 
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('hasCompletedInitialTest');
    localStorage.removeItem('initialTestState');
    setIsAuthenticated(false);
    setUserData(null);
    navigate('/login');
  };

  const MainLayout = ({ children }) => {
    const location = useLocation();
    const getActivePage = (pathname) => {
      if (pathname.startsWith('/introduction')) return 'Introduction';
      if (pathname.startsWith('/practice')) return 'Practice';
      if (pathname.startsWith('/records')) return 'Records';
      if (pathname.startsWith('/profile')) return 'Profile';
      return '';
    };
    return (
      <div className="app-container">
        <Header activePage={getActivePage(location.pathname)} onNavigate={navigate} onLogout={handleLogout} />
        <ClickSpark>{children}</ClickSpark>
        <MiniProfile userData={userData} />
        <LanguageSelector />
      </div>
    );
  };

  const TestLayout = ({ children }) => (
    <div className="app-container">
      <Header activePage="InitialTest" onNavigate={navigate} onLogout={handleLogout} />
      <ClickSpark>{children}</ClickSpark>
      <MiniProfile userData={userData} />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <ClickSpark><Login onLoginSuccess={handleLoginSuccess} /></ClickSpark>} />
      <Route path="/" element={<PrivateRoute>{localStorage.getItem('hasCompletedInitialTest') ? <Navigate to="/introduction" /> : <Navigate to="/initial-test" />}</PrivateRoute>} />
      <Route path="/introduction" element={<PrivateRoute><MainAppRoute><MainLayout><Introduction /></MainLayout></MainAppRoute></PrivateRoute>} />
      <Route path="/practice" element={<PrivateRoute><MainAppRoute><MainLayout><Practice practiceLanguage={practiceLanguage} /></MainLayout></MainAppRoute></PrivateRoute>} />
      <Route path="/records" element={<PrivateRoute><MainAppRoute><MainLayout><Records practiceLanguage={practiceLanguage} /></MainLayout></MainAppRoute></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainAppRoute><MainLayout><Profile setUserData={setUserData} /></MainLayout></MainAppRoute></PrivateRoute>} />
      <Route path="/initial-test" element={<PrivateRoute>{localStorage.getItem('hasCompletedInitialTest') ? <Navigate to="/introduction" /> : <TestLayout><InitialTest /></TestLayout>}</PrivateRoute>} />
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
