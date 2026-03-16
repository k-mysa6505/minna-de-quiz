// app/room/[roomId]/components/ui/ChoiceGrid.tsx
'use client';

const CHOICE_COLORS = [
  {
    bg: 'bg-blue-600/70',
    hover: 'hover:bg-blue-600/80',
    border: 'border-blue-500/70',
    selected: 'bg-blue-500/50 border-blue-400/80',
    text: 'text-white'
  },
  {
    bg: 'bg-red-600/70',
    hover: 'hover:bg-red-600/80',
    border: 'border-red-500/70',
    selected: 'bg-red-500/50 border-red-400/80',
    text: 'text-white'
  },
  {
    bg: 'bg-green-600/70',
    hover: 'hover:bg-green-600/80',
    border: 'border-green-500/70',
    selected: 'bg-green-500/50 border-green-400/80',
    text: 'text-white'
  },
  {
    bg: 'bg-yellow-600/70',
    hover: 'hover:bg-yellow-600/80',
    border: 'border-yellow-500/70',
    selected: 'bg-yellow-500/50 border-yellow-400/80',
    text: 'text-white'
  },
];

interface ChoiceGridProps {
  choices: string[];
  selectedAnswer: number | null;
  onSelect: (index: number) => void;
  useScreenMode: boolean;
  disabled?: boolean;
}

export function ChoiceGrid({
  choices,
  selectedAnswer,
  onSelect,
  useScreenMode,
  disabled = false,
}: ChoiceGridProps) {
  return (
    <div className={`grid gap-3 sm:gap-4 grid-cols-2`}>
      {choices.map((choice, index) => (
        <button
          key={index}
          onClick={() => !disabled && onSelect(index)}
          disabled={disabled}
          className={`
            relative rounded-xl border-4 transition-all duration-200 font-bold text-lg flex flex-col items-center justify-center
            ${useScreenMode ? 'p-4 min-h-[32svh] sm:min-h-[220px]' : 'p-6 min-h-[120px]'}
            ${selectedAnswer === index
              ? `${CHOICE_COLORS[index].selected} ${CHOICE_COLORS[index].border} shadow-2xl scale-105`
              : `${CHOICE_COLORS[index].bg} ${CHOICE_COLORS[index].border} ${!disabled ? CHOICE_COLORS[index].hover : ''} shadow-lg ${!disabled ? 'hover:scale-102' : ''}`
            }
            ${CHOICE_COLORS[index].text}
            ${disabled ? 'cursor-not-allowed' : ''}
          `}
        >
          {useScreenMode ? (
            <div className="text-5xl sm:text-6xl font-black leading-none">{index + 1}</div>
          ) : (
            <>
              <div className="text-sm opacity-80 mb-2">{index + 1}</div>
              <div className="break-words text-center">{choice}</div>
            </>
          )}
          {selectedAnswer === index && (
            <div className="absolute top-2 right-2 text-2xl">✓</div>
          )}
        </button>
      ))}
    </div>
  );
}
