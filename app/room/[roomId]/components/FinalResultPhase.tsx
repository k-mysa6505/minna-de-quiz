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
  const maxScore = sortedPlayers[0]?.score || 0;
  const avgScore = playersToShow.length > 0
    ? Math.round(playersToShow.reduce((sum, p) => sum + p.score, 0) / playersToShow.length)
    : 0;
  const totalScore = playersToShow.reduce((sum, p) => sum + p.score, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center">🎉 ゲーム終了 🎉</h2>

      {/* 優勝者表示 */}
      {sortedPlayers.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-6 text-center">
          <p className="text-white text-lg mb-2">優勝</p>
          <div className="flex items-center justify-center space-x-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-white"
              style={{ backgroundColor: sortedPlayers[0].color }}
            />
            <p className="text-3xl font-bold text-white">{sortedPlayers[0].nickname}</p>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{sortedPlayers[0].score} 点</p>
        </div>
      )}

      {/* 最終順位 */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-gray-700 text-center">最終結果</h3>
        {sortedPlayers.map((player, index) => {
          const borderColor = index === 0 ? 'border-yellow-400' : 
                             index === 1 ? 'border-gray-400' : 
                             index === 2 ? 'border-orange-400' : 'border-gray-300';
          const bgColor = index === 0 ? 'bg-yellow-50' : 
                         index === 1 ? 'bg-gray-100' : 
                         index === 2 ? 'bg-orange-50' : 'bg-white';

          return (
            <div
              key={player.playerId}
              className={`flex items-center justify-between p-4 rounded-lg border-2 ${bgColor} ${borderColor}`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-gray-600 w-8">{index + 1}</span>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: player.color }} />
                <span className="text-lg font-bold text-gray-800">{player.nickname}</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{player.score}</p>
                <p className="text-xs text-gray-500">点</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 統計情報 */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-3">
        <h4 className="font-bold text-gray-700 text-center">統計情報</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">参加人数</p>
            <p className="text-2xl font-bold text-gray-800">{playersToShow.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">最高得点</p>
            <p className="text-2xl font-bold text-gray-800">{maxScore}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">平均得点</p>
            <p className="text-2xl font-bold text-gray-800">{avgScore}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">総得点</p>
            <p className="text-2xl font-bold text-gray-800">{totalScore}</p>
          </div>
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
