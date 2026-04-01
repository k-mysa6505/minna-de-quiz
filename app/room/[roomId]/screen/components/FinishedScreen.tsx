'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatOrdinalRank } from '../utils/screenUtils';
import type { Player } from '@/types';

export function FinishedScreen({ players }: { players: Player[] }) {
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [isStarted, setIsStarted] = useState(false);

  // 【追加】退室したプレイヤーを画面に残すための履歴状態
  const [historicalPlayers, setHistoricalPlayers] = useState<Map<string, Player>>(new Map());

  // 【追加】playersが更新されるたびにMapを更新（追加・スコア更新のみ。削除はしない）
  useEffect(() => {
    setHistoricalPlayers(prev => {
      const next = new Map(prev);
      players.forEach(p => {
        next.set(p.playerId, p);
      });
      return next;
    });
  }, [players]);

  // 【変更】players ではなく historicalPlayers を使ってソートする
  const sortedPlayers = useMemo(() => {
    return Array.from(historicalPlayers.values()).sort((a, b) => b.score - a.score);
  }, [historicalPlayers]);

  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isStarted) return;

    // 下位のインデックスから順に表示リストに追加していく
    const total = sortedPlayers.length;
    if (revealedIndices.length < total) {
      const nextIndex = (total - 1) - revealedIndices.length; // 一番下のインデックスから
      const isLastOne = nextIndex === 0; // 1位の時
      const delay = isLastOne ? 1200 : 600;

      const timer = setTimeout(() => {
        setRevealedIndices(prev => [...prev, nextIndex]);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [revealedIndices, sortedPlayers.length, isStarted]);

  return (
    <section className="h-full p-4 md:p-6 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-4xl space-y-6 flex-1">
        <div className="text-center space-y-2 mb-8">
          <p className="text-xl font-bold uppercase tracking-[0.4em] text-blue-500/80">Final Result</p>
          <h3 className="text-3xl md:text-5xl font-black text-white italic">総合ランキング</h3>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 md:p-10 w-full relative min-h-[100px]">
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {sortedPlayers.map((player, index) => {
                // このインデックスが「表示対象」に含まれているかチェック
                if (!revealedIndices.includes(index)) return null;

                const rank = index + 1;
                const isFirst = rank === 1;

                return (
                  <motion.div
                    key={player.playerId}
                    layout // 既存要素が動く際のアニメーションを自動化
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      layout: { duration: 0.4, ease: "easeOut" }, // 押し下げられる動き
                      opacity: { duration: 0.4 },
                      x: { duration: 0.4, ease: "easeOut" } // スライドインの動き
                    }}
                    className={`flex justify-between items-center px-4 md:px-6`}
                  >
                    <div className="flex items-center gap-10">
                      <span className={`font-bold text-xl md:text-2xl tabular-nums w-12 text-center ${isFirst ? 'text-yellow-400' : 'text-white'}`}>
                        {formatOrdinalRank(rank)}
                      </span>
                      <span className={`font-bold text-2xl md:text-3xl italic ${isFirst ? 'text-yellow-400' : 'text-white'}`}>
                        {player.nickname}
                      </span>
                    </div>
                    <div className={`text-emerald-400 font-bold font-mono text-xl md:text-3xl`}>
                      {player.score}<span className="text-xl ml-1">pt</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
