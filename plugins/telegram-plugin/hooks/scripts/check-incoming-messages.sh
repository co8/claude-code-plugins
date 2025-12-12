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

# Check if AFK mode is enabled by reading the state file
AFK_STATE_FILE="${CLAUDE_PLUGIN_ROOT}/.afk-mode.state"

if [ ! -f "$AFK_STATE_FILE" ]; then
  # No state file means AFK mode is not enabled
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Read the AFK state
afk_state=$(cat "$AFK_STATE_FILE" 2>/dev/null || echo '{"enabled": false}')
afk_enabled=$(echo "$afk_state" | jq -r '.enabled // false' 2>/dev/null || echo "false")

if [ "$afk_enabled" != "true" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# AFK mode is enabled - Instruct Claude to check for pending Telegram messages
# This ensures Claude proactively processes incoming messages during AFK mode
echo "{
  \"continue\": true,
  \"suppressOutput\": false,
  \"systemMessage\": \"IMPORTANT: AFK mode is active. Before responding to the user, first check for any incoming Telegram messages by calling the get_pending_commands MCP tool. If there are pending messages, read them and send appropriate responses back to Telegram using the send_message MCP tool. Then proceed with the user's current request.\"
}"

exit 0
