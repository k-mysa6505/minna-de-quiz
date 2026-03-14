// app/join-room/page.tsx
// ルーム参加ページ
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinRoom, getRoom } from '@/lib/services/roomService';
import { runServiceAction } from '@/lib/services/serviceAction';
import { RoomEntryFormCard } from './components/RoomEntryFormCard';
import { RoomJoinConfirmCard } from './components/RoomJoinConfirmCard';
import type { Room } from '@/types';

export default function JoinRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomIdFromUrl = searchParams.get('roomId');
  const mode = searchParams.get('mode');
  const isHostSetupFlow = mode === 'host-setup' && Boolean(roomIdFromUrl);

  const [roomId, setRoomId] = useState(roomIdFromUrl || '');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 確認画面用
  const [roomInfo, setRoomInfo] = useState<Room | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const validateNickname = () => {
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return false;
    }
    if (nickname.length > 20) {
      setError('ニックネームは20文字以内で入力してください');
      return false;
    }
    return true;
  };

  const handleCheckRoom = async () => {
    if (!roomId.trim()) {
      setError('ルームIDを入力してください');
      return;
    }
    if (!validateNickname()) {
      return;
    }

    setIsLoading(true);
    setError('');

    const room = await runServiceAction('joinRoom.checkRoom', () => getRoom(roomId.trim()), {
      onError: (message) => setError(message || 'ルーム情報の取得に失敗しました'),
      fallback: null,
    });

    if (!room) {
      setError((prev) => prev || 'ルームが見つかりません');
      setIsLoading(false);
      return;
    }

    setRoomInfo(room);
    setShowConfirm(true);
    setIsLoading(false);
  };

  const handleJoinRoom = async (targetRoomId: string) => {
    setIsLoading(true);
    setError('');

    const playerId = await runServiceAction(
      'joinRoom.submit',
      () =>
        joinRoom({
          roomId: targetRoomId,
          nickname: nickname.trim(),
        }),
      {
        onError: (message) => setError(message || 'ルームへの参加に失敗しました'),
      }
    );

    if (!playerId) {
      setIsLoading(false);
      setShowConfirm(false);
      return;
    }

    localStorage.setItem('currentPlayerId', playerId);
    localStorage.setItem('currentRoomId', targetRoomId);
    router.push(`/room/${targetRoomId}`);
  };

  const handleCompleteHostSetup = async () => {
    if (!roomId.trim()) {
      setError('ルーム情報が見つかりません。作成画面からやり直してください');
      return;
    }
    if (!validateNickname()) {
      return;
    }

    await handleJoinRoom(roomId.trim());
  };

  if (!isHostSetupFlow && showConfirm && roomInfo) {
    return (
      <RoomJoinConfirmCard
        roomInfo={roomInfo}
        isLoading={isLoading}
        error={error}
        onConfirm={() => handleJoinRoom(roomId.trim())}
        onBack={() => setShowConfirm(false)}
      />
    );
  }

  if (isHostSetupFlow) {
    return (
      <RoomEntryFormCard
        title="ホスト名を入力"
        roomId={roomId}
        nickname={nickname}
        onNicknameChange={setNickname}
        onSubmit={handleCompleteHostSetup}
        onBack={() => router.push('/create-room')}
        isLoading={isLoading}
        error={error}
        submitLabel="JOIN ROOM"
        loadingLabel="JOINING..."
        showRoomIdInput={false}
        disableSubmit={isLoading || !nickname.trim()}
      />
    );
  }

  return (
    <RoomEntryFormCard
      title="ルームに参加"
      roomId={roomId}
      nickname={nickname}
      onRoomIdChange={setRoomId}
      onNicknameChange={setNickname}
      onSubmit={handleCheckRoom}
      onBack={() => router.push('/')}
      isLoading={isLoading}
      error={error}
      submitLabel="NEXT"
      loadingLabel="WAIT..."
      showRoomIdInput
      disableSubmit={isLoading || !roomId.trim() || !nickname.trim()}
    />
  );
}
