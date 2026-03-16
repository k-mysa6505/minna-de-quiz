// app/room/[roomId]/components/ResultDisplayPhase.tsx
'use client';

import { useEffect, useMemo } from 'react';
import {
  calculateCorrectAnswerPoints,
  calculatePredictionPoints,
} from '@/lib/utils/roundScoring';
import type { Player, Answer, GameState, Question } from '@/types';
import { ReactionOverlay } from './ReactionOverlay';
import { ReactionTrigger } from './ReactionTrigger';
import { useReactions } from '../hooks/useReactions';
import { useResultReveal } from '../hooks/useResultReveal';
import { GameProgressHeader } from './ui/GameProgressHeader';

interface ResultDisplayPhaseProps {
  roomId: string;
  gameState: GameState;
  currentQuestion: Question;
  players: Player[];
  answers: Answer[];
  prediction: { predictedCount: number; isCorrect: boolean } | null;
  currentPlayerId: string;
  isReady: boolean;
  waitingForPlayers: boolean;
  handleNextQuestion: () => void;
  useScreenMode?: boolean;
  correctAnswerPoints: number;
  fastestAnswerBonusPoints: number;
  wrongAnswerPenalty: number;
  predictionHitBonusPoints: number;
}

const CHOICE_COLORS = [
  { bg: 'bg-blue-600/70', border: 'border-blue-500/70', text: 'text-white' },
  { bg: 'bg-red-600/70', border: 'border-red-500/70', text: 'text-white' },
  { bg: 'bg-green-600/70', border: 'border-green-500/70', text: 'text-white' },
  { bg: 'bg-yellow-600/70', border: 'border-yellow-500/70', text: 'text-white' },
];

function toTimestamp(value: unknown): number {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  return 0;
}

function sortCorrectAnswers(answers: Answer[]): Answer[] {
  const sorted = answers
    .filter((answer) => answer.isCorrect)
    .sort((a, b) => toTimestamp(a.answeredAt) - toTimestamp(b.answeredAt));

  const seen = new Set<string>();
  return sorted.filter((answer) => {
    if (seen.has(answer.playerId)) return false;
    seen.add(answer.playerId);
    return true;
  });
}

export function ResultDisplayPhase({
  roomId,
  gameState,
  currentQuestion,
  players,
  answers,
  prediction,
  currentPlayerId,
  isReady,
  waitingForPlayers,
  handleNextQuestion,
  useScreenMode = false,
  correctAnswerPoints,
  fastestAnswerBonusPoints,
  wrongAnswerPenalty,
  predictionHitBonusPoints,
}: ResultDisplayPhaseProps) {
  const correctAnswers = useMemo(() => sortCorrectAnswers(answers), [answers]);
  const correctAnswerCount = correctAnswers.length;
  const questionStartTime = useMemo(() => toTimestamp(gameState.questionStartedAt), [gameState.questionStartedAt]);
  
  const { revealedPlayers, showPredictionResult, showNextButton } = useResultReveal(correctAnswers, true);

  const currentPlayer = players.find((p) => p.playerId === currentPlayerId);
  const {
    reactionEffects,
    isReactionPanelOpen,
    setIsReactionPanelOpen,
    reactionPanelRef,
    reactionToggleButtonRef,
    handleSendReaction,
  } = useReactions(roomId, currentPlayerId, currentPlayer?.nickname, currentQuestion.questionId);

  const predictionPoints = useMemo(() => {
    if (!prediction) return 0;
    return calculatePredictionPoints(prediction.predictedCount, correctAnswerCount, predictionHitBonusPoints);
  }, [prediction, correctAnswerCount, predictionHitBonusPoints]);

  const playersReady = gameState.playersReady || [];
  const readyCount = playersReady.length;
  const totalPlayers = players.length;
  const allReady = readyCount >= totalPlayers && totalPlayers > 0;

  const myAnswer = answers.find((answer) => answer.playerId === currentPlayerId);
  const isAuthor = currentQuestion.authorId === currentPlayerId;

  const nextButton = showNextButton && (
    <div className="space-y-4">
      <button
        onClick={handleNextQuestion}
        disabled={allReady}
        className={`
          w-full font-bold py-4 sm:py-5 px-6 rounded-md shadow-lg transition-all duration-300 text-base sm:text-lg
          ${isReady
            ? 'bg-green-600 text-white cursor-default'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
          }
          ${allReady ? 'opacity-75 cursor-not-allowed' : ''}
        `}
      >
        {allReady ? (
          <div className="flex items-center justify-center gap-2">
            <span>全員準備完了 - 自動で進みます...</span>
            <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
          </div>
        ) : isReady ? (
          <div className="flex items-center justify-center gap-2">
            <span>準備完了 - 他のプレイヤーを待っています...</span>
            {waitingForPlayers && (
              <div className="animate-pulse h-2 w-2 bg-yellow-400 rounded-full"></div>
            )}
          </div>
        ) : (
          `準備完了 (${gameState.currentQuestionIndex >= gameState.totalQuestions - 1 ? '結果を見る' : '次の問題へ'})`
        )}
      </button>

      <div className="py-2">
        <div className="flex justify-center items-center">
          <span className="text-sm text-slate-300">準備完了：</span>
          <span className={`font-bold text-lg ${allReady ? 'text-green-400' : 'text-yellow-400'}`}>
            {readyCount}/{totalPlayers}人
          </span>
        </div>
        {useScreenMode && !allReady && readyCount > 0 && (
          <p className="text-center text-xs text-slate-400 italic mt-2">
            あと{totalPlayers - readyCount}人が準備完了すると自動で進みます
          </p>
        )}
      </div>
    </div>
  );

  if (useScreenMode) {
    return (
      <>
        <div className="space-y-6">
          <div className="p-6 sm:p-8 text-center">
            <h4 className="font-bold text-white text-2xl sm:text-3xl">結果はスクリーンで発表中！</h4>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 sm:p-8 text-center">
            <p className="text-sm text-slate-300 mb-2">あなたの結果</p>
            {!isAuthor && myAnswer?.isCorrect && (
              <p className="text-2xl sm:text-3xl font-black text-emerald-300">正解（加点あり）</p>
            )}
            {!isAuthor && myAnswer && !myAnswer.isCorrect && (
              <p className="text-2xl sm:text-3xl font-black text-rose-300">
                不正解{wrongAnswerPenalty > 0 ? `（-${wrongAnswerPenalty}pt）` : ''}
              </p>
            )}
            {isAuthor && prediction && (
              <p className="text-xl sm:text-2xl font-bold text-violet-300">作問者の予想結果をスクリーンで確認中</p>
            )}
            {isAuthor && !prediction && (
              <p className="text-xl sm:text-2xl font-bold text-slate-200">作問者として待機中</p>
            )}
            {!isAuthor && !myAnswer && (
              <p className="text-xl sm:text-2xl font-bold text-slate-200">判定待ち...</p>
            )}
          </div>
          {nextButton}
        </div>
        <ReactionTrigger
          isReactionPanelOpen={isReactionPanelOpen}
          setIsReactionPanelOpen={setIsReactionPanelOpen}
          reactionPanelRef={reactionPanelRef}
          reactionToggleButtonRef={reactionToggleButtonRef}
          handleSendReaction={handleSendReaction}
        />
        <ReactionOverlay effects={reactionEffects} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <GameProgressHeader
          currentQuestionIndex={gameState.currentQuestionIndex}
          totalQuestions={gameState.totalQuestions}
          authorNickname={players.find(p => p.playerId === currentQuestion.authorId)?.nickname}
          timeLimit={0}
          remainingSeconds={0}
          phase={gameState.phase}
        />

        {!showPredictionResult && revealedPlayers.length === 0 ? (
          <div className="space-y-6">
            <h4 className="font-bold text-white text-2xl text-center italic">ANSWER</h4>
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.choices.map((choice, index) => {
                const isCorrect = index === currentQuestion.correctAnswer;
                const colors = CHOICE_COLORS[index];
                return (
                  <div
                    key={index}
                    className={`
                      relative p-6 rounded-xl border-4 font-bold text-lg min-h-[120px] flex flex-col items-center justify-center transition-all
                      ${isCorrect ? `${colors.bg} ${colors.border} shadow-2xl scale-105` : 'bg-slate-800/30 border-slate-700/50 opacity-40'}
                      ${colors.text}
                    `}
                  >
                    <div className="text-sm opacity-80 mb-2">{index + 1}</div>
                    <div className="break-words text-center">{choice}</div>
                    {isCorrect && <div className="absolute top-2 right-2 text-3xl">✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h4 className="font-bold text-white text-2xl text-center italic">SCORE</h4>
            <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-xl border border-slate-700/50 p-6 space-y-3">
              <p className="text-sm text-slate-300 mb-3 text-center">正解者一覧</p>
              {correctAnswerCount === 0 ? (
                <div className="text-center text-slate-400 italic py-4">正解者なし</div>
              ) : (
                correctAnswers.map((answer, idx) => {
                  const player = players.find((p) => p.playerId === answer.playerId);
                  const isRevealed = revealedPlayers.includes(answer.playerId);
                  if (!isRevealed) return null;

                  const answerTime = toTimestamp(answer.answeredAt);
                  const elapsedMs = questionStartTime > 0 ? answerTime - questionStartTime : 0;
                  const timeDisplay = `${Math.floor(elapsedMs / 1000)}''${Math.floor((elapsedMs % 1000) / 10).toString().padStart(2, '0')}`;
                  const gainedPoints = calculateCorrectAnswerPoints({
                    correctAnswerPoints,
                    fastestAnswerBonusPoints,
                    isFastestCorrect: idx === 0,
                  });

                  return (
                    <div key={`${answer.playerId}-${answerTime}`} className="flex justify-between items-center px-4 py-1 animate-fade-in">
                      <div className="flex items-center gap-10">
                        <span className={`font-bold text-lg ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>
                          {idx + 1}．{player?.nickname || 'unknown'}
                        </span>
                        <span className="text-ms text-slate-300 italic">{timeDisplay}</span>
                      </div>
                      <span className="text-emerald-400 font-bold">+{gainedPoints}pt</span>
                    </div>
                  );
                })
              )}
            </div>

            {showPredictionResult && (
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/30 rounded-xl border border-purple-600/50 p-6 animate-fade-in">
                <p className="text-sm text-purple-300 mb-3 text-center">出題者の予想</p>
                {prediction ? (
                  <div className="flex justify-between items-center px-4 py-1">
                    <div className="flex items-center gap-10">
                      <p className="text-white font-bold">
                        {players.find(p => p.playerId === currentQuestion.authorId)?.nickname || 'unknown'}
                      </p>
                      <p className="text-sm text-slate-300 italic">予想: {prediction.predictedCount}人 / 実際: {correctAnswerCount}人</p>
                    </div>
                    <span className={predictionPoints > 0 ? 'text-emerald-400 font-bold' : 'text-gray-400 font-bold'}>+{predictionPoints}pt</span>
                  </div>
                ) : (
                  <p className="text-center text-slate-300 italic py-2">予想結果を集計中です...</p>
                )}
              </div>
            )}

            {showNextButton && (
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">準備完了</span>
                    <span className={`font-bold text-lg ${allReady ? 'text-green-400' : 'text-yellow-400'}`}>{readyCount}/{totalPlayers}人</span>
                  </div>
                  {readyCount > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-xs text-slate-400 mb-2">準備完了プレイヤー:</div>
                      <div className="flex flex-wrap gap-2">
                        {playersReady.map(playerId => (
                          <span key={playerId} className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded border border-green-600/30">
                            {players.find(p => p.playerId === playerId)?.nickname || 'unknown'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {nextButton}
                {!allReady && readyCount > 0 && (
                  <p className="text-center text-sm text-slate-400 italic">あと{totalPlayers - readyCount}人が準備完了すると自動で進みます</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <ReactionTrigger
        isReactionPanelOpen={isReactionPanelOpen}
        setIsReactionPanelOpen={setIsReactionPanelOpen}
        reactionPanelRef={reactionPanelRef}
        reactionToggleButtonRef={reactionToggleButtonRef}
        handleSendReaction={handleSendReaction}
      />
      <ReactionOverlay effects={reactionEffects} />
    </>
  );
}

