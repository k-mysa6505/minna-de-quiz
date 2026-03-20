import { ReactNode } from 'react';

interface RoomEntryFormCardProps {
  title: string;
  roomId: string;
  nickname: string;
  onRoomIdChange?: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string;
  submitLabel: string;
  loadingLabel: string;
  showRoomIdInput?: boolean;
  roomIdReadOnly?: boolean;
  roomIdPlaceholder?: string;
  nicknamePlaceholder?: string;
  disableSubmit?: boolean;
  footerNote?: ReactNode;
}

export function RoomEntryFormCard({
  title,
  roomId,
  nickname,
  onRoomIdChange,
  onNicknameChange,
  onSubmit,
  onBack,
  isLoading,
  error,
  submitLabel,
  loadingLabel,
  showRoomIdInput = true,
  roomIdReadOnly = false,
  roomIdPlaceholder = '123456',
  nicknamePlaceholder = 'あなたの代名詞は？',
  disableSubmit = false,
  footerNote,
}: RoomEntryFormCardProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="space-y-6 w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
            {title}
          </h1>
        </div>

        {showRoomIdInput && (
          <div>
            <label htmlFor="roomId" className="block text-sm font-medium italic text-slate-300 mb-2">
              ROOM ID
            </label>
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => onRoomIdChange?.(e.target.value)}
              readOnly={roomIdReadOnly}
              placeholder={roomIdPlaceholder}
              maxLength={6}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-2xl font-mono tracking-widest transition-all read-only:opacity-80"
            />
          </div>
        )}

        <div>
          <label htmlFor="nickname" className="block text-sm font-medium italic text-slate-300 mb-2">NICKNAME</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            placeholder={nicknamePlaceholder}
            maxLength={20}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {error && (
          <div className="text-red-400 italic">
            {error}
          </div>
        )}

        {footerNote}

        <div className="flex gap-4 justify-center">
          <button
            onClick={onSubmit}
            disabled={disableSubmit}
            className="bg-emerald-700 disabled:bg-slate-600 text-white font-bold italic px-4 rounded-xl shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
          >
            {isLoading ? loadingLabel : submitLabel}
          </button>

          <button
            onClick={onBack}
            className="bg-slate-700/50 text-slate-200 font-bold italic px-4 rounded-xl border border-slate-600 transition-all duration-300"
          >
            BACK
          </button>
        </div>
      </div>
    </main>
  );
}
