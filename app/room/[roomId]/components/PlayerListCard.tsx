'use client';

import type { Player } from '@/types';

type SortMode = 'joinedAt' | 'scoreDesc';

interface PlayerListCardProps {
  players: Player[];
  currentPlayerId: string;
  sortMode: SortMode;
  showScores?: boolean;
  showMasterBadge?: boolean;
  highlightTopScore?: boolean;
  maxVisiblePlayers?: number;
}

function toTime(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime();
  if (value instanceof Date) return value.getTime();
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === 'function') {
    return maybeTimestamp.toDate().getTime();
  }
  return 0;
}

function calculateDenseRanks(players: Player[]): number[] {
  const ranks: number[] = [];
  let currentRank = 1;

  players.forEach((player, index) => {
    if (index > 0 && player.score < players[index - 1].score) {
      currentRank = index + 1;
    }
    ranks.push(currentRank);
  });

  return ranks;
}

function formatOrdinalRank(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${rank}th`;
  }

  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

export function PlayerListCard({
  players,
  currentPlayerId,
  sortMode,
  showScores = false,
  showMasterBadge = false,
  highlightTopScore = false,
  maxVisiblePlayers,
}: PlayerListCardProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (sortMode === 'scoreDesc') {
      return b.score - a.score;
    }
    return toTime(a.joinedAt) - toTime(b.joinedAt);
  });

  const visiblePlayers =
    typeof maxVisiblePlayers === 'number' ? sortedPlayers.slice(0, maxVisiblePlayers) : sortedPlayers;
  const hiddenCount = Math.max(0, sortedPlayers.length - visiblePlayers.length);

  const ranks = sortMode === 'scoreDesc' ? calculateDenseRanks(sortedPlayers) : [];
  const topScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;

  return (
    <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 pb-20 rounded border border-slate-700/50 overflow-visible">
      <div className="font-bold text-slate-400 pt-3 px-8 italic">PLAYER</div>
      <ul className="space-y-1">
        {visiblePlayers.map((player, idx) => {
          const isCurrentPlayer = player.playerId === currentPlayerId;
          const isWinner = highlightTopScore && topScore > 0 && player.score === topScore;
          const prefix = sortMode === 'scoreDesc' ? `${formatOrdinalRank(ranks[idx])} ` : `${idx + 1}．`;

          return (
            <li
              key={player.playerId}
              className={`flex items-center justify-between px-3 py-1 rounded transition-all ${isCurrentPlayer ? 'bg-gradient-to-b from-blue-800/90 to-blue-500/10' : ''
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">
                  {prefix}
                  <span className={`italic ${isWinner ? 'text-yellow-400' : ''}`}>{player.nickname}</span>
                </span>
                {showMasterBadge && player.isMaster && (
                  <span className="text-xs text-slate-400 bg-slate-600 px-1 rounded">ホスト</span>
                )}
              </div>
              {showScores && (
                <div className="text-white font-semibold">
                  {player.score.toLocaleString()}
                  <span className="text-xs ml-1">pt</span>
                </div>
              )}
            </li>
          );
        })}
        {hiddenCount > 0 && (
          <li className="px-3 py-1 text-right text-xs text-slate-300">他 {hiddenCount} 人</li>
        )}
      </ul>
    </div>
  );
}
