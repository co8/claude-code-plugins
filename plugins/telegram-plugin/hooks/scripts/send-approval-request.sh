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
  # Config not found, allow normal flow
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
}

# Extract tool input (AskUserQuestion parameters)
tool_input=$(echo "$input" | jq -r '.tool_input // "{}"' 2>/dev/null)
if [ -z "$tool_input" ] || [ "$tool_input" = "null" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

questions=$(echo "$tool_input" | jq -r '.questions // []' 2>/dev/null)

if [ "$(echo "$questions" | jq 'length' 2>/dev/null || echo "0")" -eq 0 ]; then
  # No questions, allow normal flow
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# This hook informs Claude that an approval request should be sent
# The actual MCP tool call will be made by Claude based on this system message

first_question=$(echo "$questions" | jq -r '.[0]' 2>/dev/null)
question_text=$(echo "$first_question" | jq -r '.question' 2>/dev/null || echo "")
header=$(echo "$first_question" | jq -r '.header' 2>/dev/null || echo "")

if [ -z "$question_text" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

echo "{
  \"continue\": true,
  \"suppressOutput\": false,
  \"systemMessage\": \"[Telegram Plugin] AskUserQuestion detected. Consider using send_approval_request MCP tool to send this question to Telegram with inline keyboard options. Question: '$question_text' (Header: '$header'). Then use poll_response to wait for the user's Telegram response.\"
}"

exit 0
