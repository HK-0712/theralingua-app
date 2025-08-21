// src/pages/InitialTest.jsx (The final, absolutely correct, and compilable version)

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/Practice.css';
import '../styles/Layout.css';
import '../styles/InitialTest.css';
import ConfirmDialog from '../components/ConfirmDialog';

// --- ✨ 釜底抽薪的、終極的、決定性的修正 ✨ ---
//    我們必須在這裡，導入我們的 JSON 數據！
import wordData from '../data/initial-test-words.json';

// --- All helper functions and DiagnosisOutput component remain the same ---
const getNextTestWord = (completedCount) => {
  const difficultyLevels = ['Kindergarten', 'Primary-School', 'Secondary-School', 'Adult'];
  const difficultyIndex = Math.floor(completedCount / 5);
  const currentDifficulty = difficultyLevels[difficultyIndex] || difficultyLevels[difficultyLevels.length - 1];
  const wordList = wordData[currentDifficulty] || [];
  if (wordList.length === 0) return "Error: Word list empty for this level.";
  return wordList[Math.floor(Math.random() * wordList.length)];
};

const mockDiagnose = (word) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const shouldHaveError = Math.random() > 0.3;
      const result = {
        targetWord: word,
        targetIpa: "['ˈθɪŋk']",
        userIpa: shouldHaveError ? '/sɪŋk/' : '/ˈθɪŋk/',
        alignedTarget: ['θ', 'ɪ', 'ŋ', 'k'],
        alignedUser: shouldHaveError ? ['s', 'ɪ', 'ŋ', 'k'] : ['θ', 'ɪ', 'ŋ', 'k'],
        errorCount: shouldHaveError ? 1 : 0,
        phonemeCount: 4,
        errorSummary: shouldHaveError ? ['θ'] : [],
      };
      resolve(result);
    }, 1500);
  });
};

const DiagnosisOutput = ({ result }) => {
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
  const navigate = useNavigate();
  const { t } = useTranslation();

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

  const fetchTestStatus = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate('/login'); return; }
    try {
      const response = await fetch('http://127.0.0.1:8000/api/initial-test/status/?lang=en', {
        headers: { 'Authorization': `Bearer ${token}` },
      }  );
      if (!response.ok) throw new Error('Failed to fetch test status.');
      const data = await response.json();
      
      if (data.is_test_completed) {
        onTestComplete();
      } else {
        setTestStatus(data);
        setCurrentWord(getNextTestWord(data.test_completed_count));
        setDiagnosisResult(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [navigate, onTestComplete]);

  useEffect(() => {
    fetchTestStatus();
  }, [fetchTestStatus]);

  const postTestResult = useCallback(async (payload) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('http://127.0.0.1:8000/api/initial-test/status/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ language: 'en', ...payload }  ),
    });
    if (!response.ok) throw new Error('Failed to submit result.');
    return await response.json();
  }, []);

  const handleRecordToggle = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsAnalyzing(true);
      try {
        const diagnosisOutput = await mockDiagnose(currentWord);
        setDiagnosisResult(diagnosisOutput); 
        await postTestResult({ 
          status: 'completed', 
          cur_log: JSON.stringify(diagnosisOutput),
          cur_err: diagnosisOutput.errorSummary,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setTimer(0);
      setIsRecording(true);
      setDiagnosisResult(null);
    }
  };

  const handleNextWord = useCallback(async () => {
    await fetchTestStatus();
  }, [fetchTestStatus]);

  const handleSkip = () => {
    setIsConfirmingSkip(true);
  };

  const executeSkip = async () => {
    setIsConfirmingSkip(false);
    setIsAnalyzing(true);
    try {
      await postTestResult({ status: 'skipped' });
      await fetchTestStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTryAnother = useCallback(() => {
    if (testStatus) {
      setCurrentWord(getNextTestWord(testStatus.test_completed_count));
      setDiagnosisResult(null);
    }
  }, [testStatus]);

  if (error) return <div className="main-content width-practice"><p>Error: {error}</p></div>;
  if (!testStatus) return <div className="main-content width-practice"><p>Loading test...</p></div>;

  const progress = testStatus.test_completed_count;
  const total = 20;

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">{t('initialTest.title')} ({progress} / {total})</h3>
        </div>
        <div className="practice-area">
          <p className="practice-text">{currentWord}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={handleSkip} disabled={isAnalyzing || isRecording || diagnosisResult}>{t('initialTest.skip')}</button>
            <button className="practice-btn primary" onClick={handleTryAnother} disabled={isAnalyzing || isRecording || diagnosisResult}>{t('initialTest.tryAnother')}</button>
          </div>
        </div>
        {diagnosisResult && (
          <div className="diagnosis-container" style={{ display: 'block' }}>
            <DiagnosisOutput result={diagnosisResult} />
            <div className="next-btn-wrapper">
              <button className="practice-btn primary" onClick={handleNextWord}>{t('practicePage.next')} &rarr;</button>
            </div>
          </div>
        )}
      </main>
      <div className="audio-controls">
        <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isAnalyzing || diagnosisResult}>
          {isRecording ? (<div className="record-timer">{formatTime(timer)}</div>) : (
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
