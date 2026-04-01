// app/room/[roomId]/ChoiceGrid.tsx
'use client';

// bgを /20 に引き上げ、borderの色もより明るい番号（400）に変更して「発光感」を出しました
const CHOICE_COLORS = [
  { bg: 'bg-blue-600/70', border: 'border-blue-400/60', active: 'from-blue-400 to-blue-700', ring: 'ring-blue-400/50', text: 'text-slate-100', icon: 'text-blue-600' },
  { bg: 'bg-red-600/60', border: 'border-red-400/60', active: 'from-red-500 to-red-700', ring: 'ring-red-400/50', text: 'text-slate-100', icon: 'text-red-600' },
  { bg: 'bg-green-600/60', border: 'border-green-400/60', active: 'from-emerald-500 to-emerald-700', ring: 'ring-emerald-400/50', text: 'text-slate-100', icon: 'text-emerald-600' },
  { bg: 'bg-yellow-600/70', border: 'border-yellow-400/60', active: 'from-yellow-500 to-yellow-700', ring: 'ring-yellow-400/50', text: 'text-slate-100', icon: 'text-yellow-600' },
];

interface ChoiceGridProps {
  choices: string[];
  selectedAnswer: number | null;
  onSelect: (index: number) => void;
  useScreenMode: boolean;
  disabled?: boolean;
  correctAnswer?: number | null;
  showResults?: boolean;
}

export function ChoiceGrid({
  choices,
  selectedAnswer,
  onSelect,
  useScreenMode,
  disabled = false,
  correctAnswer = null,
  showResults = false,
}: ChoiceGridProps) {
  return (
    <div className="grid gap-4 grid-cols-2">
      {choices.map((choice, index) => {
        const isCorrect = correctAnswer === index;
        const color = CHOICE_COLORS[index] || CHOICE_COLORS[0];
        const isSelected = selectedAnswer === index;
        const isActive = isSelected || (showResults && isCorrect);
        
        return (
          <button
            key={index}
            onClick={() => !disabled && onSelect(index)}
            disabled={disabled}
            className={`
              relative rounded-2xl border-2 transition-all duration-300 font-bold text-lg flex flex-col items-center justify-center overflow-hidden
              ${useScreenMode ? 'p-4 min-h-[24svh] sm:min-h-[220px]' : 'p-6 min-h-[120px]'}
              ${isActive
                ? `bg-gradient-to-br ${color.active} text-white z-10 scale-[1.02] border-white/20 shadow-2xl`
                : `${color.bg} ${color.border} ${color.text}`
              }
              ${showResults 
                ? isCorrect 
                  ? `ring-2 ring-offset-2 ring-offset-slate-950 ${color.ring}` 
                  : 'opacity-50 grayscale-[0.2]'
                : ''
              }
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}
            `}
          >
            {/* 選択時のみ内側にわずかな光沢を追加 */}
            {isActive && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}

            {useScreenMode ? (
              <div className="text-6xl sm:text-7xl font-black font-mono leading-none">{index + 1}</div>
            ) : (
              <>
                <div className={`text-xs font-mono mb-2 ${isActive ? 'text-white/60' : 'opacity-50'}`}>
                  {index + 1}
                </div>
                <div className="break-words text-center px-2 relative z-10">
                  {choice}
                </div>
              </>
            )}

            {showResults && isCorrect && (
              <div className={`absolute top-3 right-3 bg-white ${color.icon} rounded-full w-7 h-7 flex items-center justify-center text-lg shadow-xl z-20 animate-in zoom-in duration-300`}>
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}