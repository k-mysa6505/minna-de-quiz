// app/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import { signInAnonymouslyIfNeeded } from '@/lib/services/authService';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // コンポーネントのマウント時に匿名サインインを試行
        signInAnonymouslyIfNeeded()
            .then(() => console.log('Auth initialized'))
            .catch((err) => console.error('Auth initialization failed', err));
    }, []);

    return <>{children}</>;
}
