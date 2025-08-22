// src/pages/Profile.jsx (The Final, State-Lifted Version)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInTimeZone } from 'date-fns-tz';
import '../styles/Profile.css';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { supabase } from '../supabaseClient';

// ✨ 核心修正 1: Profile 現在是一個「受控元件」，它接收從 App.jsx 傳來的 userData 和 onProfileUpdate 函數
export default function Profile({ userData, onProfileUpdate }) {
  const { t } = useTranslation();

  // 表單的內部狀態，用於處理用戶輸入
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    practice_language: 'en',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // ✨ 核心修正 2: 使用 useEffect 監聽從 App 傳來的 userData，並用它來初始化表單
  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || '',
        password: '',
        confirmPassword: '',
        // 從正確的 user_settings 物件中獲取語言
        practice_language: userData.user_settings?.language || 'en',
      });
    }
  }, [userData]); // 當 App.jsx 的 userData 準備好或更新時，這個 effect 會執行

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleUpdate = async () => {
    setMessage({ text: '', type: '' });
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: 'error' });
      return;
    }
    setIsLoading(true);

    try {
      // 獲取用戶 ID 是安全的，因為這是受保護的路由
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found.");

      // 更新 profiles 表
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: formData.username })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // 更新 user_settings 表
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({ language: formData.practice_language })
        .eq('user_id', user.id); // 注意這裡的列名是 user_id
      if (settingsError) throw settingsError;

      // 更新密碼 (如果提供)
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: formData.password });
        if (passwordError) throw passwordError;
      }

      // ✨ 核心修正 3: 更新成功後，調用從 App.jsx 傳來的 onProfileUpdate 函數
      // 建立一個新的 userData 物件來反映變更
      const updatedUserData = {
        ...userData,
        username: formData.username,
        user_settings: {
          ...userData.user_settings,
          language: formData.practice_language,
        },
      };
      // 將最新的資料「發射」回父元件 App.jsx
      onProfileUpdate(updatedUserData);
      
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));

    } catch (error) {
      setMessage({ text: `Update failed: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatHongKongTime = (utcDateString) => {
    if (!utcDateString) return 'N/A';
    // 確保 userData.created_at 存在
    return formatInTimeZone(utcDateString, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
  };

  // 如果 App.jsx 還在加載 userData，顯示載入中
  if (!userData) {
    return <main className="profile-page-container"><h1 className="page-title">{t('profilePage.title')}</h1><Loader /></main>;
  }

  // JSX 渲染部分：所有顯示的資料都直接來自 props (userData)
  return (
    <main className="profile-page-container">
      <h1 className="page-title">{t('profilePage.title')}</h1>
      {message.text && <Message text={message.text} type={message.type} />}
      <div id="profile-form" className="profile-form">
        <div className="input-group"><label htmlFor="user-id">{t('profilePage.userId')}</label><input type="text" id="user-id" value={userData.id} disabled /></div>
        <div className="input-group"><label htmlFor="created-time">{t('profilePage.accountCreated')}</label><input type="text" id="created-time" value={formatHongKongTime(userData.created_at)} disabled /></div>
        <div className="input-group"><label htmlFor="email">{t('profilePage.emailAddress')}</label><input type="email" id="email" value={userData.email} disabled /></div>
        
        {/* 表單輸入欄位綁定到 Profile 自己的 formData state */}
        <div className="input-group"><label htmlFor="user-name">{t('profilePage.userName')}</label><input type="text" id="user-name" name="username" value={formData.username} onChange={handleInputChange} placeholder="Please set your username" /></div>
        <div className="input-group"><label htmlFor="password">{t('profilePage.newPassword')}</label><input type="password" id="password" name="password" placeholder="Leave blank to keep current" value={formData.password} onChange={handleInputChange} /></div>
        <div className="input-group"><label htmlFor="confirm-password">{t('profilePage.confirmPassword')}</label><input type="password" id="confirm-password" name="confirmPassword" placeholder="Confirm new password" value={formData.confirmPassword} onChange={handleInputChange} /></div>
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
