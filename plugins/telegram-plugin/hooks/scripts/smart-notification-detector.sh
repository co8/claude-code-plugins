#!/bin/bash
set -euo pipefail

# Check dependencies
if ! command -v jq >/dev/null 2>&1; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Read hook input
input=$(cat)

# Load configuration
CONFIG_FILE="$HOME/.claude/telegram.local.md"
if [ ! -f "$CONFIG_FILE" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Check if smart detection is enabled
# Note: yq not available - using grep fallback for YAML parsing
# If yq is installed, use: smart_detection=$(yq eval '.notifications.smart_detection // false' "$CONFIG_FILE")
smart_detection=$(grep -A 5 "notifications:" "$CONFIG_FILE" | grep "smart_detection:" | grep -o "true\|false" 2>/dev/null || echo "false")

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

# Extract keywords from config (default set)
keywords="suggest|recommend|discovered|insight|clarify|important|note|warning|critical|found|identified"

# Check if notification contains any keywords (case-insensitive)
if echo "$notification_text" | grep -iE "$keywords" > /dev/null 2>&1; then
  # Match found - suggest sending notification
  matched_keyword=$(echo "$notification_text" | grep -ioE "$keywords" 2>/dev/null | head -1 || echo "keyword")

  echo "{
    \"continue\": true,
    \"suppressOutput\": false,
    \"systemMessage\": \"[Telegram Plugin] Smart notification detected (keyword: '$matched_keyword'). Consider using send_message MCP tool to notify user via Telegram.\"
  }"
else
  # No match
  echo '{"continue": true, "suppressOutput": true}'
fi

exit 0
