// types/player.ts
// プレイヤー関連の型定義

import { Timestamp } from 'firebase/firestore';

/**
 * プレイヤーの基本情報
 */
export interface PlayerInfo {
  playerId: string;
  nickname: string;
}

/**
 * プレイヤー情報（完全版）
 */
export interface Player extends PlayerInfo {
  isOnline: boolean;
  isMaster: boolean;
  score: number;
  joinedAt: Timestamp;
}
