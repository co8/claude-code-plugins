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

# Suggest Claude check for incoming messages periodically
echo "{
  \"continue\": true,
  \"suppressOutput\": false,
  \"systemMessage\": \"[Telegram Plugin] 📬 Consider checking for incoming Telegram messages using get_pending_commands MCP tool. Users may have sent commands or requests via Telegram.\"
}"

exit 0
