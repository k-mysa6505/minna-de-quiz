'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { useParams, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/app/common/LoadingSpinner';
import { startGame, subscribeToRoom } from '@/lib/services/roomService';
import { subscribeToPlayers } from '@/lib/services/playerService';
import { getAnswers, getGameState, getPrediction } from '@/lib/services/gameService';
import { getQuestion, getQuestionProgress, getQuestions } from '@/lib/services/questionService';
import { subscribeToRoomReactions, type RoomReaction } from '@/lib/services/reactionService';
import { runServiceAction } from '@/lib/services/serviceAction';
import type { Answer, GameState, Player, Prediction, Question, Room } from '@/types';
import { PlayerListCard } from '../components/PlayerListCard';

type ScreenState = {
  room: Room | null;
  players: Player[];
  gameState: GameState | null;
  currentQuestion: Question | null;
  questionProgress: { created: number; total: number };
  creatingCompletedAuthorIds: string[];
  currentAnswers: Answer[];
  currentPrediction: Prediction | null;
  reactions: RoomReaction[];
  error: string;
};

export default function RoomScreenPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const requestedDeviceId = searchParams.get('deviceId') || '';

  const [state, setState] = useState<ScreenState>({
    room: null,
    players: [],
    gameState: null,
    currentQuestion: null,
    questionProgress: { created: 0, total: 0 },
    creatingCompletedAuthorIds: [],
    currentAnswers: [],
    currentPrediction: null,
    reactions: [],
    error: '',
  });
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const unsubscribeRoom = subscribeToRoom(roomId, (room) => {
      if (!room) {
        setState((prev) => ({ ...prev, room: null, error: 'ルームが見つかりません' }));
        return;
      }
      setState((prev) => ({ ...prev, room, error: '' }));
    });

    const unsubscribePlayers = subscribeToPlayers(roomId, (players) => {
      setState((prev) => ({ ...prev, players }));
    });

    const unsubscribeReactions = subscribeToRoomReactions(roomId, (reactions) => {
      setState((prev) => ({ ...prev, reactions }));
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
      unsubscribeReactions();
    };
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;

    const loadPhaseData = async () => {
      if (!state.room) {
        return;
      }

      if (state.room.status === 'creating') {
        const progress = await getQuestionProgress(roomId);
        const createdQuestions = await getQuestions(roomId);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            questionProgress: progress,
            creatingCompletedAuthorIds: createdQuestions.map((question) => question.authorId),
          }));
        }
      }

      if (state.room.status === 'playing') {
        const gameState = await getGameState(roomId);
        if (!gameState) {
          if (!cancelled) {
            setState((prev) => ({ ...prev, gameState: null, currentQuestion: null }));
          }
          return;
        }

        const currentQuestionId = gameState.questionOrder?.[gameState.currentQuestionIndex];
        const currentQuestion = currentQuestionId
          ? await getQuestion(roomId, currentQuestionId)
          : null;

        if (!cancelled) {
          setState((prev) => ({ ...prev, gameState, currentQuestion }));
        }

        if (gameState.phase === 'revealing' && currentQuestion) {
          const [currentAnswers, currentPrediction] = await Promise.all([
            getAnswers(roomId, currentQuestion.questionId),
            getPrediction(roomId, currentQuestion.questionId),
          ]);

          if (!cancelled) {
            setState((prev) => ({
              ...prev,
              currentAnswers,
              currentPrediction,
            }));
          }
        }
      }
    };

    const interval = setInterval(loadPhaseData, 1500);
    loadPhaseData();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, state.room]);

  const sortedPlayers = useMemo(
    () => [...state.players].sort((a, b) => b.score - a.score),
    [state.players]
  );

  const answerDistribution = useMemo(() => {
    const initial = [0, 0, 0, 0];
    for (const answer of state.currentAnswers) {
      if (typeof answer.answer === 'number' && answer.answer >= 0 && answer.answer < 4) {
        initial[answer.answer] += 1;
      }
    }
    return initial;
  }, [state.currentAnswers]);

  const currentAuthorName = useMemo(() => {
    if (!state.currentQuestion) {
      return 'unknown';
    }
    return state.players.find((player) => player.playerId === state.currentQuestion?.authorId)?.nickname || 'unknown';
  }, [state.currentQuestion, state.players]);

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/join-room?roomId=${roomId}`;
  }, [roomId]);

  const displayRoomId = useMemo(() => {
    return roomId;
  }, [roomId]);

  const handleStartFromScreen = async () => {
    setIsStarting(true);
    await runServiceAction('screen.startGame', () => startGame(roomId), {
      onError: () => {
        alert('開始条件を満たしていません。参加人数を確認してください。');
      },
    });
    setIsStarting(false);
  };

  if (!state.room && !state.error) {
    return <LoadingSpinner message="スクリーン情報を読み込み中..." />;
  }

  if (state.error || !state.room) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-lg w-full rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-center">
          <h1 className="text-xl text-white font-bold mb-2">スクリーンを表示できません</h1>
          <p className="text-slate-300 text-sm">{state.error || 'ルーム情報の取得に失敗しました。'}</p>
        </div>
      </main>
    );
  }

  if (!state.room.useScreenMode) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-lg w-full rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-center">
          <h1 className="text-xl text-white font-bold mb-2">スクリーンモードは無効です</h1>
          <p className="text-slate-300 text-sm">このルームは通常モードで作成されています。</p>
        </div>
      </main>
    );
  }

  if (state.room.displayDeviceId && requestedDeviceId !== state.room.displayDeviceId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-lg w-full rounded-xl border border-red-500/40 bg-slate-900/70 p-6 text-center">
          <h1 className="text-xl text-white font-bold mb-2">表示端末認証に失敗しました</h1>
          <p className="text-slate-300 text-sm">
            ホストが発行したスクリーン用リンクを使用して接続してください。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white p-4 sm:p-6 lg:p-10">
      <section className="max-w-7xl mx-auto space-y-6">

        {state.room.status === 'waiting' && (
          <section className="backdrop-blur-sm min-h-[86vh] grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
            <div className="p-5 md:p-7">
              <div className="mb-5">
                <h2 className="text-2xl md:text-4xl font-black">
                  プレイヤー待機中
                </h2>
                <p className="text-slate-300 mt-2 text-base md:text-lg">
                  現在：<span className="font-bold text-emerald-400">{state.players.length}人</span>
                </p>
              </div>

              <div className="flex-1">
                <PlayerListCard
                  players={state.players}
                  currentPlayerId=""
                  sortMode="joinedAt"
                  showMasterBadge
                />
              </div>

              <div className="mt-5 flex flex-col items-center flex-1">
                <button
                  type="button"
                  disabled={isStarting || state.players.length < (state.room.minPlayers ?? 2)}
                  onClick={handleStartFromScreen}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold px-8 py-3 rounded-lg transition-all disabled:cursor-not-allowed"
                >
                  {isStarting ? 'STARTING...' : 'START'}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  最低参加人数: {state.room.minPlayers ?? 2}人
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 md:p-8 flex flex-col items-center justify-center text-center">
              <div>
                <p className="text-slate-300 text-sm md:text-base mb-6">ルーム参加用QRコード</p>
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl mb-6">
                  <QRCodeSVG
                    value={joinUrl}
                    size={320}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              </div>

              <div className="px-6 py-5 w-full max-w-xl">
                <p className="text-slate-200 md:text-base mb-2">ROOM ID</p>
                <p className="font-black tracking-[0.22em] text-4xl md:text-6xl text-white">{displayRoomId}</p>
              </div>
            </div>
          </section>
        )}

        {/* {state.room.status !== 'waiting' && (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:p-6 flex justify-between items-center">
            <p className="text-sm md:text-base text-slate-200">ROOM ID: <span className="font-mono text-white">{displayRoomId}</span></p>
          </section>
        )} */}

        {state.room.status === 'creating' && (
          <section className="p-6 md:p-8">
            <h2 className="text-2xl md:text-4xl font-bold">問題を作りましょう</h2>
            <p className="py-3 text-base md:text-lg">
              <span className="text-2xl md:text-2xl font-black mt-4">完了プレイヤー：</span>
              <span className="text-4xl md:text-6xl font-black mt-4 mb-6 text-emerald-400">{state.questionProgress.created}</span>
              <span className="text-3xl md:text-4xl font-black mt-4 mb-6"> / </span>
              <span className="text-3xl md:text-4xl font-black mt-4 mb-6">{state.questionProgress.total}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.players.map((player) => {
                const isCompleted = state.creatingCompletedAuthorIds.includes(player.playerId);
                return (
                  <div
                    key={player.playerId}
                    className="rounded-xl border border-slate-700 bg-slate-800/75 p-4 flex items-center justify-between"
                  >
                    <p className="font-semibold text-white truncate pr-3">{player.nickname}</p>
                    <span className={`text-sm font-semibold ${isCompleted ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {isCompleted ? '完了' : '作問中...'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {state.room.status === 'playing' && (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 md:p-8 space-y-6">
            {state.gameState && (
              <p className="text-sm text-slate-300">
                問題 {state.gameState.currentQuestionIndex + 1} / {state.gameState.totalQuestions}
              </p>
            )}

            {!state.currentQuestion && <LoadingSpinner message="問題を読み込み中..." />}

            {state.currentQuestion && state.gameState?.phase !== 'revealing' && (
              <>
                <h2 className="text-2xl md:text-4xl font-bold leading-tight">{state.currentQuestion.text}</h2>
                {state.currentQuestion.imageUrl && (
                  <div className="rounded-xl bg-slate-800/70 p-3">
                    <Image
                      src={state.currentQuestion.imageUrl}
                      alt="Question"
                      width={1400}
                      height={900}
                      className="w-full h-auto max-h-[55vh] object-contain rounded-lg"
                      priority
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {state.currentQuestion.choices.map((choice, index) => (
                    <div
                      key={`${choice}-${index}`}
                      className="rounded-xl border border-slate-600 bg-slate-800/70 p-6 min-h-32 text-lg md:text-2xl font-semibold flex items-center"
                    >
                      <span className="text-emerald-300 mr-2">{index + 1}.</span>
                      {choice}
                    </div>
                  ))}
                </div>
              </>
            )}

            {state.currentQuestion && state.gameState?.phase === 'revealing' && (
              <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-black text-center">答え合わせ</h2>
                <div className="grid grid-cols-2 gap-4 md:gap-5">
                  {state.currentQuestion.choices.map((choice, index) => {
                    const isCorrect = index === state.currentQuestion?.correctAnswer;
                    return (
                      <div
                        key={`${choice}-${index}`}
                        className={`rounded-2xl border-2 p-5 md:p-6 min-h-36 flex flex-col justify-between ${isCorrect ? 'border-emerald-300 bg-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.35)]' : 'border-slate-700 bg-slate-800/35 opacity-50'}`}
                      >
                        <div className="text-lg md:text-2xl font-bold leading-snug">
                          <span className="mr-2 text-emerald-200">{index + 1}.</span>
                          {choice}
                        </div>
                        <div className="mt-4 text-sm md:text-lg text-slate-100 flex items-center gap-2">
                          <span>👥</span>
                          <span>{answerDistribution[index]}人</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-violet-400/40 bg-violet-500/10 px-5 py-4">
                  <p className="text-xl md:text-2xl font-bold text-white">
                    作問者（{currentAuthorName}）の予想: {state.currentPrediction?.predictedCount ?? 0}人 / 実際の正解者: {state.currentAnswers.filter((answer) => answer.isCorrect).length}人
                  </p>
                  {state.currentPrediction?.isCorrect && (
                    <p className="text-2xl md:text-3xl font-black text-amber-300 mt-2">ピタリ賞！</p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {state.room.status === 'finished' && (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">最終ランキング</h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-300 font-black w-8">#{index + 1}</span>
                    <span className="font-semibold">{player.nickname}</span>
                  </div>
                  <span className="text-xl font-black text-white">{player.score} pt</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>

      {state.reactions.length > 0 && (
        <aside className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 w-[78vw] max-w-sm rounded-xl border border-slate-700 bg-slate-900/80 backdrop-blur-md p-3">
          <p className="text-xs text-slate-400 mb-2">LIVE REACTIONS</p>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {state.reactions.slice(0, 8).map((reaction) => (
              <div key={reaction.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate mr-2">{reaction.userName}</span>
                <span className={reaction.type === 'reaction' ? 'text-lg leading-none' : 'text-slate-100'}>
                  {reaction.content}
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}
    </main>
  );
}
