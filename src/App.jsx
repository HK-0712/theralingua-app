// src/App.js

// 1. 從 React 引入 useState 和 useEffect
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

// ... 其他 import ...
import Login from './pages/Login';
import Introduction from './pages/Introduction';
import Practice from './pages/Practice';
import Records from './pages/Records';
import Profile from './pages/Profile';
import ClickSpark from './components/ClickSpark';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import './styles/App.css';


// AppLayout 元件保持不變
const AppLayout = ({ children, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActivePage = (pathname) => {
    if (pathname.startsWith('/introduction')) return 'Introduction';
    if (pathname.startsWith('/practice')) return 'Practice';
    if (pathname.startsWith('/records')) return 'Records';
    if (pathname.startsWith('/profile')) return 'Profile';
    return '';
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
      <LanguageSelector />
    </div>
  );
};


function App() {
  // --- ✨ MODIFICATION START ✨ ---

  // --- 登入狀態管理 (保持不變) ---
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  // --- 新增：練習語言狀態管理 ---
  // 2. 建立一個新的 state 來管理練習語言，並從 localStorage 讀取初始值
  //    預設為 'en' (英文)
  const [practiceLanguage, setPracticeLanguage] = useState(
    localStorage.getItem('practiceLanguage') || 'en'
  );

  // 3. 使用 useEffect 將練習語言的變動同步到 localStorage
  useEffect(() => {
    localStorage.setItem('practiceLanguage', practiceLanguage);
  }, [practiceLanguage]);

  // --- ✨ MODIFICATION END ✨ ---

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* --- 登入頁面路由 (保持不變) --- */}
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

        {/* --- 需要登入才能存取的頁面 --- */}
        {/* 4. 將練習語言相關的 props 傳遞給子元件 */}
        <Route path="/introduction" element={isAuthenticated ? <AppLayout onLogout={handleLogout}><Introduction /></AppLayout> : <Navigate to="/login" replace />} />
        
        <Route 
          path="/practice" 
          element={isAuthenticated ? <AppLayout onLogout={handleLogout}><Practice practiceLanguage={practiceLanguage} /></AppLayout> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/records" 
          element={isAuthenticated ? <AppLayout onLogout={handleLogout}><Records practiceLanguage={practiceLanguage} /></AppLayout> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/profile" 
          element={isAuthenticated ? <AppLayout onLogout={handleLogout}><Profile practiceLanguage={practiceLanguage} setPracticeLanguage={setPracticeLanguage} /></AppLayout> : <Navigate to="/login" replace />} 
        />

        {/* --- 預設路由 (保持不變) --- */}
        <Route path="/" element={<Navigate to={isAuthenticated ? "/introduction" : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
