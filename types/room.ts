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
  masterNickname: string;      // 作問者のニックネーム
  status: RoomStatus;
  createdAt: Timestamp;
  maxPlayers: number;
  minPlayers: number;
  isClosed: boolean;
  description?: string;         // ルームの説明
  timeLimit: number;            // 制限時間（秒） 0は無制限
  correctAnswerPoints: number;      // 正解時の基本加点
  fastestAnswerBonusPoints: number; // 早押し1位への追加加点
  wrongAnswerPenalty: number;  // 誤答ペナルティ
  predictionHitBonusPoints: number; // 予想チャレンジ的中時の加点
  scoringMode?: string;
  cleanupRequestedAt?: Timestamp;
  deleteEligibleAt?: Timestamp;
  cleanupState?: 'scheduled' | 'deferred' | 'deleted' | 'skipped';
  cleanupReason?: string;
  lastCleanupDecisionAt?: Timestamp;
  useScreenMode?: boolean;
  displayDeviceId?: string;
  replayResetInProgress?: boolean;
  replayResetAt?: Timestamp;
}

/**
 * ルーム作成時のパラメータ
 */
export interface CreateRoomParams {
  nickname: string;              // 作問者のニックネーム
  createHostPlayer?: boolean;    // ルーム作成時にホストをプレイヤーとして同時作成するか
  maxPlayers?: number;           // 最大人数
  minPlayers?: number;           // 最小人数
  description?: string;          // ルームの説明
  timeLimit?: number;            // 制限時間（秒） 0は無制限
  correctAnswerPoints?: number;      // 正解時の基本加点
  fastestAnswerBonusPoints?: number; // 早押し1位への追加加点
  wrongAnswerPenalty?: number;   // 誤答ペナルティ
  predictionHitBonusPoints?: number; // 予想チャレンジ的中時の加点
  scoringMode?: string;
  useScreenMode?: boolean;
}

/**
 * ルーム参加時のパラメータ
 */
export interface JoinRoomParams {
  roomId: string;       // 参加するルームID
  nickname: string;     // 参加者のニックネーム
}
