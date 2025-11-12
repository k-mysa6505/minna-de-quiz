// app/room/[roomId]/components/WaitingPhase.tsx
'use client';

import { updateRoomStatus } from '@/lib/services/roomService';
import type { Player } from '@/types';

interface WaitingPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  isMaster: boolean;
}

export function WaitingPhase({ roomId, players, currentPlayerId, isMaster }: WaitingPhaseProps) {
  const handleStartGame = async () => {
    try {
      await updateRoomStatus(roomId, 'creating');
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white tracking-tight">プレイヤー待機中</h2>

      {/* プレイヤー一覧 */}
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-2xl border border-slate-700/50 p-6">
        <div className="text-lg font-semibold mb-4 text-slate-300">
          参加者 ({players.length}名)
        </div>
        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.playerId}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                player.playerId === currentPlayerId
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">{player.nickname}</span>
                {player.isMaster && (
                  <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">
                    ホスト
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ゲーム開始ボタン（ホストのみ） */}
      {isMaster && (
        <button
          disabled={players.length < 2}
          onClick={handleStartGame}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-5 px-6 rounded-2xl text-xl shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
        >
          ゲーム開始
        </button>
      )}
    </div>
  );
}
