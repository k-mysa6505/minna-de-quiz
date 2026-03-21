'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhaseHeader } from '../../components/PhaseHeader';
import { formatOrdinalRank } from '../utils/screenUtils';
import { SecondaryButton } from '../../../../common/SecondaryButton';
import { PrimaryButton } from '../../../../common/PrimaryButton';
import type { Player } from '@/types';

interface FinishedScreenProps {
  players: Player[];
  isReplaying: boolean;
  isDisbanding: boolean;
  onReplay: () => void;
  onDisband: () => void;
}

export function FinishedScreen({
  players, isReplaying, isDisbanding, onReplay, onDisband
}: FinishedScreenProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  // 初回マウント時に少し待ってから開始
  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // 固定された順序を一度だけ計算
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  const revealOrder = useMemo(() => {
    return [...sortedPlayers].reverse();
  }, [sortedPlayers]);

  useEffect(() => {
    if (!isStarted) return;

    if (revealedCount < revealOrder.length) {
      const isLastOne = revealedCount === revealOrder.length - 1;
      const delay = isLastOne ? 2800 : 700;

      const timer = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [revealedCount, revealOrder.length, isStarted]);

  // 現在表示されているプレイヤーのリスト（上位順に並び替え直して表示）
  const visiblePlayers = useMemo(() => {
    const currentRevealed = revealOrder.slice(0, revealedCount);
    return currentRevealed.sort((a, b) => b.score - a.score);
  }, [revealOrder, revealedCount]);

  const isRevealingLastOne = revealedCount === revealOrder.length - 1;

  return (
    <section className="h-full p-4 md:p-6 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-4xl space-y-6 animate-fade-in flex-1">
        <div className="text-center space-y-2 mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-blue-500/80">Result</p>
          <h3 className="text-3xl md:text-5xl font-black text-white italic">最終結果発表</h3>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 md:p-10 w-full relative min-h-[400px]">
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {visiblePlayers.map((player) => {
                const rank = sortedPlayers.findIndex(p => p.playerId === player.playerId) + 1;
                const isFirst = rank === 1;
                
                return (
                  <motion.div 
                    key={player.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    layout
                    className="flex justify-between items-center px-4 md:px-6 py-2 transition-all border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-10">
                      <span className={`font-black text-xl md:text-2xl tabular-nums ${isFirst ? 'text-yellow-400' : 'text-white'}`}>
                        {rank}．{player.nickname}
                      </span>
                    </div>
                    <div className="text-emerald-400 font-bold font-mono text-2xl md:text-3xl">
                      {player.score}<span className="text-xs ml-1 opacity-70">pt</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* 1位発表直前の「溜め」演出 */}
          {isRevealingLastOne && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-400 font-bold italic tracking-widest text-xs uppercase"
            >
              👑 THE WINNER IS...
            </motion.div>
          )}
        </div>

        {/* 全員表示が終わったら操作ボタンを出す */}
        {revealedCount === players.length && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex gap-4 justify-center"
          >
            <PrimaryButton
              onClick={onReplay}
              disabled={isReplaying || isDisbanding}
              color="emerald"
            >
              {isReplaying ? 'RESETTING...' : 'REPLAY'}
            </PrimaryButton>
            <SecondaryButton onClick={onDisband} disabled={isReplaying || isDisbanding}>
              {isDisbanding ? 'DISBAND' : 'DISBAND'}
            </SecondaryButton>
          </motion.div>
        )}
      </div>
    </section>
  );
}
