// lib/services/authService.ts
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * 匿名サインインを行う
 * すでにログイン済みの場合はそのユーザーを返す
 */
export async function signInAnonymouslyIfNeeded(): Promise<User> {
    return new Promise((resolve, reject) => {
        // 現在のユーザー状態を確認
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // 購読解除（一度だけでOK）

            if (user) {
                console.log('User already signed in:', user.uid);
                resolve(user);
            } else {
                console.log('Signing in anonymously...');
                signInAnonymously(auth)
                    .then((userCredential) => {
                        console.log('Signed in anonymously:', userCredential.user.uid);
                        resolve(userCredential.user);
                    })
                    .catch((error) => {
                        console.error('Error signing in anonymously:', error);
                        reject(error);
                    });
            }
        });
    });
}

/**
 * 現在のユーザーIDを取得（同期的に取得できた場合）
 * ログインしていない場合はnull
 */
export function getCurrentUserId(): string | null {
    return auth.currentUser?.uid || null;
}
