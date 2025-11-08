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

  if (!gameState || !currentQuestion) {
    return (
      <div className="text-center p-8">
        <div className="text-2xl font-bold text-gray-600">読み込み中...</div>
      </div>
    );
  }

  const isAuthor = currentQuestion.authorId === currentPlayerId;
  const otherPlayersCount = players.length - 1;

  // 待機画面
  if (waitingForPlayers) {
    const playersReady = gameState.playersReady || [];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">次の問題を準備中...</h2>
        <div className="text-center p-8 bg-blue-50 rounded-lg">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-lg text-gray-700 mb-4">
            他のプレイヤーが準備完了するまでお待ちください
          </p>
          <p className="text-sm text-gray-600">
            準備完了: {playersReady.length} / {players.length}
          </p>
        </div>
        <div className="space-y-2">
          {players.map(player => {
            const isPlayerReady = playersReady.includes(player.playerId);
            return (
              <div
                key={player.playerId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isPlayerReady ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: player.color }} />
                  <span className="font-bold">{player.nickname}</span>
                </div>
                <span className="text-lg">{isPlayerReady ? '✅' : '⏳'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 進捗表示 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-center text-sm text-gray-600">
          問題 {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}
        </p>
      </div>

      <h2 className="text-2xl font-bold text-center">ゲーム進行中</h2>

      {/* 問題表示 */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-800">{currentQuestion.text}</h3>
        {currentQuestion.imageUrl && (
          <div className="w-full">
            <Image
              src={currentQuestion.imageUrl}
              alt="Question"
              width={1200}
              height={800}
              className="max-w-full rounded-lg"
              priority={true}
            />
          </div>
        )}
      </div>

      {!showResults ? (
        <>
          {/* 回答フォーム（出題者以外） */}
          {!isAuthor && !hasSubmittedAnswer && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-700">あなたの回答を選択</h4>
              <div className="space-y-2">
                {currentQuestion.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(index)}
                    className={`w-full text-left px-4 py-3 border-2 rounded-lg transition-colors ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {index + 1}. {choice}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAnswerSubmit}
                disabled={selectedAnswer === null}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg"
              >
                回答を送信
              </button>
            </div>
          )}

          {/* 予想フォーム（出題者のみ） */}
          {isAuthor && !hasSubmittedPrediction && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-700">正解者数を予想してください</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-2">
                  正解者数の予想（0〜{otherPlayersCount}人）
                </label>
                <input
                  type="number"
                  min="0"
                  max={otherPlayersCount}
                  value={predictedCorrectCount}
                  onChange={(e) => setPredictedCorrectCount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handlePredictionSubmit}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                予想を送信
              </button>
            </div>
          )}

          {/* 待機中 */}
          {(hasSubmittedAnswer || (isAuthor && hasSubmittedPrediction)) && (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-lg text-gray-700">他のプレイヤーの回答を待っています...</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 結果表示 */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-700 text-xl">結果発表</h4>

            {/* 正解表示 */}
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <p className="text-sm text-gray-600">正解</p>
              <p className="text-lg font-bold text-green-700">
                {currentQuestion.correctAnswer + 1}. {currentQuestion.choices[currentQuestion.correctAnswer]}
              </p>
            </div>

            {/* 各プレイヤーの回答 */}
            <div className="space-y-2">
              {answers.map(answer => {
                const player = players.find(p => p.playerId === answer.playerId);
                const isCorrect = answer.answer === currentQuestion.correctAnswer;

                return (
                  <div
                    key={answer.playerId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: player?.color }} />
                      <span className="font-bold">{player?.nickname}</span>
                    </div>
                    <div>
                      <span className="text-lg font-bold">
                        {answer.answer + 1}. {currentQuestion.choices[answer.answer]}
                      </span>
                      {isCorrect && <span className="ml-2">✅</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 出題者の予想結果 */}
            {prediction && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-bold text-gray-700 mb-2">出題者の予想</h5>
                <p className="text-sm text-gray-600">予想: {prediction.predictedCount}人正解</p>
                <p className="text-sm text-gray-600">
                  実際: {answers.filter(a => a.answer === currentQuestion.correctAnswer).length}人正解
                </p>
                <p className="text-sm font-bold mt-2">
                  {prediction.predictedCount === answers.filter(a => a.answer === currentQuestion.correctAnswer).length
                    ? '✅ 予想的中！'
                    : '❌ 予想外れ'
                  }
                </p>
              </div>
            )}

            {/* 次へボタン */}
            <button
              onClick={handleNextQuestion}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
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
