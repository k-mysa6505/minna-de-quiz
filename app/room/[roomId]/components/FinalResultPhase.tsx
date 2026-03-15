// app/room/[roomId]/components/FinalResultPhase.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaveRoomFlow } from '@/lib/services/roomFlowService';
import { runServiceAction } from '@/lib/services/serviceAction';
import { setPlayerReplayRequested, updatePlayerOnlineStatus } from '@/lib/services/playerService';
import { sendRoomReaction, subscribeToRoomReactions, type RoomReaction } from '@/lib/services/reactionService';
import type { Player } from '@/types';
import { PlayerListCard } from './PlayerListCard';

interface FinalResultPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  useScreenMode?: boolean;
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
const QUICK_MESSAGES = ['お疲れさま！', 'GG！', '最高！', 'またやろう'];
const REACTION_EFFECT_DURATION_MS = 2700;

function calculateCompetitionRanks(players: Player[]): number[] {
  const ranks: number[] = [];
  let currentRank = 1;

  players.forEach((player, index) => {
    if (index > 0 && player.score < players[index - 1].score) {
      currentRank = index + 1;
    }
    ranks.push(currentRank);
  });

  return ranks;
}

function formatOrdinalRank(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${rank}th`;
  }

  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

export function FinalResultPhase({
  roomId,
  players,
  currentPlayerId,
  useScreenMode = false,
}: FinalResultPhaseProps) {
  const router = useRouter();
  const [hasLeft, setHasLeft] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasRequestedReplay, setHasRequestedReplay] = useState(false);
  const [finalRankingPlayers, setFinalRankingPlayers] = useState<Player[]>([]);
  const [lastReactionAt, setLastReactionAt] = useState(0);
  const [reactionEffects, setReactionEffects] = useState<LocalReactionEffect[]>([]);
  const [isReactionPanelOpen, setIsReactionPanelOpen] = useState(false);
  const reactionPanelRef = useRef<HTMLDivElement | null>(null);
  const reactionToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasInitialReactionSnapshotRef = useRef(false);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  const resolveCurrentPlayerId = () => {
    const fromSession = sessionStorage.getItem('currentPlayerId');
    if (fromSession) {
      return fromSession;
    }
    return localStorage.getItem('currentPlayerId');
  };


  // コンポーネントアンマウント時の処理
  useEffect(() => {
    return () => {
      if (!hasLeft) {
        const currentPlayerId = resolveCurrentPlayerId();
        if (currentPlayerId) {
          console.log('FinalResultPhase cleanup for player:', currentPlayerId);
          updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
        }
      }
    };
  }, [roomId, hasLeft]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (players.length === 0) {
        return;
      }

      setFinalRankingPlayers((prev) => {
        if (prev.length === 0) {
          return players;
        }

        const merged = new Map(prev.map((player) => [player.playerId, player]));
        for (const player of players) {
          merged.set(player.playerId, { ...merged.get(player.playerId), ...player });
        }
        return Array.from(merged.values());
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [players]);

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
        const effectId = Date.now() + Math.random();
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

  const handleLeaveRoom = async () => {
    const currentPlayerIdFromStorage = resolveCurrentPlayerId();
    if (!currentPlayerIdFromStorage) {
      sessionStorage.removeItem('currentPlayerId');
      sessionStorage.removeItem('currentRoomId');
      router.push('/');
      return;
    }

    setHasLeft(true);
    await runServiceAction('final.leaveRoom', () => leaveRoomFlow(roomId, currentPlayerIdFromStorage));

    // Keep localStorage untouched to avoid affecting other tabs on the same origin.
    sessionStorage.removeItem('currentPlayerId');
    sessionStorage.removeItem('currentRoomId');
    router.push('/');
  };

  const handlePlayAgain = async () => {
    const currentPlayerIdFromStorage = resolveCurrentPlayerId();
    if (!currentPlayerIdFromStorage) {
      return;
    }

    setIsResetting(true);
    await runServiceAction('final.playAgain', () => setPlayerReplayRequested(roomId, currentPlayerIdFromStorage), {
      onError: () => alert('リプレイ申請に失敗しました。ページをリロードしてください。'),
    });
    setIsResetting(false);
    setHasRequestedReplay(true);
  };

  const currentPlayer = players.find((player) => player.playerId === currentPlayerId);

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
      console.error('Failed to send final reaction:', error);
    }
  };

  const rankingSourcePlayers = finalRankingPlayers.length > 0 ? finalRankingPlayers : players;
  const sortedByScore = [...rankingSourcePlayers].sort((a, b) => b.score - a.score);
  const competitionRanks = calculateCompetitionRanks(sortedByScore);
  const myIndex = sortedByScore.findIndex((player) => player.playerId === currentPlayerId);
  const myRank = myIndex >= 0 ? competitionRanks[myIndex] : 1;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">総合ランキング</h2>

      {!useScreenMode && (
        <PlayerListCard
          players={rankingSourcePlayers}
          currentPlayerId={currentPlayerId}
          sortMode="scoreDesc"
          showScores
          highlightTopScore
        />
      )}

      {useScreenMode && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-6 text-center space-y-3">
          <p className="text-slate-300">あなたの最終順位は</p>
          <p className="text-4xl sm:text-5xl font-black text-emerald-300">{formatOrdinalRank(myRank)}</p>
          <p className="text-slate-300">でした！ 総合結果はスクリーンをご覧ください。</p>
        </div>
      )}

      {!useScreenMode && (
        <div className="flex gap-4 justify-center">
          {/* もう一度遊ぶボタン */}
          <button
            onClick={handlePlayAgain}
            disabled={isResetting || hasLeft || hasRequestedReplay}
            className="bg-emerald-700 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
            title={hasRequestedReplay ? 'リプレイ申請済み' : 'もう一度遊ぶ'}
          >
            {isResetting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
                <span>RESETTING...</span>
              </div>
            ) : (
              hasRequestedReplay ? 'REQUESTED' : 'REPLAY'
            )}
          </button>

          {/* ホームに戻るボタン */}
          <button
            onClick={handleLeaveRoom}
            disabled={isResetting}
            className="bg-slate-700/50 disabled:bg-slate-600 text-slate-200 font-bold italic px-4 rounded-xl border border-slate-600 transition-all duration-300 disabled:cursor-not-allowed"
          >
            HOME
          </button>
        </div>
      )}

      {currentPlayer && (
        <div className="fixed bottom-6 right-4 z-40 sm:right-6">
          {isReactionPanelOpen && (
            <div ref={reactionPanelRef} className="absolute bottom-16 right-0 w-[min(88vw,320px)] space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-sm">
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

      {reactionEffects.length > 0 && (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-1 overflow-x-hidden px-1">
          {reactionEffects.map((effect) => (
            <div key={effect.id} className="animate-float-up max-w-full px-2 text-center">
              <p className={effect.type === 'reaction' ? 'text-3xl leading-none sm:text-4xl' : 'break-words text-sm font-semibold text-slate-100 sm:text-base'}>
                {effect.content}
              </p>
              <p className="mx-auto mt-1 max-w-full truncate text-[10px] text-slate-200">{effect.senderName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
