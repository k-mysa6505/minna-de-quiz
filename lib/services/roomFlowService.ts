// lib/services/roomFlowService.ts

import { clearQuestionsAndAnswers, initializeGame, resetGameState } from './gameService';
import { resetAllPlayersScores, updatePlayerOnlineStatus } from './playerService';
import { getQuestions } from './questionService';
import { removePlayerFromRoom, requestRoomCleanup, resetRoomForReplay, updateRoomStatus } from './roomService';

/**
 * 退室時に必要な room/player 系処理を統一実行する。
 */
export async function leaveRoomFlow(roomId: string, playerId: string): Promise<void> {
  await updatePlayerOnlineStatus(roomId, playerId, false);
  await removePlayerFromRoom(roomId, playerId);
  requestRoomCleanup(roomId).catch(console.error);
}

/**
 * リプレイ開始時に必要な room/player/game 処理を統一実行する。
 */
export async function resetRoomForReplayFlow(roomId: string): Promise<void> {
  await resetGameState(roomId);
  await clearQuestionsAndAnswers(roomId);
  await resetAllPlayersScores(roomId);
  await resetRoomForReplay(roomId);
}

/**
 * 問題作成完了後、現在の問題を元にゲームを初期化して playing へ遷移する。
 */
export async function initializeAndStartPlayingFlow(roomId: string): Promise<void> {
  const allQuestions = await getQuestions(roomId);
  const questionIds = allQuestions.map((q) => q.questionId);
  await initializeGame(roomId, questionIds);
  await updateRoomStatus(roomId, 'playing');
}
