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
  currentPlayerId: string;
}

export function FinalResultPhase({ roomId, players, currentPlayerId }: FinalResultPhaseProps) {
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
      <h2 className="text-2xl font-bold text-white tracking-tight">総合結果</h2>

      {/* プレイヤー一覧 */}
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 pb-4 rounded border border-slate-700/50">
        <div className="font-bold text-slate-400 pt-3 px-8 italic">
          PLAYER
        </div>
        <ul className="space-y-1">
          {sortedPlayers.map((player, idx) => {
            const isWinner = idx === 0;
            return (
              <li
                key={player.playerId}
                className={`flex items-center justify-between px-3 py-1 rounded transition-all ${
                  player.playerId === currentPlayerId
                    ? 'bg-gradient-to-b from-blue-800/90 to-blue-500/10'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">
                    {idx + 1}．
                    <span className={`italic ${isWinner ? 'text-yellow-400' : ''}`}>
                      {player.nickname}
                    </span>
                  </span>
                </div>
                <div className="text-white font-semibold">
                  {player.score.toLocaleString()}
                  <span className="text-xs ml-1">pt</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ホームに戻るボタン */}
      <button
        onClick={handleLeaveRoom}
        className="block mx-auto bg-gradient-to-b from-emerald-700 to-emerald-800 text-white font-bold italic px-4 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105"
      >
        HOME
      </button>
    </div>
  );
}
