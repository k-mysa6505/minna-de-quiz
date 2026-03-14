// app/room/[roomId]/components/FinalResultPhase.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaveRoomFlow, resetRoomForReplayFlow } from '@/lib/services/roomFlowService';
import { runServiceAction } from '@/lib/services/serviceAction';
import { updatePlayerOnlineStatus } from '@/lib/services/playerService';
import type { Player } from '@/types';
import { PlayerListCard } from './PlayerListCard';

interface FinalResultPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  useScreenMode?: boolean;
}

export function FinalResultPhase({ roomId, players, currentPlayerId, useScreenMode = false }: FinalResultPhaseProps) {
  const router = useRouter();
  const [hasLeft, setHasLeft] = useState(false);
  const [isResetting, setIsResetting] = useState(false);


  // コンポーネントアンマウント時の処理
  useEffect(() => {
    return () => {
      if (!hasLeft) {
        const currentPlayerId = localStorage.getItem('currentPlayerId');
        if (currentPlayerId) {
          console.log('FinalResultPhase cleanup for player:', currentPlayerId);
          updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
        }
      }
    };
  }, [roomId, hasLeft]);

  const handleLeaveRoom = async () => {
    const currentPlayerIdFromStorage = localStorage.getItem('currentPlayerId');
    if (!currentPlayerIdFromStorage) {
      localStorage.clear();
      router.push('/');
      return;
    }

    setHasLeft(true);
    await runServiceAction('final.leaveRoom', () => leaveRoomFlow(roomId, currentPlayerIdFromStorage));

    localStorage.removeItem('currentPlayerId');
    localStorage.removeItem('currentRoomId');
    sessionStorage.removeItem('currentPlayerId');
    sessionStorage.removeItem('currentRoomId');
    router.push('/');
  };

  const handlePlayAgain = async () => {
    setIsResetting(true);
    await runServiceAction('final.playAgain', () => resetRoomForReplayFlow(roomId), {
      onError: () => alert('リセットに失敗しました。ページをリロードしてください。'),
    });
    setIsResetting(false);
  };

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);
  const myRank = Math.max(1, sortedByScore.findIndex((player) => player.playerId === currentPlayerId) + 1);

  const getRankSuffix = (rank: number) => {
    if (rank === 1) return '1位';
    if (rank === 2) return '2位';
    if (rank === 3) return '3位';
    return `第${rank}位`;
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">総合ランキング</h2>

      {!useScreenMode && (
        <PlayerListCard
          players={players}
          currentPlayerId={currentPlayerId}
          sortMode="scoreDesc"
          showScores
          highlightTopScore
        />
      )}

      {useScreenMode && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-6 text-center space-y-3">
          <p className="text-slate-300">あなたの最終順位は</p>
          <p className="text-4xl sm:text-5xl font-black text-emerald-300">{getRankSuffix(myRank)}</p>
          <p className="text-slate-300">でした！ 総合結果はスクリーンをご覧ください。</p>
        </div>
      )}

      {/* ボタン群 */}
      <div className="flex gap-4 justify-center">
        {/* もう一度遊ぶボタン */}
        <button
          onClick={handlePlayAgain}
          disabled={isResetting || hasLeft}
          className="bg-emerald-700 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
        >
          {isResetting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
              <span>RESETTING...</span>
            </div>
          ) : (
            'REPLAY'
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
    </div>
  );
}
