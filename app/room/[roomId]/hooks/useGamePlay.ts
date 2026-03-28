'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getAnswers, getPrediction, submitAnswer, submitPrediction, markPlayerReady, updatePredictionResult } from '@/lib/services/game/gameService';
import { getQuestions } from '@/lib/services/game/questionService';
import { updatePlayerScore } from '@/lib/services/auth/playerService';
import { calculateAnswerScoreDelta, calculatePredictionPoints, dedupeAnswersByPlayer, toMillis } from '@/lib/utils/roundScoring';
import { preloadImages } from '@/lib/utils/imagePreloader';
import { useGameStateSubscription } from './useGameStateSubscription';
import { useAnswerSubscription } from './useAnswerSubscription';
import type { Question, Player, Answer, Prediction } from '@/types';

export function useGamePlay(roomId: string, currentPlayerId: string, players: Player[], timeLimit: number, correctAnswerPoints: number, fastestAnswerBonusPoints: number, wrongAnswerPenalty: number, predictionHitBonusPoints: number) {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [predictedCorrectCount, setPredictedCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const hasCalculatedScoreRef = useRef(false);

  useEffect(() => { 
    getQuestions(roomId).then((qs) => {
      setAllQuestions(qs);
      const urls = qs.map(q => q.imageUrl).filter((url): url is string => !!url);
      preloadImages(urls);
    }).catch(console.error); 
  }, [roomId]);

  const { gameState, currentQuestion, isReady, setIsReady } = useGameStateSubscription(roomId, allQuestions, currentPlayerId);
  const { answers, prediction, hasSubmittedAnswer, hasSubmittedPrediction, currentAnswerCount } = useAnswerSubscription(roomId, currentQuestion, currentPlayerId);

  // 提出処理をメモ化
  const handleAnswerSubmit = useCallback(async (forcedAnswer?: number) => {
    if (!currentQuestion || hasSubmittedAnswer) return;
    
    // 引数があればそれを使用、なければ現在の選択値、それもなければ不正解(Correct+1)を使用
    const answerToSubmit = forcedAnswer !== undefined 
      ? forcedAnswer 
      : (selectedAnswer !== null ? selectedAnswer : (currentQuestion.correctAnswer + 1) % 4);
    
    const isCorrect = answerToSubmit === currentQuestion.correctAnswer;
    
    console.log(`[useGamePlay] Submitting answer: ${answerToSubmit} (isCorrect: ${isCorrect})`);
    await submitAnswer(roomId, currentQuestion.questionId, currentPlayerId, answerToSubmit, isCorrect).catch(console.error);
  }, [roomId, currentQuestion, currentPlayerId, selectedAnswer, hasSubmittedAnswer]);

  const handlePredictionSubmit = useCallback(async (forcedCount?: number) => {
    if (!currentQuestion || hasSubmittedPrediction) return;
    
    const countToSubmit = forcedCount !== undefined ? forcedCount : predictedCorrectCount;
    
    console.log(`[useGamePlay] Submitting prediction: ${countToSubmit}`);
    await submitPrediction(roomId, currentQuestion.questionId, currentPlayerId, countToSubmit).catch(console.error);
  }, [roomId, currentQuestion, currentPlayerId, predictedCorrectCount, hasSubmittedPrediction]);

  // フェーズ移行時のリセットと表示制御のみを行う（スコア計算はサーバーへ移行）
  useEffect(() => {
    if (gameState?.phase === 'revealing' && currentQuestion) {
      setShowResults(true);
    }
    if (gameState?.phase === 'answering') { 
      setShowResults(false); 
      hasCalculatedScoreRef.current = false; 
      setSelectedAnswer(null); 
    }
  }, [gameState?.phase, currentQuestion]);

  // 制限時間ありの場合、時間切れで未提出プレイヤーの送信を自動実行
  useEffect(() => {
    if (timeLimit <= 0 || !currentQuestion || gameState?.phase !== 'answering') return;

    const startedAtMs = toMillis(gameState.questionStartedAt);
    if (startedAtMs <= 0) return;

    const deadlineMs = startedAtMs + timeLimit * 1000;
    
    const checkTimeout = async () => {
      const remaining = deadlineMs - Date.now();
      if (remaining <= 0) {
        if (currentQuestion.authorId === currentPlayerId) {
          if (!hasSubmittedPrediction) {
            console.log('[useGamePlay] Timeout: auto-submitting prediction');
            await handlePredictionSubmit();
          }
        } else if (!hasSubmittedAnswer) {
          console.log('[useGamePlay] Timeout: auto-submitting answer');
          await handleAnswerSubmit();
        }
      }
    };

    const timer = setInterval(checkTimeout, 500);
    return () => clearInterval(timer);
  }, [roomId, currentQuestion, gameState?.phase, hasSubmittedAnswer, hasSubmittedPrediction, timeLimit, handleAnswerSubmit, handlePredictionSubmit]);

  // フェーズが強制的に revealing になった場合の最終バックアップ（サーバー側タイムアウトへの対応）
  useEffect(() => {
    if (gameState?.phase === 'revealing' && currentQuestion) {
      if (currentQuestion.authorId === currentPlayerId) {
        if (!hasSubmittedPrediction) {
          console.log('[useGamePlay] Phase changed to revealing: force-submitting prediction');
          handlePredictionSubmit();
        }
      } else if (!hasSubmittedAnswer) {
        console.log('[useGamePlay] Phase changed to revealing: force-submitting answer');
        handleAnswerSubmit();
      }
    }
  }, [gameState?.phase, currentQuestion, currentPlayerId, hasSubmittedAnswer, hasSubmittedPrediction, handleAnswerSubmit, handlePredictionSubmit]);

  const handleNextQuestion = async () => {
    await markPlayerReady(roomId, currentPlayerId).then(() => setIsReady(true)).catch(console.error);
  };

  return { 
    gameState, 
    currentQuestion, 
    selectedAnswer, 
    setSelectedAnswer, 
    predictedCorrectCount, 
    setPredictedCorrectCount, 
    hasSubmittedAnswer, 
    hasSubmittedPrediction, 
    showResults, 
    answers, 
    currentAnswerCount, 
    prediction, 
    isReady, 
    waitingForPlayers: isReady, 
    handleAnswerSubmit, 
    handlePredictionSubmit, 
    handleNextQuestion 
  };
}
