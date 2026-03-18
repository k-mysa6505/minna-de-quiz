// functions/src/index.ts
// Firebase Cloud Functions エントリポイント
//
// presence.ts: RTDBのpresence変化を処理（Firestore同期 + マスター移譲）
// gameFlow.ts: ゲーム進行を制御（全員回答で結果へ、全員ready で次の問題へ）

export { syncPresenceToFirestore } from './presence/presence';
export { onAnswerWritten, onPredictionWritten, onGameStateChanged, onGameStateCreated, onPlayerReadyChanged } from './game/gameFlow';
export { onRoomCleanupRequested, runScheduledRoomCleanup } from './room/roomCleanup';
export { onRoomCommandCreated } from './room/roomCommands';
export { onReplayRequestChanged } from './game/replayFlow';
export { runForcedOfflineLeave } from './room/forceLeave';
