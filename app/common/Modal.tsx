'use client';

import type { ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose?: () => void;
  closeOnOverlayClick?: boolean;
  panelClassName?: string;
}

export function Modal({
  children,
  onClose,
  closeOnOverlayClick = true,
  panelClassName = '',
}: ModalProps) {
  const handleOverlayClick = () => {
    if (closeOnOverlayClick && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-slate-900 rounded-xl border border-slate-700/60 p-8 ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}