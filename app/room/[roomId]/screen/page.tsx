'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/app/common/LoadingSpinner';
import { disbandRoomFlow, resetRoomForReplayFlow } from '@/lib/services/roomFlowService';
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
  revealDataQuestionId: string | null;
  reactions: RoomReaction[];
  error: string;
};

type RevealingPhase = 'answer' | 'ranking' | 'prediction';

const MAX_WAITING_PLAYERS = 10;
const MAX_CREATING_PLAYERS = 12;
const MAX_RANKING_PLAYERS = 8;
const MAX_FINISHED_PLAYERS = 10;
const MAX_REACTIONS = 3;

const SCREEN_CHOICE_COLORS = [
  { badgeBg: 'bg-blue-600' },
  { badgeBg: 'bg-red-600' },
  { badgeBg: 'bg-green-600' },
  { badgeBg: 'bg-yellow-600' },
];

function toTimestamp(value: unknown): number {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  return 0;
}

function calculateCompetitionRanks(players: Player[]): number[] {
  const ranks: number[] = [];
  let currentRank = 1;

  players.forEach((player, index) => {
    if (index > 0 && player.score < players[index - 1].score) {
      currentRank = index + 1;
    }
    ranks.push(currentRank);
  });

  return ranks;
}

function formatOrdinalRank(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${rank}th`;
  }

  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

export default function RoomScreenPage() {
  const params = useParams();
  const router = useRouter();
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
    revealDataQuestionId: null,
    reactions: [],
    error: '',
  });
  const [isStarting, setIsStarting] = useState(false);
  const [revealingPhase, setRevealingPhase] = useState<RevealingPhase>('answer');
  const [revealedPlayers, setRevealedPlayers] = useState<string[]>([]);
  const [showPredictedCount, setShowPredictedCount] = useState(false);
  const [showActualCount, setShowActualCount] = useState(false);
  const [showPredictionBonus, setShowPredictionBonus] = useState(false);
  const [animatedPredictedCount, setAnimatedPredictedCount] = useState(0);
  const [animatedActualCount, setAnimatedActualCount] = useState(0);
  const [finishedRankingPlayers, setFinishedRankingPlayers] = useState<Player[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isDisbanding, setIsDisbanding] = useState(false);

  useEffect(() => {
    document.body.classList.add('screen-lock');
    return () => {
      document.body.classList.remove('screen-lock');
    };
  }, []);

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
              revealDataQuestionId: currentQuestion.questionId,
            }));
          }
        } else if (!cancelled) {
          setState((prev) => ({
            ...prev,
            currentAnswers: [],
            currentPrediction: null,
            revealDataQuestionId: null,
          }));
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.room?.status !== 'finished') {
        setFinishedRankingPlayers((prev) => (prev.length > 0 ? [] : prev));
        return;
      }

      if (state.players.length === 0) {
        return;
      }

      setFinishedRankingPlayers((prev) => {
        if (prev.length === 0) {
          return state.players;
        }

        const merged = new Map(prev.map((player) => [player.playerId, player]));
        for (const player of state.players) {
          merged.set(player.playerId, { ...merged.get(player.playerId), ...player });
        }
        return Array.from(merged.values());
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [state.room?.status, state.players]);

  const rankingSourcePlayers =
    state.room?.status === 'finished' && finishedRankingPlayers.length > 0
      ? finishedRankingPlayers
      : state.players;

  const sortedPlayers = useMemo(
    () => [...rankingSourcePlayers].sort((a, b) => b.score - a.score),
    [rankingSourcePlayers]
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

  const correctAnswers = useMemo(() => {
    const sorted = [...state.currentAnswers]
      .filter((answer) => answer.isCorrect)
      .sort((a, b) => toTimestamp(a.answeredAt) - toTimestamp(b.answeredAt));

    const seen = new Set<string>();
    return sorted.filter((answer) => {
      if (seen.has(answer.playerId)) {
        return false;
      }
      seen.add(answer.playerId);
      return true;
    });
  }, [state.currentAnswers]);

  const currentQuestionId = state.currentQuestion?.questionId;

  const isRevealDataReady = useMemo(() => {
    if (state.gameState?.phase !== 'revealing' || !currentQuestionId) {
      return false;
    }
    return state.revealDataQuestionId === currentQuestionId;
  }, [state.gameState?.phase, currentQuestionId, state.revealDataQuestionId]);

  const correctAnswersKey = useMemo(() => {
    return correctAnswers
      .map((answer) => `${answer.playerId}:${toTimestamp(answer.answeredAt)}`)
      .join('|');
  }, [correctAnswers]);

  const correctAnswerPlayerIds = useMemo(() => {
    if (!correctAnswersKey) {
      return [] as string[];
    }

    return correctAnswersKey
      .split('|')
      .map((entry) => entry.split(':')[0])
      .filter((playerId) => playerId.length > 0);
  }, [correctAnswersKey]);

  const visibleRankingAnswers = useMemo(() => {
    return correctAnswers.slice(0, MAX_RANKING_PLAYERS);
  }, [correctAnswers]);

  const hiddenRankingCount = Math.max(0, correctAnswers.length - visibleRankingAnswers.length);

  const visibleCreatingPlayers = useMemo(() => {
    return state.players.slice(0, MAX_CREATING_PLAYERS);
  }, [state.players]);

  const hiddenCreatingPlayersCount = Math.max(0, state.players.length - visibleCreatingPlayers.length);

  const visibleFinishedPlayers = useMemo(() => {
    return sortedPlayers.slice(0, MAX_FINISHED_PLAYERS);
  }, [sortedPlayers]);

  const visibleFinishedRanks = useMemo(() => {
    return calculateCompetitionRanks(sortedPlayers).slice(0, visibleFinishedPlayers.length);
  }, [sortedPlayers, visibleFinishedPlayers.length]);

  const hiddenFinishedPlayersCount = Math.max(0, sortedPlayers.length - visibleFinishedPlayers.length);

  const revealReadyCount = state.gameState?.playersReady?.length ?? 0;
  const revealReadyTotal = state.players.length;
  const revealReadyPercent = revealReadyTotal > 0
    ? Math.min(100, Math.round((revealReadyCount / revealReadyTotal) * 100))
    : 0;

  const questionStartTime = useMemo(() => {
    return toTimestamp(state.gameState?.questionStartedAt);
  }, [state.gameState?.questionStartedAt]);

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    if (state.gameState?.phase !== 'revealing' || !currentQuestionId) {
      resetTimer = setTimeout(() => {
        setRevealingPhase('answer');
        setRevealedPlayers([]);
      }, 0);

      return () => {
        if (resetTimer) {
          clearTimeout(resetTimer);
        }
      };
    }

    resetTimer = setTimeout(() => {
      setRevealingPhase('answer');
      setRevealedPlayers([]);
    }, 0);

    const timer = setTimeout(() => {
      setRevealingPhase('ranking');
    }, 2200);

    return () => {
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
      clearTimeout(timer);
    };
  }, [state.gameState?.phase, currentQuestionId]);

  useEffect(() => {
    if (revealingPhase !== 'ranking' || state.gameState?.phase !== 'revealing' || !isRevealDataReady) {
      return;
    }

    if (correctAnswerPlayerIds.length === 0) {
      const timer = setTimeout(() => setRevealingPhase('prediction'), 2000);
      return () => clearTimeout(timer);
    }

    let index = 0;
    let predictionTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      if (index < correctAnswerPlayerIds.length) {
        const playerId = correctAnswerPlayerIds[index];
        if (playerId) {
          setRevealedPlayers((prev) => {
            if (prev.includes(playerId)) {
              return prev;
            }
            return [...prev, playerId];
          });
        }
        index += 1;
      } else {
        clearInterval(interval);
        predictionTimer = setTimeout(() => setRevealingPhase('prediction'), 1000);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      if (predictionTimer) {
        clearTimeout(predictionTimer);
      }
    };
  }, [revealingPhase, state.gameState?.phase, isRevealDataReady, correctAnswerPlayerIds]);

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    if (revealingPhase !== 'prediction' || state.gameState?.phase !== 'revealing') {
      resetTimer = setTimeout(() => {
        setShowPredictedCount(false);
        setShowActualCount(false);
        setShowPredictionBonus(false);
        setAnimatedPredictedCount(0);
        setAnimatedActualCount(0);
      }, 0);

      return () => {
        if (resetTimer) {
          clearTimeout(resetTimer);
        }
      };
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    const startCountAnimation = (
      target: number,
      setValue: (value: number) => void,
      durationMs: number
    ) => {
      if (target <= 0) {
        setValue(0);
        return;
      }

      const steps = Math.max(8, Math.min(target, 24));
      const tickMs = Math.max(30, Math.floor(durationMs / steps));
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep += 1;
        const nextValue = Math.round((target * currentStep) / steps);
        setValue(Math.min(target, nextValue));

        if (currentStep >= steps) {
          clearInterval(interval);
          setValue(target);
        }
      }, tickMs);

      intervals.push(interval);
    };

    timers.push(
      setTimeout(() => {
        setShowPredictedCount(true);
        startCountAnimation(state.currentPrediction?.predictedCount ?? 0, setAnimatedPredictedCount, 900);
      }, 500)
    );

    timers.push(
      setTimeout(() => {
        setShowActualCount(true);
        startCountAnimation(correctAnswers.length, setAnimatedActualCount, 900);
      }, 2200)
    );

    timers.push(
      setTimeout(() => {
        setShowPredictionBonus(true);
      }, 4000)
    );

    return () => {
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
      timers.forEach((timer) => clearTimeout(timer));
      intervals.forEach((interval) => clearInterval(interval));
    };
  }, [revealingPhase, state.gameState?.phase, state.currentPrediction?.predictedCount, correctAnswers.length]);

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

  const handleBackFromScreen = () => {
    router.push(`/room/${roomId}`);
  };

  const handleReplayFromScreen = async () => {
    if (!requestedDeviceId) {
      return;
    }

    setIsReplaying(true);
    await runServiceAction('screen.replay', () => resetRoomForReplayFlow(roomId, requestedDeviceId), {
      onError: () => {
        alert('リプレイに失敗しました。ページをリロードしてください。');
      },
    });
    setIsReplaying(false);
  };

  const handleDisbandFromScreen = async () => {
    if (!requestedDeviceId) {
      return;
    }

    setIsDisbanding(true);
    await runServiceAction('screen.disband', () => disbandRoomFlow(roomId, requestedDeviceId), {
      onError: () => {
        alert('ルーム解体に失敗しました。ページをリロードしてください。');
      },
    });
    setIsDisbanding(false);
    router.push('/');
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
    <main className="h-[100dvh] overflow-hidden text-white p-3 sm:p-4 lg:p-6">
      <section className="max-w-7xl mx-auto h-full">

        {state.room.status === 'waiting' && (
          <section className="backdrop-blur-sm h-full grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 overflow-hidden">
            <div className="p-4 md:p-5 flex min-h-0 flex-col">
              <div className="mb-5">
                <h2 className="text-2xl md:text-4xl font-black">
                  プレイヤー待機中
                </h2>
                <p className="text-slate-300 mt-2 text-base md:text-lg">
                  現在：<span className="font-bold text-emerald-400">{state.players.length}人</span>
                  <span className="ml-2 text-xs md:text-sm text-slate-400">
                    (最低参加人数: {state.room.minPlayers ?? 2}人)
                  </span>
                </p>
              </div>

              <div className="flex-1 min-h-0">
                <PlayerListCard
                  players={state.players}
                  currentPlayerId=""
                  sortMode="joinedAt"
                  showMasterBadge
                  maxVisiblePlayers={MAX_WAITING_PLAYERS}
                />
              </div>

              <div className="mt-5 flex flex-col items-center flex-1">
                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    disabled={isStarting || state.players.length < (state.room.minPlayers ?? 2)}
                    onClick={handleStartFromScreen}
                    className="bg-emerald-700 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
                  >
                    {isStarting ? 'STARTING...' : 'START'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackFromScreen}
                    className="bg-slate-700/50 text-slate-200 font-bold italic px-4 rounded-xl border border-slate-600 transition-all duration-300"
                  >
                    BACK
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 md:p-6 flex flex-col items-center justify-center text-center overflow-hidden">
              <div>
                <p className="text-slate-300 text-sm md:text-base mb-4">ルーム参加用QRコード</p>
                <div className="bg-white rounded-2xl p-3 md:p-4 shadow-2xl mb-4">
                  <QRCodeSVG
                    value={joinUrl}
                    size={240}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              </div>

              <div className="px-4 py-2 w-full max-w-xl">
                <p className="text-slate-200 md:text-base mb-2">ROOM ID</p>
                <p className="font-black tracking-[0.2em] text-3xl md:text-5xl text-white">{displayRoomId}</p>
              </div>
            </div>
          </section>
        )}

        {state.room.status === 'creating' && (
          <section className="h-full p-4 md:p-6 flex flex-col overflow-hidden">
            <h2 className="text-2xl md:text-4xl shrink-0">問題を作りましょう</h2>
            <p className="py-2 text-base md:text-lg shrink-0">
              <span className="text-2xl md:text-2xl mt-4">完了プレイヤー：</span>
              <span className="text-4xl md:text-5xl font-black mt-4 mb-6 text-emerald-400">{state.questionProgress.created}</span>
              <span className="text-3xl md:text-4xl font-black mt-4 mb-6"> / </span>
              <span className="text-3xl md:text-4xl font-black mt-4 mb-6">{state.questionProgress.total}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleCreatingPlayers.map((player) => {
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
            {hiddenCreatingPlayersCount > 0 && (
              <p className="mt-3 text-sm text-slate-300">他 {hiddenCreatingPlayersCount} 人</p>
            )}
          </section>
        )}

        {state.room.status === 'playing' && (
          <section className="h-full p-4 md:p-6 space-y-4 overflow-hidden">
            {state.gameState && (
              <div className="flex items-center justify-between gap-4 text-xl md:text-2xl">
                <p className="text-slate-300">
                  問題 {state.gameState.currentQuestionIndex + 1} / {state.gameState.totalQuestions}
                </p>
                <p className="text-slate-300 text-right italic">
                  作問者：<span className="font-bold text-emerald-300">{currentAuthorName}</span>
                </p>
              </div>
            )}

            {!state.currentQuestion && <LoadingSpinner message="問題を読み込み中..." />}

            {state.currentQuestion && state.gameState?.phase !== 'revealing' && (
              <>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight max-h-[5.2rem] overflow-hidden">{state.currentQuestion.text}</h2>
                {state.currentQuestion.imageUrl && (
                  <div className="rounded-xl bg-slate-800/70 p-2">
                    <Image
                      src={state.currentQuestion.imageUrl}
                      alt="Question"
                      width={1400}
                      height={900}
                      className="w-full h-auto max-h-[32dvh] object-contain rounded-lg"
                      priority
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {state.currentQuestion.choices.map((choice, index) => {
                    const choiceColor = SCREEN_CHOICE_COLORS[index] ?? SCREEN_CHOICE_COLORS[0];
                    return (
                      <div
                        key={`${choice}-${index}`}
                        className="rounded-xl border border-slate-600 bg-slate-800/70 p-3 md:p-4 min-h-24 text-base md:text-xl font-semibold flex items-center text-white"
                      >
                        <span className={`mr-3 inline-flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-full text-lg md:text-2xl font-black text-white ${choiceColor.badgeBg}`}>
                          {index + 1}
                        </span>
                        <span className="max-h-[3rem] md:max-h-[3.4rem] overflow-hidden">{choice}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {state.currentQuestion && state.gameState?.phase === 'revealing' && (
              <div className="space-y-6">
                {revealingPhase === 'answer' && (
                  <>
                    <h2 className="text-3xl md:text-5xl font-black text-center">答え合わせ</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {state.currentQuestion.choices.map((choice, index) => {
                        const isCorrect = index === state.currentQuestion?.correctAnswer;
                        const choiceColor = SCREEN_CHOICE_COLORS[index] ?? SCREEN_CHOICE_COLORS[0];
                        return (
                          <div
                            key={`${choice}-${index}`}
                            className={`rounded-xl border p-3 md:p-4 min-h-24 text-base md:text-xl font-semibold flex items-center text-white ${isCorrect ? 'border-emerald-300 bg-slate-800/70 ring-2 ring-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.35)]' : 'border-slate-600 bg-slate-800/45 opacity-65'}`}
                          >
                            <span className={`mr-3 inline-flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-full text-lg md:text-2xl font-black text-white ${choiceColor.badgeBg}`}>
                              {index + 1}
                            </span>
                            <span className="max-h-[3rem] md:max-h-[3.4rem] overflow-hidden flex-1">{choice}</span>
                            <div className="ml-3 shrink-0 rounded-md border border-slate-500/60 bg-slate-900/40 px-2 py-1 text-xs md:text-sm text-slate-100 flex items-center gap-1">
                              <span>👥</span>
                              <span>{answerDistribution[index]}人</span>
                            </div>
                          </div>
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
                      {!isRevealDataReady ? (
                        <p className="text-slate-300">正解データを集計中です...</p>
                      ) : correctAnswers.length === 0 ? (
                        <p className="text-slate-300">正解者なし</p>
                      ) : (
                        <div className="space-y-2">
                          {visibleRankingAnswers.map((answer, index) => {
                            const player = state.players.find((p) => p.playerId === answer.playerId);
                            const answerTime = toTimestamp(answer.answeredAt);
                            const elapsedMs = Math.max(0, questionStartTime > 0 ? answerTime - questionStartTime : 0);
                            const seconds = Math.floor(elapsedMs / 1000);
                            const centiseconds = Math.floor((elapsedMs % 1000) / 10);
                            const timeDisplay = `${seconds}''${centiseconds.toString().padStart(2, '0')}`;
                            const isFastest = index === 0;
                            const isRevealed = revealedPlayers.includes(answer.playerId);

                            if (!isRevealed) {
                              return null;
                            }

                            return (
                              <div
                                key={`${answer.playerId}-${toTimestamp(answer.answeredAt)}`}
                                className="flex items-center justify-between rounded-lg border border-violet-300/20 bg-slate-900/40 px-4 py-2 animate-fade-in"
                              >
                                <div className="flex items-center gap-6">
                                  <span className={`font-bold ${isFastest ? 'text-amber-300' : 'text-white'}`}>
                                    {index + 1}. {player?.nickname || 'unknown'}
                                  </span>
                                  <span className="text-sm text-slate-300 italic">{timeDisplay}</span>
                                </div>
                                <span className="text-emerald-300 font-bold">+10pt</span>
                              </div>
                            );
                          })}
                          {hiddenRankingCount > 0 && (
                            <p className="text-right text-xs text-slate-300">他 {hiddenRankingCount} 人</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {revealingPhase === 'prediction' && (
                  <>
                    <h2 className="text-3xl md:text-5xl font-black text-center italic animate-fade-in">予想チャレンジ結果</h2>
                    <div className="rounded-2xl border border-violet-300/35 bg-violet-500/10 px-3 py-4 md:px-7 md:py-6 animate-fade-in">
                      <p className="text-lg md:text-xl text-violet-100 mb-4 text-center">作問者の正解者数予想</p>
                      {state.currentPrediction ? (
                        <div className="space-y-4">
                          <p className="text-lg md:text-2xl text-slate-100 text-center">作問者: <span className="font-bold text-white">{currentAuthorName}</span></p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-end">
                            <div className={`rounded-xl border border-violet-300/25 bg-slate-900/35 p-4 transition-all duration-700 ${showPredictedCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                              <p className="text-base md:text-xl text-violet-100">予想した正解者数</p>
                              <p className="mt-2 text-5xl md:text-6xl font-black text-white tabular-nums leading-none">
                                {showPredictedCount ? animatedPredictedCount : '-'}
                                <span className="ml-2 text-2xl md:text-3xl font-bold text-slate-200">人</span>
                              </p>
                            </div>

                            <div className={`rounded-xl border border-violet-300/25 bg-slate-900/35 p-4 transition-all duration-700 ${showActualCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                              <p className="text-base md:text-xl text-violet-100">実際の正解者数</p>
                              <p className="mt-2 text-5xl md:text-6xl font-black text-emerald-200 tabular-nums leading-none">
                                {showActualCount ? animatedActualCount : '-'}
                                <span className="ml-2 text-2xl md:text-3xl font-bold text-slate-200">人</span>
                              </p>
                            </div>
                          </div>

                          <div className={`rounded-xl border border-slate-500/40 bg-slate-900/30 p-4 transition-all duration-700 text-center ${showPredictionBonus ? 'opacity-100' : 'opacity-0'}`}>
                            <p className="text-lg md:text-xl text-slate-300">予想ボーナス</p>
                            <p className={`mt-2 text-3xl md:text-4xl font-black ${state.currentPrediction.isCorrect ? 'text-amber-200' : 'text-slate-300'}`}>
                              {state.currentPrediction.isCorrect ? '+20pt' : '+0pt'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-300">作問者の予想結果を集計中です...</p>
                      )}
                    </div>
                  </>
                )}

                {revealingPhase === 'prediction' && showPredictionBonus && (
                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-4 py-3">
                    <div className="flex items-center justify-between text-sm md:text-base">
                      <span className="text-slate-300">次の問題への準備状況</span>
                      <span className="font-bold text-emerald-300">{revealReadyCount}/{revealReadyTotal}人</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-slate-700/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${revealReadyPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {state.room.status === 'finished' && (
          <section className="h-full p-4 md:p-6 overflow-hidden">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">総合ランキング</h2>
            <div className="space-y-2">
              {visibleFinishedPlayers.map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2"
                >
                  <div className="flex items-center gap-3 text-lg md:text-xl">
                    <span className="text-emerald-300 font-black w-12">{formatOrdinalRank(visibleFinishedRanks[index])}</span>
                    <span className={`font-semibold italic ${visibleFinishedRanks[index] === 1 ? 'text-yellow-400' : ''}`}>
                      {player.nickname}
                    </span>
                  </div>
                  <span className="text-xl font-black text-white">{player.score} pt</span>
                </div>
              ))}
            </div>
            {hiddenFinishedPlayersCount > 0 && (
              <p className="mt-3 text-sm text-slate-300">他 {hiddenFinishedPlayersCount} 人</p>
            )}

            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={handleReplayFromScreen}
                disabled={isReplaying || isDisbanding}
                className="bg-emerald-700 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
              >
                {isReplaying ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
                    <span>RESETTING...</span>
                  </div>
                ) : (
                  'REPLAY'
                )}
              </button>

              <button
                onClick={handleDisbandFromScreen}
                disabled={isReplaying || isDisbanding}
                className="bg-slate-700/50 disabled:bg-slate-600 text-slate-200 font-bold italic px-4 rounded-xl border border-slate-600 transition-all duration-300 disabled:cursor-not-allowed"
              >
                {isDisbanding ? 'DISBANDING...' : 'DISBAND'}
              </button>
            </div>
          </section>
        )}
      </section>

      {state.reactions.length > 0 && (
        <aside className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 w-[78vw] max-w-sm rounded-xl border border-slate-700 bg-slate-900/80 backdrop-blur-md p-3">
          <p className="text-xs text-slate-400 mb-2">LIVE REACTIONS</p>
          <div className="space-y-1">
            {state.reactions.slice(0, MAX_REACTIONS).map((reaction) => (
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
