'use client';

import type { Player } from '@/types';

interface PredictionResultProps {
  prediction: { predictedCount: number; isCorrect: boolean } | null;
  correctAnswerCount: number;
  predictionPoints: number;
  authorNickname: string;
}

export function PredictionResult({ prediction, correctAnswerCount, predictionPoints, authorNickname }: PredictionResultProps) {
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/30 rounded-xl border border-purple-600/50 p-6 animate-fade-in">
      <p className="text-sm text-purple-300 mb-3 text-center">出題者の予想</p>
      {prediction ? (
        <div className="flex justify-between items-center px-4 py-1">
          <div className="flex items-center gap-10">
            <p className="text-white font-bold">{authorNickname}</p>
            <p className="text-sm text-slate-300 italic">予想: {prediction.predictedCount}人 / 実際: {correctAnswerCount}人</p>
          </div>
          <span className={predictionPoints > 0 ? 'text-emerald-400 font-bold' : 'text-gray-400 font-bold'}>+{predictionPoints}pt</span>
        </div>
      ) : <p className="text-center text-slate-300 italic py-2">予想結果を集計中です...</p>}
    </div>
  );
}
