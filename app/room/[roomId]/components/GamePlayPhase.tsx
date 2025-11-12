// app/room/[roomId]/components/GamePlayPhase.tsx
'use client';

import Image from 'next/image';
import { useGamePlay } from '../hooks/useGamePlay';
import type { Player } from '@/types';

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
    waitingForPlayers,
    handleAnswerSubmit,
    handlePredictionSubmit,
    handleNextQuestion,
  } = useGamePlay(roomId, currentPlayerId, players);

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
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
      <div className="text-center">
        <p className="text-slate-400 text-sm">
          問題 {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}
        </p>
      </div>

      {/* 問題表示 */}
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 space-y-6">
        <h3 className="text-2xl font-bold text-white text-center">{currentQuestion.text}</h3>
        {currentQuestion.imageUrl && (
          <div className="w-full bg-slate-700/30 rounded-xl p-4">
            <Image
              src={currentQuestion.imageUrl}
              alt="Question"
              width={1200}
              height={800}
              className="max-w-full rounded-xl mx-auto"
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
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
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
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-center text-2xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handlePredictionSubmit}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                予想を送信
              </button>
            </div>
          )}

          {/* 待機中 */}
          {(hasSubmittedAnswer || (isAuthor && hasSubmittedPrediction)) && (
            <div className="text-center p-10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-lg text-slate-200 font-medium">他のプレイヤーの回答を待っています...</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 結果表示 - 簡略版（後で詳細実装） */}
          <div className="space-y-6">
            <h4 className="font-bold text-white text-2xl text-center">結果発表</h4>

            <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 border-2 border-green-600/50 rounded-xl p-6">
              <p className="text-sm text-green-300 mb-2">正解</p>
              <p className="text-xl font-bold text-white">
                {currentQuestion.correctAnswer + 1}. {currentQuestion.choices[currentQuestion.correctAnswer]}
              </p>
            </div>

            {/* 次へボタン */}
            <button
              onClick={handleNextQuestion}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-300"
            >
              {gameState.currentQuestionIndex >= gameState.totalQuestions - 1
                ? '結果を見る'
                : '次の問題へ'
              }
            </button>
          </div>
        </>
      )}
    </div>
  );
}
