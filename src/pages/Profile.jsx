// src/pages/Profile.jsx

// 1. 移除 LanguageSelector 的 import
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInTimeZone } from 'date-fns-tz';
import '../styles/Profile.css';
import Loader from '../components/Loader';
import Message from '../components/Message';

// 2. 不再需要 i18n 實例，因為語言切換由 AppLayout 處理
export default function Profile({ practiceLanguage, setPracticeLanguage }) {
  const { t } = useTranslation(); 

  // ... (所有其他的 state 和函式邏輯保持完全不變)
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    userName: '',
    password: '',
    confirmPassword: '',
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
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch profile data.' }));
          throw new Error(errorData.detail || JSON.stringify(errorData));
        }
        const data = await response.json();
        setProfileData(data);
        const initialUsername = data.username === data.email ? '' : data.username;
        setFormData({ userName: initialUsername, password: '', confirmPassword: '' });
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    const isNameChanged = formData.userName !== (profileData.username === profileData.email ? '' : profileData.username);
    const isPasswordChanged = formData.password.length > 0;
    const isLanguageChanged = practiceLanguage !== (localStorage.getItem('practiceLanguage') || 'en');
    if (!isNameChanged && !isPasswordChanged && !isLanguageChanged) {
      setMessage({ text: 'No changes detected.', type: 'info' });
      return;
    }
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const requestBody = {};
      if (isNameChanged && formData.userName) requestBody.username = formData.userName;
      if (isPasswordChanged) {
        requestBody.password = formData.password;
        requestBody.confirm_password = formData.confirmPassword;
      }
      if (isLanguageChanged) requestBody.practice_language = practiceLanguage;
      const response = await fetch('http://127.0.0.1:8000/api/profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody ),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const friendlyError = errorData.password?.[0] || JSON.stringify(errorData);
        throw new Error(friendlyError);
      }
      const updatedProfile = await response.json();
      setProfileData(updatedProfile);
      setFormData({
        userName: updatedProfile.username === updatedProfile.email ? '' : updatedProfile.username,
        password: '',
        confirmPassword: '',
      });
      if (isLanguageChanged) {
        localStorage.setItem('practiceLanguage', practiceLanguage);
      }
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
      {/* 3. 移除這裡的 LanguageSelector */}
      <h1 className="page-title">{t('profilePage.title')}</h1>
      {message.text && <Message text={message.text} type={message.type} />}
      <form id="profile-form" className="profile-form" onSubmit={handleUpdate}>
        {/* ... (所有表單欄位保持完全不變) ... */}
        <div className="input-group"><label htmlFor="user-id">{t('profilePage.userId')}</label><input type="text" id="user-id" value={profileData.user_id} disabled /></div>
        <div className="input-group"><label htmlFor="created-time">{t('profilePage.accountCreated')}</label><input type="text" id="created-time" value={formatHongKongTime(profileData.date_joined)} disabled /></div>
        <div className="input-group"><label htmlFor="email">{t('profilePage.emailAddress')}</label><input type="email" id="email" value={profileData.email} disabled /></div>
        <div className="input-group"><label htmlFor="user-name">{t('profilePage.userName')}</label><input type="text" id="user-name" name="userName" value={formData.userName} onChange={handleInputChange} placeholder="Please set your username" /></div>
        <div className="input-group"><label htmlFor="password">{t('profilePage.newPassword')}</label><input type="password" id="password" name="password" placeholder="Leave blank to keep current" value={formData.password} onChange={handleInputChange} /></div>
        <div className="input-group"><label htmlFor="confirm-password">{t('profilePage.confirmPassword')}</label><input type="password" id="confirm-password" name="confirmPassword" placeholder="Confirm new password" value={formData.confirmPassword} onChange={handleInputChange} /></div>
        <div className="input-group">
          <label htmlFor="default-language">{t('profilePage.defaultLanguage', 'Default Language')}</label>
          <select id="default-language" className="input-group-select" value={practiceLanguage} onChange={(e) => setPracticeLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
        <div className="form-actions">
          <button type="submit" id="update-button" className="update-btn" disabled={isLoading}>
            {isLoading ? <Loader /> : <span>{t('profilePage.updateButton')}</span>}
          </button>
        </div>
      </form>
    </main>
  );
}
