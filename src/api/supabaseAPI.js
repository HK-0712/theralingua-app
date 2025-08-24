// src/api/supabaseAPI.js

import { supabase } from '../supabaseClient';

// =================================================================
// ==   核心用戶數據 API (App.jsx, Profile.jsx)                   ==
// =================================================================

/**
 * 獲取當前登入用戶的完整個人資料，包括 settings 和 status。
 * 這是應用的核心數據獲取函數。
 * @param {string} userId - 當前用戶的 ID。
 * @returns {Promise<object>} - 包含用戶 profile、settings 和 status 的合併對象。
 */
export const getUserData = async (userId) => {
  if (!userId) throw new Error('User ID is required.');

  // 使用 Promise.all 並行獲取 profiles 和 user_settings
  const [profilePromise, settingsPromise] = await Promise.all([
    supabase.from('profiles').select('id, username').eq('id', userId).single(),
    supabase.from('user_settings').select('language, sug_lvl').eq('user_id', userId).single()
  ]);

  if (profilePromise.error) {
    console.error('Error fetching user profile:', profilePromise.error);
    throw new Error(profilePromise.error.message);
  }
  if (settingsPromise.error) {
    console.error('Error fetching user settings:', settingsPromise.error);
    throw new Error(settingsPromise.error.message);
  }

  // 合併數據，提供一個統一的 user object
  return {
    ...profilePromise.data,
    settings: settingsPromise.data,
  };
};

/**
 * 更新用戶的個人資料（僅限用戶名）。
 * @param {string} userId - 用戶 ID。
 * @param {object} updates - 包含要更新的欄位的對象，例如 { username: 'New Name' }。
 * @returns {Promise<object>} - 更新後的數據。
 */
export const updateUserProfile = async (userId, updates) => {
  if (!userId || !updates) throw new Error('User ID and updates are required.');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * 更新用戶的設置（例如練習語言）。
 * @param {string} userId - 用戶 ID。
 * @param {object} updates - 包含要更新的欄位的對象，例如 { language: 'zh' }。
 * @returns {Promise<object>} - 更新後的數據。
 */
export const updateUserSettings = async (userId, updates) => {
    if (!userId || !updates) throw new Error('User ID and updates are required.');

    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      throw new Error(error.message);
    }

    return data;
};


// =================================================================
// ==   初始測試 API (InitialTest.jsx)                           ==
// =================================================================

/**
 * 獲取初始測試的狀態。
 * 我們通過檢查 user_settings 中的 sug_lvl 來判斷是否完成。
 * 注意：你的數據庫沒有 test_completed_count，所以我們前端自己管理進度。
 * @param {string} userId - 用戶 ID。
 * @returns {Promise<object>} - 包含測試是否完成的狀態。
 */
export const getInitialTestStatus = async (userId) => {
    if (!userId) throw new Error('User ID is required.');
    
    const { data, error } = await supabase
        .from('user_settings')
        .select('sug_lvl')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching initial test status:', error);
        throw new Error(error.message);
    }
    return {
        is_test_completed: !!data.sug_lvl,
    };
};

/**
 * 提交一條初始測試的日誌。
 * 我們將其記錄到 practice_sessions 表中，並用一個特殊的 diffi_level 來標記。
 * @param {object} sessionData - 要插入的會話數據。
 * @returns {Promise<object>} - 插入的數據。
 */
export const postInitialTestResult = async (sessionData) => {
    if (!sessionData) throw new Error('Session data is required.');
    
    const payload = {
        ...sessionData,
        diffi_level: 'initial_test' // 使用特殊標記
    };

    const { data, error } = await supabase
        .from('practice_sessions')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('Error posting initial test result:', error);
        throw new Error(error.message);
    }
    return data;
};

/**
 * 標記初始測試已完成，更新 user_settings 表中的 sug_lvl。
 * @param {string} userId - 用戶 ID。
 * @param {string} suggestedLevel - 根據測試結果建議的等級。
 * @returns {Promise<object>} - 更新後的 user_settings。
 */
export const markTestAsCompleted = async (userId, suggestedLevel = 'Primary-School') => {
    if (!userId) throw new Error('User ID is required.');

    const { data, error } = await supabase
        .from('user_settings')
        .update({ sug_lvl: suggestedLevel })
        .eq('user_id', userId)
        .select()
        .single();
    
    if (error) {
        console.error('Error marking test as completed:', error);
        throw new Error(error.message);
    }
    return data;
};


// =================================================================
// ==   練習記錄 API (Records.jsx)                               ==
// =================================================================

/**
 * 獲取指定用戶的所有練習記錄。
 * @param {string} userId - 用戶 ID。
 * @returns {Promise<Array>} - 練習記錄數組。
 */
export const getPracticeRecords = async (userId) => {
    if (!userId) throw new Error('User ID is required.');

    const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', userId)
        // 過濾掉初始測試的記錄
        .neq('diffi_level', 'initial_test')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching practice records:', error);
        throw new Error(error.message);
    }
    return data;
};
