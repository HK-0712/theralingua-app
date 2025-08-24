// src/pages/InitialTest.jsx (The final version with precise logic control)

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { postInitialTestResult, markTestAsCompleted } from '../api/supabaseAPI'; 
import ConfirmDialog from '../components/ConfirmDialog';
import initialWordData from '../data/initial-test-words.json'; 
import '../styles/Practice.css';
import '../styles/Layout.css';
import '../styles/InitialTest.css';

// --- 輔助函數和靜態元件 ---
const difficultyLevels = ['Kindergarten', 'Primary-School', 'Secondary-School', 'Adult'];

// 根據總進度計算當前難度等級
const getDifficultyLevel = (count) => {
  const difficultyIndex = Math.floor(count / 5);
  return difficultyLevels[difficultyIndex] || difficultyLevels[difficultyLevels.length - 1];
};

// 根據總進度獲取下一個單詞
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
// ==   InitialTest 組件                                          ==
// =================================================================

export default function InitialTest({ onTestComplete }) {
  const { t } = useTranslation();
  const session = useSession();
  const userId = session?.user?.id;

  const [progressCount, setProgressCount] = useState(0);
  const [totalCount] = useState(20);
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isConfirmingSkip, setIsConfirmingSkip] = useState(false);

  // 使用 useMemo 來計算當前難度等級，避免重複計算
  const currentDifficulty = useMemo(() => getDifficultyLevel(progressCount), [progressCount]);

  const { mutate: analyzeRecording, isPending: isAnalyzingRecording } = useMutation({
    mutationFn: async () => {
      await new Promise(res => setTimeout(res, 1500));
      const mockDiagnosis = { 
        targetWord: currentWord, targetIpa: "['...']", userIpa: "['...']", 
        alignedTarget: [], alignedUser: [], errorCount: 0, phonemeCount: 4, errorSummary: [] 
      };
      return mockDiagnosis;
    },
    onSuccess: (data) => setDiagnosisResult(data),
    onError: (error) => console.error("Analysis failed:", error),
  });

  const { mutate: submitResult, isPending: isSubmitting } = useMutation({
    mutationFn: postInitialTestResult,
    onSuccess: () => {
      const newProgress = progressCount + 1;
      setProgressCount(newProgress);
      if (newProgress >= totalCount) {
        markCompleted.mutate();
      } else {
        setCurrentWord(getNextTestWord(newProgress));
        setDiagnosisResult(null);
      }
    },
    onError: (error) => console.error("Failed to post test result:", error),
  });

  const { mutate: markCompleted, isPending: isMarkingCompleted } = useMutation({
    mutationFn: () => markTestAsCompleted(userId),
    onSuccess: () => onTestComplete(),
    onError: (error) => console.error("Failed to mark test as complete:", error),
  });

  useEffect(() => {
    setCurrentWord(getNextTestWord(0));
  }, []);

  useEffect(() => {
    let intervalId;
    if (isRecording) intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(intervalId);
  }, [isRecording]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

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
    submitResult({
      user_id: userId,
      language: 'en',
      target_word: currentWord,
      error_rate: diagnosisResult.errorCount / diagnosisResult.phonemeCount,
      full_log: JSON.stringify(diagnosisResult),
    });
  };

  const executeSkip = () => {
    setIsConfirmingSkip(false);
    submitResult({
      user_id: userId,
      language: 'en',
      target_word: currentWord,
      error_rate: 1.0,
      full_log: JSON.stringify({ status: 'skipped' }),
    });
  };

  // ✨ 修正 "Try Another" 的邏輯 ✨
  const handleTryAnother = () => {
    const wordList = initialWordData[currentDifficulty] || [];
    if (wordList.length <= 1) return; // 如果只有一個單詞，無法更換

    let newWord;
    do {
      newWord = wordList[Math.floor(Math.random() * wordList.length)];
    } while (newWord === currentWord); // 確保新單詞與舊單詞不同

    setCurrentWord(newWord);
  };

  // ✨ 修正 isAnalyzing 的定義，只在分析錄音時顯示載入 ✨
  const isAnalyzing = isAnalyzingRecording;

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">{t('initialTest.title')} ({progressCount + 1} / {totalCount})</h3>
        </div>
        <div className="practice-area">
          <p className="practice-text">{currentWord}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={() => setIsConfirmingSkip(true)} disabled={isAnalyzing || isRecording || diagnosisResult}>{t('initialTest.skip')}</button>
            {/* ✨ 將新的處理函數綁定到按鈕上 ✨ */}
            <button className="practice-btn primary" onClick={handleTryAnother} disabled={isAnalyzing || isRecording || diagnosisResult}>{t('initialTest.tryAnother')}</button>
          </div>
        </div>
        {diagnosisResult && (
          <div className="diagnosis-container" style={{ display: 'block' }}>
            <DiagnosisOutput result={diagnosisResult} />
            <div className="next-btn-wrapper">
              <button className="practice-btn primary" onClick={handleNextWord} disabled={isAnalyzing}>{t('practicePage.next')} &rarr;</button>
            </div>
          </div>
        )}
      </main>
      <div className="audio-controls">
        <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isAnalyzing || diagnosisResult}>
          {isRecording ? (
            <div className="record-timer">{formatTime(timer)}</div>
          ) : (
            <div className="record-btn-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T5 11H7q0 2.075 1.463 3.537T12 16q2.075 0 3.538-1.463T17 11h2q0 2.6-1.7 4.6T13 18.075V21h-2Z"/></svg>
              <span className="record-btn-text">{t('practicePage.record'   )}</span>
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
