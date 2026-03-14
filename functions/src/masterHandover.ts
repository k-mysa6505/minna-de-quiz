// functions/src/masterHandover.ts
// マスター（ホスト）がオフラインになったとき、
// オンライン中の最古参プレイヤーへ自動的にマスター権限を移譲する

import { onValueWritten } from 'firebase-functions/v2/database';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * RTDBのpresenceが変化したとき発火。
 * オフラインになったプレイヤーが masterId だった場合、
 * オンライン中のプレイヤーの中で最も joinedAt が古い人に移譲する。
 */
export const onPresenceChangedForMaster = onValueWritten(
  {
    ref: 'rooms/{roomId}/players/{playerId}/presence',
    region: 'asia-northeast1',
  },
  async (event) => {
    const roomId = event.params.roomId;
    const playerId = event.params.playerId;
    const after = event.data.after.val() as { isOnline: boolean } | null;

    // オフラインになったときのみ処理
    if (after?.isOnline !== false) return;

    // ルーム情報を取得
    const roomSnap = await db.collection('rooms').doc(roomId).get();
    if (!roomSnap.exists) return;
    const room = roomSnap.data()!;

    // 離脱したのがマスターでなければ何もしない
    if (room.masterId !== playerId) return;

    // waiting または finished 状態のときのみマスター移譲を実施（ゲーム中は行わない）
    if (room.status !== 'waiting' && room.status !== 'finished') {
      console.log(
        `[masterHandover] Room ${roomId} is in status=${room.status}. ` +
        'Master handover skipped during game.'
      );
      return;
    }

    console.log(
      `[masterHandover] Master ${playerId} went offline in room ${roomId}. ` +
      'Searching for new master...'
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
    const candidates = playersSnap.docs.filter(doc => doc.id !== playerId);

    if (candidates.length === 0) {
      console.log(`[masterHandover] No other online players found. No handover performed.`);
      return;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const newMasterDoc = candidates[randomIndex];
    const newMasterId = newMasterDoc.id;
    const newMasterNickname = newMasterDoc.data().nickname as string;

    console.log(
      `[masterHandover] Handing over master to: ` +
      `${newMasterId} (${newMasterNickname}) (randomly selected)`
    );

    // バッチでルームとプレイヤーを更新
    const batch = db.batch();

    // ルームのmasterIdを更新
    batch.update(db.collection('rooms').doc(roomId), {
      masterId: newMasterId,
      masterNickname: newMasterNickname,
    });

    // 旧マスターのドキュメントが存在するか確認してから更新
    const oldMasterRef = db.collection('rooms').doc(roomId).collection('players').doc(playerId);
    const oldMasterSnap = await oldMasterRef.get();
    if (oldMasterSnap.exists) {
      batch.update(oldMasterRef, { isMaster: false });
    }

    // 新マスターのisMasterをtrueに
    batch.update(
      db.collection('rooms').doc(roomId).collection('players').doc(newMasterId),
      { isMaster: true }
    );

    await batch.commit();
    console.log(`[masterHandover] Handover complete. New master: ${newMasterId}`);
  }
);
