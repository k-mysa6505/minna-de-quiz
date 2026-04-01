'use client';

import { QRCodeSVG } from 'qrcode.react';
import { PhaseHeader } from '../../components/PhaseHeader';
import { PlayerListCard } from '../../components/PlayerListCard';
import { SecondaryButton } from '../../../../common/SecondaryButton';
import { PrimaryButton } from '../../../../common/PrimaryButton';
import { RoomID } from '../../../../common/RoomID';
import type { Player, Room } from '@/types';

interface WaitingScreenProps {
  room: Room;
  players: Player[];
  joinUrl: string;
  isStarting: boolean;
  onStart: () => void;
  onDisband: () => void;
}

export function WaitingScreen({ room, players, joinUrl, isStarting, onStart, onDisband }: WaitingScreenProps) {
  return (
    <section
      className="backdrop-blur-sm h-full w-full flex flex-row overflow-hidden"
      style={{ minWidth: 0 }}
    >
      {/* 左カラム: プレイヤー一覧・ボタン */}
      <div
        className="flex flex-col min-h-0 p-4 md:p-5"
        style={{ width: '50%', minWidth: 320, maxWidth: '50%', boxSizing: 'border-box', overflowY: 'auto', borderRight: '1px solid #334155' }}
      >
        <div className="mb-5">
          <PhaseHeader title="プレイヤー待機中" isScreen={true} />
          <p className="text-slate-300 mt-4 text-2xl md:text-4xl leading-tight">
            現在：<span className="font-bold text-emerald-400">{players.length}人</span>
            <span className="ml-4 text-base md:text-2xl text-slate-400">
              (最低参加人数: {room.minPlayers ?? 2}人)
            </span>
          </p>
        </div>
        <div className="min-h-0">
          <PlayerListCard
            players={players}
            currentPlayerId=""
            sortMode="joinedAt"
            showMasterBadge
            maxVisiblePlayers={10}
            useScreenMode={room.useScreenMode === true}
          />
        </div>
        <div className="mt-5 flex flex-col items-center flex-1">
          <div className="flex gap-4 justify-center">
            <PrimaryButton
              onClick={onStart}
              disabled={isStarting || players.length < (room.minPlayers ?? 2)}
            >
              {isStarting ? 'STARTING...' : 'START'}
            </PrimaryButton>
            <SecondaryButton onClick={onDisband}>CLOSE</SecondaryButton>
          </div>
        </div>
      </div>
      {/* 右カラム: QRコード・ID */}
      <div
        className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 md:p-10 flex flex-col items-center justify-center text-center overflow-hidden h-full"
        style={{ width: '50%', minWidth: 320, maxWidth: '50%', boxSizing: 'border-box', overflowY: 'auto' }}
      >
        <p className="text-slate-300 text-sm md:text-base mb-4">ルーム参加用QRコード</p>
        <div className="bg-white rounded-2xl p-4 shadow-2xl mb-8 flex items-center justify-center">
          <QRCodeSVG value={joinUrl} size={320} level="M" includeMargin={true} />
        </div>
        <div className="px-4 py-2 w-full max-w-xl">
          <p className="text-slate-400 text-sm md:text-lg mb-2 tracking-widest">ROOM ID</p>
          <RoomID id={room.roomId} className="text-5xl md:text-7xl font-black" />
        </div>
      </div>
    </section>
  );
}
