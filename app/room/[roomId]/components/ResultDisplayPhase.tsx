'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Player, Answer, GameState, Question } from '@/types';

interface ResultDisplayPhaseProps {
  gameState: GameState;
  currentQuestion: Question;
  players: Player[];
  answers: Answer[];
  prediction: { predictedCount: number; isCorrect: boolean } | null;
  currentPlayerId: string;
  isReady: boolean;
  waitingForPlayers: boolean;
  handleNextQuestion: () => void;
}

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
  return answers
    .filter((answer) => answer.isCorrect)
    .sort((a, b) => toTimestamp(a.answeredAt) - toTimestamp(b.answeredAt));
}

export function ResultDisplayPhase({
  gameState,
  currentQuestion,
  players,
  answers,
  prediction,
  isReady,
  waitingForPlayers,
  handleNextQuestion,
}: ResultDisplayPhaseProps) {
  const [showAnswerReveal, setShowAnswerReveal] = useState(false);
  const [revealedPlayers, setRevealedPlayers] = useState<string[]>([]);
  const [showPredictionResult, setShowPredictionResult] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);

  const correctAnswers = useMemo(() => sortCorrectAnswers(answers), [answers]);
  const correctAnswerCount = correctAnswers.length;
  const questionStartTime = useMemo(
    () => toTimestamp(gameState.questionStartedAt),
    [gameState.questionStartedAt]
  );

  // 結果表示時に回答者一覧を表示
  useEffect(() => {
    setShowAnswerReveal(true);
  }, []);

  // 回答者を順番に表示
  useEffect(() => {
    if (showAnswerReveal && answers.length > 0) {
      if (correctAnswers.length === 0) {
        // 正解者が0人の場合は2秒後に出題者の予想を表示
        const timer = setTimeout(() => setShowPredictionResult(true), 2000);
        return () => clearTimeout(timer);
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
          // 全員表示後、1秒待ってから出題者の予想結果を表示
          setTimeout(() => setShowPredictionResult(true), 1000);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [showAnswerReveal, answers.length, correctAnswers]);

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

  return (
    <div className="space-y-6">
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

                return (
                  <div
                    key={answer.playerId}
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
                    <span className="text-emerald-400 font-bold">+10pt</span>
                  </div>
                );
              })
            )}
          </div>

          {/* 出題者の予想結果 */}
          {prediction && showPredictionResult && (
            <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/30 rounded-xl border border-purple-600/50 p-6 animate-fade-in">
              <p className="text-sm text-purple-300 mb-3 text-center">出題者の予想</p>
              <div className="flex justify-between items-center px-4 py-1">
                <div className="flex items-center gap-10">
                  <p className="text-white font-bold">
                    {players.find(p => p.playerId === currentQuestion.authorId)?.nickname || 'unknown'}
                  </p>
                  <p className="text-sm text-slate-300 italic">
                    予想: {prediction.predictedCount}人 / 実際: {correctAnswerCount}人
                  </p>
                </div>
                <span className={prediction.isCorrect ? "text-emerald-400 font-bold" : "text-gray-400 font-bold"}>
                  {prediction.isCorrect ? '+20pt' : '+0pt'}
                </span>
              </div>
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
  );
}
