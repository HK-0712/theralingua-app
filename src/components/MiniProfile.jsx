// src/components/MiniProfile.jsx (The final, display-only change version)

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './MiniProfile.css';

const MiniProfile = ({ userData }) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  // ✨ 核心修改在這裡 ✨
  const initialTestStatus = useMemo(() => {
    if (!userData?.status?.cur_lvl || !userData.status.cur_lvl.startsWith('initial_test_')) {
      return null;
    }
    
    // 從 'initial_test_x' 中解析出進度數字
    const progressCount = parseInt(userData.status.cur_lvl.split('_')[2], 10) || 1;
    
    return {
      // ✨ 核心修改：將進度數字直接拼接到顯示文字中 ✨
      levelText: `Initial Test ${progressCount}`, 
      // 我們仍然計算這個，以備不時之需，但不會在等級行顯示它
      progressText: `(${progressCount}/20)`,
      currentWord: userData.status.cur_word || 'N/A',
    };
  }, [userData?.status]);

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
  
  const hasCompletedTest = !!suggestedLevel;

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
            
            {hasCompletedTest ? (
              <>
                <p><strong>{t('miniProfile.sug_lvl', 'Suggested Lvl')}:</strong> {suggestedLevel}</p>
                <p><strong>{t('miniProfile.cur_lvl', 'Current Lvl')}:</strong> {initialTestStatus?.levelText}</p>
                <p><strong>{t('miniProfile.target', 'Target Word')}:</strong> {status?.cur_word || 'N/A'}</p>
                <p><strong>{t('miniProfile.errors')}:</strong> {status?.cur_err || 'N/A'}</p>
              </>
            ) : (
              <>
                {/* ✨ JSX 顯示我們剛剛計算好的、更美觀的文字 ✨ */}
                <p>
                  <strong>{t('miniProfile.cur_lvl', 'Current Lvl')}:</strong> 
                  {initialTestStatus?.levelText}
                  <span style={{ color: 'var(--text-light)', marginLeft: '0.5em' }}>
                    {initialTestStatus?.progressText}
                  </span>
                </p>
                <p><strong>{t('miniProfile.currentWord', 'Current Word')}:</strong> {initialTestStatus?.currentWord}</p>
              </>
            )}
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
