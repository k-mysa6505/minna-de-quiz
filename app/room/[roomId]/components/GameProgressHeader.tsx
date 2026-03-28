// app/room/[roomId]/GameProgressHeader.tsx
'use client';

import { type Player } from '@/types';
import { use } from 'react';

interface GameProgressHeaderProps {
  isScreen: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  authorNickname?: string;
  timeLimit: number;
  remainingSeconds: number;
  phase: string;
}

export function GameProgressHeader({
  isScreen,
  currentQuestionIndex,
  totalQuestions,
  authorNickname,
  remainingSeconds,
  timeLimit,
  phase,
}: GameProgressHeaderProps) {
  return (
    <div className={`
        relative flex justify-between px-3 items-center h-16 text-slate-200 font-bold
        ${isScreen ? 'text-3xl' : 'text-sm sm:text-xl'}
      `}
    >
      {/* 左側：問題番号 */}
      <p className="z-10 text-slate-200 shrink-0">
        問題 {currentQuestionIndex + 1} / {totalQuestions}
      </p>

      {/* 中央：残り秒数（1行下げる） */}
      <div className={`absolute inset-0 flex flex-col justify-center items-center pointer-events-none ${isScreen ? '' : 'pt-18'}`}>
        {phase === 'answering' && timeLimit >= 0 && (
          <span className={`
            text-5xl xl:text-7xl font-black italic tabular-nums transition-all duration-300
            ${remainingSeconds <= 5 ? 'text-red-500 scale-110' : 'text-white'}
          `}>
            {remainingSeconds}
          </span>
        )}
      </div>

      {/* 右側：作問者 */}
      <div className="z-10 flex items-center gap-3 min-w-0">
        <p className="italic text-slate-200 truncate">
          作問者: <span className="text-emerald-300">{authorNickname || 'unknown'}</span>
        </p>
      </div>
    </div>
  );
}
