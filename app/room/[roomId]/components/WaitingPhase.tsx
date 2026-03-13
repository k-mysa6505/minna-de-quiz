// app/room/[roomId]/components/WaitingPhase.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateRoomStatus } from '@/lib/services/roomService';
import { leaveRoomFlow } from '@/lib/services/roomFlowService';
import { runServiceAction } from '@/lib/services/serviceAction';
import type { Player, Room } from '@/types';
import { InviteModal } from '@/app/room/[roomId]/components/InviteModal';
import { LeaveRoomModal } from '@/app/room/[roomId]/components/LeaveRoomModal';
import { PlayerListCard } from './PlayerListCard';

interface WaitingPhaseProps {
  roomId: string;
  room: Room;
  players: Player[];
  currentPlayerId: string;
  isMaster: boolean;
}

export function WaitingPhase({ roomId, room, players, currentPlayerId, isMaster }: WaitingPhaseProps) {
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleStartGame = async () => {
    await runServiceAction('waiting.startGame', () => updateRoomStatus(roomId, 'creating'));
  };

  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    const success = await runServiceAction(
      'waiting.leaveRoom',
      async () => {
        await leaveRoomFlow(roomId, currentPlayerId);
        return true;
      },
      {
        fallback: false,
        onError: () => alert('退室処理に失敗しました。'),
      }
    );
    if (success) {
      router.push('/');
    }
    setIsLeaving(false);
  };

  return (
    <div className="space-y-8">
      {/* タイトルとボタン群 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">プレイヤー待機中</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-gradient-to-b from-blue-500 to-blue-700 text-slate-200 font-semibold px-3 py-1 rounded-md"
          >
            招待
          </button>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="bg-gradient-to-b from-red-600 to-red-800 text-slate-200 font-semibold px-3 py-1 mr-3 rounded-md"
          >
            ルームを退室
          </button>
        </div>
      </div>

      {/* ルーム情報 */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg border border-slate-700/50 p-4 mb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm italic">ROOM ID</span>
            <code className="bg-slate-700/50 text-white px-2 py-1 rounded font-mono text-sm">
              {roomId}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm italic">PLAYERS</span>
            <span className="text-white font-bold">{players.length}</span>
          </div>
        </div>

        {/* ルームの説明 */}
        <div className="pt-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1 italic">DESCRIPTION</p>
          <p className="text-sm text-slate-200">{room.description || 'なし'}</p>
        </div>

        {/* その他のオプション */}
        <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">TIME LIMIT</span>
            <span className="text-xs text-white font-semibold">{room.timeLimit ? `${room.timeLimit}s` : 'なし'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">SCORING</span>
            <span className="text-xs text-white font-semibold">
              {room.scoringMode === 'standard' ? '標準' :
                room.scoringMode === 'firstBonus' ? '1位ボーナス' : '正解率ボーナス'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">PENALTY</span>
            <span className={`text-xs font-semibold ${room.wrongAnswerPenalty !== 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {room.wrongAnswerPenalty !== 0 ? `${room.wrongAnswerPenalty}pt` : 'なし'}
            </span>
          </div>
        </div>
      </div>

      {/* プレイヤー一覧 */}
      <PlayerListCard
        players={players}
        currentPlayerId={currentPlayerId}
        sortMode="joinedAt"
        showMasterBadge
      />

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
        <InviteModal
          roomId={roomId}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* 退室モーダル */}
      {showLeaveModal && (
        <LeaveRoomModal
          isLeaving={isLeaving}
          onCancel={() => setShowLeaveModal(false)}
          onConfirm={handleLeaveRoom}
        />
      )}
    </div>
  );
}
