// app/room/[roomId]/components/GamePlayPhase.tsx
'use client';

import Image from 'next/image';
import { useGamePlay } from '../hooks/useGamePlay';
import { ResultDisplayPhase } from './ResultDisplayPhase';
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
    answers,
    currentAnswerCount,
    prediction,
    isReady,
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
        gameState={gameState}
        currentQuestion={currentQuestion}
        players={players}
        answers={answers}
        prediction={prediction}
        currentPlayerId={currentPlayerId}
        isReady={isReady}
        waitingForPlayers={waitingForPlayers}
        handleNextQuestion={handleNextQuestion}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 進捗表示 */}
      <div className="flex justify-between px-3 items-center text-slate-200">
        <p>問題 {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}</p>
        <p className="italic">
          作成者：{players.find(p => p.playerId === currentQuestion.authorId)?.nickname || 'unknown'}
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
            解答済みプレイヤー {currentAnswerCount} / {players.length}
          </p>
        </div>
      )}
    </div>
  );
}
