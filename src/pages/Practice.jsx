// src/pages/Practice.jsx (Corrected version, based on YOUR original code)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

// ✨ 步驟 1: 引入我們需要的【新】API 函數
import { 
  updateInitialTestProgress as updateUserStatus,
  getWeakestPhoneme,
  generatePracticeWord,
} from '../api/supabaseAPI';

import '../styles/Practice.css';
import '../styles/Layout.css';

// --- 靜態組件 (保持不變) ---
const DiagnosisOutput = ({ result, lang }) => {
  if (!result) return null;
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
// ==   Practice 組件 (在您的版本基礎上新增功能)                  ==
// =================================================================

export default function Practice({ practiceLanguage, userStatus }) {
  const { t } = useTranslation();
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  // --- 您原有的所有 State 和 Hooks (完全保留) ---
  const [currentDifficulty, setCurrentDifficulty] = useState(
    userStatus?.cur_lvl || 'Primary-School'
  );
  const [currentWord, setCurrentWord] = useState(''); // ✨ 核心修改: 初始值設為空字串
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [diagnosis, setDiagnosis] = useState(null);
  const [generatedWords, setGeneratedWords] = useState([]);

  const initialWordListEN = useMemo(() => ["rabbit", "sun", "star", "window", "practice"], []);
  const initialWordListZH = useMemo(() => ["兔子", "太陽", "星星", "上班", "練習"], []);

  const { mutate: triggerWordGeneration, isPending: isGeneratingWord } = useMutation({
    mutationFn: async () => {
      const phoneme = await getWeakestPhoneme(userId, practiceLanguage);
      const params = {
        phoneme: phoneme,
        difficulty_level: currentDifficulty.toLowerCase().replace(/-/g, '_'),
        language: practiceLanguage,
      };
      const result = await generatePracticeWord(params);
      const newWord = result.practice_word;
      if (!newWord) {
        throw new Error("Generation service did not return a word.");
      }
      // 將新單字更新到數據庫
      await updateUserStatus(userId, practiceLanguage, { cur_word: newWord });
      // 注意：這裡不再返回 newWord，因為我們將通過 query invalidation 來獲取它
    },
    onSuccess: () => {
      // ✨ 核心修正: 不再手動調用 setCurrentWord。
      // 而是讓 'user' query 失效，這會強制 App.jsx 重新獲取數據，
      // 然後通過 props 將最新的 userStatus 傳遞下來，觸發自動重渲染。
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (error) => {
      console.error("Failed to generate a new word:", error);
      alert(`Error generating word: ${error.message}`);
      // 失敗時，可以設置一個備用詞以避免頁面卡住
      setCurrentWord("practice"); 
    },
  });

  // ✨ 步驟 3: 新增一個 useEffect 來觸發自動生成
  useEffect(() => {
    // 當從 App.jsx 傳來的 userStatus 更新時，同步本地的 currentWord
    if (userStatus && userStatus.cur_word) {
      setCurrentWord(userStatus.cur_word);
    } else if (!isGeneratingWord && !currentWord) {
      // 只有在本地和 props 中都沒有單字時，才觸發生成
      triggerWordGeneration();
    }
    // 依賴項中加入 userStatus.cur_word，確保 props 變化時此 effect 會重新運行
  }, [userStatus?.cur_word, isGeneratingWord, triggerWordGeneration]);


  // --- 您原有的所有 useMutation 和函數 (完全保留) ---
  const { mutate: updateDifficulty } = useMutation({
    mutationFn: (newLevel) => 
      updateUserStatus(userId, practiceLanguage, { cur_lvl: newLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (error) => {
      console.error("Failed to update difficulty level:", error);
    }
  });

  const handleDifficultyChange = (level) => {
    setCurrentDifficulty(level);
    updateDifficulty(level);
  };

  const { mutate: diagnoseSpeech, isPending: isAnalyzing } = useMutation({
    mutationFn: async () => {
      console.log("Simulating call to a Supabase Edge Function for analysis...");
      await new Promise(res => setTimeout(res, 1500));
      const mockAnalysisResult = {
          errorRate: 0.4,
          errorSummary: ['n', 'd'],
          decision: 'Multiple errors detected. Triggering COMPREHENSIVE PRACTICE.',
          action: "Generating practice for sounds: ['n', 'd']",
          generatedWords: ["window", "wonderful", "winter", "wind", "wander"],
      };
      const logPayload = {
        user_id: userId,
        language: practiceLanguage,
        target_word: currentWord,
        diffi_level: currentDifficulty,
        error_rate: mockAnalysisResult.errorRate,
        full_log: JSON.stringify(mockAnalysisResult),
      };
      const { data: newRecord, error: insertError } = await supabaseClient
        .from('practice_sessions')
        .insert(logPayload)
        .select()
        .single();
      if (insertError) throw insertError;
      return newRecord;
    },
    onSuccess: (newRecord) => {
      setDiagnosis(newRecord);
      setGeneratedWords(newRecord.full_log.generatedWords || []);
    },
    onError: (error) => {
      console.error("Speech diagnosis failed:", error);
    },
  });

  // --- 您原有的 useEffect 和其他函數 (完全保留) ---
  useEffect(() => {
    let intervalId;
    if (isRecording) intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(intervalId);
  }, [isRecording]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
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
    // ✨ 核心修改: "Try Another" 現在也觸發單字生成
    if (isGeneratingWord || diagnosis) return;
    triggerWordGeneration();
  }, [triggerWordGeneration, isGeneratingWord, diagnosis]);

  const handleNext = useCallback(() => {
    if (!diagnosis || generatedWords.length === 0) return;
    const currentIndex = generatedWords.indexOf(currentWord);
    const nextIndex = (currentIndex + 1) % generatedWords.length;
    setCurrentWord(generatedWords[nextIndex]);
    setDiagnosis(null);
  }, [diagnosis, generatedWords, currentWord]);

  const difficultyLevels = [
    { id: 'Kindergarten', label: 'kindergarten' },
    { id: 'Primary-School', label: 'primary_school' },
    { id: 'Secondary-School', label: 'middle_school' },
    { id: 'Adult', label: 'adult' }
  ];
  const isPostAnalysis = diagnosis !== null;

  return (
    <>
      {/* --- 您的 JSX 結構 (完全保留) --- */}
      <main className="main-content width-practice">
        <div className="difficulty-section">
          <h3 className="section-title">{t('practicePage.difficultyLevel')}</h3>
          <div className="difficulty-selector">
            {difficultyLevels.map(level => (
              <button 
                key={level.id} 
                className={currentDifficulty === level.id ? 'active' : ''} 
                onClick={() => handleDifficultyChange(level.id)}
                // ✨ 新增: 在生成單字時禁用難度切換
                disabled={isGeneratingWord}
              >
                {t(`practicePage.levels.${level.label}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="practice-area">
          {/* ✨ 步驟 4: 這是您要求的唯一修改點 */}
          <p className="practice-text">
            {isGeneratingWord ? 'Generating word...' : (currentWord || '...')}
          </p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={handleTryAgain} disabled={!isPostAnalysis || isAnalyzing}>
              {t('practicePage.tryAgain')}
            </button>
            <button 
              className="practice-btn primary" 
              onClick={handleTryAnother} 
              // ✨ 修正: isPostAnalysis 應為 diagnosis
              disabled={!!diagnosis || isAnalyzing || isRecording || isGeneratingWord}
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
        <button id="record-btn" className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isAnalyzing || isPostAnalysis}>
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

      {isGeneratingWord && (
        <div id="custom-alert-overlay" className="visible">
          <div className="alert-box">
            <div className="spinner"></div>
            <span className="alert-text">Generating...</span>
          </div>
        </div>
      )}

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
