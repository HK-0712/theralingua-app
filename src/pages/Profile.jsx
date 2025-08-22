// src/pages/Profile.jsx (The Final Version Based on Working Logic)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInTimeZone } from 'date-fns-tz';
import '../styles/Profile.css';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { supabase } from '../supabaseClient';

export default function Profile({ userData, onProfileUpdate }) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    practice_language: 'en',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || '',
        password: '',
        confirmPassword: '',
        practice_language: userData.user_settings?.language || 'en',
      });
    }
  }, [userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMessage({ text: '', type: '' });
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleUpdate = async () => {
    setMessage({ text: '', type: '' }); 

    const hasUsernameChanged = formData.username !== (userData.username || '');
    const hasLanguageChanged = formData.practice_language !== userData.user_settings?.language;
    const hasPasswordChanged = formData.password !== '';
    const hasAnyChange = hasUsernameChanged || hasLanguageChanged || hasPasswordChanged;

    if (!hasAnyChange) {
      setMessage({ text: "No changes detected.", type: 'info' });
      return; // 這是能工作的模式
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: 'error' });
      return; // 這是能工作的模式
    }
    
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found.");

      if (hasUsernameChanged) {
        const { error: profileError } = await supabase.from('profiles').update({ username: formData.username }).eq('id', user.id);
        if (profileError) throw profileError;
      }
      if (hasLanguageChanged) {
        const { error: settingsError } = await supabase.from('user_settings').update({ language: formData.practice_language }).eq('user_id', user.id);
        if (settingsError) throw settingsError;
      }
      if (hasPasswordChanged) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: formData.password });
        if (passwordError) throw passwordError;
      }
      
      // ✨✨✨ 這是本次唯一的、決定性的修正 ✨✨✨
      // 我們將在這裡，不惜一切代價，讓成功訊息顯示出來。
      
      // 步驟 1: 強制設定成功訊息
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      
      // 步驟 2: 為了讓訊息能被看到，我們不再立即調用 onProfileUpdate。
      // 我們將異步地、延遲地調用它，給 React足夠的時間去渲染成功訊息。
      setTimeout(() => {
        const updatedUserData = {
          ...userData,
          username: formData.username,
          user_settings: {
            ...userData.user_settings,
            language: formData.practice_language,
          },
        };
        onProfileUpdate(updatedUserData);
      }, 1000);

      // 步驟 3: 清空密碼欄位
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));

    } catch (error) {
      // 這是能工作的模式
      setMessage({ text: `Update failed: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatHongKongTime = (utcDateString) => {
    if (!utcDateString) return 'N/A';
    return formatInTimeZone(utcDateString, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
  };

  if (!userData) {
    return <main className="profile-page-container"><h1 className="page-title">{t('profilePage.title')}</h1><Loader /></main>;
  }

  return (
    <main className="profile-page-container">
      <h1 className="page-title">{t('profilePage.title')}</h1>
      {message.text && <Message text={message.text} type={message.type} />}
      <div id="profile-form" className="profile-form">
        <div className="input-group"><label htmlFor="user-id">{t('profilePage.userId')}</label><input type="text" id="user-id" value={userData.id} disabled /></div>
        <div className="input-group"><label htmlFor="created-time">{t('profilePage.accountCreated')}</label><input type="text" id="created-time" value={formatHongKongTime(userData.created_at)} disabled /></div>
        <div className="input-group"><label htmlFor="email">{t('profilePage.emailAddress')}</label><input type="email" id="email" value={userData.email} disabled /></div>
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