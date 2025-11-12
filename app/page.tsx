// app/page.tsx
// ホームページ - ゲームの入口
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <button
          onClick={() => setStarted(true)}
          className="group text-center transition-all duration-300"
        >
          <h1 className="text-8xl font-bold text-white mb-8 tracking-tight drop-shadow-2xl">
            みんクイ
          </h1>
          <p className="text-2xl text-blue-400 font-light tracking-widest animate-pulse">
            TAP TO START
          </p>
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-12 text-center">
        {/* タイトル */}
        <div className="space-y-4">
          <h1 className="text-7xl font-bold text-white mb-4 tracking-tight drop-shadow-2xl">
            みんクイ
          </h1>
        </div>

        {/* アクションボタン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* ルーム作成ボタン */}
          <Link
            href="/create-room"
            className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-8 px-8 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-blue-500/50 border border-blue-500/30"
          >
            <div className="text-2xl mb-2">ルームを作成</div>
            <div className="text-sm text-blue-100 font-light">新しいゲームを始める</div>
            <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </Link>

          {/* ルーム参加ボタン */}
          <Link
            href="/join-room"
            className="group relative bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-8 px-8 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-emerald-500/50 border border-emerald-500/30"
          >
            <div className="text-2xl mb-2">ルームに参加</div>
            <div className="text-sm text-emerald-100 font-light">友達と一緒に遊ぶ</div>
            <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </Link>
        </div>

        {/* 遊び方ボタン */}
        <div className="mt-8">
          <Link
            href="/how-to-play"
            className="inline-block text-slate-300 hover:text-white font-light py-3 px-6 rounded-xl border border-slate-600 hover:border-slate-400 transition-all duration-300"
          >
            遊び方を見る
          </Link>
        </div>
      </div>
    </main>
  );
}