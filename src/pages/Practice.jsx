// src/pages/Practice.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Practice.css';
import '../styles/Layout.css';

// --- 英文假資料 ---
const mockDiagnosisResultEN = {
  targetWord: 'window',
  targetIpa: '/ˈwɪndoʊ/',
  userIpa: '/ˈwɪmoʊ/',
  alignedTarget: ['w', 'ɪ', 'n', 'd', 'oʊ'],
  alignedUser: ['w', 'ɪ', '-', 'm', 'oʊ'],
  errorRate: 40.0,
  errorSummary: ['n', 'd'],
  decision: 'Multiple errors detected. Triggering COMPREHENSIVE PRACTICE.',
  action: "Generating practice for sounds: ['n', 'd']",
  generatedWords: ["window", "wonderful", "winter", "wind", "wander"],
};

// --- 中文假資料 (風格模仿您的 Python 輸出) ---
const mockDiagnosisResultZH = {
  targetWord: '上班',
  targetIpa: 'shang ban', // 簡化表示
  userIpa: 's an b an', // 簡化表示
  alignedTarget: ['shang', 'ban'],
  alignedUser: ['s an', 'ban'],
  errorRate: 50.0,
  errorSummary: ['sh', 'ang/an'], // 模仿 Python 腳本的錯誤類型
  decision: '檢測到多個錯誤，生成綜合練習。',
  action: "為【小學】等級生成的練習詞",
  generatedWords: ["上班", "山上", "晚上", "商量", "傷心"],
};


const DiagnosisOutput = ({ result, lang }) => {
  // 根據語言選擇顯示的模板
  if (lang === 'zh') {
    return (
      <pre>
        {`【診斷層】
  - 目標: '${result.targetWord}' (正確拼音: ${result.targetIpa})
  - 用戶 ASR 解析結果: '${result.userIpa}'

  - 診斷完成: 錯誤率約為 ${result.errorRate.toFixed(2)}%
  - 檢測到的發音錯誤: `}<span className="yellow-text">{JSON.stringify(result.errorSummary)}</span>{`

【決策與生成層】
  - 決策: `}<span className="magenta-text">{result.decision}</span>{`
  - ➡️  行動: `}<span className="cyan-text">{result.action}</span>
        <>
          {`\n  `}
          <span className="green-text">💡 提示: 點擊下方的 '下一個' 按鈕來練習新詞。</span>
        </>
      </pre>
    );
  }

  // 預設返回英文模板
  return (
    <pre>
      {`【Diagnosis Layer】
  - Target: '${result.targetWord}' (${result.targetIpa})
  - User: ${result.userIpa}

  - Diagnosis Complete: Error rate is ${result.errorRate.toFixed(2)}%
  - Detected Error Summary: `}<span className="yellow-text">{JSON.stringify(result.errorSummary)}</span>{`

【Decision & Generation Layer】
  - Decision: `}<span className="magenta-text">{result.decision}</span>{`
  - ➡️  Action: `}<span className="cyan-text">{result.action}</span>
      {result.action.includes("Generating practice for sounds:") && (
        <>
          {`\n  `}
          <span className="green-text">💡 Reminder: Click 'Next' below to practice the next word.</span>
        </>
      )}
    </pre>
  );
};


export default function Practice({ practiceLanguage }) {
  const { t } = useTranslation(); // 用於 UI 文字
  const [currentDifficulty, setCurrentDifficulty] = useState('kindergarten');
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [diagnosis, setDiagnosis] = useState(null);
  const [generatedWords, setGeneratedWords] = useState([]);
  const [isPostDiagnosis, setIsPostDiagnosis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- 根據練習語言準備不同的單字列表 ---
  const initialWordListEN = useMemo(() => ["rabbit", "sun", "star"], []);
  const initialWordListZH = useMemo(() => ["兔子", "太陽", "星星"], []);

  // 當練習語言改變時，更新當前單字和相關狀態
  useEffect(() => {
    const wordList = practiceLanguage === 'zh' ? initialWordListZH : initialWordListEN;
    setCurrentWord(wordList[0]);
    setDiagnosis(null); // 清除舊的診斷
    setGeneratedWords([]); // 清除生成的單字
    setIsPostDiagnosis(false);
  }, [practiceLanguage, initialWordListEN, initialWordListZH]);

  useEffect(() => {
    let intervalId;
    if (isRecording) {
      intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startRecording = () => {
    setDiagnosis(null);
    setTimer(0);
    setIsRecording(true);
  };

  const stopRecordingAndDiagnose = useCallback(() => {
    setIsRecording(false);
    setIsAnalyzing(true);
    setIsLoading(true);

    setTimeout(() => {
      const result = practiceLanguage === 'zh' ? mockDiagnosisResultZH : mockDiagnosisResultEN;
      setDiagnosis(result);
      setGeneratedWords(result.generatedWords);
      setCurrentWord(result.generatedWords[0]);
      setIsPostDiagnosis(true);
      setIsAnalyzing(false);
      setIsLoading(false);
    }, 2000);
  }, [practiceLanguage]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      stopRecordingAndDiagnose();
    } else {
      startRecording();
    }
  }, [isRecording, stopRecordingAndDiagnose]);

  const handleTryAgain = () => {
    setDiagnosis(null);
  };

  const handleTryAnother = useCallback(() => {
    const wordSource = isPostDiagnosis 
      ? generatedWords 
      : (practiceLanguage === 'zh' ? initialWordListZH : initialWordListEN);
    
    const randomIndex = Math.floor(Math.random() * wordSource.length);
    setCurrentWord(wordSource[randomIndex]);
    setDiagnosis(null);
  }, [isPostDiagnosis, generatedWords, practiceLanguage, initialWordListZH, initialWordListEN]);

  const handleNext = useCallback(() => {
    if (generatedWords.length === 0) return;
    const currentIndex = generatedWords.indexOf(currentWord);
    const nextIndex = (currentIndex + 1) % generatedWords.length;
    setCurrentWord(generatedWords[nextIndex]);
    setDiagnosis(null);
  }, [generatedWords, currentWord]);

  const difficultyLevels = ['kindergarten', 'primary_school', 'middle_school', 'adult'];

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">{t('practicePage.difficultyLevel')}</h3>
          <div className="difficulty-selector">
            {difficultyLevels.map(level => (
              <button
                key={level}
                className={currentDifficulty === level ? 'active' : ''}
                onClick={() => setCurrentDifficulty(level)}
              >
                {t(`practicePage.levels.${level}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="practice-area">
          <p className="practice-text">{currentWord}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={handleTryAgain}>{t('practicePage.tryAgain')}</button>
            <button className="practice-btn primary" onClick={handleTryAnother}>{t('practicePage.tryAnother')}</button>
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
        <button
          id="record-btn"
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordToggle}
          disabled={isAnalyzing}
        >
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

      {isLoading && (
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
