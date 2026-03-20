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

  // 待機画面（シンプル版）
  if (waitingForPlayers) {
    const playersReady = gameState.playersReady || [];

    return (
      <div className="flex items-center justify-center min-h-[90vh]">
        <div className="text-center">
          <p className="text-slate-300 text-sm">
            プレイヤーを待機しています... {playersReady.length}/{players.length}
          </p>
        </div>
      </div>
    );
  }

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

        {/* 回答フォーム（出題者以外） */}
        {!isAuthor && (
          <div className="space-y-6">
            <ChoiceGrid
              choices={currentQuestion.choices}
              selectedAnswer={selectedAnswer}
              onSelect={setSelectedAnswer}
              useScreenMode={useScreenMode}
            />
            <button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null || hasSubmittedAnswer}
              className="
                w-full
                bg-gradient-to-r from-blue-600 to-blue-700 disabled:from-slate-600 disabled:to-slate-700
                text-white font-semibold py-4 sm:py-5 px-6 rounded-md shadow-lg
                transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed text-base sm:text-lg
              "
            >
              {hasSubmittedAnswer ? '回答済み' : '回答を送信'}
            </button>
          </div>
        )}

        {/* 予想フォーム（出題者のみ） */}
        {isAuthor && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <label className="block text-sm text-slate-300 mb-4 font-medium text-center">
                正解者数を予想してください（0〜{otherPlayersCount}人）
              </label>
              <input
                type="number"
                min="0"
                max={otherPlayersCount}
                value={predictedCorrectCount}
                onChange={(e) => setPredictedCorrectCount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-white text-center text-2xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {useScreenMode && (
                <p className="text-xs text-slate-400 text-center mt-3">
                  問題文はスクリーンに表示されています
                </p>
              )}
            </div>
            <button
              onClick={handlePredictionSubmit}
              disabled={isAuthor && hasSubmittedPrediction}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-6 rounded-md shadow-lg disabled:cursor-not-allowed"
            >
              {isAuthor && hasSubmittedPrediction ? '予想済み' : '予想を送信'}
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

