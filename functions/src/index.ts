// functions/src/index.ts
// Firebase Cloud Functions エントリポイント
//
// presence.ts: RTDBのpresence変化を処理（Firestore同期 + マスター移譲）
// gameFlow.ts: ゲーム進行を制御（全員回答で結果へ、全員ready で次の問題へ）

export { syncPresenceToFirestore } from './presence';
export { onAnswerWritten, onPredictionWritten, onPlayerReadyChanged } from './gameFlow';
