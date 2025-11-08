// app/join-room/page.tsx
// ルーム参加ページ
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinRoom } from '@/lib/services/roomService';
import { PLAYER_COLORS } from '@/types';

export default function JoinRoomPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PLAYER_COLORS[0]);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async () => {
    // バリデーション
    if (!roomId.trim()) {
      setError('ルームIDを入力してください');
      return;
    }
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return;
    }
    if (nickname.length > 10) {
      setError('ニックネームは10文字以内で入力してください');
      return;
    }
    if (isJoining) return;

    setIsJoining(true);
    setError('');

    // ルーム参加処理
    try {
      const playerId = await joinRoom({
        roomId: roomId.trim(),
        nickname: nickname.trim(),
      });

      // プレイヤーIDとルームIDをローカルストレージに保存
      localStorage.setItem('currentPlayerId', playerId);
      localStorage.setItem('currentRoomId', roomId.trim());

      // ルームページへ遷移
      router.push(`/room/${roomId.trim()}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'ルームへの参加に失敗しました');
      } else {
        setError(String(err) || 'ルームへの参加に失敗しました');
      }
      setIsJoining(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-green-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 space-y-6">
        {/* タイトル */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ルームに参加
          </h1>
          <p className="text-gray-600">
            ルームIDを入力してください
          </p>
        </div>

        {/* ルームID入力 */}
        <div>
          <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
            ルームID
          </label>
          <input
            id="roomId"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase text-center text-2xl font-mono"
          />
        </div>

        {/* ニックネーム入力 */}
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
            ニックネーム
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="あなたの名前"
            maxLength={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* カラー選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            プレイヤーカラー
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PLAYER_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-full h-12 rounded-lg border-4 transition-all ${
                  selectedColor === color
                    ? 'border-gray-800 scale-110'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 参加ボタン */}
        <button
          onClick={handleJoinRoom}
          disabled={isJoining || !roomId.trim() || !nickname.trim()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          {isJoining ? '参加中...' : 'ルームに参加'}
        </button>

        {/* 戻るボタン */}
        <button
          onClick={() => router.push('/')}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          戻る
        </button>
      </div>
    </main>
  );
}
