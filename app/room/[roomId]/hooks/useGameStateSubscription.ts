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

  useEffect(() => {
    if (allQuestions.length === 0) return;
    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId, 'gameState', 'state'), (snap) => {
      if (!snap.exists()) return;
      const state = snap.data() as GameState;
      setGameState(state);
      const qId = state.questionOrder[state.currentQuestionIndex];
      const q = allQuestions.find(it => it.questionId === qId) ?? null;
      if (q && prevQuestionIdRef.current !== q.questionId) {
        prevQuestionIdRef.current = q.questionId;
        setIsReady(false);
      }
      setCurrentQuestion(q);
      setIsReady((state.playersReady ?? []).includes(currentPlayerId));
    });
    return () => unsubscribe();
  }, [roomId, allQuestions, currentPlayerId]);

  return { gameState, currentQuestion, isReady, setIsReady };
}
