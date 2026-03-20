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
  players: Player[];
  onNext: () => void;
}

export function NextQuestionControl({
  isReady, readyCount, totalPlayers, allReady, waitingForPlayers,
  isLastQuestion, useScreenMode, playersReady, players, onNext
}: NextQuestionControlProps) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-300">準備完了</span>
          <span className={`font-bold text-lg ${allReady ? 'text-green-400' : 'text-yellow-400'}`}>{readyCount}/{totalPlayers}人</span>
        </div>
        {!useScreenMode && readyCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {playersReady.map(pid => (
              <span key={pid} className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded border border-green-600/30">
                {players.find(p => p.playerId === pid)?.nickname || 'unknown'}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={allReady}
        className={`w-full font-bold py-4 px-6 rounded-md shadow-lg transition-all ${isReady ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'}`}
      >
        {allReady ? '全員準備完了 - 自動で進みます...' : isReady ? '準備完了 - 他のプレイヤーを待っています...' : `準備完了 (${isLastQuestion ? '結果を見る' : '次の問題へ'})`}
      </button>
      {useScreenMode && !allReady && readyCount > 0 && (
        <p className="text-center text-xs text-slate-400 italic mt-2">あと{totalPlayers - readyCount}人が準備完了すると自動で進みます</p>
      )}
    </div>
  );
}
