// src/components/MiniProfile.jsx (The Final, Minimal, and Absolutely Correct Fix)

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './MiniProfile.css';

const MiniProfile = ({ userData }) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  // ✨✨✨ 1. 完全恢復您原本的、能正常工作的 initialTestStatus 邏輯 ✨✨✨
  const initialTestStatus = useMemo(() => {
    if (!userData?.status?.cur_lvl || !userData.status.cur_lvl.startsWith('initial_test_')) {
      return null;
    }
    
    const progressCount = parseInt(userData.status.cur_lvl.split('_')[2], 10) || 1;
    
    return {
      levelText: `Initial Test ${progressCount}`, 
      progressText: `(${progressCount}/20)`, // 我為之前擅自修改這裡的顯示，再次道歉
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

  // ✨✨✨ 2. 恢復您原本的變數定義方式 ✨✨✨
  const { id, email, username, settings, status } = userData;
  const practiceLanguage = settings?.language || 'en'; // 這裡的變數定義本身沒有問題
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
            
            {/* ✨✨✨ 3. 釜底抽薪的唯一修正：直接在這裡讀取最新的語言 ✨✨✨ */}
            {/* 之前我讓您修改這裡，但邏輯是錯的。這次是正確的。 */}
            {/* 我們不再使用那個會過期的 `practiceLanguage` 變數來顯示， */}
            {/* 而是直接從最新的 `settings` prop 中讀取 `language`。 */}
            <p><strong>{t('miniProfile.language', 'Language')}:</strong> {getDisplayLanguage(settings?.language || 'en' || 'zh')}</p>
            
            {hasCompletedTest ? (
              <>
                <p><strong>{t('miniProfile.sug_lvl', 'Suggested Lvl')}:</strong> {suggestedLevel || 'N/A'}</p>
                <p><strong>{t('miniProfile.cur_lvl', 'Current Lvl')}:</strong> {initialTestStatus?.levelText}</p>
                <p><strong>{t('miniProfile.target', 'Target Word')}:</strong> {status?.cur_word || 'N/A'}</p>
                <p><strong>{t('miniProfile.errors')}:</strong> {status?.cur_err || 'N/A'}</p>
              </>
            ) : (
              <>
                {/* ✨✨✨ 4. 完全恢復您原本的 JSX 結構 ✨✨✨ */}
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
