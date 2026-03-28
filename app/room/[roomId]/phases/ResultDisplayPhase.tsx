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
import { PredictionResult, getPredictionHitStatus } from './components/PredictionResult';
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

import { ChoiceGrid } from '../components/ChoiceGrid';

export function ResultDisplayPhase({
  roomId, gameState, currentQuestion, players, answers, prediction,
  currentPlayerId, isReady, waitingForPlayers, handleNextQuestion,
  useScreenMode = false, correctAnswerPoints, fastestAnswerBonusPoints,
  wrongAnswerPenalty, predictionHitBonusPoints,
}: ResultDisplayPhaseProps) {
  const correctAnswers = useMemo(() => answers.filter(a => a.isCorrect).sort((a, b) => toMillis(a.answeredAt) - toMillis(b.answeredAt)), [answers]);
  const { stage, revealedPlayers, showNextButton } = useResultReveal(correctAnswers, true);
  const currentPlayer = players.find(p => p.playerId === currentPlayerId);
  const myAnswer = answers.find(a => a.playerId === currentPlayerId);
  const { reactionEffects, isReactionPanelOpen, setIsReactionPanelOpen, reactionPanelRef, reactionToggleButtonRef, handleSendReaction } = useReactions(roomId, currentPlayerId, currentPlayer?.nickname, currentQuestion.questionId);

  const nextControl = showNextButton && (
    <NextQuestionControl isReady={isReady} readyCount={gameState.playersReady?.length ?? 0} totalPlayers={players.length} allReady={(gameState.playersReady?.length ?? 0) >= players.length} waitingForPlayers={waitingForPlayers} isLastQuestion={gameState.currentQuestionIndex >= gameState.totalQuestions - 1} useScreenMode={useScreenMode} playersReady={gameState.playersReady || []} players={players} onNext={handleNextQuestion} />
  );

  if (useScreenMode) {
    const isAuthor = currentQuestion.authorId === currentPlayerId;
    return (
      <div className="space-y-6">
        <GameProgressHeader isScreen={true} currentQuestionIndex={gameState.currentQuestionIndex} totalQuestions={gameState.totalQuestions} authorNickname={players.find(p => p.playerId === currentQuestion.authorId)?.nickname} timeLimit={0} remainingSeconds={0} phase={gameState.phase ?? ''} />
        <div className="p-6 text-center"><h4 className="font-bold text-slate-200 text-2xl tracking-tight italic">結果はスクリーンで発表中！</h4></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-4">
          <p className="text-sm sm:text-base tracking-[0.2em] text-slate-300">あなたの結果</p>
          {/* 非作問者 */}
          {!isAuthor && myAnswer?.isCorrect && (
            <p className="text-3xl font-black text-emerald-400 italic">正解！</p>
          )}
          {!isAuthor && myAnswer && !myAnswer.isCorrect && (
            <p className="text-3xl font-black text-rose-400 italic">不正解</p>
          )}
          {!isAuthor && !myAnswer && (
            <p className="text-3xl font-black text-slate-400 italic">未回答</p>
          )}
          {/* 作問者 */}
          {isAuthor && prediction && (() => {
            const { isHit, isNear } = getPredictionHitStatus(
              prediction?.predictedCount,
              correctAnswers.length,
              players.length
            );
            if (isHit) {
              return <p className="text-3xl font-black text-emerald-400 italic">的中！</p>;
            } else if (isNear) {
              return <p className="text-3xl font-black text-yellow-400 italic">ニアピン！</p>;
            } else {
              return <p className="text-3xl font-black text-rose-400 italic">はずれ</p>;
            }
          })()}
          {isAuthor && !prediction && (
            <p className="text-xl font-bold text-blue-400 italic">未回答</p>
          )}
        </div>
        {nextControl}
        <ReactionTrigger isReactionPanelOpen={isReactionPanelOpen} setIsReactionPanelOpen={setIsReactionPanelOpen} reactionPanelRef={reactionPanelRef} reactionToggleButtonRef={reactionToggleButtonRef} handleSendReaction={handleSendReaction} />
        <ReactionOverlay effects={reactionEffects} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 min-h-[80vh] flex flex-col">
      <GameProgressHeader isScreen={false} currentQuestionIndex={gameState.currentQuestionIndex} totalQuestions={gameState.totalQuestions} authorNickname={players.find(p => p.playerId === currentQuestion.authorId)?.nickname} timeLimit={0} remainingSeconds={0} phase={gameState.phase ?? ''} />

      {/* 1. 答え合わせフェーズ：アニメーションを削除してシームレスに表示 */}
      {stage === 'choice' && (
        <div className="space-y-6 flex-1">
          <QuestionCard text={currentQuestion.text} imageUrl={currentQuestion.imageUrl} useScreenMode={useScreenMode} />
          <ChoiceGrid
            choices={currentQuestion.choices}
            selectedAnswer={myAnswer?.answer ?? null}
            onSelect={() => { }}
            useScreenMode={useScreenMode}
            disabled={true}
            correctAnswer={currentQuestion.correctAnswer}
            showResults={true}
          />
        </div>
      )}

      {/* 2. 正解者一覧フェーズ：上詰めに配置 */}
      {stage === 'scoreboard' && (
        <div className="space-y-6 animate-fade-in flex-1">
          <div className="text-center space-y-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-blue-500/80">Result</p>
            <h3 className="text-3xl font-black text-white italic">正解者一覧</h3>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-8 w-full">
            <ScoreBoard
              correctAnswers={correctAnswers}
              players={players}
              revealedPlayers={revealedPlayers}
              questionStartTime={toMillis(gameState.questionStartedAt)}
              correctAnswerPoints={correctAnswerPoints}
              fastestAnswerBonusPoints={fastestAnswerBonusPoints}
            />
          </div>
        </div>
      )}

      {/* 3. 予想チャレンジフェーズ：上詰めに配置 */}
      {stage === 'prediction' && (
        <div className="space-y-10 animate-fade-in flex-1">
          <PredictionResult
            prediction={prediction}
            correctAnswerCount={correctAnswers.length}
            predictionPoints={calculatePredictionPoints(prediction?.predictedCount ?? 0, correctAnswers.length, predictionHitBonusPoints)}
            authorNickname={players.find(p => p.playerId === currentQuestion.authorId)?.nickname || ''}
            totalParticipants={players.length}
          />
          {nextControl}
        </div>
      )}

      <ReactionTrigger isReactionPanelOpen={isReactionPanelOpen} setIsReactionPanelOpen={setIsReactionPanelOpen} reactionPanelRef={reactionPanelRef} reactionToggleButtonRef={reactionToggleButtonRef} handleSendReaction={handleSendReaction} />
      <ReactionOverlay effects={reactionEffects} />
    </div>
  );
}
