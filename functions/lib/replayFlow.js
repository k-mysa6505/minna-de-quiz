"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReplayRequestChanged = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const REGION = 'asia-northeast1';
async function getPlayersSnapshot(roomId) {
    return db.collection('rooms').doc(roomId).collection('players').get();
}
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
    if (opCount > 0) {
        await batch.commit();
    }
}
exports.onReplayRequestChanged = (0, firestore_1.onDocumentUpdated)({
    document: 'rooms/{roomId}/players/{playerId}',
    region: REGION,
}, async (event) => {
    var _a, _b;
    const roomId = event.params.roomId;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!after) {
        return;
    }
    const beforeReplay = Boolean(before === null || before === void 0 ? void 0 : before.wantsReplay);
    const afterReplay = Boolean(after.wantsReplay);
    if (beforeReplay === afterReplay) {
        return;
    }
    const roomRef = db.collection('rooms').doc(roomId);
    const lockAcquired = await db.runTransaction(async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists) {
            return false;
        }
        const room = roomSnap.data();
        if (room.useScreenMode) {
            return false;
        }
        if (room.status !== 'finished') {
            return false;
        }
        if (room.replayResetInProgress) {
            return false;
        }
        tx.update(roomRef, {
            replayResetInProgress: true,
        });
        return true;
    });
    if (!lockAcquired) {
        return;
    }
    try {
        const playersSnap = await getPlayersSnapshot(roomId);
        if (playersSnap.empty) {
            await roomRef.set({ replayResetInProgress: false }, { merge: true });
            return;
        }
        const allRequested = playersSnap.docs.every((docSnap) => {
            const player = docSnap.data();
            return Boolean(player.wantsReplay);
        });
        if (!allRequested) {
            await roomRef.set({ replayResetInProgress: false }, { merge: true });
            return;
        }
        await deleteCollectionDocs(roomId, 'gameState');
        await deleteCollectionDocs(roomId, 'questions');
        await deleteCollectionDocs(roomId, 'answers');
        await deleteCollectionDocs(roomId, 'predictions');
        const resetPlayersBatch = db.batch();
        for (const playerDoc of playersSnap.docs) {
            resetPlayersBatch.update(playerDoc.ref, {
                score: 0,
                wantsReplay: false,
                replayRequestedAt: admin.firestore.FieldValue.delete(),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await resetPlayersBatch.commit();
        await roomRef.set({
            status: 'waiting',
            replayResetInProgress: false,
            replayResetAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`[replayFlow] Room ${roomId} reset for replay by unanimous requests`);
    }
    catch (error) {
        await roomRef.set({ replayResetInProgress: false }, { merge: true });
        throw error;
    }
});
//# sourceMappingURL=replayFlow.js.map