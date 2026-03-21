"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runForcedOfflineLeave = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const REGION = 'asia-northeast1';
const MAX_ROOMS_PER_RUN = 60;
const MAX_OFFLINE_PLAYERS_PER_ROOM = 30;
const OFFLINE_GRACE_MS = {
    waiting: 10 * 60 * 1000,
    creating: 10 * 60 * 1000,
    finished: 10 * 60 * 1000,
    playing: 3 * 60 * 1000,
};
const PLAYING_PHASE_GRACE_MS = {
    answering: 90 * 1000,
    revealing: 3 * 60 * 1000,
};
function toMillis(value) {
    if (value && typeof value === 'object' && 'toMillis' in value) {
        const ts = value;
        return ts.toMillis();
    }
    return 0;
}
async function resolveGraceMs(roomRef, roomStatus) {
    var _a, _b;
    if (roomStatus !== 'playing') {
        return (_a = OFFLINE_GRACE_MS[roomStatus]) !== null && _a !== void 0 ? _a : OFFLINE_GRACE_MS.waiting;
    }
    const gameStateSnap = await roomRef.collection('gameState').doc('state').get();
    if (!gameStateSnap.exists) {
        return OFFLINE_GRACE_MS.playing;
    }
    const gameState = gameStateSnap.data();
    if (!gameState.phase) {
        return OFFLINE_GRACE_MS.playing;
    }
    return (_b = PLAYING_PHASE_GRACE_MS[gameState.phase]) !== null && _b !== void 0 ? _b : OFFLINE_GRACE_MS.playing;
}
async function maybeHandoverMaster(tx, roomRef, room, leavingPlayerId, playersBefore) {
    var _a, _b;
    if (room.masterId !== leavingPlayerId) {
        return;
    }
    if (room.status !== 'waiting' && room.status !== 'finished') {
        return;
    }
    const onlineCandidates = playersBefore.docs
        .filter((docSnap) => {
        if (docSnap.id === leavingPlayerId)
            return false;
        const data = docSnap.data();
        return Boolean(data.isOnline);
    });
    if (onlineCandidates.length === 0) {
        return;
    }
    const randomIndex = Math.floor(Math.random() * onlineCandidates.length);
    const nextMasterDoc = onlineCandidates[randomIndex];
    const nextMasterData = nextMasterDoc.data();
    tx.update(roomRef, {
        masterId: nextMasterDoc.id,
        masterNickname: (_b = (_a = nextMasterData.nickname) !== null && _a !== void 0 ? _a : room.masterNickname) !== null && _b !== void 0 ? _b : 'unknown',
    });
    tx.update(nextMasterDoc.ref, {
        isMaster: true,
    });
}
async function forceLeaveOfflinePlayer(roomRef, roomId, playerId, cutoffMillis) {
    await db.runTransaction(async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists) {
            return;
        }
        const room = roomSnap.data();
        if (!(room === null || room === void 0 ? void 0 : room.status) || !(room.status in OFFLINE_GRACE_MS)) {
            return;
        }
        const playerRef = roomRef.collection('players').doc(playerId);
        const playerSnap = await tx.get(playerRef);
        if (!playerSnap.exists) {
            return;
        }
        const player = playerSnap.data();
        if (player.isOnline) {
            return;
        }
        const offlineSinceMillis = toMillis(player.offlineSince);
        if (offlineSinceMillis === 0 || offlineSinceMillis > cutoffMillis) {
            return;
        }
        const playersBefore = await tx.get(roomRef.collection('players'));
        const remainingPlayers = Math.max(0, playersBefore.size - 1);
        await maybeHandoverMaster(tx, roomRef, room, playerId, playersBefore);
        tx.delete(playerRef);
        const gameStateRef = roomRef.collection('gameState').doc('state');
        const gameStateSnap = await tx.get(gameStateRef);
        if (gameStateSnap.exists) {
            tx.update(gameStateRef, {
                playersReady: admin.firestore.FieldValue.arrayRemove(playerId),
                requiredAnswerPlayerIds: admin.firestore.FieldValue.arrayRemove(playerId),
            });
        }
        if (remainingPlayers === 0) {
            tx.update(roomRef, {
                cleanupRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    console.log(`[forceLeave] Room ${roomId}: removed offline player ${playerId}`);
}
exports.runForcedOfflineLeave = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 minutes',
    timeZone: 'Asia/Tokyo',
    region: REGION,
}, async () => {
    var _a;
    const roomsSnap = await db
        .collection('rooms')
        .where('status', 'in', ['waiting', 'creating', 'playing', 'finished'])
        .limit(MAX_ROOMS_PER_RUN)
        .get();
    if (roomsSnap.empty) {
        return;
    }
    const now = Date.now();
    for (const roomDoc of roomsSnap.docs) {
        const room = roomDoc.data();
        const status = (_a = room.status) !== null && _a !== void 0 ? _a : 'waiting';
        const graceMs = await resolveGraceMs(roomDoc.ref, status);
        const cutoffMillis = now - graceMs;
        const cutoffTs = admin.firestore.Timestamp.fromMillis(cutoffMillis);
        const offlinePlayers = await roomDoc.ref
            .collection('players')
            .where('isOnline', '==', false)
            .where('offlineSince', '<=', cutoffTs)
            .limit(MAX_OFFLINE_PLAYERS_PER_ROOM)
            .get();
        if (offlinePlayers.empty) {
            continue;
        }
        for (const playerDoc of offlinePlayers.docs) {
            await forceLeaveOfflinePlayer(roomDoc.ref, roomDoc.id, playerDoc.id, cutoffMillis);
        }
    }
});
//# sourceMappingURL=forceLeave.js.map