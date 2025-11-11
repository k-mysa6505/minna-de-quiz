// app/page.tsx
// ホームページ - ゲームの入口
'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* タイトル */}
        <div>
          <h1 className="text-6xl font-bold text-blue-600 mb-4">
            みんクイ
          </h1>
        </div>

        {/* アクションボタン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ルーム作成ボタン */}
          <Link
            href="/create-room"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105"
          >
            <div className="text-xl">ルームを作成</div>
            <div className="text-sm opacity-90 mt-1">新しいゲームを始める</div>
          </Link>

          {/* ルーム参加ボタン */}
          <Link
            href="/join-room"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105"
          >
            <div className="text-xl">ルームに参加</div>
            <div className="text-sm opacity-90 mt-1">友達と一緒に遊ぶ</div>
          </Link>
        </div>

      </div>
    </main>
  );
}