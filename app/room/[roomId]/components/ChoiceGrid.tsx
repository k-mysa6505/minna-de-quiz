// app/room/[roomId]/ChoiceGrid.tsx
'use client';

const CHOICE_COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/50', active: 'bg-blue-900/40 border-blue-400', text: 'text-blue-400' },
  { bg: 'bg-red-500/10', border: 'border-red-500/50', active: 'bg-red-900/40 border-red-400', text: 'text-red-400' },
  { bg: 'bg-green-500/10', border: 'border-green-500/50', active: 'bg-green-900/40 border-green-400', text: 'text-green-400' },
  { bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', active: 'bg-yellow-900/40 border-yellow-400', text: 'text-yellow-400' },
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
    <div className={`grid gap-3 sm:gap-4 grid-cols-2`}>
      {choices.map((choice, index) => {
        const isCorrect = correctAnswer === index;
        const color = CHOICE_COLORS[index] || CHOICE_COLORS[0];
        const isSelected = selectedAnswer === index;
        
        return (
          <button
            key={index}
            onClick={() => !disabled && onSelect(index)}
            disabled={disabled}
            className={`
              relative rounded-xl border-2 transition-all duration-300 font-bold text-lg flex flex-col items-center justify-center
              ${useScreenMode ? 'p-4 min-h-[32svh] sm:min-h-[220px]' : 'p-6 min-h-[120px]'}
              ${isSelected
                ? `${color.active} text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.02] z-10`
                : `${color.bg} ${color.border} ${color.text} hover:border-white/40`
              }
              ${showResults && !isCorrect ? 'opacity-30 scale-[0.98]' : 'opacity-100'}
              ${showResults && isCorrect ? 'border-emerald-400 bg-emerald-500 !text-white !opacity-100 ring-4 ring-emerald-400/30' : ''}
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {useScreenMode ? (
              <div className="text-5xl sm:text-6xl font-black font-mono leading-none">{index + 1}</div>
            ) : (
              <>
                <div className={`text-xs font-mono mb-2 ${isSelected ? 'text-white/70' : 'opacity-50'}`}>{index + 1}</div>
                <div className="break-words text-center">{choice}</div>
              </>
            )}
            {showResults && isCorrect && (
              <div className="absolute top-2 right-2 text-2xl animate-fade-in text-white">✓</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
