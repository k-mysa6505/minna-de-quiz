// app/room/[roomId]/useResultReveal.ts
'use client';

import { useState, useEffect } from 'react';
import { type Answer } from '@/types';

export type RevealStage = 'choice' | 'scoreboard' | 'prediction';

export function useResultReveal(correctAnswers: Answer[], showAnswerReveal: boolean) {
  const [stage, setStage] = useState<RevealStage>('choice');
  const [revealedPlayers, setRevealedPlayers] = useState<string[]>([]);
  const [showNextButton, setShowNextButton] = useState(false);

  useEffect(() => {
    if (!showAnswerReveal) {
      setStage('choice');
      setRevealedPlayers([]);
      setShowNextButton(false);
      return;
    }

    // 1. 答え合わせの確認時間 (3秒) -> 'scoreboard'へ
    const toScoreboardTimer = setTimeout(() => {
      setStage('scoreboard');

      if (correctAnswers.length === 0) {
        // 正解者なしなら3秒待ってから次へ
        setTimeout(() => setStage('prediction'), 3000);
        return;
      }

      // 2. 正解者を一人ずつゆっくり表示 (1秒間隔)
      let index = 0;
      const interval = setInterval(() => {
        if (index < correctAnswers.length) {
          const currentAnswer = correctAnswers[index];
          if (currentAnswer?.playerId) {
            setRevealedPlayers(prev => [...prev, currentAnswer.playerId]);
          }
          index++;
        } else {
          clearInterval(interval);
          // 3. 全員表示後、一呼吸置いてから 'prediction' へ
          setTimeout(() => setStage('prediction'), 2000);
        }
      }, 1000);

      return () => clearInterval(interval);
    }, 3000);

    return () => clearTimeout(toScoreboardTimer);
  }, [showAnswerReveal, correctAnswers]);

  useEffect(() => {
    if (stage === 'prediction') {
      // 予想チャレンジの演出（内部で約4.5秒）が終わる頃にボタンを出す
      const timer = setTimeout(() => setShowNextButton(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return {
    stage,
    revealedPlayers,
    showNextButton,
  };
}
