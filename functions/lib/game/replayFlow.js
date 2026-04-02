"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlayerDeleted = exports.onReplayRequestChanged = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const REGION = 'asia-northeast1';
async function deleteCollectionDocs(roomId, collectionName) {
    const snap = await db.collection('rooms').doc(roomId).collection(collectionName).get();
    if (snap.empty)
        return;
    let batch = db.batch();
    let opCount = 0;
    for (const docSnap of snap.docs) {
        batch.delete(docSnap.ref);
        opCount += 1;
        if (opCount >= 400) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
        }
    }
    if (opCount > 0)
        await batch.commit();
}
/**
 * リプレイ判定：残っている全員が REPLAY を押し終えたか確認
 */
async function checkAndTriggerReplay(roomId) {
    const roomRef = db.collection('rooms').doc(roomId);
    try {
        const roomSnap = await roomRef.get();
        if (!roomSnap.exists)
            return;
        const room = roomSnap.data();
        if (room.status !== 'finished')
            return;
        const playersSnap = await db.collection('rooms').doc(roomId).collection('players').get();
        if (playersSnap.empty)
            return;
        const playerDocs = playersSnap.docs;
        // 退室していないプレイヤーを特定
        const stayingPlayers = playerDocs.filter((docSnap) => !docSnap.data().hasLeft);
        // リプレイ希望者
        const wantingReplayPlayers = stayingPlayers.filter((docSnap) => Boolean(docSnap.data().wantsReplay));
        // 全員の意思が確定（全員がREPLAYを押し終えた、または退室した）
        const shouldReset = stayingPlayers.length > 0 && wantingReplayPlayers.length === stayingPlayers.length;
        if (!shouldReset)
            return;
        // --- リセット実行 ---
        // 1. ステータス変更
        await roomRef.update({
            status: 'waiting',
            replayResetAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 2. プレイヤー初期化 & 退室者の完全削除
        const resetBatch = db.batch();
        for (const playerDoc of playerDocs) {
            const p = playerDoc.data();
            if (p.hasLeft) {
                resetBatch.delete(playerDoc.ref);
            }
            else {
                resetBatch.update(playerDoc.ref, {
                    score: 0,
                    wantsReplay: false,
                    replayRequestedAt: admin.firestore.FieldValue.delete(),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        await resetBatch.commit();
        // 3. データのクリーンアップ
        const collections = ['gameState', 'questions', 'answers', 'predictions', 'reactions'];
        await Promise.all(collections.map(c => deleteCollectionDocs(roomId, c)));
        console.log(`[replayFlow] Room ${roomId} reset success.`);
    }
    catch (error) {
        console.error(`[replayFlow] Error in room ${roomId}:`, error);
    }
}
exports.onReplayRequestChanged = (0, firestore_1.onDocumentUpdated)({ document: 'rooms/{roomId}/players/{playerId}', region: REGION }, async (event) => { await checkAndTriggerReplay(event.params.roomId); });
exports.onPlayerDeleted = (0, firestore_1.onDocumentDeleted)({ document: 'rooms/{roomId}/players/{playerId}', region: REGION }, async (event) => { await checkAndTriggerReplay(event.params.roomId); });
//# sourceMappingURL=replayFlow.js.map