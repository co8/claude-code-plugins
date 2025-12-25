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

# Check if smart detection is enabled
smart_detection=$(get_bool_config "$CONFIG_FILE" "smart_detection" "false")

if [ "$smart_detection" != "true" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Extract notification content
notification_text=$(echo "$input" | jq -r '.notification_text // ""' 2>/dev/null)

if [ -z "$notification_text" ] || [ "$notification_text" = "null" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Pre-compiled keywords regex for efficiency (O6 optimization)
# Using single grep call with early exit on first match
keywords="suggest|recommend|discovered|insight|clarify|important|note|warning|critical|found|identified"

# Check if notification contains any keywords (case-insensitive)
# Run grep once and capture the matched keyword (O6 optimization)
matched_keyword=$(echo "$notification_text" | grep -ioE "$keywords" | head -1)

# If match found (non-empty result), send notification
if [ -n "$matched_keyword" ]; then
  # Output and exit immediately
  cat <<EOF
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "[Telegram Plugin] Smart notification detected (keyword: '$matched_keyword'). Consider using send_message MCP tool to notify user via Telegram."
}
EOF
  exit 0
fi

# No match - fast path
echo '{"continue": true, "suppressOutput": true}'

exit 0
