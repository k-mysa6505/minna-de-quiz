// app/room/[roomId]/useRoomData.ts
// ルームとプレイヤー情報を管理するカスタムフック
'use client';

import { useEffect, useState } from 'react';
import { subscribeToRoom } from '@/lib/services/room/roomService';
import { subscribeToPlayers, updatePlayerOnlineStatus } from '@/lib/services/auth/playerService';
import type { Room, Player } from '@/types';

export function useRoomData(roomId: string, currentPlayerId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!currentPlayerId) return;

    // プレイヤーをオンラインに設定
    const setOnlineTimeout = setTimeout(() => {
      updatePlayerOnlineStatus(roomId, currentPlayerId, true).catch(console.error);
    }, 500);

    // ルーム情報を取得＆監視
    const unsubscribeRoom = subscribeToRoom(roomId, (roomData) => {
      if (roomData) {
        setRoom(roomData);
        setError('');
      } else {
        setError('ルームが存在しません');
      }
    });

    // プレイヤー情報を取得＆監視
    const unsubscribePlayers = subscribeToPlayers(roomId, (playerList) => {
      setPlayers(playerList);

      // プレイヤー存在チェック（finished状態を除く）
      const playerExists = playerList.some(p => p.playerId === currentPlayerId);
      if (!playerExists && playerList.length > 0) {
        setRoom(currentRoom => {
          if (currentRoom && currentRoom.status !== 'finished') {
            setError('このプレイヤーはルームに参加していません。再度参加してください。');
          }
          return currentRoom;
        });
      }

    });

    return () => {
      clearTimeout(setOnlineTimeout);
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }, [roomId, currentPlayerId]);

  return { room, players, error };
}

