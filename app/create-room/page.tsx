// app/create-room/page.tsx
// ルーム作成ページ
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom } from '@/lib/services/roomService';
import { runServiceAction } from '@/lib/services/serviceAction';
import { Modal } from '@/app/room/[roomId]/components/Modal';
import type { ScoringMode } from '@/types';

type ParticipationStyle = 'player' | 'screen';

function HelpIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-5 h-5 rounded-full border border-slate-500 text-slate-400 text-xs flex items-center justify-center"
    >
      ?
    </button>
  );
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [participationStyle, setParticipationStyle] = useState<ParticipationStyle>('player');
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

  const useScreenMode = participationStyle === 'screen';

  const handleCreateRoom = async () => {
    if (isCreating) return;

    setIsCreating(true);
    setError('');

    const roomResult = await runServiceAction(
      'createRoom.submit',
      () =>
        createRoom({
          nickname: useScreenMode ? 'スクリーンホスト' : '',
          createHostPlayer: useScreenMode,
          description: description.trim() || undefined,
          timeLimit,
          scoringMode,
          wrongAnswerPenalty,
          maxPlayers,
          useScreenMode,
        }),
      {
        onError: (message) => setError(message || 'ルームの作成に失敗しました'),
      }
    );

    if (!roomResult) {
      setIsCreating(false);
      return;
    }

    const { roomId, playerId, displayDeviceId } = roomResult;

    if (useScreenMode && displayDeviceId) {
      localStorage.removeItem('currentPlayerId');
      localStorage.setItem('currentRoomId', roomId);
      sessionStorage.removeItem('currentPlayerId');
      sessionStorage.setItem('currentRoomId', roomId);
      router.push(`/room/${roomId}/screen?deviceId=${displayDeviceId}`);
      return;
    }

    if (playerId) {
      localStorage.setItem('currentPlayerId', playerId);
      localStorage.setItem('currentRoomId', roomId);
      sessionStorage.setItem('currentPlayerId', playerId);
      sessionStorage.setItem('currentRoomId', roomId);
      router.push(`/room/${roomId}`);
      return;
    }

    // プレイヤーモードでは次画面でニックネーム入力して参加する
    localStorage.removeItem('currentPlayerId');
    localStorage.setItem('currentRoomId', roomId);
    sessionStorage.removeItem('currentPlayerId');
    sessionStorage.setItem('currentRoomId', roomId);
    router.push(`/join-room?roomId=${roomId}&mode=host-setup`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full backdrop-blur-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
            ルームを作成
          </h1>
        </div>

        {/* 参加スタイル */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setParticipationStyle('player')}
              className={`rounded-lg border px-4 py-3 text-center transition-all ${participationStyle === 'player' ? 'border-yellow-400 bg-yellow-500/20' : 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60'}`}
            >
              <p className="font-semibold text-white">プレイヤーモード</p>
              <p className="text-xs text-slate-300 mt-1">お使いの端末で<br />プレイできます</p>
            </button>
            <button
              type="button"
              onClick={() => setParticipationStyle('screen')}
              className={`rounded-lg border px-4 py-3 text-center transition-all ${participationStyle === 'screen' ? 'border-red-400 bg-red-500/20' : 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60'}`}
            >
              <p className="font-semibold text-white">スクリーンモード</p>
              <p className="text-xs text-slate-300 mt-1">お使いの端末は<br />表示専用になります</p>
            </button>
          </div>
        </div>

        {/* オプションボタン */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className={`text-slate-200 text-sm underline underline-offset-2 px-2 py-1 transition-all duration-300 ${showOptions ? '' : 'italic'}`}
          >
            {showOptions ? '閉じる' : 'ルームのオプション'}
          </button>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 作成ボタン */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="bg-gradient-to-b from-green-700 to-green-800 disabled:bg-slate-600 text-white font-bold italic px-3 rounded-xl shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
          >
            {isCreating ? 'CREATING...' : 'CREATE ROOM'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="bg-slate-700/50 text-slate-200 font-medium italic px-4 rounded-xl border border-slate-600 transition-all duration-300"
          >
            BACK
          </button>
        </div>
      </div>

      {/* オプションモーダル */}
      {showOptions && (
        <Modal
          onClose={() => setShowOptions(false)}
          panelClassName="max-w-md w-full max-h-[80vh] overflow-y-auto"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">オプション</h2>

          <div className="space-y-5">
            {/* ルームの説明 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                ルームの説明
                <HelpIconButton onClick={() => showHelp('ルームの説明', 'このルームの目的やテーマを説明します。参加者が参加前に確認できます。')} />
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
                <HelpIconButton onClick={() => showHelp('制限時間', '各問題の回答制限時間を設定します。0に設定すると制限時間なしになります。')} />
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
                <HelpIconButton onClick={() => showHelp('点数加算方式', '標準：正解で10pt / 1位ボーナス：1位は20pt、他は10pt / 正解率ボーナス：正解率が低いほど高得点')} />
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
                <HelpIconButton onClick={() => showHelp('誤答ペナルティ', '不正解の場合に減点されるポイントです。0でペナルティなし。')} />
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
                <HelpIconButton onClick={() => showHelp('最大参加人数', 'このルームに参加できる最大人数を設定します。')} />
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
              className="flex-1 bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
            >
              閉じる
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
            >
              変更する
            </button>
          </div>
        </Modal>
      )}

      {/* ヘルプモーダル */}
      {showHelpModal && (
        <Modal
          onClose={() => setShowHelpModal(false)}
          panelClassName="max-w-sm w-full"
        >
          <h3 className="text-xl font-bold text-white mb-3">{helpContent.title}</h3>
          <p className="text-slate-300 text-sm mb-4">{helpContent.content}</p>
          <button
            onClick={() => setShowHelpModal(false)}
            className="w-full bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
          >
            閉じる
          </button>
        </Modal>
      )}
    </main>
  );
}
