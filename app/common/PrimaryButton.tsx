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
  color?: 'emerald' | 'blue' | 'green';
}

/**
 * 主要なアクション（CREATE, START, JOIN, REPLAYなど）に使用するボタン
 * ホバー時に少し大きく、タップ時に押し込まれるアニメーションを持つ
 * 両端が半円のピル形状、目立つグラデーションまたは背景色
 */
export function PrimaryButton({ 
  children, 
  onClick, 
  className, 
  disabled, 
  type = 'button', 
  href,
  color = 'emerald'
}: Props) {
  const colorClasses = {
    emerald: 'bg-gradient-to-b from-emerald-700 to-emerald-800 disabled:from-slate-600 disabled:to-slate-700',
    blue: 'bg-gradient-to-b from-blue-700 to-blue-800 disabled:from-slate-600 disabled:to-slate-700',
    green: 'bg-gradient-to-b from-green-700 to-green-800 disabled:from-slate-600 disabled:to-slate-700',
  };

  const commonClasses = `
    ${colorClasses[color]}
    text-white font-bold italic px-6 py-2 rounded-full shadow-lg 
    transition-all duration-300 transform 
    disabled:transform-none disabled:cursor-not-allowed disabled:text-slate-400
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
