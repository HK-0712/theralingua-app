import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './MiniProfile.css';

const fakeUserData = {
  id: 'usr_1a2b3c4d',
  email: 'a_very_long_user_email_address@example.com', // 使用一個較長的 email 測試省略號效果
  username: 'TheraUser',
  currentLanguage: 'English',
  difficultyLevel: 'Primary School',
  currentTarget: 'Improve /r/ sound',
  errorPhoneme: '/r/, /l/',
};

const MiniProfile = () => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="mini-profile-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered ? (
        <div className="profile-details">
          <p><strong>{t('miniProfile.language')}:</strong> {fakeUserData.currentLanguage}</p>
          <p><strong>{t('miniProfile.level')}:</strong> {fakeUserData.difficultyLevel}</p>
          <p><strong>{t('miniProfile.target')}:</strong> {fakeUserData.currentTarget}</p>
          <p><strong>{t('miniProfile.errors')}:</strong> {fakeUserData.errorPhoneme}</p>
        </div>
      ) : (
        // ✨ MODIFICATION: 調整 JSX 結構以適應 Grid 佈局
        <div className="profile-summary">
          <div className="profile-summary-info">
            <span>{fakeUserData.id}</span>
            <span>{fakeUserData.email}</span>
            <span>{fakeUserData.username}</span>
          </div>
          <span className="arrow">^</span>
        </div>
      )}
    </div>
  );
};

export default MiniProfile;
