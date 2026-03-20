import type { Room } from '@/types';

interface RoomJoinConfirmCardProps {
  roomInfo: Room;
  nickname: string;
  isLoading: boolean;
  error: string;
  onConfirm: () => void;
  onBack: () => void;
}

export function RoomJoinConfirmCard({
  roomInfo,
  nickname,
  isLoading,
  error,
  onConfirm,
  onBack,
}: RoomJoinConfirmCardProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-3 tracking-tight">
            このルームに参加しますか？
          </h1>
        </div>

        <div className="space-y-4 bg-slate-700/30 rounded-md p-6 border border-slate-600/50">
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
            <p className="text-sm text-slate-400 mb-1">ホスト</p>
            <p className="text-white">{roomInfo.masterNickname || '未設定'}</p>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-1">あなたの名前</p>
            <p className="text-white">{nickname}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-gradient-to-b from-emerald-700 to-emerald-800 px-4 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold italic rounded-xl shadow-lg transition-all duration-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'JOINING...' : 'JOIN'}
          </button>
          <button
            onClick={onBack}
            className="bg-slate-700/50 px-4 text-slate-200 font-bold italic rounded-xl transition-all duration-300"
          >
            BACK
          </button>
        </div>
      </div>
    </main>
  );
}
