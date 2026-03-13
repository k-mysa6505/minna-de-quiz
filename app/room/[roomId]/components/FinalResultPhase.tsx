// app/room/[roomId]/components/FinalResultPhase.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { removePlayerFromRoom, requestRoomCleanup, resetRoomForReplay } from '@/lib/services/roomService';
import { updatePlayerOnlineStatus, resetAllPlayersScores } from '@/lib/services/playerService';
import { resetGameState, clearQuestionsAndAnswers } from '@/lib/services/gameService';
import type { Player } from '@/types';

interface FinalResultPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
  isRoomReset?: boolean;
  onPlayAgain?: () => void;
}

export function FinalResultPhase({ roomId, players, currentPlayerId, isRoomReset, onPlayAgain }: FinalResultPhaseProps) {
  const router = useRouter();
  const [hasLeft, setHasLeft] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [displayPlayers] = useState<Player[]>(players);


  // コンポーネントアンマウント時の処理
  useEffect(() => {
    return () => {
      if (!hasLeft) {
        const currentPlayerId = localStorage.getItem('currentPlayerId');
        if (currentPlayerId) {
          console.log('FinalResultPhase cleanup for player:', currentPlayerId);
          updatePlayerOnlineStatus(roomId, currentPlayerId, false).catch(console.error);
        }
      }
    };
  }, [roomId, hasLeft]);

  const handleLeaveRoom = async () => {
    try {
      const currentPlayerId = localStorage.getItem('currentPlayerId');
      if (!currentPlayerId) {
        // セッションクリア
        localStorage.clear();
        router.push('/');
        return;
      }

      console.log(`Player ${currentPlayerId} leaving room ${roomId}`);
      setHasLeft(true);

      // 段階的なクリーンアップ
      console.log('Setting player offline...');
      await updatePlayerOnlineStatus(roomId, currentPlayerId, false);

      console.log('Removing player from room...');
      await removePlayerFromRoom(roomId, currentPlayerId);
      requestRoomCleanup(roomId).catch(console.error);

      // 自分のセッションキーのみ削除（他タブのデータを消さないよう clear() は使わない）
      console.log('Clearing session data...');
      localStorage.removeItem('currentPlayerId');
      localStorage.removeItem('currentRoomId');
      sessionStorage.removeItem('currentPlayerId');
      sessionStorage.removeItem('currentRoomId');

      console.log('Redirecting to home...');
      router.push('/');
    } catch (error) {
      console.error('Failed to leave room:', error);
      // エラーが発生してもセッションはクリア
      localStorage.clear();
      sessionStorage.clear();
      router.push('/');
    }
  };

  const handlePlayAgain = async () => {
    try {
      setIsResetting(true);
      console.log(`Starting play-again for room ${roomId}`);

      if (!isRoomReset) {
        // 1. ゲーム状態をリセット
        console.log('Resetting game state...');
        await resetGameState(roomId);

        // 2. 問題と回答データをクリア
        console.log('Clearing questions and answers...');
        await clearQuestionsAndAnswers(roomId);

        // 3. 全プレイヤーのスコアをリセット
        console.log('Resetting player scores...');
        await resetAllPlayersScores(roomId);

        // 4. ルームステータスを待機状態に戻す
        console.log('Resetting room status...');
        await resetRoomForReplay(roomId);
      } else {
        console.log('Room is already reset by another player.');
      }

      console.log('Play-again reset completed successfully');

      if (onPlayAgain) {
        onPlayAgain();
      }
    } catch (error) {
      console.error('Failed to reset room for play-again:', error);
      alert('リセットに失敗しました。ページをリロードしてください。');
    } finally {
      setIsResetting(false);
    }
  };

  const playersToShow = displayPlayers.length > 0 ? displayPlayers : players;
  const sortedPlayers = [...playersToShow].sort((a, b) => b.score - a.score);

  // スコアに基づいて順位を計算する関数
  const calculateRank = (playerIndex: number): number => {
    if (playerIndex === 0) return 1;

    const currentScore = sortedPlayers[playerIndex].score;
    const previousScore = sortedPlayers[playerIndex - 1].score;

    if (currentScore === previousScore) {
      // 同じスコアなら前のプレイヤーと同じ順位
      return calculateRank(playerIndex - 1);
    } else {
      // スコアが異なる場合は、実際の位置 + 1
      return playerIndex + 1;
    }
  };

  // 1位のスコアを取得
  const topScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white tracking-tight">総合結果</h2>

      {/* プレイヤー一覧 */}
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 pb-4 rounded border border-slate-700/50">
        <div className="font-bold text-slate-400 pt-3 px-8 italic">
          PLAYER
        </div>
        <ul className="space-y-1">
          {sortedPlayers.map((player, idx) => {
            const rank = calculateRank(idx);
            const isWinner = player.score === topScore && topScore > 0;
            return (
              <li
                key={player.playerId}
                className={`flex items-center justify-between px-3 py-1 rounded transition-all ${player.playerId === currentPlayerId
                  ? 'bg-gradient-to-b from-blue-800/90 to-blue-500/10'
                  : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">
                    {rank}．
                    <span className={`italic ${isWinner ? 'text-yellow-400' : ''}`}>
                      {player.nickname}
                    </span>
                  </span>
                </div>
                <div className="text-white font-semibold">
                  {player.score.toLocaleString()}
                  <span className="text-xs ml-1">pt</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ボタン群 */}
      <div className="space-y-4">
        {/* もう一度遊ぶボタン */}
        <button
          onClick={handlePlayAgain}
          disabled={isResetting || hasLeft}
          className={`
            w-full font-bold py-4 px-6 rounded-2xl shadow-2xl transition-all duration-300 transform
            ${isResetting || hasLeft
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-105'
            }
          `}
        >
          {isResetting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
              <span>リセット中...</span>
            </div>
          ) : (
            'もう一度遊ぶ'
          )}
        </button>

        {/* ホームに戻るボタン */}
        <button
          onClick={handleLeaveRoom}
          disabled={isResetting}
          className={`
            block mx-auto font-bold italic px-6 py-3 rounded-2xl shadow-2xl transition-all duration-300 transform
            ${isResetting
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-b from-emerald-700 to-emerald-800 text-white hover:scale-105'
            }
          `}
        >
          HOME
        </button>
      </div>
    </div>
  );
}
