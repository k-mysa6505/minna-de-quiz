'use client';

import Image from 'next/image';
import LoadingSpinner from '@/app/common/LoadingSpinner';
import type { GameState, Question } from '@/types';

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

export function AnsweringScreen({ gameState, currentQuestion, remainingSeconds, currentAuthorName, timeLimit }: AnsweringScreenProps) {
  if (!currentQuestion) return <LoadingSpinner message="問題を読み込み中..." />;

  return (
    <section className="h-full p-4 md:p-6 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between gap-4 text-xl md:text-2xl">
        <p className="text-slate-300">問題 {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}</p>
        <div className="flex items-center gap-3">
          {timeLimit > 0 && gameState.phase === 'answering' && (
            <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${remainingSeconds <= 5 ? 'bg-red-500/30 text-red-200 border border-red-400/50' : 'bg-slate-700/60 text-slate-100 border border-slate-500/50'}`}>
              {remainingSeconds}s
            </span>
          )}
          <p className="text-slate-300 text-right italic">作問者：<span className="font-bold text-emerald-300">{currentAuthorName}</span></p>
        </div>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold leading-tight max-h-[5.2rem] overflow-hidden">{currentQuestion.text}</h2>
      {currentQuestion.imageUrl && (
        <div className="rounded-xl bg-slate-800/70 p-2">
          <Image src={currentQuestion.imageUrl} alt="Question" width={1400} height={900} className="w-full h-auto max-h-[32dvh] object-contain rounded-lg" priority />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {currentQuestion.choices.map((choice, index) => (
          <div key={index} className="rounded-xl border border-slate-600 bg-slate-800/70 p-3 md:p-4 min-h-24 text-base md:text-xl font-semibold flex items-center text-white">
            <span className={`mr-3 inline-flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-full text-lg md:text-2xl font-black text-white ${SCREEN_CHOICE_COLORS[index].badgeBg}`}>{index + 1}</span>
            <span className="max-h-[3rem] md:max-h-[3.4rem] overflow-hidden">{choice}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
