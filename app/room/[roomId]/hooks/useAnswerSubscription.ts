'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Answer, Prediction, Question } from '@/types';

export function useAnswerSubscription(roomId: string, currentQuestion: Question | null, currentPlayerId: string) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [hasSubmittedPrediction, setHasSubmittedPrediction] = useState(false);
  const [currentAnswerCount, setCurrentAnswerCount] = useState(0);

  useEffect(() => {
    if (!currentQuestion || !auth.currentUser) return;
    const qId = currentQuestion.questionId;
    const unsubAnswers = onSnapshot(query(collection(db, 'rooms', roomId, 'answers'), where('questionId', '==', qId)), (snap) => {
      const data = snap.docs.map(d => d.data() as Answer);
      setAnswers(data);
      setHasSubmittedAnswer(data.some(a => a.playerId === currentPlayerId));
    });
    const unsubPred = onSnapshot(query(collection(db, 'rooms', roomId, 'predictions'), where('questionId', '==', qId)), (snap) => {
      const p = snap.empty ? null : (snap.docs[0].data() as Prediction);
      setPrediction(p);
      setHasSubmittedPrediction(!snap.empty);
    });
    return () => { unsubAnswers(); unsubPred(); };
  }, [roomId, currentQuestion, currentPlayerId]);

  useEffect(() => {
    setCurrentAnswerCount(answers.length + (prediction ? 1 : 0));
  }, [answers, prediction]);

  return { answers, prediction, hasSubmittedAnswer, hasSubmittedPrediction, currentAnswerCount };
}
