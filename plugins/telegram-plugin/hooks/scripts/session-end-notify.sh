#!/bin/bash
set -euo pipefail

# Source config helper library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/config-helper.sh"

# Check dependencies
if ! check_jq; then
  cat  # Consume stdin to prevent pipe errors
  exit 0
fi

# Read hook input
input=$(cat)

# Load configuration
CONFIG_FILE=$(get_config_path) || {
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
}

# Check if session events are enabled
session_events=$(get_bool_config "$CONFIG_FILE" "session_events" "false")

if [ "$session_events" != "true" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Get project info
project=$(echo "$input" | jq -r '.cwd' 2>/dev/null | xargs basename 2>/dev/null || echo "unknown")
timestamp=$(date "+%H:%M:%S" 2>/dev/null || echo "unknown")

message="🛑 *Claude Code Stopped* 🏁\n\n📁 Project: \`${project}\`\n⏰ Time: ${timestamp}"

# Get bot token and chat ID from config
bot_token=$(get_config_value "$CONFIG_FILE" "bot_token")
chat_id=$(get_config_value "$CONFIG_FILE" "chat_id")

if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
  # Missing config, just inform Claude
  echo "{
    \"continue\": true,
    \"suppressOutput\": true,
    \"systemMessage\": \"Telegram notification queued: Session ended. Missing bot_token or chat_id in config.\"
  }"
  exit 0
fi

# Actually send the message via Telegram API
if send_telegram_message "$message" "$chat_id" "$bot_token"; then
  # Success - silent continuation
  echo '{"continue": true, "suppressOutput": true}'
else
  # Failed to send, inform Claude
  echo "{
    \"continue\": true,
    \"suppressOutput\": true,
    \"systemMessage\": \"Telegram notification failed: Session ended but message could not be sent.\"
  }"
fi

exit 0
