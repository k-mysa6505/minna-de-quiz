'use client';

import { Modal } from "@/app/common/Modal";

interface LeaveRoomModalProps {
  isLeaving: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function LeaveRoomModal({ 
  isLeaving, onCancel, onConfirm, 
  title = "ルームを退室", 
  description = "本当にこのルームを退室しますか？\n進行中のデータには戻れません。",
  confirmLabel = "退室する"
}: LeaveRoomModalProps) {
  return (
    <Modal
      onClose={onCancel}
      closeOnOverlayClick={!isLeaving}
      panelClassName="max-w-sm w-full"
    >
      <h3 className="text-lg text-center font-semibold italic tracking-widest text-white mb-3">
        {title}
      </h3>
      <div className="text-sm text-slate-400 text-center mb-8 whitespace-pre-line leading-relaxed">
        {description}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isLeaving}
          onClick={onCancel}
          className="flex-1 bg-slate-700/60 hover:bg-slate-600/60 disabled:opacity-40
                    text-slate-300 font-medium py-2 px-4 rounded-lg
                    transition-all disabled:cursor-not-allowed"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={isLeaving}
          onClick={onConfirm}
          className="flex-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-40
                    text-red-400 font-semibold py-2 px-4 rounded-lg
                    border border-red-400/30
                    transition-all disabled:cursor-not-allowed"
        >
          {isLeaving ? '処理中...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}