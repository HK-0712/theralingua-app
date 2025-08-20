// src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// --- 導入所有組件 (保持不變) ---
import Login from './pages/Login';
import Introduction from './pages/Introduction';
import Practice from './pages/Practice';
import Records from './pages/Records';
import Profile from './pages/Profile';
import ClickSpark from './components/ClickSpark';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import MiniProfile from './components/MiniProfile';
import './styles/App.css';

// --- PrivateRoute 組件 (保持不變) ---
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('accessToken');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// --- AppLayout 組件 (保持不變，完全尊重您的設計) ---
const AppLayout = ({ children, onLogout, setPracticeLanguageForUI }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const getActivePage = (pathname) => {
    if (pathname.startsWith('/introduction')) return 'Introduction';
    if (pathname.startsWith('/practice')) return 'Practice';
    if (pathname.startsWith('/records')) return 'Records';
    if (pathname.startsWith('/profile')) return 'Profile';
    return '';
  };

  // UI 語言切換函式 (保持不變)
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    // 注意：這裡我們不再呼叫 setPracticeLanguage，因為 UI 語言和練習語言是分開的
  };

  return (
    <div className="app-container">
      <Header 
        activePage={getActivePage(location.pathname)} 
        onNavigate={navigate}
        onLogout={onLogout}
      />
      <ClickSpark>
        {children}
      </ClickSpark>
      <MiniProfile />
      <LanguageSelector onLanguageChange={handleLanguageChange} />
    </div>
  );
};

// --- App 組件 (負責狀態管理和路由) ---
function App() {
  const navigate = useNavigate();

  // --- 狀態管理 ---
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  
  // ✨ 核心修正: 這裡的 practiceLanguage 狀態完全由 localStorage 初始化和更新。
  // 它的唯一職責，就是作為一個可靠的資料源，傳遞給需要它的子元件。
  const [practiceLanguage, setPracticeLanguage] = useState(
    () => localStorage.getItem('practiceLanguage') || 'en'
  );

  // ✨ 核心修正: 這個 useEffect 確保任何對 practiceLanguage 狀態的修改，
  // 都會被立刻、自動地儲存到 localStorage，從而實現跨頁面重新整理的「記憶」。
  useEffect(() => {
    localStorage.setItem('practiceLanguage', practiceLanguage);
  }, [practiceLanguage]);

  // --- 核心邏輯函式 (保持不變) ---
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    // 登入成功時，從 localStorage 讀取使用者上次儲存的練習語言偏好
    const savedLanguage = localStorage.getItem('practiceLanguage') || 'en';
    setPracticeLanguage(savedLanguage);
    navigate('/introduction');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/introduction" replace /> : (
            <ClickSpark>
              <Login onLoginSuccess={handleLoginSuccess} />
            </ClickSpark>
          )
        } 
      />

      {/* --- 私有路由 --- */}
      {/* 我們將 handleLogout 傳遞給 AppLayout */}
      {/* 我們將 practiceLanguage 和 setPracticeLanguage 傳遞給需要它們的頁面 */}
      <Route 
        path="/introduction" 
        element={<PrivateRoute><AppLayout onLogout={handleLogout}><Introduction /></AppLayout></PrivateRoute>} 
      />
      <Route 
        path="/practice" 
        element={<PrivateRoute><AppLayout onLogout={handleLogout}><Practice practiceLanguage={practiceLanguage} /></AppLayout></PrivateRoute>} 
      />
      <Route 
        path="/records" 
        element={<PrivateRoute><AppLayout onLogout={handleLogout}><Records practiceLanguage={practiceLanguage} /></AppLayout></PrivateRoute>} 
      />
      <Route 
        path="/profile" 
        element={
          <PrivateRoute>
            <AppLayout onLogout={handleLogout}>
              <Profile 
                practiceLanguage={practiceLanguage} 
                setPracticeLanguage={setPracticeLanguage} 
              />
            </AppLayout>
          </PrivateRoute>
        } 
      />

      {/* 預設路由 (保持不變) */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/introduction" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/introduction" : "/login"} replace />} />
    </Routes>
  );
}

// --- AppWrapper (保持不變) ---
export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
