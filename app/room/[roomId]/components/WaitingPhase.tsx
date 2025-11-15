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
      <h2 className="text-2xl font-bold text-white tracking-tight">プレイヤー待機中</h2>

      {/* プレイヤー一覧 */}
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 pb-4 rounded-2xl border border-slate-700/50">
        <div className="font-bold text-slate-400 pt-3 px-8 italic">
          PLAYER
        </div>
        <ul className="space-y-1">
          {players.map((player, idx) => (
            <li
              key={player.playerId}
              className={`flex items-center justify-between px-3 py-1 rounded- transition-all ${
                player.playerId === currentPlayerId
                  ? 'bg-gradient-to-b from-blue-800/90 to-blue-500/10'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">
                  {idx + 1}．
                  <span className="italic">{player.nickname}</span>
                </span>
                {player.isMaster && (
                  <span className="text-xs text-slate-400 bg-slate-600 px-1 rounded">
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
          className="block mx-auto bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold italic px-2 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed disabled:text-slate-400"
        >
          START
        </button>
      )}
    </div>
  );
}
