// app/room/[roomId]/hooks/usePlayerStatus.ts
// プレイヤーのオンライン状態を管理するカスタムフック
'use client';

import { useEffect } from 'react';
import { updatePlayerOnlineStatus } from '@/lib/services/playerService';

export function usePlayerStatus(roomId: string, currentPlayerId: string) {
  useEffect(() => {
    if (!currentPlayerId) return;

    // ブラウザを閉じる時の処理
    const handleBeforeUnload = () => {
      updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
    };

    // タブの可視性が変わった時の処理
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
      } else {
        updatePlayerOnlineStatus(roomId, currentPlayerId, true).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
    };
  }, [roomId, currentPlayerId]);
}
