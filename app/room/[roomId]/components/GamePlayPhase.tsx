// app/room/[roomId]/components/GamePlayPhase.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGamePlay } from '../hooks/useGamePlay';
import type { Player, Answer } from '@/types';

interface GamePlayPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
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

export function GamePlayPhase({ roomId, players, currentPlayerId }: GamePlayPhaseProps) {
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
    prediction,
    waitingForPlayers,
    handleAnswerSubmit,
    handlePredictionSubmit,
    handleNextQuestion,
  } = useGamePlay(roomId, currentPlayerId, players);

  const [showAnswerReveal, setShowAnswerReveal] = useState(false);
  const [revealedPlayers, setRevealedPlayers] = useState<string[]>([]);
  const [showPredictionResult, setShowPredictionResult] = useState(false);

  // 問題が変わったときstateをリセット
  useEffect(() => {
    if (!showResults) {
      setShowAnswerReveal(false);
      setRevealedPlayers([]);
      setShowPredictionResult(false);
    }
  }, [showResults]);

  // 結果表示時に回答者一覧を表示
  useEffect(() => {
    if (showResults) {
      setShowAnswerReveal(true);
    }
  }, [showResults]);

  // 回答者を順番に表示
  useEffect(() => {
    if (showAnswerReveal && answers.length > 0) {
      const correctAnswers = answers.filter(a => a.isCorrect)
        .sort((a, b) => {
          const timeA = typeof a.answeredAt === 'object' && 'toDate' in a.answeredAt
            ? a.answeredAt.toDate().getTime()
            : 0;
          const timeB = typeof b.answeredAt === 'object' && 'toDate' in b.answeredAt
            ? b.answeredAt.toDate().getTime()
            : 0;
          return timeB - timeA; // 遅い順
        });

      if (correctAnswers.length === 0) {
        // 正解者が0人の場合は即座に出題者の予想を表示
        setShowPredictionResult(true);
        return;
      }

      let index = 0;
      const interval = setInterval(() => {
        if (index < correctAnswers.length) {
          const currentAnswer = correctAnswers[index];
          if (currentAnswer && currentAnswer.playerId) {
            setRevealedPlayers(prev => [...prev, currentAnswer.playerId]);
          }
          index++;
        } else {
          clearInterval(interval);
          // 全員表示後、出題者の予想結果を表示
          setShowPredictionResult(true);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [showAnswerReveal, answers]);

  if (!gameState || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-2xl font-bold text-slate-300 animate-pulse">読み込み中...</div>
      </div>
    );
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

  return (
    <div className="space-y-6">
      {/* 進捗表示 */}
      <div className="flex justify-between px-3 items-center text-slate-200">
        <p>問題 {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}</p>
        <p className="italic">
          作成者：{players.find(p => p.playerId === currentQuestion.authorId)?.nickname || '不明'}
        </p>
      </div>

      {/* 問題表示 */}
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
            />
          </div>
        )}
      </div>

      {!showResults ? (
        <>
          {/* 回答フォーム（出題者以外）- 2×2グリッド */}
          {!isAuthor && !hasSubmittedAnswer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(index)}
                    className={`
                      relative p-6 rounded-xl border-4 transition-all duration-300 font-bold text-lg min-h-[120px] flex flex-col items-center justify-center
                      ${selectedAnswer === index
                        ? `${CHOICE_COLORS[index].selected} ${CHOICE_COLORS[index].border} shadow-2xl scale-105`
                        : `${CHOICE_COLORS[index].bg} ${CHOICE_COLORS[index].border} ${CHOICE_COLORS[index].hover} shadow-lg hover:scale-102`
                      }
                      ${CHOICE_COLORS[index].text}
                    `}
                  >
                    <div className="text-sm opacity-80 mb-2">{index + 1}</div>
                    <div className="break-words text-center">{choice}</div>
                    {selectedAnswer === index && (
                      <div className="absolute top-2 right-2 text-2xl">✓</div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAnswerSubmit}
                disabled={selectedAnswer === null}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-6 rounded-md shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
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
                解答済みプレイヤー {(gameState.playersReady?.length || 0)} / {players.length}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
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
                {answers.filter(a => a.isCorrect).length === 0 ? (
                  <div className="text-center text-slate-400 italic py-4">
                    正解者なし
                  </div>
                ) : (
                  (() => {
                    const correctAnswers = answers
                      .filter(a => a.isCorrect)
                      .sort((a, b) => {
                        const timeA = typeof a.answeredAt === 'object' && 'toDate' in a.answeredAt
                          ? a.answeredAt.toDate().getTime()
                          : 0;
                        const timeB = typeof b.answeredAt === 'object' && 'toDate' in b.answeredAt
                          ? b.answeredAt.toDate().getTime()
                          : 0;
                        return timeB - timeA;
                      });

                    // 問題開始時刻を取得
                    const questionStartTime = gameState.questionStartedAt && typeof gameState.questionStartedAt === 'object' && 'toDate' in gameState.questionStartedAt
                      ? gameState.questionStartedAt.toDate().getTime()
                      : 0;

                    return correctAnswers.map((answer, idx, arr) => {
                      const player = players.find(p => p.playerId === answer.playerId);
                      const isFastest = idx === arr.length - 1;
                      const isRevealed = revealedPlayers.includes(answer.playerId);

                      if (!isRevealed) return null;

                      // 回答開始からの経過時間を計算
                      const answerTime = typeof answer.answeredAt === 'object' && 'toDate' in answer.answeredAt
                        ? answer.answeredAt.toDate().getTime()
                        : 0;
                      const elapsedMs = questionStartTime > 0 ? answerTime - questionStartTime : 0;
                      const seconds = Math.floor(elapsedMs / 1000);
                      const centiseconds = Math.floor((elapsedMs % 1000) / 10);
                      const timeDisplay = `${seconds}''${centiseconds.toString().padStart(2, '0')}`;

                      return (
                        <div
                          key={answer.playerId}
                          className="flex justify-between items-center px-4 py-1 animate-fade-in"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-lg ${
                              isFastest ? 'text-yellow-400' : 'text-white'
                            }`}>
                              {player?.nickname || '不明'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {timeDisplay}
                            </span>
                          </div>
                          <span className="text-emerald-400 font-bold">+10pt</span>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* 出題者の予想結果 */}
              {prediction && showPredictionResult && (
                <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 rounded-xl border border-purple-600/50 p-6 animate-fade-in">
                  <p className="text-sm text-purple-300 mb-3 text-center">出題者の予想</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">
                        {players.find(p => p.playerId === currentQuestion.authorId)?.nickname || '不明'}
                      </p>
                      <p className="text-sm text-slate-300">
                        予想: {prediction.predictedCount}人 / 実際: {answers.filter(a => a.isCorrect).length}人
                      </p>
                    </div>
                    {prediction.isCorrect && (
                      <span className="text-emerald-400 font-bold">+20pt</span>
                    )}
                  </div>
                </div>
              )}

              {/* 次へボタン */}
              <button
                onClick={handleNextQuestion}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 px-6 rounded-md shadow-lg transition-all duration-300"
              >
                {gameState.currentQuestionIndex >= gameState.totalQuestions - 1
                  ? '結果を見る'
                  : '次の問題へ'
                }
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
