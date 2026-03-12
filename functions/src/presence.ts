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
        console.warn(`[presence] Player ${playerId} not found in Firestore. Skipping.`);
        return;
      }

      // 1. Firestoreの isOnline を同期
      await playerRef.update({ isOnline });
      console.log(`[presence] Firestore isOnline updated: player=${playerId} → ${isOnline}`);

      // 2. オフラインになった場合のみマスター移譲チェック
      if (!isOnline) {
        await handleMasterHandoverIfNeeded(roomId, playerId);
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

  // waiting 状態のときのみマスター移譲を実施（ゲーム中は行わない）
  if (room.status !== 'waiting') {
    console.log(
      `[masterHandover] Room ${roomId} is in status=${room.status}. Handover skipped.`
    );
    return;
  }

  console.log(
    `[masterHandover] Master ${offlinePlayerId} went offline. Searching for new master...`
  );

  // オンライン中のプレイヤーを joinedAt 昇順で取得
  const playersSnap = await db
    .collection('rooms')
    .doc(roomId)
    .collection('players')
    .where('isOnline', '==', true)
    .orderBy('joinedAt', 'asc')
    .get();

  if (playersSnap.empty) {
    console.log(`[masterHandover] No online players found. No handover performed.`);
    return;
  }

  const newMasterDoc = playersSnap.docs[0];
  const newMasterId = newMasterDoc.id;
  const newMasterNickname = newMasterDoc.data().nickname as string;

  console.log(`[masterHandover] Handing over to: ${newMasterId} (${newMasterNickname})`);

  // バッチで一括更新
  const batch = db.batch();
  batch.update(db.collection('rooms').doc(roomId), {
    masterId: newMasterId,
    masterNickname: newMasterNickname,
  });
  batch.update(
    db.collection('rooms').doc(roomId).collection('players').doc(offlinePlayerId),
    { isMaster: false }
  );
  batch.update(
    db.collection('rooms').doc(roomId).collection('players').doc(newMasterId),
    { isMaster: true }
  );
  await batch.commit();
  console.log(`[masterHandover] Handover complete. New master: ${newMasterId}`);
}
