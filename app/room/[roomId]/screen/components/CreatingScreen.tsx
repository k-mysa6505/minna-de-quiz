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
      <p className="py-2 text-base md:text-lg shrink-0">
        <span className="text-xl mt-4">完了プレイヤー： </span>
        <span className="text-4xl font-black mt-4 mb-6 text-emerald-400">{questionProgress.created}/{questionProgress.total}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleCreatingPlayers.map((player) => {
          const isCompleted = creatingCompletedAuthorIds.includes(player.playerId);
          return (
            <div key={player.playerId} className="rounded-xl border border-slate-700 bg-slate-800/75 p-4 flex items-center justify-between">
              <p className="font-semibold text-white truncate pr-3">{player.nickname}</p>
              <span className={`text-sm font-semibold ${isCompleted ? 'text-emerald-300' : 'text-amber-300'}`}>{isCompleted ? '完了' : '作問中...'}</span>
            </div>
          );
        })}
      </div>
      {hiddenCreatingPlayersCount > 0 && <p className="mt-3 text-sm text-slate-300">他 {hiddenCreatingPlayersCount} 人</p>}
    </section>
  );
}
