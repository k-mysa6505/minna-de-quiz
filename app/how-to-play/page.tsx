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
              みんなで1問ずつクイズを作ります（問題文、画像、選択肢4つ）
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 italic">3. 回答</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              他の人の問題に挑戦しよう（正解で10pt）
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 italic">4. 正解者数予想</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              出題者は何人正解するか予想します（的中で20pt）
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 italic">5. 結果発表</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              全問終了後、最高得点の人が優勝です
            </p>
          </section>
        </div>

        {/* 戻るボタン */}
        <div className="text-center">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-300 italic underline underline-offset-2 transition-all"
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
