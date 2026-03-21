'use client';

import { useMemo } from 'react';
import type { Answer, Prediction, Question, Player, Room } from '@/types';
import { calculateCorrectAnswerPoints } from '@/lib/utils/roundScoring';
import { toTimestamp } from '../utils/screenUtils';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface RevealingScreenProps {
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
  revealingPhase, currentQuestion, answerDistribution, correctAnswers, players,
  revealedPlayers, currentPrediction, currentAuthorName, animatedPredictedCount,
  animatedActualCount, predictionPoints, showPredictedCount, showActualCount,
  showPredictionBonus, revealReadyCount, revealReadyTotal, revealReadyPercent,
  room, questionStartTime, nextQuestionImageUrl
}: RevealingScreenProps) {
  return (
    <section className="h-full p-4 md:p-6 space-y-6 overflow-hidden">
      {/* 次の問題の画像をプリロード */}
      {nextQuestionImageUrl && (
        <div className="hidden" aria-hidden="true">
          <Image 
            src={nextQuestionImageUrl} 
            alt="preload" 
            width={1400} 
            height={900} 
            priority={true}
          />
        </div>
      )}
      {revealingPhase === 'answer' && (
        <>
          <h2 className="text-3xl md:text-5xl font-black text-center mb-8">答え合わせ</h2>
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
                  <div className="ml-3 font-mono text-xs md:text-sm text-slate-400">
                    {answerDistribution[index]}P
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {revealingPhase === 'ranking' && (
        <>
          <h2 className="text-3xl md:text-5xl font-black text-center italic animate-fade-in">早押しランキング</h2>
          <div className="rounded-2xl border border-violet-400/40 bg-violet-500/10 px-5 py-4">
            <p className="text-sm md:text-base text-violet-200 mb-3">正解者一覧（先着順）</p>
            {correctAnswers.length === 0 ? <p className="text-slate-300">正解者なし</p> : (
              <div className="space-y-2">
                {correctAnswers.slice(0, 8).map((answer, index) => {
                  if (!revealedPlayers.includes(answer.playerId)) return null;
                  const player = players.find(p => p.playerId === answer.playerId);
                  const elapsedMs = Math.max(0, questionStartTime > 0 ? toTimestamp(answer.answeredAt) - questionStartTime : 0);
                  const timeDisplay = `${Math.floor(elapsedMs / 1000)}''${Math.floor((elapsedMs % 1000) / 10).toString().padStart(2, '0')}`;
                  const gainedPoints = calculateCorrectAnswerPoints({ correctAnswerPoints: room.correctAnswerPoints ?? 10, fastestAnswerBonusPoints: room.fastestAnswerBonusPoints ?? 10, isFastestCorrect: index === 0 });
                  return (
                    <div key={answer.playerId} className="flex items-center justify-between rounded-lg border border-violet-300/20 bg-slate-900/40 px-4 py-2 animate-fade-in">
                      <div className="flex items-center gap-6">
                        <span className={`font-bold ${index === 0 ? 'text-amber-300' : 'text-white'}`}>{index + 1}. {player?.nickname || 'unknown'}</span>
                        <span className="text-sm text-slate-300 italic">{timeDisplay}</span>
                      </div>
                      <span className="text-emerald-300 font-bold">+{gainedPoints}pt</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {revealingPhase === 'prediction' && (
        <>
          <h2 className="text-3xl md:text-5xl font-black text-center italic animate-fade-in">予想チャレンジ結果</h2>
          <div className="rounded-2xl border border-violet-300/35 bg-violet-500/10 px-3 py-4 md:px-7 md:py-6 animate-fade-in">
            {currentPrediction ? (
              <div className="space-y-4">
                <p className="text-lg md:text-2xl text-slate-100 text-center">作問者: <span className="font-bold text-white">{currentAuthorName}</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-end">
                  <div className={`rounded-xl border border-violet-300/25 bg-slate-900/35 p-4 transition-all duration-700 ${showPredictedCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <p className="text-base md:text-xl text-violet-100">予想した正解者数</p>
                    <p className="mt-2 text-5xl md:text-6xl font-black text-white tabular-nums leading-none">{showPredictedCount ? animatedPredictedCount : '-'}<span className="ml-2 text-2xl md:text-3xl font-bold text-slate-200">人</span></p>
                  </div>
                  <div className={`rounded-xl border border-violet-300/25 bg-slate-900/35 p-4 transition-all duration-700 ${showActualCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <p className="text-base md:text-xl text-violet-100">実際の正解者数</p>
                    <p className="mt-2 text-5xl md:text-6xl font-black text-emerald-200 tabular-nums leading-none">{showActualCount ? animatedActualCount : '-'}<span className="ml-2 text-2xl md:text-3xl font-bold text-slate-200">人</span></p>
                  </div>
                </div>
                <div className={`rounded-xl border border-slate-500/40 bg-slate-900/30 p-4 transition-all duration-700 text-center ${showPredictionBonus ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="text-lg md:text-xl text-slate-300">予想ボーナス</p>
                  <p className={`mt-2 text-3xl md:text-4xl font-black ${predictionPoints > 0 ? 'text-amber-200' : 'text-slate-300'}`}>+{predictionPoints}pt</p>
                </div>
              </div>
            ) : <p className="text-slate-300">作問者の予想結果を集計中です...</p>}
          </div>
          {showPredictionBonus && (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-4 py-3">
              <div className="flex items-center justify-between text-sm md:text-base">
                <span className="text-slate-300">次の問題への準備状況</span>
                <span className="font-bold text-emerald-300">{revealReadyCount}/{revealReadyTotal}人</span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-slate-700/80 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${revealReadyPercent}%` }} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
