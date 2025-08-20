// src/pages/InitialTest.jsx (The final, fully functional version)

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/Practice.css'; // We can reuse the Practice page styles
import '../styles/Layout.css';

// Mock ASR diagnosis function
const mockDiagnose = (word) => {
  console.log(`Diagnosing word: ${word}`);
  // Simulate a network delay
  return new Promise(resolve => {
    setTimeout(() => {
      const shouldHaveError = Math.random() > 0.3; // 70% chance of having an error
      if (shouldHaveError) {
        resolve({
          cur_log: `【Diagnosis Layer】\n  - Target: '${word}'\n  - User: '...'\n  - Detected Error Summary: ['th']`,
          cur_err: ['th'], // Return a list of error phonemes
        });
      } else {
        resolve({
          cur_log: `【Diagnosis Layer】\n  - Target: '${word}'\n  - User: '...'\n  - Diagnosis Complete: Perfect pronunciation!`,
          cur_err: [], // Return an empty list for no errors
        });
      }
    }, 1500);
  });
};

export default function InitialTest() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // --- State Management ---
  const [testStatus, setTestStatus] = useState(null); // To store the whole status object from backend
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // --- Fetch initial test status from backend ---
  const fetchTestStatus = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:8000/api/initial-test/status/?lang=en', {
        headers: { 'Authorization': `Bearer ${token}` },
      } );
      if (!response.ok) throw new Error('Failed to fetch test status.');
      const data = await response.json();

      if (data.is_test_completed) {
        localStorage.setItem('hasCompletedInitialTest', 'true');
        navigate('/introduction');
      } else {
        setTestStatus(data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTestStatus();
  }, [fetchTestStatus]);

  // --- Handle POSTing results to backend ---
  const postTestResult = useCallback(async (payload) => {
    setIsAnalyzing(true);
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/initial-test/status/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ language: 'en', ...payload } ),
      });
      if (!response.ok) throw new Error('Failed to submit result.');
      const data = await response.json();

      if (data.is_test_completed) {
        localStorage.setItem('hasCompletedInitialTest', 'true');
        alert('Congratulations! You have completed the initial test.');
        navigate('/introduction');
      } else {
        setTestStatus(data); // Update state with the next word
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [navigate]);

  // --- Button Click Handlers ---
  const handleRecordToggle = async () => {
    if (isRecording) {
      // Stop recording and start analyzing
      setIsRecording(false);
      setIsAnalyzing(true);
      const diagnosisResult = await mockDiagnose(testStatus.cur_word);
      await postTestResult({
        status: 'completed',
        cur_log: diagnosisResult.cur_log,
        cur_err: diagnosisResult.cur_err,
      });
    } else {
      // Start recording
      setIsRecording(true);
    }
  };

  const handleTryAnother = () => {
    postTestResult({ status: 'try_another' });
  };

  const handleSkip = () => {
    postTestResult({ status: 'skipped' });
  };

  // --- Render Logic ---
  if (error) return <div className="main-content width-practice"><p>Error: {error}</p></div>;
  if (!testStatus) return <div className="main-content width-practice"><p>Loading test...</p></div>;

  const progress = testStatus.test_completed_count;
  const total = 20;

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">
            {t('initialTest.title')} ({progress} / {total})
          </h3>
        </div>

        <div className="practice-area">
          <p className="practice-text">{testStatus.cur_word}</p>
          <div className="practice-controls">
            {/* The "Try Again" button in this context doesn't make sense, so we remove it */}
            <button className="practice-btn" onClick={handleSkip} disabled={isAnalyzing || isRecording}>
              {t('initialTest.skip')}
            </button>
            <button className="practice-btn primary" onClick={handleTryAnother} disabled={isAnalyzing || isRecording}>
              {t('initialTest.tryAnother')}
            </button>
          </div>
        </div>

        {isAnalyzing && (
          <div className="diagnosis-container">
            <pre>{t('practicePage.analyzing')}</pre>
          </div>
        )}
      </main>

      <div className="audio-controls">
        <button
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordToggle}
          disabled={isAnalyzing}
        >
          {/* We simplify the button content for the test page */}
          <div className="record-btn-content">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T5 11H7q0 2.075 1.463 3.537T12 16q2.075 0 3.538-1.463T17 11h2q0 2.6-1.7 4.6T13 18.075V21h-2Z"/></svg>
            <span className="record-btn-text">
              {isRecording ? t('practicePage.stop' ) : t('practicePage.record')}
            </span>
          </div>
        </button>
      </div>
    </>
  );
}
