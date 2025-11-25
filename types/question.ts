// types/question.ts
// 問題関連の型定義

import { Timestamp } from 'firebase/firestore';

/**
 * 問題情報
 */
export interface Question {
  questionId: string;
  authorId: string;
  text: string;
  imageUrl?: string;
  choices: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  createdAt: Timestamp;
}

/**
 * 問題作成フォームのデータ
 */
export interface QuestionFormData {
  text: string;
  imageUrl?: string;
  choices: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
}

/**
 * プレイヤーの問題作成状況
 */
export interface PlayerQuestionStatus {
  playerId: string;
  nickname: string;
  isCreated: boolean;
}

/**
 * 問題作成の全体進捗状況
 */
export interface QuestionCreationStatus {
  players: PlayerQuestionStatus[];
  createdCount: number;
  totalCount: number;
  isAllCreated: boolean;
}
