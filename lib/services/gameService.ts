// lib/services/gameService.ts
// ゲーム進行管理サービス

import { 
  collection, doc, setDoc, getDoc,
  getDocs, updateDoc, query, where 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState, Answer, Prediction } from '@/types';

/**
 * ゲーム状態を初期化
 * TODO: 実装してください
 * 
 * ヒント:
 * 1. 問題の出題順序をシャッフル
 * 2. gameStateドキュメントを作成
 */
export async function initializeGame(
  roomId: string,
  questionIds: string[]
): Promise<void> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 現在のゲーム状態を取得
 * TODO: 実装してください
 */
export async function getGameState(roomId: string): Promise<GameState | null> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 次の問題へ進む
 * TODO: 実装してください
 */
export async function nextQuestion(roomId: string): Promise<void> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 回答を送信
 * TODO: 実装してください
 * 
 * ヒント:
 * answersサブコレクションに追加
 */
export async function submitAnswer(
  roomId: string,
  questionId: string,
  playerId: string,
  answer: number,
  isCorrect: boolean
): Promise<void> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 正解者数の予想を送信
 * TODO: 実装してください
 * 
 * ヒント:
 * predictionsサブコレクションに追加
 */
export async function submitPrediction(
  roomId: string,
  questionId: string,
  playerId: string,
  predictedCount: number
): Promise<void> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 問題の回答を全て取得
 * TODO: 実装してください
 */
export async function getAnswers(
  roomId: string,
  questionId: string
): Promise<Answer[]> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 作問者の予想を取得
 * TODO: 実装してください
 */
export async function getPrediction(
  roomId: string,
  questionId: string
): Promise<Prediction | null> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 全員が回答/予想を送信したかチェック
 * TODO: 実装してください
 */
export async function areAllResponsesSubmitted(
  roomId: string,
  questionId: string
): Promise<boolean> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 配列をシャッフル（Fisher-Yates）
 * ユーティリティ関数
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
