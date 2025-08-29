// src/api/supabaseAPI.js

import { supabase } from '../supabaseClient';

// =================================================================
// ==   核心用戶數據 API                                          ==
// =================================================================

/**
 * [推薦使用] 獲取指定用戶的完整個人資料，包括 settings 和 status。
 * 這個函數現在是應用中獲取用戶數據的核心。
 * @param {string} userId - 用戶 ID。
 * @returns {Promise<object>} - 包含 profile, settings, 和 status 的完整用戶對象。
 */
export const getFullUserProfile = async (userId) => {
    if (!userId) throw new Error('User ID is required.');

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        settings:user_settings(*),
        status:user_status(*)
      `)
      .eq('id', userId)
      .single(); // 使用 .single() 來獲取單一物件而不是陣列

    if (error) {
        if (error.code === 'PGRST116') {
            console.warn(`Full user profile not found for user ${userId}. This might happen during initial setup.`);
            return null;
        }
        console.error('Error fetching full user profile:', error);
        throw new Error(error.message);
    }
    
    return data;
};


/**
 * [舊版] 獲取當前登入用戶的個人資料和設置。
 * @param {string} userId - 當前用戶的 ID。
 * @returns {Promise<object>} - 包含用戶 profile 和 settings 的合併對象。
 */
export const getUserData = async (userId) => {
  if (!userId) throw new Error('User ID is required.');

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
// ==   初始測試 API                                              ==
// =================================================================

/**
 * 提交一條初始測試的日誌。
 * @param {object} sessionData - 要插入的會話數據。
 * @returns {Promise<object>} - 插入的數據。
 */
export const postInitialTestResult = async (sessionData) => {
    if (!sessionData) throw new Error('Session data is required.');
    
    const payload = {
        ...sessionData,
        diffi_level: 'initial_test'
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
 * @param {string} language - 練習語言。
 * @param {string} suggestedLevel - 根據測試結果建議的等級。
 * @returns {Promise<object>} - 更新後的 user_settings。
 */
export const markTestAsCompleted = async (userId, language, suggestedLevel = 'Primary-School') => {
    if (!userId || !language) throw new Error('User ID and language are required.');

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
// ==   初始測試狀態管理 API (新增部分)                           ==
// =================================================================

/**
 * 獲取指定用戶和語言的初始測試狀態。
 * @param {string} userId - 用戶 ID。
 * @param {string} language - 練習語言 ('en', 'zh')。
 * @returns {Promise<object>} - 包含當前進度的 user_status 對象。
 */
export const getInitialTestProgress = async (userId, language) => {
  if (!userId || !language) throw new Error('User ID and language are required.');

  const { data, error } = await supabase
    .from('user_status')
    .select('cur_lvl, cur_word, cur_log')
    .eq('user_id', userId)
    .eq('language', language)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn(`No initial test progress found for user ${userId} in language ${language}. Returning default.`);
      return { cur_lvl: 'initial_test_0', cur_word: null, cur_log: null };
    }
    console.error('Error fetching initial test progress:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * 更新用戶的初始測試進度。
 * @param {string} userId - 用戶 ID。
 * @param {string} language - 練習語言。
 * @param {object} updates - 包含要更新的欄位的對象，例如 { cur_lvl, cur_word, cur_log }。
 * @returns {Promise<object>} - 更新後的數據。
 */
export const updateInitialTestProgress = async (userId, language, updates) => {
  if (!userId || !language || !updates) throw new Error('User ID, language, and updates are required.');

  const { data, error } = await supabase
    .from('user_status')
    .update(updates)
    .eq('user_id', userId)
    .eq('language', language)
    .select()
    .single();

  if (error) {
    console.error('Error updating initial test progress:', error);
    throw new Error(error.message);
  }

  return data;
};


// =================================================================
// ==   練習記錄 API (Records.jsx)                               ==
// =================================================================

/**
 * [舊版] 獲取指定用戶的所有練習記錄。
 * @param {string} userId - 用戶 ID。
 * @returns {Promise<Array>} - 練習記錄數組。
 */
export const getPracticeRecords = async (userId) => {
    if (!userId) throw new Error('User ID is required.');

    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching practice records:', error);
        throw new Error(error.message);
    }
    return data;
};

/**
 * ✨ [新增] 獲取指定用戶和語言的音標錯誤摘要。
 * 直接從 user_progress_summary 表中查詢，並按錯誤數量排序。
 * @param {string} userId - 用戶 ID。
 * @param {string} language - 練習語言。
 * @returns {Promise<Array>} - 包含最多前 5 條音標錯誤記錄的陣列。
 */
export const getPhonemeSummary = async (userId, language) => {
  if (!userId || !language) throw new Error('User ID and language are required.');

  const { data, error } = await supabase
    .from('user_progress_summary')
    .select('phoneme, err_amount')
    .eq('user_id', userId)
    .eq('language', language)
    .order('err_amount', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching phoneme summary:', error);
    throw new Error(error.message);
  }
  return data;
};