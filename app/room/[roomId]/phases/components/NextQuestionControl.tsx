'use client';

import type { Player } from '@/types';

interface NextQuestionControlProps {
  isReady: boolean;
  readyCount: number;
  totalPlayers: number;
  allReady: boolean;
  waitingForPlayers: boolean;
  isLastQuestion: boolean;
  useScreenMode: boolean;
  playersReady: string[];
  playersAnswered?: string[]; // 追加: 送信済みプレイヤーIDリスト
  players: Player[];
  onNext: () => void;
}

export function NextQuestionControl({
  isReady, readyCount, totalPlayers, allReady, waitingForPlayers,
  isLastQuestion, useScreenMode, playersReady, playersAnswered = [], players, onNext
}: NextQuestionControlProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <button
        onClick={onNext}
        disabled={allReady || isReady}
        className={`w-full font-bold py-4 px-6 rounded-md shadow-lg transition-all ${allReady
            ? 'bg-emerald-600 text-white opacity-70 cursor-not-allowed'
            : isReady
              ? 'bg-emerald-600 text-white cursor-default border border-emerald-400/30'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white active:scale-95'
          }`}
      >
        {allReady
          ? '全員準備完了 - 自動で進みます...'
          : isReady
            ? '準備完了 - 他のプレイヤーを待機中'
            : `準備完了 (${isLastQuestion ? '結果を見る' : '次の問題へ'})`
        }
      </button>

      {/* 準備状況 */}
      <div className="space-y-2 px-2">
        <div className="flex justify-between items-center opacity-80">
          <span className="text-xs font-bold">準備完了プレイヤー ： {readyCount} / {totalPlayers}</span>
        </div>

        {!useScreenMode && (readyCount > 0 || playersAnswered.length > 0) && (
          <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-12 mt-1">
            {/* 準備完了プレイヤー */}
            {playersReady.map(pid => (
              <span key={pid} className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap">
                {players.find(p => p.playerId === pid)?.nickname || '...'}
              </span>
            ))}
            {/* 送信済みプレイヤー（準備完了に含まれていない場合のみ表示） */}
            {playersAnswered.filter(pid => !playersReady.includes(pid)).map(pid => (
              <span key={pid} className="text-[9px] bg-emerald-700/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-400/20 whitespace-nowrap">
                {players.find(p => p.playerId === pid)?.nickname || '...'}
                <span className="ml-0.5">(送信済)</span>
              </span>
            ))}
          </div>
        )}

        {useScreenMode && !allReady && readyCount > 0 && (
          <p className="text-[9px] text-slate-500 italic">あと{totalPlayers - readyCount}人が準備完了すると自動で進みます</p>
        )}
      </div>
    </div>
  );
}
