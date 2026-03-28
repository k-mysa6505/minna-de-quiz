'use client';


import { useMemo } from 'react';
import type { GameState, Answer, Prediction, Question, Player, Room } from '@/types';
import { calculateCorrectAnswerPoints } from '@/lib/utils/roundScoring';
import { toTimestamp } from '../utils/screenUtils';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { GameProgressHeader } from '@/app/room/[roomId]/components/GameProgressHeader';
import { RankingList } from './RankingList';
import { PredictionResultScreen } from './PredictionResultScreen';

interface RevealingScreenProps {
  gameState: GameState;
  timeLimit: number;
  remainingSeconds: number;
  revealingPhase: 'answer' | 'ranking' | 'prediction';
  currentQuestion: Question;
  answerDistribution: number[];
  correctAnswers: Answer[];
  players: Player[];
  revealedPlayers: string[];
  currentPrediction: Prediction | null;
  currentAuthorName: string;
  animatedPredictedCount: number;
  animatedActualCount: number;
  predictionPoints: number;
  showPredictedCount: boolean;
  showActualCount: boolean;
  showPredictionBonus: boolean;
  revealReadyCount: number;
  revealReadyTotal: number;
  revealReadyPercent: number;
  room: Room;
  questionStartTime: number;
  nextQuestionImageUrl?: string;
}

const SCREEN_CHOICE_COLORS = [
  { badgeBg: 'bg-blue-600' }, { badgeBg: 'bg-red-600' },
  { badgeBg: 'bg-green-600' }, { badgeBg: 'bg-yellow-600' },
];

export function RevealingScreen({
  gameState, timeLimit, remainingSeconds, revealingPhase, currentQuestion, answerDistribution, correctAnswers, players,
  revealedPlayers, currentPrediction, currentAuthorName, animatedPredictedCount,
  animatedActualCount, predictionPoints, showPredictedCount, showActualCount,
  showPredictionBonus, revealReadyCount, revealReadyTotal, revealReadyPercent,
  room, questionStartTime, nextQuestionImageUrl
}: RevealingScreenProps) {
  return (
    <section className="h-full p-4 md:p-6 space-y-6 overflow-hidden">
      <GameProgressHeader
        isScreen={true}
        currentQuestionIndex={gameState.currentQuestionIndex}
        totalQuestions={gameState.totalQuestions}
        authorNickname={currentAuthorName}
        remainingSeconds={remainingSeconds}
        timeLimit={timeLimit}
        phase={gameState.phase ?? ''}
      />
      {revealingPhase === 'answer' && (
        <>
          <h2 className="text-5xl font-black text-center mb-8 italic">答え合わせ</h2>
          <div className="grid grid-cols-2 gap-4">
            {currentQuestion.choices.map((choice, index) => {
              const isCorrect = index === currentQuestion.correctAnswer;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 1 }}
                  animate={{
                    opacity: !isCorrect ? 0.1 : 1,
                    borderWidth: isCorrect ? '2px' : '1px'
                  }}
                  transition={{ duration: 0.3 }}
                  className={`
                    rounded-xl border p-3 md:p-4 min-h-24 text-base md:text-xl font-semibold flex items-center text-white 
                    ${isCorrect ? 'border-emerald-400 bg-slate-800/40' : 'border-slate-700 bg-slate-900/40'}
                  `}
                >
                  <span className={`
                    mr-3 inline-flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-full text-lg md:text-2xl font-black text-white 
                    ${SCREEN_CHOICE_COLORS[index].badgeBg}
                  `}>
                    {index + 1}
                  </span>
                  <span className="flex-1 font-mono tracking-tight">{choice}</span>

                  {/* 人数表示も控えめな計器風に */}
                  <div className="ml-3 font-mono text-xl text-slate-300">
                    👤{answerDistribution[index]}人
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {revealingPhase === 'ranking' && (
        <div className="space-y-6 animate-fade-in flex-1">
          <div className="text-center space-y-2 mb-4">
            <p className="text-lg font-bold uppercase tracking-[0.4em] text-blue-500/80">Result</p>
            <h3 className="text-5xl font-black text-white italic">正解者一覧</h3>
          </div>
          <RankingList
            correctAnswers={correctAnswers}
            players={players}
            revealedPlayers={revealedPlayers}
            questionStartTime={questionStartTime}
            correctAnswerPoints={room.correctAnswerPoints ?? 10}
            fastestAnswerBonusPoints={room.fastestAnswerBonusPoints ?? 10}
          />
        </div>
      )}

      {revealingPhase === 'prediction' && (
        <div className="space-y-10 animate-fade-in flex-1">
          <PredictionResultScreen
            prediction={currentPrediction}
            correctAnswerCount={correctAnswers.length}
            predictionPoints={predictionPoints}
            authorNickname={currentAuthorName}
            totalParticipants={players.length}
          />
          {showPredictionBonus && (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-4 py-3">
              <div className="flex items-center justify-between text-xl xl:text-2xl">
                <span className="text-slate-300">次の問題への準備状況</span>
                <span className="font-bold text-emerald-300">{revealReadyCount}/{revealReadyTotal}人</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-slate-700/80 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${revealReadyPercent}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
