'use client';

import { PhaseHeader } from '../../components/PhaseHeader';
import { formatOrdinalRank } from '../utils/screenUtils';
import { SecondaryButton } from '../../../../common/SecondaryButton';
import { PrimaryButton } from '../../../../common/PrimaryButton';
import type { Player } from '@/types';

interface FinishedScreenProps {
  visibleFinishedPlayers: Player[];
  visibleFinishedRanks: number[];
  hiddenFinishedPlayersCount: number;
  isReplaying: boolean;
  isDisbanding: boolean;
  onReplay: () => void;
  onDisband: () => void;
}

export function FinishedScreen({
  visibleFinishedPlayers, visibleFinishedRanks, hiddenFinishedPlayersCount,
  isReplaying, isDisbanding, onReplay, onDisband
}: FinishedScreenProps) {
  return (
    <section className="h-full p-4 md:p-6 overflow-hidden">
      <PhaseHeader title="総合ランキング" isScreen={true} />
      <div className="space-y-2 mt-4">
        {visibleFinishedPlayers.map((player, index) => (
          <div key={player.playerId} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2">
            <div className="flex items-center gap-3 text-lg md:text-xl">
              <span className="text-emerald-300 font-black w-12">{formatOrdinalRank(visibleFinishedRanks[index])}</span>
              <span className={`font-semibold italic ${visibleFinishedRanks[index] === 1 ? 'text-yellow-400' : ''}`}>{player.nickname}</span>
            </div>
            <span className="text-xl font-black text-white">{player.score} pt</span>
          </div>
        ))}
      </div>
      {hiddenFinishedPlayersCount > 0 && <p className="mt-3 text-sm text-slate-300">他 {hiddenFinishedPlayersCount} 人</p>}
      <div className="mt-6 flex gap-4 justify-center">
        <PrimaryButton
          onClick={onReplay}
          disabled={isReplaying || isDisbanding}
          color="emerald"
        >
          {isReplaying ? 'RESETTING...' : 'REPLAY'}
        </PrimaryButton>
        <SecondaryButton onClick={onDisband} disabled={isReplaying || isDisbanding}>
          {isDisbanding ? 'DISBANDING...' : 'DISBAND'}
        </SecondaryButton>
      </div>
    </section>
  );
}
