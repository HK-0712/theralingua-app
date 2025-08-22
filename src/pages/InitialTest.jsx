// src/pages/InitialTest.jsx (Purified Version)

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/Practice.css';
import '../styles/Layout.css';
import '../styles/InitialTest.css';
import ConfirmDialog from '../components/ConfirmDialog';
import wordData from '../data/initial-test-words.json';

// --- 輔助函數和靜態元件 (getNextTestWord, DiagnosisOutput) 保持不變 ---
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


export default function InitialTest({ onTestComplete }) {
  const { t } = useTranslation();

  // 狀態保持不變
  const [testStatus, setTestStatus] = useState(null);
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirmingSkip, setIsConfirmingSkip] = useState(false);

  useEffect(() => {
    let intervalId;
    if (isRecording) intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(intervalId);
  }, [isRecording]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  // ✨ 淨化點 1: 移除 fetchTestStatus 的 fetch 邏輯
  const fetchTestStatus = useCallback(() => {
    // TODO: Re-implement with Supabase to fetch initial test status
    console.log("InitialTest.jsx: Fetching test status logic to be replaced by Supabase.");
    
    // 使用模擬數據來驅動 UI
    const fakeStatus = {
      is_test_completed: false,
      test_completed_count: testStatus ? testStatus.test_completed_count + 1 : 0, // 模擬進度增加
      total_test_count: 20,
    };

    if (fakeStatus.test_completed_count >= fakeStatus.total_test_count) {
      onTestComplete();
    } else {
      setTestStatus(fakeStatus);
      setCurrentWord(getNextTestWord(fakeStatus.test_completed_count));
      setDiagnosisResult(null);
    }
  }, [onTestComplete, testStatus]);

  useEffect(() => {
    // 首次加載時，使用一個初始的假狀態
    if (!testStatus) {
        const initialFakeStatus = { is_test_completed: false, test_completed_count: 0, total_test_count: 20 };
        setTestStatus(initialFakeStatus);
        setCurrentWord(getNextTestWord(0));
    }
  }, [testStatus]);

  // ✨ 淨化點 2: 移除 postTestResult 的 fetch 邏輯
  const postTestResult = useCallback(async (payload) => {
    // TODO: Re-implement with Supabase to post test results
    console.log("InitialTest.jsx: Posting test result logic to be replaced by Supabase. Payload:", payload);
    // 直接返回一個 resolved Promise，假裝成功
    return Promise.resolve({ success: true });
  }, []);

  // ✨ 淨化點 3: 移除 handleRecordToggle 中的真實錄音和分析 API 調用
  const handleRecordToggle = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsAnalyzing(true);
      try {
        // 模擬分析過程
        console.log("Simulating speech analysis for:", currentWord);
        await new Promise(res => setTimeout(res, 1500)); // 模擬網絡延遲
        const mockDiagnosis = { targetWord: currentWord, targetIpa: "['...']", userIpa: "['...']", alignedTarget: [], alignedUser: [], errorCount: 0, phonemeCount: 4, errorSummary: [] };
        setDiagnosisResult(mockDiagnosis);
        await postTestResult({ status: 'completed', cur_log: JSON.stringify(mockDiagnosis) });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // 保持開始錄音的 UI 邏輯
      setTimer(0);
      setIsRecording(true);
      setDiagnosisResult(null);
      setError('');
    }
  };

  const handleNextWord = () => {
    fetchTestStatus(); // 現在會調用淨化後的版本
  };

  const executeSkip = async () => {
    setIsConfirmingSkip(false);
    setIsAnalyzing(true);
    try {
      await postTestResult({ status: 'skipped' });
      fetchTestStatus(); // 調用淨化後的版本
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // --- 其他輔助函數和 JSX 渲染部分保持不變 ---
  if (!testStatus) return <div className="main-content width-practice"><p>Loading test...</p></div>;
  const progress = testStatus.test_completed_count;
  const total = testStatus.total_test_count;

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section"><h3 className="section-title">{t('initialTest.title')} ({progress} / {total})</h3></div>
        <div className="practice-area">
          <p className="practice-text">{currentWord}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={() => setIsConfirmingSkip(true)} disabled={isAnalyzing || isRecording || diagnosisResult}>{t('initialTest.skip')}</button>
            <button className="practice-btn primary" onClick={() => setCurrentWord(getNextTestWord(testStatus.test_completed_count))} disabled={isAnalyzing || isRecording || diagnosisResult}>{t('initialTest.tryAnother')}</button>
          </div>
        </div>
        {diagnosisResult && (
          <div className="diagnosis-container" style={{ display: 'block' }}>
            <DiagnosisOutput result={diagnosisResult} />
            <div className="next-btn-wrapper"><button className="practice-btn primary" onClick={handleNextWord}>{t('practicePage.next')} &rarr;</button></div>
          </div>
        )}
      </main>
      <div className="audio-controls">
        <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isAnalyzing || diagnosisResult}>
          {isRecording ? (<div className="record-timer">{formatTime(timer)}</div>) : (
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
