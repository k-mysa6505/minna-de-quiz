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
  console.log(`Creating question for room ${roomId} by author ${authorId}`);
  try {
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
      correctAnswer: data.correctAnswer, // Added logic to handle correctAnswer if needed or keep as is
      createdAt: Timestamp.now()
    });

    console.log(`Question created successfully. ID: ${questionDoc.id}`);
    return questionDoc.id;
  } catch (error) {
    console.error(`Error creating question in room ${roomId}:`, error);
    throw error;
  }
}

/**
 * ルーム内の全問題を取得
 */
export async function getQuestions(roomId: string): Promise<Question[]> {
  console.log(`Getting questions for room: ${roomId}`);
  try {
    const questionsRef = collection(db, 'rooms', roomId, 'questions');
    const questionsQuery = query(questionsRef, orderBy('createdAt', 'asc')); // Firestore query needs an index sometimes, check logs if error
    const questionsSnapshot = await getDocs(questionsQuery);
    console.log(`Found ${questionsSnapshot.size} questions`);

    const questions: Question[] = questionsSnapshot.docs.map(doc => ({
      questionId: doc.id,
      ...(doc.data() as Omit<Question, 'questionId'>)
    }));
    return questions;
  } catch (error) {
    console.error(`Error getting questions for room ${roomId}:`, error);
    throw error;
  }
}

/**
 * 特定の問題を取得
 */
export async function getQuestion(
  roomId: string,
  questionId: string
): Promise<Question | null> {
  console.log(`Getting question ${questionId} for room ${roomId}`);
  try {
    const questionDoc = await getDoc(
      doc(db, 'rooms', roomId, 'questions', questionId)
    );
    if (questionDoc.exists()) {
      console.log(`Question retrieved: ${questionId}`);
      return {
        questionId: questionDoc.id,
        ...(questionDoc.data() as Omit<Question, 'questionId'>)
      };
    } else {
      console.warn(`Question not found: ${questionId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting question ${questionId}:`, error);
    return null;
  }
}

/**
 * 全員が問題を作成したかチェック
 */
export async function areAllQuestionsCreated(roomId: string): Promise<boolean> {
  console.log(`Checking if all questions created for room: ${roomId}`);
  try {
    // 登録された問題数を取得
    const questionsRef = collection(db, 'rooms', roomId, 'questions');
    const questionsSnapshot = await getDocs(questionsRef);
    const questionCount = questionsSnapshot.size;

    // 参加プレイヤー数を取得
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const playersSnapshot = await getDocs(playersRef);
    const playerCount = playersSnapshot.size; // Using size directly

    console.log(`Questions: ${questionCount}, Players: ${playerCount}`);

    // In some logical flows, players might not be equal to questions due to game design (e.g. master doesn't create question?)
    // But assuming 1 question per player for now based on function name intent.

    const isComplete = questionCount >= playerCount;
    console.log(`All questions created: ${isComplete}`);
    return isComplete;
  } catch (error) {
    console.error(`Error checking all questions created for room ${roomId}:`, error);
    return false;
  }
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
