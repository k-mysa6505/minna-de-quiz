// app/room/[roomId]/components/ui/QuestionCard.tsx
'use client';

import Image from 'next/image';

interface QuestionCardProps {
  text: string;
  imageUrl?: string | null;
  useScreenMode: boolean;
}

export function QuestionCard({ text, imageUrl, useScreenMode }: QuestionCardProps) {
  if (useScreenMode) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-center text-slate-300 text-sm sm:text-base font-medium">
          問題はスクリーンに表示中です。スマホでは回答を選んで送信してください。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 space-y-6">
      <h3 className="text-2xl font-bold text-white text-center">{text}</h3>
      {imageUrl && (
        <div className="w-full bg-slate-700/30 rounded p-4">
          <Image
            src={imageUrl}
            alt="Question"
            width={1200}
            height={800}
            className="max-w-full rounded mx-auto"
            priority={true}
          />
        </div>
      )}
    </div>
  );
}
