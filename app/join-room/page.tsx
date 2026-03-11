// app/join-room/page.tsx
import { Suspense } from 'react';
import JoinRoomForm from './JoinRoomForm';
import LoadingSpinner from '@/app/common/LoadingSpinner';

export default function JoinRoomPage() {
  return (
    <Suspense fallback={
      <LoadingSpinner message="読み込み中..." />
    }>
      <JoinRoomForm />
    </Suspense>
  );
}
