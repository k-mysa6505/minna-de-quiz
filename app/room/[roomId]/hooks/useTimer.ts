// app/room/[roomId]/useTimer.ts
'use client';

import { useState, useEffect } from 'react';

export function useTimer(startedAt: unknown, timeLimit: number, isActive: boolean) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (timeLimit < 0 || !isActive || !startedAt) {
      setRemainingSeconds(0);
      return;
    }

    // toMillis logic
    const toMillis = (value: any): number => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      if (typeof value.toMillis === 'function') return value.toMillis();
      if (typeof value.toDate === 'function') return value.toDate().getTime();
      return 0;
    };

    const startedAtMs = toMillis(startedAt);
    if (startedAtMs <= 0) {
      return;
    }

    const tick = () => {
      const deadlineMs = startedAtMs + timeLimit * 1000;
      const remainMs = Math.max(0, deadlineMs - Date.now());
      setRemainingSeconds(Math.ceil(remainMs / 1000));
    };

    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [startedAt, timeLimit, isActive]);

  return remainingSeconds;
}
