#!/bin/bash

# Core library for plugin hooks
# Provides common utilities for hook scripts

# JSON output helpers
json_output() {
  local continue="${1:-true}"
  local suppress="${2:-false}"
  local message="${3:-}"

  cat <<EOF
{
  "continue": $continue,
  "suppressOutput": $suppress,
  "systemMessage": "$message"
}
EOF
}

json_success() {
  json_output true false "$1"
}

json_error() {
  json_output true false "[Error] $1"
}

json_suppress() {
  json_output true true ""
}

# Config helpers
get_config_path() {
  if [ -n "$CLAUDE_PROJECT_DIR" ]; then
    local project_config="$CLAUDE_PROJECT_DIR/.claude/{{PLUGIN_NAME}}.local.md"
    if [ -f "$project_config" ]; then
      echo "$project_config"
      return
    fi
  fi

  echo "$HOME/.claude/{{PLUGIN_NAME}}.local.md"
}

# Read config value from YAML frontmatter
get_config_value() {
  local config_file="$1"
  local key="$2"

  if [ ! -f "$config_file" ]; then
    echo ""
    return 1
  fi

  # Extract value from YAML frontmatter
  sed -n '/^---$/,/^---$/p' "$config_file" | \
    grep "^${key}:" | \
    sed "s/^${key}:[[:space:]]*//" | \
    tr -d '"' | \
    head -1
}

# Logging
log_info() {
  echo "[INFO] $1" >&2
}

log_warn() {
  echo "[WARN] $1" >&2
}

log_error() {
  echo "[ERROR] $1" >&2
}
