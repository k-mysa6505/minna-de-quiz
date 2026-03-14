// app/AuthProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { signInAnonymouslyIfNeeded } from '@/lib/services/authService';
import LoadingSpinner from '@/app/common/LoadingSpinner';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const initAuth = async () => {
      setIsAuthReady(false);
      setAuthError(null);

      // 一時的なネットワーク不安定を考慮して数回リトライする
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await signInAnonymouslyIfNeeded();
          if (isCancelled) {
            return;
          }
          console.log('Auth initialized');
          setIsAuthReady(true);
          return;
        } catch (err) {
          console.error(`Auth initialization failed (attempt ${attempt}/3)`, err);
          if (attempt < 3) {
            await wait(attempt * 700);
          }
        }
      }

      if (!isCancelled) {
        setAuthError('認証に失敗しました。時間をおいて再試行してください。');
      }
    };

    initAuth();

    return () => {
      isCancelled = true;
    };
  }, [retryKey]);

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-4">
          <p className="text-base font-semibold">{authError}</p>
          <p className="text-sm text-gray-600">匿名認証が有効か、Firebase 設定が正しいかを確認してください。</p>
          <button
            type="button"
            onClick={() => setRetryKey((prev) => prev + 1)}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  // 認証完了まで待機
  if (!isAuthReady) {
    return (
      <LoadingSpinner message="認証中..." />
    );
  }

  return <>{children}</>;
}
