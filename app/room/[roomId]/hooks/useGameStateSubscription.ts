'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState, GamePhase, Question } from '@/types';

export function useGameStateSubscription(roomId: string, allQuestions: Question[], currentPlayerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isReady, setIsReady] = useState(false);
  const prevQuestionIdRef = useRef<string | null>(null);
  const allQuestionsRef = useRef<Question[]>(allQuestions);

  useEffect(() => {
    allQuestionsRef.current = allQuestions;
  }, [allQuestions]);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId, 'gameState', 'state'), (snap) => {
      if (!snap.exists()) return;
      const state = snap.data() as GameState;
      setGameState(state);

      const qId = state.questionOrder[state.currentQuestionIndex];
      const q = allQuestionsRef.current.find(it => it.questionId === qId) ?? null;

      if (qId && prevQuestionIdRef.current !== qId) {
        prevQuestionIdRef.current = qId;
        setIsReady(false);
      }

      setCurrentQuestion(q);
      setIsReady((state.playersReady ?? []).includes(currentPlayerId));
    });

    return () => unsubscribe();
  }, [roomId, currentPlayerId]);

  // allQuestions が後から読み込まれた場合に現在の問題を設定し直す
  useEffect(() => {
    if (gameState && allQuestions.length > 0) {
      const qId = gameState.questionOrder[gameState.currentQuestionIndex];
      const q = allQuestions.find(it => it.questionId === qId) ?? null;
      setCurrentQuestion(q);
    }
  }, [allQuestions, gameState]);

  return { gameState, currentQuestion, isReady, setIsReady };
}
