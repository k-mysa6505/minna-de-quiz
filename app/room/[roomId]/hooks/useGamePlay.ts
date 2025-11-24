// app/room/[roomId]/hooks/useGamePlay.ts
// ゲームプレイのロジックを管理するカスタムフック
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getGameState, getAnswers, getPrediction, submitAnswer, submitPrediction, markPlayerReady, nextQuestion, updatePredictionResult } from '@/lib/services/gameService';
import { getQuestions } from '@/lib/services/questionService';
import { updatePlayerScore } from '@/lib/services/playerService';
import { updateRoomStatus } from '@/lib/services/roomService';
import type { GameState, Question, Answer, Prediction, Player } from '@/types';

export function useGamePlay(roomId: string, currentPlayerId: string, players: Player[]) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [predictedCorrectCount, setPredictedCorrectCount] = useState<number>(0);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [hasSubmittedPrediction, setHasSubmittedPrediction] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswerCount, setCurrentAnswerCount] = useState(0);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [waitingForPlayers, setWaitingForPlayers] = useState(false);

  const prevQuestionIdRef = useRef<string | null>(null);
  const hasCalculatedScoreRef = useRef<boolean>(false);
  const hasTriggeredNextQuestionRef = useRef<boolean>(false);

  // スコア計算関数（useCallbackで安定化）
  const calculateScores = useCallback(async (allAnswers: Answer[], pred: Prediction) => {
    if (!currentQuestion) return;

    const correctAnswersCount = allAnswers.filter(a => a.isCorrect).length;
    const isCorrect = pred.predictedCount === correctAnswersCount;

    // 予想結果をデータベースに更新
    await updatePredictionResult(
      roomId,
      currentQuestion.questionId,
      correctAnswersCount,
      isCorrect
    ).catch(console.error);

    // 正解者にポイント付与（10点）
    for (const answer of allAnswers) {
      if (answer.isCorrect) {
        const player = players.find(p => p.playerId === answer.playerId);
        if (player) {
          await updatePlayerScore(roomId, answer.playerId, player.score + 10).catch(console.error);
        }
      }
    }

    // 出題者の予想が的中した場合にポイント付与（20点）
    if (isCorrect) {
      const author = players.find(p => p.playerId === currentQuestion.authorId);
      if (author) {
        await updatePlayerScore(roomId, currentQuestion.authorId, author.score + 20).catch(console.error);
      }
    }
  }, [currentQuestion, players, roomId]);

  // ゲーム状態と問題を取得
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const state = await getGameState(roomId);
        const allQuestions = await getQuestions(roomId);

        if (state && allQuestions.length > 0) {
          setGameState(state);

          const currentQuestionId = state.questionOrder[state.currentQuestionIndex];
          const question = allQuestions.find(q => q.questionId === currentQuestionId);

          // 問題が変わった時に状態をリセット
          if (question && prevQuestionIdRef.current !== question.questionId) {
            prevQuestionIdRef.current = question.questionId;
            setSelectedAnswer(null);
            setPredictedCorrectCount(0);
            setHasSubmittedAnswer(false);
            setHasSubmittedPrediction(false);
            setShowResults(false);
            setAnswers([]);
            setCurrentAnswerCount(0);
            setPrediction(null);
            setIsReady(false);
            setWaitingForPlayers(false);
            hasCalculatedScoreRef.current = false;
            hasTriggeredNextQuestionRef.current = false;
          }

          setCurrentQuestion(question || null);

          // 準備完了状態をチェック
          const playersReady = state.playersReady || [];
          const amIReady = playersReady.includes(currentPlayerId);
          setIsReady(amIReady);

          if (playersReady.length >= players.length && playersReady.length > 0) {
            // 全員準備完了したら次の問題へ進む（最初のプレイヤーのみ実行、最後の問題でない場合のみ）
            const isLastQuestion = state.currentQuestionIndex >= state.totalQuestions - 1;
            const shouldProceed = playersReady.length === players.length && 
                                  playersReady[0] === currentPlayerId &&
                                  !isLastQuestion &&
                                  !hasTriggeredNextQuestionRef.current;
            if (shouldProceed && amIReady) {
              hasTriggeredNextQuestionRef.current = true;
              setTimeout(async () => {
                try {
                  await nextQuestion(roomId);
                } catch (err) {
                  console.error('Failed to proceed to next question:', err);
                }
              }, 500);
            }
            setWaitingForPlayers(false);
          } else if (amIReady) {
            setWaitingForPlayers(true);
          }
        }
      } catch (error) {
        console.error('Failed to load game data:', error);
      }
    };

    loadGameData();
    const interval = setInterval(loadGameData, 1000);
    return () => clearInterval(interval);
  }, [roomId, currentPlayerId, players.length]);

  // 回答と予想の送信状態をチェック
  useEffect(() => {
    const checkSubmissions = async () => {
      if (!currentQuestion) return;

      try {
        const isAuthor = currentQuestion.authorId === currentPlayerId;

        const allAnswers = await getAnswers(roomId, currentQuestion.questionId);

        const pred = await getPrediction(roomId, currentQuestion.questionId);
        setHasSubmittedPrediction(!!pred);
        setPrediction(pred);

        // 現在の回答数を更新（出題者の予想も含める）
        const totalSubmissions = allAnswers.length + (pred ? 1 : 0);
        setCurrentAnswerCount(totalSubmissions);

        // 出題者は回答を送信しないので、回答者の場合のみチェック
        if (!isAuthor) {
          const myAnswer = allAnswers.find(a => a.playerId === currentPlayerId);
          setHasSubmittedAnswer(!!myAnswer);
        } else {
          // 出題者の場合は常にfalse
          setHasSubmittedAnswer(false);
        }

        const otherPlayersCount = players.length - 1;

        if (allAnswers.length === otherPlayersCount && pred && !showResults) {
          setShowResults(true);
          setAnswers(allAnswers);

          // スコア計算（一度だけ）
          if (!hasCalculatedScoreRef.current) {
            hasCalculatedScoreRef.current = true;
            await calculateScores(allAnswers, pred);
          }
        }
      } catch (error) {
        console.error('Failed to check submissions:', error);
      }
    };

    const interval = setInterval(checkSubmissions, 2000);
    checkSubmissions();
    return () => clearInterval(interval);
  }, [roomId, currentQuestion, currentPlayerId, players, showResults, calculateScores]);

  const handleAnswerSubmit = async () => {
    if (selectedAnswer === null || !currentQuestion) return;

    try {
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      await submitAnswer(roomId, currentQuestion.questionId, currentPlayerId, selectedAnswer, isCorrect);
      setHasSubmittedAnswer(true);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handlePredictionSubmit = async () => {
    if (!currentQuestion) return;

    try {
      await submitPrediction(roomId, currentQuestion.questionId, currentPlayerId, predictedCorrectCount);
      setHasSubmittedPrediction(true);
    } catch (error) {
      console.error('Failed to submit prediction:', error);
    }
  };

  const handleNextQuestion = async () => {
    if (!gameState) return;

    try {
      if (gameState.currentQuestionIndex >= gameState.totalQuestions - 1) {
        // 最後の問題：スコア計算完了を待つ
        console.log('Last question. Waiting for score calculation...');

        let waitTime = 0;
        const maxWait = 5000;
        const checkInterval = 500;

        while (waitTime < maxWait && !hasCalculatedScoreRef.current) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
        }

        console.log('Moving to finished state...');
        await updateRoomStatus(roomId, 'finished');
      } else {
        // 次の問題へ
        await markPlayerReady(roomId, currentPlayerId);
        setIsReady(true);
        setWaitingForPlayers(true);
      }
    } catch (error) {
      console.error('Failed to go to next question:', error);
    }
  };

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
