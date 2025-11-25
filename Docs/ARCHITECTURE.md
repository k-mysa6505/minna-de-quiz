# みんクイ アーキテクチャ設計

## ディレクトリ構造

```
minna-de-quiz/
├── app/                      # Next.js App Router
│   ├── page.tsx             # トップページ（ルーム作成/参加選択）
│   ├── create-room/         # ルーム作成ページ
│   ├── join-room/           # ルーム参加ページ
│   └── room/[roomId]/       # ゲームルーム本体
│
├── components/              # Reactコンポーネント
│   ├── room/               # ルーム関連コンポーネント
│   │   ├── RoomInfo.tsx          # ルーム情報表示
│   │   ├── PlayerList.tsx        # 参加者一覧
│   │   ├── QRCodeDisplay.tsx     # QRコード表示
│   │   └── QRCodeScanner.tsx     # QRコード読み取り
│   │
│   ├── question/           # 問題作成関連
│   │   ├── QuestionForm.tsx      # 問題作成フォーム
│   │   ├── QuestionPreview.tsx   # 問題プレビュー
│   │   └── ImageUploader.tsx     # 画像アップロード
│   │
│   └── game/               # ゲームプレイ関連
│       ├── QuestionDisplay.tsx   # 問題表示
│       ├── AnswerOptions.tsx     # 選択肢
│       ├── PredictionInput.tsx   # 正解者数予想
│       ├── ResultDisplay.tsx     # 結果表示
│       └── ScoreBoard.tsx        # スコアボード
│
├── types/                   # TypeScript型定義
│   ├── index.ts            # 共通型のエクスポート
│   ├── room.ts             # ルーム関連の型
│   ├── player.ts           # プレイヤー関連の型
│   ├── question.ts         # 問題関連の型
│   └── game.ts             # ゲーム進行関連の型
│
├── lib/                     # ライブラリ・ユーティリティ
│   ├── firebase.ts         # Firebase初期化
│   ├── services/           # Firebaseとのやり取り
│   │   ├── roomService.ts        # ルーム管理
│   │   ├── playerService.ts      # プレイヤー管理
│   │   ├── questionService.ts    # 問題管理
│   │   └── gameService.ts        # ゲーム進行管理
│   │
│   └── utils/              # ユーティリティ関数
│       ├── generateRoomId.ts     # ルームID生成
│       ├── qrCode.ts             # QRコード生成
│       └── scoreCalculator.ts    # スコア計算
│
├── hooks/                   # カスタムフック
│   ├── useRoom.ts          # ルーム状態管理
│   ├── usePlayer.ts        # プレイヤー情報管理
│   ├── useGame.ts          # ゲーム進行管理
│   └── useRealtimeSync.ts  # リアルタイム同期
│
└── context/                 # Reactコンテキスト
    ├── RoomContext.tsx     # ルーム全体の状態
    └── GameContext.tsx     # ゲーム進行の状態
```

## データベース設計（Firestore）

### コレクション: `rooms`
各ルームの基本情報を保存

```typescript
{
  roomId: string;           // ルームID（6桁英数字）
  masterId: string;         // ルームマスターのプレイヤーID
  status: 'waiting' | 'creating' | 'playing' | 'finished';
  createdAt: Timestamp;
  maxPlayers: number;       // 最大人数（デフォルト10）
  minPlayers: number;       // 最小人数（デフォルト3）
  isClosed: boolean;        // 新規参加受付終了フラグ
}
```

### サブコレクション: `rooms/{roomId}/players`
参加プレイヤー情報

```typescript
{
  playerId: string;         // 自動生成ID
  nickname: string;         // ニックネーム
  color: string;            // プレイヤー識別用カラー
  isOnline: boolean;        // 接続状態
  isMaster: boolean;        // マスターフラグ
  score: number;            // 現在のスコア
  joinedAt: Timestamp;
}
```

### サブコレクション: `rooms/{roomId}/questions`
作成された問題

```typescript
{
  questionId: string;       // 自動生成ID
  authorId: string;         // 作問者のプレイヤーID
  text: string;             // 問題文
  imageUrl?: string;        // 画像URL（任意）
  choices: string[];        // 選択肢（4つ）
  correctAnswer: number;    // 正解のインデックス（0-3）
  createdAt: Timestamp;
}
```

### サブコレクション: `rooms/{roomId}/gameState`
ゲーム進行状態（単一ドキュメント）

```typescript
{
  currentQuestionIndex: number;  // 現在の問題番号
  questionOrder: string[];       // 問題IDの出題順序（シャッフル済み）
  totalQuestions: number;        // 全問題数
}
```

### サブコレクション: `rooms/{roomId}/answers`
各問題への回答

```typescript
{
  questionId: string;
  playerId: string;
  answer: number;           // 選択した選択肢（0-3）
  isCorrect: boolean;       // 正誤
  answeredAt: Timestamp;
}
```

### サブコレクション: `rooms/{roomId}/predictions`
作問者の予想

```typescript
{
  questionId: string;
  playerId: string;         // 作問者のID
  predictedCount: number;   // 予想した正解者数
  actualCount: number;      // 実際の正解者数
  isCorrect: boolean;       // 予想的中
  submittedAt: Timestamp;
}
```

## リアルタイム同期の設計

Firestore の `onSnapshot` を使用して以下をリアルタイム同期：
- 参加者一覧の更新
- 問題作成状況
- 回答状況
- ゲーム進行状態

## 画面遷移フロー

```
[トップページ] 
    ↓
    ├─ [ルーム作成] → [待機ルーム（マスター）]
    └─ [ルーム参加] → [待機ルーム（参加者）]
           ↓
    [問題作成フェーズ]
           ↓
    [ゲームプレイ]（問題1〜N）
    - 通常プレイヤー: 回答選択
    - 作問者: 正解者数予想
           ↓
    [結果表示]（各問題ごと）
           ↓
    [最終結果]
           ↓
    [もう一度 / 解散]（マスターのみ）
```

## 実装の優先順位（MVP）

### Phase 1: 基本構造
1. 型定義の作成（`types/`）
2. ルームサービスの実装（`lib/services/roomService.ts`）
3. トップページとルーティング

### Phase 2: ルーム機能
1. ルーム作成機能
2. 手動参加機能（ルームID入力）
3. 参加者一覧のリアルタイム表示

### Phase 3: 問題作成
1. 問題作成フォーム（テキストのみ）
2. 作成状況の共有
3. 全員完了の検知

### Phase 4: ゲームプレイ
1. 問題表示
2. 回答選択（通常プレイヤー）
3. 正解者数予想（作問者）
4. 結果表示

### Phase 5: スコアと終了
1. スコア計算と表示
2. 最終結果画面
3. ゲーム終了処理

## 状態管理の方針

- グローバル状態: Context API を使用
  - `RoomContext`: ルーム情報、参加者一覧
  - `GameContext`: ゲーム進行、スコア
- ローカル状態: `useState` で管理
- リアルタイム同期: カスタムフック（`useRealtimeSync`）

## 次のステップ

1. **型定義を作成** (`types/` 配下)
2. **Firebase サービス層を実装** (`lib/services/`)
3. **基本的なページとコンポーネントを作成**
4. **動作確認しながら段階的に機能追加**
