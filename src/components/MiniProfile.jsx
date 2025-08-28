// src/components/MiniProfile.jsx (The Final, "PHP-Style", Direct-Query Fix)

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query'; // ✨ 1. 引入 useQuery
import { supabase } from '../supabaseClient'; // ✨ 2. 引入 supabase 客戶端
import './MiniProfile.css';

// ✨ 3. 創建一個專門的、只獲取語言的 API 函數
const getPracticeLanguage = async (userId) => {
  if (!userId) return 'en'; // 如果沒有用戶 ID，返回預設值
  const { data, error } = await supabase
    .from('user_settings')
    .select('language')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error("Error fetching practice language:", error);
    return 'en'; // 出錯時返回預設值
  }
  return data?.language || 'en';
};


const MiniProfile = ({ userData }) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  // ✨ 4. 發起一個獨立的、專門的查詢，只為了獲取最新的語言
  // 這個查詢會自動在數據更新後重新獲取，確保數據永遠是最新的
  const { data: latestPracticeLanguage } = useQuery({
    // 查詢 key 包含用戶 ID，確保是針對當前用戶的
    queryKey: ['practiceLanguage', userData?.id],
    // 調用我們剛剛創建的 API 函數
    queryFn: () => getPracticeLanguage(userData?.id),
    // 只有在 userData 存在時才執行
    enabled: !!userData?.id,
    // 設置一個短的 staleTime，確保數據能及時更新
    staleTime: 1000 * 30, // 30 秒
  });

  // 5. 完全保留您原本的、能正常工作的 initialTestStatus 邏輯
  const initialTestStatus = useMemo(() => {
    if (!userData?.status?.cur_lvl || !userData.status.cur_lvl.startsWith('initial_test_')) {
      return null;
    }
    const progressCount = parseInt(userData.status.cur_lvl.split('_')[2], 10) || 1;
    return {
      levelText: `Initial Test ${progressCount}`, 
      progressText: `(${progressCount}/20)`,
      currentWord: userData.status.cur_word || 'N/A',
    };
  }, [userData?.status]);

  if (!userData) {
    return null;
  }

  const getDisplayLanguage = (langCode) => {
    const languageMap = { en: 'English', zh: '繁體中文' };
    return languageMap[langCode] || langCode;
  };

  // 6. 完全保留您原本的變數定義
  const { id, email, username, status } = userData;
  const suggestedLevel = userData.settings?.sug_lvl || 'N/A';
  const hasCompletedTest = !!suggestedLevel;

  return (
    <div 
      className="mini-profile-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="profile-content">
        {isHovered ? (
          <>
            <h4 className="status-header">{t('miniProfile.statusTitle', 'Current Status')}</h4>
            
            {/* ✨ 7. 釜底抽薪的唯一修正：使用我們獨立查詢到的、絕對最新的語言數據 */}
            <p><strong>{t('miniProfile.language', 'Language')}:</strong> {getDisplayLanguage(latestPracticeLanguage)}</p>
            
            {hasCompletedTest ? (
              <>
                <p><strong>{t('miniProfile.sug_lvl', 'Suggested Lvl')}:</strong> {suggestedLevel}</p>
                <p><strong>{t('miniProfile.cur_lvl', 'Current Lvl')}:</strong> {initialTestStatus?.levelText}</p>
                <p><strong>{t('miniProfile.target', 'Target Word')}:</strong> {status?.cur_word || 'N/A'}</p>
                <p><strong>{t('miniProfile.errors')}:</strong> {status?.cur_err || 'N/A'}</p>
              </>
            ) : (
              <>
                <p>
                  <strong>{t('miniProfile.cur_lvl', 'Current Lvl')}:</strong> 
                  {initialTestStatus?.levelText}
                  <span style={{ color: 'var(--text-light)', marginLeft: '0.5em' }}>
                    {initialTestStatus?.progressText}
                  </span>
                </p>
                <p><strong>{t('miniProfile.currentWord', 'Current Word')}:</strong> {initialTestStatus?.currentWord}</p>
              </>
            )}
          </>
        ) : (
          <>
            <h4 className="status-header">{t('miniProfile.title', 'Mini Profile')}</h4>
            <p><strong>{t('miniProfile.userId')}</strong> {id}</p>
            <p><strong>{t('miniProfile.emailAddress')}</strong> {email}</p>
            <p><strong>{t('miniProfile.userName')}</strong> {username || 'N/A'}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MiniProfile;
