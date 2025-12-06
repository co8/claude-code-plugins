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
  # Config not found, skip silently
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Extract notification settings
# Note: yq not available - using grep fallback for YAML parsing
# If yq is installed, use: todo_completions_enabled=$(yq eval '.notifications.todo_completions // false' "$CONFIG_FILE")
todo_completions_enabled=$(grep -A 5 "notifications:" "$CONFIG_FILE" | grep "todo_completions:" | grep -o "true\|false" 2>/dev/null || echo "false")

if [ "$todo_completions_enabled" != "true" ]; then
  # Notifications disabled
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Parse tool input to check for completed todos
tool_input=$(echo "$input" | jq -r '.tool_input // "{}"' 2>/dev/null)
if [ -z "$tool_input" ] || [ "$tool_input" = "null" ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

todos=$(echo "$tool_input" | jq -r '.todos // []' 2>/dev/null)

# Find completed todos
completed_todos=$(echo "$todos" | jq -r '.[] | select(.status == "completed") | .content' 2>/dev/null || echo "")

if [ -z "$completed_todos" ]; then
  # No completed todos
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Count completed
completed_count=$(echo "$todos" | jq '[.[] | select(.status == "completed")] | length' 2>/dev/null || echo "0")

if [ "$completed_count" -eq 0 ]; then
  echo '{"continue": true, "suppressOutput": true}'
  exit 0
fi

# Format message
if [ "$completed_count" -eq 1 ]; then
  message="✅ *Task Completed*\n\n${completed_todos}"
else
  message="✅ *${completed_count} Tasks Completed*\n\n${completed_todos}"
fi

# Get project directory for context
project=$(echo "$input" | jq -r '.cwd' 2>/dev/null | xargs basename 2>/dev/null || echo "unknown")

# Output system message for Claude to handle
echo "{
  \"continue\": true,
  \"suppressOutput\": true,
  \"systemMessage\": \"Telegram notification queued: ${completed_count} task(s) completed. Use send_message tool to notify user.\"
}"

exit 0
