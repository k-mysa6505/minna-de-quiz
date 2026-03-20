// app/how-to-play/page.tsx
'use client';

import Link from 'next/link';

export default function HowToPlay() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        {/* タイトル */}
        <h1 className="text-2xl font-bold text-white mb-6 tracking-tight text-center">
          HOW TO PLAY
        </h1>

        {/* ルール説明 */}
        <div className="space-y-4 bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 italic">1. ルーム作成 / 参加</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              ルームを作って友達を招待するか、IDで参加しよう
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 italic">2. 問題作成</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              みんなで1問ずつクイズを作ろう
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 italic">3. 回答</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              他の人の問題に挑戦しよう
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 italic">4. 正解者数予想</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              自分の問題に何人正解するか予想しよう
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 italic">5. 結果発表</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              最高得点の人が優勝です
            </p>
          </section>
        </div>

        {/* 戻るボタン */}
        <div className="text-center">
          <Link
            href="/"
            className="bg-emerald-700 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg underline-offset-2 transition-all"
          >
            HOME
          </Link>
        </div>
      </div>
    </main>
  );
}
