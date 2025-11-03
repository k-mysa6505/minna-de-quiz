// lib/services/questionService.ts
// 問題管理サービス

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Question, QuestionFormData } from '@/types';

/**
 * 問題を作成
 * TODO: 実装してください
 *
 * ヒント:
 * 1. 問題データをバリデーション
 * 2. Firestoreのサブコレクション`rooms/{roomId}/questions`に追加
 * 3. 画像がある場合はStorageにアップロード
 */
export async function createQuestion(
  roomId: string,
  authorId: string,
  data: QuestionFormData
): Promise<string> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * ルーム内の全問題を取得
 * TODO: 実装してください
 */
export async function getQuestions(roomId: string): Promise<Question[]> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 特定の問題を取得
 * TODO: 実装してください
 */
export async function getQuestion(
  roomId: string,
  questionId: string
): Promise<Question | null> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 全員が問題を作成したかチェック
 * TODO: 実装してください
 *
 * ヒント:
 * 問題数とプレイヤー数を比較
 */
export async function areAllQuestionsCreated(roomId: string): Promise<boolean> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * 問題作成の進捗を取得
 * TODO: 実装してください
 *
 * 例: { created: 3, total: 5 }
 */
export async function getQuestionProgress(roomId: string): Promise<{
  created: number;
  total: number;
}> {
  // TODO: 実装
  throw new Error('Not implemented');
}
