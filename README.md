# Slack Emoji Renderer

Slackワークスペースの絵文字を取得し、ブラウザ上で `:emoji:` 文字列を絵文字に置換するChrome拡張機能です。

## 機能

- Slack APIから絵文字データを取得
- ウェブページ内の `:emoji:` パターンを検出し、対応する絵文字画像に置換
- 拡張機能のON/OFF切り替え
- 設定画面でSlack APIトークンを管理

## インストール方法

1. Chrome拡張機能の管理画面を開く（`chrome://extensions/`）
2. 「デベロッパー モード」を有効にする
3. `slack-emoji-renderer.zip`を解凍
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. 解凍したフォルダを選択

## 使用方法

1. Slack API トークンを取得
   - Slack APIの[Your Apps](https://api.slack.com/apps)ページにアクセス
   - 新しいアプリを作成、または既存のアプリを選択
   - 「OAuth & Permissions」セクションで`emoji:read`スコープを追加
   - Bot User OAuth Tokenを取得

2. 拡張機能を設定
   - 拡張機能のアイコンをクリック
   - 取得したSlack APIトークンを入力
   - 「設定を保存」をクリック
   - 「絵文字を取得」をクリック

3. 使用開始
   - 任意のウェブサイトで `:emoji_name:` と入力
   - 対応する絵文字がある場合、自動的に絵文字画像に置換されます

## 開発

### 必要な環境

- Node.js 16+
- Yarn

### セットアップ

```bash
yarn install
```

### ビルド

```bash
yarn build
```

### 型チェック

```bash
yarn type-check
```

### パッケージ化

```bash
yarn package
```

### 開発モード

```bash
yarn dev
```

## 技術スタック

- TypeScript
- Chrome Extensions API
- Slack API

## ライセンス

MIT