'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
}

/**
 * HOME, BACK などの補助的なアクションに使用する小さいボタン
 * ホバー時に少し大きく、タップ時に押し込まれるアニメーションを持つ
 * 両端が半円のピル形状
 */
export function SecondaryButton({ children, onClick, className, disabled, type = 'button', href }: Props) {
  const commonClasses = `
    bg-slate-700/50 text-slate-200 font-bold italic px-6 py-2 rounded-full border border-slate-600 
    transition-colors duration-200
    hover:bg-slate-600/60 hover:border-slate-500 hover:text-white
    disabled:opacity-50 disabled:cursor-not-allowed
    inline-flex items-center justify-center
    ${className}
  `;

  const motionProps = {
    whileHover: { scale: 1.05, transition: { duration: 0.2 } },
    whileTap: { scale: 0.95 },
  };

  if (href) {
    return (
      <Link href={href} className="inline-block">
        <motion.div
          {...motionProps}
          className={commonClasses}
        >
          {children}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.button
      {...motionProps}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={commonClasses}
    >
      {children}
    </motion.button>
  );
}
