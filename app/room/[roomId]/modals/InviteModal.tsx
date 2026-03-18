'use client';

import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from "@/app/common/Modal";

interface InviteModalProps {
  roomId: string;
  onClose: () => void;
}

export function InviteModal({ roomId, onClose }: InviteModalProps) {
  const [copiedTarget, setCopiedTarget] = useState<'roomId' | 'link' | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/join-room?roomId=${roomId}`;
  }, [roomId]);

  const shareMessage = useMemo(
    () => `[みんクイ] お友達から招待が届きました。下記リンクから一緒に遊びましょう！\n\n${shareUrl}`,
    [shareUrl]
  );

  const handleCopy = async (target: 'roomId' | 'link') => {
    try {
      const text = target === 'roomId' ? roomId : shareMessage;
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Modal onClose={onClose} panelClassName="max-w-md w-full">
      <h3 className="text-xl text-center font-bold text-white mb-4">友達を招待</h3>

      <div className="bg-slate-700/30 rounded-lg p-4 mb-4 text-center">
        <p className="text-xs text-slate-400 mb-2">QRコード</p>
        <div className="bg-white p-4 rounded inline-block">
          <QRCodeSVG
            value={shareUrl}
            size={160}
            level="M"
          />
        </div>
      </div>

      <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
        <p className="text-xs text-slate-400 mb-2">ルームID</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-slate-900/50 text-white px-3 py-2 rounded font-mono text-sm">
            {roomId}
          </code>
          <button
            onClick={() => handleCopy('roomId')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded transition-all"
          >
            {copiedTarget === 'roomId' ? 'コピー済み' : 'コピー'}
          </button>
        </div>
      </div>

      <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
        <p className="text-xs text-slate-400 mb-2">共有リンク</p>
        <div className="flex items-start gap-2">
          <textarea
            value={shareMessage}
            readOnly
            className="flex-1 bg-slate-900/50 text-white px-3 py-2 rounded text-xs border border-slate-600 resize-none"
            rows={3}
          />
          <button
            onClick={() => handleCopy('link')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded transition-all"
          >
            {copiedTarget === 'link' ? 'コピー済み' : 'コピー'}
          </button>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
      >
        閉じる
      </button>
    </Modal>
  );
}
