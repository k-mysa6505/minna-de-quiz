// app/AuthProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { signInAnonymouslyIfNeeded } from '@/lib/services/authService';
import LoadingSpinner from '@/app/common/LoadingSpinner';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // コンポーネントのマウント時に匿名サインインを試行
    signInAnonymouslyIfNeeded()
      .then(() => {
        console.log('Auth initialized');
        setIsAuthReady(true);
      })
      .catch((err) => {
        console.error('Auth initialization failed', err);
        setIsAuthReady(true); // エラーでも表示を続行
      });
  }, []);

  // 認証完了まで待機
  if (!isAuthReady) {
    return (
      <LoadingSpinner message="認証中..." />
    );
  }

  return <>{children}</>;
}
