#!/bin/bash
# Configuration helper library for Telegram plugin hooks
# Provides config file discovery matching MCP server behavior

# Get configuration file path with project-specific support
get_config_path() {
  # Try project-specific config first
  if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
    local project_config="${CLAUDE_PROJECT_DIR}/.claude/telegram.local.md"
    if [ -f "$project_config" ]; then
      echo "$project_config"
      return 0
    fi
  fi

  # Fall back to global config
  local global_config="$HOME/.claude/telegram.local.md"
  if [ -f "$global_config" ]; then
    echo "$global_config"
    return 0
  fi

  # No config found
  return 1
}

# Check if jq is available and warn if missing
check_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "{
      \"continue\": true,
      \"suppressOutput\": false,
      \"systemMessage\": \"[Telegram Plugin Warning] jq command not found. Telegram notifications will not work. Install jq: brew install jq (macOS) or apt install jq (Linux)\"
    }"
    return 1
  fi
  return 0
}

# Get a boolean config value with fallback
get_bool_config() {
  local config_file="$1"
  local key_path="$2"
  local default="${3:-false}"

  if [ ! -f "$config_file" ]; then
    echo "$default"
    return
  fi

  # Parse YAML using grep (basic parser for simple structure)
  local value
  value=$(grep -A 10 "notifications:" "$config_file" 2>/dev/null | grep "${key_path}:" | head -n 1 | grep -o "true\|false" 2>/dev/null || echo "$default")
  echo "$value"
}

# Send message to Telegram via Bot API
# Usage: send_telegram_message "message text" "chat_id" "bot_token"
send_telegram_message() {
  local message="$1"
  local chat_id="$2"
  local bot_token="$3"

  # Expand escape sequences (like \n) first
  local expanded_message
  expanded_message=$(echo -e "$message")

  # Escape HTML special characters FIRST (before adding HTML tags)
  local escaped_message
  escaped_message=$(echo "$expanded_message" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g')

  # Convert Markdown to HTML (this adds real HTML tags that won't be escaped)
  # Bold: *text* -> <b>text</b>
  local html_message
  html_message=$(echo "$escaped_message" | sed -E 's/\*([^*]+)\*/<b>\1<\/b>/g')

  # Italic: _text_ -> <i>text</i>
  html_message=$(echo "$html_message" | sed -E 's/_([^_]+)_/<i>\1<\/i>/g')

  # Code: `text` -> <code>text</code>
  html_message=$(echo "$html_message" | sed -E 's/`([^`]+)`/<code>\1<\/code>/g')

  # Send via Telegram Bot API
  local api_url="https://api.telegram.org/bot${bot_token}/sendMessage"

  # Use jq to properly construct JSON payload (handles escaping automatically)
  local json_payload
  json_payload=$(jq -n \
    --arg chat_id "$chat_id" \
    --arg text "$html_message" \
    '{chat_id: $chat_id, text: $text, parse_mode: "HTML"}')

  # Use curl to send the message
  local response
  response=$(curl -s -X POST "$api_url" \
    -H "Content-Type: application/json" \
    -d "$json_payload" 2>&1)

  # Check if successful
  if echo "$response" | jq -e '.ok == true' >/dev/null 2>&1; then
    return 0
  else
    # Log error but don't fail the hook
    echo "[Telegram] Send failed:" >&2
    echo "$response" >&2
    echo "" >&2
    echo "JSON payload was:" >&2
    echo "$json_payload" >&2
    return 1
  fi
}

# Get config value from YAML frontmatter
# Usage: get_config_value "file" "key"
get_config_value() {
  local config_file="$1"
  local key="$2"

  if [ ! -f "$config_file" ]; then
    echo ""
    return 1
  fi

  # Extract ONLY the first YAML frontmatter block (lines between first --- and second ---)
  local yaml_content
  yaml_content=$(awk '/^---$/{if(++n==1)next; if(n==2)exit} n==1' "$config_file")

  # Get value for key (first occurrence only)
  local value
  value=$(echo "$yaml_content" | grep "^${key}:" | head -n 1 | cut -d':' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr -d '"' | tr -d "'")

  echo "$value"
}

# Export functions for use in other scripts
export -f get_config_path
export -f check_jq
export -f get_bool_config
export -f send_telegram_message
export -f get_config_value
