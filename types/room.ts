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
 * 点数加算方式
 */
export type ScoringMode =
  | 'standard'        // 標準（正解で10pt）
  | 'firstBonus'      // 1位ボーナス（1位は倍の得点）
  | 'rateBonus';      // 正解率ボーナス（正解率が低いほど高得点）

/**
 * ルーム情報
 */
export interface Room {
  roomId: string;
  masterId: string;
  masterNickname: string;      // 作成者のニックネーム
  status: RoomStatus;
  createdAt: Timestamp;
  maxPlayers: number;
  minPlayers: number;
  isClosed: boolean;
  description?: string;         // ルームの説明
  timeLimit?: number;          // 制限時間（秒）
  scoringMode: ScoringMode;    // 点数加算方式
  wrongAnswerPenalty: number;  // 誤答ペナルティ
  cleanupRequestedAt?: Timestamp;
  deleteEligibleAt?: Timestamp;
  cleanupState?: 'scheduled' | 'deferred' | 'deleted' | 'skipped';
  cleanupReason?: string;
  lastCleanupDecisionAt?: Timestamp;
  useScreenMode?: boolean;
  displayDeviceId?: string;
}

/**
 * ルーム作成時のパラメータ
 */
export interface CreateRoomParams {
  nickname: string;              // 作成者のニックネーム
  maxPlayers?: number;           // 最大人数
  minPlayers?: number;           // 最小人数
  description?: string;          // ルームの説明
  timeLimit?: number;            // 制限時間（秒）
  scoringMode?: ScoringMode;     // 点数加算方式
  wrongAnswerPenalty?: number;   // 誤答ペナルティ
  useScreenMode?: boolean;
}

/**
 * ルーム参加時のパラメータ
 */
export interface JoinRoomParams {
  roomId: string;       // 参加するルームID
  nickname: string;     // 参加者のニックネーム
}
