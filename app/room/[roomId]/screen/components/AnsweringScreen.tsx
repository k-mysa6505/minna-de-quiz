'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '@/app/common/LoadingSpinner';
import ImageModal from '@/app/common/ImageModal';
import { GameProgressHeader } from '@/app/room/[roomId]/components/GameProgressHeader';
import type { GameState, Question } from '@/types';
import { submitAnswer as submitAnswerApi, submitPrediction as submitPredictionApi } from '@/lib/services/game/gameService';

interface AnsweringScreenProps {
  gameState: GameState;
  currentQuestion: Question | null;
  remainingSeconds: number;
  currentAuthorName: string;
  timeLimit: number;
}

const SCREEN_CHOICE_COLORS = [
  { badgeBg: 'bg-blue-600' }, { badgeBg: 'bg-red-600' },
  { badgeBg: 'bg-green-600' }, { badgeBg: 'bg-yellow-600' },
];

export default function AnsweringScreen({ gameState, currentQuestion, remainingSeconds, currentAuthorName, timeLimit }: AnsweringScreenProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [predictedCount, setPredictedCount] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submittingRef = useRef(false);

  // 回答送信API
  // プレイヤーID・ルームID取得
  const roomId = typeof window !== 'undefined' ? sessionStorage.getItem('currentRoomId') || localStorage.getItem('currentRoomId') || '' : '';
  const playerId = typeof window !== 'undefined' ? sessionStorage.getItem('currentPlayerId') || localStorage.getItem('currentPlayerId') || '' : '';
  console.log('[AnsweringScreen] roomId:', roomId, 'playerId:', playerId, 'currentQuestion:', currentQuestion);

  async function submitAnswer() {
    console.log('[submitAnswer] called', { roomId, playerId, currentQuestion, selectedAnswer });
    if (!currentQuestion || selectedAnswer === null || !roomId || !playerId) {
      console.log('[submitAnswer] missing required values', { roomId, playerId, currentQuestion, selectedAnswer });
      return;
    }
    try {
      await submitAnswerApi(
        roomId,
        currentQuestion.questionId,
        playerId,
        selectedAnswer,
        false // isCorrect: クライアント送信時はfalse固定
      );
      console.log('[submitAnswer] success');
    } catch (e) {
      console.error('[submitAnswer] error', e);
    }
    setHasSubmitted(true);
    submittingRef.current = true;
  }

  async function submitPrediction() {
    console.log('[submitPrediction] called', { roomId, playerId, currentQuestion, predictedCount });
    if (!currentQuestion || predictedCount === null || !roomId || !playerId) {
      console.log('[submitPrediction] missing required values', { roomId, playerId, currentQuestion, predictedCount });
      return;
    }
    try {
      await submitPredictionApi(
        roomId,
        currentQuestion.questionId,
        playerId,
        predictedCount
      );
      console.log('[submitPrediction] success');
    } catch (e) {
      console.error('[submitPrediction] error', e);
    }
    setHasSubmitted(true);
    submittingRef.current = true;
  }

  // フェーズがanswering以外になったら強制送信
  useEffect(() => {
    console.log('[useEffect] phase:', gameState.phase, 'hasSubmitted:', hasSubmitted, 'submittingRef:', submittingRef.current, 'currentQuestion:', currentQuestion);
    if (
      gameState.phase !== 'answering' &&
      !hasSubmitted &&
      !submittingRef.current
    ) {
      if (!currentQuestion) {
        console.log('[useEffect] currentQuestion is null, skipping submit');
        return;
      }
      (async () => {
        if (selectedAnswer !== null) {
          console.log('[useEffect] auto submitAnswer');
          await submitAnswer();
        } else if (predictedCount !== null) {
          console.log('[useEffect] auto submitPrediction');
          await submitPrediction();
        } else {
          console.log('[useEffect] auto mark as unanswered');
          setHasSubmitted(true);
          submittingRef.current = true;
        }
      })();
    }
  }, [gameState.phase]);

  if (!currentQuestion) {
    return <LoadingSpinner message="問題を読み込み中..." />;
  }

  const isDisabled = gameState.phase !== 'answering' || hasSubmitted;

  return (
    <section className="h-full p-4 md:p-6 space-y-4 overflow-hidden">
      <GameProgressHeader
        isScreen={true}
        currentQuestionIndex={gameState.currentQuestionIndex}
        totalQuestions={gameState.totalQuestions}
        authorNickname={currentAuthorName}
        remainingSeconds={remainingSeconds}
        timeLimit={timeLimit}
        phase={gameState.phase ?? ''}
      />
      <h2 className="text-2xl md:text-3xl font-bold leading-tight max-h-[5.2rem] overflow-hidden">{currentQuestion.text}</h2>
      {currentQuestion.imageUrl && (
        <div className="rounded-xl bg-slate-800/70 p-2 cursor-zoom-in group transition-all duration-300 hover:bg-slate-700/80" onClick={() => setIsModalOpen(true)}>
          <Image src={currentQuestion.imageUrl} alt="Question" width={1400} height={900} className="w-full h-auto max-h-[32dvh] object-contain rounded-lg transition-transform duration-500 group-hover:scale-[1.01]" priority />
        </div>
      )}

      {currentQuestion.imageUrl && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={currentQuestion.imageUrl}
          alt={currentQuestion.text}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {currentQuestion.choices.map((choice: string, index: number) => (
          <button
            key={index}
            className={`rounded-xl border border-slate-600 bg-slate-800/70 p-3 md:p-4 min-h-24 text-base md:text-xl font-semibold flex items-center text-white transition-all duration-200 ${selectedAnswer === index ? 'ring-4 ring-blue-400' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700/80 cursor-pointer'}`}
            disabled={isDisabled}
            onClick={() => !isDisabled && setSelectedAnswer(index)}
          >
            <span className={`mr-3 inline-flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-full text-lg md:text-2xl font-black text-white ${SCREEN_CHOICE_COLORS[index].badgeBg}`}>{index + 1}</span>
            <span className="max-h-[3rem] md:max-h-[3.4rem] overflow-hidden">{choice}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
