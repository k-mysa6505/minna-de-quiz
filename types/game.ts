// types/game.ts
// ゲーム進行関連の型定義

import { Timestamp } from 'firebase/firestore';
import type { PlayerInfo } from './player';

/**
 * ゲームの進行状態
 */
export interface GameState {
  currentQuestionIndex: number;
  questionOrder: string[];
  totalQuestions: number;
}

/**
 * プレイヤーの回答
 */
export interface Answer {
  questionId: string;
  playerId: string;
  answer: 0 | 1 | 2 | 3;
  isCorrect: boolean;
  answeredAt: Timestamp;
}

/**
 * 作問者の正解者数予想
 */
export interface Prediction {
  questionId: string;
  playerId: string;
  predictedCount: number;
  actualCount: number;
  isCorrect: boolean;
  submittedAt: Timestamp;
}

/**
 * プレイヤーの回答結果
 */
export interface PlayerAnswerResult extends PlayerInfo {
  answer: 0 | 1 | 2 | 3;
  isCorrect: boolean;
}

/**
 * プレイヤーのスコア情報
 */
export interface PlayerScore extends PlayerInfo {
  score: number;
  rank: number;
  correctCount: number;        // 回答の正解数
  predictionAccuracy: number;  // 予想的中率（0-1）
}

/**
 * 作問者の予想結果
 */
export interface PredictionResult extends PlayerInfo {
  predictedCount: number;
  actualCount: number;
  isCorrect: boolean;
}

/**
 * 問題ごとの結果
 */
export interface QuestionResult {
  questionId: string;
  correctAnswer: 0 | 1 | 2 | 3;
  playerAnswers: PlayerAnswerResult[];
  prediction: PredictionResult;
}

/**
 * 最終結果
 */
export interface FinalResult {
  playerScores: PlayerScore[];
  statistics: {
    totalQuestions: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    // 追加の統計情報
    mostDifficultQuestion?: {
      questionId: string;
      correctRate: number;  // 正解率（0-1）
    };
    bestPredictor?: {
      playerId: string;
      nickname: string;
      predictionAccuracy: number;  // 予想的中率（0-1）
    };
  };
}
