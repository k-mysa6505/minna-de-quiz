# みんクイ 開発ガイド

このドキュメントは、あなたが「みんクイ」を実装するための学習ガイドです。

## 📚 学習の進め方

### Phase 1: 基礎理解
1. **型定義の完成** (`types/` ディレクトリ)
   - まずは `TODO` コメントを確認
   - 空のインターフェースを埋める
   - データ構造を理解する

2. **Firebaseの基本を学ぶ**
   - Firestoreのドキュメント・コレクション構造
   - `setDoc`, `getDoc`, `getDocs` の使い方
   - `onSnapshot` によるリアルタイム監視

### Phase 2: サービス層の実装
各サービスファイルの `TODO` を順番に実装していきます。

#### おすすめの実装順序：

1. **`lib/utils/generateRoomId.ts`**（一番簡単）
   - ランダム文字列生成の練習
   - バリデーションロジック

2. **`lib/services/roomService.ts`**
   - `createRoom()`: ルーム作成
   - `getRoom()`: ルーム取得
   - `subscribeToRoom()`: リアルタイム監視

3. **`lib/services/playerService.ts`**
   - `addPlayer()`: プレイヤー追加
   - `getPlayers()`: プレイヤー一覧取得
   - `subscribeToPlayers()`: リアルタイム監視

4. **`lib/services/questionService.ts`**
   - `createQuestion()`: 問題作成
   - `getQuestions()`: 問題取得

5. **`lib/services/gameService.ts`**
   - `initializeGame()`: ゲーム初期化
   - `submitAnswer()`: 回答送信
   - `submitPrediction()`: 予想送信

### Phase 3: UI コンポーネント
サービス層ができたら、UIを作成します。

1. **トップページ** (`app/page.tsx`)
   - ルーム作成ボタン
   - ルーム参加ボタン

2. **ルーム作成ページ** (`app/create-room/page.tsx`)
   - ニックネーム入力
   - ルーム作成ロジック
   - QRコード表示

3. **ルーム参加ページ** (`app/join-room/page.tsx`)
   - ルームID入力
   - ニックネーム入力

4. **ゲームルーム** (`app/room/[roomId]/page.tsx`)
   - 状態に応じた画面切り替え
   - 参加者一覧
   - 問題作成フォーム
   - ゲームプレイ画面

---

## 🔧 実装のヒント

### Firestore の基本操作

#### ドキュメントの作成
```typescript
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const roomRef = doc(db, 'rooms', roomId);
await setDoc(roomRef, {
  roomId,
  masterId,
  status: 'waiting',
  createdAt: Timestamp.now(),
  maxPlayers: 10,
  minPlayers: 3,
  isClosed: false,
});
```

#### ドキュメントの取得
```typescript
import { doc, getDoc } from 'firebase/firestore';

const roomRef = doc(db, 'rooms', roomId);
const roomSnap = await getDoc(roomRef);

if (roomSnap.exists()) {
  const roomData = roomSnap.data();
  // データを使用
}
```

#### サブコレクションへの追加
```typescript
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const playersRef = collection(db, 'rooms', roomId, 'players');
const docRef = await addDoc(playersRef, {
  nickname,
  color: '#FF6B6B',
  isOnline: true,
  isMaster: false,
  score: 0,
  joinedAt: Timestamp.now(),
});

const playerId = docRef.id; // 自動生成されたID
```

#### サブコレクションの取得
```typescript
import { collection, getDocs, query } from 'firebase/firestore';

const playersRef = collection(db, 'rooms', roomId, 'players');
const querySnapshot = await getDocs(query(playersRef));

const players = querySnapshot.docs.map(doc => ({
  playerId: doc.id,
  ...doc.data()
}));
```

#### リアルタイム監視
```typescript
import { doc, onSnapshot } from 'firebase/firestore';

const roomRef = doc(db, 'rooms', roomId);
const unsubscribe = onSnapshot(roomRef, (snapshot) => {
  if (snapshot.exists()) {
    const roomData = snapshot.data();
    callback(roomData);
  }
});

// 監視を停止する場合
return unsubscribe;
```

---

## 🎯 デバッグのコツ

### 1. Firebaseコンソールで確認
- https://console.firebase.google.com/
- Firestoreのデータベースタブで実際のデータを確認
- データ構造が正しいか確認

### 2. console.log を活用
```typescript
console.log('Room created:', roomId);
console.log('Players:', players);
```

### 3. エラーハンドリング
```typescript
try {
  await createRoom(params);
} catch (error) {
  console.error('Error creating room:', error);
  // ユーザーにエラーメッセージを表示
}
```

---

## 📖 学習リソース

### Firebase Firestore
- [公式ドキュメント（日本語）](https://firebase.google.com/docs/firestore?hl=ja)
- [データの追加](https://firebase.google.com/docs/firestore/manage-data/add-data?hl=ja)
- [データの取得](https://firebase.google.com/docs/firestore/query-data/get-data?hl=ja)
- [リアルタイムアップデート](https://firebase.google.com/docs/firestore/query-data/listen?hl=ja)

### Next.js
- [App Router](https://nextjs.org/docs/app)
- [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

### TypeScript
- [公式ハンドブック（日本語）](https://www.typescriptlang.org/ja/docs/handbook/intro.html)

---

## ✅ 実装チェックリスト

### 型定義
- [ ] `types/room.ts` の `CreateRoomParams` を定義
- [ ] `types/room.ts` の `JoinRoomParams` を定義
- [ ] `types/question.ts` の `QuestionCreationStatus` を定義
- [ ] `types/game.ts` の `QuestionResult` を定義
- [ ] `types/game.ts` の `FinalResult` を定義

### ユーティリティ
- [ ] `lib/utils/generateRoomId.ts` の `generateRoomId()` を実装
- [ ] `lib/utils/generateRoomId.ts` の `isValidRoomId()` を実装
- [ ] `lib/utils/qrCode.ts` の各関数を実装
- [ ] `lib/utils/scoreCalculator.ts` の各関数を実装

### roomService
- [ ] `createRoom()` を実装
- [ ] `joinRoom()` を実装
- [ ] `getRoom()` を実装
- [ ] `subscribeToRoom()` を実装
- [ ] `updateRoomStatus()` を実装
- [ ] `startGame()` を実装

### playerService
- [ ] `addPlayer()` を実装
- [ ] `getPlayers()` を実装
- [ ] `subscribeToPlayers()` を実装
- [ ] `updatePlayerOnlineStatus()` を実装
- [ ] `updatePlayerScore()` を実装
- [ ] `isNicknameTaken()` を実装

### questionService
- [ ] `createQuestion()` を実装
- [ ] `getQuestions()` を実装
- [ ] `getQuestion()` を実装
- [ ] `areAllQuestionsCreated()` を実装
- [ ] `getQuestionProgress()` を実装

### gameService
- [ ] `initializeGame()` を実装
- [ ] `getGameState()` を実装
- [ ] `nextQuestion()` を実装
- [ ] `submitAnswer()` を実装
- [ ] `submitPrediction()` を実装
- [ ] `getAnswers()` を実装
- [ ] `getPrediction()` を実装
- [ ] `areAllResponsesSubmitted()` を実装

### ページ・コンポーネント
- [ ] トップページのUI
- [ ] ルーム作成ページ
- [ ] ルーム参加ページ
- [ ] ゲームルームページ
- [ ] 問題作成コンポーネント
- [ ] 問題表示コンポーネント
- [ ] スコアボード

---

## 💡 困ったときは

1. **エラーメッセージを読む**
   - TypeScriptの型エラーは親切に教えてくれる

2. **小さく作って動作確認**
   - いきなり全部作らず、1機能ずつ確認

3. **Firebaseコンソールを見る**
   - データが正しく保存されているか確認

4. **コンソールログで追跡**
   - どこで止まっているか確認

頑張ってください！🚀
