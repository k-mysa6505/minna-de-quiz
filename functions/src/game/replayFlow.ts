import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = 'asia-northeast1';

async function getPlayersSnapshot(roomId: string) {
  return db.collection('rooms').doc(roomId).collection('players').get();
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

export const onReplayRequestChanged = onDocumentUpdated(
  {
    document: 'rooms/{roomId}/players/{playerId}',
    region: REGION,
  },
  async (event) => {
    const roomId = event.params.roomId;
    const before = event.data?.before.data() as { wantsReplay?: boolean } | undefined;
    const after = event.data?.after.data() as { wantsReplay?: boolean } | undefined;

    if (!after) {
      return;
    }

    const beforeReplay = Boolean(before?.wantsReplay);
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

      const room = roomSnap.data() as {
        status?: string;
        useScreenMode?: boolean;
        replayResetInProgress?: boolean;
      };

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
        const player = docSnap.data() as { wantsReplay?: boolean };
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

      await roomRef.set(
        {
          status: 'waiting',
          replayResetInProgress: false,
          replayResetAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`[replayFlow] Room ${roomId} reset for replay by unanimous requests`);
    } catch (error) {
      await roomRef.set({ replayResetInProgress: false }, { merge: true });
      throw error;
    }
  }
);
