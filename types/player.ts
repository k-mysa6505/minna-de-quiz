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
  color: string;
  isOnline: boolean;
  isMaster: boolean;
  score: number;
  joinedAt: Timestamp;
}

/**
 * プレイヤーの識別用カラー
 */
export const PLAYER_COLORS = [
  '#ff3c3c', // 赤
  '#4ECDC4', // 青緑
  '#45B7D1', // 青
  '#FFA07A', // オレンジ
  '#98D8C8', // 緑
  '#F7B731', // 黄色
  '#5F27CD', // 紫
  '#00D2D3', // シアン
  '#FF6348', // トマト
  '#1DD1A1', // エメラルド
] as const;
