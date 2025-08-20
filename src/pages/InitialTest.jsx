// src/pages/InitialTest.jsx (The final, fully synchronized version)

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/Practice.css';
import '../styles/Layout.css';

const mockDiagnose = (word) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const shouldHaveError = Math.random() > 0.3;
      if (shouldHaveError) {
        resolve({ cur_log: `Error Summary: ['th']`, cur_err: ['th'] });
      } else {
        resolve({ cur_log: `Perfect pronunciation!`, cur_err: [] });
      }
    }, 1500);
  });
};

// ✨ 核心修正: 接收從 App.jsx 傳來的 onTestComplete 函式 ✨
export default function InitialTest({ onTestComplete }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [testStatus, setTestStatus] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const fetchTestStatus = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate('/login'); return; }
    try {
      const response = await fetch('http://127.0.0.1:8000/api/initial-test/status/?lang=en', {
        headers: { 'Authorization': `Bearer ${token}` },
      } );
      if (!response.ok) throw new Error('Failed to fetch test status.');
      const data = await response.json();
      if (data.is_test_completed) {
        // 如果後端說已完成，直接呼叫 onTestComplete
        onTestComplete();
      } else {
        setTestStatus(data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [navigate, onTestComplete]);

  useEffect(() => {
    fetchTestStatus();
  }, [fetchTestStatus]);

  const postTestResult = useCallback(async (payload) => {
    setIsAnalyzing(true);
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/initial-test/status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ language: 'en', ...payload } ),
      });
      if (!response.ok) throw new Error('Failed to submit result.');
      const data = await response.json();

      if (data.is_test_completed) {
        alert('Congratulations! You have completed the initial test.');
        // ✨ 核心修正: 呼叫 onTestComplete 來更新全域狀態並跳轉 ✨
        onTestComplete();
      } else {
        setTestStatus(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [onTestComplete]);

  const handleRecordToggle = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsAnalyzing(true);
      const diagnosisResult = await mockDiagnose(testStatus.cur_word);
      await postTestResult({ status: 'completed', cur_log: diagnosisResult.cur_log, cur_err: diagnosisResult.cur_err });
    } else {
      setIsRecording(true);
    }
  };

  const handleTryAnother = () => { postTestResult({ status: 'try_another' }); };
  const handleSkip = () => { postTestResult({ status: 'skipped' }); };

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
          <p className="practice-text">{testStatus.cur_word}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={handleSkip} disabled={isAnalyzing || isRecording}>{t('initialTest.skip')}</button>
            <button className="practice-btn primary" onClick={handleTryAnother} disabled={isAnalyzing || isRecording}>{t('initialTest.tryAnother')}</button>
          </div>
        </div>
        {isAnalyzing && <div className="diagnosis-container"><pre>{t('practicePage.analyzing')}</pre></div>}
      </main>
      <div className="audio-controls">
        <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isAnalyzing}>
          <div className="record-btn-content">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T5 11H7q0 2.075 1.463 3.537T12 16q2.075 0 3.538-1.463T17 11h2q0 2.6-1.7 4.6T13 18.075V21h-2Z"/></svg>
            <span className="record-btn-text">{isRecording ? t('practicePage.stop' ) : t('practicePage.record')}</span>
          </div>
        </button>
      </div>
    </>
  );
}
