// src/pages/InitialTest.jsx (React Query Refactored Version)

import React, { useState, useEffect } from 'react'; // 移除了 useCallback
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // 移除了 useQuery
import { useTranslation } from 'react-i18next';

import { postInitialTestResult, markTestAsCompleted } from '../api/supabaseAPI'; // 移除了 getInitialTestStatus
import ConfirmDialog from '../components/ConfirmDialog';
import wordData from '../data/initial-test-words.json';
import '../styles/Practice.css';
import '../styles/Layout.css';
import '../styles/InitialTest.css';

// --- 輔助函數和靜態元件 (保持不變) ---
const getNextTestWord = (completedCount) => {
  const difficultyLevels = ['Kindergarten', 'Primary-School', 'Secondary-School', 'Adult'];
  const difficultyIndex = Math.floor(completedCount / 5);
  const currentDifficulty = difficultyLevels[difficultyIndex] || difficultyLevels[difficultyLevels.length - 1];
  const wordList = wordData[currentDifficulty] || [];
  if (wordList.length === 0) return "Error: Word list empty for this level.";
  return wordList[Math.floor(Math.random() * wordList.length)];
};

const DiagnosisOutput = ({ result }) => {
  if (!result) return null;
  return (
    <pre>
      {`【Diagnosis Layer】
  - Target: '${result.targetWord}', Possible IPAs: ${result.targetIpa}
  - User Input: ${result.userIpa}
  - Best Match: '${result.targetIpa}'
  【Phoneme Alignment】
  Target: [ ${result.alignedTarget.join(' ')} ]
  User  : [ ${result.alignedUser.join(' ')} ]
  - Diagnosis Complete: Found ${result.errorCount} error(s) in a ${result.phonemeCount}-phoneme word.
  - Detected Errors: `}<span className="yellow-text">{JSON.stringify(result.errorSummary)}</span>
    </pre>
  );
};

// =================================================================
// ==   InitialTest 組件                                          ==
// =================================================================

export default function InitialTest({ onTestComplete }) {
  const { t } = useTranslation();
  const session = useSession();
  const userId = session?.user?.id;

  // --- 本地 UI 狀態 (Local UI State) ---
  // 這些狀態只與當前頁面的交互有關，保留使用 useState
  const [progressCount, setProgressCount] = useState(0); // 純前端管理的進度計數
  const [totalCount] = useState(20); // <-- 只保留 totalCount
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isConfirmingSkip, setIsConfirmingSkip] = useState(false);

  // --- React Query 狀態 (Server State) ---
  
  // ✨ 核心變更 1: 使用 useMutation 處理提交測試結果的操作
  const { mutate: submitResult, isPending: isSubmitting } = useMutation({
    mutationFn: postInitialTestResult, // API 函數
    onSuccess: () => {
      // 提交成功後，更新前端的進度計數
      const newProgress = progressCount + 1;
      setProgressCount(newProgress);
      
      // 檢查測試是否完成
      if (newProgress >= totalCount) {
        // 如果完成，調用另一個 mutation 來標記測試完成
        markCompleted.mutate();
      } else {
        // 如果未完成，準備下一個單詞
        setCurrentWord(getNextTestWord(newProgress));
        setDiagnosisResult(null);
      }
    },
    onError: (error) => {
      console.error("Failed to post test result:", error);
      // 可以在此處設置錯誤提示
    },
  });

  // ✨ 核心變更 2: 使用 useMutation 處理標記測試完成的操作
  const { mutate: markCompleted, isPending: isMarkingCompleted } = useMutation({
      mutationFn: () => markTestAsCompleted(userId),
      onSuccess: () => {
          // 成功標記後，調用父組件傳來的 onTestComplete 回調
          // 這個回調會讓 App.jsx 中的用戶數據失效並導航
          onTestComplete();
      },
      onError: (error) => {
          console.error("Failed to mark test as complete:", error);
      }
  });

  // 組件首次加載時，設置第一個單詞
  useEffect(() => {
    setCurrentWord(getNextTestWord(0));
  }, []);

  // 計時器邏輯 (純客戶端副作用，保持不變)
  useEffect(() => {
    let intervalId;
    if (isRecording) intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(intervalId);
  }, [isRecording]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  // --- 事件處理函數 (Event Handlers) ---

  const handleRecordToggle = async () => {
    if (isRecording) {
      setIsRecording(false);
      // 模擬分析過程
      await new Promise(res => setTimeout(res, 1500));
      const mockDiagnosis = { targetWord: currentWord, targetIpa: "['...']", userIpa: "['...']", alignedTarget: [], alignedUser: [], errorCount: 0, phonemeCount: 4, errorSummary: [] };
      setDiagnosisResult(mockDiagnosis);
    } else {
      setTimer(0);
      setIsRecording(true);
      setDiagnosisResult(null);
    }
  };

  // "Next" 按鈕的處理函數
  const handleNextWord = () => {
    // ✨ 核心變更 3: 調用 submitResult mutation
    submitResult({
      user_id: userId,
      language: 'en', // 或從用戶設置中獲取
      target_word: currentWord,
      error_rate: diagnosisResult.errorCount / diagnosisResult.phonemeCount,
      full_log: JSON.stringify(diagnosisResult),
      // status: 'completed' // 你的表中沒有 status，所以移除
    });
  };

  // "Skip" 按鈕的處理函數
  const executeSkip = () => {
    setIsConfirmingSkip(false);
    // ✨ 核心變更 4: 調用 submitResult mutation，但日誌內容不同
    submitResult({
      user_id: userId,
      language: 'en',
      target_word: currentWord,
      error_rate: 1.0, // 跳過算作 100% 錯誤率
      full_log: JSON.stringify({ status: 'skipped' }),
    });
  };

  // 判斷是否處於正在提交數據的加載狀態
  const isAnalyzing = isSubmitting || isMarkingCompleted;

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">{t('initialTest.title')} ({progressCount} / {totalCount})</h3>
        </div>
        <div className="practice-area">
          <p className="practice-text">{currentWord}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={() => setIsConfirmingSkip(true)} disabled={isAnalyzing || isRecording || diagnosisResult}>{t('initialTest.skip')}</button>
            <button className="practice-btn primary" onClick={() => setCurrentWord(getNextTestWord(progressCount))} disabled={isAnalyzing || isRecording || diagnosisResult}>{t('initialTest.tryAnother')}</button>
          </div>
        </div>
        {diagnosisResult && (
          <div className="diagnosis-container" style={{ display: 'block' }}>
            <DiagnosisOutput result={diagnosisResult} />
            <div className="next-btn-wrapper"><button className="practice-btn primary" onClick={handleNextWord} disabled={isAnalyzing}>{t('practicePage.next')} &rarr;</button></div>
          </div>
        )}
      </main>
      <div className="audio-controls">
        <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isAnalyzing || diagnosisResult}>
          {isRecording ? (<div className="record-timer">{formatTime(timer)}</div>) : (
            <div className="record-btn-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T5 11H7q0 2.075 1.463 3.537T12 16q2.075 0 3.538-1.463T17 11h2q0 2.6-1.7 4.6T13 18.075V21h-2Z"/></svg>
              <span className="record-btn-text">{t('practicePage.record' )}</span>
            </div>
          )}
        </button>
      </div>
      {isAnalyzing && (
        <div id="custom-alert-overlay" className="visible">
          <div className="alert-box"><div className="spinner"></div><span className="alert-text">{t('practicePage.analyzing')}</span></div>
        </div>
      )}
      <ConfirmDialog
        isOpen={isConfirmingSkip}
        title="Skip Word"
        message="Are you sure you want to skip this word? This will count as one of your 20 test items and cannot be undone."
        onConfirm={executeSkip}
        onCancel={() => setIsConfirmingSkip(false)}
      />
    </>
  );
}
