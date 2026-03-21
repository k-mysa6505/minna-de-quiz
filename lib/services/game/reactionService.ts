import { addDoc, collection, getDocs, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ReactionKind = 'reaction' | 'message';

export interface RoomReaction {
    id: string;
    type: ReactionKind;
    content: string;
    userId: string;
    userName: string;
    roomId: string;
    createdAt: Timestamp;
    questionId?: string;
}

export async function sendRoomReaction(params: {
    roomId: string;
    userId: string;
    userName: string;
    type: ReactionKind;
    content: string;
    questionId?: string;
}): Promise<void> {
    const reactionsRef = collection(db, 'rooms', params.roomId, 'reactions');
    await addDoc(reactionsRef, {
        type: params.type,
        content: params.content,
        userId: params.userId,
        userName: params.userName,
        roomId: params.roomId,
        createdAt: Timestamp.now(),
        questionId: params.questionId || null,
    });
}

export async function countQuestionReactions(roomId: string, questionId: string): Promise<number> {
    const reactionsRef = collection(db, 'rooms', roomId, 'reactions');
    const q = query(reactionsRef, where('questionId', '==', questionId));
    const snapshot = await getDocs(q);
    return snapshot.size;
}

export function subscribeToRoomReactions(
    roomId: string,
    callback: (reactions: RoomReaction[]) => void,
    maxItems: number = 24
): () => void {
    const reactionsRef = collection(db, 'rooms', roomId, 'reactions');
    const q = query(reactionsRef, orderBy('createdAt', 'desc'), limit(maxItems));

    return onSnapshot(
        q,
        (snapshot) => {
            const reactions: RoomReaction[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<RoomReaction, 'id'>),
            }));
            callback(reactions);
        },
        (error) => {
            console.error('Failed to subscribe to reactions:', error);
            callback([]);
        }
    );
}
