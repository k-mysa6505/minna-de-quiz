// app/room/[roomId]/hooks/useGamePlay.ts
// ゲームプレイのロジックを管理するカスタムフック
// Phase 3 リファクタリング: ポーリング廃止 → Firestore onSnapshot で監視
// ゲーム進行（次の問題へ・終了）はFunctions側が担うため、クライアントは送信と表示のみ担当

'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  getAnswers,
  getPrediction,
  submitAnswer,
  submitPrediction,
  markPlayerReady,
  updatePredictionResult,
} from '@/lib/services/gameService';
import { getQuestions } from '@/lib/services/questionService';
import { updatePlayerScore } from '@/lib/services/playerService';
import {
  calculateAnswerScoreDelta,
  calculatePredictionPoints,
  dedupeAnswersByPlayer,
  toMillis,
} from '@/lib/utils/roundScoring';
import type { GameState, GamePhase, Question, Answer, Prediction, Player } from '@/types';

export function useGamePlay(
  roomId: string,
  currentPlayerId: string,
  players: Player[],
  timeLimit: number,
  correctAnswerPoints: number,
  fastestAnswerBonusPoints: number,
  wrongAnswerPenalty: number,
  predictionHitBonusPoints: number
) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [predictedCorrectCount, setPredictedCorrectCount] = useState<number>(0);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [hasSubmittedPrediction, setHasSubmittedPrediction] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswerCount, setCurrentAnswerCount] = useState(0);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isReady, setIsReady] = useState(false);

  const prevQuestionIdRef = useRef<string | null>(null);
  const prevPhaseRef = useRef<GamePhase | undefined>(undefined);
  const hasCalculatedScoreRef = useRef<boolean>(false);
  const timeoutHandledQuestionIdRef = useRef<string | null>(null);

  // ────────────────────────────────────────────
  // 問題一覧を初回ロード（変わらないので一回だけ取得）
  // ────────────────────────────────────────────
  useEffect(() => {
    getQuestions(roomId)
      .then(setAllQuestions)
      .catch((e) => console.error('Failed to load questions:', e));
  }, [roomId]);

  // ────────────────────────────────────────────
  // スコア計算関数を useRef に入れる
  // 理由: useCallback([currentQuestion, players]) にすると players が更新されるたびに
  //         関数が再生成 → useEffect が再実行 → onSnapshot 再購読 → ループの原因になるため
  // ────────────────────────────────────────────
  // 最新の currentQuestion / players を ref で保持→関数を再生成せずとも常に最新値を参照できる
  const currentQuestionRef = useRef<Question | null>(null);
  const playersRef = useRef<Player[]>([]);
  const correctAnswerPointsRef = useRef<number>(correctAnswerPoints);
  const fastestAnswerBonusPointsRef = useRef<number>(fastestAnswerBonusPoints);
  const wrongAnswerPenaltyRef = useRef<number>(wrongAnswerPenalty);
  const predictionHitBonusPointsRef = useRef<number>(predictionHitBonusPoints);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    correctAnswerPointsRef.current = correctAnswerPoints;
  }, [correctAnswerPoints]);

  useEffect(() => {
    fastestAnswerBonusPointsRef.current = fastestAnswerBonusPoints;
  }, [fastestAnswerBonusPoints]);

  useEffect(() => {
    wrongAnswerPenaltyRef.current = wrongAnswerPenalty;
  }, [wrongAnswerPenalty]);

  useEffect(() => {
    predictionHitBonusPointsRef.current = predictionHitBonusPoints;
  }, [predictionHitBonusPoints]);

  const calculateScores = useRef(async (allAnswers: Answer[], pred: Prediction) => {
    const q = currentQuestionRef.current;
    const ps = playersRef.current;
    if (!q) return;

    const uniqueAnswers = dedupeAnswersByPlayer(allAnswers);

    const increments = new Map<string, number>();
    const addIncrement = (playerId: string, points: number) => {
      if (points === 0) {
        return;
      }
      increments.set(playerId, (increments.get(playerId) ?? 0) + points);
    };

    const sortedCorrectAnswers = uniqueAnswers
      .filter((a) => a.isCorrect)
      .sort((left, right) => toMillis(left.answeredAt) - toMillis(right.answeredAt));

    const correctAnswersCount = sortedCorrectAnswers.length;
    const fastestCorrectPlayerId = sortedCorrectAnswers[0]?.playerId;

    const predictionPoints = calculatePredictionPoints(
      pred.predictedCount,
      correctAnswersCount,
      predictionHitBonusPointsRef.current
    );
    const isPredictionHit = Math.abs(pred.predictedCount - correctAnswersCount) === 0;

    await updatePredictionResult(
      roomId,
      q.questionId,
      correctAnswersCount,
      isPredictionHit
    ).catch(console.error);

    // 回答ポイントを集計
    for (const answer of uniqueAnswers) {
      const player = ps.find((p) => p.playerId === answer.playerId);
      if (!player) {
        continue;
      }

      const delta = calculateAnswerScoreDelta({
        isCorrect: answer.isCorrect,
        correctAnswerPoints: correctAnswerPointsRef.current,
        fastestAnswerBonusPoints: fastestAnswerBonusPointsRef.current,
        wrongAnswerPenalty: wrongAnswerPenaltyRef.current,
        isFastestCorrect: answer.playerId === fastestCorrectPlayerId,
      });
      addIncrement(answer.playerId, delta);
    }

    // 作問者の予想ポイントを集計
    if (predictionPoints > 0) {
      addIncrement(q.authorId, predictionPoints);
    }

    // 1プレイヤー1回でスコア更新する
    for (const player of ps) {
      const gained = increments.get(player.playerId) ?? 0;
      if (gained === 0) {
        continue;
      }
      await updatePlayerScore(roomId, player.playerId, player.score + gained).catch(console.error);
    }
  });

  // ────────────────────────────────────────────
  // gameState をリアルタイム監視（onSnapshot）
  // ポーリング廃止: Functionsが phase を更新 → クライアントはそれを受信するだけ
  // ────────────────────────────────────────────
  useEffect(() => {
    if (allQuestions.length === 0) return;

    const gameStateRef = doc(db, 'rooms', roomId, 'gameState', 'state');
    const unsubscribe = onSnapshot(gameStateRef, (snap) => {
      if (!snap.exists()) return;
      const state = snap.data() as GameState;
      setGameState(state);

      const currentQuestionId = state.questionOrder[state.currentQuestionIndex];
      const question = allQuestions.find((q) => q.questionId === currentQuestionId) ?? null;

      // ────── 問題が切り替わったときのリセット ──────
      if (question && prevQuestionIdRef.current !== question.questionId) {
        prevQuestionIdRef.current = question.questionId;
        timeoutHandledQuestionIdRef.current = null;
        prevPhaseRef.current = undefined;
        setSelectedAnswer(null);
        setPredictedCorrectCount(0);
        setHasSubmittedAnswer(false);
        setHasSubmittedPrediction(false);
        setShowResults(false);
        setAnswers([]);
        setCurrentAnswerCount(0);
        setPrediction(null);
        setIsReady(false);
        hasCalculatedScoreRef.current = false;
      }

      setCurrentQuestion(question);

      // ────── phase が 'revealing' に変わったとき ──────
      // 「直前の phase が 'revealing' でない」ときに発火。
      // 初回起動時に phase が undefined または 'answering' であっても正しく検知できる。
      const phase = state.phase;
      if (phase === 'revealing' && prevPhaseRef.current !== 'revealing') {
        // 結果を取得して表示
        if (question && !hasCalculatedScoreRef.current) {
          (async () => {
            try {
              const allAnswers = await getAnswers(roomId, question.questionId);
              const pred = await getPrediction(roomId, question.questionId);
              setAnswers(allAnswers);
              setCurrentAnswerCount(allAnswers.length + (pred ? 1 : 0));
              setPrediction(pred);
              setShowResults(true);

              if (pred && !hasCalculatedScoreRef.current) {
                hasCalculatedScoreRef.current = true;
                await calculateScores.current(allAnswers, pred);
              }
            } catch (err) {
              console.error('Failed to load results:', err);
            }
          })();
        }
      }
      prevPhaseRef.current = phase;

      // ────── playersReady の状態を反映 ──────
      const playersReady = state.playersReady ?? [];
      const amIReady = playersReady.includes(currentPlayerId);
      setIsReady(amIReady);
    });

    return () => unsubscribe();
  }, [roomId, allQuestions, currentPlayerId]);

  // ────────────────────────────────────────────
  // 自分の回答提出状態をリアルタイム監視
  // ────────────────────────────────────────────
  useEffect(() => {
    if (!currentQuestion) return;
    if (!auth.currentUser) return;

    const answersRef = collection(db, 'rooms', roomId, 'answers');
    const myAnswerQuery = query(
      answersRef,
      where('questionId', '==', currentQuestion.questionId),
      where('playerId', '==', currentPlayerId)
    );

    const unsubscribe = onSnapshot(
      myAnswerQuery,
      (snap) => {
        const isAuthor = currentQuestion.authorId === currentPlayerId;
        if (!isAuthor) {
          setHasSubmittedAnswer(!snap.empty);
        }
      },
      (error) => {
        console.error('Failed to subscribe to my answers:', error);
      }
    );

    return () => unsubscribe();
  }, [roomId, currentQuestion, currentPlayerId]);

  // ────────────────────────────────────────────
  // 回答数をリアルタイム監視（提出人数の表示用）
  // ────────────────────────────────────────────
  useEffect(() => {
    if (!currentQuestion) return;
    if (!auth.currentUser) return;

    // answers と predictions を両方監視し、合計で currentAnswerCount を更新
    // 作問者の予想も「回答済み」としてカウントする
    let answerCount = 0;
    let predCount = 0;

    const answersRef = collection(db, 'rooms', roomId, 'answers');
    const answersQuery = query(
      answersRef,
      where('questionId', '==', currentQuestion.questionId)
    );

    const unsubAnswers = onSnapshot(
      answersQuery,
      (snap) => {
        answerCount = snap.size;
        setAnswers(snap.docs.map((doc) => doc.data() as Answer));
        setCurrentAnswerCount(answerCount + predCount);
      },
      (error) => {
        console.error('Failed to subscribe to answers:', error);
      }
    );

    const predictionsRef = collection(db, 'rooms', roomId, 'predictions');
    const predQuery = query(
      predictionsRef,
      where('questionId', '==', currentQuestion.questionId)
    );

    const unsubPred = onSnapshot(
      predQuery,
      (snap) => {
        predCount = snap.empty ? 0 : 1;
        setCurrentAnswerCount(answerCount + predCount);
        if (!snap.empty) {
          setHasSubmittedPrediction(true);
          setPrediction(snap.docs[0].data() as Prediction);
        }
      },
      (error) => {
        console.error('Failed to subscribe to predictions:', error);
      }
    );

    return () => {
      unsubAnswers();
      unsubPred();
    };
  }, [roomId, currentQuestion]);

  // ────────────────────────────────────────────
  // 制限時間ありの場合、時間切れで未提出プレイヤーの送信を自動実行
  // ────────────────────────────────────────────
  useEffect(() => {
    if (timeLimit <= 0) return;
    if (!currentQuestion || !gameState) return;
    if (gameState.phase !== 'answering') return;

    const questionId = currentQuestion.questionId;
    if (timeoutHandledQuestionIdRef.current === questionId) {
      return;
    }

    const startedAtMs = toMillis(gameState.questionStartedAt);
    if (startedAtMs <= 0) {
      return;
    }

    const isAuthor = currentQuestion.authorId === currentPlayerId;

    const submitOnTimeout = async () => {
      if (timeoutHandledQuestionIdRef.current === questionId) {
        return;
      }
      timeoutHandledQuestionIdRef.current = questionId;

      try {
        if (isAuthor) {
          if (!hasSubmittedPrediction) {
            await submitPrediction(roomId, questionId, currentPlayerId, predictedCorrectCount);
            setHasSubmittedPrediction(true);
          }
          return;
        }

        if (hasSubmittedAnswer) {
          return;
        }

        // タイムアウト時は必ず不正解になる選択肢を送信する。
        const fallbackAnswer = currentQuestion.correctAnswer === 0 ? 1 : 0;
        await submitAnswer(roomId, questionId, currentPlayerId, fallbackAnswer, false);
        setHasSubmittedAnswer(true);
      } catch (error) {
        console.error('Failed to submit timeout fallback:', error);
      }
    };

    const deadlineMs = startedAtMs + timeLimit * 1000;
    const remainingMs = deadlineMs - Date.now();

    if (remainingMs <= 0) {
      void submitOnTimeout();
      return;
    }

    const timer = setTimeout(() => {
      void submitOnTimeout();
    }, remainingMs + 50);

    return () => clearTimeout(timer);
  }, [
    roomId,
    currentPlayerId,
    currentQuestion,
    gameState,
    hasSubmittedAnswer,
    hasSubmittedPrediction,
    predictedCorrectCount,
    timeLimit,
  ]);

  // ────────────────────────────────────────────
  // ハンドラ
  // ────────────────────────────────────────────

  const handleAnswerSubmit = async () => {
    if (selectedAnswer === null || !currentQuestion) return;
    try {
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      await submitAnswer(
        roomId,
        currentQuestion.questionId,
        currentPlayerId,
        selectedAnswer,
        isCorrect
      );
      setHasSubmittedAnswer(true);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handlePredictionSubmit = async () => {
    if (!currentQuestion) return;
    try {
      await submitPrediction(
        roomId,
        currentQuestion.questionId,
        currentPlayerId,
        predictedCorrectCount
      );
      setHasSubmittedPrediction(true);
    } catch (error) {
      console.error('Failed to submit prediction:', error);
    }
  };

  const handleNextQuestion = async () => {
    if (!gameState) return;
    try {
      // クライアントは「準備完了」とマークするだけ。
      // Functionsが全員の ready を確認して次の問題へ進める。
      await markPlayerReady(roomId, currentPlayerId);
      setIsReady(true);
    } catch (error) {
      console.error('Failed to mark ready:', error);
    }
  };

  const waitingForPlayers = isReady;

  return {
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
  };
}
