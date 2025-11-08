// app/room/[roomId]/components/WaitingPhase.tsx
'use client';

import { QRCodeSVG } from 'qrcode.react';
import { updateRoomStatus } from '@/lib/services/roomService';
import type { Player } from '@/types';

interface WaitingPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  isMaster: boolean;
}

export function WaitingPhase({ roomId, players, currentPlayerId, isMaster }: WaitingPhaseProps) {
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join-room?roomId=${roomId}`
    : '';

  const handleStartGame = async () => {
    try {
      await updateRoomStatus(roomId, 'creating');
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('ゲーム開始に失敗しました');
    }
  };

  const handleCopyUrl = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl)
        .then(() => alert('URLをコピーしました！'))
        .catch((error) => {
          console.error('Failed to copy:', error);
          alert('URLのコピーに失敗しました');
        });
    } else {
      alert(`参加URL: ${joinUrl}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">プレイヤー待機中</h2>

      {/* プレイヤー一覧 */}
      <div className="text-gray-600 text-center">
        プレイヤー一覧
        <ul className="mt-4 space-y-2">
          {players.map((player) => (
            <li
              key={player.playerId}
              className={`flex items-center justify-center space-x-4 p-2 border rounded-lg ${
                player.playerId === currentPlayerId
                  ? 'bg-blue-50 border-blue-400'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <span className="font-bold text-gray-800">{player.nickname}</span>
              {player.isMaster && <span className="text-sm text-gray-500">(ホスト)</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* QRコード表示 */}
      <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800">ルームに参加</h3>
        <p className="text-sm text-gray-600">このQRコードをスキャンして参加</p>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <QRCodeSVG value={joinUrl} size={200} level="H" includeMargin={true} />
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">ルームID</p>
          <p className="text-3xl font-mono font-bold text-blue-600">{roomId}</p>
        </div>

        <button
          onClick={handleCopyUrl}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          URLをコピー
        </button>
      </div>

      {/* ゲーム開始ボタン（ホストのみ） */}
      {isMaster && (
        <button
          disabled={players.length < 2}
          onClick={handleStartGame}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-xl"
        >
          ゲーム開始
        </button>
      )}
    </div>
  );
}
