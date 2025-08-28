import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useReactMediaRecorder } from 'react-media-recorder';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../supabaseClient';
import { 
  postInitialTestResult, 
  markTestAsCompleted,
  getInitialTestProgress,
  updateInitialTestProgress,
  // ✨ 步驟 1: 引入 getPracticeRecords API
  getPracticeRecords 
} from '../api/supabaseAPI'; 
import ConfirmDialog from '../components/ConfirmDialog';
import initialWordData from '../data/initial-test-words.json'; 
import '../styles/Practice.css';
import '../styles/Layout.css';
import '../styles/InitialTest.css';

// --- 輔助函數和靜態元件 (保持不變) ---
const difficultyLevels = ['Kindergarten', 'Primary-School', 'Secondary-School', 'Adult'];
const totalCount = 20;

const getDifficultyLevel = (count) => {
  const difficultyIndex = Math.floor((count - 1) / 5);
  return difficultyLevels[difficultyIndex] || difficultyLevels[difficultyLevels.length - 1];
};

const getNextTestWord = (progressCount) => {
  const currentDifficulty = getDifficultyLevel(progressCount);
  const wordList = initialWordData[currentDifficulty] || []; 
  if (wordList.length === 0) return "Error: Word list empty for this level.";
  return wordList[Math.floor(Math.random() * wordList.length)];
};

// ... DiagnosisOutput 元件保持不變 ...
const DiagnosisOutput = ({ result }) => {
  if (!result) return null;
  return (
    <pre>
      {`【Diagnosis Layer】
  - Target: '${result.target_word || 'N/A'}', Possible IPAs: ${JSON.stringify(result.possible_ipa || [])}
  - User Input: ${result.user_ipa || 'N/A'}
  - Best Match: '${result.best_match_ipa || 'N/A'}'
【Phoneme Alignment】
  Target: [ ${result.aligned_target?.join(' ') || ''} ]
  User  : [ ${result.aligned_user?.join(' ') || ''} ]
  - Diagnosis Complete: Found ${result.error_count || 0} error(s) in a ${result.phoneme_count || 0}-phoneme word.
  - Detected Errors: `}<span className="yellow-text">{JSON.stringify(result.error_summary || [])}</span>
    </pre>
  );
};


// =================================================================
// ==   InitialTest 組件 (已加入智慧推薦等級功能)                  ==
// =================================================================
export default function InitialTest({ onTestComplete, practiceLanguage }) {
  const { t } = useTranslation();
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  
  // ... 所有 state 和 useReactMediaRecorder hook 保持不變 ...
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isConfirmingSkip, setIsConfirmingSkip] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const {
    status,
    startRecording,
    stopRecording,
    clearBlobUrl,
  } = useReactMediaRecorder({ 
    audio: true,
    blobPropertyBag: { type: 'audio/mp3' },
    onStop: (blobUrl, blob) => {
      analyzeRecording({ 
        audioBlob: blob, 
        word: currentWord, 
        lang: practiceLanguage 
      });
    }
  });

  const queryKey = ['initialTestProgress', userId, practiceLanguage];

  // ... useQuery 和 useMemo hooks 保持不變 ...
  const { data: testProgress, isLoading: isLoadingProgress, isError } = useQuery({
    queryKey: queryKey,
    queryFn: () => getInitialTestProgress(userId, practiceLanguage),
    enabled: !!userId && !!practiceLanguage,
    staleTime: Infinity,
    refetchOnWindowFocus: false, 
  });

  const progressCount = useMemo(() => {
    if (!testProgress?.cur_lvl || !testProgress.cur_lvl.startsWith('initial_test_')) return 1;
    return parseInt(testProgress.cur_lvl.split('_')[2], 10) || 1;
  }, [testProgress]);

  const currentWord = useMemo(() => testProgress?.cur_word, [testProgress]);
  const currentDifficulty = useMemo(() => getDifficultyLevel(progressCount), [progressCount]);
  const hasDiagnosisLog = useMemo(() => !!testProgress?.cur_log, [testProgress]);

  // ... updateTestState mutation 保持不變 ...
  const { mutate: updateTestState, isPending: isUpdatingState } = useMutation({
    mutationFn: async (updates) => {
      const updatePromise = updateInitialTestProgress(userId, practiceLanguage, updates);
      const delayPromise = new Promise(resolve => setTimeout(resolve, 2000));
      await Promise.all([updatePromise, delayPromise]);
    },
    onMutate: async (newUpdates) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      const previousState = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, old => ({ ...old, ...newUpdates }));
      return { previousState };
    },
    onError: (err, newUpdates, context) => {
      queryClient.setQueryData(queryKey, context.previousState);
      console.error("Update failed, rolled back:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  const { mutate: advanceToNextWord, isPending: isAdvancing } = useMutation({
    mutationFn: async ({ isSkip = false }) => {
      let errorCount = 0;
      let phonemeCount = 1;

      if (!isSkip && testProgress?.cur_log) {
        // ... 錯誤統計邏輯保持不變 ...
        const alignedTargetText = testProgress.cur_log.match(/Target: \[ (.*) \]/)?.[1];
        const alignedUserText = testProgress.cur_log.match(/User  : \[ (.*) \]/)?.[1];
        const targetPhonemes = alignedTargetText ? alignedTargetText.trim().split(/\s+/) : [];
        const userPhonemes = alignedUserText ? alignedUserText.trim().split(/\s+/) : [];
        const phonemeStats = {};
        if (targetPhonemes.length === userPhonemes.length) {
          for (let i = 0; i < targetPhonemes.length; i++) {
            const targetPhoneme = targetPhonemes[i];
            if (targetPhoneme !== '-') {
              if (!phonemeStats[targetPhoneme]) {
                phonemeStats[targetPhoneme] = { total_atmp: 0, err_amount: 0 };
              }
              phonemeStats[targetPhoneme].total_atmp += 1;
              if (targetPhoneme !== userPhonemes[i]) {
                phonemeStats[targetPhoneme].err_amount += 1;
              }
            }
          }
        }
        const { error: rpcError } = await supabase.rpc('update_phoneme_summary_from_stats', {
          p_user_id: userId,
          p_language: practiceLanguage,
          p_stats: phonemeStats
        });
        if (rpcError) {
          console.error('Failed to update phoneme summary:', rpcError);
        }
        const errorMatch = testProgress.cur_log.match(/Found (\d+) error\(s\) in a (\d+)-phoneme word/);
        if (errorMatch) {
            errorCount = parseInt(errorMatch[1], 10);
            phonemeCount = parseInt(errorMatch[2], 10) || 1;
        }
      }

      const newProgressCount = progressCount + 1;

      const sessionData = {
        user_id: userId,
        language: practiceLanguage,
        target_word: currentWord,
        error_rate: isSkip ? 1.0 : (errorCount / phonemeCount),
        full_log: isSkip ? JSON.stringify({ status: 'skipped' }) : testProgress?.cur_log,
      };
      await postInitialTestResult(sessionData);

      // =================================================================
      // == ✨✨✨ 核心修改：智慧推薦等級邏輯 ✨✨✨
      // =================================================================
      if (newProgressCount > totalCount) {
        // ✨ 步驟 2: 獲取該用戶的所有練習記錄
        const records = await getPracticeRecords(userId);
        
        // ✨ 步驟 3: 過濾出初始測試的記錄並計算平均錯誤率
        const initialTestRecords = records.filter(rec => rec.diffi_level === 'initial_test');
        
        let avgErrorRate = 0;
        if (initialTestRecords.length > 0) {
          const totalErrorRate = initialTestRecords.reduce((sum, rec) => sum + (rec.error_rate || 0), 0);
          avgErrorRate = (totalErrorRate / initialTestRecords.length) * 100; // 轉換為百分比
        }

        // ✨ 步驟 4: 根據您提供的規則決定推薦等級
        let suggestedLevel = 'Kindergarten'; // 預設值
        if (avgErrorRate < 25) {
          suggestedLevel = 'Adult';
        } else if (avgErrorRate < 50) {
          suggestedLevel = 'Secondary-School';
        } else if (avgErrorRate < 75) {
          suggestedLevel = 'Primary-School';
        }
        
        // ✨ 步驟 5: 將計算出的等級傳遞給後端
        await markTestAsCompleted(userId, practiceLanguage, suggestedLevel);
        
        return { isCompleted: true };

      } else {
        // --- 以下邏輯保持不變 ---
        const nextWord = getNextTestWord(newProgressCount);
        const updates = {
          cur_lvl: `initial_test_${newProgressCount}`,
          cur_word: nextWord,
          cur_log: null,
          cur_err: null,
        };
        await updateInitialTestProgress(userId, practiceLanguage, updates);
        return { isCompleted: false };
      }
    },
    onSuccess: ({ isCompleted }) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      if (isCompleted) {
        onTestComplete();
      } else {
        queryClient.invalidateQueries({ queryKey: queryKey });
        clearBlobUrl();
      }
    },
    onError: (error) => console.error("Failed to advance to next word:", error),
  });

  // ... analyzeRecording mutation 保持不變 ...
  const { mutate: analyzeRecording, isPending: isAnalyzingRecording } = useMutation({
    mutationFn: async ({ audioBlob, word, lang }) => {
      if (!audioBlob || !word || !lang || audioBlob.size === 0) {
        throw new Error(`[FRONTEND CHECK FAILED] Cannot analyze. Details: audioBlob size=${audioBlob?.size}, word=${word}, lang=${lang}`);
      }
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.mp3');
      formData.append('target_word', word);
      formData.append('language', lang);

      const { data, error } = await supabase.functions.invoke('analyze-speech', {
        body: formData,
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorJson = await error.context.json();
          throw new Error(`Analysis failed: ${errorJson.error || error.message}`);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: (error) => {
      console.error("Analysis mutation failed:", error);
      alert(error.message);
      clearBlobUrl();
    },
  });

  // ... 所有的 useEffect, 事件處理函數, 和 JSX 渲染部分都保持不變 ...
  useEffect(() => {
    if (testProgress && !testProgress.cur_word && !isUpdatingState && !isAdvancing) {
      const firstWord = getNextTestWord(1);
      updateTestState({
        cur_lvl: 'initial_test_1',
        cur_word: firstWord,
      });
    }
  }, [testProgress, isUpdatingState, isAdvancing, updateTestState]);

  useEffect(() => {
    let intervalId;
    if (isRecording) {
      intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRecording]);

  useEffect(() => {
    if (status === 'recording') {
      setIsRecording(true);
      setMediaError(null);
    }
    if (status === 'error') {
      setMediaError('Could not access the microphone. Please check your browser permissions.');
      setIsRecording(false);
    }
    if (status === 'stopped') {
      setIsRecording(false);
      setTimer(0);
    }
  }, [status]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setMediaError(null);
      clearBlobUrl();
      setTimer(0);
      startRecording();
    }
  };

  const handleNextWord = () => {
    if (isAdvancing) return;
    advanceToNextWord({ isSkip: false });
  };

  const executeSkip = () => {
    if (isAdvancing) return;
    setIsConfirmingSkip(false);
    advanceToNextWord({ isSkip: true });
  };

  const handleTryAnother = () => {
    if (isUpdatingState) return;

    const wordList = initialWordData[currentDifficulty] || [];
    if (wordList.length <= 1) return;
    let newWord;
    do {
      newWord = wordList[Math.floor(Math.random() * wordList.length)];
    } while (newWord === currentWord);
    
    updateTestState({ cur_word: newWord });
  };

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
          <h3 className="section-title">{t('initialTest.title')} ({progressCount} / {totalCount})</h3>
        </div>
        <div className="practice-area">
          <p className="practice-text">{currentWord || '...'}</p>
          <div className="practice-controls">
            <button className="practice-btn" onClick={() => setIsConfirmingSkip(true)} disabled={isUpdatingState || isProcessing || isRecording || hasDiagnosisLog}>{t('initialTest.skip')}</button>
            <button 
              className="practice-btn primary" 
              onClick={handleTryAnother} 
              disabled={isUpdatingState || isProcessing || isRecording || hasDiagnosisLog}
            >
              {isUpdatingState ? t('initialTest.coolingDown', 'Cooling Down...') : t('initialTest.tryAnother')}
            </button>
          </div>
        </div>

        {mediaError && <div className="media-error-alert">{mediaError}</div>}
        {status === 'acquiring_media' && <div className="media-info-alert">Please allow microphone access in your browser...</div>}

        {hasDiagnosisLog && (
          <div className="diagnosis-container" style={{ display: 'block' }}>
            <pre>{testProgress.cur_log}</pre>
            <div className="next-btn-wrapper">
              <button className="practice-btn primary" onClick={handleNextWord} disabled={isAdvancing}>
                {isAdvancing ? 'Saving...' : `${t('practicePage.next')} →`}
              </button>
            </div>
          </div>
        )}
      </main>
      <div className="audio-controls">
        <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle} disabled={isUpdatingState || isProcessing || hasDiagnosisLog || status === 'acquiring_media'}>
          {isRecording ? (
            <div className="record-timer">{formatTime(timer)}</div>
          ) : (
            <div className="record-btn-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T5 11H7q0 2.075 1.463 3.537T12 16q2.075 0 3.538-1.463T17 11h2q0 2.6-1.7 4.6T13 18.075V21h-2Z"/></svg>
              <span className="record-btn-text">{t('practicePage.record'     )}</span>
            </div>
          )}
        </button>
      </div>
      {isAnalyzingRecording && (
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
