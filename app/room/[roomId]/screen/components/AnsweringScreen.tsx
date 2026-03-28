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

  if (!currentQuestion) {
    return <LoadingSpinner message="問題を読み込み中..." />;
  }

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
          <div
            key={index}
            className="rounded-xl border border-slate-600 bg-slate-800/70 p-3 md:p-4 min-h-24 text-base md:text-xl font-semibold flex items-center text-white"
          >
            <span className={`mr-3 inline-flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-full text-lg md:text-2xl font-black text-white ${SCREEN_CHOICE_COLORS[index].badgeBg}`}>{index + 1}</span>
            <span className="max-h-[3rem] md:max-h-[3.4rem] overflow-hidden">{choice}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
