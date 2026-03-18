// app/create-room/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom } from '@/lib/services/room/roomService';
import { runServiceAction } from '@/lib/services/core/serviceAction';
import { RoomOptionsForm } from './RoomOptionsForm';

type ParticipationStyle = 'player' | 'screen';

export default function CreateRoomPage() {
  const router = useRouter();
  const [participationStyle, setParticipationStyle] = useState<ParticipationStyle>('player');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // オプション設定
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
      <div className="max-w-md w-full backdrop-blur-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">ルームを作成</h1>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setParticipationStyle('player')}
              className={`rounded-lg border px-4 py-3 text-center transition-all ${participationStyle === 'player' ? 'border-yellow-400 bg-yellow-500/20' : 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60'}`}
            >
              <p className="font-semibold text-white">プレイヤーモード</p>
              <p className="text-xs text-slate-300 mt-1">お使いの端末でプレイできます</p>
            </button>
            <button
              type="button"
              onClick={() => setParticipationStyle('screen')}
              className={`rounded-lg border px-4 py-3 text-center transition-all ${participationStyle === 'screen' ? 'border-red-400 bg-red-500/20' : 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60'}`}
            >
              <p className="font-semibold text-white">スクリーンモード</p>
              <p className="text-xs text-slate-300 mt-1">お使いの端末は表示専用になります</p>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className={`text-slate-200 text-sm underline underline-offset-2 px-2 py-1 transition-all duration-300 ${showOptions ? '' : 'italic'}`}
          >
            {showOptions ? '閉じる' : 'ルームのオプション'}
          </button>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded">{error}</div>}

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="bg-gradient-to-b from-green-700 to-green-800 disabled:bg-slate-600 text-white font-bold italic px-3 rounded-xl shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
          >
            {isCreating ? 'CREATING...' : 'CREATE ROOM'}
          </button>
          <button onClick={() => router.push('/')} className="bg-slate-700/50 text-slate-200 font-medium italic px-4 rounded-xl border border-slate-600 transition-all duration-300">BACK</button>
        </div>
      </div>

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
