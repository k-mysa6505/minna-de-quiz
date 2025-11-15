// app/join-room/page.tsx
import { Suspense } from 'react';
import JoinRoomForm from './JoinRoomForm';

export default function JoinRoomPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          <div className="text-center">
            <p className="text-white">読み込み中...</p>
          </div>
        </div>
      </main>
    }>
      <JoinRoomForm />
    </Suspense>
  );
}
