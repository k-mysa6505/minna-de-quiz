// app/room/[roomId]/page.tsx
// ゲームルームページ - メイン画面（リファクタリング版）
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoomData } from './hooks/useRoomData';
import { usePlayerStatus } from './hooks/usePlayerStatus';
import { setupPresence } from '@/lib/services/presenceService';
import { WaitingPhase } from './components/WaitingPhase';
import { QuestionCreationPhase } from './components/QuestionCreationPhase';
import { GamePlayPhase } from './components/GamePlayPhase';
import { FinalResultPhase } from './components/FinalResultPhase';
import LoadingSpinner from '@/app/common/LoadingSpinner';

// 初期状態を取得するヘルパー関数
function getInitialPlayerState(roomId: string) {
  if (typeof window !== 'undefined') {
    const storedPlayerId = localStorage.getItem('currentPlayerId');
    const storedRoomId = localStorage.getItem('currentRoomId');

    if (!storedPlayerId || storedRoomId !== roomId) {
      return {
        playerId: '',
        error: 'プレイヤー情報が見つかりません。再度ルームに参加してください。',
        loading: false
      };
    }

    return {
      playerId: storedPlayerId,
      error: '',
      loading: true
    };
  }

  return {
    playerId: '',
    error: '',
    loading: true
  };
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const initialState = getInitialPlayerState(roomId);
  const [currentPlayerId] = useState<string>(initialState.playerId);

  // カスタムフックでルームデータを取得
  const { room, players, error: roomError } = useRoomData(roomId, currentPlayerId);

  // プレイヤーのオンライン状態を管理
  usePlayerStatus(roomId, currentPlayerId);

  // プレゼンス管理のクリーンアップ関数
  const presenceCleanupRef = useRef<(() => void) | null>(null);

  // プレゼンス設定とクリーンアップ
  useEffect(() => {
    if (currentPlayerId && roomId) {
      console.log('Setting up presence for player:', currentPlayerId);
      presenceCleanupRef.current = setupPresence(roomId, currentPlayerId);
    }

    // クリーンアップ関数
    return () => {
      if (presenceCleanupRef.current) {
        console.log('Cleaning up presence on unmount');
        presenceCleanupRef.current();
        presenceCleanupRef.current = null;
      }
    };
  }, [currentPlayerId, roomId]);

  const error = initialState.error || roomError;
  const loading = !room && !error;

  // ローディング中
  if (loading) {
    return <LoadingSpinner message="読み込み中..." />;
  }

  // エラー表示
  if (error || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md w-full bg-slate-800/50 rounded-lg border border-slate-700/50 p-6 space-y-4 text-center">
          <h1 className="text-lg font-semibold text-white italic">
            ルームが見つかりません
          </h1>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-slate-400 hover:text-slate-300 italic underline underline-offset-2 transition-all"
          >
            back to home
          </button>
        </div>
      </div>
    );
  }

  // メイン画面
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* メインコンテンツ: ルーム状態に応じて切り替え */}
        <div className="shadow py-6">
          {room.status === 'waiting' && (
            <WaitingPhase
              roomId={roomId}
              room={room}
              players={players}
              currentPlayerId={currentPlayerId}
              isMaster={room.masterId === currentPlayerId}
            />
          )}

          {room.status === 'creating' && (
            <QuestionCreationPhase
              roomId={roomId}
              players={players}
              currentPlayerId={currentPlayerId}
            />
          )}

          {room.status === 'playing' && (
            <GamePlayPhase
              roomId={roomId}
              players={players}
              currentPlayerId={currentPlayerId}
              useScreenMode={room.useScreenMode ?? false}
              timeLimit={room.timeLimit ?? 30}
            />
          )}

          {room.status === 'finished' && (
            <FinalResultPhase
              roomId={roomId}
              players={players}
              currentPlayerId={currentPlayerId}
              useScreenMode={room.useScreenMode ?? false}
            />
          )}
        </div>
      </div>
    </main>
  );
}
