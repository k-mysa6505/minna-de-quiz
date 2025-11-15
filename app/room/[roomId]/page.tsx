// app/room/[roomId]/page.tsx
// ゲームルームページ - メイン画面（リファクタリング版）
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoomData } from './hooks/useRoomData';
import { usePlayerStatus } from './hooks/usePlayerStatus';
import { WaitingPhase } from './components/WaitingPhase';
import { QuestionCreationPhase } from './components/QuestionCreationPhase';
import { GamePlayPhase } from './components/GamePlayPhase';
import { FinalResultPhase } from './components/FinalResultPhase';
import type { RoomStatus } from '@/types';

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

// ルームステータスのラベル変換
function getRoomStatusLabel(status: RoomStatus): string {
  const labels: Record<RoomStatus, string> = {
    waiting: '待機中',
    creating: '問題作成中',
    playing: 'ゲーム進行中',
    finished: '終了',
  };
  return labels[status] || status;
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

  const error = initialState.error || roomError;
  const loading = !room && !error;

  // ローディング中
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-2xl font-bold text-gray-600">読み込み中...</div>
      </div>
    );
  }

  // エラー表示
  if (error || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 space-y-4 text-center">
          <div className="text-6xl">😢</div>
          <h1 className="text-2xl font-bold text-gray-800">
            ルームが見つかりません
          </h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // メイン画面
  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* メインコンテンツ: ゲーム状態に応じて切り替え */}
        <div className="bg-white rounded-lg shadow p-6">
          {room.status === 'waiting' && (
            <WaitingPhase
              roomId={roomId}
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
            />
          )}

          {room.status === 'finished' && (
            <FinalResultPhase
              roomId={roomId}
              players={players}
            />
          )}
        </div>
      </div>
    </main>
  );
}
