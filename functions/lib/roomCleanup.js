"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScheduledRoomCleanup = exports.onRoomCleanupRequested = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const REGION = 'asia-northeast1';
const CLEANUP_GRACE_MS = 2 * 60 * 1000;
function getMillis(value) {
    if (value && typeof value === 'object' && 'toMillis' in value) {
        const ts = value;
        return ts.toMillis();
    }
    return 0;
}
async function countPlayers(roomId) {
    const playersSnap = await db
        .collection('rooms')
        .doc(roomId)
        .collection('players')
        .get();
    return playersSnap.size;
}
async function applyCleanupDecision(roomId, decision, patch) {
    await db.collection('rooms').doc(roomId).set(Object.assign(Object.assign({}, patch), { cleanupState: decision, lastCleanupDecisionAt: admin.firestore.FieldValue.serverTimestamp() }), { merge: true });
}
async function scheduleRoomCleanup(roomId, reason) {
    var _a, _b;
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists)
        return;
    const playerCount = await countPlayers(roomId);
    if (playerCount > 0) {
        await applyCleanupDecision(roomId, 'deferred', {
            deleteEligibleAt: admin.firestore.FieldValue.delete(),
            cleanupReason: `players_present:${reason}`,
        });
        return;
    }
    const now = Date.now();
    const currentEligibleAt = getMillis((_a = roomSnap.data()) === null || _a === void 0 ? void 0 : _a.deleteEligibleAt);
    const nextEligibleAt = currentEligibleAt > now
        ? (_b = roomSnap.data()) === null || _b === void 0 ? void 0 : _b.deleteEligibleAt
        : admin.firestore.Timestamp.fromMillis(now + CLEANUP_GRACE_MS);
    await applyCleanupDecision(roomId, 'scheduled', {
        deleteEligibleAt: nextEligibleAt,
        cleanupReason: reason,
    });
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
async function deleteRoomIfEligible(roomId) {
    var _a;
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists)
        return;
    const room = (_a = roomSnap.data()) !== null && _a !== void 0 ? _a : {};
    const eligibleAt = getMillis(room.deleteEligibleAt);
    if (eligibleAt === 0 || eligibleAt > Date.now()) {
        return;
    }
    const playerCount = await countPlayers(roomId);
    if (playerCount > 0) {
        await applyCleanupDecision(roomId, 'deferred', {
            deleteEligibleAt: admin.firestore.FieldValue.delete(),
            cleanupReason: 'rejoined_before_delete',
        });
        return;
    }
    await deleteCollectionDocs(roomId, 'players');
    await deleteCollectionDocs(roomId, 'questions');
    await deleteCollectionDocs(roomId, 'answers');
    await deleteCollectionDocs(roomId, 'predictions');
    await deleteCollectionDocs(roomId, 'gameState');
    await roomRef.delete();
    console.log(`[roomCleanup] Room ${roomId} deleted by scheduler`);
}
exports.onRoomCleanupRequested = (0, firestore_1.onDocumentUpdated)({
    document: 'rooms/{roomId}',
    region: REGION,
}, async (event) => {
    var _a, _b;
    const roomId = event.params.roomId;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!after)
        return;
    const beforeReqAt = getMillis(before === null || before === void 0 ? void 0 : before.cleanupRequestedAt);
    const afterReqAt = getMillis(after.cleanupRequestedAt);
    if (afterReqAt <= beforeReqAt) {
        return;
    }
    console.log(`[roomCleanup] request received room=${roomId}`);
    await scheduleRoomCleanup(roomId, 'client_request');
});
exports.runScheduledRoomCleanup = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 minutes',
    timeZone: 'Asia/Tokyo',
    region: REGION,
}, async () => {
    const now = admin.firestore.Timestamp.now();
    const candidates = await db
        .collection('rooms')
        .where('deleteEligibleAt', '<=', now)
        .limit(50)
        .get();
    if (candidates.empty) {
        return;
    }
    for (const roomDoc of candidates.docs) {
        await deleteRoomIfEligible(roomDoc.id);
    }
});
//# sourceMappingURL=roomCleanup.js.map