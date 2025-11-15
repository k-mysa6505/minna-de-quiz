// app/join-room/page.tsx
// ルーム参加ページ
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinRoom, getRoom } from '@/lib/services/roomService';
import type { Room } from '@/types';

export default function JoinRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomIdFromUrl = searchParams.get('roomId');
  const [roomId, setRoomId] = useState(roomIdFromUrl ? roomIdFromUrl.toUpperCase() : '');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 確認画面用
  const [roomInfo, setRoomInfo] = useState<Room | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCheckRoom = async () => {
    if (!roomId.trim()) {
      setError('ルームIDを入力してください');
      return;
    }
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return;
    }
    if (nickname.length > 20) {
      setError('ニックネームは20文字以内で入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const room = await getRoom(roomId.trim());
      if (!room) {
        setError('ルームが見つかりません');
        setIsLoading(false);
        return;
      }

      setRoomInfo(room);
      setShowConfirm(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'ルーム情報の取得に失敗しました');
      } else {
        setError(String(err) || 'ルーム情報の取得に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    setIsLoading(true);
    setError('');

    try {
      const playerId = await joinRoom({
        roomId: roomId.trim(),
        nickname: nickname.trim(),
      });

      localStorage.setItem('currentPlayerId', playerId);
      localStorage.setItem('currentRoomId', roomId.trim());

      router.push(`/room/${roomId.trim()}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'ルームへの参加に失敗しました');
      } else {
        setError(String(err) || 'ルームへの参加に失敗しました');
      }
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm && roomInfo) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-1xl font-bold text-white mb-3 tracking-tight">
              このルームに参加しますか？
            </h1>
          </div>

          <div className="space-y-4 bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
            <div>
              <p className="text-sm text-slate-300 mb-1">ルームID</p>
              <p className="text-2xl font-mono font-bold text-white tracking-widest">{roomInfo.roomId}</p>
            </div>

            {roomInfo.description && (
              <div>
                <p className="text-sm text-slate-400 mb-1">ルーム説明</p>
                <p className="text-white">{roomInfo.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-slate-400 mb-1">作成者</p>
              <p className="text-white">{roomInfo.masterNickname}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-bold italic rounded-xl transition-all duration-300"
            >
              BACK
            </button>
            <button
              onClick={handleJoinRoom}
              disabled={isLoading}
              className="flex-1 bg-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold italic rounded-xl shadow-lg transition-all duration-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'JOINING...' : 'JOIN'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
            ルームに参加
          </h1>
        </div>

        <div>
          <label htmlFor="roomId" className="block text-sm font-medium italic text-slate-300 mb-2">
            ROOM ID
          </label>
          <input
            id="roomId"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="123456"
            maxLength={6}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase text-center text-2xl font-mono tracking-widest transition-all"
          />
        </div>

        <div>
          <label htmlFor="nickname" className="block text-sm font-medium italic text-slate-300 mb-2">NICKNAME</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="あなたの代名詞は？"
            maxLength={20}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleCheckRoom}
            disabled={isLoading || !roomId.trim() || !nickname.trim()}
            className="bg-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
          >
            {isLoading ? 'WAIT...' : 'NEXT'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-bold italic px-4 rounded-xl border border-slate-600 transition-all duration-300"
          >
            BACK
          </button>
        </div>
      </div>
    </main>
  );
}
