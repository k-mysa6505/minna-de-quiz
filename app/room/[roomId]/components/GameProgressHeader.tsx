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
  timeLimit,
  remainingSeconds,
  phase,
}: GameProgressHeaderProps) {
  return (
    <div className="flex justify-between px-3 items-center text-slate-200">
      <p>問題 {currentQuestionIndex + 1} / {totalQuestions}</p>
      <div className="flex items-center gap-3">
        {timeLimit > 0 && phase === 'answering' && (
          <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${remainingSeconds <= 5 ? 'bg-red-500/30 text-red-200 border border-red-400/50' : 'bg-slate-700/60 text-slate-100 border border-slate-500/50'}`}>
            {remainingSeconds}s
          </span>
        )}
        <p className="italic">
          作問者：{authorNickname || 'unknown'}
        </p>
      </div>
    </div>
  );
}
