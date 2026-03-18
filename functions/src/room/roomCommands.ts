import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const REGION = 'asia-northeast1';

type RoomCommandType = 'DISBAND_ROOM';

interface RoomCommand {
  type?: RoomCommandType;
  actorId?: string;
  state?: 'queued' | 'processing' | 'failed';
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

async function markCommandFailed(
  commandRef: FirebaseFirestore.DocumentReference,
  reason: string
): Promise<void> {
  await commandRef.set(
    {
      state: 'failed',
      failedReason: reason,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export const onRoomCommandCreated = onDocumentCreated(
  {
    document: 'rooms/{roomId}/commands/{commandId}',
    region: REGION,
  },
  async (event) => {
    const roomId = event.params.roomId;
    const commandRef = event.data?.ref;
    const command = event.data?.data() as RoomCommand | undefined;

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

    const room = roomSnap.data() as { masterId?: string; disbandRequestedAt?: unknown };
    if (!room.masterId || room.masterId !== command.actorId) {
      await markCommandFailed(commandRef, 'forbidden_not_master');
      return;
    }

    if (room.disbandRequestedAt) {
      return;
    }

    await commandRef.set(
      {
        state: 'processing',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await roomRef.set(
      {
        disbandRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        disbandRequestedBy: command.actorId,
      },
      { merge: true }
    );

    await deleteCollectionDocs(roomId, 'players');
    await deleteCollectionDocs(roomId, 'questions');
    await deleteCollectionDocs(roomId, 'answers');
    await deleteCollectionDocs(roomId, 'predictions');
    await deleteCollectionDocs(roomId, 'gameState');
    await deleteCollectionDocs(roomId, 'reactions');
    await deleteCollectionDocs(roomId, 'commands');
    await roomRef.delete();

    console.log(`[roomCommands] Room ${roomId} disbanded by command`);
  }
);
