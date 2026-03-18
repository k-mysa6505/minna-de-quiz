'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateRoomStatus } from '@/lib/services/room/roomService';
import { leaveRoomFlow } from '@/lib/services/room/roomFlowService';
import { runServiceAction } from '@/lib/services/core/serviceAction';
import type { Player, Room } from '@/types';
import { Modal } from "@/app/common/Modal";
import { InviteModal } from '../modals/InviteModal';
import { LeaveRoomModal } from '../modals/LeaveRoomModal';
import { PlayerListCard } from '../components/PlayerListCard';
import { ReactionOverlay } from '../components/ReactionOverlay';
import { ReactionTrigger } from '../components/ReactionTrigger';
import { useReactions } from '../hooks/useReactions';
import { useRoomOptions } from '../hooks/useRoomOptions';

interface WaitingPhaseProps {
  roomId: string;
  room: Room;
  players: Player[];
  currentPlayerId: string;
  isMaster: boolean;
}

const WAITING_QUICK_MESSAGES = ['よろしく！', '楽しみ！', '準備OK', 'はやく！'];

export function WaitingPhase({ roomId, room, players, currentPlayerId, isMaster }: WaitingPhaseProps) {
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isCopyingScreenUrl, setIsCopyingScreenUrl] = useState(false);

  const currentPlayer = players.find((p) => p.playerId === currentPlayerId);
  
  const {
    reactionEffects,
    isReactionPanelOpen,
    setIsReactionPanelOpen,
    reactionPanelRef,
    reactionToggleButtonRef,
    handleSendReaction,
  } = useReactions(roomId, currentPlayerId, currentPlayer?.nickname);

  const {
    timeLimit, setTimeLimit,
    correctAnswerPoints, setCorrectAnswerPoints,
    fastestAnswerBonusPoints, setFastestAnswerBonusPoints,
    wrongAnswerPenalty, setWrongAnswerPenalty,
    predictionHitBonusPoints, setPredictionHitBonusPoints,
    isSavingOptions,
    handleSaveOptions,
  } = useRoomOptions(roomId, room);

  const screenUrl = useMemo(() => {
    if (!room.useScreenMode || !room.displayDeviceId || typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${roomId}/screen?deviceId=${room.displayDeviceId}`;
  }, [room.displayDeviceId, room.useScreenMode, roomId]);

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
      { fallback: false, onError: () => alert('退室処理に失敗しました。') }
    );
    if (success) router.push('/');
    setIsLeaving(false);
  };

  const handleCopyScreenUrl = async () => {
    if (!screenUrl) return;
    try {
      await navigator.clipboard.writeText(screenUrl);
      setIsCopyingScreenUrl(true);
      setTimeout(() => setIsCopyingScreenUrl(false), 2000);
    } catch (error) {
      console.error('Failed to copy screen URL:', error);
    }
  };

  const isScreenModePlayerView = room.useScreenMode === true;

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">プレイヤー待機中</h2>
          <div className="flex gap-2">
            {isMaster && (
              <button onClick={() => setShowOptionsModal(true)} className="bg-gradient-to-b from-slate-600 to-slate-800 text-slate-100 font-semibold px-3 py-1 rounded-md">
                オプション
              </button>
            )}
            <button onClick={() => setShowInviteModal(true)} className="bg-gradient-to-b from-blue-500 to-blue-700 text-slate-200 font-semibold px-3 py-1 rounded-md">招待</button>
            <button onClick={() => setShowLeaveModal(true)} className="bg-gradient-to-b from-red-600 to-red-800 text-slate-200 font-semibold px-3 py-1 mr-3 rounded-md">ルームを退室</button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg border border-slate-700/50 p-4 mb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm italic">ROOM ID</span>
              <code className="bg-slate-700/50 text-white px-2 py-1 rounded font-mono text-sm">{roomId}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm italic">PLAYERS</span>
              <span className="text-white font-bold">{players.length}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1 italic">DESCRIPTION</p>
            <p className="text-sm text-slate-200">{room.description || 'なし'}</p>
          </div>
          <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-3">
            {[
              { label: 'TIME LIMIT', value: (room.timeLimit ?? 30) === 0 ? 'なし' : `${room.timeLimit ?? 30}s` },
              { label: 'CORRECT', value: `+${room.correctAnswerPoints ?? 10}pt` },
              { label: 'FASTEST', value: `+${room.fastestAnswerBonusPoints ?? 10}pt` },
              { label: 'PENALTY', value: `-${room.wrongAnswerPenalty ?? 0}pt`, color: room.wrongAnswerPenalty !== 0 ? 'text-red-400' : 'text-slate-400' },
              { label: 'PREDICT HIT', value: `+${room.predictionHitBonusPoints ?? 50}pt` },
              { label: 'SCREEN', value: room.useScreenMode ? '有効' : '無効', color: room.useScreenMode ? 'text-emerald-400' : 'text-slate-400' },
            ].map(opt => (
              <div key={opt.label} className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 italic">{opt.label}</span>
                <span className={`text-xs font-semibold ${opt.color || 'text-white'}`}>{opt.value}</span>
              </div>
            ))}
          </div>
          {room.useScreenMode && room.displayDeviceId && isMaster && (
            <div className="pt-3 border-t border-slate-700/50 space-y-2">
              <p className="text-xs text-slate-400 italic">DISPLAY LINK</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input type="text" readOnly value={screenUrl} className="flex-1 bg-slate-900/60 text-slate-200 px-3 py-2 rounded border border-slate-600 text-xs" />
                <button type="button" onClick={handleCopyScreenUrl} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded transition-all">
                  {isCopyingScreenUrl ? 'コピー済み' : 'リンクをコピー'}
                </button>
              </div>
            </div>
          )}
        </div>

        {!isScreenModePlayerView && (
          <>
            <PlayerListCard players={players} currentPlayerId={currentPlayerId} sortMode="joinedAt" showMasterBadge />
            {isMaster && (
              <button disabled={players.length < 2} onClick={handleStartGame} className="block mx-auto bg-gradient-to-b from-emerald-700 to-emerald-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold italic px-4 rounded-2xl shadow-2xl transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed disabled:text-slate-400">
                START
              </button>
            )}
            {!isMaster && <p className="text-center text-slate-400 italic">ホストがゲームを開始するのをお待ちください...</p>}
          </>
        )}

        {currentPlayer && (
          <ReactionTrigger
            isReactionPanelOpen={isReactionPanelOpen}
            setIsReactionPanelOpen={setIsReactionPanelOpen}
            reactionPanelRef={reactionPanelRef}
            reactionToggleButtonRef={reactionToggleButtonRef}
            handleSendReaction={handleSendReaction}
            quickMessages={WAITING_QUICK_MESSAGES}
          />
        )}

        {showInviteModal && <InviteModal roomId={roomId} onClose={() => setShowInviteModal(false)} />}
        {showLeaveModal && <LeaveRoomModal isLeaving={isLeaving} onCancel={() => setShowLeaveModal(false)} onConfirm={handleLeaveRoom} />}
        {showOptionsModal && isMaster && (
          <Modal onClose={() => !isSavingOptions && setShowOptionsModal(false)} panelClassName="max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">オプション設定</h3>
            <div className="space-y-5">
              {[
                { label: '制限時間', value: timeLimit, setter: setTimeLimit, options: [10, 20, 30, 40, 50, 60, 90, 120, 0], suffix: 's', zeroLabel: 'なし' },
                { label: '正解ポイント', value: correctAnswerPoints, setter: setCorrectAnswerPoints, options: [10, 20, 30, 40, 50], suffix: 'pt' },
                { label: '早押し1位ボーナス', value: fastestAnswerBonusPoints, setter: setFastestAnswerBonusPoints, options: [10, 20, 30, 40, 50], suffix: 'pt' },
                { label: '誤答ペナルティ', value: wrongAnswerPenalty, setter: setWrongAnswerPenalty, options: [0, 5, 10, 15, 20], suffix: 'pt', prefix: '-' },
                { label: '予想チャレンジ的中', value: predictionHitBonusPoints, setter: setPredictionHitBonusPoints, options: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], suffix: 'pt' },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{field.label}</label>
                  <select value={field.value} onChange={(e) => field.setter(parseInt(e.target.value, 10))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm">
                    {field.options.map(opt => <option key={opt} value={opt}>{opt === 0 && field.zeroLabel ? field.zeroLabel : `${field.prefix || ''}${opt}${field.suffix}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowOptionsModal(false)} disabled={isSavingOptions} className="flex-1 bg-slate-700 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg">キャンセル</button>
              <button onClick={() => handleSaveOptions(() => setShowOptionsModal(false))} disabled={isSavingOptions} className="flex-1 bg-blue-600 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg">
                {isSavingOptions ? '保存中...' : '保存'}
              </button>
            </div>
          </Modal>
        )}
      </div>
      <ReactionOverlay effects={reactionEffects} />
    </>
  );
}

