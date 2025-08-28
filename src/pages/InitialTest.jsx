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
  updateInitialTestProgress
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
// ==   InitialTest 組件 (最終穩健版)                             ==
// =================================================================
export default function InitialTest({ onTestComplete, practiceLanguage }) {
  const { t } = useTranslation();
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  
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
      const newProgressCount = progressCount + 1;

      let errorCount = 0;
      let phonemeCount = 1; // 避免除以零

      if (!isSkip && testProgress?.cur_log) {
        // 使用正規表示式從日誌字串中安全地提取數字，避免 JSON 解析錯誤
        const errorMatch = testProgress.cur_log.match(/Found (\d+) error/);
        const phonemeMatch = testProgress.cur_log.match(/in a (\d+)-phoneme/);
        
        if (errorMatch) errorCount = parseInt(errorMatch[1], 10);
        if (phonemeMatch) phonemeCount = parseInt(phonemeMatch[1], 10) || 1;
      }

      const sessionData = {
        user_id: userId,
        language: practiceLanguage,
        target_word: currentWord,
        // 如果是跳過，錯誤率為 1.0；否則，根據提取的數字計算
        error_rate: isSkip ? 1.0 : (errorCount / phonemeCount),
        // 如果是跳過，儲存一個標記；否則，直接儲存從資料庫讀取的文字日誌
        full_log: isSkip ? JSON.stringify({ status: 'skipped' }) : testProgress?.cur_log,
      };
      await postInitialTestResult(sessionData);

      if (newProgressCount > totalCount) {
        await markTestAsCompleted(userId, practiceLanguage);
        return { isCompleted: true };
      } else {
        const nextWord = getNextTestWord(newProgressCount);
        const updates = {
          cur_lvl: `initial_test_${newProgressCount}`,
          cur_word: nextWord,
          cur_log: null,
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

  const { mutate: analyzeRecording, isPending: isAnalyzingRecording } = useMutation({
    mutationFn: async ({ audioBlob, word, lang }) => {
      // 前端驗證
      if (!audioBlob || !word || !lang || audioBlob.size === 0) {
        throw new Error(`[FRONTEND CHECK FAILED] Cannot analyze. Details: audioBlob size=${audioBlob?.size}, word=${word}, lang=${lang}`);
      }
      
      // 1. 創建標準的 FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.mp3');
      formData.append('target_word', word);
      formData.append('language', lang);

      // 2. 直接將 FormData 作為 body 傳遞 (最簡潔且官方推薦的方式)
      const { data, error } = await supabase.functions.invoke('analyze-speech', {
        body: formData,
      });

      // 3. 保持增強的錯誤處理
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorJson = await error.context.json();
          throw new Error(`Analysis failed: ${errorJson.error || error.message}`);
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: (error) => {
      console.error("Analysis mutation failed:", error);
      alert(error.message);
      clearBlobUrl();
    },
  });

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
              <span className="record-btn-text">{t('practicePage.record'    )}</span>
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
