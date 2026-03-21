'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, alt = 'Enlarged image' }: ImageModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-2xl cursor-zoom-out"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="w-full h-full flex items-center justify-center relative"
          >
            <Image
              src={imageUrl}
              alt={alt}
              fill
              className="object-contain select-none drop-shadow-2xl"
              priority
              sizes="100vw"
            />
            {/* 閉じるボタン（50%ダーク背景に馴染むガラス風デザイン） */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-6 right-6 z-[10000] bg-white/10 hover:bg-white/20 text-white/90 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-all active:scale-95"
              aria-label="Close"
            >
              <span className="text-2xl font-light">✕</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
