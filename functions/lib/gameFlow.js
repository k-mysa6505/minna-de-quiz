"use strict";
// functions/src/gameFlow.ts
// ゲーム進行をサーバー側で制御するFunctions
//
// 責務:
//  1. answers/predictions に書き込まれたとき、参加者全員分揃ったら結果フェーズへ自動移行
//  2. playersReady が更新されたとき、参加者全員 ready なら次の問題 or 終了へ自動移行
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlayerReadyChanged = exports.onPredictionWritten = exports.onAnswerWritten = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const REGION = 'asia-northeast1';
const MIN_REVEAL_DURATION_MS = 7000;
// ────────────────────────────────────────────
// Helper: ルーム参加中プレイヤーID一覧を取得
// ────────────────────────────────────────────
async function getParticipantPlayerIds(roomId) {
    const snap = await db
        .collection('rooms')
        .doc(roomId)
        .collection('players')
        .get();
    return snap.docs.map((doc) => doc.id);
}
// ────────────────────────────────────────────
// Helper: playerId -> nickname のマップを取得
// ────────────────────────────────────────────
async function getPlayerNicknameMap(roomId) {
    const snap = await db
        .collection('rooms')
        .doc(roomId)
        .collection('players')
        .get();
    const nicknameMap = new Map();
    for (const doc of snap.docs) {
        const nickname = doc.get('nickname');
        nicknameMap.set(doc.id, typeof nickname === 'string' && nickname.length > 0 ? nickname : 'unknown');
    }
    return nicknameMap;
}
function formatPlayerLabels(playerIds, nicknameMap) {
    if (playerIds.length === 0) {
        return '-';
    }
    return playerIds
        .map((playerId) => { var _a; return `${(_a = nicknameMap.get(playerId)) !== null && _a !== void 0 ? _a : 'unknown'}(${playerId})`; })
        .join(',');
}
// ────────────────────────────────────────────
// Helper: GameState を取得
// ────────────────────────────────────────────
async function getGameState(roomId) {
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
//   参加者全員が提出済みなら 'revealing' フェーズへ
// ────────────────────────────────────────────
/**
 * answers コレクションに新規ドキュメントが書き込まれたとき発火
 */
exports.onAnswerWritten = (0, firestore_1.onDocumentCreated)({
    document: 'rooms/{roomId}/answers/{answerId}',
    region: REGION,
}, async (event) => {
    var _a;
    const roomId = event.params.roomId;
    const answerData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!answerData)
        return;
    await checkAndReveal(roomId, answerData.questionId);
});
/**
 * predictions コレクションに新規ドキュメントが書き込まれたとき発火
 */
exports.onPredictionWritten = (0, firestore_1.onDocumentCreated)({
    document: 'rooms/{roomId}/predictions/{predictionId}',
    region: REGION,
}, async (event) => {
    var _a;
    const roomId = event.params.roomId;
    const predData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!predData)
        return;
    await checkAndReveal(roomId, predData.questionId);
});
/**
 * 参加者全員が回答+予想を提出済みか確認し、
 * 揃っていたら gameState の phase を 'revealing' に更新する。
 */
async function checkAndReveal(roomId, questionId) {
    var _a;
    const gameState = await getGameState(roomId);
    if (!gameState)
        return;
    // すでに revealing 以降なら何もしない
    if (gameState.phase && gameState.phase !== 'answering')
        return;
    // 現在の問題に対する提出のみを対象にする
    const currentQuestionId = (_a = gameState.questionOrder) === null || _a === void 0 ? void 0 : _a[gameState.currentQuestionIndex];
    if (!currentQuestionId || currentQuestionId !== questionId) {
        return;
    }
    const gameStateRef = db
        .collection('rooms')
        .doc(roomId)
        .collection('gameState')
        .doc('state');
    let requiredPlayerIds = Array.isArray(gameState.requiredAnswerPlayerIds) &&
        gameState.requiredAnswerQuestionId === questionId
        ? gameState.requiredAnswerPlayerIds
        : [];
    // 問題開始時点の提出対象を固定する（online の瞬間値は使わない）
    if (requiredPlayerIds.length === 0) {
        const participantIds = await getParticipantPlayerIds(roomId);
        requiredPlayerIds = Array.from(new Set(participantIds));
        if (requiredPlayerIds.length === 0) {
            return;
        }
        await gameStateRef.update({
            requiredAnswerPlayerIds: requiredPlayerIds,
            requiredAnswerQuestionId: questionId,
        });
    }
    // 回答を取得（作問者以外）
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
    // 同一プレイヤーの多重送信に備え、プレイヤーIDで一意化して判定する
    const submittedPlayerIds = new Set();
    for (const doc of answersSnap.docs) {
        const playerId = doc.get('playerId');
        if (typeof playerId === 'string' && playerId.length > 0) {
            submittedPlayerIds.add(playerId);
        }
    }
    for (const doc of predictionsSnap.docs) {
        const playerId = doc.get('playerId');
        if (typeof playerId === 'string' && playerId.length > 0) {
            submittedPlayerIds.add(playerId);
        }
    }
    const allParticipantsSubmitted = requiredPlayerIds.every((playerId) => submittedPlayerIds.has(playerId));
    const submittedPlayerIdList = Array.from(submittedPlayerIds);
    const missingPlayerIds = requiredPlayerIds.filter((playerId) => !submittedPlayerIds.has(playerId));
    const nicknameMap = await getPlayerNicknameMap(roomId);
    console.log(`[onAnswerWritten] room=${roomId} question=${questionId} ` +
        `uniqueSubmissions=${submittedPlayerIds.size} required=${requiredPlayerIds.length} ` +
        `requiredPlayers=[${formatPlayerLabels(requiredPlayerIds, nicknameMap)}] ` +
        `submittedPlayers=[${formatPlayerLabels(submittedPlayerIdList, nicknameMap)}] ` +
        `missingPlayers=[${formatPlayerLabels(missingPlayerIds, nicknameMap)}]`);
    if (allParticipantsSubmitted) {
        console.log(`[onAnswerWritten] All participants submitted. Moving to revealing.`);
        await db
            .collection('rooms')
            .doc(roomId)
            .collection('gameState')
            .doc('state')
            .update({
            phase: 'revealing',
            revealStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
}
// ────────────────────────────────────────────
// Trigger 2: playersReady が更新されたとき
//   参加者全員 ready なら次の問題 or 終了へ
// ────────────────────────────────────────────
exports.onPlayerReadyChanged = (0, firestore_1.onDocumentUpdated)({
    document: 'rooms/{roomId}/gameState/state',
    region: REGION,
}, async (event) => {
    var _a, _b, _c, _d;
    const roomId = event.params.roomId;
    const after = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    const before = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before.data();
    if (!after || !before)
        return;
    const playersReadyAfter = (_c = after.playersReady) !== null && _c !== void 0 ? _c : [];
    const playersReadyBefore = (_d = before.playersReady) !== null && _d !== void 0 ? _d : [];
    // playersReady が変化していない場合はスキップ
    if (playersReadyAfter.length === playersReadyBefore.length)
        return;
    // phase が 'revealing' のときのみ処理
    if (after.phase !== 'revealing')
        return;
    const participantPlayerIds = await getParticipantPlayerIds(roomId);
    if (participantPlayerIds.length === 0)
        return;
    const readySet = new Set(playersReadyAfter);
    const allParticipantsReady = participantPlayerIds.every((playerId) => readySet.has(playerId));
    const readyPlayerIds = Array.from(readySet);
    const missingReadyPlayerIds = participantPlayerIds.filter((playerId) => !readySet.has(playerId));
    const nicknameMap = await getPlayerNicknameMap(roomId);
    console.log(`[onPlayerReadyChanged] room=${roomId} ` +
        `ready=${readySet.size}/${participantPlayerIds.length} ` +
        `readyPlayers=[${formatPlayerLabels(readyPlayerIds, nicknameMap)}] ` +
        `missingReadyPlayers=[${formatPlayerLabels(missingReadyPlayerIds, nicknameMap)}]`);
    if (allParticipantsReady) {
        const revealStartedAt = after.revealStartedAt;
        if (revealStartedAt === null || revealStartedAt === void 0 ? void 0 : revealStartedAt.toMillis) {
            const elapsedMs = Date.now() - revealStartedAt.toMillis();
            if (elapsedMs < MIN_REVEAL_DURATION_MS) {
                console.log(`[onPlayerReadyChanged] Waiting reveal min duration: elapsed=${elapsedMs}ms min=${MIN_REVEAL_DURATION_MS}ms`);
                return;
            }
        }
        const isLastQuestion = after.currentQuestionIndex >= after.totalQuestions - 1;
        if (isLastQuestion) {
            console.log(`[onPlayerReadyChanged] Last question. Setting room to finished.`);
            await db.collection('rooms').doc(roomId).update({ status: 'finished' });
        }
        else {
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
                requiredAnswerPlayerIds: admin.firestore.FieldValue.delete(),
                requiredAnswerQuestionId: admin.firestore.FieldValue.delete(),
                revealStartedAt: admin.firestore.FieldValue.delete(),
            });
        }
    }
});
//# sourceMappingURL=gameFlow.js.map