#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/core.sh"

# Get configuration
CONFIG_PATH=$(get_config_path)

# TODO: Implement your session start logic here

json_success "{{DISPLAY_NAME}} session started"
