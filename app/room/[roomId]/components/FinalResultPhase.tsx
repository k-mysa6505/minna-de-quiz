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
    <div className="space-y-6">
      {/* 最終順位 */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-wider">FINAL RESULTS</h3>
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => {
            // 1位の背景を強調
            const bgColor = index === 0 ? 'bg-indigo-900/50' : 'bg-gray-800/50';

            return (
              <div
                key={player.playerId}
                className={`flex items-center justify-between px-4 py-3 rounded ${bgColor} border-b border-gray-700/50`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-bold text-gray-400 w-8">{index + 1}.</span>
                  <span className="text-lg font-medium text-white">{player.nickname}</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{player.score.toLocaleString()}pt</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ホームに戻るボタン */}
      <button
        onClick={handleLeaveRoom}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
      >
        ホームに戻る
      </button>
    </div>
  );
}
