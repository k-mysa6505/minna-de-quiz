// app/room/[roomId]/components/ReactionTrigger.tsx
'use client';

import { type RefObject } from 'react';

interface ReactionTriggerProps {
  isReactionPanelOpen: boolean;
  setIsReactionPanelOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  reactionPanelRef: RefObject<HTMLDivElement | null>;
  reactionToggleButtonRef: RefObject<HTMLButtonElement | null>;
  handleSendReaction: (type: 'reaction' | 'message', content: string, eventTimestamp: number) => Promise<void>;
  reactionStamps?: string[];
  quickMessages?: string[];
}

function ReactionTriggerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
    >
      <path d="M4 12.5L14.5 8V16.5L4 12.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14.5 10.5V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 13L8.5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.5 9.5C18.6 10.4 19.2 11.6 19.2 12.8C19.2 14 18.6 15.2 17.5 16.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.6 7.8C21.1 9.1 22 10.9 22 12.8C22 14.7 21.1 16.5 19.6 17.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const DEFAULT_REACTION_STAMPS = ['👏', '🔥', '😆', '😱', '🤯', '🎉'];
const DEFAULT_QUICK_MESSAGES = ['難しい！', '天才か？', 'ドボンw', 'いい問題！'];

export function ReactionTrigger({
  isReactionPanelOpen,
  setIsReactionPanelOpen,
  reactionPanelRef,
  reactionToggleButtonRef,
  handleSendReaction,
  reactionStamps = DEFAULT_REACTION_STAMPS,
  quickMessages = DEFAULT_QUICK_MESSAGES,
}: ReactionTriggerProps) {
  return (
    <div className="fixed z-50 [bottom:clamp(0.75rem,2.6vh,1.5rem)] [right:clamp(0.75rem,3.5vw,1.75rem)]">
      {isReactionPanelOpen && (
        <div 
          ref={reactionPanelRef} 
          className="absolute bottom-16 right-0 w-[min(88vw,320px)] origin-bottom-right space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-sm"
        >
          <div className="grid grid-cols-3 gap-2">
            {reactionStamps.map((stamp) => (
              <button
                key={stamp}
                type="button"
                onClick={(event) => handleSendReaction('reaction', stamp, event.timeStamp)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xl leading-none text-slate-100 transition hover:bg-slate-700 active:scale-95"
              >
                {stamp}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickMessages.map((message) => (
              <button
                key={message}
                type="button"
                onClick={(event) => handleSendReaction('message', message, event.timeStamp)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-100 transition hover:bg-slate-700 active:scale-95 sm:text-sm"
              >
                {message}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">送信は1秒に1回までです</p>
        </div>
      )}

      <button
        ref={reactionToggleButtonRef}
        type="button"
        aria-label="リアクションを開く"
        aria-expanded={isReactionPanelOpen}
        onClick={() => setIsReactionPanelOpen((prev) => !prev)}
        className="grid h-14 w-14 place-items-center rounded-full border border-slate-500/70 bg-slate-800/90 text-slate-100 shadow-lg hover:bg-slate-700"
      >
        <span className="block">
          <ReactionTriggerIcon />
        </span>
      </button>
    </div>
  );
}
