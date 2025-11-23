// app/room/[roomId]/page.tsx
// ゲームルームページ - メイン画面
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { subscribeToRoom, deleteRoom } from '@/lib/services/roomService';
import { subscribeToPlayers, updatePlayerOnlineStatus } from '@/lib/services/playerService';
import { WaitingPhase } from './components/WaitingPhase';
import { QuestionCreationPhase } from './components/QuestionCreationPhase';
import { GamePlayPhase } from './components/GamePlayPhase';
import { FinalResultPhase } from './components/FinalResultPhase';
import type { Room, Player, RoomStatus } from '@/types';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  // playerIdとroomIdの検証（初期値として）
  const getInitialState = () => {
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
  };

  const initialState = getInitialState();
  const [currentPlayerId, setCurrentPlayerId] = useState<string>(initialState.playerId);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(initialState.loading);
  const [error, setError] = useState<string>(initialState.error);
  const deleteRoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }

    // プレイヤーをオンラインに設定（少し遅延させてFirestoreの書き込み完了を待つ）
    const setOnlineTimeout = setTimeout(() => {
      updatePlayerOnlineStatus(roomId, currentPlayerId, true).catch(console.error);
    }, 500);

    // ブラウザを閉じる時の処理
    const handleBeforeUnload = () => {
      // オフラインにする（ベストエフォート）
      updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
    };

    // ページの可視性が変わった時の処理（タブが閉じられた時など）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
      } else {
        updatePlayerOnlineStatus(roomId, currentPlayerId, true).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ルーム情報を取得＆監視
    const unsubscribeRoom = subscribeToRoom(roomId, (roomData) => {
      if (roomData) {
        setRoom(roomData);
        setError('');
      } else {
        setError('ルームが存在しません');
      }
      setLoading(false);
    });

    // プレイヤー情報を取得＆監視
    const unsubscribePlayers = subscribeToPlayers(roomId, (playerList) => {
      setPlayers(playerList);

      // 現在のプレイヤーがリストに存在しない場合はエラー
      // ただし、finished状態では他のプレイヤーが先に退出している可能性があるのでチェックしない
      const playerExists = playerList.some(p => p.playerId === currentPlayerId);
      if (!playerExists && playerList.length > 0 && room?.status !== 'finished') {
        setError('このプレイヤーはルームに参加していません。再度参加してください。');
        setLoading(false);
      }

      // 自動削除の条件：
      // 1. finished状態ではない（finishedは退出ボタンで明示的に削除）
      // 2. waiting状態ではない（プレイヤーが参加中の可能性が高い）
      // 3. プレイヤーが存在する
      // 4. 全員がオフライン
      if (
        room?.status !== 'finished' && 
        room?.status !== 'waiting' && 
        playerList.length > 0
      ) {
        const allOffline = playerList.every(p => !p.isOnline);
        if (allOffline) {
          // 既存のタイムアウトをクリア（デバウンス）
          if (deleteRoomTimeoutRef.current) {
            clearTimeout(deleteRoomTimeoutRef.current);
          }

          console.log('All players are offline in non-waiting room. Scheduling deletion...');
          // 一定時間待ってから削除（再接続の猶予）
          deleteRoomTimeoutRef.current = setTimeout(() => {
            deleteRoom(roomId).catch(console.error);
            deleteRoomTimeoutRef.current = null;
          }, 10000); // 10秒に延長して再接続の猶予を増やす
        } else {
          // 誰かがオンラインになったら、スケジュールされた削除をキャンセル
          if (deleteRoomTimeoutRef.current) {
            clearTimeout(deleteRoomTimeoutRef.current);
            deleteRoomTimeoutRef.current = null;
            console.log('Player came online. Cancelling room deletion.');
          }
        }
      }
    });

    return () => {
      clearTimeout(setOnlineTimeout);
      if (deleteRoomTimeoutRef.current) {
        clearTimeout(deleteRoomTimeoutRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribeRoom();
      unsubscribePlayers();
      // ページを離れるときにオフラインにする
      updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
    };
  }, [roomId, currentPlayerId, room?.status]);

  // ローディング中
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-2xl font-bold text-slate-300">読み込み中...</div>
      </div>
    );
  }

  // エラー表示
  if (error || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md w-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 space-y-6 text-center">
          <div className="text-7xl">😢</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            ルームが見つかりません
          </h1>
          <p className="text-slate-300">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-4 px-4 rounded shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // ゲーム状態に応じた画面を表示
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* メインコンテンツ: ゲーム状態に応じて切り替え */}
        <div className="from-slate-800/90 to-slate-900/90 px-2 py-10">
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

// ========================================
// ユーティリティ関数
// ========================================

function getRoomStatusLabel(status: RoomStatus): string {
  const labels: Record<RoomStatus, string> = {
    waiting: '待機中',
    creating: '問題作成中',
    playing: 'ゲーム進行中',
    finished: '終了',
  };
  return labels[status] || status;
}
