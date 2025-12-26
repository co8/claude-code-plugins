#!/bin/bash
set -euo pipefail

# Simple hook example
cat <<EOF
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "{{DISPLAY_NAME}} initialized"
}
EOF
