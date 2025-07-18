# Slack Emoji Renderer :sparkles:

> :wave: Slackの絵文字をどこでも使おう！ブラウザ上で `:emoji:` を魔法のように絵文字に変換するChrome拡張機能です :magic_wand:

## :rocket: なにこれ？

「あ〜、この投稿に `:iikanji:` つけたいのに、ここSlackじゃないから使えない...」

そんな悩みを解決！あなたのSlackワークスペースの絵文字を、**どんなWebサイトでも**使えるようにする魔法の拡張機能です :star2:

## :tada: できること

- :inbox_tray: **Slack APIから絵文字データを取得** - あなたのワークスペースの絵文字をまるごとお持ち帰り
- :arrows_counterclockwise: **瞬間絵文字変換** - `:emoji:` パターンを見つけて、サクッと絵文字画像に置換
- :mag: **超スマートサジェスト** - `:` を入力した瞬間、候補がポップアップ！まるでSlackにいるみたい
- :brain: **天才的ファジー検索** - `:tbnugk:` って打っても `:tabunugoku:` を見つけちゃう賢さ
- :keyboard: **キーボード忍者モード** - 矢印キーで選択、Enterで確定。マウス？知らない子ですね
- :new_moon: **ダークモード完全対応** - 目に優しく、夜更かし開発者の味方
- :electric_plug: **ワンクリックON/OFF** - 邪魔な時はサッと無効化
- :gear: **簡単設定** - APIトークンの管理もお任せあれ

## :wrench: インストール方法

### :construction: 開発版インストール（冒険者向け）

1. :octocat: このリポジトリをクローンまたはダウンロード
2. :package: 依存関係をインストール
   ```bash
   yarn install
   ```
3. :hammer: プロジェクトをビルド
   ```bash
   yarn build
   ```
4. :globe_with_meridians: Chrome拡張機能の管理画面を開く（`chrome://extensions/`）
5. :construction_worker: 「デベロッパー モード」を有効にする
6. :file_folder: 「パッケージ化されていない拡張機能を読み込む」をクリック
7. :dart: ビルドされた `dist` フォルダを選択

## :book: 使い方ガイド

### :key: ステップ1: Slack API トークンをゲット！

1. :link: [Slack API - Your Apps](https://api.slack.com/apps)ページに向かう
2. :new: 新しいアプリを作成、または既存のアプリを選択
3. :lock: 「OAuth & Permissions」セクションで`emoji:read`スコープを追加
4. :ticket: Bot User OAuth Tokenをコピー

### :gear: ステップ2: 拡張機能をセットアップ

1. :point_right: 拡張機能のアイコンをクリック
2. :memo: 取得したSlack APIトークンを入力
3. :floppy_disk: 「設定を保存」をクリック
4. :inbox_tray: 「絵文字を取得」をクリック

### :party: ステップ3: 絵文字ライフを楽しもう！

- :computer: 任意のWebサイトで `:emoji_name:` と入力
- :zap: 対応する絵文字がある場合、魔法のように絵文字画像に変身！
- :bulb: テキスト入力中に `:` を入力するとサジェストが出現
- :video_game: 上下矢印キーで選択、Enterキーで確定！

> :information_source: **プロチップ**: `:iika` と入力するだけで `:iikanji:` が候補に出てくるよ！

## :technologist: 開発者向け情報

### :computer: 必要な環境

- Node.js 16+ :green_circle:
- Yarn :yarn:

### :sparkles: 開発コマンド集

```bash
# :package: セットアップ
yarn install

# :hammer: ビルド
yarn build

# :mag: 型チェック
yarn type-check

# :art: コード整形
yarn format

# :eyes: リアルタイム開発
yarn dev  # ファイル変更を監視
```

### :fire: 開発の流れ

1. :building_construction: `yarn build` でビルド後、Chromeで拡張機能をリロード
2. :watch: または `yarn dev` でファイル変更を監視して爆速開発！

## :toolbox: 技術スタック

- :blue_book: **TypeScript** - 型安全で快適な開発体験
- :chrome: **Chrome Extensions API (Manifest V3)** - 最新の拡張機能仕様
- :slack: **Slack API** - 絵文字データの取得
- :art: **CSS** - ダークモード完全対応の美しいUI
- :eyes: **MutationObserver** - DOM変更をリアルタイム監視
- :brain: **ファジーマッチングアルゴリズム** - 賢い検索機能

## :rocket: 技術的ハイライト

- :star2: **超賢いファジーマッチング** - タイポしても大丈夫！部分文字列で絵文字発見
- :lightning: **瞬間サジェスト** - 入力と同時に候補をリアルタイム表示
- :zap: **パフォーマンス怪物** - WeakSetによる重複処理防止、効率的DOM操作
- :wheelchair: **アクセシビリティ完璧** - キーボードナビゲーション100%対応
- :rainbow: **レスポンシブUI美** - ダークモード自動切替、滑らかアニメーション

## :gift: ライセンス

MIT :heart:

---

> :star: 気に入ったらスターお願いします！ :pray:  
> :bug: バグ報告や機能要望は [Issues](../../issues) まで！  
> :handshake: プルリクエストも大歓迎です！