// app/room/[roomId]/QuestionCard.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import ImageModal from '@/app/common/ImageModal';

interface QuestionCardProps {
  text: string;
  imageUrl?: string | null;
  useScreenMode: boolean;
}

export function QuestionCard({ text, imageUrl, useScreenMode }: QuestionCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <div className="w-full bg-slate-700/30 rounded p-4 relative group">
          <div 
            className="cursor-zoom-in relative overflow-hidden rounded transition-all duration-300 hover:ring-2 hover:ring-emerald-500/50"
            onClick={() => setIsModalOpen(true)}
          >
            <Image
              src={imageUrl}
              alt="Question"
              width={1200}
              height={800}
              className="max-w-full rounded mx-auto transition-transform duration-500 group-hover:scale-[1.02]"
              priority={true}
            />
            {/* タップを促すヒント（モバイル向け） */}
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              タップで拡大
            </div>
          </div>
          
          <ImageModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            imageUrl={imageUrl} 
            alt={text}
          />
        </div>
      )}
    </div>
  );
}
