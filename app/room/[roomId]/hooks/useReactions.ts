// app/room/[roomId]/hooks/useReactions.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToRoomReactions, sendRoomReaction, type RoomReaction } from '@/lib/services/reactionService';
import { type LocalReactionEffect } from '../components/ReactionOverlay';
import { type Player } from '@/types';

const REACTION_EFFECT_DURATION_MS = 2700;

export function useReactions(roomId: string, currentPlayerId: string, playerNickname?: string, questionId?: string) {
  const [reactionEffects, setReactionEffects] = useState<LocalReactionEffect[]>([]);
  const [isReactionPanelOpen, setIsReactionPanelOpen] = useState(false);
  const [lastReactionAt, setLastReactionAt] = useState(0);
  
  const hasInitialReactionSnapshotRef = useRef(false);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());
  const reactionPanelRef = useRef<HTMLDivElement | null>(null);
  const reactionToggleButtonRef = useRef<HTMLButtonElement | null>(null);

  const showReactionEffect = useCallback((reaction: Pick<RoomReaction, 'content' | 'userName' | 'type'>, eventTimestamp = Date.now()) => {
    const effectId = eventTimestamp + Math.random();
    setReactionEffects((prev) => [
      ...prev,
      {
        id: effectId,
        content: reaction.content,
        senderName: reaction.userName,
        type: reaction.type,
      },
    ]);
    setTimeout(() => {
      setReactionEffects((prev) => prev.filter((effect) => effect.id !== effectId));
    }, REACTION_EFFECT_DURATION_MS);
  }, []);

  // Subscribe to reactions
  useEffect(() => {
    hasInitialReactionSnapshotRef.current = false;
    seenReactionIdsRef.current = new Set();

    const unsubscribeReactions = subscribeToRoomReactions(roomId, (nextReactions) => {
      if (!hasInitialReactionSnapshotRef.current) {
        seenReactionIdsRef.current = new Set(nextReactions.map((reaction) => reaction.id));
        hasInitialReactionSnapshotRef.current = true;
        return;
      }

      const newReactions = [...nextReactions]
        .reverse()
        .filter((reaction) => !seenReactionIdsRef.current.has(reaction.id));

      for (const reaction of newReactions) {
        seenReactionIdsRef.current.add(reaction.id);
        if (reaction.userId === currentPlayerId) {
          continue;
        }
        showReactionEffect(reaction);
      }
    });

    return () => {
      unsubscribeReactions();
    };
  }, [roomId, currentPlayerId, showReactionEffect]);

  // Handle pointer down to close panel
  useEffect(() => {
    if (!isReactionPanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (reactionPanelRef.current?.contains(target) || reactionToggleButtonRef.current?.contains(target)) {
        return;
      }
      setIsReactionPanelOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isReactionPanelOpen]);

  const handleSendReaction = useCallback(async (
    type: 'reaction' | 'message',
    content: string,
    eventTimestamp: number
  ) => {
    if (eventTimestamp - lastReactionAt < 1000 || !playerNickname) {
      return;
    }

    setLastReactionAt(eventTimestamp);
    try {
      await sendRoomReaction({
        roomId,
        userId: currentPlayerId,
        userName: playerNickname,
        type,
        content,
        questionId: questionId,
      });

      showReactionEffect(
        {
          content,
          userName: playerNickname,
          type,
        },
        eventTimestamp
      );
      setIsReactionPanelOpen(false);
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  }, [roomId, currentPlayerId, playerNickname, lastReactionAt, questionId, showReactionEffect]);

  return {
    reactionEffects,
    isReactionPanelOpen,
    setIsReactionPanelOpen,
    reactionPanelRef,
    reactionToggleButtonRef,
    handleSendReaction,
  };
}
