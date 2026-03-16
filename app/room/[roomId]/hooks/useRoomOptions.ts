// app/room/[roomId]/hooks/useRoomOptions.ts
'use client';

import { useState, useEffect } from 'react';
import { updateRoomOptions } from '@/lib/services/roomService';
import { runServiceAction } from '@/lib/services/serviceAction';
import { type Room } from '@/types';

export function useRoomOptions(roomId: string, room: Room) {
  const [timeLimit, setTimeLimit] = useState(room.timeLimit ?? 30);
  const [correctAnswerPoints, setCorrectAnswerPoints] = useState(room.correctAnswerPoints ?? 10);
  const [fastestAnswerBonusPoints, setFastestAnswerBonusPoints] = useState(room.fastestAnswerBonusPoints ?? 10);
  const [wrongAnswerPenalty, setWrongAnswerPenalty] = useState(room.wrongAnswerPenalty ?? 0);
  const [predictionHitBonusPoints, setPredictionHitBonusPoints] = useState(room.predictionHitBonusPoints ?? 50);
  const [isSavingOptions, setIsSavingOptions] = useState(false);

  useEffect(() => {
    setTimeLimit(room.timeLimit ?? 30);
    setCorrectAnswerPoints(room.correctAnswerPoints ?? 10);
    setFastestAnswerBonusPoints(room.fastestAnswerBonusPoints ?? 10);
    setWrongAnswerPenalty(room.wrongAnswerPenalty ?? 0);
    setPredictionHitBonusPoints(room.predictionHitBonusPoints ?? 50);
  }, [
    room.timeLimit,
    room.correctAnswerPoints,
    room.fastestAnswerBonusPoints,
    room.wrongAnswerPenalty,
    room.predictionHitBonusPoints,
  ]);

  const handleSaveOptions = async (onSuccess: () => void) => {
    setIsSavingOptions(true);
    const success = await runServiceAction(
      'waiting.updateOptions',
      async () => {
        await updateRoomOptions(roomId, {
          timeLimit,
          correctAnswerPoints,
          fastestAnswerBonusPoints,
          wrongAnswerPenalty,
          predictionHitBonusPoints,
        });
        return true;
      },
      {
        fallback: false,
        onError: () => alert('オプションの更新に失敗しました。'),
      }
    );

    if (success) {
      onSuccess();
    }
    setIsSavingOptions(false);
  };

  return {
    timeLimit,
    setTimeLimit,
    correctAnswerPoints,
    setCorrectAnswerPoints,
    fastestAnswerBonusPoints,
    setFastestAnswerBonusPoints,
    wrongAnswerPenalty,
    setWrongAnswerPenalty,
    predictionHitBonusPoints,
    setPredictionHitBonusPoints,
    isSavingOptions,
    handleSaveOptions,
  };
}
