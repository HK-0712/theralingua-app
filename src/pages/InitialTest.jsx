import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useReactMediaRecorder } from 'react-media-recorder';

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

// --- 輔助函數和靜態元件 ---
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
  
  // 恢復您自己的 isRecording 和 timer state，以確保 UI 的完全控制權
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isConfirmingSkip, setIsConfirmingSkip] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [mediaError, setMediaError] = useState(null);

  // 設置 useReactMediaRecorder，但這次我們主要用它的控制函數
  const {
    status,
    startRecording,
    stopRecording,
    clearBlobUrl,
  } = useReactMediaRecorder({ 
    audio: true,
    blobPropertyBag: { type: 'audio/mp3' },
    onStop: (blobUrl, blob) => {
      analyzeRecording(blob);
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
      const sessionData = {
        user_id: userId,
        language: practiceLanguage,
        target_word: currentWord,
        error_rate: isSkip ? 1.0 : ((diagnosisResult?.error_count ?? 1) / (diagnosisResult?.phoneme_count ?? 1)),
        full_log: isSkip ? JSON.stringify({ status: 'skipped' }) : JSON.stringify(diagnosisResult),
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
        setDiagnosisResult(null);
        clearBlobUrl();
      }
    },
    onError: (error) => console.error("Failed to advance to next word:", error),
  });

  const { mutate: analyzeRecording, isPending: isAnalyzingRecording } = useMutation({
    mutationFn: async (audioBlob) => {
      if (!audioBlob) throw new Error("Audio data is missing.");
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.mp3');
      formData.append('target_word', currentWord);
      const { data, error } = await supabase.functions.invoke('analyze-speech', { body: formData });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setDiagnosisResult(data);
    },
    onError: (error) => {
      console.error("Analysis failed:", error);
      alert(`Error during analysis: ${error.message}`);
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

  // 恢復您的計時器 useEffect，讓它由您的 isRecording state 控制
  useEffect(() => {
    let intervalId;
    if (isRecording) {
      intervalId = setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRecording]);

  // 新增一個 useEffect 來監控錄音庫的狀態，並同步到您的 isRecording state
  useEffect(() => {
    if (status === 'recording') {
      setIsRecording(true);
      setMediaError(null); // 清除舊的錯誤
    }
    if (status === 'error') {
      // 如果錄音庫出錯 (例如用戶拒絕權限)，我們重置狀態
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
      stopRecording(); // 這會將 status 變為 'stopped'，並觸發 onStop
    } else {
      // 重置所有狀態，準備開始新的錄音
      setMediaError(null);
      clearBlobUrl();
      setDiagnosisResult(null);
      setTimer(0);
      startRecording(); // 這會將 status 變為 'acquiring_media'，然後是 'recording'
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
            <button className="practice-btn" onClick={() => setIsConfirmingSkip(true)} disabled={isUpdatingState || isProcessing || isRecording || diagnosisResult}>{t('initialTest.skip')}</button>
            <button 
              className="practice-btn primary" 
              onClick={handleTryAnother} 
              disabled={isUpdatingState || isProcessing || isRecording || diagnosisResult}
            >
              {isUpdatingState ? t('initialTest.coolingDown', 'Cooling Down...') : t('initialTest.tryAnother')}
            </button>
          </div>
        </div>

        {/* 新增一個區域來顯示麥克風錯誤或權限提示 */}
        {mediaError && <div className="media-error-alert">{mediaError}</div>}
        {status === 'acquiring_media' && <div className="media-info-alert">Please allow microphone access in your browser...</div>}

        {diagnosisResult && (
          <div className="diagnosis-container" style={{ display: 'block' }}>
            <DiagnosisOutput result={diagnosisResult} />
            <div className="next-btn-wrapper">
              <button className="practice-btn primary" onClick={handleNextWord} disabled={isAdvancing}>
                {isAdvancing ? 'Saving...' : `${t('practicePage.next')} →`}
              </button>
            </div>
          </div>
        )}
      </main>
      <div className="audio-controls">
        {/* 錄音按鈕的 className 現在由您自己的 isRecording state 控制，確保動畫正確 */}
        <button 
          className={`record-btn ${isRecording ? 'recording' : ''}`} 
          onClick={handleRecordToggle} 
          disabled={isUpdatingState || isProcessing || !!diagnosisResult || status === 'acquiring_media'}
        >
          {isRecording ? (
            // 恢復您原有的計時器顯示
            <div className="record-timer">{formatTime(timer)}</div>
          ) : (
            <div className="record-btn-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.075q-2.6-.35-4.3-2.325T5 11H7q0 2.075 1.463 3.537T12 16q2.075 0 3.538-1.463T17 11h2q0 2.6-1.7 4.6T13 18.075V21h-2Z"/></svg>
              <span className="record-btn-text">{t('practicePage.record' )}</span>
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
