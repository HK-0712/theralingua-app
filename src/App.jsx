// src/App.jsx (The final, fully synchronized version)

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

// MainAppRoute 現在完全依賴傳入的 prop，不再自己讀取 localStorage
const MainAppRoute = ({ children, hasCompletedTest }) => {
  return hasCompletedTest ? children : <Navigate to="/initial-test" replace />;
};

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [practiceLanguage, setPracticeLanguage] = useState(() => localStorage.getItem('practiceLanguage') || 'en');
  const [userData, setUserData] = useState(null);
  const [hasCompletedTest, setHasCompletedTest] = useState(false); // 初始值設為 false
  const [isLoading, setIsLoading] = useState(true); // 添加一個載入狀態，防止畫面閃爍

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
            // ✨ 核心修正 1: 狀態的唯一來源是後端返回的資料 ✨
            setHasCompletedTest(data.is_initial_test_completed);
            // 如果後端說測試已完成，我們就在 localStorage 中也做個標記
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
      setIsLoading(false); // 無論如何，最後都結束載入
    };
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // 只在 isAuthenticated 變化時執行

  useEffect(() => {
    localStorage.setItem('practiceLanguage', practiceLanguage);
  }, [practiceLanguage]);

  const handleLoginSuccess = () => {
    // 登入成功後，我們只需要更新 isAuthenticated 狀態
    // useEffect 會自動觸發，去獲取所有最新的資料
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.clear(); // 登出時，清空所有 localStorage
    setIsAuthenticated(false);
    setUserData(null);
    setHasCompletedTest(false);
    navigate('/login');
  };

  // ✨ 核心修正 2: 創建一個回呼函式，讓 InitialTest 頁面可以通知 App 狀態已更新 ✨
  const onTestComplete = () => {
    setHasCompletedTest(true);
    localStorage.setItem('hasCompletedInitialTest', 'true');
    navigate('/introduction');
  };

  const MainLayout = ({ children }) => {
    const location = useLocation();
    const getActivePage = (pathname) => {
      if (pathname.startsWith('/introduction')) return 'Introduction';
      if (pathname.startsWith('/practice')) return 'Practice';
      if (pathname.startsWith('/records')) return 'Records';
      if (pathname.startsWith('/profile')) return 'Profile';
      if (pathname.startsWith('/initial-test')) return 'InitialTest';
      return '';
    };
    return (
      <div className="app-container">
        <Header activePage={getActivePage(location.pathname)} onNavigate={navigate} onLogout={handleLogout} hasCompletedTest={hasCompletedTest} />
        <ClickSpark>{children}</ClickSpark>
        <MiniProfile userData={userData} />
        <LanguageSelector />
      </div>
    );
  };

  // 在初始資料載入完成前，顯示一個空白頁或載入動畫，防止路由錯誤判斷
  if (isLoading && isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <ClickSpark><Login onLoginSuccess={handleLoginSuccess} /></ClickSpark>} />
      <Route path="/" element={<PrivateRoute>{hasCompletedTest ? <Navigate to="/introduction" /> : <Navigate to="/initial-test" />}</PrivateRoute>} />
      
      {/* ✨ 核心修正 3: 路由定義現在更加清晰和準確 ✨ */}
      <Route path="/introduction" element={<PrivateRoute><MainLayout><Introduction /></MainLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><MainLayout><Profile setUserData={setUserData} /></MainLayout></PrivateRoute>} />
      <Route path="/practice" element={<PrivateRoute><MainAppRoute hasCompletedTest={hasCompletedTest}><MainLayout><Practice practiceLanguage={practiceLanguage} /></MainLayout></MainAppRoute></PrivateRoute>} />
      <Route path="/records" element={<PrivateRoute><MainAppRoute hasCompletedTest={hasCompletedTest}><MainLayout><Records practiceLanguage={practiceLanguage} /></MainLayout></MainAppRoute></PrivateRoute>} />
      <Route path="/initial-test" element={<PrivateRoute>{hasCompletedTest ? <Navigate to="/introduction" /> : <MainLayout><InitialTest onTestComplete={onTestComplete} /></MainLayout>}</PrivateRoute>} />
      
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
