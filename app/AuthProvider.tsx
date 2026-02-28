// app/AuthProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { signInAnonymouslyIfNeeded } from '@/lib/services/authService';

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
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
                <div className="text-white text-xl font-semibold">認証中...</div>
            </div>
        );
    }

    return <>{children}</>;
}
