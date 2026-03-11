# みんクイ

Next.js + Firebase で作っているクイズアプリです。

## 開発方針

- 開発時も Firebase Emulator は使わず、ホスト済みの Firebase プロジェクトへ接続します。
- クライアントは `.env.local` に設定した `NEXT_PUBLIC_FIREBASE_*` を使って初期化されます。
- Firebase のルール定義ファイルは `firebase/` 配下で管理します。

## セットアップ

1. `.env.example` をもとに `.env.local` を作成する
2. 利用する Firebase プロジェクトの値を `NEXT_PUBLIC_FIREBASE_*` に設定する
3. 依存関係をインストールする
4. 開発サーバーを起動する

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開くとアプリを確認できます。

## Firebase 関連

- Firebase クライアント初期化: `lib/firebase.ts`
- Firebase CLI 設定: `firebase.json`
- Firestore / Realtime Database / Storage ルール: `firebase/`

ルールを反映する場合:

```bash
npm run firebase:deploy
```

このコマンドは Firestore / Realtime Database / Storage のルールをまとめて反映します。
