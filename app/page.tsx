// app/page.tsx
// ホームページ - ゲームの入口
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <main
        onClick={() => setStarted(true)}
        className="flex min-h-screen flex-col items-center justify-center p-8 cursor-pointer"
      >
        <div className="text-center transition-all duration-300">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-2xl">
              みんクイ
            </h1>
            <h2 className="p-2 text-white font-light tracking-wide italic">
              ～みんなでクイズ～
            </h2>
          </div>
          <p className="text-xl text-blue-400 font-light tracking-widest animate-pulse">
            TAP TO START
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        {/* タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            みんクイ
          </h1>
          <p className="text-sm text-slate-400 italic">
            ～みんなでクイズ～
          </p>
        </div>

        {/* アクションボタン */}
        <div className="space-y-5">
          {/* ルーム作成ボタン */}
          <Link
            href="/create-room"
            className="block bg-emerald-900 hover:bg-emerald-800 text-white py-3 px-4 rounded-lg border border-emerald-700/30 text-center"
          >
            <div className="font-semibold">CREATE ROOM</div>
            <div className="text-sm text-slate-400 mt-1 italic">ルームを作成</div>
          </Link>

          {/* ルーム参加ボタン */}
          <Link
            href="/join-room"
            className="block bg-blue-900 hover:bg-blue-800 text-white py-3 px-4 rounded-lg border border-blue-700/30 text-center"
          >
            <div className="font-semibold">JOIN ROOM</div>
            <div className="text-sm text-slate-400 mt-1 italic">ルームに参加</div>
          </Link>
        </div>

        {/* 遊び方ボタン */}
        <div className="text-center mt-6">
          <Link
            href="/how-to-play"
            className="text-sm text-slate-400 italic underline underline-offset-2"
          >
            how to play
          </Link>
        </div>
      </div>
    </main>
  );
}