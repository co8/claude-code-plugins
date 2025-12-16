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

# Check if AFK mode is enabled by reading the state file
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$PLUGIN_ROOT" ]; then
  # Fallback: try to find it relative to script location
  PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi

AFK_STATE_FILE="${PLUGIN_ROOT}/.afk-mode.state"

# If AFK mode is not enabled, skip notification
if [ ! -f "$AFK_STATE_FILE" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Parse JSON state file to check if AFK is enabled
afk_enabled=$(cat "$AFK_STATE_FILE" 2>/dev/null | jq -r '.enabled // false' 2>/dev/null || echo "false")
if [ "$afk_enabled" != "true" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Extract notification settings
todo_completions_enabled=$(get_bool_config "$CONFIG_FILE" "todo_completions" "false")

if [ "$todo_completions_enabled" != "true" ]; then
  # Notifications disabled
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Parse tool input to get todos
tool_input=$(echo "$input" | jq -r '.tool_input // "{}"' 2>/dev/null)
if [ -z "$tool_input" ] || [ "$tool_input" = "null" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

todos=$(echo "$tool_input" | jq -r '.todos // []' 2>/dev/null)

# Check if we have any todos
total_count=$(echo "$todos" | jq 'length' 2>/dev/null || echo "0")
if [ "$total_count" -eq 0 ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Count completed tasks
completed_count=$(echo "$todos" | jq '[.[] | select(.status == "completed")] | length' 2>/dev/null || echo "0")

# Get project directory for message ID tracking
cwd=$(echo "$input" | jq -r '.cwd' 2>/dev/null || echo "$PWD")
message_id_file="${cwd}/.claude/telegram_task_message_id"

# Extract objective from in_progress or first pending task
objective=$(echo "$todos" | jq -r '[.[] | select(.status == "in_progress" or .status == "pending")] | .[0].content // "Complete Tasks"' 2>/dev/null)
# Truncate objective if too long
if [ ${#objective} -gt 40 ]; then
  objective="${objective:0:37}..."
fi
# Escape HTML entities in objective
objective=$(echo "$objective" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g')

# Build task list with styled checkboxes
task_list=""
while IFS= read -r todo_json; do
  status=$(echo "$todo_json" | jq -r '.status')
  content=$(echo "$todo_json" | jq -r '.content')

  # Escape HTML entities in content
  escaped_content=$(echo "$content" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g')

  # Use styled formatting based on status
  if [ "$status" = "completed" ]; then
    # Green checkmark with regular text
    task_list="${task_list}✅ ${escaped_content}\n"
  elif [ "$status" = "in_progress" ]; then
    # Spinner with bold text for current task
    task_list="${task_list}🔄 <b>${escaped_content}</b>\n"
  else
    # Light gray square with italic text for pending
    task_list="${task_list}⬜ <i>${escaped_content}</i>\n"
  fi
done < <(echo "$todos" | jq -c '.[]')

# Format title with progress and objective
title="<b>${completed_count}/${total_count}: ${objective}</b> 🎯"

# Combine title and task list
message="${title}\n\n${task_list}"

# Get bot token and chat ID from config
bot_token=$(get_config_value "$CONFIG_FILE" "bot_token")
chat_id=$(get_config_value "$CONFIG_FILE" "chat_id")

if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
  # Missing config, just inform Claude
  echo "{
    \"continue\": true,
    \"suppressOutput\": true,
    \"systemMessage\": \"Telegram notification queued: ${completed_count}/${total_count} tasks tracked. Missing bot_token or chat_id in config.\"
  }"
  exit 0
fi

# Check if we have an existing message to edit
if [ -f "$message_id_file" ]; then
  message_id=$(cat "$message_id_file")

  # Try to edit the existing message
  if edit_telegram_message "$message" "$chat_id" "$message_id" "$bot_token"; then
    # Success - silent continuation
    echo '{"continue": true, "suppressOutput": true}'
    exit 0
  else
    # Edit failed (maybe message was deleted), try creating a new one
    rm -f "$message_id_file"
  fi
fi

# Send a new message and store the message_id (message is already HTML-formatted)
response=$(curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg chat_id "$chat_id" \
    --arg text "$(echo -e "$message")" \
    '{chat_id: $chat_id, text: $text, parse_mode: "HTML"}')")

# Check if successful and extract message_id
if echo "$response" | jq -e '.ok == true' >/dev/null 2>&1; then
  # Extract and save message_id for future edits
  message_id=$(echo "$response" | jq -r '.result.message_id')

  # Create .claude directory if it doesn't exist
  mkdir -p "$(dirname "$message_id_file")"

  # Save message_id
  echo "$message_id" > "$message_id_file"

  # Success - silent continuation
  echo '{"continue": true, "suppressOutput": true}'
else
  # Failed to send, inform Claude
  echo "{
    \"continue\": true,
    \"suppressOutput\": true,
    \"systemMessage\": \"Telegram notification failed: ${completed_count}/${total_count} tasks tracked but message could not be sent.\"
  }"
fi

exit 0
