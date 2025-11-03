// lib/services/roomService.ts
// ルーム管理サービス

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, CreateRoomParams, JoinRoomParams } from '@/types';
import { generateRoomId, isValidRoomId } from '@/lib/utils/generateRoomId';
import { update } from 'firebase/database';
import { addPlayer } from './playerService';

/**
 * 新しいルームを作成
 *
 * ヒント:
 * 1. ルームIDを生成（6桁の英数字）
 * 2. Firestoreの`rooms`コレクションに新規ドキュメント作成
 * 3. 作成者を最初のプレイヤーとして追加
 * 4. 作成したルームIDを返す
 */
export async function createRoom(params: CreateRoomParams): Promise<string> {
  // ルームIDを生成
  const roomId = generateRoomId();
  if (!isValidRoomId(roomId)) {
    throw new Error('Generated room ID is invalid');
  }

  // Firestoreにルームドキュメントを作成
  await setDoc(doc(db, 'rooms'), {
    roomId,
    masterId: params.nickname,
    status: 'waiting',
    createdAt: Timestamp.now(),
    maxPlayers: params.maxPlayers || 10,
    minPlayers: params.minPlayers || 3,
    isClosed: false
  });

  return roomId;
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
 * TODO: 実装してください
 */
export async function getRoom(roomId: string): Promise<Room | null> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * ルーム情報をリアルタイム監視
 */
export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void
): () => void {
  console.log(`購読開始: ${roomId}`);

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
      console.error('購読エラー:', error);
      callback(null);
    }
  );

  // 購読解除関数を返す
  return () => {
    console.log(`購読停止: ${roomId}`);
    unsubscribe();  // Firestoreの監視を停止
  };
}

/**
 * ルームのステータスを更新
 * TODO: 実装してください
 */
export async function updateRoomStatus(
  roomId: string,
  status: Room['status']
): Promise<void> {
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * ゲーム開始
 * TODO: 実装してください
 *
 * ヒント:
 * 1. 参加人数が最小人数以上か確認
 * 2. ルームステータスを'creating'に更新
 */
export async function startGame(roomId: string): Promise<void> {
  // TODO: 実装
  throw new Error('Not implemented');
}
