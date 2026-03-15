'use client';

export interface LocalReactionEffect {
  id: number;
  content: string;
  senderName: string;
  type: 'reaction' | 'message';
}

interface ReactionOverlayProps {
  effects: LocalReactionEffect[];
}

export function ReactionOverlay({ effects }: ReactionOverlayProps) {
  if (effects.length === 0) return null;

  return (
    <div 
      className="pointer-events-none fixed bottom-28 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col-reverse items-center gap-2 h-0 overflow-visible"
    >
      {effects.map((effect) => (
        <div 
          key={effect.id} 
          className="animate-float-up flex flex-col items-center drop-shadow-xl"
        >
          <div className="rounded-2xl bg-slate-800/60 px-4 py-2 backdrop-blur-md border border-white/10 shadow-2xl">
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