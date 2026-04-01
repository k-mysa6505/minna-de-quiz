'use client';

import { useState, useEffect } from 'react';
import { subscribeToRoom, handoverMasterFromScreenDevice } from '@/lib/services/room/roomService';
import { subscribeToPlayers } from '@/lib/services/auth/playerService';
import { subscribeToGameState, subscribeToAnswers, subscribeToPrediction } from '@/lib/services/game/gameService';
import { subscribeToQuestions } from '@/lib/services/game/questionService';
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
    allQuestions: [], questionProgress: { created: 0, total: 0 }, creatingCompletedAuthorIds: [],
    currentAnswers: [], currentPrediction: null, revealDataQuestionId: null,
    reactions: [], error: '',
  });

  useEffect(() => {
    if (!roomId || !requestedDeviceId) return;
    const handover = () => { handoverMasterFromScreenDevice(roomId, requestedDeviceId).catch(console.error); };
    window.addEventListener('pagehide', handover);
    return () => { window.removeEventListener('pagehide', handover); handover(); };
  }, [roomId, requestedDeviceId]);

  // 1. 基本情報（Room, Players, Reactions）の購読
  useEffect(() => {
    if (!roomId) return;
    return subscribeToRoom(roomId, (room) => setState(prev => ({ ...prev, room, error: !room ? 'ルームが見つかりません' : '' })));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    return subscribeToPlayers(roomId, (players) => setState(prev => ({ ...prev, players })));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    return subscribeToRoomReactions(roomId, (reactions) => setState(prev => ({ ...prev, reactions })));
  }, [roomId]);

  // 2. 問題リストの購読
  useEffect(() => {
    if (!roomId) return;
    return subscribeToQuestions(roomId, (questions) => {
      // 画像はバックグラウンドで事前ロードする
      const urls = questions.map(q => q.imageUrl).filter((url): url is string => !!url);
      preloadImages(urls);

      setState(prev => ({
        ...prev,
        allQuestions: questions,
        creatingCompletedAuthorIds: questions.map(q => q.authorId),
      }));
    });
  }, [roomId]);

  // 進捗状況は players と questions の変化に合わせて個別に計算
  useEffect(() => {
    setState(prev => ({
      ...prev,
      questionProgress: { created: prev.allQuestions.length, total: prev.players.length }
    }));
  }, [state.players.length, state.allQuestions.length]);

  // 3. ゲーム状態（GameState）の購読
  useEffect(() => {
    if (!roomId) return;
    return subscribeToGameState(roomId, (gameState) => {
      setState(prev => {
        const qId = gameState?.questionOrder?.[gameState?.currentQuestionIndex ?? 0];
        const currentQuestion = prev.allQuestions.find(it => it.questionId === qId) || null;
        return { ...prev, gameState, currentQuestion };
      });
    });
  }, [roomId]);

  // 4. 結果発表（Revealing）フェーズ時のみ回答と予想を購読
  const isRevealing = state.gameState?.phase === 'revealing';
  const currentQId = state.currentQuestion?.questionId;

  useEffect(() => {
    if (!roomId || !isRevealing || !currentQId) {
      setState(prev => ({ ...prev, currentAnswers: [], currentPrediction: null, revealDataQuestionId: null }));
      return;
    }

    const unsubAnswers = subscribeToAnswers(roomId, currentQId, (answers) => setState(prev => ({ ...prev, currentAnswers: answers })));
    const unsubPred = subscribeToPrediction(roomId, currentQId, (prediction) => setState(prev => ({ ...prev, currentPrediction: prediction })));
    
    setState(prev => ({ ...prev, revealDataQuestionId: currentQId }));

    return () => { unsubAnswers(); unsubPred(); };
  }, [roomId, isRevealing, currentQId]);

  return state;
}
