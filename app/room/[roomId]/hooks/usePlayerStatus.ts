// app/room/[roomId]/hooks/usePlayerStatus.ts
// プレイヤーのオンライン状態を管理するカスタムフック
'use client';

import { useEffect } from 'react';
import { updatePlayerOnlineStatus } from '@/lib/services/playerService';

export function usePlayerStatus(roomId: string, currentPlayerId: string) {
  useEffect(() => {
    if (!currentPlayerId) return;

    let isCleaningUp = false;

    // 安全なオフライン更新関数
    const safeUpdateOffline = async () => {
      if (!isCleaningUp) {
        isCleaningUp = true;
        try {
          await updatePlayerOnlineStatus(roomId, currentPlayerId, false);
          console.log('Player status set to offline:', currentPlayerId);
        } catch (error) {
          console.error('Failed to update player offline status:', error);
        }
      }
    };

    // ブラウザを閉じる時の処理（同期的にNavigator.sendBeaconを試行）
    const handleBeforeUnload = () => {
      if (navigator.sendBeacon) {
        // sendBeaconを使用して確実に送信
        navigator.sendBeacon('/api/player-offline', JSON.stringify({
          roomId,
          playerId: currentPlayerId
        }));
      }
      safeUpdateOffline();
    };

    // タブの可視性が変わった時の処理
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        safeUpdateOffline();
      } else {
        updatePlayerOnlineStatus(roomId, currentPlayerId, true).catch(console.error);
      }
    };

    // ページ離脱時の処理（より確実）
    const handlePageHide = () => {
      safeUpdateOffline();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      safeUpdateOffline();
    };
  }, [roomId, currentPlayerId]);
}
