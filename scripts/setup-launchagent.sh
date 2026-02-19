#!/bin/bash
# macOS LaunchAgent セットアップスクリプト
# このスクリプトをプロジェクトルートから実行してください
# 使い方: bash scripts/setup-launchagent.sh

set -e

INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_PATH="$(which node)"
PLIST_DEST="$HOME/Library/LaunchAgents/com.discord-claude-bridge.plist"

echo "=== Discord Claude Bridge LaunchAgent セットアップ ==="
echo "インストールディレクトリ: $INSTALL_DIR"
echo "nodeパス: $NODE_PATH"

# plistを生成
sed \
  -e "s|__INSTALL_DIR__|$INSTALL_DIR|g" \
  -e "s|__NODE_PATH__|$NODE_PATH|g" \
  "$INSTALL_DIR/com.discord-claude-bridge.plist.template" \
  > "$INSTALL_DIR/com.discord-claude-bridge.plist"

echo "✓ plist生成: $INSTALL_DIR/com.discord-claude-bridge.plist"

# logsディレクトリ作成
mkdir -p "$INSTALL_DIR/logs"
echo "✓ logsディレクトリ確認"

# シンボリックリンク作成
mkdir -p "$HOME/Library/LaunchAgents"
ln -sf "$INSTALL_DIR/com.discord-claude-bridge.plist" "$PLIST_DEST"
echo "✓ シンボリックリンク作成: $PLIST_DEST"

echo ""
echo "=== 次のステップ ==="
echo "1. DISCORD_TOKEN を launchctl に設定してください:"
echo "   launchctl setenv DISCORD_TOKEN \"your-discord-bot-token\""
echo ""
echo "2. LaunchAgent を読み込んでください:"
echo "   launchctl load $PLIST_DEST"
echo ""
echo "3. 状態確認:"
echo "   launchctl list | grep discord-claude-bridge"
echo "   tail -f $INSTALL_DIR/logs/stdout.log"
