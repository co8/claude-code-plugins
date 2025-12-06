#!/bin/bash
set -euo pipefail

# Check dependencies
if ! command -v jq >/dev/null 2>&1; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Read hook input
input=$(cat)

# Load configuration
CONFIG_FILE="$HOME/.claude/telegram.local.md"
if [ ! -f "$CONFIG_FILE" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Check if session events are enabled
# Note: yq not available - using grep fallback for YAML parsing
# If yq is installed, use: session_events=$(yq eval '.notifications.session_events // false' "$CONFIG_FILE")
session_events=$(grep -A 5 "notifications:" "$CONFIG_FILE" | grep "session_events:" | grep -o "true\|false" 2>/dev/null || echo "false")

if [ "$session_events" != "true" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Get project info
project=$(echo "$input" | jq -r '.cwd' 2>/dev/null | xargs basename 2>/dev/null || echo "unknown")
timestamp=$(date "+%H:%M:%S" 2>/dev/null || echo "unknown")

message="🚀 *Claude Code Started*\n\n📁 Project: \`${project}\`\n⏰ Time: ${timestamp}"

# Inform Claude to send notification
echo "{
  \"continue\": true,
  \"suppressOutput\": false,
  \"systemMessage\": \"[Telegram Plugin] Session started. Use send_message tool with priority='low' to send: ${message}\"
}"

exit 0
