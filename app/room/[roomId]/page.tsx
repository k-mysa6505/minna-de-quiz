// app/room/[roomId]/page.tsx
// ゲームルームページ - メイン画面
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { subscribeToRoom } from '@/lib/services/roomService';
import { subscribeToPlayers } from '@/lib/services/playerService';
import type { Room, Player, RoomStatus } from '@/types';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // クライアントサイドでのマウント時のみlocalStorageから取得
  useEffect(() => {
    const playerId = localStorage.getItem('currentPlayerId') || '';

    if (!playerId) {
      setError('プレイヤー情報が見つかりません。再度ルームに参加してください。');
      setLoading(false);
    } else {
      setCurrentPlayerId(playerId);
    }
  }, []);

  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }

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
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }, [roomId, currentPlayerId]);

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

  // ゲーム状態に応じた画面を表示
  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー: ルームID表示 */}
        <header className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                ルーム: {roomId}
              </h1>
              <p className="text-gray-600">
                状態: {getRoomStatusLabel(room.status)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">プレイヤー数</p>
              <p className="text-2xl font-bold text-blue-600">
                {players.length}
              </p>
            </div>
          </div>
        </header>

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

// ========================================
// フェーズ別コンポーネント
// ========================================

/** 待機フェーズ */
function WaitingPhase({
  roomId,
  players,
  currentPlayerId,
  isMaster,
}: {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  isMaster: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">プレイヤー待機中</h2>

      {/* プレイヤー一覧コンポーネント */}
      <div className="text-gray-600 text-center">
        プレイヤー一覧
        <ul className="mt-4 space-y-2">
          {players.map((player) => (
            <li
              key={player.playerId}
              className={`flex items-center justify-center space-x-4 p-2 border rounded-lg ${
                player.playerId === currentPlayerId ? 'bg-blue-50 border-blue-400' : 'bg-gray-100 border-gray-300'
              }`}
            >
              {/* プレイヤーカラー表示 */}
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: player.color }}
              >
              </div>
              {/* ニックネーム表示 */}
              <span className="font-bold text-gray-800">{player.nickname}</span>
              {player.playerId === currentPlayerId && <span className="text-sm text-gray-500">(ホスト)</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* QRコード表示 */}
      <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800">ルームに参加</h3>
        <p className="text-sm text-gray-600">このQRコードをスキャンして参加</p>

        {/* QRコード */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <QRCodeSVG
            value={getJoinUrl(roomId)}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* ルームID表示 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">ルームID</p>
          <p className="text-3xl font-mono font-bold text-blue-600">{roomId}</p>
        </div>

        {/* 参加URL（コピー用） */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(getJoinUrl(roomId));
            alert('URLをコピーしました！');
          }}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          URLをコピー
        </button>
      </div>      {/* ゲーム開始ボタン（ホストのみ） */}
      {isMaster && (
        <button
          disabled={players.length < 2}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-xl"
        >
          ゲーム開始
        </button>
      )}
    </div>
  );
}

/** 問題作成フェーズ */
function QuestionCreationPhase({
  roomId,
  players,
  currentPlayerId,
}: {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">問題作成中</h2>

      {/* TODO: 問題作成フォームコンポーネント */}
      <div className="text-gray-600 text-center">
        問題作成フォーム（TODO: 実装）
      </div>

      {/* TODO: 作成進捗表示 */}
      <div className="text-gray-600 text-center">
        作成進捗（TODO: 実装）
      </div>
    </div>
  );
}

/** ゲームプレイフェーズ */
function GamePlayPhase({
  roomId,
  players,
  currentPlayerId,
}: {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">ゲーム進行中</h2>

      {/* TODO: 問題表示コンポーネント */}
      <div className="text-gray-600 text-center">
        問題表示（TODO: 実装）
      </div>

      {/* TODO: 回答/予想フォームコンポーネント */}
      <div className="text-gray-600 text-center">
        回答/予想フォーム（TODO: 実装）
      </div>

      {/* TODO: 結果表示コンポーネント */}
      <div className="text-gray-600 text-center">
        結果表示（TODO: 実装）
      </div>
    </div>
  );
}

/** 最終結果フェーズ */
function FinalResultPhase({
  roomId,
  players,
}: {
  roomId: string;
  players: Player[];
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">🎉 ゲーム終了 🎉</h2>

      {/* TODO: 最終順位表示 */}
      <div className="text-gray-600 text-center">
        最終順位（TODO: 実装）
      </div>

      {/* TODO: 統計情報表示 */}
      <div className="text-gray-600 text-center">
        統計情報（TODO: 実装）
      </div>
    </div>
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

/**
 * ルーム参加用のURLを生成
 */
function getJoinUrl(roomId: string): string {
  if (typeof window !== 'undefined') {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join-room?roomId=${roomId}`;
  }
  return '';
}
