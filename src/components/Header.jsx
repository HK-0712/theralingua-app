// src/components/Header.jsx (最終的、完全修正的版本)

import React from 'react';
import { useTranslation } from 'react-i18next';
import "../styles/App.css"; // 確保導入了樣式檔案

const Header = ({ activePage, onNavigate, onLogout }) => {
  const { t } = useTranslation();
  const getButtonClass = (pageName) => (activePage === pageName ? "active" : "");

  // 在新手測試頁面，這些按鈕應該被禁用
  const isTestMode = activePage === 'InitialTest';

  return (
    <header className="app-header">
      <div className="header-title">TheraLingua AI</div>
      <nav className="header-nav">
        <button className={getButtonClass("Introduction")} onClick={() => onNavigate('/introduction')} disabled={isTestMode}>
          {t('header.introduction')}
        </button>
        {/* ✨ 核心修正: 將 getButton-class 改為 getButtonClass ✨ */}
        <button className={getButtonClass("Practice")} onClick={() => onNavigate('/practice')} disabled={isTestMode}>
          {t('header.practice')}
        </button>
        <button className={getButtonClass("Records")} onClick={() => onNavigate('/records')} disabled={isTestMode}>
          {t('header.records')}
        </button>
        <button className={getButtonClass("Profile")} onClick={() => onNavigate('/profile')} disabled={isTestMode}>
          {t('header.profile')}
        </button>
        <button className="logout" onClick={onLogout}>{t('header.logout')}</button>
      </nav>
    </header>
  );
};

export default Header;
