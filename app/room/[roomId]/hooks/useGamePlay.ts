'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getAnswers, getPrediction, submitAnswer, submitPrediction, markPlayerReady, updatePredictionResult } from '@/lib/services/game/gameService';
import { getQuestions } from '@/lib/services/game/questionService';
import { updatePlayerScore } from '@/lib/services/auth/playerService';
import { calculateAnswerScoreDelta, calculatePredictionPoints, dedupeAnswersByPlayer, toMillis } from '@/lib/utils/roundScoring';
import { useGameStateSubscription } from './useGameStateSubscription';
import { useAnswerSubscription } from './useAnswerSubscription';
import type { Question, Player, Answer, Prediction } from '@/types';

export function useGamePlay(roomId: string, currentPlayerId: string, players: Player[], timeLimit: number, correctAnswerPoints: number, fastestAnswerBonusPoints: number, wrongAnswerPenalty: number, predictionHitBonusPoints: number) {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [predictedCorrectCount, setPredictedCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const hasCalculatedScoreRef = useRef(false);

  useEffect(() => { getQuestions(roomId).then(setAllQuestions).catch(console.error); }, [roomId]);

  const { gameState, currentQuestion, isReady, setIsReady } = useGameStateSubscription(roomId, allQuestions, currentPlayerId);
  const { answers, prediction, hasSubmittedAnswer, hasSubmittedPrediction, currentAnswerCount } = useAnswerSubscription(roomId, currentQuestion, currentPlayerId);

  useEffect(() => {
    if (gameState?.phase === 'revealing' && currentQuestion && !hasCalculatedScoreRef.current && prediction) {
      hasCalculatedScoreRef.current = true;
      setShowResults(true);
      (async () => {
        const unique = dedupeAnswersByPlayer(answers);
        const sorted = unique.filter(a => a.isCorrect).sort((l, r) => toMillis(l.answeredAt) - toMillis(r.answeredAt));
        const fastestId = sorted[0]?.playerId;
        await updatePredictionResult(roomId, currentQuestion.questionId, sorted.length, prediction.predictedCount === sorted.length).catch(console.error);
        for (const p of players) {
          let gained = 0;
          const a = unique.find(it => it.playerId === p.playerId);
          if (a) gained += calculateAnswerScoreDelta({ isCorrect: a.isCorrect, correctAnswerPoints, fastestAnswerBonusPoints, wrongAnswerPenalty, isFastestCorrect: a.playerId === fastestId });
          if (p.playerId === currentQuestion.authorId) gained += calculatePredictionPoints(prediction.predictedCount, sorted.length, predictionHitBonusPoints);
          if (gained !== 0) await updatePlayerScore(roomId, p.playerId, p.score + gained).catch(console.error);
        }
      })();
    }
    if (gameState?.phase === 'answering') { setShowResults(false); hasCalculatedScoreRef.current = false; setSelectedAnswer(null); setPredictedCorrectCount(0); }
  }, [gameState?.phase, currentQuestion, prediction]);

  const handleAnswerSubmit = async () => {
    if (selectedAnswer === null || !currentQuestion) return;
    await submitAnswer(roomId, currentQuestion.questionId, currentPlayerId, selectedAnswer, selectedAnswer === currentQuestion.correctAnswer).catch(console.error);
  };

  const handlePredictionSubmit = async () => {
    if (!currentQuestion) return;
    await submitPrediction(roomId, currentQuestion.questionId, currentPlayerId, predictedCorrectCount).catch(console.error);
  };

  const handleNextQuestion = async () => {
    await markPlayerReady(roomId, currentPlayerId).then(() => setIsReady(true)).catch(console.error);
  };

  return { gameState, currentQuestion, selectedAnswer, setSelectedAnswer, predictedCorrectCount, setPredictedCorrectCount, hasSubmittedAnswer, hasSubmittedPrediction, showResults, answers, currentAnswerCount, prediction, isReady, waitingForPlayers: isReady, handleAnswerSubmit, handlePredictionSubmit, handleNextQuestion };
}
