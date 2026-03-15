// app/room/[roomId]/components/WaitingPhase.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateRoomOptions, updateRoomStatus } from '@/lib/services/roomService';
import { leaveRoomFlow } from '@/lib/services/roomFlowService';
import { runServiceAction } from '@/lib/services/serviceAction';
import { sendRoomReaction, subscribeToRoomReactions, type RoomReaction } from '@/lib/services/reactionService';
import type { Player, Room } from '@/types';
import { Modal } from './Modal';
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

interface LocalReactionEffect {
  id: number;
  content: string;
  senderName: string;
  type: 'reaction' | 'message';
}

function ReactionTriggerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
    >
      <path d="M4 12.5L14.5 8V16.5L4 12.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14.5 10.5V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 13L8.5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.5 9.5C18.6 10.4 19.2 11.6 19.2 12.8C19.2 14 18.6 15.2 17.5 16.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.6 7.8C21.1 9.1 22 10.9 22 12.8C22 14.7 21.1 16.5 19.6 17.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const REACTION_STAMPS = ['👏', '🔥', '😆', '😱', '🤯', '🎉'];
const QUICK_MESSAGES = ['よろしく！', '楽しみ！', '準備OK', 'はやく！'];
const REACTION_EFFECT_DURATION_MS = 2700;

export function WaitingPhase({ roomId, room, players, currentPlayerId, isMaster }: WaitingPhaseProps) {
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSavingOptions, setIsSavingOptions] = useState(false);
  const [isCopyingScreenUrl, setIsCopyingScreenUrl] = useState(false);
  const [lastReactionAt, setLastReactionAt] = useState(0);
  const [reactionEffects, setReactionEffects] = useState<LocalReactionEffect[]>([]);
  const [isReactionPanelOpen, setIsReactionPanelOpen] = useState(false);
  const reactionPanelRef = useRef<HTMLDivElement | null>(null);
  const reactionToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasInitialReactionSnapshotRef = useRef(false);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());
  const [timeLimit, setTimeLimit] = useState(room.timeLimit ?? 30);
  const [correctAnswerPoints, setCorrectAnswerPoints] = useState(room.correctAnswerPoints ?? 10);
  const [fastestAnswerBonusPoints, setFastestAnswerBonusPoints] = useState(room.fastestAnswerBonusPoints ?? 10);
  const [wrongAnswerPenalty, setWrongAnswerPenalty] = useState(room.wrongAnswerPenalty ?? 0);
  const [predictionHitBonusPoints, setPredictionHitBonusPoints] = useState(room.predictionHitBonusPoints ?? 50);

  const screenUrl = useMemo(() => {
    if (!room.useScreenMode || !room.displayDeviceId || typeof window === 'undefined') {
      return '';
    }
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

  const handleCopyScreenUrl = async () => {
    if (!screenUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(screenUrl);
      setIsCopyingScreenUrl(true);
      setTimeout(() => setIsCopyingScreenUrl(false), 2000);
    } catch (error) {
      console.error('Failed to copy screen URL:', error);
    }
  };

  const currentPlayer = players.find((player) => player.playerId === currentPlayerId);
  const isScreenModePlayerView = room.useScreenMode === true;

  const showReactionEffect = (reaction: Pick<RoomReaction, 'content' | 'userName' | 'type'>, eventTimestamp = Date.now()) => {
    const effectId = eventTimestamp + Math.random();
    setReactionEffects((prev) => [
      ...prev,
      {
        id: effectId,
        content: reaction.content,
        senderName: reaction.userName,
        type: reaction.type,
      },
    ]);
    setTimeout(() => {
      setReactionEffects((prev) => prev.filter((effect) => effect.id !== effectId));
    }, REACTION_EFFECT_DURATION_MS);
  };

  useEffect(() => {
    hasInitialReactionSnapshotRef.current = false;
    seenReactionIdsRef.current = new Set();

    const unsubscribeReactions = subscribeToRoomReactions(roomId, (nextReactions) => {
      if (!hasInitialReactionSnapshotRef.current) {
        seenReactionIdsRef.current = new Set(nextReactions.map((reaction) => reaction.id));
        hasInitialReactionSnapshotRef.current = true;
        return;
      }

      const newReactions = [...nextReactions]
        .reverse()
        .filter((reaction) => !seenReactionIdsRef.current.has(reaction.id));

      for (const reaction of newReactions) {
        seenReactionIdsRef.current.add(reaction.id);
        if (reaction.userId === currentPlayerId) {
          continue;
        }
        showReactionEffect(reaction);
      }
    });

    return () => {
      unsubscribeReactions();
    };
  }, [roomId, currentPlayerId]);

  useEffect(() => {
    if (!isReactionPanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (reactionPanelRef.current?.contains(target) || reactionToggleButtonRef.current?.contains(target)) {
        return;
      }
      setIsReactionPanelOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isReactionPanelOpen]);

  useEffect(() => {
    if (!showOptionsModal) {
      return;
    }
    setTimeLimit(room.timeLimit ?? 30);
    setCorrectAnswerPoints(room.correctAnswerPoints ?? 10);
    setFastestAnswerBonusPoints(room.fastestAnswerBonusPoints ?? 10);
    setWrongAnswerPenalty(room.wrongAnswerPenalty ?? 0);
    setPredictionHitBonusPoints(room.predictionHitBonusPoints ?? 50);
  }, [
    room.timeLimit,
    room.correctAnswerPoints,
    room.fastestAnswerBonusPoints,
    room.wrongAnswerPenalty,
    room.predictionHitBonusPoints,
    showOptionsModal,
  ]);

  const handleSaveOptions = async () => {
    setIsSavingOptions(true);
    const success = await runServiceAction(
      'waiting.updateOptions',
      async () => {
        await updateRoomOptions(roomId, {
          timeLimit,
          correctAnswerPoints,
          fastestAnswerBonusPoints,
          wrongAnswerPenalty,
          predictionHitBonusPoints,
        });
        return true;
      },
      {
        fallback: false,
        onError: () => alert('オプションの更新に失敗しました。'),
      }
    );

    if (success) {
      setShowOptionsModal(false);
    }
    setIsSavingOptions(false);
  };

  const handleSendReaction = async (
    type: 'reaction' | 'message',
    content: string,
    eventTimestamp: number
  ) => {
    if (eventTimestamp - lastReactionAt < 1000 || !currentPlayer) {
      return;
    }

    setLastReactionAt(eventTimestamp);
    try {
      await sendRoomReaction({
        roomId,
        userId: currentPlayerId,
        userName: currentPlayer.nickname,
        type,
        content,
      });

      showReactionEffect(
        {
          content,
          userName: currentPlayer.nickname,
          type,
        },
        eventTimestamp
      );
      setIsReactionPanelOpen(false);
    } catch (error) {
      console.error('Failed to send waiting reaction:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* タイトルとボタン群 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">プレイヤー待機中</h2>
        <div className="flex gap-2">
          {isMaster && (
            <button
              onClick={() => setShowOptionsModal(true)}
              className="bg-gradient-to-b from-slate-600 to-slate-800 text-slate-100 font-semibold px-3 py-1 rounded-md"
            >
              オプション
            </button>
          )}
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
            <span className="text-xs text-white font-semibold">{(room.timeLimit ?? 30) === 0 ? 'なし' : `${room.timeLimit ?? 30}s`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">CORRECT</span>
            <span className="text-xs text-white font-semibold">+{room.correctAnswerPoints ?? 10}pt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">FASTEST</span>
            <span className="text-xs text-white font-semibold">+{room.fastestAnswerBonusPoints ?? 10}pt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">PENALTY</span>
            <span className={`text-xs font-semibold ${room.wrongAnswerPenalty !== 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {room.wrongAnswerPenalty !== 0 ? `-${room.wrongAnswerPenalty}pt` : '-0pt'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">PREDICT HIT</span>
            <span className="text-xs text-white font-semibold">
              +{room.predictionHitBonusPoints ?? 50}pt
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">SCREEN</span>
            <span className={`text-xs font-semibold ${room.useScreenMode ? 'text-emerald-400' : 'text-slate-400'}`}>
              {room.useScreenMode ? '有効' : '無効'}
            </span>
          </div>
        </div>

        {room.useScreenMode && room.displayDeviceId && isMaster && (
          <div className="pt-3 border-t border-slate-700/50 space-y-2">
            <p className="text-xs text-slate-400 italic">DISPLAY LINK</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={screenUrl}
                className="flex-1 bg-slate-900/60 text-slate-200 px-3 py-2 rounded border border-slate-600 text-xs"
              />
              <button
                type="button"
                onClick={handleCopyScreenUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded transition-all"
              >
                {isCopyingScreenUrl ? 'コピー済み' : 'リンクをコピー'}
              </button>
            </div>
          </div>
        )}
      </div>

      {!isScreenModePlayerView && (
        <>
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
        </>
      )}

      {currentPlayer && (
        <div className="fixed z-50 [bottom:clamp(0.75rem,2.6vh,1.5rem)] [right:clamp(0.75rem,3.5vw,1.75rem)]">
          {isReactionPanelOpen && (
            <div ref={reactionPanelRef} className="absolute bottom-16 right-0 w-[min(88vw,320px)] origin-bottom-right space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-2">
                {REACTION_STAMPS.map((stamp) => (
                  <button
                    key={stamp}
                    type="button"
                    onClick={(event) => handleSendReaction('reaction', stamp, event.timeStamp)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xl leading-none text-slate-100 transition hover:bg-slate-700 active:scale-95"
                  >
                    {stamp}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_MESSAGES.map((message) => (
                  <button
                    key={message}
                    type="button"
                    onClick={(event) => handleSendReaction('message', message, event.timeStamp)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-100 transition hover:bg-slate-700 active:scale-95 sm:text-sm"
                  >
                    {message}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">送信は1秒に1回までです</p>
            </div>
          )}

          <button
            ref={reactionToggleButtonRef}
            type="button"
            aria-label="リアクションを開く"
            aria-expanded={isReactionPanelOpen}
            onClick={() => setIsReactionPanelOpen((prev) => !prev)}
            className="grid h-14 w-14 place-items-center rounded-full border border-slate-500/70 bg-slate-800/90 text-slate-100 shadow-lg hover:bg-slate-700"
          >
            <span className="block">
              <ReactionTriggerIcon />
            </span>
          </button>
        </div>
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

      {/* オプションモーダル（ホストのみ） */}
      {showOptionsModal && isMaster && (
        <Modal
          onClose={() => !isSavingOptions && setShowOptionsModal(false)}
          panelClassName="max-w-md w-full max-h-[80vh] overflow-y-auto"
        >
          <h3 className="text-2xl font-bold text-white mb-6 text-center">オプション設定</h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">制限時間</label>
              <select
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value={10}>10s</option>
                <option value={20}>20s</option>
                <option value={30}>30s</option>
                <option value={40}>40s</option>
                <option value={50}>50s</option>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
                <option value={120}>120s</option>
                <option value={0}>なし</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">正解ポイント</label>
              <select
                value={correctAnswerPoints}
                onChange={(e) => setCorrectAnswerPoints(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value={10}>10pt</option>
                <option value={20}>20pt</option>
                <option value={30}>30pt</option>
                <option value={40}>40pt</option>
                <option value={50}>50pt</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">早押し1位ボーナス</label>
              <select
                value={fastestAnswerBonusPoints}
                onChange={(e) => setFastestAnswerBonusPoints(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value={10}>10pt</option>
                <option value={20}>20pt</option>
                <option value={30}>30pt</option>
                <option value={40}>40pt</option>
                <option value={50}>50pt</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">誤答ペナルティ</label>
              <select
                value={wrongAnswerPenalty}
                onChange={(e) => setWrongAnswerPenalty(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value={0}>-0pt</option>
                <option value={5}>-5pt</option>
                <option value={10}>-10pt</option>
                <option value={15}>-15pt</option>
                <option value={20}>-20pt</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">予想チャレンジ的中</label>
              <select
                value={predictionHitBonusPoints}
                onChange={(e) => setPredictionHitBonusPoints(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value={10}>10pt</option>
                <option value={20}>20pt</option>
                <option value={30}>30pt</option>
                <option value={40}>40pt</option>
                <option value={50}>50pt</option>
                <option value={60}>60pt</option>
                <option value={70}>70pt</option>
                <option value={80}>80pt</option>
                <option value={90}>90pt</option>
                <option value={100}>100pt</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowOptionsModal(false)}
              disabled={isSavingOptions}
              className="flex-1 bg-slate-700 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveOptions}
              disabled={isSavingOptions}
              className="flex-1 bg-blue-600 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              {isSavingOptions ? '保存中...' : '保存'}
            </button>
          </div>
        </Modal>
      )}

      {reactionEffects.length > 0 && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[90] flex w-[min(94vw,520px)] -translate-x-1/2 flex-col items-center gap-2 px-2">
          {reactionEffects.map((effect) => (
            <div key={effect.id} className="animate-float-up max-w-full px-3 text-center">
              <p className={effect.type === 'reaction' ? 'text-3xl leading-none sm:text-4xl' : 'break-words text-sm font-semibold text-slate-100 sm:text-base'}>
                {effect.content}
              </p>
              <p className="mx-auto mt-1 max-w-full break-words text-[10px] text-slate-200 sm:text-xs">{effect.senderName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
