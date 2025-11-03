// types/room.ts
// ルーム関連の型定義

import { Timestamp } from 'firebase/firestore';

/**
 * ルームの状態
 */
export type RoomStatus =
  | 'waiting'       // 参加者待ち
  | 'creating'      // 問題作成中
  | 'playing'       // ゲームプレイ中
  | 'finished';     // ゲーム終了

/**
 * ルーム情報
 */
export interface Room {
  roomId: string;
  masterId: string;
  status: RoomStatus;
  createdAt: Timestamp;
  maxPlayers: number;
  minPlayers: number;
  isClosed: boolean;
}

/**
 * ルーム作成時のパラメータ
 */
export interface CreateRoomParams {
  nickname: string;      // 作成者のニックネーム
  maxPlayers?: number;   // 最大人数
  minPlayers?: number;   // 最小人数
}

/**
 * ルーム参加時のパラメータ
 */
export interface JoinRoomParams {
  roomId: string;       // 参加するルームID
  nickname: string;     // 参加者のニックネーム
}
