'use client';

import { useState, useEffect } from 'react';
import type { Player } from '@/types';
import { NumberTicker } from '@/app/common/NumberTicker';

interface PredictionResultProps {
  prediction: { predictedCount: number; isCorrect: boolean } | null;
  correctAnswerCount: number;
  predictionPoints: number;
  authorNickname: string;
  totalParticipants: number;
}

export function PredictionResult({ 
  prediction, 
  correctAnswerCount, 
  predictionPoints, 
  authorNickname,
  totalParticipants 
}: PredictionResultProps) {
  const [stage, setStage] = useState(0);

  // 的中判定
  const isHit = prediction?.predictedCount === correctAnswerCount;
  
  // ニアピン判定ロジック
  // 1. 5人未満ならニアピンなし
  // 2. 5人以上なら「±10%」と「±1人」の大きい方を採用
  const diff = Math.abs((prediction?.predictedCount || 0) - correctAnswerCount);
  const nearRange = totalParticipants >= 5 
    ? Math.max(1, Math.floor(totalParticipants * 0.1)) 
    : -1; // 5人未満は到達不能な距離に設定

  const isNear = !isHit && nearRange !== -1 && diff <= nearRange;

  useEffect(() => {
    if (!prediction) return;
    const t1 = setTimeout(() => setStage(1), 800);
    const t2 = setTimeout(() => setStage(2), 2500);
    const t3 = setTimeout(() => setStage(3), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [prediction]);

  if (!prediction && stage === 0) {
    return <p className="text-center text-slate-400 italic py-4 animate-pulse">集計中...</p>;
  }

  // 状態に応じたテキストカラー（シャドウなし）
  const getStatusColor = () => {
    if (isHit) return 'text-emerald-400';
    if (isNear) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-10 animate-fade-in overflow-hidden relative">
      <div className="text-center space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-emerald-500/80">Prediction Challenge</p>
        <h3 className="text-2xl font-black text-white italic">出題者予想チャレンジ</h3>
        <p className="text-slate-400 font-medium">作問者: {authorNickname}</p>
      </div>

      <div className="grid grid-cols-2 gap-10 relative">
        {/* Actual */}
        <div className={`text-center space-y-3 transition-all duration-700 ${stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-sm font-bold text-slate-400">実際</p>
          <p className="text-6xl sm:text-7xl font-black font-mono text-white tracking-tighter">
            {stage >= 2 ? correctAnswerCount : 0}<span className="text-xl ml-2 opacity-40">人</span>
          </p>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-16 bg-white/10" />

        {/* Predicted */}
        <div className={`text-center space-y-3 transition-all duration-700 ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-sm font-bold text-slate-400">予想</p>
          <p className={`text-6xl sm:text-7xl font-black font-mono tracking-tighter ${getStatusColor()}`}>
            {stage >= 1 ? prediction?.predictedCount : 0}<span className="text-xl ml-2 opacity-40">人</span>
          </p>
        </div>
      </div>

      {/* Points */}
      <div className={`pt-6 border-t border-white/10 text-center transition-all duration-1000 ${stage >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">獲得ポイント</p>
        <div className={`text-5xl font-black font-mono inline-flex items-baseline gap-1 ${predictionPoints > 0 ? (isHit ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-700'}`}>
          <span className="text-3xl font-bold">+</span>
          <NumberTicker value={stage >= 3 ? predictionPoints : 0} duration={1000} />
          <span className="text-xl ml-1 font-bold">PT</span>
        </div>
      </div>

      {/* Hit/Near Stamp */}
      {stage >= 3 && (isHit || isNear) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 select-none">
          {isHit ? (
            <p className="text-[12rem] font-black font-mono text-emerald-500 -rotate-12 border-[16px] border-emerald-500 px-8 py-2 rounded-3xl">HIT</p>
          ) : (
            <p className="text-[10rem] font-black font-mono text-amber-500 -rotate-6 border-[12px] border-amber-500 px-8 py-2 rounded-3xl">NEAR</p>
          )}
        </div>
      )}
    </div>
  );
}