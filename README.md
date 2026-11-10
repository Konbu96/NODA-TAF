# 野田陸上部アプリ（NODA-TAF）

野田学園 陸上競技部のための、スマホ向け Web アプリです。
設計資料は [docs/](docs/) にあります。

## 今の状態

- 画面と動きは Step 1〜5 までひととおり作ってあります。
- `.env.local` に Firebase の設定があれば **本番**（メールアドレスとパスワードでログイン・Firestore に保存）で動きます。
- 設定がないとき、または `.env.local` に `NEXT_PUBLIC_DEMO=1` を書いたときは **お試し版** で動きます。データはこのブラウザの中だけに保存され、ログインはお試し用のアカウントを選ぶ画面になります。

まだ作っていないもの（サーバーが必要なもの）

- 振り返りのスプレッドシートへの自動書き込みと共有
- スマホへの通知
- 部員を消したときに、その人の振り返りもまとめて消す処理

## Firebase の準備

1. `.env.local` に Firebase の Web アプリの設定を書く（`NEXT_PUBLIC_FIREBASE_API_KEY` など。GitHub には上がらない）
2. Firebase の画面で Authentication の「メール / パスワード」を有効にし、Firestore のデータベースを作る
3. [firestore.rules](firestore.rules) の中身を、Firestore の「ルール」に貼り付けて公開する
4. 最初の 1 人（開発者）は、アプリで入部申請をしたあと、Firestore の画面で自分の `members` のドキュメントの `status` を `approved`、`isAdmin` を `true` に直す

## 動かし方

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。スマホの幅で見ると本番に近くなります。

## ファイルの場所

| 場所 | 中身 |
| --- | --- |
| `src/app/` | 画面（URL ごとに 1 つのフォルダ） |
| `src/components/` | いくつかの画面で使う部品（ヘッダー・丸ボタン・下から出る画面など） |
| `src/lib/store.ts` | データの読み書き（画面から使う） |
| `src/lib/firebase.ts` | Firebase とのやりとり（ログイン・Firestore の読み書き） |
| `firestore.rules` | Firestore のセキュリティルール（だれが何を読めて、何を書けるか） |
| `src/lib/seed.ts` | お試し用のデータ |
| `src/lib/marks.ts` | 種目の一覧と、記録の書き方（1148 → 11.48 など） |
| `src/lib/permissions.ts` | 役職ごとにできること |
