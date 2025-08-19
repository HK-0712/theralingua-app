// src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // 1. 在頂層引入 useTranslation

// --- 導入所有組件 ---
import Login from './pages/Login';
import Introduction from './pages/Introduction';
import Practice from './pages/Practice';
import Records from './pages/Records';
import Profile from './pages/Profile';
import ClickSpark from './components/ClickSpark';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector'; // 2. 確保 LanguageSelector 被導入
import './styles/App.css';

// --- PrivateRoute 組件保持不變 ---
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('accessToken');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// --- ✨ 核心修正發生在這裡 ✨ ---
// AppLayout 現在重新接管語言切換的職責
const AppLayout = ({ children, onLogout, practiceLanguage, setPracticeLanguage }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation(); // 3. 獲取 i18n 實例

  const getActivePage = (pathname) => {
    if (pathname.startsWith('/introduction')) return 'Introduction';
    if (pathname.startsWith('/practice')) return 'Practice';
    if (pathname.startsWith('/records')) return 'Records';
    if (pathname.startsWith('/profile')) return 'Profile';
    return '';
  };

  // 4. 創建語言切換的處理函式
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang); // 切換 UI 語言
    setPracticeLanguage(lang); // 同時更新練習語言的狀態
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
      {/* 5. 將 LanguageSelector 放回到它原本的位置，並傳遞處理函式 */}
      <LanguageSelector onLanguageChange={handleLanguageChange} />
    </div>
  );
};

// --- App 組件，負責狀態管理和路由 ---
function App() {
  const navigate = useNavigate();

  // 狀態管理 (保持不變)
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [practiceLanguage, setPracticeLanguage] = useState(
    localStorage.getItem('practiceLanguage') || 'en'
  );

  useEffect(() => {
    localStorage.setItem('practiceLanguage', practiceLanguage);
  }, [practiceLanguage]);

  // 核心邏輯函式 (保持不變)
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
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

      {/* --- 6. 將語言狀態傳遞給 AppLayout --- */}
      <Route 
        path="/introduction" 
        element={<PrivateRoute><AppLayout onLogout={handleLogout} practiceLanguage={practiceLanguage} setPracticeLanguage={setPracticeLanguage}><Introduction /></AppLayout></PrivateRoute>} 
      />
      <Route 
        path="/practice" 
        element={<PrivateRoute><AppLayout onLogout={handleLogout} practiceLanguage={practiceLanguage} setPracticeLanguage={setPracticeLanguage}><Practice practiceLanguage={practiceLanguage} /></AppLayout></PrivateRoute>} 
      />
      <Route 
        path="/records" 
        element={<PrivateRoute><AppLayout onLogout={handleLogout} practiceLanguage={practiceLanguage} setPracticeLanguage={setPracticeLanguage}><Records practiceLanguage={practiceLanguage} /></AppLayout></PrivateRoute>} 
      />
      <Route 
        path="/profile" 
        element={<PrivateRoute><AppLayout onLogout={handleLogout} practiceLanguage={practiceLanguage} setPracticeLanguage={setPracticeLanguage}><Profile practiceLanguage={practiceLanguage} setPracticeLanguage={setPracticeLanguage} /></AppLayout></PrivateRoute>} 
      />

      {/* 預設路由 (保持不變) */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/introduction" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/introduction" : "/login"} replace />} />
    </Routes>
  );
}

// --- AppWrapper 保持不變 ---
export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
