'use client';

import { PhaseHeader } from '../../components/PhaseHeader';
import type { Player } from '@/types';

interface CreatingScreenProps {
  players: Player[];
  questionProgress: { created: number; total: number };
  creatingCompletedAuthorIds: string[];
}

export function CreatingScreen({ players, questionProgress, creatingCompletedAuthorIds }: CreatingScreenProps) {
  const visibleCreatingPlayers = players.slice(0, 12);
  const hiddenCreatingPlayersCount = Math.max(0, players.length - visibleCreatingPlayers.length);

  return (
    <section className="h-full p-4 md:p-6 flex flex-col overflow-hidden">
      <PhaseHeader title="問題をつくりましょう" isScreen={true} />
      <p className="py-2 text-4xl shrink-0 mt-4 mb-6">
        完了プレイヤー： 
        <span className="text-4xl font-black mt-4 mb-6 text-emerald-400">{questionProgress.created}/{questionProgress.total}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* gapを3から4へ微増 */}
        {visibleCreatingPlayers.map((player) => {
          const isCompleted = creatingCompletedAuthorIds.includes(player.playerId);
          return (
            <div
              key={player.playerId}
              className={`
                rounded-xl border transition-all duration-300
                ${isCompleted
                  ? 'border-emerald-500/50 bg-slate-800/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'border-slate-700/80 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/80'
                }
                p-5 flex items-center justify-between
              `}
            >
              <p className="text-lg font-bold text-white truncate pr-4 tracking-tight">
                {player.nickname}
              </p>
              <span
                className={`
                  px-3 py-1 text-xs font-bold rounded-full border tabular-nums tracking-wider uppercase
                  ${isCompleted
                    ? 'text-emerald-300 border-emerald-500/60 bg-emerald-950/30'
                    : 'text-amber-300 border-amber-500/60 bg-amber-950/30 animate-pulse'
                  }
                `}
              >
                {isCompleted ? '完了' : '作問中...'}
              </span>
            </div>
          );
        })}
      </div>
      {hiddenCreatingPlayersCount > 0 && <p className="mt-3 text-sm text-slate-300">他 {hiddenCreatingPlayersCount} 人</p>}
    </section>
  );
}
