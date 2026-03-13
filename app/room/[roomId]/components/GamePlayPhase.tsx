// app/room/[roomId]/components/GamePlayPhase.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGamePlay } from '../hooks/useGamePlay';
import { ResultDisplayPhase } from './ResultDisplayPhase';
import { sendRoomReaction } from '@/lib/services/reactionService';
import type { Player } from '@/types';
import LoadingSpinner from '@/app/common/LoadingSpinner';

interface GamePlayPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  useScreenMode: boolean;
  timeLimit: number;
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

export function GamePlayPhase({ roomId, players, currentPlayerId, useScreenMode, timeLimit }: GamePlayPhaseProps) {
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
  } = useGamePlay(roomId, currentPlayerId, players, timeLimit);

  const currentPlayer = players.find((player) => player.playerId === currentPlayerId);
  const [lastReactionAt, setLastReactionAt] = useState(0);

  const handleSendReaction = async (
    type: 'reaction' | 'message',
    content: string,
    eventTimestamp: number
  ) => {
    if (eventTimestamp - lastReactionAt < 1000 || !currentPlayer) {
      return;
    }

    setLastReactionAt(eventTimestamp);
    await sendRoomReaction({
      roomId,
      userId: currentPlayerId,
      userName: currentPlayer.nickname,
      type,
      content,
      questionId: currentQuestion?.questionId,
    });
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
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-4 sm:p-6">
          <p className="text-center text-slate-300 text-sm sm:text-base font-medium">
            問題はスクリーンに表示中です。スマホでは回答を選んで送信してください。
          </p>
        </div>
      )}

      {/* 回答フォーム（出題者以外）- 2×2グリッド */}
      {!isAuthor && !hasSubmittedAnswer && (
        <div className="space-y-6">
          <div className={`grid gap-3 sm:gap-4 ${useScreenMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
            {currentQuestion.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(index)}
                className={`
                  relative rounded-xl border-4 transition-all duration-300 font-bold text-lg flex flex-col items-center justify-center
                  ${useScreenMode ? 'p-5 sm:p-6 min-h-[84px] sm:min-h-[120px]' : 'p-6 min-h-[120px]'}
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

      {useScreenMode && (
        <div className="space-y-4 bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 sm:p-5">
          <p className="text-sm text-slate-300 font-medium">リアクション</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {REACTION_STAMPS.map((stamp) => (
              <button
                key={stamp}
                type="button"
                onClick={(event) => handleSendReaction('reaction', stamp, event.timeStamp)}
                className="py-2 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-xl transition-all"
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
                className="py-2 px-3 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-xs sm:text-sm text-slate-100 transition-all"
              >
                {message}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">送信は1秒に1回までです</p>
        </div>
      )}
    </div>
  );
}
