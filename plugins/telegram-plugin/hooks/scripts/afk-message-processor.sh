#!/bin/bash
set -euo pipefail

# AFK Mode Auto-Processing Hook (Stop Hook)
#
# This hook runs after Claude finishes responding. During AFK mode, it checks
# if there are pending Telegram messages and tells Claude to continue processing
# them. This creates an efficient polling loop during AFK sessions.
#
# Token efficiency: Only continues when work exists, minimizes idle token usage.

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

# Check if AFK mode is enabled by reading the state file
AFK_STATE_FILE="${CLAUDE_PLUGIN_ROOT}/.afk-mode.state"

if [ ! -f "$AFK_STATE_FILE" ]; then
  # No state file means AFK mode is not enabled
  exit 0
fi

# Read the AFK state
afk_state=$(cat "$AFK_STATE_FILE" 2>/dev/null || echo '{"enabled": false}')
afk_enabled=$(echo "$afk_state" | jq -r '.enabled // false' 2>/dev/null || echo "false")

if [ "$afk_enabled" != "true" ]; then
  # AFK mode not active, let Claude stop normally
  exit 0
fi

# AFK mode is active - Check if there are pending Telegram messages
# We use the MCP server's listener status via a simple check of the queue
# Note: This requires the MCP server to expose queue status, which it does via get_listener_status

# Try to get pending message count via a simple state file approach
# The MCP server should maintain a .pending-count file for hooks to read
PENDING_COUNT_FILE="${CLAUDE_PLUGIN_ROOT}/.pending-messages-count"

if [ -f "$PENDING_COUNT_FILE" ]; then
  pending_count=$(cat "$PENDING_COUNT_FILE" 2>/dev/null || echo "0")
else
  pending_count="0"
fi

if [ "$pending_count" -gt 0 ]; then
  # There are pending messages - tell Claude to continue processing
  echo '{"decision": "block", "reason": "📱 Processing pending Telegram messages..."}'
  exit 2  # Exit code 2 tells Claude to continue
else
  # No pending messages, let Claude rest
  exit 0
fi
