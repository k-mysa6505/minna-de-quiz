import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const REGION = 'asia-northeast1';
const CLEANUP_GRACE_MS = 2 * 60 * 1000;

type CleanupDecision = 'scheduled' | 'deferred' | 'deleted' | 'skipped';

function getMillis(value: unknown): number {
    if (value && typeof value === 'object' && 'toMillis' in value) {
        const ts = value as { toMillis: () => number };
        return ts.toMillis();
    }
    return 0;
}

async function countPlayers(roomId: string): Promise<number> {
    const playersSnap = await db
        .collection('rooms')
        .doc(roomId)
        .collection('players')
        .get();
    return playersSnap.size;
}

async function applyCleanupDecision(
    roomId: string,
    decision: CleanupDecision,
    patch: Record<string, unknown>
): Promise<void> {
    await db.collection('rooms').doc(roomId).set(
        {
            ...patch,
            cleanupState: decision,
            lastCleanupDecisionAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
    );
}

async function scheduleRoomCleanup(roomId: string, reason: string): Promise<void> {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) return;

    const playerCount = await countPlayers(roomId);

    if (playerCount > 0) {
        await applyCleanupDecision(roomId, 'deferred', {
            deleteEligibleAt: admin.firestore.FieldValue.delete(),
            cleanupReason: `players_present:${reason}`,
        });
        return;
    }

    const now = Date.now();
    const currentEligibleAt = getMillis(roomSnap.data()?.deleteEligibleAt);
    const nextEligibleAt =
        currentEligibleAt > now
            ? roomSnap.data()?.deleteEligibleAt
            : admin.firestore.Timestamp.fromMillis(now + CLEANUP_GRACE_MS);

    await applyCleanupDecision(roomId, 'scheduled', {
        deleteEligibleAt: nextEligibleAt,
        cleanupReason: reason,
    });
}

async function deleteCollectionDocs(roomId: string, collectionName: string): Promise<void> {
    const snap = await db.collection('rooms').doc(roomId).collection(collectionName).get();
    if (snap.empty) return;

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

async function deleteRoomIfEligible(roomId: string): Promise<void> {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) return;

    const room = roomSnap.data() ?? {};
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

export const onRoomCleanupRequested = onDocumentUpdated(
    {
        document: 'rooms/{roomId}',
        region: REGION,
    },
    async (event) => {
        const roomId = event.params.roomId;
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        if (!after) return;

        const beforeReqAt = getMillis(before?.cleanupRequestedAt);
        const afterReqAt = getMillis(after.cleanupRequestedAt);
        if (afterReqAt <= beforeReqAt) {
            return;
        }

        console.log(`[roomCleanup] request received room=${roomId}`);
        await scheduleRoomCleanup(roomId, 'client_request');
    }
);

export const runScheduledRoomCleanup = onSchedule(
    {
        schedule: 'every 1 minutes',
        timeZone: 'Asia/Tokyo',
        region: REGION,
    },
    async () => {
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
    }
);