// app/create-room/page.tsx
// ルーム作成ページ
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom } from '@/lib/services/roomService';
import type { ScoringMode } from '@/types';

export default function CreateRoomPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // オプション設定
  const [showOptions, setShowOptions] = useState(false);
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [scoringMode, setScoringMode] = useState<ScoringMode>('standard');
  const [wrongAnswerPenalty, setWrongAnswerPenalty] = useState<number>(0);
  const [maxPlayers, setMaxPlayers] = useState<number>(8);

  // 説明モーダル
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpContent, setHelpContent] = useState({ title: '', content: '' });

  const showHelp = (title: string, content: string) => {
    setHelpContent({ title, content });
    setShowHelpModal(true);
  };

  const handleCreateRoom = async () => {
    if (nickname.trim() === '') {
      setError('ニックネームを入力してください');
      return;
    }
    if (nickname.length > 20) {
      setError('ニックネームは20文字以内で入力してください');
      return;
    }
    if (isCreating) return;

    setIsCreating(true);

    try {
      const { roomId, playerId } = await createRoom({
        nickname: nickname.trim(),
        description: description.trim() || undefined,
        timeLimit,
        scoringMode,
        wrongAnswerPenalty,
        maxPlayers,
      });

      localStorage.setItem('currentPlayerId', playerId);
      localStorage.setItem('currentRoomId', roomId);

      router.push(`/room/${roomId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'ルームの作成に失敗しました');
      } else {
        setError(String(err) || 'ルームの作成に失敗しました');
      }
      setIsCreating(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            ルームを作成
          </h1>
        </div>

        {/* ニックネーム入力 */}
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-slate-300 mb-2">
            ニックネーム
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="あなたの名前"
            maxLength={20}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* オプションボタン */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="text-slate-200 text-sm underline underline-offset-2 px-2 py-1 transition-all duration-300"
          >
            {showOptions ? 'オプションを閉じる' : 'オプション'}
          </button>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* 作成ボタン */}
        <button
          onClick={handleCreateRoom}
          disabled={isCreating || !nickname.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
        >
          {isCreating ? '作成中...' : 'ルームを作成'}
        </button>

        <button
          onClick={() => router.push('/')}
          className="w-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium py-3 px-4 rounded-xl border border-slate-600 transition-all duration-300"
        >
          戻る
        </button>
      </div>

      {/* オプションモーダル */}
      {showOptions && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowOptions(false)}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">オプション設定</h2>

            <div className="space-y-5">
              {/* ルームの説明 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  ルームの説明<span className="text-slate-500 text-xs font-normal">（任意）</span>
                  <button onClick={() => showHelp('ルームの説明', 'このルームの目的やテーマを説明します。参加者が参加前に確認できます。')} className="w-5 h-5 rounded-full border border-slate-500 text-slate-400 hover:text-white text-xs flex items-center justify-center">?</button>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例：アニメクイズ大会"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 制限時間 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  制限時間（秒）
                  <button onClick={() => showHelp('制限時間', '各問題の回答制限時間を設定します。0に設定すると制限時間なしになります。')} className="w-5 h-5 rounded-full border border-slate-500 text-slate-400 hover:text-white text-xs flex items-center justify-center">?</button>
                </label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  max="300"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 点数加算方式 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  点数加算方式
                  <button onClick={() => showHelp('点数加算方式', '標準：正解で10pt / 1位ボーナス：1位は20pt、他は10pt / 正解率ボーナス：正解率が低いほど高得点')} className="w-5 h-5 rounded-full border border-slate-500 text-slate-400 hover:text-white text-xs flex items-center justify-center">?</button>
                </label>
                <select
                  value={scoringMode}
                  onChange={(e) => setScoringMode(e.target.value as ScoringMode)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">標準</option>
                  <option value="firstBonus">1位ボーナス</option>
                  <option value="rateBonus">正解率ボーナス</option>
                </select>
              </div>

              {/* 誤答ペナルティ */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  誤答ペナルティ（pt）
                  <button onClick={() => showHelp('誤答ペナルティ', '不正解の場合に減点されるポイントです。0でペナルティなし。')} className="w-5 h-5 rounded-full border border-slate-500 text-slate-400 hover:text-white text-xs flex items-center justify-center">?</button>
                </label>
                <input
                  type="number"
                  value={wrongAnswerPenalty}
                  onChange={(e) => setWrongAnswerPenalty(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 最大参加人数 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  最大参加人数
                  <button onClick={() => showHelp('最大参加人数', 'このルームに参加できる最大人数を設定します。')} className="w-5 h-5 rounded-full border border-slate-500 text-slate-400 hover:text-white text-xs flex items-center justify-center">?</button>
                </label>
                <input
                  type="number"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Math.max(2, Math.min(20, parseInt(e.target.value) || 8)))}
                  min="2"
                  max="20"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOptions(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
              >
                閉じる
              </button>
              <button
                onClick={() => setShowOptions(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
              >
                変更する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヘルプモーダル */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowHelpModal(false)}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-3">{helpContent.title}</h3>
            <p className="text-slate-300 text-sm mb-4">{helpContent.content}</p>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
