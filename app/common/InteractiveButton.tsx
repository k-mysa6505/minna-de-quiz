'use client';

import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function InteractiveButton({ children, onClick, className, disabled }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        interactive-element
        px-6 py-2 rounded-lg font-bold transition-all duration-200
        border border-accent-border bg-accent/10
        hover:border-accent-border/80 hover:letter-spacing-widest
        disabled:opacity-50
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}
