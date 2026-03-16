// app/room/[roomId]/hooks/useResultReveal.ts
'use client';

import { useState, useEffect } from 'react';
import { type Answer } from '@/types';

export function useResultReveal(correctAnswers: Answer[], showAnswerReveal: boolean) {
  const [revealedPlayers, setRevealedPlayers] = useState<string[]>([]);
  const [showPredictionResult, setShowPredictionResult] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);

  useEffect(() => {
    if (!showAnswerReveal) {
      setRevealedPlayers([]);
      setShowPredictionResult(false);
      setShowNextButton(false);
      return;
    }

    if (correctAnswers.length === 0) {
      const timer = setTimeout(() => setShowPredictionResult(true), 2000);
      return () => clearTimeout(timer);
    }

    let index = 0;
    let predictionTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      if (index < correctAnswers.length) {
        const currentAnswer = correctAnswers[index];
        if (currentAnswer && currentAnswer.playerId) {
          setRevealedPlayers(prev => [...prev, currentAnswer.playerId]);
        }
        index++;
      } else {
        clearInterval(interval);
        predictionTimer = setTimeout(() => setShowPredictionResult(true), 1000);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      if (predictionTimer) {
        clearTimeout(predictionTimer);
      }
    };
  }, [showAnswerReveal, correctAnswers]);

  useEffect(() => {
    if (showPredictionResult) {
      const timer = setTimeout(() => setShowNextButton(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [showPredictionResult]);

  return {
    revealedPlayers,
    showPredictionResult,
    showNextButton,
  };
}
