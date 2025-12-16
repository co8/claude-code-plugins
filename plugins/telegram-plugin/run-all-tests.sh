#!/bin/bash
# Comprehensive test runner for telegram-plugin
# Runs all automated and manual tests

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Telegram Plugin - Comprehensive Test Suite            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0

# Function to run test section
run_section() {
  local section_name=$1
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$section_name${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Change to plugin directory
cd "$(dirname "$0")"

# 1. Jest Unit Tests
run_section "1. Jest Unit Tests (85 tests)"
cd mcp-server
if npm test 2>&1 | tee /tmp/jest-output.txt | tail -20; then
  JEST_PASSED=$(grep "Tests:.*passed" /tmp/jest-output.txt | grep -o "[0-9]* passed" | cut -d' ' -f1)
  TOTAL_TESTS=$((TOTAL_TESTS + JEST_PASSED))
  PASSED_TESTS=$((PASSED_TESTS + JEST_PASSED))
  echo -e "${GREEN}✅ Jest tests: $JEST_PASSED passed${NC}"
else
  echo -e "${RED}❌ Jest tests failed${NC}"
  exit 1
fi
cd ..

# 2. Bash Hook Tests
run_section "2. Bash Hook Tests (17 tests)"
cd mcp-server
if npm run test:hooks 2>&1 | tee /tmp/hooks-output.txt | tail -20; then
  HOOKS_PASSED=$(grep "Tests passed:" /tmp/hooks-output.txt | grep -o "[0-9]*" | tail -1)
  TOTAL_TESTS=$((TOTAL_TESTS + HOOKS_PASSED))
  PASSED_TESTS=$((PASSED_TESTS + HOOKS_PASSED))
  echo -e "${GREEN}✅ Hook tests: $HOOKS_PASSED passed${NC}"
else
  echo -e "${RED}❌ Hook tests failed${NC}"
  exit 1
fi
cd ..

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Automated Tests: $PASSED_TESTS/$TOTAL_TESTS passed ✅${NC}"
echo ""

# Optional: Bidirectional tests
echo -e "${YELLOW}Optional Manual Tests:${NC}"
echo ""
echo "3. Bidirectional Communication Tests (requires user interaction)"
echo "   Run: cd mcp-server && node test-bidirectional.js"
echo ""
echo "4. MCP Tool Tests (requires Claude Code interface)"
echo "   - start_listener"
echo "   - get_pending_commands"
echo "   - stop_listener"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}All automated tests passed! 🎉${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
