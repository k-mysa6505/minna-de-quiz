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
}

export function FinalResultPhase({ roomId, players, currentPlayerId }: FinalResultPhaseProps) {
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

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">総合結果</h2>

      {/* プレイヤー一覧 */}
      <PlayerListCard
        players={players}
        currentPlayerId={currentPlayerId}
        sortMode="scoreDesc"
        showScores
        highlightTopScore
      />

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
