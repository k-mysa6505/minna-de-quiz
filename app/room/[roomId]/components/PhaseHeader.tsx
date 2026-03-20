// app/room/[roomId]/components/PhaseHeader.tsx
'use client';

import { type Player } from '@/types';

interface PhaseHeaderProps {
  title: string;
  isScreen?: boolean;
}

export function PhaseHeader({
  title,
  isScreen = false,
}: PhaseHeaderProps) {
  return (
    <h2 className={`${isScreen ? 'text-4xl' : 'text-2xl'} font-black italic`}>
      {title}
    </h2>
  );
}
