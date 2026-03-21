// lib/services/roomFlowService.ts

import { clearQuestionsAndAnswers, initializeGame, resetGameState } from '../game/gameService';
import { resetAllPlayersScores, updatePlayerOnlineStatus } from '../auth/playerService';
import { getQuestions } from '../game/questionService';
import { requestDisbandRoomCommand } from './roomCommandService';
import {
  getRoom,
  handoverMasterOnPlayerLeave,
  removePlayerFromRoom,
  requestRoomCleanup,
  resetRoomForReplay,
  updateRoomStatus,
} from './roomService';

/**
 * 退室時に必要な room/player 系処理を統一実行する。
 */
export async function leaveRoomFlow(roomId: string, playerId: string): Promise<void> {
  await handoverMasterOnPlayerLeave(roomId, playerId);
  await updatePlayerOnlineStatus(roomId, playerId, false);
  const remainingPlayers = await removePlayerFromRoom(roomId, playerId);

  // Trigger cleanup only when the room is truly empty.
  if (remainingPlayers === 0) {
    requestRoomCleanup(roomId).catch(console.error);
  }
}

/**
 * リプレイ開始時に必要な room/player/game 処理を統一実行する。
 */
export async function resetRoomForReplayFlow(roomId: string, actorPlayerId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) {
    throw new Error('Room does not exist');
  }

  // In screen mode, only the host display device can trigger replay.
  if (room.useScreenMode && room.masterId !== actorPlayerId) {
    throw new Error('Only the room master can start replay in screen mode');
  }

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

/**
 * ルームを完全解体する（マスターのみ）。
 */
export async function disbandRoomFlow(roomId: string, actorId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) {
    throw new Error('Room does not exist');
  }

  if (room.masterId !== actorId) {
    throw new Error('Only the room master can disband room');
  }

  await requestDisbandRoomCommand(roomId, actorId);
}
