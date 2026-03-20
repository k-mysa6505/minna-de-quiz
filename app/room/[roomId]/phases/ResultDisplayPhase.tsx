'use client';

import { useMemo } from 'react';
import { calculatePredictionPoints, toMillis } from '@/lib/utils/roundScoring';
import type { Player, Answer, GameState, Question } from '@/types';
import { ReactionOverlay } from '../components/ReactionOverlay';
import { ReactionTrigger } from '../components/ReactionTrigger';
import { useReactions } from '../hooks/useReactions';
import { useResultReveal } from '../hooks/useResultReveal';
import { GameProgressHeader } from '../components/GameProgressHeader';
import { QuestionCard } from '../components/QuestionCard';
import { ScoreBoard } from './components/ScoreBoard';
import { PredictionResult } from './components/PredictionResult';
import { NextQuestionControl } from './components/NextQuestionControl';

interface ResultDisplayPhaseProps {
  roomId: string; gameState: GameState; currentQuestion: Question; players: Player[];
  answers: Answer[]; prediction: { predictedCount: number; isCorrect: boolean } | null;
  currentPlayerId: string; isReady: boolean; waitingForPlayers: boolean;
  handleNextQuestion: () => void; useScreenMode?: boolean; correctAnswerPoints: number;
  fastestAnswerBonusPoints: number; wrongAnswerPenalty: number; predictionHitBonusPoints: number;
}

const CHOICE_COLORS = [
  { bg: 'bg-blue-600/70', border: 'border-blue-500/70' }, { bg: 'bg-red-600/70', border: 'border-red-500/70' },
  { bg: 'bg-green-600/70', border: 'border-green-500/70' }, { bg: 'bg-yellow-600/70', border: 'border-yellow-500/70' },
];

export function ResultDisplayPhase({
  roomId, gameState, currentQuestion, players, answers, prediction,
  currentPlayerId, isReady, waitingForPlayers, handleNextQuestion,
  useScreenMode = false, correctAnswerPoints, fastestAnswerBonusPoints,
  wrongAnswerPenalty, predictionHitBonusPoints,
}: ResultDisplayPhaseProps) {
  const correctAnswers = useMemo(() => answers.filter(a => a.isCorrect).sort((a,b) => toMillis(a.answeredAt) - toMillis(b.answeredAt)), [answers]);
  const { revealedPlayers, showPredictionResult, showNextButton } = useResultReveal(correctAnswers, true);
  const currentPlayer = players.find(p => p.playerId === currentPlayerId);
  const { reactionEffects, isReactionPanelOpen, setIsReactionPanelOpen, reactionPanelRef, reactionToggleButtonRef, handleSendReaction } = useReactions(roomId, currentPlayerId, currentPlayer?.nickname, currentQuestion.questionId);

  const nextControl = showNextButton && (
    <NextQuestionControl isReady={isReady} readyCount={gameState.playersReady?.length ?? 0} totalPlayers={players.length} allReady={(gameState.playersReady?.length ?? 0) >= players.length} waitingForPlayers={waitingForPlayers} isLastQuestion={gameState.currentQuestionIndex >= gameState.totalQuestions - 1} useScreenMode={useScreenMode} playersReady={gameState.playersReady || []} players={players} onNext={handleNextQuestion} />
  );

  if (useScreenMode) {
    const myAnswer = answers.find(a => a.playerId === currentPlayerId);
    const isAuthor = currentQuestion.authorId === currentPlayerId;
    return (
      <div className="space-y-6">
        <div className="p-6 text-center"><h4 className="font-bold text-white text-2xl">結果はスクリーンで発表中！</h4></div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-300 mb-2">あなたの結果</p>
          {!isAuthor && myAnswer?.isCorrect && <p className="text-2xl font-black text-emerald-300">正解</p>}
          {!isAuthor && myAnswer && !myAnswer.isCorrect && <p className="text-2xl font-black text-rose-300">不正解</p>}
          {isAuthor && <p className="text-xl font-bold text-violet-300">予想結果を確認中</p>}
        </div>
        {nextControl}
        <ReactionTrigger isReactionPanelOpen={isReactionPanelOpen} setIsReactionPanelOpen={setIsReactionPanelOpen} reactionPanelRef={reactionPanelRef} reactionToggleButtonRef={reactionToggleButtonRef} handleSendReaction={handleSendReaction} />
        <ReactionOverlay effects={reactionEffects} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GameProgressHeader currentQuestionIndex={gameState.currentQuestionIndex} totalQuestions={gameState.totalQuestions} authorNickname={players.find(p => p.playerId === currentQuestion.authorId)?.nickname} timeLimit={0} remainingSeconds={0} phase={gameState.phase ?? ''} />
      {!showPredictionResult && revealedPlayers.length === 0 ? (
        <div className="space-y-6">
          <QuestionCard text={currentQuestion.text} imageUrl={currentQuestion.imageUrl} useScreenMode={useScreenMode} />
          <div className="space-y-6">
            <div className="grid gap-3 grid-cols-2 sm:gap-4">
              {currentQuestion.choices.map((c, i) => (
                <div key={i} className={`relative p-6 rounded-xl border-4 font-bold text-lg min-h-[120px] flex flex-col items-center justify-center ${i === currentQuestion.correctAnswer ? `${CHOICE_COLORS[i].bg} ${CHOICE_COLORS[i].border} shadow-2xl scale-105` : 'bg-slate-800/30 border-slate-700/50 opacity-40'} text-white`}>
                  <div className="text-sm opacity-80 mb-2">{i+1}</div><div className="text-center">{c}</div>
                  {i === currentQuestion.correctAnswer && <div className="absolute top-2 right-2 text-3xl">✓</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-xl border border-slate-700/50 p-6">
            <p className="text-sm text-slate-300 mb-3 text-center">正解者一覧</p>
            <ScoreBoard correctAnswers={correctAnswers} players={players} revealedPlayers={revealedPlayers} questionStartTime={toMillis(gameState.questionStartedAt)} correctAnswerPoints={correctAnswerPoints} fastestAnswerBonusPoints={fastestAnswerBonusPoints} />
          </div>
          {showPredictionResult && <PredictionResult prediction={prediction} correctAnswerCount={correctAnswers.length} predictionPoints={calculatePredictionPoints(prediction?.predictedCount ?? 0, correctAnswers.length, predictionHitBonusPoints)} authorNickname={players.find(p => p.playerId === currentQuestion.authorId)?.nickname || ''} />}
          {nextControl}
        </div>
      )}
      <ReactionTrigger isReactionPanelOpen={isReactionPanelOpen} setIsReactionPanelOpen={setIsReactionPanelOpen} reactionPanelRef={reactionPanelRef} reactionToggleButtonRef={reactionToggleButtonRef} handleSendReaction={handleSendReaction} />
      <ReactionOverlay effects={reactionEffects} />
    </div>
  );
}
