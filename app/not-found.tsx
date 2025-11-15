// app/not-found.tsx
// 404エラーページ
'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-10 space-y-8 text-center">
        {/* エラーメッセージ */}
        <div>
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">404</h1>
          <h2 className="text-3xl font-bold text-slate-200 mb-6 tracking-tight">
            ページが見つかりません
          </h2>
          <p className="text-gray-600">
            あーあ！ゲストの皆さん、<br />
            彼は冒険の予定外の場所へ迷い込んだぞ！
          </p>
        </div>

        {/* ホームに戻るボタン */}
        <Link
          href="/"
          className="inline-block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          ホームに戻る
        </Link>
      </div>
    </main>
  );
}
