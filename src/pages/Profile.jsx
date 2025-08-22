// src/pages/Profile.jsx (Cloud-Connected Version)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInTimeZone } from 'date-fns-tz';
import '../styles/Profile.css';
import Loader from '../components/Loader';
import Message from '../components/Message';
// ✨ 1. 導入我們的「武器」：Supabase 客戶端
import { supabase } from '../supabaseClient';

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

  // ✨ 2. 改造 useEffect，實現真正的「雲端數據讀取」
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setMessage({ text: '', type: '' });

      try {
        // 2.1. 獲取當前登入的用戶
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("User not found. Please log in again.");

        // 2.2. 使用用戶 ID，從 `profiles` 和 `user_settings` 表中查詢數據
        // Supabase 的 RLS (Row Level Security) 會確保用戶只能讀取自己的數據
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            user_settings (
              language,
              cur_lvl
            )
          `)
          .eq('id', user.id)
          .single(); // .single() 會直接返回一個對象，而不是數組

        if (error) throw error;

        // 2.3. 將從雲端獲取的真實數據，填充到我們的狀態中
        const fullProfileData = {
          id: user.id,
          email: user.email,
          date_joined: user.created_at,
          username: data.username,
          settings: {
            language: data.user_settings.language,
            cur_lvl: data.user_settings.cur_lvl,
          }
        };

        setProfileData(fullProfileData);
        setFormData({
          username: fullProfileData.username || '',
          password: '',
          confirmPassword: '',
          practice_language: fullProfileData.settings.language,
        });
        
        // 將用戶數據傳遞給 App.jsx，以便在 MiniProfile 中顯示
        if (setUserData) {
          setUserData(fullProfileData);
        }

      } catch (error) {
        setMessage({ text: `Error: ${error.message}`, type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [setUserData]); // 依賴 setUserData 保持穩定

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // ✨ 3. 改造 handleUpdate，實現真正的「雲端數據寫入」
  const handleUpdate = async () => {
    setMessage({ text: '', type: '' });
    setIsLoading(true);

    try {
      // 3.1. 密碼檢查邏輯保持不變
      if (formData.password && formData.password !== formData.confirmPassword) {
        throw new Error("New passwords do not match.");
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not found. Please log in again.");

      // 3.2. 更新 `profiles` 表中的 `username`
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: formData.username })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // 3.3. 更新 `user_settings` 表中的 `language`
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({ language: formData.practice_language })
        .eq('user_id', user.id);
      if (settingsError) throw settingsError;

      // 3.4. 如果用戶輸入了新密碼，則更新密碼
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.password
        });
        if (passwordError) throw passwordError;
      }

      setMessage({ text: 'Profile updated successfully!', type: 'success' });

      // ✨ 核心修正：手動更新 App.jsx 的 userData 狀態 ✨
      const updatedProfileData = {
        ...profileData,
        username: formData.username,
        settings: {
          ...profileData.settings,
          language: formData.practice_language,
        },
      };
      
      // 1. 更新 Profile.jsx 自己的狀態
      setProfileData(updatedProfileData);
      
      // 2. 更新 App.jsx 的狀態，觸發 MiniProfile 刷新
      if (setUserData) {
        setUserData(updatedProfileData);
      }
      
      // 為了立即看到效果，清空密碼欄位
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));

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

  // --- JSX (畫面渲染) 部分保持不變 ---
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
