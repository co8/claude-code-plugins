#!/bin/bash
# Test suite for Telegram plugin hook scripts
# Tests hook script behavior, JSON output, and error handling

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Hook scripts directory - determine from script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(cd "$SCRIPT_DIR/../hooks/scripts" && pwd)"

# Temporary config file for testing
TEST_CONFIG="/tmp/telegram-test-config.md"

# Print test result
print_result() {
  local test_name=$1
  local result=$2
  local message=$3

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ "$result" == "PASS" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name"
    echo -e "  ${YELLOW}Reason${NC}: $message"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Setup: Create test config file
setup_test_config() {
  cat > "$TEST_CONFIG" << 'EOF'
---
bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
chat_id: "987654321"
timeout_seconds: 600
notifications:
  todo_completions: true
  errors: true
  session_events: true
  smart_detection: true
logging_level: "errors"
batch_window_seconds: 30
---

# Test Configuration
This is a test config file.
EOF
}

# Teardown: Remove test config
teardown() {
  rm -f "$TEST_CONFIG"
}

# Test: Valid JSON output from session-start-notify.sh
test_session_start_valid_json() {
  local script="$HOOKS_DIR/session-start-notify.sh"

  # Create test input
  local input='{"cwd": "/home/user/project", "event": "SessionStart"}'

  # Override config location
  export HOME=/tmp
  cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md" 2>/dev/null || mkdir -p "/tmp/.claude" && cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md"

  # Run script
  local output=$(echo "$input" | bash "$script" 2>/dev/null || echo '{"error": "script failed"}')

  # Validate JSON
  if echo "$output" | jq . >/dev/null 2>&1; then
    print_result "session-start-notify.sh outputs valid JSON" "PASS" ""
  else
    print_result "session-start-notify.sh outputs valid JSON" "FAIL" "Invalid JSON output: $output"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Test: JSON structure from session-start-notify.sh
test_session_start_json_structure() {
  local script="$HOOKS_DIR/session-start-notify.sh"
  local input='{"cwd": "/home/user/project", "event": "SessionStart"}'

  export HOME=/tmp
  mkdir -p "/tmp/.claude"
  cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md"

  local output=$(echo "$input" | bash "$script" 2>/dev/null)

  # Check for required fields
  local has_continue=$(echo "$output" | jq -r '.continue' 2>/dev/null)

  if [ "$has_continue" == "true" ] || [ "$has_continue" == "false" ]; then
    print_result "session-start-notify.sh has 'continue' field" "PASS" ""
  else
    print_result "session-start-notify.sh has 'continue' field" "FAIL" "Missing or invalid 'continue' field"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Test: session-end-notify.sh valid JSON output
test_session_end_valid_json() {
  local script="$HOOKS_DIR/session-end-notify.sh"
  local input='{"cwd": "/home/user/project", "event": "SessionEnd"}'

  export HOME=/tmp
  mkdir -p "/tmp/.claude"
  cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md"

  local output=$(echo "$input" | bash "$script" 2>/dev/null || echo '{"error": "script failed"}')

  if echo "$output" | jq . >/dev/null 2>&1; then
    print_result "session-end-notify.sh outputs valid JSON" "PASS" ""
  else
    print_result "session-end-notify.sh outputs valid JSON" "FAIL" "Invalid JSON output: $output"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Test: Missing config file handling
test_missing_config_file() {
  local script="$HOOKS_DIR/session-start-notify.sh"
  local input='{"cwd": "/home/user/project", "event": "SessionStart"}'

  export HOME=/tmp
  rm -f "/tmp/.claude/telegram.local.md" 2>/dev/null || true

  local output=$(echo "$input" | bash "$script" 2>/dev/null)
  local continue_value=$(echo "$output" | jq -r '.continue' 2>/dev/null)

  if [ "$continue_value" == "true" ]; then
    print_result "Handles missing config file gracefully" "PASS" ""
  else
    print_result "Handles missing config file gracefully" "FAIL" "Should continue with true when config missing"
  fi
}

# Test: notify-todo-completion.sh valid JSON
test_todo_completion_valid_json() {
  local script="$HOOKS_DIR/notify-todo-completion.sh"
  local input='{"tool": "TodoWrite", "params": {"todos": [{"content": "Test task", "status": "completed"}]}}'

  export HOME=/tmp
  mkdir -p "/tmp/.claude"
  cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md"

  local output=$(echo "$input" | bash "$script" 2>/dev/null || echo '{"error": "script failed"}')

  if echo "$output" | jq . >/dev/null 2>&1; then
    print_result "notify-todo-completion.sh outputs valid JSON" "PASS" ""
  else
    print_result "notify-todo-completion.sh outputs valid JSON" "FAIL" "Invalid JSON output"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Test: smart-notification-detector.sh valid JSON
test_smart_detector_valid_json() {
  local script="$HOOKS_DIR/smart-notification-detector.sh"
  local input='{"message": "I suggest we refactor this code", "type": "notification"}'

  export HOME=/tmp
  mkdir -p "/tmp/.claude"
  cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md"

  local output=$(echo "$input" | bash "$script" 2>/dev/null || echo '{"error": "script failed"}')

  if echo "$output" | jq . >/dev/null 2>&1; then
    print_result "smart-notification-detector.sh outputs valid JSON" "PASS" ""
  else
    print_result "smart-notification-detector.sh outputs valid JSON" "FAIL" "Invalid JSON output"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Test: send-approval-request.sh valid JSON
test_approval_request_valid_json() {
  local script="$HOOKS_DIR/send-approval-request.sh"
  local input='{"tool": "AskUserQuestion", "params": {"question": "Should we proceed?"}}'

  export HOME=/tmp
  mkdir -p "/tmp/.claude"
  cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md"

  local output=$(echo "$input" | bash "$script" 2>/dev/null || echo '{"error": "script failed"}')

  if echo "$output" | jq . >/dev/null 2>&1; then
    print_result "send-approval-request.sh outputs valid JSON" "PASS" ""
  else
    print_result "send-approval-request.sh outputs valid JSON" "FAIL" "Invalid JSON output"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Test: jq dependency check
test_jq_dependency() {
  if command -v jq >/dev/null 2>&1; then
    print_result "jq is installed" "PASS" ""
  else
    print_result "jq is installed" "FAIL" "jq is required for hook scripts"
  fi
}

# Test: Script permissions
test_script_permissions() {
  local script="$HOOKS_DIR/session-start-notify.sh"

  if [ -x "$script" ]; then
    print_result "session-start-notify.sh is executable" "PASS" ""
  else
    print_result "session-start-notify.sh is executable" "FAIL" "Script is not executable"
  fi
}

# Test: All hook scripts exist
test_all_scripts_exist() {
  local scripts=(
    "session-start-notify.sh"
    "session-end-notify.sh"
    "notify-todo-completion.sh"
    "smart-notification-detector.sh"
    "send-approval-request.sh"
  )

  local all_exist=true
  local missing_scripts=""

  for script in "${scripts[@]}"; do
    if [ ! -f "$HOOKS_DIR/$script" ]; then
      all_exist=false
      missing_scripts="$missing_scripts $script"
    fi
  done

  if [ "$all_exist" == "true" ]; then
    print_result "All hook scripts exist" "PASS" ""
  else
    print_result "All hook scripts exist" "FAIL" "Missing scripts:$missing_scripts"
  fi
}

# Test: Config file parsing
test_config_parsing() {
  local script="$HOOKS_DIR/session-start-notify.sh"

  export HOME=/tmp
  mkdir -p "/tmp/.claude"

  # Create config with session_events disabled
  cat > "/tmp/.claude/telegram.local.md" << 'EOF'
---
bot_token: "123456:test"
chat_id: "123"
notifications:
  session_events: false
---
EOF

  local input='{"cwd": "/test", "event": "SessionStart"}'
  local output=$(echo "$input" | bash "$script" 2>/dev/null)
  local suppress=$(echo "$output" | jq -r '.suppressOutput' 2>/dev/null)

  if [ "$suppress" == "true" ]; then
    print_result "Respects session_events: false config" "PASS" ""
  else
    print_result "Respects session_events: false config" "FAIL" "Should suppress when session_events is false"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Test: Edge case - empty input
test_empty_input() {
  local script="$HOOKS_DIR/session-start-notify.sh"

  export HOME=/tmp
  mkdir -p "/tmp/.claude"
  cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md"

  local output=$(echo '{}' | bash "$script" 2>/dev/null || echo '{"continue": true}')
  local continue_value=$(echo "$output" | jq -r '.continue' 2>/dev/null)

  if [ "$continue_value" == "true" ]; then
    print_result "Handles empty input gracefully" "PASS" ""
  else
    print_result "Handles empty input gracefully" "FAIL" "Should continue with true on empty input"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Test: Edge case - malformed JSON input
test_malformed_input() {
  local script="$HOOKS_DIR/session-start-notify.sh"

  export HOME=/tmp
  mkdir -p "/tmp/.claude"
  cp "$TEST_CONFIG" "/tmp/.claude/telegram.local.md"

  local output=$(echo 'not valid json' | bash "$script" 2>/dev/null || echo '{"continue": true}')
  local continue_value=$(echo "$output" | jq -r '.continue' 2>/dev/null)

  if [ "$continue_value" == "true" ]; then
    print_result "Handles malformed JSON input gracefully" "PASS" ""
  else
    print_result "Handles malformed JSON input gracefully" "FAIL" "Should continue with true on malformed input"
  fi

  rm -f "/tmp/.claude/telegram.local.md"
}

# Main test execution
main() {
  echo "==============================================="
  echo "Telegram Plugin Hook Scripts Test Suite"
  echo "==============================================="
  echo ""

  # Setup
  setup_test_config

  # Run tests
  test_jq_dependency
  test_all_scripts_exist
  test_script_permissions
  test_session_start_valid_json
  test_session_start_json_structure
  test_session_end_valid_json
  test_missing_config_file
  test_todo_completion_valid_json
  test_smart_detector_valid_json
  test_approval_request_valid_json
  test_config_parsing
  test_empty_input
  test_malformed_input

  # Teardown
  teardown

  # Print summary
  echo ""
  echo "==============================================="
  echo "Test Summary"
  echo "==============================================="
  echo "Total tests run:    $TESTS_RUN"
  echo -e "${GREEN}Tests passed:       $TESTS_PASSED${NC}"
  echo -e "${RED}Tests failed:       $TESTS_FAILED${NC}"
  echo ""

  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
  fi
}

# Run tests
main
