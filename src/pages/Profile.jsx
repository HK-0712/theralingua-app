// src/pages/Profile.jsx

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
        // 【關鍵修正】: 從巢狀的 user 物件中獲取 username 和 email
        const initialUsername = data.user.username === data.user.email ? '' : data.user.username;
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

  const handleUpdate = async () => {
    setMessage({ text: '', type: '' });
    if (!profileData) {
      setMessage({ text: 'Profile data not loaded yet. Please wait.', type: 'error' });
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    const isNameChanged = formData.userName !== (profileData.user.username === profileData.user.email ? '' : profileData.user.username);
    const isPasswordChanged = formData.password.length > 0;
    const isLanguageChanged = practiceLanguage !== (localStorage.getItem('practiceLanguage') || 'en');

    if (!isNameChanged && !isPasswordChanged && !isLanguageChanged) {
      setMessage({ text: 'No changes detected.', type: 'info' });
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('accessToken');

    try {
      // 【關鍵修正】: 按照後端期望的巢狀結構來構建請求體
      const requestBody = {};
      const userData = {};
      if (isNameChanged && formData.userName) {
        userData.username = formData.userName;
      }
      if (Object.keys(userData).length > 0) {
        requestBody.user = userData;
      }
      if (isPasswordChanged) {
        requestBody.password = formData.password;
      }
      if (isLanguageChanged) {
        requestBody.practice_language = practiceLanguage;
      }

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
        userName: updatedProfile.user.username === updatedProfile.user.email ? '' : updatedProfile.user.username,
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
    // 注意：我們需要從 profileData.user 中獲取 date_joined
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
        {/* 【關鍵修正】: 從巢狀的 user 物件中獲取 id, date_joined, email */}
        <div className="input-group"><label htmlFor="user-id">{t('profilePage.userId')}</label><input type="text" id="user-id" value={profileData.user.id} disabled /></div>
        <div className="input-group"><label htmlFor="created-time">{t('profilePage.accountCreated')}</label><input type="text" id="created-time" value={formatHongKongTime(profileData.user.date_joined)} disabled /></div>
        <div className="input-group"><label htmlFor="email">{t('profilePage.emailAddress')}</label><input type="email" id="email" value={profileData.user.email} disabled /></div>
        
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
          <button type="button" id="update-button" className="update-btn" disabled={isLoading} onClick={handleUpdate}>
            {isLoading ? <Loader /> : <span>{t('profilePage.updateButton')}</span>}
          </button>
        </div>
      </div>
    </main>
  );
}
