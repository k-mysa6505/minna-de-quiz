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
  const correctAnswerCount = answers.filter(
    (answer) => answer.playerId === playerId && answer.isCorrect
  ).length;

  const correctPredictionCount = predictions.filter(
    (prediction) => prediction.playerId === playerId && prediction.isCorrect
  ).length;

  return correctAnswerCount + correctPredictionCount;
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

  for (const player of players) {
    scores.set(
      player.playerId,
      calculatePlayerScore(player.playerId, answers, predictions)
    );
  }

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
  const sortedScores = Array.from(scores.entries())
    .map(([playerId, score]) => ({ playerId, score }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.playerId.localeCompare(right.playerId);
    });

  let previousScore: number | null = null;
  let previousRank = 0;

  return sortedScores.map((entry, index) => {
    const rank = entry.score === previousScore ? previousRank : index + 1;

    previousScore = entry.score;
    previousRank = rank;

    return {
      ...entry,
      rank,
    };
  });
}
