'use client';

interface RoomIDProps {
  id: string;
  className?: string | '';
}

export const RoomID = ({ id, className }: RoomIDProps) => {
  return (
    <span className={`
      text-2xl font-mono font-bold text-white
      tracking-[0.2em]
      ${className}
    `}>
      {id}
    </span>
  );
};
