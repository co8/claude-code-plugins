#!/bin/bash
set -euo pipefail

# Source config helper library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/config-helper.sh"
source "${SCRIPT_DIR}/lib/message-templates.sh"

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

# Extract the command from the hook input
command=$(echo "$input" | jq -r '.arguments.command // ""' 2>/dev/null || echo "")

# Check if this is a git commit command
if ! echo "$command" | grep -qE "git\s+commit"; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Extract commit message from the git commit command
# Handle various git commit formats: -m "message", heredoc, etc.
commit_message=""

# Try to extract message from -m flag
if echo "$command" | grep -qE 'git\s+commit.*-m'; then
  # Extract message between quotes or heredoc
  commit_message=$(echo "$command" | grep -oP '(?<=-m\s")[^"]+' || echo "$command" | grep -oP "(?<=-m\s')[^']+" || echo "")

  # If message is from heredoc, try to extract it
  if [ -z "$commit_message" ] && echo "$command" | grep -q 'cat <<'; then
    commit_message=$(echo "$command" | sed -n '/cat <<.*EOF/,/^EOF$/p' | sed '1d;$d' | head -n 1)
  fi
fi

# If we couldn't extract a message, use a generic one
if [ -z "$commit_message" ]; then
  commit_message="Commit created"
fi

# Get project info
project=$(echo "$input" | jq -r '.cwd' 2>/dev/null | xargs basename 2>/dev/null || echo "unknown")

# Get git commit hash if available
commit_hash=$(git -C "$(echo "$input" | jq -r '.cwd' 2>/dev/null)" rev-parse --short HEAD 2>/dev/null || echo "")

# Build the notification message using template
message=$(template_git_commit "$project" "$commit_message" "$commit_hash")

# Get bot token and chat ID from config
bot_token=$(get_config_value "$CONFIG_FILE" "bot_token")
chat_id=$(get_config_value "$CONFIG_FILE" "chat_id")

if [ -z "$bot_token" ] || [ -z "$chat_id" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Send the notification
if send_telegram_message "$message" "$chat_id" "$bot_token"; then
  echo '{"continue": true, "suppressOutput": true}'
else
  echo '{"continue": true, "suppressOutput": true}'
fi

exit 0
