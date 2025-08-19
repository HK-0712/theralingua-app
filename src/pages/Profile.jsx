// src/pages/Profile.js

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Profile.css';
import Loader from '../components/Loader';
import Message from '../components/Message';

// 1. 接收從 App.js 傳來的 props: practiceLanguage 和 setPracticeLanguage
export default function Profile({ practiceLanguage, setPracticeLanguage }) {
  // useTranslation 只用來翻譯 UI 文字，不再用於語言切換
  const { t } = useTranslation(); 
  
  const [initialUserName] = useState("Alex Doe");
  // 2. 記錄頁面載入時的初始練習語言
  const [initialPracticeLanguage] = useState(practiceLanguage); 

  const [formData, setFormData] = useState({
    userName: initialUserName,
    password: "",
    confirmPassword: "",
    // 3. 將下拉選單的值與 props 同步
    defaultLanguage: practiceLanguage,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: "New passwords do not match. Please try again.", type: "error" });
      return;
    }

    const isNameChanged = formData.userName !== initialUserName;
    const isPasswordChanged = formData.password.length > 0;
    // 4. 檢查練習語言是否真的改變了
    const isLanguageChanged = formData.defaultLanguage !== initialPracticeLanguage;

    if (!isNameChanged && !isPasswordChanged && !isLanguageChanged) {
      setMessage({ text: "No changes detected. Please modify your user name, password, or default language to update.", type: "info" });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      // 5. 如果語言改變了，就呼叫從 App.js 傳來的函式來更新全域狀態
      if (isLanguageChanged) {
        setPracticeLanguage(formData.defaultLanguage);
      }
      
      setMessage({ text: "Profile updated successfully!", type: "success" });
      setFormData(prevData => ({ ...prevData, password: "", confirmPassword: "" }));
      setIsLoading(false);
    }, 1500);
  };

  return (
    <main className="profile-page-container">
      <h1 className="page-title">{t('profilePage.title')}</h1>
      <Message text={message.text} type={message.type} />
      <form id="profile-form" className="profile-form" onSubmit={handleUpdate}>
        {/* ... 其他 input groups ... */}
        <div className="input-group">
          <label htmlFor="user-id">{t('profilePage.userId')}</label>
          <input type="text" id="user-id" name="userId" defaultValue="user-abc-12345" disabled />
        </div>
        <div className="input-group">
          <label htmlFor="created-time">{t('profilePage.accountCreated')}</label>
          <input type="text" id="created-time" name="createdTime" defaultValue="2024-08-15 10:30:45 UTC" disabled />
        </div>
        <div className="input-group">
          <label htmlFor="email">{t('profilePage.emailAddress')}</label>
          <input type="email" id="email" name="email" defaultValue="current.user@example.com" disabled />
        </div>
        <div className="input-group">
          <label htmlFor="user-name">{t('profilePage.userName')}</label>
          <input type="text" id="user-name" name="userName" value={formData.userName} onChange={handleInputChange} required />
        </div>
        <div className="input-group">
          <label htmlFor="password">{t('profilePage.newPassword')}</label>
          <input type="password" id="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
        </div>
        <div className="input-group">
          <label htmlFor="confirm-password">{t('profilePage.confirmPassword')}</label>
          <input type="password" id="confirm-password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleInputChange} />
        </div>
        <div className="input-group">
          <label htmlFor="default-language">{t('profilePage.defaultLanguage', 'Default Language')}</label>
          <select
            id="default-language"
            name="defaultLanguage"
            className="input-group-select"
            // 6. 確保下拉選單的值由 state 控制
            value={formData.defaultLanguage}
            onChange={handleInputChange}
          >
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
