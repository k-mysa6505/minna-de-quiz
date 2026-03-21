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

export function PrimaryButton({ 
  children, 
  onClick, 
  className, 
  disabled, 
  type = 'button', 
  href,
}: Props) {
  // geoguessr風
  const commonClasses = `
    bg-gradient-to-b from-[#8DE04B] to-[#4CAF28] disabled:from-slate-500 disabled:to-slate-600
    text-white font-bold italic rounded-full
    disabled:transform-none disabled:cursor-not-allowed disabled:text-slate-300
    inline-flex items-center justify-center
    px-6 pt-2 pb-[0.625rem]
    shadow-[0_0.275rem_1.125rem_rgba(0,0,0,0.25),inset_0_0.0625rem_0_rgba(255,255,255,0.2),inset_0_-0.125rem_0_rgba(0,0,0,0.3)]
    [text-shadow:0_0.0625rem_0.125rem_rgba(40,20,60,0.8)]
    ${className || ''}
  `;

  const motionProps = {
    whileHover: { scale: 1.1, transition: { duration: 0.15 } },
    whileTap: { scale: 0.9 },
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
