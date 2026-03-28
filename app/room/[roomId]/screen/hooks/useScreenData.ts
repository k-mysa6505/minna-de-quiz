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
    const unsubRoom = subscribeToRoom(roomId, (room) => setState(prev => ({ ...prev, room, error: !room ? 'ルームが見つかりません' : '' })));
    const unsubPlayers = subscribeToPlayers(roomId, (players) => setState(prev => ({ ...prev, players })));
    const unsubReactions = subscribeToRoomReactions(roomId, (reactions) => setState(prev => ({ ...prev, reactions })));
    return () => { unsubRoom(); unsubPlayers(); unsubReactions(); };
  }, [roomId]);

  // 2. 問題リストの購読と進捗の自動計算
  useEffect(() => {
    if (!roomId) return;
    return subscribeToQuestions(roomId, (questions) => {
      setState(prev => {
        // 画像はバックグラウンドで事前ロードする
        const urls = questions.map(q => q.imageUrl).filter((url): url is string => !!url);
        preloadImages(urls);

        return {
          ...prev,
          allQuestions: questions,
          creatingCompletedAuthorIds: questions.map(q => q.authorId),
          questionProgress: { created: questions.length, total: prev.players.length }
        };
      });
    });
  }, [roomId]);

  // 3. ゲーム状態（GameState）の購読
  useEffect(() => {
    if (!roomId) return;
    return subscribeToGameState(roomId, (gameState) => {
      setState(prev => {
        let currentQuestion = null;
        if (gameState && prev.allQuestions.length > 0) {
          const qId = gameState.questionOrder?.[gameState.currentQuestionIndex];
          currentQuestion = prev.allQuestions.find(it => it.questionId === qId) || null;
        }
        return { ...prev, gameState, currentQuestion };
      });
    });
  }, [roomId]);

  // 4. 結果発表（Revealing）フェーズ時のみ回答と予想を購読
  useEffect(() => {
    const isRevealing = state.gameState?.phase === 'revealing';
    const qId = state.currentQuestion?.questionId;

    if (!roomId || !isRevealing || !qId) {
      setState(prev => ({ ...prev, currentAnswers: [], currentPrediction: null, revealDataQuestionId: null }));
      return;
    }

    const unsubAnswers = subscribeToAnswers(roomId, qId, (answers) => setState(prev => ({ ...prev, currentAnswers: answers })));
    const unsubPred = subscribeToPrediction(roomId, qId, (prediction) => setState(prev => ({ ...prev, currentPrediction: prediction })));
    
    setState(prev => ({ ...prev, revealDataQuestionId: qId }));

    return () => { unsubAnswers(); unsubPred(); };
  }, [roomId, state.gameState?.phase, state.currentQuestion?.questionId]);

  return state;
}
