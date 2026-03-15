// app/room/[roomId]/components/FinalResultPhase.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaveRoomFlow } from '@/lib/services/roomFlowService';
import { runServiceAction } from '@/lib/services/serviceAction';
import { setPlayerReplayRequested, updatePlayerOnlineStatus } from '@/lib/services/playerService';
import type { Player } from '@/types';
import { PlayerListCard } from './PlayerListCard';

interface FinalResultPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  useScreenMode?: boolean;
}

function calculateCompetitionRanks(players: Player[]): number[] {
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

export function FinalResultPhase({
  roomId,
  players,
  currentPlayerId,
  useScreenMode = false,
}: FinalResultPhaseProps) {
  const router = useRouter();
  const [hasLeft, setHasLeft] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasRequestedReplay, setHasRequestedReplay] = useState(false);
  const [finalRankingPlayers, setFinalRankingPlayers] = useState<Player[]>([]);

  const resolveCurrentPlayerId = () => {
    const fromSession = sessionStorage.getItem('currentPlayerId');
    if (fromSession) {
      return fromSession;
    }
    return localStorage.getItem('currentPlayerId');
  };


  // コンポーネントアンマウント時の処理
  useEffect(() => {
    return () => {
      if (!hasLeft) {
        const currentPlayerId = resolveCurrentPlayerId();
        if (currentPlayerId) {
          console.log('FinalResultPhase cleanup for player:', currentPlayerId);
          updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
        }
      }
    };
  }, [roomId, hasLeft]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (players.length === 0) {
        return;
      }

      setFinalRankingPlayers((prev) => {
        if (prev.length === 0) {
          return players;
        }

        const merged = new Map(prev.map((player) => [player.playerId, player]));
        for (const player of players) {
          merged.set(player.playerId, { ...merged.get(player.playerId), ...player });
        }
        return Array.from(merged.values());
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [players]);

  const handleLeaveRoom = async () => {
    const currentPlayerIdFromStorage = resolveCurrentPlayerId();
    if (!currentPlayerIdFromStorage) {
      sessionStorage.removeItem('currentPlayerId');
      sessionStorage.removeItem('currentRoomId');
      router.push('/');
      return;
    }

    setHasLeft(true);
    await runServiceAction('final.leaveRoom', () => leaveRoomFlow(roomId, currentPlayerIdFromStorage));

    // Keep localStorage untouched to avoid affecting other tabs on the same origin.
    sessionStorage.removeItem('currentPlayerId');
    sessionStorage.removeItem('currentRoomId');
    router.push('/');
  };

  const handlePlayAgain = async () => {
    const currentPlayerIdFromStorage = resolveCurrentPlayerId();
    if (!currentPlayerIdFromStorage) {
      return;
    }

    setIsResetting(true);
    await runServiceAction('final.playAgain', () => setPlayerReplayRequested(roomId, currentPlayerIdFromStorage), {
      onError: () => alert('リプレイ申請に失敗しました。ページをリロードしてください。'),
    });
    setIsResetting(false);
    setHasRequestedReplay(true);
  };

  const rankingSourcePlayers = finalRankingPlayers.length > 0 ? finalRankingPlayers : players;
  const sortedByScore = [...rankingSourcePlayers].sort((a, b) => b.score - a.score);
  const competitionRanks = calculateCompetitionRanks(sortedByScore);
  const myIndex = sortedByScore.findIndex((player) => player.playerId === currentPlayerId);
  const myRank = myIndex >= 0 ? competitionRanks[myIndex] : 1;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">総合ランキング</h2>

      {!useScreenMode && (
        <PlayerListCard
          players={rankingSourcePlayers}
          currentPlayerId={currentPlayerId}
          sortMode="scoreDesc"
          showScores
          highlightTopScore
        />
      )}

      {useScreenMode && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-6 text-center space-y-3">
          <p className="text-slate-300">あなたの最終順位は</p>
          <p className="text-4xl sm:text-5xl font-black text-emerald-300">{formatOrdinalRank(myRank)}</p>
          <p className="text-slate-300">でした！ 総合結果はスクリーンをご覧ください。</p>
        </div>
      )}

      {!useScreenMode && (
        <div className="flex gap-4 justify-center">
          {/* もう一度遊ぶボタン */}
          <button
            onClick={handlePlayAgain}
            disabled={isResetting || hasLeft || hasRequestedReplay}
            className="bg-emerald-700 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
            title={hasRequestedReplay ? 'リプレイ申請済み' : 'もう一度遊ぶ'}
          >
            {isResetting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
                <span>RESETTING...</span>
              </div>
            ) : (
              hasRequestedReplay ? 'REQUESTED' : 'REPLAY'
            )}
          </button>

          {/* ホームに戻るボタン */}
          <button
            onClick={handleLeaveRoom}
            disabled={isResetting}
            className="bg-slate-700/50 disabled:bg-slate-600 text-slate-200 font-bold italic px-4 rounded-xl border border-slate-600 transition-all duration-300 disabled:cursor-not-allowed"
          >
            HOME
          </button>
        </div>
      )}
    </div>
  );
}
