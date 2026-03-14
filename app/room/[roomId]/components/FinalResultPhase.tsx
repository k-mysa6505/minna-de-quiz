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
      <h2 className="text-2xl font-bold text-white tracking-tight">総合結果</h2>

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
      <div className="space-y-4">
        {/* もう一度遊ぶボタン */}
        <button
          onClick={handlePlayAgain}
          disabled={isResetting || hasLeft}
          className={`
            w-full font-bold py-4 px-6 rounded-2xl shadow-2xl transition-all duration-300 transform
            ${isResetting || hasLeft
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-105'
            }
          `}
        >
          {isResetting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
              <span>リセット中...</span>
            </div>
          ) : (
            'もう一度遊ぶ'
          )}
        </button>

        {/* ホームに戻るボタン */}
        <button
          onClick={handleLeaveRoom}
          disabled={isResetting}
          className={`
            block mx-auto font-bold italic px-6 py-3 rounded-2xl shadow-2xl transition-all duration-300 transform
            ${isResetting
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-b from-emerald-700 to-emerald-800 text-white hover:scale-105'
            }
          `}
        >
          HOME
        </button>
      </div>
    </div>
  );
}
