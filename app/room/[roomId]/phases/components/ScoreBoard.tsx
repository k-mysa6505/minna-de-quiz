'use client';

import type { Answer, Player } from '@/types';
import { calculateCorrectAnswerPoints, toMillis } from '@/lib/utils/roundScoring';

interface ScoreBoardProps {
  correctAnswers: Answer[];
  players: Player[];
  revealedPlayers: string[];
  questionStartTime: number;
  correctAnswerPoints: number;
  fastestAnswerBonusPoints: number;
}

export function ScoreBoard({
  correctAnswers, players, revealedPlayers, questionStartTime,
  correctAnswerPoints, fastestAnswerBonusPoints
}: ScoreBoardProps) {
  if (correctAnswers.length === 0) return <div className="text-center text-slate-400 italic py-4">正解者なし</div>;

  return (
    <div className="space-y-3">
      {correctAnswers.map((answer, idx) => {
        const player = players.find((p) => p.playerId === answer.playerId);
        if (!revealedPlayers.includes(answer.playerId)) return null;

        const answerTime = toMillis(answer.answeredAt);
        const elapsedMs = questionStartTime > 0 ? answerTime - questionStartTime : 0;
        const timeDisplay = `${Math.floor(elapsedMs / 1000)}''${Math.floor((elapsedMs % 1000) / 10).toString().padStart(2, '0')}`;
        const gainedPoints = calculateCorrectAnswerPoints({ correctAnswerPoints, fastestAnswerBonusPoints, isFastestCorrect: idx === 0 });

        return (
          <div key={answer.playerId} className="flex justify-between items-center px-4 py-1 animate-fade-in">
            <div className="flex items-center gap-10">
              <span className={`font-bold text-lg ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>{idx + 1}．{player?.nickname || 'unknown'}</span>
              <span className="text-ms text-slate-300 italic">{timeDisplay}</span>
            </div>
            <span className="text-emerald-400 font-bold">+{gainedPoints}pt</span>
          </div>
        );
      })}
    </div>
  );
}
