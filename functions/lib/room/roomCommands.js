"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRoomCommandCreated = void 0;
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
    if (opCount > 0) {
        await batch.commit();
    }
}
async function markCommandFailed(commandRef, reason) {
    await commandRef.set({
        state: 'failed',
        failedReason: reason,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
exports.onRoomCommandCreated = (0, firestore_1.onDocumentCreated)({
    document: 'rooms/{roomId}/commands/{commandId}',
    region: REGION,
}, async (event) => {
    var _a, _b;
    const roomId = event.params.roomId;
    const commandRef = (_a = event.data) === null || _a === void 0 ? void 0 : _a.ref;
    const command = (_b = event.data) === null || _b === void 0 ? void 0 : _b.data();
    if (!commandRef || !command) {
        return;
    }
    if (command.type !== 'DISBAND_ROOM') {
        return;
    }
    if (!command.actorId || typeof command.actorId !== 'string') {
        await markCommandFailed(commandRef, 'invalid_actor_id');
        return;
    }
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) {
        await markCommandFailed(commandRef, 'room_not_found');
        return;
    }
    const room = roomSnap.data();
    if (!room.masterId || room.masterId !== command.actorId) {
        await markCommandFailed(commandRef, 'forbidden_not_master');
        return;
    }
    if (room.disbandRequestedAt) {
        return;
    }
    await commandRef.set({
        state: 'processing',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await roomRef.set({
        disbandRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        disbandRequestedBy: command.actorId,
    }, { merge: true });
    await deleteCollectionDocs(roomId, 'players');
    await deleteCollectionDocs(roomId, 'questions');
    await deleteCollectionDocs(roomId, 'answers');
    await deleteCollectionDocs(roomId, 'predictions');
    await deleteCollectionDocs(roomId, 'gameState');
    await deleteCollectionDocs(roomId, 'reactions');
    await deleteCollectionDocs(roomId, 'commands');
    await roomRef.delete();
    console.log(`[roomCommands] Room ${roomId} disbanded by command`);
});
//# sourceMappingURL=roomCommands.js.map