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
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={handleOverlayClick}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 ${panelClassName}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
