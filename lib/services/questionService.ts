// lib/services/questionService.ts
// 問題管理サービス

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Question, QuestionFormData } from '@/types';

/**
 * 問題を作成
 */
export async function createQuestion(
  roomId: string,
  authorId: string,
  data: QuestionFormData
): Promise<string> {
  // 問題文のバリデーション
  if (!data.text.trim()) {
    throw new Error('Question text is required');
  }

  // 選択肢のバリデーション
  if (data.choices.length !== 4) {
    throw new Error('Exactly 4 choices are required');
  }
  if (data.choices.some(choice => !choice.trim())) {
    throw new Error('All choices must have text');
  }

  // 正解のインデックスバリデーション
  if (![0, 1, 2, 3].includes(data.correctAnswer)) {
    throw new Error('Invalid correct answer index');
  }

  // Firestoreに問題を追加
  const questionsRef = collection(db, 'rooms', roomId, 'questions');
  const questionDoc = await addDoc(questionsRef, {
    authorId,
    text: data.text,
    imageUrl: data.imageUrl || null,
    choices: data.choices,
    correctAnswer: data.correctAnswer,
    createdAt: Timestamp.now()
  });

  return questionDoc.id;
}

/**
 * ルーム内の全問題を取得
 */
export async function getQuestions(roomId: string): Promise<Question[]> {
  const questionsRef = collection(db, 'rooms', roomId, 'questions');
  const questionsQuery = query(questionsRef, orderBy('createdAt', 'asc'));
  const questionsSnapshot = await getDocs(questionsQuery);
  const questions: Question[] = questionsSnapshot.docs.map(doc => ({
    questionId: doc.id,
    ...(doc.data() as Omit<Question, 'questionId'>)
  }));
  return questions;
}

/**
 * 特定の問題を取得
 */
export async function getQuestion(
  roomId: string,
  questionId: string
): Promise<Question | null> {
  const questionDoc = await getDoc(
    doc(db, 'rooms', roomId, 'questions', questionId)
  );
  return questionDoc.exists()
    ? {
        questionId: questionDoc.id,
        ...(questionDoc.data() as Omit<Question, 'questionId'>)
      }
    : null;
}

/**
 * 全員が問題を作成したかチェック
 */
export async function areAllQuestionsCreated(roomId: string): Promise<boolean> {
  // 登録された問題数を取得
  const questionsRef = collection(db, 'rooms', roomId, 'questions');
  const questionsSnapshot = await getDocs(questionsRef);
  const questionCount = questionsSnapshot.size;

  // 参加プレイヤー数を取得
  const playersRef = collection(db, 'rooms', roomId, 'players');
  const playersSnapshot = await getDocs(playersRef);
  const playerCount = playersSnapshot.size;

  return questionCount >= playerCount;
}

/**
 * 問題作成の進捗を取得
 */
export async function getQuestionProgress(roomId: string): Promise<{
  created: number;
  total: number;
}> {
  // 登録された問題数を取得
  const questionsRef = collection(db, 'rooms', roomId, 'questions');
  const questionsSnapshot = await getDocs(questionsRef);
  const createdCount = questionsSnapshot.size;

  // 参加プレイヤー数を取得
  const playersRef = collection(db, 'rooms', roomId, 'players');
  const playersSnapshot = await getDocs(playersRef);
  const totalCount = playersSnapshot.size;

  return { created: createdCount, total: totalCount };
}
