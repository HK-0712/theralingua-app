// src/pages/InitialTest.jsx (The new, persistent, and full version)

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { 
  postInitialTestResult, 
  markTestAsCompleted,
  getInitialTestProgress,
  updateInitialTestProgress
} from '../api/supabaseAPI'; 
import ConfirmDialog from '../components/ConfirmDialog';
import initialWordData from '../data/initial-test-words.json'; 
import '../styles/Practice.css';
import '../styles/Layout.css';
import '../styles/InitialTest.css';

// --- 輔助函數和靜態元件 ---
const difficultyLevels = ['Kindergarten', 'Primary-School', 'Secondary-School', 'Adult'];
const totalCount = 20;

const getDifficultyLevel = (count) => {
  const difficultyIndex = Math.floor(count / 5);
  return difficultyLevels[difficultyIndex] || difficultyLevels[difficultyLevels.length - 1];
};

const getNextTestWord = (completedCount) => {
  const currentDifficulty = getDifficultyLevel(completedCount);
  const wordList = initialWordData[currentDifficulty] || []; 
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
// ==   InitialTest 組件 (重構後)                                 ==
// =================================================================

export default function InitialTest({ onTestComplete, practiceLanguage }) {
  const { t } = useTranslation();
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  // --- 本地 UI 狀態 ---
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isConfirmingSkip, setIsConfirmingSkip] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null); // 用於顯示模擬的診斷結果

  // ✨ 1. 使用 useQuery 從數據庫讀取測試進度 ✨
  const { data: testProgress, isLoading: isLoadingProgress, isError } = useQuery({
    queryKey: ['initialTestProgress', userId, practiceLanguage],
    queryFn: () => getInitialTestProgress(userId, practiceLanguage),
    enabled: !!userId && !!practiceLanguage,
    staleTime: 1000 * 60 * 5, // 5分鐘內數據視為新鮮
    refetchOnWindowFocus: false, // 確保切換窗口不會重置狀態
  });

  // ✨ 2. 從 useQuery 的數據中派生出 UI 需要的變量 ✨
  const progressCount = useMemo(() => {
    if (!testProgress?.cur_lvl || !testProgress.cur_lvl.startsWith('initial_test_')) return 0;
    return parseInt(testProgress.cur_lvl.split('_')[2], 10) || 0;
  }, [testProgress]);

  const currentWord = useMemo(() => testProgress?.cur_word, [testProgress]);
  const currentDifficulty = useMemo(() => getDifficultyLevel(progressCount), [progressCount]);

  // ✨ 3. 使用 useMutation 處理所有後端更新，這是防止重複點擊的核心 ✨
  const { mutate: advanceToNextWord, isPending: isAdvancing } = useMutation({
    mutationFn: async ({ isSkip = false }) => {
      const newProgressCount = progressCount + 1;

      // 步驟 A: 記錄本次結果到 practice_sessions
      const sessionData = {
        user_id: userId,
        language: practiceLanguage,
        target_word: currentWord,
        error_rate: isSkip ? 1.0 : (diagnosisResult.errorCount / diagnosisResult.phonemeCount),
        full_log: isSkip ? JSON.stringify({ status: 'skipped' }) : JSON.stringify(diagnosisResult),
      };
      await postInitialTestResult(sessionData);

      // 步驟 B: 判斷測試是否完成
      if (newProgressCount >= totalCount) {
        await markTestAsCompleted(userId, practiceLanguage);
        return { isCompleted: true };
      } else {
        // 步驟 C: 如果未完成，更新 user_status 表以持久化進度
        const nextWord = getNextTestWord(newProgressCount);
        const updates = {
          cur_lvl: `initial_test_${newProgressCount}`,
          cur_word: nextWord,
          cur_log: null, // 清空日誌
        };
        await updateInitialTestProgress(userId, practiceLanguage, updates);
        return { isCompleted: false };
      }
    },
    onSuccess: ({ isCompleted }) => {
      queryClient.invalidateQueries({ queryKey: ['user'] }); // 讓 App.jsx 知道測試狀態可能已變
      if (isCompleted) {
        onTestComplete(); // 觸發 App.jsx 中的導航
      } else {
        // 使 'initialTestProgress' 查詢失效，觸發 useQuery 重新獲取最新進度
        queryClient.invalidateQueries({ queryKey: ['initialTestProgress', userId, practiceLanguage] });
        setDiagnosisResult(null); // 清空本地的診斷結果 UI
      }
    },
    onError: (error) => {
      console.error("Failed to advance to next word:", error);
      // 可以在此處添加用戶提示
    },
  });

  // 模擬 AI 分析的 Mutation
  const { mutate: analyzeRecording, isPending: isAnalyzingRecording } = useMutation({
    mutationFn: async () => {
      await new Promise(res => setTimeout(res, 1500));
      const mockDiagnosis = { 
        targetWord: currentWord, targetIpa: "['...']", userIpa: "['...']", 
        alignedTarget: [], alignedUser: [], errorCount: 0, phonemeCount: 4, errorSummary: [] 
      };
      return mockDiagnosis;
    },
    onSuccess: (data) => {
        setDiagnosisResult(data);
        // 當您的 Edge Function 完成後，可以在這裡將結果更新到 user_status
        // updateInitialTestProgress(userId, practiceLanguage, { cur_log: JSON.stringify(data) });
    },
    onError: (error) => console.error("Analysis failed:", error),
  });

  // ✨ 4. 處理用戶首次進入測試或數據庫無單詞的初始化邏輯 ✨
  useEffect(() => {
    if (testProgress && !testProgress.cur_word && !isAdvancing) {
      const firstWord = getNextTestWord(0);
      updateInitialTestProgress(userId, practiceLanguage, {
        cur_lvl: 'initial_test_0',
        cur_word: firstWord,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['initialTestProgress', userId, practiceLanguage] });
      });
    }
  }, [testProgress, userId, practiceLanguage, queryClient, isAdvancing]);

  // 計時器邏輯
  useEffect(() => {
    let intervalId;
    if (isRecording) intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(intervalId);
  }, [isRecording]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  // --- 事件處理函數 ---
  const handleRecordToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      analyzeRecording(); 
    } else {
      setTimer(0);
      setIsRecording(true);
      setDiagnosisResult(null);
    }
  };

  const handleNextWord = () => {
    if (isAdvancing) return; // 雙重保險，防止在 disabled 狀態下觸發
    advanceToNextWord({ isSkip: false });
  };

  const executeSkip = () => {
    if (isAdvancing) return;
    setIsConfirmingSkip(false);
    advanceToNextWord({ isSkip: true });
  };

  const handleTryAnother = () => {
    const wordList = initialWordData[currentDifficulty] || [];
    if (wordList.length <= 1) return;
    let newWord;
    do {
      newWord = wordList[Math.floor(Math.random() * wordList.length)];
    } while (newWord === currentWord);
    // 更新數據庫中的當前單詞
    updateInitialTestProgress(userId, practiceLanguage, { cur_word: newWord })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['initialTestProgress', userId, practiceLanguage] });
      });
  };

  // ✨ 5. 統一管理所有載入和禁用狀態 ✨
  const isProcessing = isAnalyzingRecording || isAdvancing;

  if (isLoadingProgress) {
    return <main className="main-content width-practice"><div className="spinner"></div> Loading test...</main>;
  }
  if (isError) {
    return <main className="main-content width-practice"><p>Error loading test data. Please try again.</p></main>;
  }

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">{t('initialTest.title')} ({progressCount + 1} / {totalCount})</h3>
        </div>
        <div className="practice-area">
          <p className="practice-text">{currentWord || '...'}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={() => setIsConfirmingSkip(true)} disabled={isProcessing || isRecording || diagnosisResult}>{t('initialTest.skip')}</button>
            <button className="practice-btn primary" onClick={handleTryAnother} disabled={isProcessing || isRecording || diagnosisResult}>{t('initialTest.tryAnother')}</button>
          </div>
        </div>
        {diagnosisResult && (
          <div className="diagnosis-container" style={{ display: 'block' }}>
            <DiagnosisOutput result={diagnosisResult} />
            <div className="next-btn-wrapper">
              <button className="practice-btn primary" onClick={handleNextWord} disabled={isAdvancing}>
                {isAdvancing ? 'Saving...' : `${t('practicePage.next')} →`}
              </button>
            </div>
          </div>
        )}
      </main>
      <div className="audio-controls">
        <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isProcessing || diagnosisResult}>
          {isRecording ? (
            <div className="record-timer">{formatTime(timer)}</div>
          ) : (
            <div className="record-btn-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T5 11H7q0 2.075 1.463 3.537T12 16q2.075 0 3.538-1.463T17 11h2q0 2.6-1.7 4.6T13 18.075V21h-2Z"/></svg>
              <span className="record-btn-text">{t('practicePage.record' )}</span>
            </div>
          )}
        </button>
      </div>
      {isProcessing && !isAdvancing && (
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
