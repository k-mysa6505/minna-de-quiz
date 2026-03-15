'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sendRoomReaction, subscribeToRoomReactions, type RoomReaction } from '@/lib/services/reactionService';
import {
  calculateCorrectAnswerPoints,
  calculatePredictionPoints,
} from '@/lib/utils/roundScoring';
import type { Player, Answer, GameState, Question } from '@/types';

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

interface LocalReactionEffect {
  id: number;
  content: string;
  senderName: string;
  type: 'reaction' | 'message';
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

const REACTION_STAMPS = ['👏', '🔥', '😆', '😱', '🤯', '🎉'];
const QUICK_MESSAGES = ['難しい！', '天才か？', 'ドボンw', 'いい問題！'];
const REACTION_EFFECT_DURATION_MS = 2700;

const CHOICE_COLORS = [
  {
    bg: 'bg-blue-600/70',
    border: 'border-blue-500/70',
    text: 'text-white'
  },
  {
    bg: 'bg-red-600/70',
    border: 'border-red-500/70',
    text: 'text-white'
  },
  {
    bg: 'bg-green-600/70',
    border: 'border-green-500/70',
    text: 'text-white'
  },
  {
    bg: 'bg-yellow-600/70',
    border: 'border-yellow-500/70',
    text: 'text-white'
  },
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

  // 同一プレイヤーの多重送信が混在しても最速の1件だけを採用する
  const seen = new Set<string>();
  return sorted.filter((answer) => {
    if (seen.has(answer.playerId)) {
      return false;
    }
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
  const [showAnswerReveal, setShowAnswerReveal] = useState(false);
  const [revealedPlayers, setRevealedPlayers] = useState<string[]>([]);
  const [showPredictionResult, setShowPredictionResult] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [lastReactionAt, setLastReactionAt] = useState(0);
  const [reactionEffects, setReactionEffects] = useState<LocalReactionEffect[]>([]);
  const [isReactionPanelOpen, setIsReactionPanelOpen] = useState(false);
  const reactionPanelRef = useRef<HTMLDivElement | null>(null);
  const reactionToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasInitialReactionSnapshotRef = useRef(false);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  const correctAnswers = useMemo(() => sortCorrectAnswers(answers), [answers]);
  const correctAnswerCount = correctAnswers.length;
  const questionStartTime = useMemo(
    () => toTimestamp(gameState.questionStartedAt),
    [gameState.questionStartedAt]
  );
  const predictionPoints = useMemo(() => {
    if (!prediction) {
      return 0;
    }
    return calculatePredictionPoints(prediction.predictedCount, correctAnswerCount, predictionHitBonusPoints);
  }, [prediction, correctAnswerCount, predictionHitBonusPoints]);

  // 結果表示時に回答者一覧を表示
  useEffect(() => {
    setShowAnswerReveal(true);
  }, []);

  // 回答者を順番に表示
  useEffect(() => {
    if (!showAnswerReveal) {
      return;
    }

    if (correctAnswers.length === 0) {
      // 正解者が0人の場合は2秒後に出題者の予想を表示
      const timer = setTimeout(() => setShowPredictionResult(true), 2000);
      return () => clearTimeout(timer);
    }

    let index = 0;
    let predictionTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      if (index < correctAnswers.length) {
        const currentAnswer = correctAnswers[index];
        if (currentAnswer && currentAnswer.playerId) {
          setRevealedPlayers(prev => [...prev, currentAnswer.playerId]);
        }
        index++;
      } else {
        clearInterval(interval);
        // 全員表示後、1秒待ってから出題者の予想結果を表示
        predictionTimer = setTimeout(() => setShowPredictionResult(true), 1000);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      if (predictionTimer) {
        clearTimeout(predictionTimer);
      }
    };
  }, [showAnswerReveal, correctAnswers]);

  // 出題者の予想が表示されたら3秒後に準備完了ボタンを表示
  useEffect(() => {
    if (showPredictionResult) {
      const timer = setTimeout(() => setShowNextButton(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [showPredictionResult]);

  // 準備完了状態を管理
  const playersReady = gameState.playersReady || [];
  const readyCount = playersReady.length;
  const totalPlayers = players.length;
  const allReady = readyCount >= totalPlayers && totalPlayers > 0;

  const myAnswer = answers.find((answer) => answer.playerId === currentPlayerId);
  const isAuthor = currentQuestion.authorId === currentPlayerId;
  const currentPlayer = players.find((player) => player.playerId === currentPlayerId);

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
        questionId: currentQuestion.questionId,
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
      console.error('Failed to send result reaction:', error);
    }
  };

  const reactionOverlay = currentPlayer && (
    <>
      <div className="fixed bottom-6 right-4 z-40 sm:right-6">
        {isReactionPanelOpen && (
          <div ref={reactionPanelRef} className="absolute bottom-16 right-0 w-[min(88vw,320px)] space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-sm">
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

      {reactionEffects.length > 0 && (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-1 overflow-x-hidden px-1">
          {reactionEffects.map((effect) => (
            <div key={effect.id} className="animate-float-up max-w-full px-2 text-center">
              <p className={effect.type === 'reaction' ? 'text-3xl leading-none sm:text-4xl' : 'break-words text-sm font-semibold text-slate-100 sm:text-base'}>
                {effect.content}
              </p>
              <p className="mx-auto mt-1 max-w-full truncate text-[10px] text-slate-200">{effect.senderName}</p>
            </div>
          ))}
        </div>
      )}
    </>
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

          {showNextButton && (
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
                {allReady ? '全員準備完了 - 自動で進みます...'
                  : isReady ? '準備完了 - 他のプレイヤーを待っています...'
                    : `準備完了 (${gameState.currentQuestionIndex >= gameState.totalQuestions - 1 ? '結果を見る' : '次の問題へ'})`}
              </button>

              <div className="py-2">
                <div className="flex justify-center items-center">
                  <span className="text-sm text-slate-300">準備完了：</span>
                  <span className={`font-bold text-lg ${allReady ? 'text-green-400' : 'text-yellow-400'}`}>
                    {readyCount}/{totalPlayers}人
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {reactionOverlay}
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* 進捗表示 */}
        <div className="flex justify-between px-3 items-center text-slate-200">
          <p>問題 {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}</p>
          <p className="italic">
            作問者：{players.find(p => p.playerId === currentQuestion.authorId)?.nickname || 'unknown'}
          </p>
        </div>
        {!showAnswerReveal ? (
          /* 正解発表画面 */
          <div className="space-y-6">
            <h4 className="font-bold text-white text-2xl text-center italic">ANSWER</h4>

            {/* 4択表示 */}
            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.choices.map((choice, index) => {
                const isCorrect = index === currentQuestion.correctAnswer;
                const colors = CHOICE_COLORS[index];

                return (
                  <div
                    key={index}
                    className={`
                      relative p-6 rounded-xl border-4 font-bold text-lg min-h-[120px] flex flex-col items-center justify-center transition-all
                      ${isCorrect
                        ? `${colors.bg} ${colors.border} shadow-2xl scale-105`
                        : 'bg-slate-800/30 border-slate-700/50 opacity-40'
                      }
                      ${colors.text}
                    `}
                  >
                    <div className="text-sm opacity-80 mb-2">{index + 1}</div>
                    <div className="break-words text-center">{choice}</div>
                    {isCorrect && (
                      <div className="absolute top-2 right-2 text-3xl">✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 回答者一覧画面 */
          <div className="space-y-6">
            <h4 className="font-bold text-white text-2xl text-center italic">SCORE</h4>

            {/* 正解者リスト */}
            <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-xl border border-slate-700/50 p-6 space-y-3">
              <p className="text-sm text-slate-300 mb-3 text-center">正解者一覧</p>
              {correctAnswerCount === 0 ? (
                <div className="text-center text-slate-400 italic py-4">
                  正解者なし
                </div>
              ) : (
                correctAnswers.map((answer, idx) => {
                  const player = players.find((p) => p.playerId === answer.playerId);
                  const isFastest = idx === 0;
                  const isRevealed = revealedPlayers.includes(answer.playerId);

                  if (!isRevealed) return null;

                  const answerTime = toTimestamp(answer.answeredAt);
                  const elapsedMs = questionStartTime > 0 ? answerTime - questionStartTime : 0;
                  const seconds = Math.floor(elapsedMs / 1000);
                  const centiseconds = Math.floor((elapsedMs % 1000) / 10);
                  const timeDisplay = `${seconds}''${centiseconds.toString().padStart(2, '0')}`;
                  const gainedPoints = calculateCorrectAnswerPoints({
                    correctAnswerPoints,
                    fastestAnswerBonusPoints,
                    isFastestCorrect: idx === 0,
                  });

                  return (
                    <div
                      key={`${answer.playerId}-${toTimestamp(answer.answeredAt)}`}
                      className="flex justify-between items-center px-4 py-1 animate-fade-in"
                    >
                      <div className="flex items-center gap-10">
                        <span className={`font-bold text-lg ${isFastest ? 'text-yellow-400' : 'text-white'}`}>
                          {idx + 1}．{player?.nickname || 'unknown'}
                        </span>
                        <span className="text-ms text-slate-300 italic">
                          {timeDisplay}
                        </span>
                      </div>
                      <span className="text-emerald-400 font-bold">+{gainedPoints}pt</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* 出題者の予想結果 */}
            {showPredictionResult && (
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/30 rounded-xl border border-purple-600/50 p-6 animate-fade-in">
                <p className="text-sm text-purple-300 mb-3 text-center">出題者の予想</p>
                {prediction ? (
                  <div className="flex justify-between items-center px-4 py-1">
                    <div className="flex items-center gap-10">
                      <p className="text-white font-bold">
                        {players.find(p => p.playerId === currentQuestion.authorId)?.nickname || 'unknown'}
                      </p>
                      <p className="text-sm text-slate-300 italic">
                        予想: {prediction.predictedCount}人 / 実際: {correctAnswerCount}人
                      </p>
                    </div>
                    <span className={predictionPoints > 0 ? 'text-emerald-400 font-bold' : 'text-gray-400 font-bold'}>
                      +{predictionPoints}pt
                    </span>
                  </div>
                ) : (
                  <p className="text-center text-slate-300 italic py-2">予想結果を集計中です...</p>
                )}
              </div>
            )}

            {/* 準備完了システム */}
            {showNextButton && (
              <div className="space-y-4">
                {/* 準備状況表示 */}
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">
                      準備完了
                    </span>
                    <span className={`font-bold text-lg ${allReady ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                      {readyCount}/{totalPlayers}人
                    </span>
                  </div>

                  {/* 準備完了プレイヤーリスト */}
                  {readyCount > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-xs text-slate-400 mb-2">準備完了プレイヤー:</div>
                      <div className="flex flex-wrap gap-2">
                        {playersReady.map(playerId => {
                          const player = players.find(p => p.playerId === playerId);
                          return (
                            <span
                              key={playerId}
                              className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded border border-green-600/30"
                            >
                              {player?.nickname || 'unknown'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 準備完了ボタン */}
                <button
                  onClick={handleNextQuestion}
                  disabled={allReady}
                  className={`
                    w-full font-bold py-4 px-6 rounded-md shadow-lg transition-all duration-300
                    ${isReady
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                    }
                    ${allReady ? 'opacity-75 cursor-not-allowed' : ''
                    }
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

                {/* 全員準備完了時のメッセージ */}
                {!allReady && readyCount > 0 && (
                  <p className="text-center text-sm text-slate-400 italic">
                    あと{totalPlayers - readyCount}人が準備完了すると自動で進みます
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {reactionOverlay}
    </>
  );
}
