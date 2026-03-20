// app/room/[roomId]/GamePlayPhase.tsx
'use client';

import { useGamePlay } from '../hooks/useGamePlay';
import { ResultDisplayPhase } from './ResultDisplayPhase';
import { useReactions } from '../hooks/useReactions';
import { useTimer } from '../hooks/useTimer';
import type { Player } from '@/types';
import LoadingSpinner from '@/app/common/LoadingSpinner';
import { ReactionOverlay } from '../components/ReactionOverlay';
import { ReactionTrigger } from '../components/ReactionTrigger';
import { GameProgressHeader } from '../components/GameProgressHeader';
import { QuestionCard } from '../components/QuestionCard';
import { ChoiceGrid } from '../components/ChoiceGrid';

interface GamePlayPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  useScreenMode: boolean;
  timeLimit: number;
  correctAnswerPoints: number;
  fastestAnswerBonusPoints: number;
  wrongAnswerPenalty: number;
  predictionHitBonusPoints: number;
}

export function GamePlayPhase({
  roomId,
  players,
  currentPlayerId,
  useScreenMode,
  timeLimit,
  correctAnswerPoints,
  fastestAnswerBonusPoints,
  wrongAnswerPenalty,
  predictionHitBonusPoints,
}: GamePlayPhaseProps) {
  const {
    gameState,
    currentQuestion,
    selectedAnswer,
    setSelectedAnswer,
    predictedCorrectCount,
    setPredictedCorrectCount,
    hasSubmittedAnswer,
    hasSubmittedPrediction,
    showResults,
    answers,
    currentAnswerCount,
    prediction,
    isReady,
    waitingForPlayers,
    handleAnswerSubmit,
    handlePredictionSubmit,
    handleNextQuestion,
  } = useGamePlay(
    roomId,
    currentPlayerId,
    players,
    timeLimit,
    correctAnswerPoints,
    fastestAnswerBonusPoints,
    wrongAnswerPenalty,
    predictionHitBonusPoints
  );

  const currentPlayer = players.find((p) => p.playerId === currentPlayerId);
  
  // Use custom hooks
  const {
    reactionEffects,
    isReactionPanelOpen,
    setIsReactionPanelOpen,
    reactionPanelRef,
    reactionToggleButtonRef,
    handleSendReaction,
  } = useReactions(roomId, currentPlayerId, currentPlayer?.nickname, currentQuestion?.questionId);

  const remainingSeconds = useTimer(
    gameState?.questionStartedAt,
    timeLimit,
    gameState?.phase === 'answering'
  );

  if (!gameState || !currentQuestion) {
    return <LoadingSpinner message="読み込み中..." />;
  }

  const isAuthor = currentQuestion.authorId === currentPlayerId;
  const otherPlayersCount = players.length - 1;

  // 結果表示フェーズ
  if (showResults) {
    return (
      <ResultDisplayPhase
        roomId={roomId}
        gameState={gameState}
        currentQuestion={currentQuestion}
        players={players}
        answers={answers}
        prediction={prediction}
        currentPlayerId={currentPlayerId}
        isReady={isReady}
        waitingForPlayers={waitingForPlayers}
        handleNextQuestion={handleNextQuestion}
        useScreenMode={useScreenMode}
        correctAnswerPoints={correctAnswerPoints}
        fastestAnswerBonusPoints={fastestAnswerBonusPoints}
        wrongAnswerPenalty={wrongAnswerPenalty}
        predictionHitBonusPoints={predictionHitBonusPoints}
      />
    );
  }

  return (
    <>
      {/* 1px Minimal Timer Line */}
      {timeLimit > 0 && gameState.phase === 'answering' && (
        <div className="fixed top-0 left-0 w-full h-[4px] z-[100] bg-white/5">
          <div 
            className={`h-full transition-all duration-300 ease-linear shadow-[0_0_12px_rgba(255,255,255,0.3)] ${
              remainingSeconds <= 5 ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${(remainingSeconds / timeLimit) * 100}%` }}
          />
        </div>
      )}

      <div className="space-y-6">
        <GameProgressHeader
          currentQuestionIndex={gameState.currentQuestionIndex}
          totalQuestions={gameState.totalQuestions}
          authorNickname={players.find(p => p.playerId === currentQuestion.authorId)?.nickname}
          timeLimit={timeLimit}
          remainingSeconds={remainingSeconds}
          phase={gameState.phase ?? ''}
        />

        <QuestionCard
          text={currentQuestion.text}
          imageUrl={currentQuestion.imageUrl}
          useScreenMode={useScreenMode}
        />

        {/* 回答エリア（出題者以外） */}
        {!isAuthor && (
          <div className="space-y-6">
            <ChoiceGrid
              choices={currentQuestion.choices}
              selectedAnswer={selectedAnswer}
              onSelect={setSelectedAnswer}
              useScreenMode={useScreenMode}
              disabled={hasSubmittedAnswer}
              showResults={false}
            />

            <button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null || hasSubmittedAnswer}
              className={`
                w-full font-bold py-4 sm:py-5 px-6 rounded-md shadow-lg transition-all duration-300 text-base sm:text-lg
                ${hasSubmittedAnswer 
                  ? 'bg-slate-800 text-slate-500 cursor-default border border-white/5' 
                  : selectedAnswer === null 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white active:scale-95'
                }
              `}
            >
              {hasSubmittedAnswer ? '回答を送信しました' : '回答を送信'}
            </button>

            {hasSubmittedAnswer && (
              <div className="text-center pt-2">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest animate-pulse">
                  Waiting for others... {currentAnswerCount} / {players.length}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 予想フォーム（出題者のみ） */}
        {isAuthor && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-8 border border-white/10">
              <label className="block text-xs font-bold text-slate-500 mb-6 uppercase tracking-[0.2em] text-center">
                正解者数を予想
              </label>
              <div className="flex items-center justify-center gap-4">
                <input
                  type="number"
                  min="0"
                  max={otherPlayersCount}
                  value={predictedCorrectCount}
                  onChange={(e) => setPredictedCorrectCount(parseInt(e.target.value) || 0)}
                  disabled={hasSubmittedPrediction}
                  className="w-24 px-4 py-3 bg-white/5 border border-white/10 rounded-md text-white text-center text-4xl font-black font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                />
                <span className="text-xl font-bold text-slate-400">人</span>
              </div>
            </div>
            <button
              onClick={handlePredictionSubmit}
              disabled={hasSubmittedPrediction}
              className={`
                w-full font-bold py-4 px-6 rounded-md shadow-lg transition-all duration-300
                ${hasSubmittedPrediction
                  ? 'bg-slate-800 text-slate-500 cursor-default border border-white/5'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white active:scale-95'
                }
              `}
            >
              {hasSubmittedPrediction ? '予想を送信しました' : '予想を送信'}
            </button>
          </div>
        )}

        {currentPlayer && (
          <ReactionTrigger
            isReactionPanelOpen={isReactionPanelOpen}
            setIsReactionPanelOpen={setIsReactionPanelOpen}
            reactionPanelRef={reactionPanelRef}
            reactionToggleButtonRef={reactionToggleButtonRef}
            handleSendReaction={handleSendReaction}
          />
        )}

      </div>
      <ReactionOverlay effects={reactionEffects} />
    </>
  );
}

