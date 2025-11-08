// app/room/[roomId]/page.tsx
// ゲームルームページ - メイン画面
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { subscribeToRoom, updateRoomStatus, deleteRoom } from '@/lib/services/roomService';
import { subscribeToPlayers, updatePlayerOnlineStatus } from '@/lib/services/playerService';
import { createQuestion, getQuestionProgress, getQuestions } from '@/lib/services/questionService';
import { uploadQuestionImage } from '@/lib/services/storageService';
import { initializeGame, getGameState, submitAnswer, submitPrediction, getAnswers, getPrediction, nextQuestion } from '@/lib/services/gameService';
import type { Room, Player, RoomStatus, QuestionFormData, Question, GameState, Answer, Prediction } from '@/types';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  // Initialize currentPlayerId, loading and error from localStorage synchronously (client-side)
  const initialPlayerId =
    typeof window !== 'undefined' ? (localStorage.getItem('currentPlayerId') || '') : '';
  const [currentPlayerId, setCurrentPlayerId] = useState<string>(initialPlayerId);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(initialPlayerId ? true : false);
  const [error, setError] = useState<string>(
    initialPlayerId ? '' : 'プレイヤー情報が見つかりません。再度ルームに参加してください。'
  );

  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }

    // プレイヤーをオンラインに設定
    updatePlayerOnlineStatus(roomId, currentPlayerId, true).catch(console.error);

    // ルーム情報を取得＆監視
    const unsubscribeRoom = subscribeToRoom(roomId, (roomData) => {
      if (roomData) {
        setRoom(roomData);
        setError('');
      } else {
        setError('ルームが存在しません');
      }
      setLoading(false);
    });

    // プレイヤー情報を取得＆監視
    const unsubscribePlayers = subscribeToPlayers(roomId, (playerList) => {
      setPlayers(playerList);
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
      // ページを離れるときにオフラインにする（finished状態以外）
      if (room?.status !== 'finished') {
        updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
      }
    };
  }, [roomId, currentPlayerId, room?.status]);

  // ローディング中
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-2xl font-bold text-gray-600">読み込み中...</div>
      </div>
    );
  }

  // エラー表示
  if (error || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 space-y-4 text-center">
          <div className="text-6xl">😢</div>
          <h1 className="text-2xl font-bold text-gray-800">
            ルームが見つかりません
          </h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // ゲーム状態に応じた画面を表示
  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー: ルームID表示 */}
        <header className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                ルーム: {roomId}
              </h1>
              <p className="text-gray-600">
                状態: {getRoomStatusLabel(room.status)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">プレイヤー数</p>
              <p className="text-2xl font-bold text-blue-600">
                {players.length}
              </p>
            </div>
          </div>
        </header>

        {/* メインコンテンツ: ゲーム状態に応じて切り替え */}
        <div className="bg-white rounded-lg shadow p-6">
          {room.status === 'waiting' && (
            <WaitingPhase
              roomId={roomId}
              players={players}
              currentPlayerId={currentPlayerId}
              isMaster={room.masterId === currentPlayerId}
            />
          )}

          {room.status === 'creating' && (
            <QuestionCreationPhase
              roomId={roomId}
              players={players}
              currentPlayerId={currentPlayerId}
            />
          )}

          {room.status === 'playing' && (
            <GamePlayPhase
              roomId={roomId}
              players={players}
              currentPlayerId={currentPlayerId}
            />
          )}

          {room.status === 'finished' && (
            <FinalResultPhase
              roomId={roomId}
              players={players}
            />
          )}
        </div>
      </div>
    </main>
  );
}

// ========================================
// フェーズ別コンポーネント
// ========================================

/** 待機フェーズ */
function WaitingPhase({
  roomId,
  players,
  currentPlayerId,
  isMaster,
}: {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  isMaster: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">プレイヤー待機中</h2>

      {/* プレイヤー一覧コンポーネント */}
      <div className="text-gray-600 text-center">
        プレイヤー一覧
        <ul className="mt-4 space-y-2">
          {players.map((player) => (
            <li
              key={player.playerId}
              className={`flex items-center justify-center space-x-4 p-2 border rounded-lg ${
                player.playerId === currentPlayerId ? 'bg-blue-50 border-blue-400' : 'bg-gray-100 border-gray-300'
              }`}
            >
              {/* プレイヤーカラー表示 */}
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: player.color }}
              >
              </div>
              {/* ニックネーム表示 */}
              <span className="font-bold text-gray-800">{player.nickname}</span>
              {player.isMaster && <span className="text-sm text-gray-500">(ホスト)</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* QRコード表示 */}
      <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800">ルームに参加</h3>
        <p className="text-sm text-gray-600">このQRコードをスキャンして参加</p>

        {/* QRコード */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <QRCodeSVG
            value={getJoinUrl(roomId)}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* ルームID表示 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">ルームID</p>
          <p className="text-3xl font-mono font-bold text-blue-600">{roomId}</p>
        </div>

        {/* 参加URL（コピー用） */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(getJoinUrl(roomId));
            alert('URLをコピーしました！');
          }}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          URLをコピー
        </button>
      </div>      {/* ゲーム開始ボタン（ホストのみ） */}
      {isMaster && (
        <button
          disabled={players.length < 2}
          onClick={async () => {
            try {
              await updateRoomStatus(roomId, 'creating');
            } catch (error) {
              console.error('Failed to start game:', error);
              alert('ゲーム開始に失敗しました');
            }
          }}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-xl"
        >
          ゲーム開始
        </button>
      )}
    </div>
  );
}

/** 問題作成フェーズ */
function QuestionCreationPhase({
  roomId,
  players,
  currentPlayerId,
}: {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
}) {
  const [questionText, setQuestionText] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCreated, setHasCreated] = useState(false);
  const [progress, setProgress] = useState<{ created: number; total: number }>({ created: 0, total: players.length });

  // 問題作成進捗を監視
  useEffect(() => {
    const checkProgress = async () => {
      try {
        const progressData = await getQuestionProgress(roomId);
        setProgress(progressData);
        
        // 全員が問題を作成したらゲーム開始
        if (progressData.created === progressData.total && progressData.total > 0) {
          // 問題IDを取得
          const allQuestions = await getQuestions(roomId);
          const questionIds = allQuestions.map(q => q.questionId);
          
          // ゲーム状態を初期化
          await initializeGame(roomId, questionIds);
          
          // ステータスを'playing'に更新
          await updateRoomStatus(roomId, 'playing');
        }
      } catch (error) {
        console.error('Failed to get progress:', error);
      }
    };

    const interval = setInterval(checkProgress, 2000);
    checkProgress();

    return () => clearInterval(interval);
  }, [roomId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!questionText.trim()) {
      alert('問題文を入力してください');
      return;
    }

    if (choices.some(c => !c.trim())) {
      alert('すべての選択肢を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;

      // 画像をアップロード
      if (imageFile) {
        imageUrl = await uploadQuestionImage(roomId, currentPlayerId, imageFile);
      }

      // 問題文のバリデーション
      const questionData: QuestionFormData = {
        text: questionText,
        imageUrl,
        choices: choices as [string, string, string, string],
        correctAnswer: correctAnswer as 0 | 1 | 2 | 3,
      };

      await createQuestion(roomId, currentPlayerId, questionData);
      setHasCreated(true);
      alert('問題を作成しました！');
    } catch (error) {
      console.error('Failed to create question:', error);
      alert('問題の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasCreated) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">問題作成完了</h2>
        <div className="text-center p-8 bg-green-50 rounded-lg">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-lg text-gray-700">問題を作成しました！</p>
          <p className="text-gray-600 mt-2">他のプレイヤーが作成するまでお待ちください...</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">作成済み</p>
          <p className="text-3xl font-bold text-blue-600">
            {progress.created} / {progress.total}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">問題作成</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 問題文入力 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            問題文 *
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="問題文を入力してください"
            required
          />
        </div>

        {/* 画像アップロード */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            画像（任意）
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {imagePreview && (
            <div className="mt-2">
              <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg" />
            </div>
          )}
        </div>

        {/* 選択肢入力 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            選択肢 *
          </label>
          <div className="space-y-2">
            {choices.map((choice, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={correctAnswer === index}
                  onChange={() => setCorrectAnswer(index)}
                  className="w-5 h-5"
                />
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => handleChoiceChange(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`選択肢 ${index + 1}`}
                  required
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ラジオボタンで正解を選択してください
          </p>
        </div>

        {/* 作成進捗 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 text-center">
            作成済み: {progress.created} / {progress.total}
          </p>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg"
        >
          {isSubmitting ? '作成中...' : '問題を作成'}
        </button>
      </form>
    </div>
  );
}

/** ゲームプレイフェーズ */
function GamePlayPhase({
  roomId,
  players,
  currentPlayerId,
}: {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
}) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [predictedCorrectCount, setPredictedCorrectCount] = useState<number>(0);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [hasSubmittedPrediction, setHasSubmittedPrediction] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

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
          setCurrentQuestion(question || null);
        }
      } catch (error) {
        console.error('Failed to load game data:', error);
      }
    };

    loadGameData();
    const interval = setInterval(loadGameData, 2000);
    return () => clearInterval(interval);
  }, [roomId]);

  // 回答と予想の送信状態をチェック
  useEffect(() => {
    const checkSubmissions = async () => {
      if (!currentQuestion) return;

      try {
        const allAnswers = await getAnswers(roomId, currentQuestion.questionId);
        const myAnswer = allAnswers.find(a => a.playerId === currentPlayerId);
        setHasSubmittedAnswer(!!myAnswer);

        const pred = await getPrediction(roomId, currentQuestion.questionId);
        setHasSubmittedPrediction(!!pred);
        setPrediction(pred);

        // 全員が回答・予想を送信したら結果表示
        const isAuthor = currentQuestion.authorId === currentPlayerId;
        const otherPlayersCount = players.length - 1; // 出題者を除く
        
        if (allAnswers.length === otherPlayersCount && pred) {
          setShowResults(true);
          setAnswers(allAnswers);
        }
      } catch (error) {
        console.error('Failed to check submissions:', error);
      }
    };

    const interval = setInterval(checkSubmissions, 2000);
    checkSubmissions();
    return () => clearInterval(interval);
  }, [roomId, currentQuestion, currentPlayerId, players.length]);

  const handleAnswerSubmit = async () => {
    if (selectedAnswer === null || !currentQuestion) return;

    try {
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      await submitAnswer(roomId, currentQuestion.questionId, currentPlayerId, selectedAnswer, isCorrect);
      setHasSubmittedAnswer(true);
      alert('回答を送信しました！');
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('回答の送信に失敗しました');
    }
  };

  const handlePredictionSubmit = async () => {
    if (!currentQuestion) return;

    try {
      await submitPrediction(roomId, currentQuestion.questionId, currentPlayerId, predictedCorrectCount);
      setHasSubmittedPrediction(true);
      alert('予想を送信しました！');
    } catch (error) {
      console.error('Failed to submit prediction:', error);
      alert('予想の送信に失敗しました');
    }
  };

  const handleNextQuestion = async () => {
    if (!gameState) return;

    try {
      // 最後の問題かチェック
      if (gameState.currentQuestionIndex >= gameState.totalQuestions - 1) {
        // ゲーム終了 - ステータスをfinishedに変更
        await updateRoomStatus(roomId, 'finished');
      } else {
        // 次の問題へ進む
        await nextQuestion(roomId);
        setSelectedAnswer(null);
        setPredictedCorrectCount(0);
        setHasSubmittedAnswer(false);
        setHasSubmittedPrediction(false);
        setShowResults(false);
        setAnswers([]);
        setPrediction(null);
      }
    } catch (error) {
      console.error('Failed to go to next question:', error);
      alert('次の問題への移動に失敗しました');
    }
  };

  if (!gameState || !currentQuestion) {
    return (
      <div className="text-center p-8">
        <div className="text-2xl font-bold text-gray-600">読み込み中...</div>
      </div>
    );
  }

  const isAuthor = currentQuestion.authorId === currentPlayerId;
  const otherPlayersCount = players.length - 1; // 出題者を除く

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
          <img 
            src={currentQuestion.imageUrl} 
            alt="Question" 
            className="max-w-full rounded-lg"
          />
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
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                    } border`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: player?.color }}
                      />
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
                <p className="text-sm text-gray-600">
                  予想: {prediction.predictedCount}人正解
                </p>
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

/** 最終結果フェーズ */
function FinalResultPhase({
  roomId,
  players,
}: {
  roomId: string;
  players: Player[];
}) {
  const router = useRouter();
  const [hasLeft, setHasLeft] = useState(false);
  
  // スコア順にソート
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const maxScore = sortedPlayers[0]?.score || 0;

  // コンポーネントのアンマウント時（ページを離れるとき）にプレイヤーをオフラインにする
  useEffect(() => {
    const currentPlayerId = localStorage.getItem('currentPlayerId');
    
    return () => {
      // ページを離れるときの処理
      if (currentPlayerId && !hasLeft) {
        // プレイヤーをオフラインにする
        updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
      }
    };
  }, [roomId, hasLeft]);

  // プレイヤー数を監視して、全員退出したらルームを削除
  useEffect(() => {
    const checkAndDeleteRoom = async () => {
      // オンラインのプレイヤーがいなくなったらルームを削除
      const onlinePlayers = players.filter(p => p.isOnline);
      
      if (players.length > 0 && onlinePlayers.length === 0) {
        console.log('All players have left. Deleting room...');
        try {
          await deleteRoom(roomId);
          console.log('Room deleted successfully');
        } catch (error) {
          console.error('Failed to delete room:', error);
        }
      }
    };

    // 少し遅延させて確実にステータス更新後にチェック
    const timer = setTimeout(checkAndDeleteRoom, 2000);
    
    return () => clearTimeout(timer);
  }, [roomId, players]);

  const handleLeaveRoom = async () => {
    try {
      const currentPlayerId = localStorage.getItem('currentPlayerId');
      if (currentPlayerId) {
        // プレイヤーをオフラインにする
        await updatePlayerOnlineStatus(roomId, currentPlayerId, false);
        setHasLeft(true);
      }
      
      // localStorageをクリア
      localStorage.removeItem('currentPlayerId');
      localStorage.removeItem('currentRoomId');
      
      // ホームに戻る
      router.push('/');
    } catch (error) {
      console.error('Failed to leave room:', error);
      // エラーが発生してもホームに戻る
      router.push('/');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center">🎉 ゲーム終了 🎉</h2>

      {/* 優勝者表示 */}
      {sortedPlayers.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-6 text-center">
          <p className="text-white text-lg mb-2">優勝</p>
          <div className="flex items-center justify-center space-x-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-white"
              style={{ backgroundColor: sortedPlayers[0].color }}
            />
            <p className="text-3xl font-bold text-white">
              {sortedPlayers[0].nickname}
            </p>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {sortedPlayers[0].score} 点
          </p>
        </div>
      )}

      {/* 最終順位表示 */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-gray-700 text-center">最終結果</h3>
        {sortedPlayers.map((player, index) => (
          <div
            key={player.playerId}
            className={`flex items-center justify-between p-4 rounded-lg border-2 ${
              index === 0
                ? 'bg-yellow-50 border-yellow-400'
                : index === 1
                ? 'bg-gray-100 border-gray-400'
                : index === 2
                ? 'bg-orange-50 border-orange-400'
                : 'bg-white border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-gray-600 w-8">
                {index + 1}
              </span>
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <span className="text-lg font-bold text-gray-800">
                {player.nickname}
              </span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{player.score}</p>
              <p className="text-xs text-gray-500">点</p>
            </div>
          </div>
        ))}
      </div>

      {/* 統計情報 */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-3">
        <h4 className="font-bold text-gray-700 text-center">統計情報</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">参加人数</p>
            <p className="text-2xl font-bold text-gray-800">{players.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">最高得点</p>
            <p className="text-2xl font-bold text-gray-800">{maxScore}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">平均得点</p>
            <p className="text-2xl font-bold text-gray-800">
              {players.length > 0 
                ? Math.round(players.reduce((sum, p) => sum + p.score, 0) / players.length)
                : 0
              }
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">総得点</p>
            <p className="text-2xl font-bold text-gray-800">
              {players.reduce((sum, p) => sum + p.score, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* ホームに戻るボタン */}
      <button
        onClick={handleLeaveRoom}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
      >
        ホームに戻る
      </button>
    </div>
  );
}

// ========================================
// ユーティリティ関数
// ========================================

function getRoomStatusLabel(status: RoomStatus): string {
  const labels: Record<RoomStatus, string> = {
    waiting: '待機中',
    creating: '問題作成中',
    playing: 'ゲーム進行中',
    finished: '終了',
  };
  return labels[status] || status;
}

/**
 * ルーム参加用のURLを生成
 */
function getJoinUrl(roomId: string): string {
  if (typeof window !== 'undefined') {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join-room?roomId=${roomId}`;
  }
  return '';
}
