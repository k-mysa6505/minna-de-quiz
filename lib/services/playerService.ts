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
  // ニックネームの重複チェック
  const isDuplicate = await isNicknameTaken(roomId, nickname);
  if (isDuplicate) {
    throw new Error('Nickname is already taken in this room');
  }

  // プレイヤー情報をFirestoreに追加
  const playersRef = collection(db, 'rooms', roomId, 'players');
  const playerDoc = await addDoc(playersRef, {
    nickname,
    isOnline: true,
    isMaster,
    score: 0,
    joinedAt: Timestamp.now(),
  });

  return playerDoc.id;
}

/**
 * ルーム内の全プレイヤーを取得
 */
export async function getPlayers(roomId: string): Promise<Player[]> {
  const playersRef = collection(db, 'rooms', roomId, 'players');
  const playersSnapshot = await getDocs(playersRef);
  const players: Player[] = playersSnapshot.docs.map(doc => ({
    playerId: doc.id,
    ...(doc.data() as Omit<Player, 'playerId'>)
  }));
  return players;
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
 * ニックネームの重複チェック
 */
export async function isNicknameTaken(
  roomId: string,
  nickname: string
): Promise<boolean> {
  const players = await getPlayers(roomId);
  return players.some(player => player.nickname === nickname);
}
