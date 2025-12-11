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
  # Config not found, skip silently
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
}

# Extract notification settings
todo_completions_enabled=$(get_bool_config "$CONFIG_FILE" "todo_completions" "false")

if [ "$todo_completions_enabled" != "true" ]; then
  # Notifications disabled
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Parse tool input to check for completed todos
tool_input=$(echo "$input" | jq -r '.tool_input // "{}"' 2>/dev/null)
if [ -z "$tool_input" ] || [ "$tool_input" = "null" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

todos=$(echo "$tool_input" | jq -r '.todos // []' 2>/dev/null)

# Find completed todos
completed_todos=$(echo "$todos" | jq -r '.[] | select(.status == "completed") | .content' 2>/dev/null || echo "")

if [ -z "$completed_todos" ]; then
  # No completed todos
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Count completed
completed_count=$(echo "$todos" | jq '[.[] | select(.status == "completed")] | length' 2>/dev/null || echo "0")

if [ "$completed_count" -eq 0 ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Format message with emojis, no exclamation points
if [ "$completed_count" -eq 1 ]; then
  message="✅ *Task Completed* 🎯\n\n${completed_todos}"
else
  message="✅ *${completed_count} Tasks Completed* 🎯\n\n${completed_todos}"
fi

# Get project directory for context
project=$(echo "$input" | jq -r '.cwd' 2>/dev/null | xargs basename 2>/dev/null || echo "unknown")

# Get bot token and chat ID from config
bot_token=$(get_config_value "$CONFIG_FILE" "bot_token")
chat_id=$(get_config_value "$CONFIG_FILE" "chat_id")

if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
  # Missing config, just inform Claude
  echo "{
    \"continue\": true,
    \"suppressOutput\": true,
    \"systemMessage\": \"Telegram notification queued: ${completed_count} task(s) completed. Missing bot_token or chat_id in config.\"
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
    \"systemMessage\": \"Telegram notification failed: ${completed_count} task(s) completed but message could not be sent.\"
  }"
fi

exit 0
