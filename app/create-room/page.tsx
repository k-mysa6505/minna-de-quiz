// app/create-room/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createRoom } from '@/lib/services/room/roomService';
import { runServiceAction } from '@/lib/services/core/serviceAction';
import { RoomOptionsForm } from './RoomOptionsForm';
import { SecondaryButton } from '../common/SecondaryButton';
import { PrimaryButton } from '../common/PrimaryButton';

type ParticipationStyle = 'player' | 'screen';

// ---- SVG イラスト ----

function PlayerModeIllustration() {
  return (
    <svg viewBox="0 0 120 72" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* 左のプレイヤー */}
      <circle cx="24" cy="28" r="9" fill="currentColor" opacity="0.7" />
      <path d="M10 60 Q10 44 24 44 Q38 44 38 60" fill="currentColor" opacity="0.7" />
      {/* 中央のプレイヤー（少し大きく前面） */}
      <circle cx="60" cy="24" r="11" fill="currentColor" opacity="0.95" />
      <path d="M44 62 Q44 44 60 44 Q76 44 76 62" fill="currentColor" opacity="0.95" />
      {/* 右のプレイヤー */}
      <circle cx="96" cy="28" r="9" fill="currentColor" opacity="0.7" />
      <path d="M82 60 Q82 44 96 44 Q110 44 110 60" fill="currentColor" opacity="0.7" />
      {/* 吹き出し（中央） */}
      <rect x="48" y="4" width="24" height="12" rx="4" fill="currentColor" opacity="0.4" />
      <polygon points="58,16 62,16 60,20" fill="currentColor" opacity="0.4" />
      {/* ??? テキスト */}
      <text x="60" y="13" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold" opacity="0.9">?!</text>
    </svg>
  );
}

function ScreenModeIllustration() {
  return (
    <svg viewBox="0 0 120 72" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* ディスプレイ本体 */}
      <rect x="30" y="14" width="60" height="38" rx="4" fill="currentColor" opacity="0.5" />
      <rect x="33" y="17" width="54" height="30" rx="2" fill="currentColor" opacity="0.2" />
      {/* 画面内容 */}
      <text x="60" y="36" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" opacity="0.9">QUIZ</text>
      {/* スタンド */}
      <rect x="54" y="52" width="12" height="5" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="48" y="57" width="24" height="3" rx="2" fill="currentColor" opacity="0.5" />
      {/* 左のプレイヤー */}
      <circle cx="14" cy="38" r="7" fill="currentColor" opacity="0.75" />
      <path d="M4 66 Q4 52 14 52 Q24 52 24 66" fill="currentColor" opacity="0.75" />
      {/* 右のプレイヤー */}
      <circle cx="106" cy="38" r="7" fill="currentColor" opacity="0.75" />
      <path d="M96 66 Q96 52 106 52 Q116 52 116 66" fill="currentColor" opacity="0.75" />
      {/* 矢印（見ている方向） */}
      <line x1="24" y1="40" x2="30" y2="35" stroke="white" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      <line x1="96" y1="40" x2="90" y2="35" stroke="white" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

// ---- ページ本体 ----

export default function CreateRoomPage() {
  const router = useRouter();
  const [participationStyle, setParticipationStyle] = useState<ParticipationStyle>('player');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const [showOptions, setShowOptions] = useState(false);
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [correctAnswerPoints, setCorrectAnswerPoints] = useState<number>(10);
  const [fastestAnswerBonusPoints, setFastestAnswerBonusPoints] = useState<number>(10);
  const [wrongAnswerPenalty, setWrongAnswerPenalty] = useState<number>(0);
  const [predictionHitBonusPoints, setPredictionHitBonusPoints] = useState<number>(50);
  const [maxPlayers, setMaxPlayers] = useState<number>(8);

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
          correctAnswerPoints,
          fastestAnswerBonusPoints,
          wrongAnswerPenalty,
          predictionHitBonusPoints,
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

    localStorage.removeItem('currentPlayerId');
    localStorage.setItem('currentRoomId', roomId);
    sessionStorage.removeItem('currentPlayerId');
    sessionStorage.setItem('currentRoomId', roomId);
    router.push(`/join-room?roomId=${roomId}&mode=host-setup`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight italic">ルームを作成</h1>
        </div>

        {/* モード選択 */}
        <div className="grid grid-cols-2 gap-3">
          {/* プレイヤーモード */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setParticipationStyle('player')}
            className={`
              relative rounded-xl border-2 px-4 pt-4 pb-3 text-center transition-all duration-200
              ${participationStyle === 'player'
                ? 'border-yellow-400 bg-yellow-500/20 shadow-lg shadow-yellow-500/10'
                : 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60 hover:border-slate-500'}
            `}
          >
            {/* 選択インジケーター */}
            {participationStyle === 'player' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400" />
            )}
            {/* イラスト */}
            <div
              className={`mx-auto mb-3 h-16 transition-colors duration-200 ${
                participationStyle === 'player' ? 'text-yellow-300' : 'text-slate-400'
              }`}
            >
              <PlayerModeIllustration />
            </div>
            <p className="text-lg sm:text-xl font-bold text-white italic">プレイヤーモード</p>
            <p className="text-sm text-slate-300 mt-1">この端末でプレイ</p>
          </motion.button>

          {/* スクリーンモード */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setParticipationStyle('screen')}
            className={`
              relative rounded-xl border-2 px-4 pt-4 pb-3 text-center transition-all duration-200
              ${participationStyle === 'screen'
                ? 'border-red-400 bg-red-500/20 shadow-lg shadow-red-500/10'
                : 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60 hover:border-slate-500'}
            `}
          >
            {participationStyle === 'screen' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400" />
            )}
            <div
              className={`mx-auto mb-3 h-16 transition-colors duration-200 ${
                participationStyle === 'screen' ? 'text-red-300' : 'text-slate-400'
              }`}
            >
              <ScreenModeIllustration />
            </div>
            <p className="text-lg sm:text-xl font-bold text-white italic">スクリーンモード</p>
            <p className="text-sm text-slate-300 mt-1">表示専用にする</p>
          </motion.button>
        </div>

        {/* オプション設定ボタン */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setShowOptions(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/40 hover:bg-slate-700/60 hover:border-slate-500 transition-all duration-150 group"
        >
          <div className="flex items-center gap-2 text-slate-200 text-sm">
            {/* 歯車アイコン */}
            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <span className="italic">ルームのオプション</span>
          </div>
          {/* 右矢印 */}
          <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </motion.button>

        {/* エラー */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <PrimaryButton
            onClick={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? 'CREATING...' : 'CREATE'}
          </PrimaryButton>
          <SecondaryButton onClick={() => router.push('/')}>BACK</SecondaryButton>
        </div>

      </div>

      {/* オプションモーダル */}
      {showOptions && (
        <RoomOptionsForm
          description={description} setDescription={setDescription}
          timeLimit={timeLimit} setTimeLimit={setTimeLimit}
          correctAnswerPoints={correctAnswerPoints} setCorrectAnswerPoints={setCorrectAnswerPoints}
          fastestAnswerBonusPoints={fastestAnswerBonusPoints} setFastestAnswerBonusPoints={setFastestAnswerBonusPoints}
          wrongAnswerPenalty={wrongAnswerPenalty} setWrongAnswerPenalty={setWrongAnswerPenalty}
          predictionHitBonusPoints={predictionHitBonusPoints} setPredictionHitBonusPoints={setPredictionHitBonusPoints}
          maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers}
          onClose={() => setShowOptions(false)}
        />
      )}
    </main>
  );
}
