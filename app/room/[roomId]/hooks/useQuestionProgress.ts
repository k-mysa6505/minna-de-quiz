// app/room/[roomId]/useQuestionProgress.ts
'use client';

import { useState, useEffect } from 'react';
import { getQuestionProgress } from '@/lib/services/game/questionService';
import { initializeAndStartPlayingFlow } from '@/lib/services/room/roomFlowService';
import { runServiceAction } from '@/lib/services/core/serviceAction';

export function useQuestionProgress(roomId: string, totalPlayers: number) {
  const [progress, setProgress] = useState({ created: 0, total: totalPlayers });

  useEffect(() => {
    const checkProgress = async () => {
      const progressData = await runServiceAction('questionCreation.progress', () => getQuestionProgress(roomId));
      if (!progressData) return;

      setProgress(progressData);

      if (progressData.created === progressData.total && progressData.total > 0) {
        await runServiceAction('questionCreation.startPlaying', () => initializeAndStartPlayingFlow(roomId));
      }
    };

    const interval = setInterval(checkProgress, 2000);
    checkProgress();
    return () => clearInterval(interval);
  }, [roomId]);

  return progress;
}
