// lib/services/presenceService.ts
// Realtime Databaseでプレイヤーの接続状態を監視

import { ref, onDisconnect, set, serverTimestamp, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { updatePlayerOnlineStatus } from './playerService';

/**
 * プレイヤーの接続状態を監視（自動でオフライン検知）
 * @param roomId - ルームID
 * @param playerId - プレイヤーID
 * @returns クリーンアップ関数
 */
export function setupPresence(
  roomId: string,
  playerId: string
): () => void {
  console.log(`Setting up presence for player ${playerId} in room ${roomId}`);
  const presenceRef = ref(rtdb, `rooms/${roomId}/players/${playerId}/presence`);

  // オンライン状態を設定
  set(presenceRef, {
    isOnline: true,
    lastChanged: serverTimestamp()
  }).then(() => {
    console.log(`Presence set to online for ${playerId}`);
  }).catch((error) => {
    console.error(`Error setting presence for ${playerId}:`, error);
  });

  // 切断時にオフライン状態を設定
  onDisconnect(presenceRef).set({
    isOnline: false,
    lastChanged: serverTimestamp()
  }).then(() => {
    console.log(`onDisconnect handler set for ${playerId}`);
  }).catch((error) => {
    console.error(`Error setting onDisconnect for ${playerId}:`, error);
  });

  // クリーンアップ関数を返す
  return () => {
    console.log(`Cleaning up presence for ${playerId}`);
    (async () => {
      try {
        await onDisconnect(presenceRef).cancel();
        await set(presenceRef, {
          isOnline: false,
          lastChanged: serverTimestamp()
        });
        await updatePlayerOnlineStatus(roomId, playerId, false);
        console.log(`Presence cleaned up for ${playerId}`);
      } catch (error) {
        console.error('Failed to cleanup presence:', error);
      }
    })();
  };
}

/**
 * プレイヤーのオンライン状態を購読
 * @param roomId - ルームID
 * @param playerId - プレイヤーID
 * @param callback - 状態変更時のコールバック
 * @returns クリーンアップ関数
 */
export function subscribeToPresence(
  roomId: string,
  playerId: string,
  callback: (isOnline: boolean) => void
): () => void {
  const presenceRef = ref(rtdb, `rooms/${roomId}/players/${playerId}/presence`);

  // オンライン状態の変更を監視
  const unsubscribe = onValue(presenceRef, (snapshot) => {
    const data = snapshot.val();
    callback(data?.isOnline ?? false);
  });

  return unsubscribe;
}
