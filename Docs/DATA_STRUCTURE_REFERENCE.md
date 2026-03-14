# みんクイ データ構造リファレンス

フロントエンドで利用する `types/` 配下の公開データ構造（`type` / `interface`）を表形式で整理した一覧です。

## 一覧（公開型）

| 名前 | 種別 | 用途 |
|---|---|---|
| `RoomStatus` | type | ルーム状態 |
| `ScoringMode` | type | 得点方式 |
| `Room` | interface | ルーム本体データ |
| `CreateRoomParams` | interface | ルーム作成入力 |
| `JoinRoomParams` | interface | ルーム参加入力 |
| `PlayerInfo` | interface | プレイヤー基本情報 |
| `Player` | interface | プレイヤー完全情報 |
| `Question` | interface | 問題データ |
| `QuestionFormData` | interface | 問題作成フォームデータ |
| `PlayerQuestionStatus` | interface | プレイヤー別の作問進捗 |
| `QuestionCreationStatus` | interface | 作問進捗の集計 |
| `GameState` | interface | ゲーム進行状態 |
| `Answer` | interface | 回答データ |
| `Prediction` | interface | 正解者数予想データ |
| `PlayerAnswerResult` | interface | 問題結果時の回答者情報 |
| `PlayerScore` | interface | 最終スコア情報 |
| `PredictionResult` | interface | 予想結果情報 |
| `QuestionResult` | interface | 問題ごとの結果 |
| `FinalResult` | interface | 最終結果集計 |

## 列挙系 type

### `RoomStatus`

| 値 | 意味 |
|---|---|
| `'waiting'` | 参加者待ち |
| `'creating'` | 問題作成中 |
| `'playing'` | ゲーム中 |
| `'finished'` | ゲーム終了 |

### `ScoringMode`

| 値 | 意味 |
|---|---|
| `'standard'` | 標準配点 |
| `'firstBonus'` | 1位ボーナス |
| `'rateBonus'` | 正解率ボーナス |

## Room系

### `Room`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `roomId` | `string` | ✅ | ルームID |
| `masterId` | `string` | ✅ | ルームマスターのプレイヤーID |
| `masterNickname` | `string` | ✅ | マスターの表示名 |
| `status` | `RoomStatus` | ✅ | ルーム状態 |
| `createdAt` | `Timestamp` | ✅ | 作成日時 |
| `maxPlayers` | `number` | ✅ | 最大参加人数 |
| `minPlayers` | `number` | ✅ | 最小開始人数 |
| `isClosed` | `boolean` | ✅ | 新規参加受付可否 |
| `description` | `string` | 任意 | ルーム説明 |
| `timeLimit` | `number` | 任意 | 制限時間（秒） |
| `scoringMode` | `ScoringMode` | ✅ | 得点方式 |
| `wrongAnswerPenalty` | `number` | ✅ | 誤答ペナルティ |

### `CreateRoomParams`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `nickname` | `string` | ✅ | 作問者ニックネーム |
| `maxPlayers` | `number` | 任意 | 最大参加人数 |
| `minPlayers` | `number` | 任意 | 最小開始人数 |
| `description` | `string` | 任意 | ルーム説明 |
| `timeLimit` | `number` | 任意 | 制限時間（秒） |
| `scoringMode` | `ScoringMode` | 任意 | 得点方式 |
| `wrongAnswerPenalty` | `number` | 任意 | 誤答ペナルティ |

### `JoinRoomParams`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `roomId` | `string` | ✅ | 参加対象ルームID |
| `nickname` | `string` | ✅ | 参加者ニックネーム |

## Player系

### `PlayerInfo`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `playerId` | `string` | ✅ | プレイヤーID |
| `nickname` | `string` | ✅ | ニックネーム |

### `Player`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `playerId` | `string` | ✅ | プレイヤーID |
| `nickname` | `string` | ✅ | ニックネーム |
| `isOnline` | `boolean` | ✅ | 接続状態 |
| `isMaster` | `boolean` | ✅ | マスターかどうか |
| `score` | `number` | ✅ | 現在スコア |
| `joinedAt` | `Timestamp` | ✅ | 参加日時 |

## Question系

### `Question`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `questionId` | `string` | ✅ | 問題ID |
| `authorId` | `string` | ✅ | 作問者ID |
| `text` | `string` | ✅ | 問題文 |
| `imageUrl` | `string` | 任意 | 画像URL |
| `choices` | `[string, string, string, string]` | ✅ | 4択の選択肢 |
| `correctAnswer` | `0 \| 1 \| 2 \| 3` | ✅ | 正解インデックス |
| `createdAt` | `Timestamp` | ✅ | 作成日時 |

### `QuestionFormData`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `text` | `string` | ✅ | 問題文 |
| `imageUrl` | `string` | 任意 | 画像URL |
| `choices` | `[string, string, string, string]` | ✅ | 4択の選択肢 |
| `correctAnswer` | `0 \| 1 \| 2 \| 3` | ✅ | 正解インデックス |

### `PlayerQuestionStatus`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `playerId` | `string` | ✅ | プレイヤーID |
| `nickname` | `string` | ✅ | ニックネーム |
| `isCreated` | `boolean` | ✅ | 作問完了フラグ |

### `QuestionCreationStatus`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `players` | `PlayerQuestionStatus[]` | ✅ | プレイヤーごとの進捗 |
| `createdCount` | `number` | ✅ | 作成済み問題数 |
| `totalCount` | `number` | ✅ | 対象プレイヤー数 |
| `isAllCreated` | `boolean` | ✅ | 全員作問完了か |

## Game系

### `GameState`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `currentQuestionIndex` | `number` | ✅ | 現在問題インデックス |
| `questionOrder` | `string[]` | ✅ | 出題順の問題ID配列 |
| `totalQuestions` | `number` | ✅ | 全問題数 |
| `playersReady` | `string[]` | 任意 | 問題間の準備完了プレイヤーID |
| `questionStartedAt` | `Timestamp` | 任意 | 現在問題の開始時刻 |

### `Answer`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `questionId` | `string` | ✅ | 問題ID |
| `playerId` | `string` | ✅ | 回答者ID |
| `answer` | `0 \| 1 \| 2 \| 3` | ✅ | 回答インデックス |
| `isCorrect` | `boolean` | ✅ | 正誤 |
| `answeredAt` | `Timestamp` | ✅ | 回答時刻 |

### `Prediction`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `questionId` | `string` | ✅ | 問題ID |
| `playerId` | `string` | ✅ | 予想者（作問者）ID |
| `predictedCount` | `number` | ✅ | 予想正解者数 |
| `actualCount` | `number` | ✅ | 実際の正解者数 |
| `isCorrect` | `boolean` | ✅ | 予想が当たったか |
| `submittedAt` | `Timestamp` | ✅ | 送信時刻 |

### `PlayerAnswerResult`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `playerId` | `string` | ✅ | プレイヤーID |
| `nickname` | `string` | ✅ | ニックネーム |
| `answer` | `0 \| 1 \| 2 \| 3` | ✅ | 回答インデックス |
| `isCorrect` | `boolean` | ✅ | 正誤 |

### `PlayerScore`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `playerId` | `string` | ✅ | プレイヤーID |
| `nickname` | `string` | ✅ | ニックネーム |
| `score` | `number` | ✅ | 総得点 |
| `rank` | `number` | ✅ | 順位 |
| `correctCount` | `number` | ✅ | 回答正解数 |
| `predictionAccuracy` | `number` | ✅ | 予想的中率（0〜1） |

### `PredictionResult`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `playerId` | `string` | ✅ | プレイヤーID |
| `nickname` | `string` | ✅ | ニックネーム |
| `predictedCount` | `number` | ✅ | 予想正解者数 |
| `actualCount` | `number` | ✅ | 実際の正解者数 |
| `isCorrect` | `boolean` | ✅ | 予想一致フラグ |

### `QuestionResult`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `questionId` | `string` | ✅ | 問題ID |
| `correctAnswer` | `0 \| 1 \| 2 \| 3` | ✅ | 正解インデックス |
| `playerAnswers` | `PlayerAnswerResult[]` | ✅ | 各プレイヤーの回答結果 |
| `prediction` | `PredictionResult` | ✅ | 作問者の予想結果 |

### `FinalResult`

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `playerScores` | `PlayerScore[]` | ✅ | プレイヤーごとの最終スコア |
| `statistics.totalQuestions` | `number` | ✅ | 総問題数 |
| `statistics.averageScore` | `number` | ✅ | 平均スコア |
| `statistics.highestScore` | `number` | ✅ | 最高スコア |
| `statistics.lowestScore` | `number` | ✅ | 最低スコア |
| `statistics.mostDifficultQuestion` | `{ questionId: string; correctRate: number }` | 任意 | 最難問情報 |
| `statistics.bestPredictor` | `{ playerId: string; nickname: string; predictionAccuracy: number }` | 任意 | 予想精度最優秀者 |

## 補足

- すべて `types/index.ts` から再エクスポートされます。
- `Timestamp` は `firebase/firestore` の `Timestamp` 型です。