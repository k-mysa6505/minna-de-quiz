'use client';

import { QRCodeSVG } from 'qrcode.react';
import { PhaseHeader } from '../../components/PhaseHeader';
import { PlayerListCard } from '../../components/PlayerListCard';
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
    <section className="backdrop-blur-sm h-full grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 overflow-hidden">
      <div className="p-4 md:p-5 flex min-h-0 flex-col">
        <div className="mb-5">
          <PhaseHeader title="プレイヤー待機中" isScreen={true} />
          <p className="text-slate-300 mt-2 text-base md:text-lg">
            現在：<span className="font-bold text-emerald-400">{players.length}人</span>
            <span className="ml-2 text-xs md:text-sm text-slate-400">(最低参加人数: {room.minPlayers ?? 2}人)</span>
          </p>
        </div>
        <div className="min-h-0">
          <PlayerListCard players={players} currentPlayerId="" sortMode="joinedAt" showMasterBadge maxVisiblePlayers={10} />
        </div>
        <div className="mt-5 flex flex-col items-center flex-1">
          <div className="flex gap-4 justify-center">
            <button type="button" disabled={isStarting || players.length < (room.minPlayers ?? 2)} onClick={onStart} className="bg-emerald-700 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg transition-all">
              {isStarting ? 'STARTING...' : 'START'}
            </button>
            <button type="button" onClick={onDisband} className="bg-slate-700/50 text-slate-200 font-bold italic px-4 rounded-xl border border-slate-600">CLOSE</button>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 md:p-6 flex flex-col items-center justify-center text-center overflow-hidden">
        <p className="text-slate-300 text-sm md:text-base mb-4">ルーム参加用QRコード</p>
        <div className="bg-white rounded-2xl p-3 md:p-4 shadow-2xl mb-4">
          <QRCodeSVG value={joinUrl} size={240} level="M" includeMargin={true} />
        </div>
        <div className="px-4 py-2 w-full max-w-xl">
          <p className="text-slate-200 md:text-base mb-2">ROOM ID</p>
          <p className="font-black tracking-[0.2em] text-3xl md:text-5xl text-white">{room.roomId}</p>
        </div>
      </div>
    </section>
  );
}
