// lib/services/scoreService.ts
// 得点計算とFirestoreへの保存サービス

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * 回答の得点を計算してプレイヤーのスコアを更新
 * 正解者数が少ないほど高得点
 * @param roomId - ルームID
 * @param playerId - プレイヤーID
 * @param isCorrect - 正解かどうか
 * @param correctAnswerCount - 正解者数（全体）
 */
export async function updateAnswerScore(
  roomId: string,
  playerId: string,
  isCorrect: boolean,
  correctAnswerCount: number
): Promise<void> {
  if (!isCorrect) return;

  const points = calculateAnswerPoints(correctAnswerCount);

  const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
  await updateDoc(playerRef, {
    score: increment(points)
  });
}

/**
 * 正解者数に応じた得点を計算
 * 正解者が少ないほど高得点
 * @param correctAnswerCount - 正解者数
 * @returns 獲得ポイント
 */
function calculateAnswerPoints(correctAnswerCount: number): number {
  // 正解者数に応じた得点表
  if (correctAnswerCount === 1) return 20; // 1人だけ正解 → 20点
  if (correctAnswerCount === 2) return 15; // 2人正解 → 15点
  if (correctAnswerCount === 3) return 12; // 3人正解 → 12点
  if (correctAnswerCount === 4) return 10; // 4人正解 → 10点
  if (correctAnswerCount === 5) return 8;  // 5人正解 → 8点
  return 5;                                // 6人以上正解 → 5点
}

/**
 * 予想の得点を計算
 * @param predictedCount - 予想した正解者数
 * @param actualCount - 実際の正解者数
 * @returns 獲得ポイント
 */
export function calculatePredictionScore(
  predictedCount: number,
  actualCount: number
): number {
  const diff = Math.abs(predictedCount - actualCount);

  // 差分に応じて得点を計算
  if (diff === 0) return 15; // 完全一致
  if (diff === 1) return 10; // 差1
  if (diff === 2) return 7;  // 差2
  if (diff === 3) return 5;  // 差3
  return 0;                  // 差4以上
}

/**
 * 予想の得点をプレイヤーのスコアに加算
 * @param roomId - ルームID
 * @param playerId - プレイヤーID
 * @param points - 獲得ポイント
 */
export async function updatePredictionScore(
  roomId: string,
  playerId: string,
  points: number
): Promise<void> {
  const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
  await updateDoc(playerRef, {
    score: increment(points)
  });
}
