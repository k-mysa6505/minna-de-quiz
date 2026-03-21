'use client';

import { useState, useEffect, useMemo } from 'react';
import { subscribeToRoom, handoverMasterFromScreenDevice } from '@/lib/services/room/roomService';
import { subscribeToPlayers } from '@/lib/services/auth/playerService';
import { getAnswers, getGameState, getPrediction } from '@/lib/services/game/gameService';
import { getQuestion, getQuestionProgress, getQuestions } from '@/lib/services/game/questionService';
import { subscribeToRoomReactions, type RoomReaction } from '@/lib/services/game/reactionService';
import { preloadImages } from '@/lib/utils/imagePreloader';
import type { Answer, GameState, Player, Prediction, Question, Room } from '@/types';

export type ScreenState = {
  room: Room | null;
  players: Player[];
  gameState: GameState | null;
  currentQuestion: Question | null;
  allQuestions: Question[];
  questionProgress: { created: number; total: number };
  creatingCompletedAuthorIds: string[];
  currentAnswers: Answer[];
  currentPrediction: Prediction | null;
  revealDataQuestionId: string | null;
  reactions: RoomReaction[];
  error: string;
};

export function useScreenData(roomId: string, requestedDeviceId: string) {
  const [state, setState] = useState<ScreenState>({
    room: null, players: [], gameState: null, currentQuestion: null,
    allQuestions: [],
    questionProgress: { created: 0, total: 0 }, creatingCompletedAuthorIds: [],
    currentAnswers: [], currentPrediction: null, revealDataQuestionId: null,
    reactions: [], error: '',
  });

  useEffect(() => {
    if (!requestedDeviceId) return;
    const handover = () => { handoverMasterFromScreenDevice(roomId, requestedDeviceId).catch(console.error); };
    window.addEventListener('pagehide', handover);
    return () => { window.removeEventListener('pagehide', handover); handover(); };
  }, [roomId, requestedDeviceId]);

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomId, (room) => {
      if (!room) setState(prev => ({ ...prev, room: null, error: 'ルームが見つかりません' }));
      else setState(prev => ({ ...prev, room, error: '' }));
    });
    const unsubPlayers = subscribeToPlayers(roomId, (players) => setState(prev => ({ ...prev, players })));
    const unsubReactions = subscribeToRoomReactions(roomId, (reactions) => setState(prev => ({ ...prev, reactions })));
    return () => { unsubRoom(); unsubPlayers(); unsubReactions(); };
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    const loadPhaseData = async () => {
      if (!state.room) return;

      // プレイ中または作成中になったら全問題を一度だけ取得
      let currentAllQuestions = state.allQuestions;
      if ((state.room.status === 'playing' || state.room.status === 'creating') && currentAllQuestions.length === 0) {
        currentAllQuestions = await getQuestions(roomId);
        if (!cancelled) {
          setState(prev => ({ ...prev, allQuestions: currentAllQuestions }));
          // 画像をプリロード
          const urls = currentAllQuestions.map(q => q.imageUrl).filter((url): url is string => !!url);
          preloadImages(urls);
        }
      }

      if (state.room.status === 'creating') {
        const progress = await getQuestionProgress(roomId);
        if (!cancelled) setState(prev => ({ ...prev, questionProgress: progress, creatingCompletedAuthorIds: currentAllQuestions.map(q => q.authorId) }));
      }
      if (state.room.status === 'playing') {
        const gameState = await getGameState(roomId);
        if (!gameState) {
          if (!cancelled) setState(prev => ({ ...prev, gameState: null, currentQuestion: null }));
          return;
        }
        const qId = gameState.questionOrder?.[gameState.currentQuestionIndex];
        const q = qId ? currentAllQuestions.find(it => it.questionId === qId) ?? null : null;
        if (!cancelled) setState(prev => ({ ...prev, gameState, currentQuestion: q }));
        if (gameState.phase === 'revealing' && q) {
          const [answers, pred] = await Promise.all([getAnswers(roomId, q.questionId), getPrediction(roomId, q.questionId)]);
          if (!cancelled) setState(prev => ({ ...prev, currentAnswers: answers, currentPrediction: pred, revealDataQuestionId: q.questionId }));
        } else if (!cancelled) {
          setState(prev => ({ ...prev, currentAnswers: [], currentPrediction: null, revealDataQuestionId: null }));
        }
      }
    };
    const interval = setInterval(loadPhaseData, 1500);
    loadPhaseData();
    return () => { cancelled = true; clearInterval(interval); };
  }, [roomId, state.room, state.allQuestions.length]);

  return state;
}
