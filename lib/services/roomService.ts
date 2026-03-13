// lib/services/roomService.ts
// ルーム管理サービス

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp
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
  console.log('Creating room with params:', params);
  try {
    // ルームIDを生成
    const roomId = generateRoomId();
    if (!isValidRoomId(roomId)) {
      throw new Error('Generated room ID is invalid: ' + roomId);
    }

    console.log('Room ID generated:', roomId);

    // 作成者を最初のプレイヤーとして追加（マスター）
    const masterId = await addPlayer(roomId, params.nickname, true);
    console.log('Creator added as master:', masterId);

    // Firestoreにルームドキュメントを作成
    const roomData: Partial<Room> = {
      roomId,
      masterId,
      masterNickname: params.nickname,
      status: 'waiting',
      createdAt: Timestamp.now(),
      maxPlayers: params.maxPlayers || 8,
      minPlayers: params.minPlayers || 2,
      isClosed: false,
      timeLimit: params.timeLimit || 30,
      scoringMode: params.scoringMode || 'standard',
      wrongAnswerPenalty: params.wrongAnswerPenalty || 0,
    };

    // descriptionがundefinedでない場合のみ追加
    if (params.description) {
      roomData.description = params.description;
    }

    await setDoc(doc(db, 'rooms', roomId), roomData);
    console.log('Room document created successfully:', roomId);

    return { roomId, playerId: masterId };
  } catch (error) {
    console.error('Error in createRoom:', error);
    throw error;
  }
}

/**
 * ルームに参加
 */
export async function joinRoom(params: JoinRoomParams): Promise<string> {
  console.log('Joining room:', params);
  try {
    // ルームIDの形式を確認
    if (!isValidRoomId(params.roomId)) {
      throw new Error('Invalid room ID format: ' + params.roomId);
    }

    // ルームが存在するか確認
    const roomRef = doc(db, 'rooms', params.roomId);
    const roomDoc = await getDoc(roomRef);

    if (!roomDoc.exists()) {
      console.warn('Room not found:', params.roomId);
      throw new Error('Room does not exist');
    }

    const roomData = roomDoc.data();
    console.log('Room found:', roomData);

    // 参加可能な状態か確認
    if (roomData.isClosed) {
      console.warn('Room is closed:', params.roomId);
      throw new Error('Room is closed for new participants');
    }

    // プレイヤー情報をサブコレクションに追加
    const playerId = await addPlayer(
      params.roomId,
      params.nickname,
      false
    );
    console.log('Player added to room:', playerId);

    return playerId;
  } catch (error) {
    console.error('Error in joinRoom:', error);
    throw error;
  }
}

/**
 * ルーム情報を取得
 */
export async function getRoom(roomId: string): Promise<Room | null> {
  console.log('Fetching room info:', roomId);
  try {
    const roomDoc = await getDoc(doc(db, 'rooms', roomId));
    if (roomDoc.exists()) {
      console.log('Room info retrieved:', roomId);
      return roomDoc.data() as Room;
    } else {
      console.warn('Room info not found:', roomId);
      return null;
    }
  } catch (error) {
    console.error('Error fetching room info:', error);
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
        console.log(`Room update received for ${roomId}:`, room.status);
        callback(room);
      } else {
        console.warn(`Room document missing or deleted: ${roomId}`);
        callback(null);
      }
    },
    (error) => {
      console.error(`Subscription Error for room ${roomId}:`, error);
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
  console.log(`Updating room status: ${roomId} -> ${status}`);
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, { status });
    console.log(`Room status updated: ${roomId} -> ${status}`);
  } catch (error) {
    console.error(`Failed to update room status for ${roomId}:`, error);
    throw error;
  }
}

/**
 * ゲーム開始
 */
export async function startGame(roomId: string): Promise<void> {
  console.log(`Starting game for room: ${roomId}`);
  try {
    const room = await getRoom(roomId);

    // 参加人数が最小人数以上か確認
    if (!room) {
      throw new Error('Room does not exist');
    }
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const playersSnapshot = await getDocs(playersRef);
    console.log(`Players count: ${playersSnapshot.size}, Min players: ${room.minPlayers}`);

    if (playersSnapshot.size < room.minPlayers) {
      const errorMsg = `Not enough players to start the game. Current: ${playersSnapshot.size}, Min: ${room.minPlayers}`;
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }

    // ルームステータスを'creating'に更新
    await updateRoomStatus(roomId, 'creating');
    console.log(`Game started defined for room: ${roomId}`);
  } catch (error) {
    console.error(`Error starting game for room ${roomId}:`, error);
    throw error;
  }
}

/**
 * ルームとそのサブコレクションを削除
 */
export async function deleteRoom(roomId: string): Promise<void> {
  try {
    console.log(`Starting deletion of room ${roomId}`);

    // サブコレクションを削除
    // 1. players サブコレクションを削除
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const playersSnapshot = await getDocs(playersRef);
    console.log(`Deleting ${playersSnapshot.size} players`);
    const playerDeletePromises = playersSnapshot.docs.map(playerDoc =>
      deleteDoc(playerDoc.ref)
    );
    await Promise.all(playerDeletePromises);

    // 2. questions サブコレクションを削除
    const questionsRef = collection(db, 'rooms', roomId, 'questions');
    const questionsSnapshot = await getDocs(questionsRef);
    console.log(`Deleting ${questionsSnapshot.size} questions`);
    const questionDeletePromises = questionsSnapshot.docs.map(questionDoc =>
      deleteDoc(questionDoc.ref)
    );
    await Promise.all(questionDeletePromises);

    // 3. answers サブコレクションを削除
    const answersRef = collection(db, 'rooms', roomId, 'answers');
    const answersSnapshot = await getDocs(answersRef);
    console.log(`Deleting ${answersSnapshot.size} answers`);
    const answerDeletePromises = answersSnapshot.docs.map(answerDoc =>
      deleteDoc(answerDoc.ref)
    );
    await Promise.all(answerDeletePromises);

    // 4. predictions サブコレクションを削除
    const predictionsRef = collection(db, 'rooms', roomId, 'predictions');
    const predictionsSnapshot = await getDocs(predictionsRef);
    console.log(`Deleting ${predictionsSnapshot.size} predictions`);
    const predictionDeletePromises = predictionsSnapshot.docs.map(predictionDoc =>
      deleteDoc(predictionDoc.ref)
    );
    await Promise.all(predictionDeletePromises);

    // 5. gameState サブコレクションを削除
    const gameStateRef = collection(db, 'rooms', roomId, 'gameState');
    const gameStateSnapshot = await getDocs(gameStateRef);
    console.log(`Deleting ${gameStateSnapshot.size} game states`);
    const gameStateDeletePromises = gameStateSnapshot.docs.map(stateDoc =>
      deleteDoc(stateDoc.ref)
    );
    await Promise.all(gameStateDeletePromises);

    // 6. 最後にルーム本体を削除
    const roomRef = doc(db, 'rooms', roomId);
    await deleteDoc(roomRef);

    console.log(`Room ${roomId} and all subcollections deleted successfully`);
  } catch (error) {
    console.error('Failed to delete room:', error);
    throw error;
  }
}

/**
 * プレイヤーをルームから削除
 */
export async function removePlayerFromRoom(
  roomId: string,
  playerId: string
): Promise<number> {
  try {
    // プレイヤーを削除
    const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
    await deleteDoc(playerRef);

    // 残りのプレイヤー数を返す
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const playersSnapshot = await getDocs(playersRef);
    return playersSnapshot.size;
  } catch (error) {
    console.error('Failed to remove player from room:', error);
    throw error;
  }
}

/**
 * ルーム削除をサーバー側に依頼
 */
export async function requestRoomCleanup(roomId: string): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      cleanupRequestedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Room cleanup request skipped:', error);
  }
}

/**
 * Reset room for replay (keep participants, reset game data)
 */
export async function resetRoomForReplay(roomId: string): Promise<void> {
  console.log('Resetting room for replay:', roomId);
  try {
    const roomRef = doc(db, 'rooms', roomId);

    // Reset room status to waiting
    await updateDoc(roomRef, {
      status: 'waiting'
    });

    console.log('Room reset successfully for replay');
  } catch (error) {
    console.error('Error resetting room for replay:', error);
    throw error;
  }
}