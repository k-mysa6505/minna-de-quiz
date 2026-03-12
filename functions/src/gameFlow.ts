// functions/src/gameFlow.ts
// ゲーム進行をサーバー側で制御するFunctions
//
// 責務:
//  1. answers/predictions に書き込まれたとき、オンライン全員分揃ったら結果フェーズへ自動移行
//  2. playersReady が更新されたとき、オンライン全員 ready なら次の問題 or 終了へ自動移行

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = 'asia-northeast1';

// ────────────────────────────────────────────
// Helper: オンラインプレイヤー一覧を取得
// ────────────────────────────────────────────
async function getOnlinePlayers(
  roomId: string
): Promise<admin.firestore.DocumentData[]> {
  const snap = await db
    .collection('rooms')
    .doc(roomId)
    .collection('players')
    .where('isOnline', '==', true)
    .get();
  return snap.docs.map((d) => ({ playerId: d.id, ...d.data() }));
}

// ────────────────────────────────────────────
// Helper: GameState を取得
// ────────────────────────────────────────────
async function getGameState(roomId: string) {
  const snap = await db
    .collection('rooms')
    .doc(roomId)
    .collection('gameState')
    .doc('state')
    .get();
  return snap.exists ? snap.data() : null;
}

// ────────────────────────────────────────────
// Trigger 1: 回答 or 予想が追加されたとき
//   オンライン全員が提出済みなら 'revealing' フェーズへ
// ────────────────────────────────────────────

/**
 * answers コレクションに新規ドキュメントが書き込まれたとき発火
 */
export const onAnswerWritten = onDocumentCreated(
  {
    document: 'rooms/{roomId}/answers/{answerId}',
    region: REGION,
  },
  async (event) => {
    const roomId = event.params.roomId;
    const answerData = event.data?.data();
    if (!answerData) return;

    await checkAndReveal(roomId, answerData.questionId);
  }
);

/**
 * predictions コレクションに新規ドキュメントが書き込まれたとき発火
 */
export const onPredictionWritten = onDocumentCreated(
  {
    document: 'rooms/{roomId}/predictions/{predictionId}',
    region: REGION,
  },
  async (event) => {
    const roomId = event.params.roomId;
    const predData = event.data?.data();
    if (!predData) return;

    await checkAndReveal(roomId, predData.questionId);
  }
);

/**
 * 全オンラインプレイヤーが回答+予想を提出済みか確認し、
 * 揃っていたら gameState の phase を 'revealing' に更新する。
 */
async function checkAndReveal(roomId: string, questionId: string) {
  const gameState = await getGameState(roomId);
  if (!gameState) return;

  // すでに revealing 以降なら何もしない
  if (gameState.phase && gameState.phase !== 'answering') return;

  const onlinePlayers = await getOnlinePlayers(roomId);
  const onlineCount = onlinePlayers.length;
  if (onlineCount === 0) return;

  // 回答数を取得（作問者以外）
  const answersSnap = await db
    .collection('rooms')
    .doc(roomId)
    .collection('answers')
    .where('questionId', '==', questionId)
    .get();

  // 予想数を取得（作問者）
  const predictionsSnap = await db
    .collection('rooms')
    .doc(roomId)
    .collection('predictions')
    .where('questionId', '==', questionId)
    .get();

  const totalSubmissions = answersSnap.size + predictionsSnap.size;

  console.log(
    `[onAnswerWritten] room=${roomId} question=${questionId} ` +
    `submissions=${totalSubmissions} onlineCount=${onlineCount}`
  );

  if (totalSubmissions >= onlineCount) {
    console.log(`[onAnswerWritten] All online players submitted. Moving to revealing.`);
    await db
      .collection('rooms')
      .doc(roomId)
      .collection('gameState')
      .doc('state')
      .update({ phase: 'revealing' });
  }
}

// ────────────────────────────────────────────
// Trigger 2: playersReady が更新されたとき
//   オンライン全員 ready なら次の問題 or 終了へ
// ────────────────────────────────────────────

export const onPlayerReadyChanged = onDocumentUpdated(
  {
    document: 'rooms/{roomId}/gameState/state',
    region: REGION,
  },
  async (event) => {
    const roomId = event.params.roomId;
    const after = event.data?.after.data();
    const before = event.data?.before.data();
    if (!after || !before) return;

    const playersReadyAfter: string[] = after.playersReady ?? [];
    const playersReadyBefore: string[] = before.playersReady ?? [];

    // playersReady が変化していない場合はスキップ
    if (playersReadyAfter.length === playersReadyBefore.length) return;

    // phase が 'revealing' のときのみ処理
    if (after.phase !== 'revealing') return;

    const onlinePlayers = await getOnlinePlayers(roomId);
    const onlineCount = onlinePlayers.length;
    if (onlineCount === 0) return;

    console.log(
      `[onPlayerReadyChanged] room=${roomId} ` +
      `ready=${playersReadyAfter.length}/${onlineCount}`
    );

    if (playersReadyAfter.length >= onlineCount) {
      const isLastQuestion =
        after.currentQuestionIndex >= after.totalQuestions - 1;

      if (isLastQuestion) {
        console.log(`[onPlayerReadyChanged] Last question. Setting room to finished.`);
        await db.collection('rooms').doc(roomId).update({ status: 'finished' });
      } else {
        console.log(`[onPlayerReadyChanged] Moving to next question.`);
        await db
          .collection('rooms')
          .doc(roomId)
          .collection('gameState')
          .doc('state')
          .update({
            currentQuestionIndex: admin.firestore.FieldValue.increment(1),
            playersReady: [],
            phase: 'answering',
            questionStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    }
  }
);
