// lib/utils/scoreCalculator.ts
// スコア計算ユーティリティ

import type { Answer, Prediction, Player } from '@/types';

/**
 * プレイヤーのスコアを計算
 * TODO: 実装してください
 * 
 * ルール:
 * - 通常プレイヤー: 正解で+1点
 * - 作問者: 正解者数を的中させると+1点
 */
export function calculatePlayerScore(
  playerId: string,
  answers: Answer[],
  predictions: Prediction[]
): number {
  let score = 0;

  // TODO: 回答の正解数をカウント

  // TODO: 予想の的中数をカウント

  return score;
}

/**
 * 全プレイヤーのスコアを計算
 * TODO: 実装してください
 */
export function calculateAllScores(
  players: Player[],
  answers: Answer[],
  predictions: Prediction[]
): Map<string, number> {
  const scores = new Map<string, number>();

  // TODO: 各プレイヤーのスコアを計算

  return scores;
}

/**
 * スコアで順位付け
 * TODO: 実装してください
 * 
 * ヒント:
 * - スコアの降順でソート
 * - 同点の場合は同順位
 */
export function rankPlayers(scores: Map<string, number>): Array<{
  playerId: string;
  score: number;
  rank: number;
}> {
  // TODO: 実装
  return [];
}
