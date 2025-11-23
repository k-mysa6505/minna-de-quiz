// app/room/[roomId]/components/WaitingPhase.tsx
'use client';

import { useState } from 'react';
import { updateRoomStatus } from '@/lib/services/roomService';
import type { Player } from '@/types';

interface WaitingPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  isMaster: boolean;
}

export function WaitingPhase({ roomId, players, currentPlayerId, isMaster }: WaitingPhaseProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join-room?roomId=${roomId}`
    : '';

  const handleStartGame = async () => {
    try {
      await updateRoomStatus(roomId, 'creating');
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* タイトルと招待ボタン */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">プレイヤー待機中</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-gradient-to-b from-blue-500 to-blue-700 text-slate-200 font-semibold px-3 py-1 mr-3 rounded-md"
        >
          招待
        </button>
      </div>

      {/* プレイヤー一覧 */}
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 pb-4 rounded border border-slate-700/50">
        <div className="font-bold text-slate-400 pt-3 px-8 italic">
          PLAYER
        </div>
        <ul className="space-y-1">
          {(() => {
            const sortedPlayers = [...players].sort((a, b) => {
              const getTime = (t: unknown): number => {
                if (t == null) return 0;
                if (typeof t === 'number') return t;
                if (typeof t === 'string') return new Date(t).getTime();
                const maybeTimestamp = t as { toDate?: () => Date };
                if (typeof maybeTimestamp.toDate === 'function') return maybeTimestamp.toDate!().getTime();
                if (t instanceof Date) return t.getTime();
                return 0;
              };

              return getTime(a.joinedAt) - getTime(b.joinedAt);
            });

            return sortedPlayers.map((player, idx) => (
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
                  <span className="italic">{player.nickname}</span>
                </span>
                {player.isMaster && (
                  <span className="text-xs text-slate-400 bg-slate-600 px-1 rounded">
                    ホスト
                  </span>
                )}
              </div>
            </li>
            ));
          })()}
        </ul>
      </div>

      {/* ゲーム開始ボタン（ホストのみ） */}
      {isMaster && (
        <button
          disabled={players.length < 2}
          onClick={handleStartGame}
          className="block mx-auto bg-gradient-to-b from-emerald-700 to-emerald-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold italic px-4 rounded-2xl shadow-2xl transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed disabled:text-slate-400"
        >
          START
        </button>
      )}

      {/* ホスト以外向けのメッセージ */}
      {!isMaster && (
        <p className="text-center text-slate-400 italic">
          ホストがゲームを開始するのをお待ちください...
        </p>
      )}

      {/* 招待モーダル */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl text-center font-bold text-white mb-4">友達を招待</h3>

            {/* QRコード */}
            <div className="bg-slate-700/30 rounded-lg p-4 mb-4 text-center">
              <p className="text-xs text-slate-400 mb-2">QRコード</p>
              <div className="bg-white p-4 rounded inline-block">
                <p className="text-slate-800 text-xs">QRコード表示予定</p>
              </div>
            </div>

            {/* ルームID表示 */}
            <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-slate-400 mb-2">ルームID</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900/50 text-white px-3 py-2 rounded font-mono text-sm">
                  {roomId}
                </code>
                <button
                  onClick={handleCopyRoomId}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded transition-all"
                >
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>

            {/* 共有リンク */}
            <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-slate-400 mb-2">共有リンク</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-slate-900/50 text-white px-3 py-2 rounded text-xs border border-slate-600"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded transition-all"
                >
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
