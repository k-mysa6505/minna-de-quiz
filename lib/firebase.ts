// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ログ出力（機密情報は隠す）
console.log('Initializing Firebase with config:', {
	...firebaseConfig,
	apiKey: firebaseConfig.apiKey ? '***' : undefined,
});

// Firebaseアプリの初期化（複数回初期化を防ぐ）
let app: FirebaseApp;
try {
	if (getApps().length === 0) {
		app = initializeApp(firebaseConfig);
		console.log('Firebase initialized successfully');
	} else {
		app = getApps()[0];
		console.log('Firebase already initialized, using existing app');
	}
} catch (error) {
	console.error('Firebase initialization error:', error);
	throw error;
}

// 各サービスのインスタンスをエクスポート
export const db: Firestore = getFirestore(app);
export const rtdb: Database = getDatabase(app);
export const storage: FirebaseStorage = getStorage(app);
export const auth: Auth = getAuth(app);
export default app;
