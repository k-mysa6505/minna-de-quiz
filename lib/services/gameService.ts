// lib/services/gameService.ts
// ゲーム進行管理サービス

import {
  collection, doc, setDoc, addDoc, getDoc,
  getDocs, updateDoc, query, where, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState, Answer, Prediction } from '@/types';

/**
 * ゲーム状態を初期化
 */
export async function initializeGame(
  roomId: string,
  questionIds: string[]
): Promise<void> {
  // 問題の出題順序をシャッフル
  const shuffledOrder = shuffleArray(questionIds);
  const gameStateRef = doc(db, 'rooms', roomId, 'gameState', 'state');

  // Firestoreにゲーム状態を設定
  await setDoc(gameStateRef, {
    currentQuestionIndex: 0,
    questionOrder: shuffledOrder,
    totalQuestions: questionIds.length,
    playersReady: [], // 初期化時は誰も準備完了していない
    questionStartedAt: serverTimestamp() // 最初の問題の開始時刻
  });
}

/**
 * 現在のゲーム状態を取得
 */
export async function getGameState(roomId: string): Promise<GameState | null> {
  const gameStateRef = doc(db, 'rooms', roomId, 'gameState', 'state');
  const gameStateDoc = await getDoc(gameStateRef);
  return gameStateDoc.exists()
    ? (gameStateDoc.data() as GameState)
    : null;
}

/**
 * 次の問題へ進む（全員の準備が整った場合のみ）
 */
export async function nextQuestion(roomId: string): Promise<void> {
  const gameStateRef = doc(db, 'rooms', roomId, 'gameState', 'state');
  const gameStateDoc = await getDoc(gameStateRef);

  if (!gameStateDoc.exists()) {
    throw new Error('Game state not found');
  }

  const gameState = gameStateDoc.data() as GameState;

  // 最後の問題かチェック
  if (gameState.currentQuestionIndex >= gameState.totalQuestions - 1) {
    throw new Error('Already at the last question');
  }

  // インデックスを進めて、準備完了状態をリセット
  await updateDoc(gameStateRef, {
    currentQuestionIndex: gameState.currentQuestionIndex + 1,
    playersReady: [], // 準備完了プレイヤーをリセット
    questionStartedAt: serverTimestamp() // 新しい問題の開始時刻を記録
  });
}

/**
 * プレイヤーを準備完了にする
 */
export async function markPlayerReady(
  roomId: string,
  playerId: string
): Promise<void> {
  const gameStateRef = doc(db, 'rooms', roomId, 'gameState', 'state');
  const gameStateDoc = await getDoc(gameStateRef);

  if (!gameStateDoc.exists()) {
    throw new Error('Game state not found');
  }

  const gameState = gameStateDoc.data() as GameState;
  const playersReady = gameState.playersReady || [];

  // 既に準備完了の場合は何もしない
  if (playersReady.includes(playerId)) {
    return;
  }

  // プレイヤーを準備完了リストに追加
  await updateDoc(gameStateRef, {
    playersReady: [...playersReady, playerId]
  });
}

/**
 * 全員が準備完了かチェック
 */
export async function areAllPlayersReady(
  roomId: string
): Promise<boolean> {
  const gameStateRef = doc(db, 'rooms', roomId, 'gameState', 'state');
  const gameStateDoc = await getDoc(gameStateRef);

  if (!gameStateDoc.exists()) {
    return false;
  }

  const gameState = gameStateDoc.data() as GameState;
  const playersReady = gameState.playersReady || [];

  // プレイヤー数を取得
  const playersRef = collection(db, 'rooms', roomId, 'players');
  const playersSnapshot = await getDocs(playersRef);
  const totalPlayers = playersSnapshot.size;

  return playersReady.length >= totalPlayers;
}

/**
 * 回答を送信
 */
export async function submitAnswer(
  roomId: string,
  questionId: string,
  playerId: string,
  answer: number,
  isCorrect: boolean
): Promise<void> {
  const answersRef = collection(db, 'rooms', roomId, 'answers');
  await addDoc(answersRef, {
    questionId,
    playerId,
    answer,
    isCorrect,
    answeredAt: Timestamp.now()
  });
}

/**
 * 正解者数の予想を送信
 */
export async function submitPrediction(
  roomId: string,
  questionId: string,
  playerId: string,
  predictedCount: number
): Promise<void> {
  const predictionsRef = collection(db, 'rooms', roomId, 'predictions');
  await addDoc(predictionsRef, {
    questionId,
    playerId,
    predictedCount,
    actualCount: 0, // 初期値
    isCorrect: false, // 初期値
    submittedAt: Timestamp.now()
  });
}

/**
 * 問題の回答を全て取得
 */
export async function getAnswers(
  roomId: string,
  questionId: string
): Promise<Answer[]> {
  const answersRef = collection(db, 'rooms', roomId, 'answers');
  const answersQuery = query(answersRef, where('questionId', '==', questionId));
  const answersSnapshot = await getDocs(answersQuery);
  return answersSnapshot.docs.map(doc => doc.data() as Answer);
}

/**
 * 作問者の予想を取得
 */
export async function getPrediction(
  roomId: string,
  questionId: string
): Promise<Prediction | null> {
  const predictionsRef = collection(db, 'rooms', roomId, 'predictions');
  const predictionsQuery = query(
    predictionsRef,
    where('questionId', '==', questionId)
  );
  const predictionsSnapshot = await getDocs(predictionsQuery);

  if (predictionsSnapshot.empty) {
    return null;
  }

  return predictionsSnapshot.docs[0].data() as Prediction;
}

/**
 * 作問者の予想結果を更新
 */
export async function updatePredictionResult(
  roomId: string,
  questionId: string,
  actualCount: number,
  isCorrect: boolean
): Promise<void> {
  const predictionsRef = collection(db, 'rooms', roomId, 'predictions');
  const predictionsQuery = query(
    predictionsRef,
    where('questionId', '==', questionId)
  );
  const predictionsSnapshot = await getDocs(predictionsQuery);

  if (!predictionsSnapshot.empty) {
    const predictionDoc = predictionsSnapshot.docs[0];
    await updateDoc(predictionDoc.ref, {
      actualCount,
      isCorrect
    });
  }
}

/**
 * 全員が回答/予想を送信したかチェック
 */
export async function areAllResponsesSubmitted(
  roomId: string,
  questionId: string
): Promise<boolean> {
  // 参加プレイヤー数を取得
  const playersRef = collection(db, 'rooms', roomId, 'players');
  const playersSnapshot = await getDocs(playersRef);
  const playerCount = playersSnapshot.size;

  // 回答数を取得（作問者以外）
  const answersRef = collection(db, 'rooms', roomId, 'answers');
  const answersQuery = query(answersRef, where('questionId', '==', questionId));
  const answersSnapshot = await getDocs(answersQuery);
  const answerCount = answersSnapshot.size;

  // 予想数を取得（作問者）
  const predictionsRef = collection(db, 'rooms', roomId, 'predictions');
  const predictionsQuery = query(predictionsRef, where('questionId', '==', questionId));
  const predictionsSnapshot = await getDocs(predictionsQuery);
  const predictionCount = predictionsSnapshot.size;

  // 回答 + 予想 = 全プレイヤー
  return (answerCount + predictionCount) >= playerCount;
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
