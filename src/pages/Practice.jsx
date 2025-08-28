import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
// ✨ 步驟 1: 引入 useQuery 和 useQueryClient
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
// ✨ 步驟 2: 引入我們需要的 API 函數
import { updateInitialTestProgress as updateUserStatus } from '../api/supabaseAPI';

import '../styles/Practice.css';
import '../styles/Layout.css';

// --- 靜態組件 (保持不變) ---
const DiagnosisOutput = ({ result, lang }) => {
  if (!result) return null;
  return (
    <pre>
      {`【Diagnosis Layer】
- Target: '${result.target_word}'
- Diagnosis: Found ${result.full_log?.errorSummary?.length || 0} errors.
- Detected Errors: ${JSON.stringify(result.full_log?.errorSummary)}
【Decision & Generation Layer】
- Action: ${result.full_log?.action || 'New words generated.'}
`}
      <span className="green-text">💡 Reminder: Click 'Next' below to practice the next word.</span>
    </pre>
  );
};

// =================================================================
// ==   Practice 組件 (動態等級版)                                ==
// =================================================================

// ✨ 步驟 3: 修改 props，接收 userStatus
export default function Practice({ practiceLanguage, userStatus }) {
  const { t } = useTranslation();
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient(); // 獲取 queryClient 實例
  const userId = session?.user?.id;

  // ✨ 步驟 4: 使用從 props 傳來的 cur_lvl 初始化本地狀態
  // 如果 userStatus.cur_lvl 存在，就用它；否則，預設為 'Primary-School'
  const [currentDifficulty, setCurrentDifficulty] = useState(
    userStatus?.cur_lvl || 'Primary-School'
  );

  // --- 其他本地 UI 狀態 (保持不變) ---
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [diagnosis, setDiagnosis] = useState(null);
  const [generatedWords, setGeneratedWords] = useState([]);

  const initialWordListEN = useMemo(() => ["rabbit", "sun", "star", "window", "practice"], []);
  const initialWordListZH = useMemo(() => ["兔子", "太陽", "星星", "上班", "練習"], []);

  // ✨ 步驟 5: 創建一個 useMutation 來處理等級更新
  const { mutate: updateDifficulty } = useMutation({
    mutationFn: (newLevel) => 
      updateUserStatus(userId, practiceLanguage, { cur_lvl: newLevel }),
    onSuccess: () => {
      // 成功更新後，讓 user query 失效，以確保 App.jsx 能獲取最新狀態
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (error) => {
      console.error("Failed to update difficulty level:", error);
    }
  });

  // ✨ 步驟 6: 創建一個處理點擊事件的函數
  const handleDifficultyChange = (level) => {
    // 立即更新 UI，提供即時反饋
    setCurrentDifficulty(level);
    // 異步更新後端資料庫
    updateDifficulty(level);
  };

  // diagnoseSpeech mutation (保持不變)
  const { mutate: diagnoseSpeech, isPending: isAnalyzing } = useMutation({
    mutationFn: async () => {
      console.log("Simulating call to a Supabase Edge Function for analysis...");
      await new Promise(res => setTimeout(res, 1500));
      const mockAnalysisResult = {
          errorRate: 0.4,
          errorSummary: ['n', 'd'],
          decision: 'Multiple errors detected. Triggering COMPREHENSIVE PRACTICE.',
          action: "Generating practice for sounds: ['n', 'd']",
          generatedWords: ["window", "wonderful", "winter", "wind", "wander"],
      };
      const logPayload = {
        user_id: userId,
        language: practiceLanguage,
        target_word: currentWord,
        diffi_level: currentDifficulty,
        error_rate: mockAnalysisResult.errorRate,
        full_log: JSON.stringify(mockAnalysisResult),
      };
      const { data: newRecord, error: insertError } = await supabaseClient
        .from('practice_sessions')
        .insert(logPayload)
        .select()
        .single();
      if (insertError) throw insertError;
      return newRecord;
    },
    onSuccess: (newRecord) => {
      setDiagnosis(newRecord);
      setGeneratedWords(newRecord.full_log.generatedWords || []);
    },
    onError: (error) => {
      console.error("Speech diagnosis failed:", error);
    },
  });

  // --- 其他 Hooks 和函數 (保持不變) ---
  useEffect(() => {
    const wordList = practiceLanguage === 'zh' ? initialWordListZH : initialWordListEN;
    setCurrentWord(wordList[0]);
    setDiagnosis(null);
    setGeneratedWords([]);
  }, [practiceLanguage, initialWordListEN, initialWordListZH]);

  useEffect(() => {
    let intervalId;
    if (isRecording) intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(intervalId);
  }, [isRecording]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      diagnoseSpeech();
    } else {
      setDiagnosis(null);
      setTimer(0);
      setIsRecording(true);
    }
  }, [isRecording, diagnoseSpeech]);

  const handleTryAgain = () => {
    setDiagnosis(null);
  };

  const handleTryAnother = useCallback(() => {
    const wordSource = diagnosis ? generatedWords : (practiceLanguage === 'zh' ? initialWordListZH : initialWordListEN);
    const randomIndex = Math.floor(Math.random() * wordSource.length);
    setCurrentWord(wordSource[randomIndex]);
    setDiagnosis(null);
  }, [diagnosis, generatedWords, practiceLanguage, initialWordListZH, initialWordListEN]);

  const handleNext = useCallback(() => {
    if (!diagnosis || generatedWords.length === 0) return;
    const currentIndex = generatedWords.indexOf(currentWord);
    const nextIndex = (currentIndex + 1) % generatedWords.length;
    setCurrentWord(generatedWords[nextIndex]);
    setDiagnosis(null);
  }, [diagnosis, generatedWords, currentWord]);

  // ✨ 步驟 7: 調整難度等級的顯示名稱和值
  const difficultyLevels = [
    { id: 'Kindergarten', label: 'kindergarten' },
    { id: 'Primary-School', label: 'primary_school' },
    { id: 'Secondary-School', label: 'middle_school' },
    { id: 'Adult', label: 'adult' }
  ];
  const isPostAnalysis = diagnosis !== null;

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">{t('practicePage.difficultyLevel')}</h3>
          <div className="difficulty-selector">
            {/* ✨ 步驟 8: 修改按鈕的渲染和點擊事件 */}
            {difficultyLevels.map(level => (
              <button 
                key={level.id} 
                className={currentDifficulty === level.id ? 'active' : ''} 
                onClick={() => handleDifficultyChange(level.id)}
              >
                {t(`practicePage.levels.${level.label}`)}
              </button>
            ))}
          </div>
        </div>

        {/* --- 頁面其餘的 JSX 保持不變 --- */}
        <div className="practice-area">
          <p className="practice-text">{currentWord}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={handleTryAgain} disabled={!isPostAnalysis || isAnalyzing}>
              {t('practicePage.tryAgain')}
            </button>
            <button className="practice-btn primary" onClick={handleTryAnother} disabled={isPostAnalysis || isAnalyzing || isRecording}>
              {t('practicePage.tryAnother')}
            </button>
          </div>
        </div>

        {diagnosis && (
          <div className="diagnosis-container" style={{ display: 'block' }}>
            <DiagnosisOutput result={diagnosis} lang={practiceLanguage} />
            <div className="next-btn-wrapper">
              <button className="practice-btn primary" onClick={handleNext}>{t('practicePage.next')} &rarr;</button>
            </div>
          </div>
        )}
      </main>

      <div className="audio-controls">
        <button id="record-btn" className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isAnalyzing || isPostAnalysis}>
          {isRecording ? (
            <div className="record-timer">{formatTime(timer)}</div>
          ) : (
            <div className="record-btn-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T5 11H7q0 2.075 1.463 3.537T12 16q2.075 0 3.538-1.463T17 11h2q0 2.6-1.7 4.6T13 18.075V21h-2Z"/></svg>
              <span className="record-btn-text">{t('practicePage.record'  )}</span>
            </div>
          )}
        </button>
      </div>

      {isAnalyzing && (
        <div id="custom-alert-overlay" className="visible">
          <div className="alert-box">
            <div className="spinner"></div>
            <span className="alert-text">{t('practicePage.analyzing')}</span>
          </div>
        </div>
      )}
    </>
  );
}
