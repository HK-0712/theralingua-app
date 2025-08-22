// src/components/MiniProfile.jsx (The final, correct version)

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './MiniProfile.css';

const MiniProfile = ({ userData }) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  if (!userData) {
    return null;
  }

  const getDisplayLanguage = (langCode) => {
    const languageMap = { en: 'English', zh: '繁體中文' };
    return languageMap[langCode] || langCode;
  };

  // --- ✨ 核心修正: 直接從 userData 解構出頂層屬性 ✨ ---
  const { id, email, username, settings, user_settings } = userData;
  
  // 從 settings 或 user_settings 中安全地獲取語言和等級
  // 這使得元件對來自 App.jsx (user_settings) 或 Profile.jsx (settings) 的資料結構都有彈性
  const effectiveSettings = settings || user_settings;
  const practiceLanguage = effectiveSettings ? effectiveSettings.language : 'en';
  const difficultyLevel = effectiveSettings ? effectiveSettings.cur_lvl : 'N/A';

  return (
    <div 
      className="mini-profile-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="profile-content">
        {isHovered ? (
          <>
            <p><strong>{t('miniProfile.language', 'Language')}:</strong> {getDisplayLanguage(practiceLanguage)}</p>
            <p><strong>{t('miniProfile.level', 'Level')}:</strong> {difficultyLevel}</p>
            <p><strong>{t('miniProfile.target', 'Target')}:</strong> {'N/A'}</p>
            <p><strong>{t('miniProfile.errors', 'Errors')}:</strong> {'N/A'}</p>
          </>
        ) : (
          <>
            {/* ✨ 現在這裡會正確地顯示 ID 和 Username ✨ */}
            <p><strong>{t('miniProfile.userId')}</strong> {id}</p>
            <p><strong>{t('miniProfile.emailAddress')}</strong> {email}</p>
            <p><strong>{t('miniProfile.userName')}</strong> {username || 'N/A'}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MiniProfile;
