# discord-claude-bridge

Discord Bot 経由でローカルの [Claude Code](https://claude.ai/code) を操作できる常駐プロセス。

Discord のチャンネルにメッセージを送ると、指定したプロジェクトディレクトリで Claude Code が処理を実行し、結果をそのままチャンネルに返してくれる。外出先からスマホで「このバグ直して」と送って、帰ってきたら直ってる、みたいな使い方ができる。

## デモ

<!-- スクリーンショットをここに追加 -->
<!-- ![demo](docs/demo.png) -->

## 前提条件

| 項目 | 詳細 |
|------|------|
| **Claude Max** または **Claude Pro** | サブスクリプションが必要（API キーは不要、OAuth で認証） |
| **Claude Code CLI** | [claude.ai/code](https://claude.ai/code) からインストール済みであること |
| **Node.js** | 22 LTS |
| **Discord Bot** | Developer Portal で作成（手順は後述） |

> **注意**: Anthropic API キーは不要です。Claude Code CLI が OAuth 認証を行うため、Claude Max/Pro のサブスクリプションがあれば動作します。

## セットアップ

### 1. インストール

```bash
git clone https://github.com/znznzna/discord-claude-bridge.git
cd discord-claude-bridge
npm install
npm run build
```

### 2. Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) で「New Application」
2. **Bot** タブで Bot を作成
3. **Privileged Gateway Intents** → **MESSAGE CONTENT INTENT** を有効化
4. **OAuth2 → URL Generator** で以下を設定:
   - スコープ: `bot`, `applications.commands`
   - Bot パーミッション: `Send Messages`, `Read Message History`, `View Channels`
5. 生成された URL でサーバーに Bot を招待

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集:

```env
DISCORD_TOKEN=your-bot-token-here
DISCORD_APPLICATION_ID=your-application-id-here
```

### 4. 設定ファイルの作成

```bash
cp config/config.yaml.example config/config.yaml
```

`config/config.yaml` を編集（詳細は [設定リファレンス](#設定リファレンス) を参照）:

```yaml
discord:
  guildId: "YOUR_GUILD_ID"

channels:
  "YOUR_CHANNEL_ID":
    directory: "/path/to/your/project"
    permissionMode: "acceptEdits"
    description: "メインプロジェクト"
```

### 5. スラッシュコマンドの登録

```bash
npm run register-commands
```

### 6. 起動確認

```bash
npm run dev
```

Bot がオンラインになれば成功。設定したチャンネルでメッセージを送ってみてください。

## 主な機能

- **チャンネルごとのプロジェクト設定** — チャンネル A は Web フロントエンド、チャンネル B はバックエンド、のように分けられる
- **ストリーミング応答** — 長い処理でも途中経過がリアルタイムで表示される
- **セッション継続** — 同じチャンネル内なら会話履歴を維持。「さっきのやつ修正して」が通じる
- **ツール実行ポリシー** — ファイル読み取りは自動承認、書き込みはログのみ、Bash 実行は承認必要、のように細かく制御可能

## 常駐化（macOS LaunchAgent）

Mac にログインしたら自動で起動するように設定できる。

```bash
bash scripts/setup-launchagent.sh
```

環境変数の設定:

```bash
launchctl setenv DISCORD_TOKEN "your-bot-token"
launchctl setenv DISCORD_APPLICATION_ID "your-application-id"
```

起動:

```bash
launchctl load ~/Library/LaunchAgents/com.discord-claude-bridge.plist
```

停止:

```bash
launchctl unload ~/Library/LaunchAgents/com.discord-claude-bridge.plist
```

ログ確認:

```bash
tail -f /path/to/discord-claude-bridge/logs/stdout.log
tail -f /path/to/discord-claude-bridge/logs/stderr.log
```

## 設定リファレンス

`config/config.yaml` の全項目:

```yaml
discord:
  guildId: "YOUR_GUILD_ID"       # サーバー ID

channels:
  "CHANNEL_ID":                   # チャンネル ID（文字列で指定）
    directory: "/path/to/project" # Claude Code が作業するディレクトリ
    permissionMode: "acceptEdits" # ツール許可モード
    description: "説明"           # チャンネルの用途メモ

toolPolicy:
  autoApprove:                    # 自動承認するツール
    - Read
    - Glob
    - Grep
    - WebSearch
    - WebFetch
  logOnly:                        # 実行するがログに記録するツール
    - Write
    - Edit
    - NotebookEdit
  requireApproval:                # 承認が必要なツール
    - Bash
  approvalTimeoutSec: 300         # 承認待ちタイムアウト（秒）

output:
  streamingIntervalMs: 1500       # ストリーミング更新間隔（ms）
  showStreamingUpdates: true      # ストリーミング中間表示
  showToolSummary: true           # ツール実行サマリー表示

logging:
  level: "info"                   # ログレベル（debug/info/warn/error）
```

### permissionMode の値

| 値 | 動作 |
|----|------|
| `acceptEdits` | ファイル編集を自動承認 |
| `plan` | 計画のみ（実行しない） |
| `bypassPermissions` | すべてのツールを自動承認 |

## コマンド一覧

```bash
npm run dev              # 開発モードで起動
npm run build            # プロダクションビルド
npm test                 # テスト（watch モード）
npm run test:run         # テスト（1回実行）
npm run lint             # 型チェック
npm run register-commands  # Discord スラッシュコマンド登録
```

## Windows での常駐化

LaunchAgent は macOS 専用のため、Windows では以下のいずれかを利用してください:

- **[pm2](https://pm2.io/)** — Node.js プロセスマネージャー。`pm2 start dist/index.js` で起動、`pm2 startup` で自動起動設定
- **Windows タスクスケジューラ** — ログオン時に `node dist/index.js` を実行するタスクを作成
- **[NSSM](https://nssm.cc/)** — Windows サービスとして登録

## ライセンス

MIT
