// lib/services/roomService.ts
// ルーム管理サービス

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, CreateRoomParams, JoinRoomParams } from '@/types';
import { generateRoomId, isValidRoomId } from '@/lib/utils/generateRoomId';
import { addPlayer } from './playerService';

/**
 * 新しいルームを作成
 * @returns { roomId, playerId } - ルームIDとプレイヤーID
 */
export async function createRoom(params: CreateRoomParams): Promise<{ roomId: string; playerId: string }> {
  // ルームIDを生成
  const roomId = generateRoomId();
  if (!isValidRoomId(roomId)) {
    throw new Error('Generated room ID is invalid');
  }

  // 作成者を最初のプレイヤーとして追加（マスター）
  const masterId = await addPlayer(roomId, params.nickname, true);

  // Firestoreにルームドキュメントを作成
  await setDoc(doc(db, 'rooms', roomId), {
    roomId,
    masterId,  // playerId を設定
    status: 'waiting',
    createdAt: Timestamp.now(),
    maxPlayers: params.maxPlayers || 10,
    minPlayers: params.minPlayers || 3,
    isClosed: false
  });

  return { roomId, playerId: masterId };
}

/**
 * ルームに参加
 */
export async function joinRoom(params: JoinRoomParams): Promise<string> {
  // ルームIDの形式を確認
  if (!isValidRoomId(params.roomId)) {
    throw new Error('Invalid room ID format');
  }

  // ルームが存在するか確認
  const roomDoc = await getDoc(doc(db, 'rooms', params.roomId));
  if (!roomDoc.exists()) {
    throw new Error('Room does not exist');
  }

  // 参加可能な状態か確認
  if (roomDoc.data().isClosed) {
    throw new Error('Room is closed for new participants');
  }

  // プレイヤー情報をサブコレクションに追加
  const playerId = await addPlayer(
    params.roomId,
    params.nickname,
    false
  );

  return playerId;
}

/**
 * ルーム情報を取得
 */
export async function getRoom(roomId: string): Promise<Room | null> {
  const roomDoc = await getDoc(doc(db, 'rooms', roomId));
  if (roomDoc.exists()) {
    return roomDoc.data() as Room;
  } else {
    return null;
  }
}

/**
 * ルーム情報をリアルタイム監視
 */
export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void
): () => void {
  console.log(`Starting subscribe room info: ${roomId}`);

  // Firestoreのリアルタイム監視
  const unsubscribe = onSnapshot(
    doc(db, 'rooms', roomId),
    (snapshot) => {
      if (snapshot.exists()) {
        const room = snapshot.data() as Room;
        callback(room);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Subscription Error:', error);
      callback(null);
    }
  );

  // 購読解除関数を返す
  return () => {
    console.log(`Quit Subscription: ${roomId}`);
    unsubscribe();  // Firestoreの監視を停止
  };
}

/**
 * ルームのステータスを更新
 */
export async function updateRoomStatus(
  roomId: string,
  status: Room['status']
): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, { status });
}

/**
 * ゲーム開始
 */
export async function startGame(roomId: string): Promise<void> {
  const room = await getRoom(roomId);

  // 参加人数が最小人数以上か確認
  if (!room) {
    throw new Error('Room does not exist');
  }
  const playersRef = collection(db, 'rooms', roomId, 'players');
  const playersSnapshot = await getDocs(playersRef);
  if (playersSnapshot.size < room.minPlayers) {
    throw new Error('Not enough players to start the game');
  }

  // ルームステータスを'creating'に更新
  await updateRoomStatus(roomId, 'creating');
}
