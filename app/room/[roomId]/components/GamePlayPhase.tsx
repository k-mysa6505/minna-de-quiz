// app/room/[roomId]/components/GamePlayPhase.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useGamePlay } from '../hooks/useGamePlay';
import { ResultDisplayPhase } from './ResultDisplayPhase';
import { sendRoomReaction, subscribeToRoomReactions, type RoomReaction } from '@/lib/services/reactionService';
import { toMillis } from '@/lib/utils/roundScoring';
import type { Player } from '@/types';
import LoadingSpinner from '@/app/common/LoadingSpinner';
import { ReactionOverlay, type LocalReactionEffect } from './ReactionOverlay';

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

function ReactionTriggerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
    >
      <path d="M4 12.5L14.5 8V16.5L4 12.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14.5 10.5V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 13L8.5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.5 9.5C18.6 10.4 19.2 11.6 19.2 12.8C19.2 14 18.6 15.2 17.5 16.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.6 7.8C21.1 9.1 22 10.9 22 12.8C22 14.7 21.1 16.5 19.6 17.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const CHOICE_COLORS = [
  {
    bg: 'bg-blue-600/70',
    hover: 'hover:bg-blue-600/80',
    border: 'border-blue-500/70',
    selected: 'bg-blue-500/50 border-blue-400/80',
    text: 'text-white'
  },
  {
    bg: 'bg-red-600/70',
    hover: 'hover:bg-red-600/80',
    border: 'border-red-500/70',
    selected: 'bg-red-500/50 border-red-400/80',
    text: 'text-white'
  },
  {
    bg: 'bg-green-600/70',
    hover: 'hover:bg-green-600/80',
    border: 'border-green-500/70',
    selected: 'bg-green-500/50 border-green-400/80',
    text: 'text-white'
  },
  {
    bg: 'bg-yellow-600/70',
    hover: 'hover:bg-yellow-600/80',
    border: 'border-yellow-500/70',
    selected: 'bg-yellow-500/50 border-yellow-400/80',
    text: 'text-white'
  },
];

const REACTION_STAMPS = ['👏', '🔥', '😆', '😱', '🤯', '🎉'];
const QUICK_MESSAGES = ['難しい！', '天才か？', 'ドボンw', 'いい問題！'];
const REACTION_EFFECT_DURATION_MS = 2700;

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

  const currentPlayer = players.find((player) => player.playerId === currentPlayerId);
  const [lastReactionAt, setLastReactionAt] = useState(0);
  const [reactionEffects, setReactionEffects] = useState<LocalReactionEffect[]>([]);
  const [isReactionPanelOpen, setIsReactionPanelOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const reactionPanelRef = useRef<HTMLDivElement | null>(null);
  const reactionToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasInitialReactionSnapshotRef = useRef(false);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  const showReactionEffect = (reaction: Pick<RoomReaction, 'content' | 'userName' | 'type'>, eventTimestamp = Date.now()) => {
    const effectId = eventTimestamp + Math.random();
    setReactionEffects((prev) => [
      ...prev,
      {
        id: effectId,
        content: reaction.content,
        senderName: reaction.userName,
        type: reaction.type,
      },
    ]);
    setTimeout(() => {
      setReactionEffects((prev) => prev.filter((effect) => effect.id !== effectId));
    }, REACTION_EFFECT_DURATION_MS);
  };

  useEffect(() => {
    hasInitialReactionSnapshotRef.current = false;
    seenReactionIdsRef.current = new Set();

    const unsubscribeReactions = subscribeToRoomReactions(roomId, (nextReactions) => {
      if (!hasInitialReactionSnapshotRef.current) {
        seenReactionIdsRef.current = new Set(nextReactions.map((reaction) => reaction.id));
        hasInitialReactionSnapshotRef.current = true;
        return;
      }

      const newReactions = [...nextReactions]
        .reverse()
        .filter((reaction) => !seenReactionIdsRef.current.has(reaction.id));

      for (const reaction of newReactions) {
        seenReactionIdsRef.current.add(reaction.id);
        if (reaction.userId === currentPlayerId) {
          continue;
        }
        showReactionEffect(reaction);
      }
    });

    return () => {
      unsubscribeReactions();
    };
  }, [roomId, currentPlayerId]);

  useEffect(() => {
    if (!isReactionPanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (reactionPanelRef.current?.contains(target) || reactionToggleButtonRef.current?.contains(target)) {
        return;
      }
      setIsReactionPanelOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isReactionPanelOpen]);

  useEffect(() => {
    if (timeLimit <= 0) {
      setRemainingSeconds(0);
      return;
    }

    if (gameState?.phase !== 'answering') {
      return;
    }

    const startedAtMs = toMillis(gameState.questionStartedAt);
    if (startedAtMs <= 0) {
      return;
    }

    const tick = () => {
      const deadlineMs = startedAtMs + timeLimit * 1000;
      const remainMs = Math.max(0, deadlineMs - Date.now());
      setRemainingSeconds(Math.ceil(remainMs / 1000));
    };

    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [gameState?.phase, gameState?.questionStartedAt, timeLimit]);

  const handleSendReaction = async (
    type: 'reaction' | 'message',
    content: string,
    eventTimestamp: number
  ) => {
    if (eventTimestamp - lastReactionAt < 1000 || !currentPlayer) {
      return;
    }

    setLastReactionAt(eventTimestamp);
    try {
      await sendRoomReaction({
        roomId,
        userId: currentPlayerId,
        userName: currentPlayer.nickname,
        type,
        content,
        questionId: currentQuestion?.questionId,
      });

      showReactionEffect(
        {
          content,
          userName: currentPlayer.nickname,
          type,
        },
        eventTimestamp
      );
      setIsReactionPanelOpen(false);
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  };

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
        {/* 進捗表示 */}
        <div className="flex justify-between px-3 items-center text-slate-200">
          <p>問題 {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}</p>
          <div className="flex items-center gap-3">
            {timeLimit > 0 && gameState.phase === 'answering' && (
              <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${remainingSeconds <= 5 ? 'bg-red-500/30 text-red-200 border border-red-400/50' : 'bg-slate-700/60 text-slate-100 border border-slate-500/50'}`}>
                {remainingSeconds}s
              </span>
            )}
            <p className="italic">
              作問者：{players.find(p => p.playerId === currentQuestion.authorId)?.nickname || 'unknown'}
            </p>
          </div>
        </div>

        {!useScreenMode && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 space-y-6">
            <h3 className="text-2xl font-bold text-white text-center">{currentQuestion.text}</h3>
            {currentQuestion.imageUrl && (
              <div className="w-full bg-slate-700/30 rounded p-4">
                <Image
                  src={currentQuestion.imageUrl}
                  alt="Question"
                  width={1200}
                  height={800}
                  className="max-w-full rounded mx-auto"
                  priority={true}
                  onError={() => {
                    console.error('Failed to load question image:', currentQuestion.imageUrl);
                  }}
                  onLoad={() => {
                    console.log('Question image loaded successfully');
                  }}
                />
              </div>
            )}
          </div>
        )}

        {useScreenMode && (
          <div className="p-4 sm:p-6">
            <p className="text-center text-slate-300 text-sm sm:text-base font-medium">
              問題はスクリーンに表示中です。スマホでは回答を選んで送信してください。
            </p>
          </div>
        )}

        {/* 回答フォーム（出題者以外）- 2×2グリッド */}
        {!isAuthor && !hasSubmittedAnswer && (
          <div className="space-y-6">
            <div className={`grid gap-3 sm:gap-4 ${useScreenMode ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {currentQuestion.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAnswer(index)}
                  className={`
                    relative rounded-xl border-4 transition-all duration-200 font-bold text-lg flex flex-col items-center justify-center
                    ${useScreenMode ? 'p-4 min-h-[32svh] sm:min-h-[220px]' : 'p-6 min-h-[120px]'}
                    ${selectedAnswer === index
                      ? `${CHOICE_COLORS[index].selected} ${CHOICE_COLORS[index].border} shadow-2xl scale-105`
                      : `${CHOICE_COLORS[index].bg} ${CHOICE_COLORS[index].border} ${CHOICE_COLORS[index].hover} shadow-lg hover:scale-102`
                    }
                    ${CHOICE_COLORS[index].text}
                  `}
                >
                  {useScreenMode ? (
                    <div className="text-5xl sm:text-6xl font-black leading-none">{index + 1}</div>
                  ) : (
                    <>
                      <div className="text-sm opacity-80 mb-2">{index + 1}</div>
                      <div className="break-words text-center">{choice}</div>
                    </>
                  )}
                  {selectedAnswer === index && (
                    <div className="absolute top-2 right-2 text-2xl">✓</div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 sm:py-5 px-6 rounded-md shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed text-base sm:text-lg"
            >
              回答を送信
            </button>
          </div>
        )}

        {/* 予想フォーム（出題者のみ） */}
        {isAuthor && !hasSubmittedPrediction && (
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
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-4 px-6 rounded-md shadow-lg"
            >
              予想を送信
            </button>
          </div>
        )}

        {/* 待機中 */}
        {(hasSubmittedAnswer || (isAuthor && hasSubmittedPrediction)) && (
          <div className="text-center p-30">
            <p className="text-lg text-slate-300 font-medium italic">他のプレイヤーの回答を待っています...</p>
            <p className="text-sm text-slate-400 mt-2">
              解答済みプレイヤー {currentAnswerCount} / {players.length}
            </p>
          </div>
        )}

        {currentPlayer && (
          <div className="fixed z-50 [bottom:clamp(0.75rem,2.6vh,1.5rem)] [right:clamp(0.75rem,3.5vw,1.75rem)]">
            {isReactionPanelOpen && (
              <div ref={reactionPanelRef} className="absolute bottom-16 right-0 w-[min(88vw,320px)] origin-bottom-right space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-sm">
                <div className="grid grid-cols-3 gap-2">
                  {REACTION_STAMPS.map((stamp) => (
                    <button
                      key={stamp}
                      type="button"
                      onClick={(event) => handleSendReaction('reaction', stamp, event.timeStamp)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xl leading-none text-slate-100 transition hover:bg-slate-700 active:scale-95"
                    >
                      {stamp}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_MESSAGES.map((message) => (
                    <button
                      key={message}
                      type="button"
                      onClick={(event) => handleSendReaction('message', message, event.timeStamp)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-100 transition hover:bg-slate-700 active:scale-95 sm:text-sm"
                    >
                      {message}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">送信は1秒に1回までです</p>
              </div>
            )}

            <button
              ref={reactionToggleButtonRef}
              type="button"
              aria-label="リアクションを開く"
              aria-expanded={isReactionPanelOpen}
              onClick={() => setIsReactionPanelOpen((prev) => !prev)}
              className="grid h-14 w-14 place-items-center rounded-full border border-slate-500/70 bg-slate-800/90 text-slate-100 shadow-lg hover:bg-slate-700"
            >
              <span className="block">
                <ReactionTriggerIcon />
              </span>
            </button>
          </div>
        )}

      </div>
      <ReactionOverlay effects={reactionEffects} />
    </>
  );
}
