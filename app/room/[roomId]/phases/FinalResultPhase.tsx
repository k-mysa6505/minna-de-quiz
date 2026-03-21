// app/room/[roomId]/FinalResultPhase.tsx
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { leaveRoomFlow } from '@/lib/services/room/roomFlowService';
import { runServiceAction } from '@/lib/services/core/serviceAction';
import { setPlayerReplayRequested, updatePlayerOnlineStatus } from '@/lib/services/auth/playerService';
import type { Player } from '@/types';
import { ReactionOverlay } from '../components/ReactionOverlay';
import { ReactionTrigger } from '../components/ReactionTrigger';
import { useReactions } from '../hooks/useReactions';
import { PhaseHeader } from '../components/PhaseHeader';
import { SecondaryButton } from '../../../common/SecondaryButton';
import { PrimaryButton } from '../../../common/PrimaryButton';
import { motion, AnimatePresence } from 'framer-motion';

interface FinalResultPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  useScreenMode?: boolean;
}

const FINAL_QUICK_MESSAGES = ['お疲れさま！', 'GG！', '最高！', 'またやろう'];

function formatOrdinalRank(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1: return `${rank}st`;
    case 2: return `${rank}nd`;
    case 3: return `${rank}rd`;
    default: return `${rank}th`;
  }
}

export function FinalResultPhase({ roomId, players, currentPlayerId, useScreenMode = false }: FinalResultPhaseProps) {
  const router = useRouter();
  const [hasLeft, setHasLeft] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasRequestedReplay, setHasRequestedReplay] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  
  // ランキングを安定させるため、一度読み込んだプレイヤーをメモリに保持
  const [stablePlayers, setStablePlayers] = useState<Player[]>(players);

  useEffect(() => {
    if (players.length === 0) return;
    setStablePlayers(prev => {
      const merged = new Map(prev.map(p => [p.playerId, p]));
      players.forEach(p => {
        merged.set(p.playerId, { ...merged.get(p.playerId), ...p });
      });
      return Array.from(merged.values());
    });
  }, [players]);

  const sortedPlayers = useMemo(() => {
    return [...stablePlayers].sort((a, b) => b.score - a.score);
  }, [stablePlayers]);

  const revealOrder = useMemo(() => {
    return [...sortedPlayers].reverse();
  }, [sortedPlayers]);

  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isStarted || useScreenMode) return;
    if (revealedCount < revealOrder.length) {
      const isLastOne = revealedCount === revealOrder.length - 1;
      const delay = isLastOne ? 2800 : 700;
      const timer = setTimeout(() => { setRevealedCount(prev => prev + 1); }, delay);
      return () => clearTimeout(timer);
    }
  }, [revealedCount, revealOrder.length, isStarted, useScreenMode]);

  const visiblePlayers = useMemo(() => {
    const currentRevealed = revealOrder.slice(0, revealedCount);
    return currentRevealed.sort((a, b) => b.score - a.score);
  }, [revealOrder, revealedCount]);

  const isRevealingLastOne = revealedCount === revealOrder.length - 1;
  const isAllRevealed = revealedCount === revealOrder.length;

  const currentPlayer = players.find((p) => p.playerId === currentPlayerId);
  const {
    reactionEffects,
    isReactionPanelOpen, setIsReactionPanelOpen,
    reactionPanelRef, reactionToggleButtonRef,
    handleSendReaction,
  } = useReactions(roomId, currentPlayerId, currentPlayer?.nickname);

  const resolveCurrentPlayerId = () => sessionStorage.getItem('currentPlayerId') || localStorage.getItem('currentPlayerId');

  useEffect(() => {
    return () => {
      if (!hasLeft) {
        const pid = resolveCurrentPlayerId();
        if (pid) updatePlayerOnlineStatus(roomId, pid, false).catch(console.error);
      }
    };
  }, [roomId, hasLeft]);

  const handleLeaveRoom = async () => {
    const pid = resolveCurrentPlayerId();
    if (!pid) {
      router.push('/');
      return;
    }
    setHasLeft(true);
    await runServiceAction('final.leaveRoom', () => leaveRoomFlow(roomId, pid));
    sessionStorage.removeItem('currentPlayerId');
    sessionStorage.removeItem('currentRoomId');
    router.push('/');
  };

  const handlePlayAgain = async () => {
    const pid = resolveCurrentPlayerId();
    if (!pid) return;
    setIsResetting(true);
    try {
      await runServiceAction('final.playAgain', () => setPlayerReplayRequested(roomId, pid));
      setHasRequestedReplay(true);
    } catch (error) {
      console.error(`[Replay] Failed:`, error);
      alert('リプレイ申請に失敗しました。');
    } finally {
      setIsResetting(false);
    }
  };

  const myIndex = sortedPlayers.findIndex((p) => p.playerId === currentPlayerId);
  const myRank = myIndex >= 0 ? myIndex + 1 : 1;

  return (
    <>
      <div className="space-y-6 animate-fade-in flex-1">
        <div className="text-center space-y-2 mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-blue-500/80">Result</p>
          <h3 className="text-3xl font-black text-white italic">総合ランキング</h3>
        </div>
        
        {!useScreenMode && (
          <div className="py-6 w-full relative min-h-[100px]">
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {visiblePlayers.map((player) => {
                  const rank = sortedPlayers.findIndex(p => p.playerId === player.playerId) + 1;
                  const isMe = player.playerId === currentPlayerId;
                  
                  const getRankStyle = (r: number) => {
                    if (r === 1) return 'bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]'; // Gold
                    if (r === 2) return 'bg-gradient-to-b from-slate-100 via-slate-300 to-slate-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]';   // Silver
                    if (r === 3) return 'bg-gradient-to-b from-orange-200 via-orange-500 to-orange-800 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]'; // Bronze
                    return 'text-white';
                  };

                  return (
                    <motion.div 
                      key={player.playerId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      layout
                      className={`flex justify-between items-center px-4 py-1 border-b border-white/5 last:border-0 ${
                        isMe ? 'bg-gradient-to-b from-blue-800/90 to-blue-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center text-lg">
                        <span className={`font-black tabular-nums min-w-[3.5rem] ${getRankStyle(rank)}`}>
                          {formatOrdinalRank(rank)}
                        </span>
                        <span className="font-semibold italic text-white tracking-wide">
                          {player.nickname}
                        </span>
                      </div>
                      <div className="text-emerald-400 font-bold text-xl">
                        {player.score}<span className="text-lg ml-0.5">pt</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {useScreenMode && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-8 text-center space-y-4 animate-fade-in">
            <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">Your Rank</p>
            <p className="text-5xl sm:text-6xl font-black text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">{formatOrdinalRank(myRank)}</p>
            <p className="text-slate-300 text-sm">でした！ 総合結果はスクリーンをご覧ください。</p>
          </div>
        )}

        {(!useScreenMode ? isAllRevealed : true) && (
          <div className="flex gap-4 justify-center pt-4 animate-fade-in">
            <PrimaryButton
              onClick={handlePlayAgain}
              disabled={isResetting || hasLeft || hasRequestedReplay}
            >
              {isResetting ? 'RESETTING...' : (hasRequestedReplay ? 'REQUESTED' : 'REPLAY')}
            </PrimaryButton>
            <SecondaryButton onClick={handleLeaveRoom} disabled={isResetting}>HOME</SecondaryButton>
          </div>
        )}
        
        {currentPlayer && (
          <ReactionTrigger
            isReactionPanelOpen={isReactionPanelOpen} setIsReactionPanelOpen={setIsReactionPanelOpen}
            reactionPanelRef={reactionPanelRef} reactionToggleButtonRef={reactionToggleButtonRef}
            handleSendReaction={handleSendReaction} quickMessages={FINAL_QUICK_MESSAGES}
          />
        )}
      </div>
      <ReactionOverlay effects={reactionEffects} />
    </>
  );
}
