// src/pages/Profile.jsx (The final, fully restored & functional version)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInTimeZone } from 'date-fns-tz';
import '../styles/Profile.css';
import Loader from '../components/Loader';
import Message from '../components/Message';

export default function Profile({ setUserData }) {
  const { t } = useTranslation();

  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    practice_language: 'en',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

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
        } );
        if (!response.ok) throw new Error('Failed to fetch profile data.');
        
        const data = await response.json();
        setProfileData(data);
        
        // ✨ 核心修正 1: 使用後端返回的資料，正確初始化整個表單
        setFormData({
          username: data.username || '',
          password: '',
          confirmPassword: '',
          // 從 data.settings 中讀取語言，如果不存在則預設為 'en'
          practice_language: data.settings?.language || 'en',
        });

      } catch (error) {
        setMessage({ text: error.message, type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleUpdate = async () => {
    setMessage({ text: '', type: '' });

    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    // ✨ 核心修正 2: 判斷是否有任何變更
    const isUsernameChanged = profileData && formData.username !== profileData.username;
    const isPasswordChanged = formData.password.length > 0;
    const isLanguageChanged = profileData && formData.practice_language !== profileData.settings?.language;

    if (!isUsernameChanged && !isPasswordChanged && !isLanguageChanged) {
      setMessage({ text: 'No changes detected to update.', type: 'info' });
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('accessToken');

    // ✨ 核心修正 3: 構建包含所有可能變更的請求體
    const requestBody = {};
    if (isUsernameChanged) { requestBody.username = formData.username; }
    if (isPasswordChanged) {
      requestBody.password = formData.password;
      requestBody.confirm_password = formData.confirmPassword;
    }
    if (isLanguageChanged) { requestBody.practice_language = formData.practice_language; }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody ),
      });

      const data = await response.json();
      if (!response.ok) {
        const friendlyError = data.password?.[0] || data.username?.[0] || JSON.stringify(data);
        throw new Error(friendlyError);
      }

      // 更新成功後，用後端返回的最新資料更新所有相關狀態
      setProfileData(data);
      setUserData(data); // 更新 App.js 中的全域狀態
      setFormData({
        username: data.username,
        password: '',
        confirmPassword: '',
        practice_language: data.settings?.language || 'en',
      });
      setMessage({ text: 'Profile updated successfully!', type: 'success' });

    } catch (error) {
      setMessage({ text: `Update failed: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatHongKongTime = (utcDateString) => {
    if (!utcDateString) return 'N/A';
    return formatInTimeZone(utcDateString, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
  };

  if (isLoading && !profileData) {
    return <main className="profile-page-container"><h1 className="page-title">{t('profilePage.title')}</h1><Loader /></main>;
  }
  if (!profileData) {
    return <main className="profile-page-container"><h1 className="page-title">{t('profilePage.title')}</h1><Message text={message.text || "Could not load profile data."} type="error" /></main>;
  }

  return (
    <main className="profile-page-container">
      <h1 className="page-title">{t('profilePage.title')}</h1>
      {message.text && <Message text={message.text} type={message.type} />}
      <div id="profile-form" className="profile-form">
        <div className="input-group"><label htmlFor="user-id">{t('profilePage.userId')}</label><input type="text" id="user-id" value={profileData.id} disabled /></div>
        <div className="input-group"><label htmlFor="created-time">{t('profilePage.accountCreated')}</label><input type="text" id="created-time" value={formatHongKongTime(profileData.date_joined)} disabled /></div>
        <div className="input-group"><label htmlFor="email">{t('profilePage.emailAddress')}</label><input type="email" id="email" value={profileData.email} disabled /></div>
        
        <div className="input-group"><label htmlFor="user-name">{t('profilePage.userName')}</label><input type="text" id="user-name" name="username" value={formData.username} onChange={handleInputChange} placeholder="Please set your username" /></div>
        <div className="input-group"><label htmlFor="password">{t('profilePage.newPassword')}</label><input type="password" id="password" name="password" placeholder="Leave blank to keep current" value={formData.password} onChange={handleInputChange} /></div>
        <div className="input-group"><label htmlFor="confirm-password">{t('profilePage.confirmPassword')}</label><input type="password" id="confirm-password" name="confirmPassword" placeholder="Confirm new password" value={formData.confirmPassword} onChange={handleInputChange} /></div>
        
        {/* ✨ 核心修正 4: 恢復語言下拉選單，並將其與 formData.practice_language 綁定 */}
        <div className="input-group">
          <label htmlFor="practice-language">{t('profilePage.practiceLanguage', 'Practice Language')}</label>
          <select id="practice-language" name="practice_language" className="input-group-select" value={formData.practice_language} onChange={handleInputChange}>
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
