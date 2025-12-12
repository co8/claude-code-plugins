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

# Check if bidirectional communication is enabled
bidirectional=$(get_bool_config "$CONFIG_FILE" "bidirectional_communication" "false")

if [ "$bidirectional" != "true" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Instruct Claude to automatically check for pending Telegram messages and respond
# This ensures Claude proactively processes incoming messages without manual prompting
echo "{
  \"continue\": true,
  \"suppressOutput\": false,
  \"systemMessage\": \"IMPORTANT: Before responding to the user, first check for any incoming Telegram messages by calling the get_pending_commands MCP tool. If there are pending messages, read them and send appropriate responses back to Telegram using the send_message MCP tool. Then proceed with the user's current request.\"
}"

exit 0
