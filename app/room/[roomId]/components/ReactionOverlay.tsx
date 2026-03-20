'use client';

export interface LocalReactionEffect {
  id: number;
  content: string;
  senderName: string;
  type: 'reaction' | 'message';
  xOffset: number; // -100 to 100 (percentage-like offset from center)
}

interface ReactionOverlayProps {
  effects: LocalReactionEffect[];
}

export function ReactionOverlay({ effects }: ReactionOverlayProps) {
  if (effects.length === 0) return null;

  return (
    <div 
      className="pointer-events-none fixed bottom-28 left-1/2 z-[70] flex w-full -translate-x-1/2 flex-col-reverse items-center h-0 overflow-visible"
    >
      {effects.map((effect) => (
        <div 
          key={effect.id} 
          className="animate-float-up absolute flex flex-col items-center drop-shadow-xl"
          style={{ 
            left: `calc(50% + ${effect.xOffset}px)`,
            transform: 'translateX(-50%)' 
          }}
        >
          <div className="rounded-2xl bg-slate-800/80 px-4 py-2 backdrop-blur-md border border-white/20 shadow-2xl">
            <p className={
              effect.type === 'reaction' 
                ? 'text-4xl leading-none sm:text-5xl' 
                : 'break-words text-sm font-bold text-white sm:text-base'
            }>
              {effect.content}
            </p>
            <p className="mt-1 text-center truncate text-[10px] font-medium text-slate-300 antialiased">
              {effect.senderName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}