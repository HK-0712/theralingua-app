import React from 'react';
import { useTranslation } from 'react-i18next';
import "../styles/App.css";

// --- ✨ MODIFICATION START ✨ ---
// 1. 接收 activePage, onNavigate, 和 onLogout
const Header = ({ activePage, onNavigate, onLogout }) => {
  const { t } = useTranslation();

  // 2. 恢復原來的 getButtonClass 邏輯，它現在依賴於傳入的 activePage
  const getButtonClass = (pageName) => {
    return activePage === pageName ? "active" : "";
  };

  // 3. 導航函式，現在呼叫傳入的 onNavigate
  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };
// --- ✨ MODIFICATION END ✨ ---

  return (
    <header className="app-header">
      <div className="header-title">TheraLingua AI</div>
      <nav className="header-nav">
        {/* 4. 恢復原來的結構，class 依賴 pageName，點擊呼叫對應的路徑 */}
        <button className={getButtonClass("Introduction")} onClick={() => handleNavigate('/introduction')}>{t('header.introduction')}</button>
        <button className={getButtonClass("Practice")} onClick={() => handleNavigate('/practice')}>{t('header.practice')}</button>
        <button className={getButtonClass("Records")} onClick={() => handleNavigate('/records')}>{t('header.records')}</button>
        <button className={getButtonClass("Profile")} onClick={() => handleNavigate('/profile')}>{t('header.profile')}</button>
        <button className="logout" onClick={onLogout}>{t('header.logout')}</button>
      </nav>
    </header>
  );
};

export default Header;
