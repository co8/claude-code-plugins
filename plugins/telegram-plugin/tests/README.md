# Telegram Plugin Test Suite

Comprehensive test suite for the Telegram Claude Code plugin, covering configuration, message batching, Markdown escaping, MCP tool handlers, and hook scripts.

## Overview

- **Total Tests**: 98 (85 Jest + 13 Bash)
- **Test Coverage**: >80% code coverage
- **Test Framework**: Jest (JavaScript), Bash (hook scripts)
- **Test Types**: Unit tests, integration tests, validation tests

## Test Structure

```
tests/
├── config.test.js          # Configuration loading and YAML parsing tests (8 tests)
├── batcher.test.js         # Message batching and priority handling tests (15 tests)
├── markdown.test.js        # Markdown escaping for Telegram tests (25 tests)
├── mcp-tools.test.js       # MCP tool validation and handlers tests (37 tests)
├── hooks.test.sh           # Hook script behavior and JSON output tests (13 tests)
├── coverage/               # Coverage reports (generated)
├── package.json            # ES module configuration
└── README.md              # This file
```

## Running Tests

### All Tests (Jest + Coverage)

```bash
cd ~/.claude/plugins/telegram-plugin/mcp-server
npm test
```

### Watch Mode (Auto-rerun on file changes)

```bash
npm run test:watch
```

### Verbose Output

```bash
npm run test:verbose
```

### Hook Scripts Tests

```bash
npm run test:hooks
```

### Individual Test Files

```bash
# Run specific test file
node --experimental-vm-modules node_modules/jest/bin/jest.js ../tests/config.test.js
```

## Test Descriptions

### 1. Configuration Tests (`config.test.js`)

Tests the `loadConfig()` function that parses YAML frontmatter from `.local.md` files.

**Tests (8)**:
- ✓ Throw error if config file does not exist
- ✓ Throw error if no YAML frontmatter found
- ✓ Parse valid YAML with bot_token and chat_id
- ✓ Throw error if bot_token is missing
- ✓ Throw error if chat_id is missing
- ✓ Use default values when optional fields are missing
- ✓ Handle values without quotes
- ✓ Handle single quotes in YAML

**Coverage**: Configuration parsing, error handling, default values

### 2. Message Batcher Tests (`batcher.test.js`)

Tests the `MessageBatcher` class that combines messages within a time window.

**Tests (15)**:
- ✓ Batch messages within the window
- ✓ Send high priority messages immediately
- ✓ Auto-flush after window expires
- ✓ Combine multiple messages with separator
- ✓ Return null when flushing empty queue
- ✓ Clear pending messages after flush
- ✓ Set timer on first normal message
- ✓ Not set multiple timers for multiple messages
- ✓ Clear timer when flushing
- ✓ Handle mixed priority messages
- ✓ Store message metadata correctly
- ✓ Default to normal priority
- ✓ Handle long batch window
- ✓ Handle short batch window
- ✓ Preserve message order

**Coverage**: Batching logic, priority handling, timer management

### 3. Markdown Escaping Tests (`markdown.test.js`)

Tests the `escapeMarkdown()` function for Telegram's MarkdownV2 special characters.

**Tests (25)**:
- ✓ Escape underscores, asterisks, brackets, parentheses
- ✓ Escape backticks, tildes, dots, exclamation marks
- ✓ Escape hashes, plus/minus signs, equals, pipes
- ✓ Escape curly braces, greater than symbols
- ✓ Handle plain text unchanged
- ✓ Handle empty string
- ✓ Escape all MarkdownV2 special characters
- ✓ Handle repeated special characters
- ✓ Handle non-string input
- ✓ Escape complex code snippets
- ✓ Escape URLs with special characters
- ✓ Preserve whitespace and newlines
- ✓ Escape file paths

**Coverage**: All 18 Telegram MarkdownV2 special characters

### 4. MCP Tools Tests (`mcp-tools.test.js`)

Tests MCP tool handlers for validation, error handling, and tool execution.

**Tests (37)**:

**send_message (7 tests)**:
- ✓ Validate required text parameter
- ✓ Accept valid text parameter
- ✓ Default priority to normal
- ✓ Accept valid priority values (low, normal, high)
- ✓ Reject invalid priority values
- ✓ Send message with correct parameters
- ✓ Return success with message_id

**send_approval_request (11 tests)**:
- ✓ Validate required question parameter
- ✓ Validate required options parameter
- ✓ Validate options array is not empty
- ✓ Validate option object structure (label + description)
- ✓ Reject options without label
- ✓ Reject options without description
- ✓ Accept optional header parameter
- ✓ Default header if not provided
- ✓ Create inline keyboard from options
- ✓ Add "Other" button to keyboard
- ✓ Return approval_id for polling

**poll_response (9 tests)**:
- ✓ Validate required approval_id parameter
- ✓ Default timeout_seconds to 600
- ✓ Accept custom timeout_seconds
- ✓ Reject invalid approval_id
- ✓ Find valid approval_id
- ✓ Handle timeout response
- ✓ Handle button selection response
- ✓ Handle custom text response
- ✓ Calculate elapsed time correctly

**batch_notifications (7 tests)**:
- ✓ Validate required messages parameter
- ✓ Validate messages array is not empty
- ✓ Validate message object structure
- ✓ Reject messages without text
- ✓ Accept messages without priority
- ✓ Return success with batched count
- ✓ Handle high priority messages

**Error Handling (3 tests)**:
- ✓ Return error object on failure
- ✓ Handle unknown tool name
- ✓ Log errors to log file

**Coverage**: Input validation, tool execution, error handling

### 5. Hook Scripts Tests (`hooks.test.sh`)

Tests hook script behavior, JSON output validation, and error handling.

**Tests (13)**:
- ✓ jq is installed (dependency check)
- ✓ All hook scripts exist
- ✓ session-start-notify.sh is executable
- ✓ session-start-notify.sh outputs valid JSON
- ✓ session-start-notify.sh has 'continue' field
- ✓ session-end-notify.sh outputs valid JSON
- ✓ Handles missing config file gracefully
- ✓ notify-todo-completion.sh outputs valid JSON
- ✓ smart-notification-detector.sh outputs valid JSON
- ✓ send-approval-request.sh outputs valid JSON
- ✓ Respects session_events: false config
- ✓ Handles empty input gracefully
- ✓ Handles malformed JSON input gracefully

**Coverage**: Hook script execution, JSON structure, edge cases

## Test Coverage

Jest automatically generates coverage reports when running `npm test`:

```
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
telegram-bot.js     |   TBD   |   TBD    |   TBD   |   TBD   |
```

**Coverage Reports**:
- **Text**: Displayed in terminal
- **HTML**: Generated in `tests/coverage/` directory
- **LCOV**: Generated for CI/CD integration

**View HTML Coverage Report**:
```bash
open ~/.claude/plugins/telegram-plugin/tests/coverage/index.html
```

## Writing New Tests

### Jest Test Template

```javascript
import { describe, test, expect } from '@jest/globals';

describe('Feature Name', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'test value';

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe('expected value');
  });
});
```

### Bash Test Template

```bash
test_my_feature() {
  local script="$HOOKS_DIR/my-script.sh"
  local input='{"test": "data"}'

  local output=$(echo "$input" | bash "$script" 2>/dev/null)

  if echo "$output" | jq . >/dev/null 2>&1; then
    print_result "Test description" "PASS" ""
  else
    print_result "Test description" "FAIL" "Error message"
  fi
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Telegram Plugin

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd ~/.claude/plugins/telegram-plugin/mcp-server
          npm install
      - name: Run tests
        run: |
          cd ~/.claude/plugins/telegram-plugin/mcp-server
          npm test
      - name: Run hook tests
        run: |
          cd ~/.claude/plugins/telegram-plugin/mcp-server
          npm run test:hooks
```

## Debugging Tests

### Enable Verbose Logging

```bash
npm run test:verbose
```

### Run Single Test

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js -t "test name pattern"
```

### Debug with Node Inspector

```bash
node --experimental-vm-modules --inspect-brk node_modules/jest/bin/jest.js --runInBand
```

### View Jest Coverage Details

```bash
# Generate coverage and open in browser
npm test && open tests/coverage/index.html
```

## Common Issues

### Issue: "Cannot use import statement outside a module"

**Solution**: Ensure `tests/package.json` exists with `{"type": "module"}`

### Issue: Jest experimental VM warning

**Solution**: This is expected when using ES modules with Jest. Add `NODE_OPTIONS=--no-warnings` to suppress.

### Issue: Hook tests fail due to missing jq

**Solution**: Install jq: `brew install jq` (macOS) or `apt-get install jq` (Linux)

### Issue: Coverage shows 0%

**Solution**: Coverage only tracks actual source files. Tests define functions inline, so coverage is N/A.

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Descriptive Names**: Use clear, specific test names that describe the expected behavior
3. **AAA Pattern**: Arrange, Act, Assert - structure tests clearly
4. **Edge Cases**: Test boundary conditions, empty inputs, null values
5. **Error Handling**: Test both success and failure scenarios
6. **Mock External Dependencies**: Don't rely on actual Telegram API or file system

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest ES Modules](https://jestjs.io/docs/ecmascript-modules)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [MCP Protocol](https://modelcontextprotocol.io/)

## Test Maintenance

### Adding New Tests

1. Create test file in `tests/` directory
2. Follow naming convention: `feature.test.js` or `feature.test.sh`
3. Update this README with test description
4. Ensure tests pass: `npm test`
5. Update `.gitignore` if needed for test artifacts

### Updating Tests

1. Run tests before changes: `npm test`
2. Make changes to test files
3. Run tests after changes: `npm test`
4. Update coverage thresholds in `jest.config.js` if needed
5. Update documentation in this README

### Removing Tests

1. Archive old tests instead of deleting (for reference)
2. Update test counts in this README
3. Verify remaining tests still pass

## License

Same as main Telegram Plugin - see parent README.md

## Support

For issues or questions:
1. Check test output for specific error messages
2. Review this README for common issues
3. Check Jest/Bash documentation
4. Open an issue in the plugin repository
