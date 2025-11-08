// app/rules/page.tsx
// ルール説明ページ（オプション）
'use client';

import { useRouter } from 'next/navigation';

export default function RulesPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 space-y-8">
        {/* タイトル */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-purple-600 mb-4">
            みんクイのルール
          </h1>
          <p className="text-gray-600">
            みんなで楽しむクイズゲームのルールを説明します
          </p>
        </div>

        {/* ゲームの流れ */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            📋 ゲームの流れ
          </h2>
          <ol className="space-y-4 text-gray-700">
            <li className="flex">
              <span className="font-bold text-purple-600 mr-3">1.</span>
              <div>
                <strong>ルーム作成・参加</strong>
                <p className="text-gray-600">ホストがルームを作成し、他のプレイヤーが参加します。</p>
              </div>
            </li>
            <li className="flex">
              <span className="font-bold text-purple-600 mr-3">2.</span>
              <div>
                <strong>問題作成</strong>
                <p className="text-gray-600">各プレイヤーが1問ずつ4択クイズを作成します。</p>
              </div>
            </li>
            <li className="flex">
              <span className="font-bold text-purple-600 mr-3">3.</span>
              <div>
                <strong>回答・予想</strong>
                <p className="text-gray-600">作問者以外は回答、作問者は正解者数を予想します。</p>
              </div>
            </li>
            <li className="flex">
              <span className="font-bold text-purple-600 mr-3">4.</span>
              <div>
                <strong>結果発表</strong>
                <p className="text-gray-600">正解発表と得点計算が行われます。</p>
              </div>
            </li>
            <li className="flex">
              <span className="font-bold text-purple-600 mr-3">5.</span>
              <div>
                <strong>繰り返し</strong>
                <p className="text-gray-600">全員の問題が終わるまで3〜4を繰り返します。</p>
              </div>
            </li>
          </ol>
        </section>

        {/* 得点システム */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🏆 得点システム
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-purple-600 mb-2">
                回答者の得点
              </h3>
              <p className="text-gray-700 mb-2">
                正解者数が少ないほど高得点！
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-purple-100">
                    <th className="border border-purple-300 px-4 py-2">正解者数</th>
                    <th className="border border-purple-300 px-4 py-2">獲得ポイント</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">1人</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold text-purple-600">20点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">2人</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">15点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">3人</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">12点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">4人</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">10点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">5人</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">8点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">6人以上</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">5点</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xl font-bold text-purple-600 mb-2">
                作問者の得点（予想）
              </h3>
              <p className="text-gray-700 mb-2">
                正解者数の予想が近いほど高得点！
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-purple-100">
                    <th className="border border-purple-300 px-4 py-2">予想との差</th>
                    <th className="border border-purple-300 px-4 py-2">獲得ポイント</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">完全一致</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold text-purple-600">10点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">±1人</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">7点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">±2人</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">5点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">±3人</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">3点</td>
                  </tr>
                  <tr>
                    <td className="border border-purple-300 px-4 py-2 text-center">±4人以上</td>
                    <td className="border border-purple-300 px-4 py-2 text-center font-bold">0点</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 戻るボタン */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </main>
  );
}
