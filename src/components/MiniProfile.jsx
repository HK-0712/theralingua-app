// src/components/MiniProfile.jsx (The final version with all requested features, including Error Phoneme)

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

  const { id, email, username, settings, status } = userData;

  const practiceLanguage = settings?.language || 'en';
  const suggestedLevel = settings?.sug_lvl || 'N/A';
  const currentLevel = status?.cur_lvl || 'N/A';
  
  // ✨ 核心新增：從 user_status 表中獲取【當前錯誤音素】 ✨
  const currentErrorPhoneme = status?.cur_err || 'N/A'; // 來自 user_status.cur_err

  return (
    <div 
      className="mini-profile-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="profile-content">
        {isHovered ? (
          <>
            <h4 className="status-header">{t('miniProfile.statusTitle', 'Current Status')}</h4>
            
            <p><strong>{t('miniProfile.language', 'Language')}:</strong> {getDisplayLanguage(practiceLanguage)}</p>
            <p><strong>{t('miniProfile.sug_lvl', 'Suggested Lvl')}:</strong> {suggestedLevel}</p>
            <p><strong>{t('miniProfile.cur_lvl', 'Current Lvl')}:</strong> {currentLevel}</p>
            <p><strong>{t('miniProfile.target', 'Target Word')}:</strong> {status?.cur_word || 'N/A'}</p>
            <p><strong>{t('miniProfile.errors')}:</strong> {currentErrorPhoneme}</p>
          </>
        ) : (
          <>
            <h4 className="status-header">{t('miniProfile.title', 'Mini Profile')}</h4>
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
