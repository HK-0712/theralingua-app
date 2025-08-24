// src/pages/Practice.jsx (React Query Refactored Version)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import '../styles/Practice.css';
import '../styles/Layout.css';

// --- 靜態組件 (保持不變) ---
const DiagnosisOutput = ({ result, lang }) => {
  if (!result) return null;
  // 為了簡潔，這裡使用一個簡化的版本，你可以用回原來的詳細版本
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
// ==   Practice 組件                                             ==
// =================================================================

export default function Practice({ practiceLanguage }) {
  const { t } = useTranslation();
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const userId = session?.user?.id;

  // --- 本地 UI 狀態 ---
  const [currentDifficulty, setCurrentDifficulty] = useState('kindergarten');
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [diagnosis, setDiagnosis] = useState(null);
  const [generatedWords, setGeneratedWords] = useState([]);

  // --- 模擬的初始單詞列表 (真實應用中可以從 API 獲取) ---
  const initialWordListEN = useMemo(() => ["rabbit", "sun", "star", "window", "practice"], []);
  const initialWordListZH = useMemo(() => ["兔子", "太陽", "星星", "上班", "練習"], []);

  // ✨ 核心變更 1: 使用 useMutation 處理語音診斷和日誌記錄
  const { mutate: diagnoseSpeech, isPending: isAnalyzing } = useMutation({
    // mutationFn 是執行的核心函數
    mutationFn: async () => {
      // --- 步驟 1: 調用 Supabase Edge Function 進行語音分析 ---
      // 這是假設的步驟，你需要替換為你自己的 Edge Function 名稱和參數
      // const { data: analysisResult, error: functionError } = await supabaseClient.functions.invoke('analyze-speech', {
      //   body: { audioBlob: '...', targetWord: currentWord, language: practiceLanguage },
      // });
      // if (functionError) throw functionError;
      
      // --- 為了演示，我們在這裡使用模擬的分析結果 ---
      console.log("Simulating call to a Supabase Edge Function for analysis...");
      await new Promise(res => setTimeout(res, 1500)); // 模擬網絡延遲
      const mockAnalysisResult = {
          errorRate: 0.4,
          errorSummary: ['n', 'd'],
          decision: 'Multiple errors detected. Triggering COMPREHENSIVE PRACTICE.',
          action: "Generating practice for sounds: ['n', 'd']",
          generatedWords: ["window", "wonderful", "winter", "wind", "wander"],
      };
      // --- 模擬結束 ---

      // --- 步驟 2: 將診斷結果記錄到數據庫 ---
      const logPayload = {
        user_id: userId,
        language: practiceLanguage,
        target_word: currentWord,
        diffi_level: currentDifficulty,
        error_rate: mockAnalysisResult.errorRate,
        full_log: JSON.stringify(mockAnalysisResult), // 將詳細的分析結果存為 JSON 字符串
      };

      const { data: newRecord, error: insertError } = await supabaseClient
        .from('practice_sessions')
        .insert(logPayload)
        .select()
        .single();

      if (insertError) throw insertError;

      // mutationFn 需要返回結果，以便 onSuccess 回調可以接收
      return newRecord;
    },
    // 成功回調
    onSuccess: (newRecord) => {
      // newRecord 是上面 mutationFn 返回的、剛插入數據庫的完整記錄
      setDiagnosis(newRecord);
      setGeneratedWords(newRecord.full_log.generatedWords || []);
    },
    // 失敗回調
    onError: (error) => {
      console.error("Speech diagnosis failed:", error);
      // 可以在此處設置一個錯誤消息 state 來提示用戶
    },
  });

  // 根據練習語言初始化單詞
  useEffect(() => {
    const wordList = practiceLanguage === 'zh' ? initialWordListZH : initialWordListEN;
    setCurrentWord(wordList[0]);
    setDiagnosis(null);
    setGeneratedWords([]);
  }, [practiceLanguage, initialWordListEN, initialWordListZH]);

  // 計時器邏輯 (不變)
  useEffect(() => {
    let intervalId;
    if (isRecording) intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(intervalId);
  }, [isRecording]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  // --- 事件處理函數 ---

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      // ✨ 核心變更 2: 停止錄音後，調用 mutation
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

  const difficultyLevels = ['kindergarten', 'primary_school', 'middle_school', 'adult'];
  const isPostAnalysis = diagnosis !== null;

  return (
    <>
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">{t('practicePage.difficultyLevel')}</h3>
          <div className="difficulty-selector">
            {difficultyLevels.map(level => (
              <button key={level} className={currentDifficulty === level ? 'active' : ''} onClick={() => setCurrentDifficulty(level)}>
                {t(`practicePage.levels.${level}`)}
              </button>
            ))}
          </div>
        </div>

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
              <span className="record-btn-text">{t('practicePage.record' )}</span>
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
