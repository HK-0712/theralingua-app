// src/pages/Profile.jsx (React Query Refactored Version)

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';

import { updateUserProfile, updateUserSettings, getUserData } from '../api/supabaseAPI';
import Loader from '../components/Loader';
import Message from '../components/Message';
import '../styles/Profile.css';

// =================================================================
// ==   自定義 Hooks (Custom Hooks)                               ==
// =================================================================

/**
 * 處理用戶資料更新的 Hook。
 * 封裝了所有與更新相關的 useMutation 邏輯。
 */
const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  return useMutation({
    // 1. mutationFn: 這是執行的核心異步函數。
    //    它接收一個包含所有表單數據的變量。
    mutationFn: async ({ formData, initialData }) => {
      const promises = [];

      // 檢查各項是否有變更，只有變更了才發起請求
      if (formData.username !== initialData.username) {
        promises.push(updateUserProfile(userId, { username: formData.username }));
      }
      if (formData.practice_language !== initialData.settings.language) {
        promises.push(updateUserSettings(userId, { language: formData.practice_language }));
      }
      if (formData.password) {
        promises.push(supabaseClient.auth.updateUser({ password: formData.password }));
      }

      if (promises.length === 0) {
        // 如果沒有任何變更，可以拋出一個特定錯誤或返回一個標識
        throw new Error("No changes detected.");
      }

      // 並行執行所有更新操作
      await Promise.all(promises);
    },
    // 2. onSuccess: mutation 成功後的回調。
    //    這是實現瞬時更新的關鍵！
    onSuccess: () => {
      // 讓所有與 'user' 相關的查詢失效。
      // React Query 會自動重新獲取這些查詢的最新數據。
      // 這會觸發 App.jsx 中的 useUser hook 重新運行。
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    // onError 和 onSettled 回調可以用於更精細的 UI 控制
    onError: (error) => {
      console.error("Update failed:", error);
    },
  });
};


// =================================================================
// ==   Profile 組件                                              ==
// =================================================================

export default function Profile() {
  const { t } = useTranslation();
  const session = useSession();
  
  // ✨ 核心變更 1: 直接從 React Query 緩存中獲取用戶數據
  // 我們使用與 App.jsx 中相同的 queryKey，React Query 會立即返回緩存中的數據，無需重新發起網絡請求。
  const { data: userData, isLoading: isLoadingUserData } = useQuery({
    queryKey: ['user', session?.user?.id],
    queryFn: () => getUserData(session?.user?.id),
    enabled: !!session?.user?.id,
    staleTime: Infinity, // Profile 頁面的數據依賴 App.jsx 的刷新，自身不需要過期
  });

  // ✨ 核心變更 2: 使用我們的自定義更新 Hook
  const { mutate: updateUser, isPending: isUpdating, isSuccess, isError, error } = useUpdateUser();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    practice_language: 'en',
  });

  // 當從 React Query 獲取到 userData 後，用它來初始化表單
  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || '',
        password: '',
        confirmPassword: '',
        practice_language: userData.settings?.language || 'en',
      });
    }
  }, [userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      // 可以在這裡設置一個本地的錯誤消息 state
      console.error("Passwords do not match.");
      return;
    }
    // 調用 mutate 函數，並傳入需要的變量
    updateUser({ formData, initialData: userData });
  };

  // 創建一個 memoized 消息，以響應 mutation 的狀態
  const message = useMemo(() => {
    if (isSuccess) {
      return { text: 'Profile updated successfully!', type: 'success' };
    }
    if (isError) {
      // 對 "No changes" 的情況做特殊處理
      if (error.message === "No changes detected.") {
        return { text: error.message, type: 'info' };
      }
      return { text: `Update failed: ${error.message}`, type: 'error' };
    }
    return { text: '', type: '' };
  }, [isSuccess, isError, error]);

  const formatHongKongTime = (utcDateString) => {
    if (!utcDateString) return 'N/A';
    return formatInTimeZone(utcDateString, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss');
  };

  if (isLoadingUserData) {
    return <main className="profile-page-container"><h1 className="page-title">{t('profilePage.title')}</h1><Loader /></main>;
  }

  return (
    <main className="profile-page-container">
      <h1 className="page-title">{t('profilePage.title')}</h1>
      {message.text && <Message text={message.text} type={message.type} />}
      <form id="profile-form" className="profile-form" onSubmit={handleUpdate}>
        <div className="input-group"><label htmlFor="user-id">{t('profilePage.userId')}</label><input type="text" id="user-id" value={userData?.id || ''} disabled /></div>
        <div className="input-group"><label htmlFor="created-time">{t('profilePage.accountCreated')}</label><input type="text" id="created-time" value={formatHongKongTime(session?.user?.created_at)} disabled /></div>
        <div className="input-group"><label htmlFor="email">{t('profilePage.emailAddress')}</label><input type="email" id="email" value={session?.user?.email || ''} disabled /></div>
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
          <button type="submit" id="update-button" className="update-btn" disabled={isUpdating}>
            {isUpdating ? <Loader /> : <span>{t('profilePage.updateButton')}</span>}
          </button>
        </div>
      </form>
    </main>
  );
}
