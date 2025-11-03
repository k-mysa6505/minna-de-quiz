// lib/services/playerService.ts
// プレイヤー管理サービス

import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  getDocs,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PLAYER_COLORS, type Player } from '@/types';

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

  // 既存プレイヤー数を取得して色を決定
  const players = await getPlayers(roomId);
  const colorIndex = players.length % PLAYER_COLORS.length;

  // プレイヤー情報をFirestoreに追加
  const playersRef = collection(db, 'rooms', roomId, 'players')
  const playerDoc = await addDoc(playersRef, {
    nickname,
    color: PLAYER_COLORS[colorIndex],
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
 * TODO: 実装してください
 *
 * ヒント:
 * onSnapshotを使用
 */
export function subscribeToPlayers(
  roomId: string,
  callback: (players: Player[]) => void
): () => void {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * プレイヤーの接続状態を更新
 * TODO: 実装してください
 */
export async function updatePlayerOnlineStatus(
  roomId: string,
  playerId: string,
  isOnline: boolean
): Promise<void> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * プレイヤーのスコアを更新
 * TODO: 実装してください
 */
export async function updatePlayerScore(
  roomId: string,
  playerId: string,
  score: number
): Promise<void> {
  // TODO: 実装
  throw new Error('Not implemented');
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
