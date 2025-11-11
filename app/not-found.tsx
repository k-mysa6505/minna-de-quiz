// app/not-found.tsx
// 404エラーページ
'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 space-y-6 text-center">
        {/* エラーメッセージ */}
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            ページが見つかりません
          </h2>
          <p className="text-gray-600">
            ゲストの皆さん、彼は冒険の予定外の場所へ迷い込んだぞ！
          </p>
        </div>

        {/* ホームに戻るボタン */}
        <Link
          href="/"
          className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </main>
  );
}
