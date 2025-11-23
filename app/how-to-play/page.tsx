// app/how-to-play/page.tsx
'use client';

import Link from 'next/link';

export default function HowToPlay() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full space-y-8">
        {/* タイトル */}
        <h1 className="text-5xl font-bold text-white text-center mb-8 tracking-tight">
          遊び方
        </h1>

        {/* ルール説明 */}
        <div className="space-y-6 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-blue-400">1. ルームを作成または参加</h2>
            <p className="text-slate-300 leading-relaxed">
              ルームを作成して友達を招待するか、ルームIDを使って既存のルームに参加しましょう。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-blue-400">2. 問題を作成</h2>
            <p className="text-slate-300 leading-relaxed">
              全員がそれぞれ1問ずつクイズを作成します。問題文、画像（任意）、4つの選択肢を設定しましょう。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-blue-400">3. クイズに挑戦</h2>
            <p className="text-slate-300 leading-relaxed">
              他のプレイヤーが作った問題に回答します。正解すると10ポイント獲得！
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-blue-400">4. 出題者は正解者数を予想</h2>
            <p className="text-slate-300 leading-relaxed">
              自分が出題した問題では、何人が正解するかを予想します。予想が的中すると20ポイント獲得！
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-blue-400">5. 結果発表</h2>
            <p className="text-slate-300 leading-relaxed">
              各問題の正解と正解者が発表されます。全問題終了後、最も得点の高いプレイヤーが優勝です！
            </p>
          </section>
        </div>

        {/* 戻るボタン */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-4 px-8 rounded shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
