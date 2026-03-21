// app/room/[roomId]/GameProgressHeader.tsx
'use client';

import { type Player } from '@/types';

interface GameProgressHeaderProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  authorNickname?: string;
  timeLimit: number;
  remainingSeconds: number;
  phase: string;
}

export function GameProgressHeader({
  currentQuestionIndex,
  totalQuestions,
  authorNickname,
  remainingSeconds,
  timeLimit,
  phase,
}: GameProgressHeaderProps) {
  return (
    <div className="relative flex justify-between px-3 items-center h-16 text-slate-200 font-bold">
      <p className="z-10 text-slate-200">
        問題 {currentQuestionIndex + 1} / {totalQuestions}
      </p>
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
        {phase === 'answering' && timeLimit >= 0 && (
          <span className={`
            text-5xl font-black italic tabular-nums transition-all duration-300
            ${remainingSeconds <= 5 ? 'text-red-500 scale-110' : 'text-white'}
          `}>
            {remainingSeconds}
          </span>
        )}
      </div>
      <div className="z-10 flex items-center gap-3">
        <p className="italic text-slate-200">
          作問者:  <span className="text-emerald-300">{authorNickname || 'unknown'}</span>
        </p>
      </div>
    </div>
  );
}
