import type { Answer, Player } from '@/types';

interface RankingListProps {
  correctAnswers: Answer[];
  players: Player[];
  revealedPlayers: string[];
  questionStartTime: number;
  correctAnswerPoints: number;
  fastestAnswerBonusPoints: number;
}

import { calculateCorrectAnswerPoints } from '@/lib/utils/roundScoring';
import { toTimestamp } from '../utils/screenUtils';

export function RankingList({ correctAnswers, players, revealedPlayers, questionStartTime, correctAnswerPoints, fastestAnswerBonusPoints }: RankingListProps) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 w-full min-h-[120px] flex flex-col justify-center items-center">
      {correctAnswers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center w-full h-full">
          <p className="text-2xl text-slate-300 text-center italic">正解者なし</p>
        </div>
      ) : (
        <div className="space-y-2 w-full">
          {correctAnswers.slice(0, 8).map((answer, index) => {
            if (!revealedPlayers.includes(answer.playerId)) return null;
            const player = players.find(p => p.playerId === answer.playerId);
            const elapsedMs = Math.max(0, questionStartTime > 0 ? toTimestamp(answer.answeredAt) - questionStartTime : 0);
            const timeDisplay = `${Math.floor(elapsedMs / 1000)}''${Math.floor((elapsedMs % 1000) / 10).toString().padStart(2, '0')}`;
            const gainedPoints = calculateCorrectAnswerPoints({ correctAnswerPoints, fastestAnswerBonusPoints, isFastestCorrect: index === 0 });
            return (
              <div key={answer.playerId} className="flex items-center justify-between px-6 py-2 sm:text-3xl animate-fade-in">
                <div className="flex items-center gap-8">
                  {/* 1カラム目: 番号 */}
                  <span className={`font-bold w-8 text-center ${index === 0 ? 'text-amber-300' : 'text-white'}`}>{index + 1}．</span>
                  {/* 2カラム目: 名前とタイム */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-10">
                    <span className={`font-bold ${index === 0 ? 'text-amber-300' : 'text-white'}`}>
                      {player?.nickname || 'unknown'}
                    </span>
                    <span className="sm:text-2xl text-slate-300 italic">{timeDisplay}</span>
                  </div>
                </div>
                <span className="text-emerald-300 font-bold">+{gainedPoints}pt</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
