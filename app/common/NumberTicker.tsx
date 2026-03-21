'use client';

import { useEffect, useState } from 'react';

interface NumberTickerProps {
  value: number;
  duration?: number; // ms
  className?: string;
}

export function NumberTicker({ value, duration = 800, className = "" }: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (value - startValue) + startValue);
      
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span className={`font-mono tabular-nums ${className}`}>{displayValue.toLocaleString()}</span>;
}
