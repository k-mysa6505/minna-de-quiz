// app/room/[roomId]/components/FinalResultPhase.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRoom, removePlayerFromRoom } from '@/lib/services/roomService';
import { updatePlayerOnlineStatus } from '@/lib/services/playerService';
import type { Player } from '@/types';

interface FinalResultPhaseProps {
  roomId: string;
  players: Player[];
}

export function FinalResultPhase({ roomId, players }: FinalResultPhaseProps) {
  const router = useRouter();
  const [hasLeft, setHasLeft] = useState(false);
  const [displayPlayers] = useState<Player[]>(players);

  // プレイヤー数を監視し、0になったらルームを削除
  useEffect(() => {
    if (players.length === 0) {
      console.log('No players left. Deleting room...');
      deleteRoom(roomId).catch(console.error);
    }
  }, [players.length, roomId]);

  // コンポーネントアンマウント時の処理
  useEffect(() => {
    return () => {
      if (!hasLeft) {
        const currentPlayerId = localStorage.getItem('currentPlayerId');
        if (currentPlayerId) {
          updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
        }
      }
    };
  }, [roomId, hasLeft]);

  const handleLeaveRoom = async () => {
    try {
      const currentPlayerId = localStorage.getItem('currentPlayerId');
      if (!currentPlayerId) {
        router.push('/');
        return;
      }

      console.log(`Player ${currentPlayerId} leaving room`);
      setHasLeft(true);

      await updatePlayerOnlineStatus(roomId, currentPlayerId, false);
      const remainingPlayers = await removePlayerFromRoom(roomId, currentPlayerId);

      localStorage.removeItem('currentPlayerId');
      localStorage.removeItem('currentRoomId');

      if (remainingPlayers === 0) {
        console.log('Last player leaving. Deleting room...');
        await deleteRoom(roomId);
      }

      router.push('/');
    } catch (error) {
      console.error('Failed to leave room:', error);
      localStorage.removeItem('currentPlayerId');
      localStorage.removeItem('currentRoomId');
      router.push('/');
    }
  };

  const playersToShow = displayPlayers.length > 0 ? displayPlayers : players;
  const sortedPlayers = [...playersToShow].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-center text-white tracking-tight mb-8">
        最終結果
      </h2>

      {/* 最終順位 */}
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
        <div className="space-y-4">
          {sortedPlayers.map((player, index) => {
            // 1位の背景を強調
            const isWinner = index === 0;
            const bgColor = isWinner 
              ? 'bg-gradient-to-r from-yellow-600/30 to-yellow-700/30 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
              : 'bg-slate-700/40 border border-slate-600/50';

            return (
              <div
                key={player.playerId}
                className={`flex items-center justify-between px-6 py-5 rounded ${bgColor} transition-all`}
              >
                <div className="flex items-center space-x-6">
                  <span className={`text-2xl font-bold w-10 ${isWinner ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {index === 0 ? '🏆' : `${index + 1}.`}
                  </span>
                  <span className={`text-xl font-semibold ${isWinner ? 'text-white' : 'text-slate-200'}`}>
                    {player.nickname}
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                    {player.score.toLocaleString()}
                    <span className="text-sm ml-1">pt</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ホームに戻るボタン */}
      <button
        onClick={handleLeaveRoom}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-5 px-6 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105"
      >
        ホームに戻る
      </button>
    </div>
  );
}
