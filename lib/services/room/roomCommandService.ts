import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type RoomCommandType = 'DISBAND_ROOM';

interface CreateRoomCommandParams {
  roomId: string;
  type: RoomCommandType;
  actorId: string;
}

export async function createRoomCommand({ roomId, type, actorId }: CreateRoomCommandParams): Promise<void> {
  await addDoc(collection(db, 'rooms', roomId, 'commands'), {
    type,
    actorId,
    state: 'queued',
    createdAt: serverTimestamp(),
  });
}

export async function requestDisbandRoomCommand(roomId: string, actorId: string): Promise<void> {
  await createRoomCommand({
    roomId,
    type: 'DISBAND_ROOM',
    actorId,
  });
}
