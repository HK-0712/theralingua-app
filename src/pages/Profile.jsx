// src/pages/Profile.jsx (最終的、功能完整的版本)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInTimeZone } from 'date-fns-tz';
import '../styles/Profile.css';
import Loader from '../components/Loader';
import Message from '../components/Message';

export default function Profile({ practiceLanguage, setPracticeLanguage }) {
  const { t } = useTranslation();

  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // 這個 state 是我們之前解決問題的關鍵，必須保留
  const [initialPracticeLanguage, setInitialPracticeLanguage] = useState(null);

  // useEffect 的邏輯是正確的，它負責從後端獲取初始資料
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage({ text: 'Authentication error. Please log in again.', type: 'error' });
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch('http://127.0.0.1:8000/api/profile/', {
          headers: { 'Authorization': `Bearer ${token}` },
        }  );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch profile data.' }));
          throw new Error(errorData.detail || JSON.stringify(errorData));
        }
        const data = await response.json();
        setProfileData(data);
        
        // 使用從後端獲取的資料，初始化表單的 username
        setFormData(prev => ({ ...prev, username: data.user ? data.user.username : '' }));
        
        // 使用從後端獲取的資料，初始化語言選擇
        if (data.practice_language) {
          setPracticeLanguage(data.practice_language);
          setInitialPracticeLanguage(data.practice_language);
        }
      } catch (error) {
        setMessage({ text: error.message, type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [setPracticeLanguage]);

  // handleInputChange 的邏輯是正確的，它負責更新表單輸入狀態
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // handleUpdate 的邏輯是正確的，它負責將變更發送到後端
  const handleUpdate = async () => {
    setMessage({ text: '', type: '' });

    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    // 判斷是否有任何變更的邏輯，是我們之前修正的關鍵，必須保留
    const isUsernameChanged = profileData && profileData.user && formData.username !== profileData.user.username;
    const isPasswordChanged = formData.password.length > 0;
    const isLanguageChanged = practiceLanguage !== initialPracticeLanguage;

    if (!isUsernameChanged && !isPasswordChanged && !isLanguageChanged) {
      setMessage({ text: 'No changes detected to update.', type: 'info' });
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('accessToken');

    // 構建請求體的邏輯是正確的
    const requestBody = {};
    if (isUsernameChanged) { requestBody.username = formData.username; }
    if (isPasswordChanged) {
      requestBody.password = formData.password;
      requestBody.confirm_password = formData.confirmPassword;
    }
    if (isLanguageChanged) { requestBody.practice_language = practiceLanguage; }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody  ),
      });

      const data = await response.json();

      if (!response.ok) {
        const friendlyError = data.password?.[0] || data.username?.[0] || JSON.stringify(data);
        throw new Error(friendlyError);
      }

      // 更新成功後，用後端返回的最新資料更新所有相關狀態
      setProfileData(data);
      setFormData(prev => ({ ...prev, username: data.user ? data.user.username : '', password: '', confirmPassword: '' }));
      
      if (data.practice_language) {
        setPracticeLanguage(data.practice_language);
        setInitialPracticeLanguage(data.practice_language);
      }
      
      setMessage({ text: 'Profile updated successfully!', type: 'success' });

    } catch (error) {
      setMessage({ text: `Update failed: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // formatHongKongTime 函式保持不變
  const formatHongKongTime = (utcDateString) => {
    if (!utcDateString) return 'N/A';
    return formatInTimeZone(utcDateString, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
  };

  // 初始載入的 JSX 邏輯保持不變
  if (isLoading && !profileData) {
    return <main className="profile-page-container"><h1 className="page-title">{t('profilePage.title')}</h1><Loader /></main>;
  }
  if (!profileData) {
    return <main className="profile-page-container"><h1 className="page-title">{t('profilePage.title')}</h1><Message text={message.text || "Could not load profile data."} type="error" /></main>;
  }

  // --- ✨ 恢復完整的 JSX 介面 ✨ ---
  return (
    <main className="profile-page-container">
      <h1 className="page-title">{t('profilePage.title')}</h1>
      {message.text && <Message text={message.text} type={message.type} />}
      <div id="profile-form" className="profile-form">
        {/* 恢復所有顯示資訊和輸入框 */}
        <div className="input-group"><label htmlFor="user-id">{t('profilePage.userId')}</label><input type="text" id="user-id" value={profileData.user_id} disabled /></div>
        <div className="input-group"><label htmlFor="created-time">{t('profilePage.accountCreated')}</label><input type="text" id="created-time" value={formatHongKongTime(profileData.date_joined)} disabled /></div>
        <div className="input-group"><label htmlFor="email">{t('profilePage.emailAddress')}</label><input type="email" id="email" value={profileData.email} disabled /></div>
        
        <div className="input-group"><label htmlFor="user-name">{t('profilePage.userName')}</label><input type="text" id="user-name" name="username" value={formData.username} onChange={handleInputChange} placeholder="Please set your username" /></div>
        <div className="input-group"><label htmlFor="password">{t('profilePage.newPassword')}</label><input type="password" id="password" name="password" placeholder="Leave blank to keep current" value={formData.password} onChange={handleInputChange} /></div>
        <div className="input-group"><label htmlFor="confirm-password">{t('profilePage.confirmPassword')}</label><input type="password" id="confirm-password" name="confirmPassword" placeholder="Confirm new password" value={formData.confirmPassword} onChange={handleInputChange} /></div>
        
        <div className="input-group">
          <label htmlFor="default-language">{t('profilePage.practiceLanguage', 'Default Language')}</label>
          <select id="default-language" className="input-group-select" value={practiceLanguage} onChange={(e) => setPracticeLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button type="button" id="update-button" className="update-btn" disabled={isLoading} onClick={handleUpdate}>
            {isLoading ? <Loader /> : <span>{t('profilePage.updateButton')}</span>}
          </button>
        </div>
      </div>
    </main>
  );
}
