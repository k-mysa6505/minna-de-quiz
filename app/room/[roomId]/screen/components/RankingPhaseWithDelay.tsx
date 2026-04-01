import { useState, useEffect } from 'react';
import { RankingList } from './RankingList';

interface RankingPhaseWithDelayProps {
  correctAnswers: any;
  players: any;
  revealedPlayers: any;
  questionStartTime: number;
  correctAnswerPoints: number;
  fastestAnswerBonusPoints: number;
}

export function RankingPhaseWithDelay({ correctAnswers, players, revealedPlayers, questionStartTime, correctAnswerPoints, fastestAnswerBonusPoints }: RankingPhaseWithDelayProps) {
  const [showList, setShowList] = useState(false);
  useEffect(() => {
    setShowList(false);
    const t = setTimeout(() => setShowList(true), 1000);
    return () => clearTimeout(t);
  }, [correctAnswers, players, revealedPlayers, questionStartTime, correctAnswerPoints, fastestAnswerBonusPoints]);
  return (
    <div className="space-y-6 animate-fade-in flex-1">
      <div className="text-center space-y-2 mb-4">
        <p className="text-lg font-bold uppercase tracking-[0.4em] text-blue-500/80">Result</p>
        <h3 className="text-5xl font-black text-white italic">正解者一覧</h3>
      </div>
      {showList && (
        <RankingList
          correctAnswers={correctAnswers}
          players={players}
          revealedPlayers={revealedPlayers}
          questionStartTime={questionStartTime}
          correctAnswerPoints={correctAnswerPoints}
          fastestAnswerBonusPoints={fastestAnswerBonusPoints}
        />
      )}
    </div>
  );
}