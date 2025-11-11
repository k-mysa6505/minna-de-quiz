// app/create-room/page.tsx
// ルーム作成ページ
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom } from '@/lib/services/roomService';

export default function CreateRoomPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [isCreating, setIsCreating] = useState(false);  // 作成中フラグ
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    // ニックネームのバリデーション
    if (nickname.trim() === '') {
      setError('ニックネームを入力してください');
      return;
    }
    if (nickname.length > 10) {
      setError('ニックネームは10文字以内で入力してください');
      return;
    }
    if (isCreating) return;

    setIsCreating(true);

    // ルーム作成処理
    try {
      const { roomId, playerId } = await createRoom({ nickname: nickname.trim() });

      // プレイヤーIDとルームIDをローカルストレージに保存
      localStorage.setItem('currentPlayerId', playerId);
      localStorage.setItem('currentRoomId', roomId);

      // ルームページへ遷移
      router.push(`/room/${roomId}`);
    } catch (err: unknown) {
      // unknown を安全に扱う（Error かどうかで分岐）
      if (err instanceof Error) {
        setError(err.message || 'ルームの作成に失敗しました');
      } else {
        setError(String(err) || 'ルームの作成に失敗しました');
      }
      setIsCreating(false);
      return;
    }

  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 space-y-6">
        {/* タイトル */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ルームを作成
          </h1>
          <p className="text-gray-600">
            新しいゲームを始めましょう
          </p>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 作成ボタン */}
        <button
          onClick={handleCreateRoom}
          disabled={isCreating || !nickname.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          {isCreating ? '作成中...' : 'ルームを作成'}
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
