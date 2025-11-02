// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function Home() {
  const [firestoreStatus, setFirestoreStatus] = useState('Firestore接続確認中...');
  const [storageStatus, setStorageStatus] = useState('Storage接続確認中...');

  useEffect(() => {
    const testFirebase = async () => {
      // Firestore テスト
      try {
        await addDoc(collection(db, 'test'), {
          message: 'Hello from minkui!',
          timestamp: new Date(),
        });
        setFirestoreStatus('✅ Firestore接続成功！');
      } catch (error) {
        console.error('Firestore接続エラー:', error);
        setFirestoreStatus('❌ Firestore接続失敗');
      }

      // Storage テスト
      try {
        const testRef = ref(storage, 'test/hello.txt');
        await uploadString(testRef, 'Hello from Storage!');
        const url = await getDownloadURL(testRef);
        console.log('Storage URL:', url);
        setStorageStatus('✅ Storage接続成功！');
      } catch (error) {
        console.error('Storage接続エラー:', error);
        setStorageStatus('❌ Storage接続失敗');
      }
    };

    testFirebase();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">みんクイ 開発環境</h1>
      <div className="space-y-4">
        <p className="text-xl">{firestoreStatus}</p>
        <p className="text-xl">{storageStatus}</p>
      </div>
    </main>
  );
}