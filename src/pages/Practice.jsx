// src/pages/Practice.jsx (The final, absolutely correct, and logically sound version)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Practice.css';
import '../styles/Layout.css';

// --- All mock data and DiagnosisOutput component remain the same ---
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
const mockDiagnosisResultZH = {
  targetWord: '上班',
  targetIpa: 'shang ban',
  userIpa: 's an b an',
  alignedTarget: ['shang', 'ban'],
  alignedUser: ['s an', 'ban'],
  errorRate: 50.0,
  errorSummary: ['sh', 'ang/an'],
  decision: '檢測到多個錯誤，生成綜合練習。',
  action: "為【小學】等級生成的練習詞",
  generatedWords: ["上班", "山上", "晚上", "商量", "傷心"],
};
const DiagnosisOutput = ({ result, lang }) => {
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
  const { t } = useTranslation();
  const [currentDifficulty, setCurrentDifficulty] = useState('kindergarten');
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [diagnosis, setDiagnosis] = useState(null);
  const [generatedWords, setGeneratedWords] = useState([]);
  
  // --- ✨ 核心修正 1: 我們不再需要 isPostDiagnosis 和 isLoading 這兩個多餘的狀態 ---
  // const [isPostDiagnosis, setIsPostDiagnosis] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);

  const initialWordListEN = useMemo(() => ["rabbit", "sun", "star"], []);
  const initialWordListZH = useMemo(() => ["兔子", "太陽", "星星"], []);

  useEffect(() => {
    const wordList = practiceLanguage === 'zh' ? initialWordListZH : initialWordListEN;
    setCurrentWord(wordList[0]);
    setDiagnosis(null);
    setGeneratedWords([]);
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

    setTimeout(() => {
      const result = practiceLanguage === 'zh' ? mockDiagnosisResultZH : mockDiagnosisResultEN;
      setDiagnosis(result);
      setGeneratedWords(result.generatedWords);
      // 我們不再在這裡更新 currentWord
      // setCurrentWord(result.generatedWords[0]); 
      setIsAnalyzing(false);
    }, 2000);
  }, [practiceLanguage]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      stopRecordingAndDiagnose();
    } else {
      startRecording();
    }
  }, [isRecording, stopRecordingAndDiagnose]);

  // --- ✨ 核心修正 2: 重新定義「重試」的邏輯 ---
  const handleTryAgain = () => {
    // 「重試」的本質，就是清除上一次的診斷結果，讓使用者可以對【同一個詞】再次錄音
    setDiagnosis(null);
  };

  // --- ✨ 核心修正 3: 重新定義「換一個」的邏輯 ---
  const handleTryAnother = useCallback(() => {
    // 「換一個」的本質，是從【當前的】單字列表中，隨機選一個新詞
    // 這個列表，要麼是初始列表，要麼是診斷後生成的列表
    const wordSource = diagnosis ? generatedWords : (practiceLanguage === 'zh' ? initialWordListZH : initialWordListEN);
    const randomIndex = Math.floor(Math.random() * wordSource.length);
    setCurrentWord(wordSource[randomIndex]);
    setDiagnosis(null); // 同時，清除診斷結果
  }, [diagnosis, generatedWords, practiceLanguage, initialWordListZH, initialWordListEN]);

  // --- ✨ 核心修正 4: 重新定義「下一個」的邏輯 ---
  const handleNext = useCallback(() => {
    // 「下一個」只在診斷完成後才有意義
    if (!diagnosis || generatedWords.length === 0) return;
    
    // 從【生成的】單字列表中，按順序選取下一個
    const currentIndex = generatedWords.indexOf(currentWord);
    const nextIndex = (currentIndex + 1) % generatedWords.length;
    setCurrentWord(generatedWords[nextIndex]);
    setDiagnosis(null); // 清除診斷結果，進入下一個練習循環
  }, [diagnosis, generatedWords, currentWord]);

  const difficultyLevels = ['kindergarten', 'primary_school', 'middle_school', 'adult'];

  // --- ✨ 核心修正 5: 創建一個變數，來判斷是否處於「診斷後、等待使用者決策」的狀態 ---
  const isPostAnalysis = diagnosis !== null;

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
            {/* --- ✨ 核心修正 6: 根據新的狀態，來精準地控制按鈕的禁用邏輯 --- */}
            <button 
              className="practice-btn" 
              onClick={handleTryAgain}
              disabled={!isPostAnalysis || isAnalyzing} // 只有在分析完成後，才能點擊「重試」
            >
              {t('practicePage.tryAgain')}
            </button>
            <button 
              className="practice-btn primary" 
              onClick={handleTryAnother}
              disabled={isPostAnalysis || isAnalyzing || isRecording} // 在分析完成後，或正在分析/錄音時，禁用「換一個」
            >
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
        <button
          id="record-btn"
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordToggle}
          disabled={isAnalyzing || isPostAnalysis} // 在分析完成後，或正在分析時，禁用「麥克風」
        >
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
