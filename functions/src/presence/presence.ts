// functions/src/presence.ts
// RTDBのpresence変化を処理するFunction
//
// 責務：
//  1. Firestoreの isOnline を同期（RTDB → Firestore）
//  2. マスターがオフラインになったとき、次のオンラインプレイヤーへ権限を移譲（waiting状態のみ）

import { onValueWritten } from 'firebase-functions/v2/database';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const FORCE_LEAVE_GRACE_MS = 20 * 1000;

type RoomLike = {
  status?: string;
  masterId?: string;
  masterNickname?: string;
};

/**
 * RTDBのpresence (isOnline) が変化したとき:
 *   1. FirestoreのプレイヤードキュメントのisOnlineを更新
 *   2. マスターがオフラインになったらマスター権限を移譲（waiting状態のみ）
 *
 * synchronizePresenceAndHandover という単一のFunctionにまとめることで、
 * 同一パスへの複数トリガーの競合を避ける。
 */
export const syncPresenceToFirestore = onValueWritten(
  {
    ref: 'rooms/{roomId}/players/{playerId}/presence',
    region: 'us-central1',
    instance: 'minkui-636fa-default-rtdb',
  },
  async (event) => {
    const roomId = event.params.roomId;
    const playerId = event.params.playerId;
    const after = event.data.after.val() as { isOnline: boolean } | null;
    const isOnline = after?.isOnline ?? false;

    console.log(
      `[presence] room=${roomId} player=${playerId} isOnline=${isOnline}`
    );

    try {
      const playerRef = db
        .collection('rooms')
        .doc(roomId)
        .collection('players')
        .doc(playerId);

      const playerSnap = await playerRef.get();
      if (!playerSnap.exists) {
        console.warn(`[presence] Player ${playerId} not found in Firestore. This might be an explicit leave.`);
        // ドキュメントがない＝すでに削除された（明示的な退室）ためオンライン状態の更新は不要だが、
        // マスター移譲のチェック自体は行う
        if (!isOnline) {
          await handleMasterHandoverIfNeeded(roomId, playerId);
        }
        return;
      }

      // 1. Firestoreの isOnline を同期
      await playerRef.update({
        isOnline,
        presenceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        offlineSince: isOnline
          ? admin.firestore.FieldValue.delete()
          : admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[presence] Firestore isOnline updated: player=${playerId} → ${isOnline}`);

      // 2. オフラインになった場合のみマスター移譲チェック
      if (!isOnline) {
        await handleMasterHandoverIfNeeded(roomId, playerId);
        await forceLeaveIfOfflineAfterGrace(roomId, playerId);
      }
    } catch (err) {
      console.error('[presence] Error:', err);
    }
  }
);

/**
 * 離脱したプレイヤーがマスターだった場合、
 * waiting状態のルームでのみマスター権限を移譲する。
 */
async function handleMasterHandoverIfNeeded(
  roomId: string,
  offlinePlayerId: string
): Promise<void> {
  const roomSnap = await db.collection('rooms').doc(roomId).get();
  if (!roomSnap.exists) return;

  const room = roomSnap.data()!;

  // 離脱したのがマスターでなければスキップ
  if (room.masterId !== offlinePlayerId) return;

  // waiting または finished 状態のときのみマスター移譲を実施（ゲーム中は行わない）
  if (room.status !== 'waiting' && room.status !== 'finished') {
    console.log(
      `[masterHandover] Room ${roomId} is in status=${room.status}. Handover skipped.`
    );
    return;
  }

  console.log(
    `[masterHandover] Master ${offlinePlayerId} went offline. Searching for new master...`
  );

  // オンライン中のプレイヤーを取得
  const playersSnap = await db
    .collection('rooms')
    .doc(roomId)
    .collection('players')
    .where('isOnline', '==', true)
    .get();

  if (playersSnap.empty) {
    console.log(`[masterHandover] No online players found. No handover performed.`);
    return;
  }

  // ランダムに新しいマスターを選択（離脱したプレイヤーを除く）
  const candidates = playersSnap.docs.filter(doc => doc.id !== offlinePlayerId);

  if (candidates.length === 0) {
    console.log(`[masterHandover] No other online players found. No handover performed.`);
    return;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  const newMasterDoc = candidates[randomIndex];
  const newMasterId = newMasterDoc.id;
  const newMasterNickname = newMasterDoc.data().nickname as string;

  console.log(`[masterHandover] Handing over to: ${newMasterId} (${newMasterNickname}) (randomly selected)`);

  // バッチで一括更新
  const batch = db.batch();
  batch.update(db.collection('rooms').doc(roomId), {
    masterId: newMasterId,
    masterNickname: newMasterNickname,
  });

  // 離脱したプレイヤーのドキュメントが存在するか確認
  const offlinePlayerRef = db.collection('rooms').doc(roomId).collection('players').doc(offlinePlayerId);
  const offlinePlayerSnap = await offlinePlayerRef.get();
  if (offlinePlayerSnap.exists) {
    batch.update(offlinePlayerRef, { isMaster: false });
  }

  batch.update(
    db.collection('rooms').doc(roomId).collection('players').doc(newMasterId),
    { isMaster: true }
  );
  await batch.commit();
  console.log(`[masterHandover] Handover complete. New master: ${newMasterId}`);
}

async function forceLeaveIfOfflineAfterGrace(roomId: string, playerId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, FORCE_LEAVE_GRACE_MS));

  await db.runTransaction(async (tx) => {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) {
      return;
    }

    const room = roomSnap.data() as RoomLike;
    if (!room.status || !['waiting', 'creating', 'playing', 'finished'].includes(room.status)) {
      return;
    }

    const playerRef = roomRef.collection('players').doc(playerId);
    const playerSnap = await tx.get(playerRef);
    if (!playerSnap.exists) {
      return;
    }

    const player = playerSnap.data() as { isOnline?: boolean };
    if (player.isOnline) {
      return;
    }

    const playersBefore = await tx.get(roomRef.collection('players'));
    const remainingPlayers = Math.max(0, playersBefore.size - 1);

    if (room.masterId === playerId && (room.status === 'waiting' || room.status === 'finished')) {
      const candidates = playersBefore.docs.filter((docSnap) => {
        if (docSnap.id === playerId) return false;
        const data = docSnap.data() as { isOnline?: boolean };
        return Boolean(data.isOnline);
      });

      if (candidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        const nextMasterDoc = candidates[randomIndex];
        const nextMasterData = nextMasterDoc.data() as { nickname?: string };

        tx.update(roomRef, {
          masterId: nextMasterDoc.id,
          masterNickname: nextMasterData.nickname ?? room.masterNickname ?? 'unknown',
        });

        tx.update(nextMasterDoc.ref, {
          isMaster: true,
        });
      }
    }

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

  console.log(`[forceLeave.quick] Room ${roomId}: removed offline player ${playerId} after ${FORCE_LEAVE_GRACE_MS}ms`);
}
