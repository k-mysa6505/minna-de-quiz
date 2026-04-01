"use strict";
// functions/src/gameFlow.ts
// ゲーム進行をサーバー側で制御するFunctions
//
// 責務:
//  1. answers/predictions に書き込まれたとき、参加者全員分揃ったら結果フェーズへ自動移行
//  2. playersReady が更新されたとき、参加者全員 ready なら次の問題 or 終了へ自動移行
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlayerReadyChanged = exports.onGameStateCreated = exports.onGameStateChanged = exports.onPredictionWritten = exports.onAnswerWritten = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const firebase_functions_1 = require("firebase-functions");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const REGION = 'asia-northeast1';
const MIN_REVEAL_DURATION_MS = 7000;
function sleep(ms) {
    if (ms <= 0) {
        return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
}
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
    firebase_functions_1.logger.info(`SCORE_LOG: [onAnswerWritten] room=${roomId} questionId=${answerData.questionId}`);
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
    firebase_functions_1.logger.info(`SCORE_LOG: [onPredictionWritten] room=${roomId} questionId=${predData.questionId}`);
    await checkAndReveal(roomId, predData.questionId);
});
async function transitionToRevealing(roomId, questionId, reason) {
    var _a, _b, _c;
    firebase_functions_1.logger.info(`SCORE_LOG: [transitionToRevealing] START: room=${roomId} question=${questionId} reason=${reason}`);
    const gameStateRef = db
        .collection('rooms')
        .doc(roomId)
        .collection('gameState')
        .doc('state');
    const currentSnap = await gameStateRef.get();
    if (!currentSnap.exists) {
        firebase_functions_1.logger.warn(`SCORE_LOG: [transitionToRevealing] ABORT: gameState not found`);
        return false;
    }
    const current = currentSnap.data();
    if (current.phase && current.phase !== 'answering') {
        firebase_functions_1.logger.info(`SCORE_LOG: [transitionToRevealing] SKIP: already in phase '${current.phase}'`);
        return false;
    }
    const currentQuestionId = (_a = current.questionOrder) === null || _a === void 0 ? void 0 : _a[(_b = current.currentQuestionIndex) !== null && _b !== void 0 ? _b : 0];
    if (!currentQuestionId) {
        firebase_functions_1.logger.warn(`SCORE_LOG: [transitionToRevealing] ABORT: currentQuestionId is missing at index ${current.currentQuestionIndex}`);
        return false;
    }
    if (currentQuestionId !== questionId) {
        firebase_functions_1.logger.warn(`SCORE_LOG: [transitionToRevealing] ABORT: ID MISMATCH. Expected=${currentQuestionId}, Received=${questionId}`);
        firebase_functions_1.logger.info(`SCORE_LOG: Full questionOrder=[${(_c = current.questionOrder) === null || _c === void 0 ? void 0 : _c.join(',')}]`);
        return false;
    }
    // フェーズ移行と同時に集計中フラグを立てる
    await gameStateRef.update({
        phase: 'revealing',
        revealStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        isCalculatingScores: true,
    });
    firebase_functions_1.logger.info(`SCORE_LOG: Phase updated. Waiting 1s for consistency...`);
    // 1秒待機してから集計（遅延回答の書き込みを待つ）
    await sleep(1000);
    try {
        await calculateScores(roomId, questionId);
    }
    catch (err) {
        firebase_functions_1.logger.error(`SCORE_LOG: [calculateScores] CRITICAL ERROR:`, err);
    }
    finally {
        // 集計完了を通知
        await gameStateRef.update({ isCalculatingScores: false });
        firebase_functions_1.logger.info(`SCORE_LOG: Calculation process finished.`);
    }
    return true;
}
/**
 * サーバーサイドでのスコア集計
 */
async function calculateScores(roomId, questionId) {
    var _a;
    firebase_functions_1.logger.info(`SCORE_LOG: [calculateScores] STARTING: room=${roomId} question=${questionId}`);
    const roomSnap = await db.collection('rooms').doc(roomId).get();
    if (!roomSnap.exists) {
        firebase_functions_1.logger.error(`SCORE_LOG: [calculateScores] Room not found.`);
        return;
    }
    const room = roomSnap.data() || {};
    // ポイント設定
    const points = {
        correct: Number(room.correctAnswerPoints) || 100,
        fastest: Number(room.fastestAnswerBonusPoints) || 50,
        penalty: Number(room.wrongAnswerPenalty) || 0,
        prediction: Number(room.predictionHitBonusPoints) || 50
    };
    firebase_functions_1.logger.info(`SCORE_LOG: Points config:`, points);
    // 1. 全回答を取得
    const answersSnap = await db.collection('rooms').doc(roomId).collection('answers')
        .where('questionId', '==', questionId).get();
    const rawAnswers = answersSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
    firebase_functions_1.logger.info(`SCORE_LOG: Found ${rawAnswers.length} raw answers.`);
    // 2. 予想を取得
    const predSnap = await db.collection('rooms').doc(roomId).collection('predictions')
        .where('questionId', '==', questionId).get();
    const prediction = predSnap.empty ? null : predSnap.docs[0].data();
    // 3. 重複排除と最速正解の特定
    const toMs = (v, fallback) => {
        if (!v)
            return fallback;
        if (typeof v.toMillis === 'function')
            return v.toMillis();
        if (typeof v.toDate === 'function')
            return v.toDate().getTime();
        if (typeof v === 'number')
            return v;
        return fallback;
    };
    const playerMap = new Map();
    const sortedRawAnswers = rawAnswers.sort((a, b) => toMs(a.answeredAt, 0) - toMs(b.answeredAt, 0));
    for (const a of sortedRawAnswers) {
        if (!a.playerId)
            continue;
        if (!playerMap.has(a.playerId)) {
            playerMap.set(a.playerId, a);
        }
    }
    const uniqueAnswers = Array.from(playerMap.values());
    const correctAnswers = uniqueAnswers.filter(a => a.isCorrect).sort((l, r) => toMs(l.answeredAt, 0) - toMs(r.answeredAt, 0));
    const fastestId = (_a = correctAnswers[0]) === null || _a === void 0 ? void 0 : _a.playerId;
    firebase_functions_1.logger.info(`SCORE_LOG: results - unique=${uniqueAnswers.length}, correct=${correctAnswers.length}, fastest=${fastestId || 'none'}`);
    firebase_functions_1.logger.info(`SCORE_LOG: playerMap keys:`, Array.from(playerMap.keys()));
    // 4. 予想結果の更新
    if (prediction) {
        const isPredHit = Number(prediction.predictedCount) === correctAnswers.length;
        await predSnap.docs[0].ref.update({
            actualCount: correctAnswers.length,
            isCorrect: isPredHit
        });
        firebase_functions_1.logger.info(`SCORE_LOG: prediction hit check - predicted=${prediction.predictedCount}, actual=${correctAnswers.length}, hit=${isPredHit}`);
    }
    // 5. 全プレイヤーのスコアを更新
    const playersSnap = await db.collection('rooms').doc(roomId).collection('players').get();
    const batch = db.batch();
    let updatedCount = 0;
    for (const pDoc of playersSnap.docs) {
        const p = pDoc.data();
        const playerId = pDoc.id;
        let delta = 0;
        const myAnswer = playerMap.get(playerId);
        if (myAnswer) {
            if (myAnswer.isCorrect) {
                const isFastest = playerId === fastestId;
                delta += points.correct + (isFastest ? points.fastest : 0);
            }
            else {
                delta -= points.penalty;
            }
        }
        if (prediction && playerId === prediction.playerId) {
            if (Number(prediction.predictedCount) === correctAnswers.length) {
                delta += points.prediction;
            }
        }
        if (delta !== 0) {
            firebase_functions_1.logger.info(`SCORE_LOG: APPLYING score update - player=${playerId} (nickname=${p.nickname}) delta=${delta}`);
            batch.update(pDoc.ref, {
                score: admin.firestore.FieldValue.increment(delta),
                lastScoreDelta: delta
            });
            updatedCount++;
        }
    }
    if (updatedCount > 0) {
        await batch.commit();
        firebase_functions_1.logger.info(`SCORE_LOG: SUCCESS. Committed ${updatedCount} players.`);
    }
    else {
        firebase_functions_1.logger.info(`SCORE_LOG: No score changes were applied.`);
    }
}
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
    firebase_functions_1.logger.info(`SCORE_LOG: [checkAndReveal] room=${roomId} question=${questionId} ` +
        `uniqueSubmissions=${submittedPlayerIds.size} required=${requiredPlayerIds.length} ` +
        `requiredPlayers=[${formatPlayerLabels(requiredPlayerIds, nicknameMap)}] ` +
        `submittedPlayers=[${formatPlayerLabels(submittedPlayerIdList, nicknameMap)}] ` +
        `missingPlayers=[${formatPlayerLabels(missingPlayerIds, nicknameMap)}]`);
    if (allParticipantsSubmitted) {
        firebase_functions_1.logger.info(`SCORE_LOG: All participants submitted. Moving to revealing.`);
        await transitionToRevealing(roomId, questionId, 'submitted');
    }
}
// ────────────────────────────────────────────
// Trigger 1.5: gameState が更新されたとき
//   answering フェーズの期限まで待機し、未遷移なら timeout で revealing へ
// ────────────────────────────────────────────
exports.onGameStateChanged = (0, firestore_1.onDocumentUpdated)({
    document: 'rooms/{roomId}/gameState/state',
    region: REGION,
    timeoutSeconds: 180,
}, async (event) => {
    var _a;
    const roomId = event.params.roomId;
    const after = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    if (!after) {
        return;
    }
    await scheduleTimeoutReveal(roomId, after);
});
exports.onGameStateCreated = (0, firestore_1.onDocumentCreated)({
    document: 'rooms/{roomId}/gameState/state',
    region: REGION,
    timeoutSeconds: 180,
}, async (event) => {
    var _a;
    const roomId = event.params.roomId;
    const after = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!after) {
        return;
    }
    await scheduleTimeoutReveal(roomId, after);
});
async function scheduleTimeoutReveal(roomId, after) {
    var _a, _b, _c;
    if (after.phase !== 'answering') {
        return;
    }
    const questionId = (_a = after.questionOrder) === null || _a === void 0 ? void 0 : _a[(_b = after.currentQuestionIndex) !== null && _b !== void 0 ? _b : 0];
    if (!questionId) {
        return;
    }
    const roomSnap = await db.collection('rooms').doc(roomId).get();
    const room = roomSnap.data();
    const timeLimit = (_c = room === null || room === void 0 ? void 0 : room.timeLimit) !== null && _c !== void 0 ? _c : 30;
    if (timeLimit <= 0) {
        return;
    }
    const startedAt = after.questionStartedAt;
    const startedAtMs = typeof (startedAt === null || startedAt === void 0 ? void 0 : startedAt.toMillis) === 'function' ? startedAt.toMillis() : 0;
    if (startedAtMs <= 0) {
        return;
    }
    const deadlineMs = startedAtMs + timeLimit * 1000;
    const waitMs = deadlineMs - Date.now();
    if (waitMs > 0) {
        await sleep(waitMs + 200);
    }
    firebase_functions_1.logger.info(`SCORE_LOG: Timeout reached. Attempting transition to revealing.`);
    await transitionToRevealing(roomId, questionId, 'timeout');
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
    // 集計中は次の問題へ進ませない（計算完了を待つ）
    if (after.isCalculatingScores === true) {
        firebase_functions_1.logger.info(`SCORE_LOG: [onPlayerReadyChanged] room=${roomId} is currently calculating scores. Skipping.`);
        return;
    }
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
    firebase_functions_1.logger.info(`SCORE_LOG: [onPlayerReadyChanged] room=${roomId} ` +
        `ready=${readySet.size}/${participantPlayerIds.length} ` +
        `readyPlayers=[${formatPlayerLabels(readyPlayerIds, nicknameMap)}] ` +
        `missingReadyPlayers=[${formatPlayerLabels(missingReadyPlayerIds, nicknameMap)}]`);
    if (allParticipantsReady) {
        const revealStartedAt = after.revealStartedAt;
        if (revealStartedAt === null || revealStartedAt === void 0 ? void 0 : revealStartedAt.toMillis) {
            const elapsedMs = Date.now() - revealStartedAt.toMillis();
            if (elapsedMs < MIN_REVEAL_DURATION_MS) {
                firebase_functions_1.logger.info(`SCORE_LOG: [onPlayerReadyChanged] Waiting reveal min duration: elapsed=${elapsedMs}ms min=${MIN_REVEAL_DURATION_MS}ms`);
                return;
            }
        }
        const isLastQuestion = after.currentQuestionIndex >= after.totalQuestions - 1;
        if (isLastQuestion) {
            firebase_functions_1.logger.info(`SCORE_LOG: Last question. Setting room to finished.`);
            await db.collection('rooms').doc(roomId).update({ status: 'finished' });
        }
        else {
            firebase_functions_1.logger.info(`SCORE_LOG: Moving to next question.`);
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