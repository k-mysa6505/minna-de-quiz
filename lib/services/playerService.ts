// lib/services/playerService.ts
// プレイヤー管理サービス

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Player } from '@/types';

/**
 * プレイヤーを追加
 */
export async function addPlayer(
  roomId: string,
  nickname: string,
  isMaster: boolean = false
): Promise<string> {
  console.log(`Adding player: ${nickname} (Master: ${isMaster}) to room: ${roomId}`);
  try {
    // ニックネームの重複チェック
    const isDuplicate = await isNicknameTaken(roomId, nickname);
    if (isDuplicate) {
      console.warn(`Nickname duplicate: ${nickname} in room ${roomId}`);
      throw new Error('おっと、その名前はすでに使われているよ！');
    }

    // プレイヤー情報をFirestoreに追加
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const playerData = {
      nickname,
      isOnline: true,
      isMaster,
      score: 0,
      joinedAt: Timestamp.now(),
    };

    console.log('Writing player to Firestore:', playerData);
    const playerDoc = await addDoc(playersRef, playerData);
    console.log(`Player added successfully. ID: ${playerDoc.id}`);

    return playerDoc.id;
  } catch (error) {
    console.error('Error adding player:', error);
    throw error;
  }
}

/**
 * ルーム内の全プレイヤーを取得
 */
export async function getPlayers(roomId: string): Promise<Player[]> {
  console.log(`Getting players for room: ${roomId}`);
  try {
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const playersSnapshot = await getDocs(playersRef);
    console.log(`Found ${playersSnapshot.size} players`);

    const players: Player[] = playersSnapshot.docs.map(doc => ({
      playerId: doc.id,
      ...(doc.data() as Omit<Player, 'playerId'>)
    }));
    return players;
  } catch (error) {
    console.error(`Error getting players for room ${roomId}:`, error);
    throw error;
  }
}

/**
 * プレイヤー一覧をリアルタイム監視
 */
export function subscribeToPlayers(
  roomId: string,
  callback: (players: Player[]) => void
): () => void {
  const playersRef = collection(db, 'rooms', roomId, 'players');
  const unsubscribe = onSnapshot(playersRef, snapshot => {
    const players: Player[] = snapshot.docs.map(doc => ({
      playerId: doc.id,
      ...(doc.data() as Omit<Player, 'playerId'>)
    }));
    callback(players);
  });
  return () => {
    unsubscribe();
  };
}

/**
 * プレイヤーの接続状態を更新
 */
export async function updatePlayerOnlineStatus(
  roomId: string,
  playerId: string,
  isOnline: boolean
): Promise<void> {
  try {
    const playerRef = doc(db, 'rooms', roomId, 'players', playerId);

    // ドキュメントが存在するか確認
    const playerSnap = await getDoc(playerRef);
    if (!playerSnap.exists()) {
      console.warn(`Player ${playerId} does not exist in room ${roomId}. Skipping online status update.`);
      return;
    }

    await updateDoc(playerRef, { isOnline });
  } catch (error) {
    console.error(`Failed to update online status for player ${playerId}:`, error);
    // エラーを投げずに処理を続行
  }
}

/**
 * プレイヤーのスコアを更新
 */
export async function updatePlayerScore(
  roomId: string,
  playerId: string,
  score: number
): Promise<void> {
  try {
    const playerRef = doc(db, 'rooms', roomId, 'players', playerId);

    // ドキュメントが存在するか確認
    const playerSnap = await getDoc(playerRef);
    if (!playerSnap.exists()) {
      console.warn(`Player ${playerId} does not exist in room ${roomId}. Skipping score update.`);
      return;
    }

    await updateDoc(playerRef, { score });
  } catch (error) {
    console.error(`Failed to update score for player ${playerId}:`, error);
    // エラーを投げずに処理を続行
  }
}

/**
 * Reset all players' scores to zero
 */
export async function resetAllPlayersScores(roomId: string): Promise<void> {
  console.log(`Resetting all players' scores for room ${roomId}`);
  try {
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const playerDocs = await getDocs(playersRef);

    const updatePromises = [];
    for (const playerDoc of playerDocs.docs) {
      updatePromises.push(
        updateDoc(playerDoc.ref, {
          score: 0,
          lastUpdated: serverTimestamp()
        })
      );
    }

    await Promise.all(updatePromises);
    console.log('All players scores reset successfully');
  } catch (error) {
    console.error('Error resetting all players scores:', error);
    throw error;
  }
}

/**
 * ニックネームの重複チェック
 */
export async function isNicknameTaken(
  roomId: string,
  nickname: string
): Promise<boolean> {
  const players = await getPlayers(roomId);
  return players.some(player => player.nickname === nickname);
}
