# みんクイ DB関連APIリファレンス

フロントエンドから利用しうる `lib/services` の公開APIを、DBアクセス観点で整理した一覧です。

## 対象

- Firestore
- Realtime Database
- Cloud Storage
- 補足として、同ディレクトリで公開されている非DB純関数も記載

## Room API（`roomService.ts`）

| API | 役割 | 主な引数 | 戻り値 | DB | 操作 |
|---|---|---|---|---|---|
| `createRoom(params)` | ルーム作成＋マスター追加 | `CreateRoomParams` | `{ roomId, playerId }` | Firestore | 作成 |
| `joinRoom(params)` | ルーム参加（プレイヤー追加） | `JoinRoomParams` | `string`（playerId） | Firestore | 読み取り＋作成 |
| `getRoom(roomId)` | ルーム情報取得 | `roomId` | `Room \| null` | Firestore | 読み取り |
| `subscribeToRoom(roomId, callback)` | ルーム情報のリアルタイム監視 | `roomId`, `callback` | `() => void`（購読解除） | Firestore | 監視 |
| `updateRoomStatus(roomId, status)` | ルーム状態更新 | `roomId`, `Room['status']` | `void` | Firestore | 更新 |
| `startGame(roomId)` | 開始可能判定後に `creating` へ遷移 | `roomId` | `void` | Firestore | 読み取り＋更新 |
| `deleteRoom(roomId)` | ルームと全サブコレクション削除（サーバー側実行用） | `roomId` | `void` | Firestore | 削除 |
| `removePlayerFromRoom(roomId, playerId)` | プレイヤー削除 | `roomId`, `playerId` | `number`（残人数） | Firestore | 削除＋読み取り |
| `requestRoomCleanup(roomId)` | ルーム削除判定をサーバーへ依頼 | `roomId` | `void` | Firestore | 更新 |

## Player API（`playerService.ts`）

| API | 役割 | 主な引数 | 戻り値 | DB | 操作 |
|---|---|---|---|---|---|
| `addPlayer(roomId, nickname, isMaster?)` | プレイヤー追加（重複名チェック含む） | `roomId`, `nickname`, `isMaster` | `string`（playerId） | Firestore | 読み取り＋作成 |
| `getPlayers(roomId)` | プレイヤー一覧取得 | `roomId` | `Player[]` | Firestore | 読み取り |
| `subscribeToPlayers(roomId, callback)` | プレイヤー一覧のリアルタイム監視 | `roomId`, `callback` | `() => void`（購読解除） | Firestore | 監視 |
| `updatePlayerOnlineStatus(roomId, playerId, isOnline)` | 接続状態更新 | `roomId`, `playerId`, `isOnline` | `void` | Firestore | 更新 |
| `updatePlayerScore(roomId, playerId, score)` | スコア上書き更新 | `roomId`, `playerId`, `score` | `void` | Firestore | 更新 |
| `isNicknameTaken(roomId, nickname)` | ニックネーム重複判定 | `roomId`, `nickname` | `boolean` | Firestore | 読み取り |

## Question API（`questionService.ts`）

| API | 役割 | 主な引数 | 戻り値 | DB | 操作 |
|---|---|---|---|---|---|
| `createQuestion(roomId, authorId, data)` | 問題作成 | `roomId`, `authorId`, `QuestionFormData` | `string`（questionId） | Firestore | 作成 |
| `getQuestions(roomId)` | 問題一覧取得（作成順） | `roomId` | `Question[]` | Firestore | 読み取り |
| `getQuestion(roomId, questionId)` | 単一問題取得 | `roomId`, `questionId` | `Question \| null` | Firestore | 読み取り |
| `areAllQuestionsCreated(roomId)` | 全員作問完了判定 | `roomId` | `boolean` | Firestore | 読み取り |
| `getQuestionProgress(roomId)` | 作問進捗取得 | `roomId` | `{ created, total }` | Firestore | 読み取り |

## Game API（`gameService.ts`）

| API | 役割 | 主な引数 | 戻り値 | DB | 操作 |
|---|---|---|---|---|---|
| `initializeGame(roomId, questionIds)` | ゲーム状態初期化 | `roomId`, `questionIds` | `void` | Firestore | 作成/上書き |
| `getGameState(roomId)` | ゲーム状態取得 | `roomId` | `GameState \| null` | Firestore | 読み取り |
| `nextQuestion(roomId)` | 次問題へ進行 | `roomId` | `void` | Firestore | 読み取り＋更新 |
| `markPlayerReady(roomId, playerId)` | 問題間の準備完了登録 | `roomId`, `playerId` | `void` | Firestore | 読み取り＋更新 |
| `areAllPlayersReady(roomId)` | 全員準備完了判定 | `roomId` | `boolean` | Firestore | 読み取り |
| `submitAnswer(roomId, questionId, playerId, answer, isCorrect)` | 回答送信 | `roomId`, `questionId`, `playerId`, `answer`, `isCorrect` | `void` | Firestore | 作成 |
| `submitPrediction(roomId, questionId, playerId, predictedCount)` | 予想送信 | `roomId`, `questionId`, `playerId`, `predictedCount` | `void` | Firestore | 作成 |
| `getAnswers(roomId, questionId)` | 問題回答一覧取得 | `roomId`, `questionId` | `Answer[]` | Firestore | 読み取り |
| `getPrediction(roomId, questionId)` | 予想取得 | `roomId`, `questionId` | `Prediction \| null` | Firestore | 読み取り |
| `updatePredictionResult(roomId, questionId, actualCount, isCorrect)` | 予想結果反映 | `roomId`, `questionId`, `actualCount`, `isCorrect` | `void` | Firestore | 読み取り＋更新 |
| `areAllResponsesSubmitted(roomId, questionId)` | 全回答/予想送信完了判定 | `roomId`, `questionId` | `boolean` | Firestore | 読み取り |

## Presence API（`presenceService.ts`）

| API | 役割 | 主な引数 | 戻り値 | DB | 操作 |
|---|---|---|---|---|---|
| `setupPresence(roomId, playerId)` | 接続状態の自動管理（切断検知含む） | `roomId`, `playerId` | `() => void`（クリーンアップ） | Realtime Database + Firestore | 作成/更新 |
| `subscribeToPresence(roomId, playerId, callback)` | 接続状態のリアルタイム購読 | `roomId`, `playerId`, `callback` | `() => void`（購読解除） | Realtime Database | 監視 |

## Score API（`scoreService.ts`）

| API | 役割 | 主な引数 | 戻り値 | DB | 操作 |
|---|---|---|---|---|---|
| `updateAnswerScore(roomId, playerId, isCorrect, correctAnswerCount)` | 回答得点の加算 | `roomId`, `playerId`, `isCorrect`, `correctAnswerCount` | `void` | Firestore | 更新（`increment`） |
| `calculatePredictionScore(predictedCount, actualCount)` | 予想得点を計算（純関数） | `predictedCount`, `actualCount` | `number` | なし | なし |
| `updatePredictionScore(roomId, playerId, points)` | 予想得点の加算 | `roomId`, `playerId`, `points` | `void` | Firestore | 更新（`increment`） |

## Storage API（`storageService.ts`）

| API | 役割 | 主な引数 | 戻り値 | DB | 操作 |
|---|---|---|---|---|---|
| `uploadQuestionImage(roomId, questionId, file)` | 問題画像アップロード | `roomId`, `questionId`, `File` | `string`（downloadURL） | Cloud Storage | 作成 |
| `deleteQuestionImage(imageUrl)` | 画像削除 | `imageUrl` | `void` | Cloud Storage | 削除 |

## 補足

- ここでの「DB関連API」は、`lib/services` で公開されフロントから直接呼び出し可能な関数を対象にしています。
- バリデーションやエラー文言の詳細は各サービス実装（`lib/services/*.ts`）を参照してください。