'use client';

import { Modal } from './Modal';

interface LeaveRoomModalProps {
  isLeaving: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function LeaveRoomModal({ isLeaving, onCancel, onConfirm }: LeaveRoomModalProps) {
  return (
    <Modal
      onClose={onCancel}
      closeOnOverlayClick={!isLeaving}
      panelClassName="max-w-sm w-full"
    >
      <h3 className="text-xl text-center font-bold text-white mb-3">ルームを退室</h3>
      <p className="text-sm text-slate-300 text-center mb-6">
        本当にこのルームを退室しますか？
        <br />
        進行中のデータには戻れません。
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isLeaving}
          onClick={onCancel}
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 text-white font-medium py-2 px-4 rounded-lg transition-all disabled:cursor-not-allowed"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={isLeaving}
          onClick={onConfirm}
          className="flex-1 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:cursor-not-allowed"
        >
          {isLeaving ? '退室中...' : '退室する'}
        </button>
      </div>
    </Modal>
  );
}
