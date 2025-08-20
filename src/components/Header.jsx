// src/components/Header.jsx (The final, truly logical version)

import React from 'react';
import { useTranslation } from 'react-i18next';
import "../styles/App.css"; // 確保導入了樣式檔案

const Header = ({ activePage, onNavigate, onLogout, hasCompletedTest }) => {
  const { t } = useTranslation();
  const getButtonClass = (pageName) => (activePage === pageName ? "active" : "");

  return (
    <header className="app-header">
      <div className="header-title">TheraLingua AI</div>
      <nav className="header-nav">
        
        {/* 1. Introduction 按鈕: 始終顯示 */}
        <button 
          className={getButtonClass("Introduction")} 
          onClick={() => onNavigate('/introduction')}
        >
          {t('header.introduction')}
        </button>

        {/* --- ✨ 核心修正: 這是唯一需要條件判斷的地方 ✨ --- */}
        {hasCompletedTest ? (
          // --- 如果【已完成】測試，顯示常規的 Practice 和 Records 按鈕 ---
          <>
            <button 
              className={getButtonClass("Practice")} 
              onClick={() => onNavigate('/practice')}
            >
              {t('header.practice')}
            </button>
            <button 
              className={getButtonClass("Records")} 
              onClick={() => onNavigate('/records')}
            >
              {t('header.records')}
            </button>
          </>
        ) : (
          // --- 如果【未完成】測試，只顯示一個指向測試頁的按鈕 ---
          <button 
            className={getButtonClass("InitialTest")} // 當 activePage 是 'InitialTest' 時，它會自動高亮
            onClick={() => onNavigate('/initial-test')}
          >
            {t('header.initialTest')}
          </button>
        )}

        {/* 3. Profile 按鈕: 始終顯示 */}
        <button 
          className={getButtonClass("Profile")} 
          onClick={() => onNavigate('/profile')}
        >
          {t('header.profile')}
        </button>
        
        {/* 4. Logout 按鈕: 始終顯示 */}
        <button className="logout" onClick={onLogout}>
          {t('header.logout')}
        </button>
      </nav>
    </header>
  );
};

export default Header;
