// app/room/[roomId]/hooks/useRoomData.ts
// ルームとプレイヤー情報を管理するカスタムフック
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { subscribeToRoom, deleteRoom } from '@/lib/services/roomService';
import { subscribeToPlayers, updatePlayerOnlineStatus } from '@/lib/services/playerService';
import type { Room, Player } from '@/types';

export function useRoomData(roomId: string, currentPlayerId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string>('');
  const deleteRoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 自動削除ロジック
  const handleAutoDelete = useCallback((playerList: Player[], currentRoom: Room | null) => {
    if (!currentRoom || currentRoom.status === 'finished' || currentRoom.status === 'waiting') {
      return;
    }

    if (playerList.length > 0) {
      const allOffline = playerList.every(p => !p.isOnline);

      if (allOffline) {
        // 既存のタイムアウトをクリア
        if (deleteRoomTimeoutRef.current) {
          clearTimeout(deleteRoomTimeoutRef.current);
        }

        console.log('All players offline. Scheduling room deletion...');
        deleteRoomTimeoutRef.current = setTimeout(() => {
          deleteRoom(roomId).catch(console.error);
          deleteRoomTimeoutRef.current = null;
        }, 10000);
      } else {
        // 誰かがオンラインになったらキャンセル
        if (deleteRoomTimeoutRef.current) {
          clearTimeout(deleteRoomTimeoutRef.current);
          deleteRoomTimeoutRef.current = null;
          console.log('Player online. Cancelling deletion.');
        }
      }
    }
  }, [roomId]);

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

      // 自動削除ロジック
      setRoom(currentRoom => {
        handleAutoDelete(playerList, currentRoom);
        return currentRoom;
      });
    });

    return () => {
      clearTimeout(setOnlineTimeout);
      if (deleteRoomTimeoutRef.current) {
        clearTimeout(deleteRoomTimeoutRef.current);
      }
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }, [roomId, currentPlayerId, handleAutoDelete]);

  return { room, players, error };
}

