import { useState, useEffect } from 'react';
import { NumberTicker } from '@/app/common/NumberTicker';

interface PredictionResultScreenProps {
  prediction: { predictedCount: number; isCorrect: boolean } | null;
  correctAnswerCount: number;
  predictionPoints: number;
  authorNickname: string;
  totalParticipants: number;
}

export function PredictionResultScreen({ prediction, correctAnswerCount, predictionPoints, authorNickname, totalParticipants }: PredictionResultScreenProps) {
  const [stage, setStage] = useState(0);

  // 的中判定
  const isHit = prediction?.predictedCount === correctAnswerCount;

  // ニアピン判定ロジック
  const diff = Math.abs((prediction?.predictedCount || 0) - correctAnswerCount);
  const nearRange = totalParticipants >= 5
    ? Math.max(1, Math.floor(totalParticipants * 0.1))
    : -1; 

  const isNear = !isHit && nearRange !== -1 && diff <= nearRange;

  useEffect(() => {
    // データがない場合は stage 0 で待機
    if (!prediction) {
      setStage(0);
      return;
    }

    // Strict Mode等での二重実行や巻き戻りを防ぐため、タイマーを管理
    let isCancelled = false;

    const runAnimation = async () => {
      // 最初の待機
      await new Promise(resolve => setTimeout(resolve, 800));
      if (isCancelled) return;
      setStage(1); // 実際を表示

      await new Promise(resolve => setTimeout(resolve, 1700)); // 0.8 + 1.7 = 2.5s
      if (isCancelled) return;
      setStage(2); // 予想を表示

      await new Promise(resolve => setTimeout(resolve, 2000)); // 2.5 + 2.0 = 4.5s
      if (isCancelled) return;
      setStage(3); // ポイント・スタンプを表示
    };

    runAnimation();

    return () => {
      isCancelled = true;
    };
  }, [prediction?.predictedCount, prediction?.isCorrect]);

  // そもそも prediction が無い時のガード
  if (!prediction) {
    return <p className="text-center text-slate-400 italic py-4 animate-pulse">作問者の予想結果を取得できません</p>;
  }

  const getStatusColor = () => {
    if (isHit) return 'text-emerald-400';
    if (isNear) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-10 animate-fade-in overflow-hidden relative">
      <div className="text-center space-y-2">
        <p className="text-lg font-bold uppercase tracking-[0.4em] text-emerald-500/80">Prediction Challenge</p>
        <h3 className="text-5xl font-black text-white italic">出題者予想チャレンジ</h3>
        <p className="text-lg text-slate-400 font-medium">作問者: {authorNickname}</p>
      </div>

      <div className="grid grid-cols-2 gap-10 relative">
        {/* 実際 (Actual) - Stage 1以上で表示 */}
        <div className={`text-center space-y-3 transition-all duration-700 ${stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-xl font-bold text-slate-300">実際</p>
          <p className="text-8xl font-black font-mono text-white tracking-tighter">
            <NumberTicker value={stage >= 1 ? correctAnswerCount : 0} duration={1000} />
            <span className="text-5xl ml-2 opacity-40">人</span>
          </p>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-16 bg-white/10" />

        {/* 予想 (Predicted) - Stage 2以上で表示 */}
        <div className={`text-center space-y-3 transition-all duration-700 ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-xl font-bold text-slate-300">予想</p>
          <p className={`text-8xl font-black font-mono tracking-tighter ${getStatusColor()}`}>
            <NumberTicker value={stage >= 2 ? prediction.predictedCount : 0} duration={1000} />
            <span className="text-5xl ml-2 opacity-40">人</span>
          </p>
        </div>
      </div>

      {/* ポイント (Points) - Stage 3以上で表示 */}
      <div className={`pt-6 border-t border-white/10 text-center transition-all duration-1000 ${stage >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <p className="text-lg font-bold text-slate-300 mb-2 uppercase tracking-widest">獲得ポイント</p>
        <div className={`text-7xl font-black font-mono inline-flex items-baseline gap-1 ${predictionPoints > 0 ? (isHit ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-400'}`}>
          <span className="text-5xl font-bold">+</span>
          <NumberTicker value={stage >= 3 ? predictionPoints : 0} duration={1000} />
          <span className="text-5xl ml-1 font-bold">PT</span>
        </div>
      </div>

      {/* Hit/Near Stamp */}
      {stage >= 3 && (isHit || isNear) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 select-none animate-in zoom-in duration-500">
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