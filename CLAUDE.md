# Discord Claude Bridge

## プロジェクト概要
Discord BotをインターフェースとしてローカルのClaude Codeを操作する常駐プロセス。

## 技術スタック
- TypeScript 5.x + Node.js 22 LTS
- discord.js v14
- @anthropic-ai/claude-agent-sdk
- YAML + zod (設定)
- pino (ロガー)
- vitest (テスト)
- tsup (ビルド)

## コマンド
- `npm run dev` - 開発実行
- `npm run build` - ビルド
- `npm test` - テスト (watch)
- `npm run test:run` - テスト (single run)
- `npm run lint` - 型チェック

## ディレクトリ構成
- `src/discord/` - Discord Bot関連
- `src/claude/` - Claude Agent SDK関連
- `src/session/` - セッション管理
- `src/config/` - 設定管理
- `src/lib/` - 共通ユーティリティ
- `test/` - テスト

## 設計原則
- DRY, YAGNI, TDD
- 各コンポーネントは単一責任
- エラーは握りつぶさず上位に伝播
