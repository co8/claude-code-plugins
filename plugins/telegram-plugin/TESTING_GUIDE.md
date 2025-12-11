# Telegram Plugin Testing Guide

## Test Status Summary

**Last Test Run:** December 11, 2025
**Overall Status:** ✅ 98/98 tests passing (100%)

- **Jest Unit Tests:** 85/85 passing ✅
- **Bash Hook Tests:** 13/13 passing ✅
- **Test Duration:** ~2.5 seconds total

### Quick Test Commands

```bash
# Run all tests
cd mcp-server
npm test                 # Jest tests (85 tests)
npm run test:hooks       # Bash tests (13 tests)

# Watch mode
npm run test:watch

# Verbose output
npm run test:verbose
```

## Prerequisites

1. **Plugin Installation**: Ensure telegram-plugin is installed and updated
2. **Configuration**: Valid `~/.claude/telegram.local.md` with bot credentials
3. **MCP Server**: Plugin MCP server must be running
4. **Dependencies**: Node.js 18+, npm packages installed

## Test Categories

### 1. Formatting Tests ✅ PASSING

#### Test HTML Conversion (JavaScript)
```bash
cd mcp-server
node test-html-conversion.js
```

**Expected Output:**
```
✅ PASS: Bold text
✅ PASS: Italic text
✅ PASS: Code text
✅ PASS: Mixed formatting
✅ PASS: Complex message

Results: 5 passed, 0 failed
```

#### Test Bash Helper Formatting
```bash
cd hooks/scripts
./test-bash-formatting.sh
```

**Expected Output:**
```
📤 Sending test message via bash helper...
✅ Message sent successfully
```

**Verify in Telegram:**
- Check bot chat for test message
- Text should be properly formatted (bold, italic, code)
- No asterisks or formatting characters visible

### 2. Basic Messaging Tests ✅ WORKING

#### Send Simple Message
```javascript
await mcp__plugin_telegram-plugin_telegram-bot__send_message({
  text: "Test message",
  priority: "normal"
})
```

#### Send Formatted Message
```javascript
await mcp__plugin_telegram-plugin_telegram-bot__send_message({
  text: "*Bold* and _italic_ and `code`",
  priority: "normal"
})
```

**Verify:** Telegram displays formatted text without raw Markdown

#### Send Priority Message
```javascript
await mcp__plugin_telegram-plugin_telegram-bot__send_message({
  text: "🚨 High priority alert",
  priority: "high"
})
```

**Verify:** Message bypasses batching and sends immediately

### 3. Approval Workflow Tests ✅ WORKING

#### Send Approval Request
```javascript
const result = await mcp__plugin_telegram-plugin_telegram-bot__send_approval_request({
  question: "Which option do you prefer?",
  options: [
    { label: "Option A", description: "First choice" },
    { label: "Option B", description: "Second choice" }
  ]
})

const approval_id = result.approval_id
```

#### Poll for Response
```javascript
const response = await mcp__plugin_telegram-plugin_telegram-bot__poll_response({
  approval_id: approval_id,
  timeout_seconds: 60
})

console.log(`User chose: ${response.choice}`)
```

**Verify:**
- Inline keyboard appears in Telegram
- Button labels display correctly
- Clicking button returns correct choice
- Polling resolves with user's selection

### 4. Bidirectional Communication Tests ⏳ PENDING

**Note:** These tests require the updated plugin with new MCP tools.

#### Prerequisites
1. Enable bidirectional communication in config:
```yaml
---
bidirectional_communication: true
---
```

2. Restart Claude Code to load new MCP tools

#### Test Listener Start/Stop

##### Start Listener
```javascript
const result = await mcp__plugin_telegram-plugin_telegram-bot__start_listener()
```

**Expected:**
```json
{
  "success": true,
  "listening": true,
  "bot_username": "your_bot"
}
```

##### Check Status
```javascript
const status = await mcp__plugin_telegram-plugin_telegram-bot__get_listener_status()
```

**Expected:**
```json
{
  "listening": true,
  "pending_commands": 0,
  "polling_active": true
}
```

##### Stop Listener
```javascript
const result = await mcp__plugin_telegram-plugin_telegram-bot__stop_listener()
```

**Expected:**
```json
{
  "success": true,
  "listening": false,
  "cleared_commands": 0
}
```

#### Test Command Queue

1. **Start listener**
2. **Send message to bot via Telegram** (e.g., "Hello Claude!")
3. **Check for 🤖 emoji reaction** on your message
4. **Retrieve commands:**

```javascript
const result = await mcp__plugin_telegram-plugin_telegram-bot__get_pending_commands({
  limit: 10
})
```

**Expected:**
```json
{
  "commands": [
    {
      "id": 12345,
      "text": "Hello Claude!",
      "from": "username",
      "timestamp": 1702345678000
    }
  ],
  "remaining": 0
}
```

#### Test Multiple Commands Order

1. **Start listener**
2. **Send 3 messages quickly** to bot:
   - "First message"
   - "Second message"
   - "Third message"
3. **Wait for reactions** (🤖 on each)
4. **Retrieve commands:**

```javascript
const result = await mcp__plugin_telegram-plugin_telegram-bot__get_pending_commands({
  limit: 10
})
```

**Verify:**
- All 3 commands received
- Commands in chronological order
- Timestamps increase sequentially

#### Test Unauthorized Chat Rejection

1. **Configure bot with specific chat_id**
2. **Have someone else message the bot** (or use different account)
3. **Check logs:**

```bash
tail -f telegram-plugin/telegram.log
```

**Expected:** Log entry showing unauthorized chat rejection

### 5. Hook Integration Tests ⏳ PENDING

#### Session Start Notification

1. **Enable session_events** in config
2. **Start new Claude Code session**
3. **Check Telegram** for session start message

**Expected Message:**
```
🚀 Claude Code Started 💻

📁 Project: project-name
⏰ Time: HH:MM:SS
```

#### Session End Notification

1. **Stop Claude Code session**
2. **Check Telegram** for session end message

**Expected Message:**
```
🛑 Claude Code Stopped 🏁

📁 Project: project-name
⏰ Time: HH:MM:SS
```

#### Todo Completion Notification

1. **Enable todo_completions** in config
2. **Complete a TodoWrite task** in Claude Code
3. **Check Telegram** for completion notification

**Expected Message:**
```
✅ Task Completed 🎯

Task description here
```

#### UserPromptSubmit Hook

1. **Enable bidirectional_communication**
2. **Submit a prompt** in Claude Code
3. **Hook should check** for incoming Telegram messages

**Verify:**
- Hook runs on every prompt submission
- Checks for pending commands
- Suggests Claude process them if present

### 6. Rate Limiting Tests ⏳ PENDING

#### Test Rate Limiter

```javascript
// Send 35 messages rapidly (exceeds 30/min limit)
for (let i = 0; i < 35; i++) {
  await mcp__plugin_telegram-plugin_telegram-bot__send_message({
    text: `Test message ${i + 1}`,
    priority: "normal"
  })
}
```

**Verify:**
- First 30 messages send quickly
- Messages 31-35 throttled (delayed)
- No Telegram API rate limit errors

### 7. Error Handling Tests ⏳ PENDING

#### Invalid Bot Token
1. Configure with invalid token
2. Try to send message
3. **Verify:** Graceful error message

#### Invalid Chat ID
1. Configure with non-existent chat_id
2. Try to send message
3. **Verify:** Error logged, doesn't crash

#### Network Failure
1. Disconnect network
2. Try to send message
3. **Verify:** Retry logic activates (3 attempts)

#### Malformed JSON in Callback
- Already protected with try-catch
- **Verify:** Doesn't crash on malformed data

## Automated Test Suite

### Run All Formatting Tests
```bash
cd mcp-server
npm test
```

### Run Bidirectional Tests (Interactive)
```bash
cd mcp-server
node test-bidirectional.js
```

**Note:** Requires manual interaction (sending Telegram messages)

## Test Checklist

### Unit Tests (Jest) ✅ ALL PASSING

**Total: 85 tests passing**

#### MCP Tools Tests (37 tests)

- [x] send_message validation (7 tests)
- [x] send_approval_request validation (11 tests)
- [x] poll_response validation (9 tests)
- [x] batch_notifications validation (7 tests)
- [x] Error handling (3 tests)

#### Message Batcher Tests (15 tests)
- [x] Batching logic
- [x] Priority handling
- [x] Timer management
- [x] Mixed priority messages
- [x] Message order preservation

#### Markdown Escaping Tests (25 tests)
- [x] All 18 Telegram MarkdownV2 special characters
- [x] Edge cases (empty strings, non-strings)
- [x] Complex scenarios (code snippets, URLs, file paths)
- [x] Whitespace preservation

#### Configuration Tests (8 tests)
- [x] Config file parsing
- [x] YAML frontmatter handling
- [x] Missing field defaults
- [x] Error handling

### Hook Script Tests (Bash) ✅ ALL PASSING
**Total: 13 tests passing**

- [x] jq dependency check
- [x] All hook scripts exist
- [x] Script permissions (executable)
- [x] session-start-notify.sh JSON output
- [x] session-start-notify.sh JSON structure
- [x] session-end-notify.sh JSON output
- [x] Missing config file handling
- [x] notify-todo-completion.sh JSON output
- [x] smart-notification-detector.sh JSON output
- [x] send-approval-request.sh JSON output
- [x] Config parsing (session_events: false)
- [x] Empty input handling
- [x] Malformed JSON input handling

### Formatting & Basic Features ✅
- [x] HTML conversion (JavaScript)
- [x] Bash helper formatting
- [x] Simple message sending
- [x] Formatted message sending
- [x] Priority message sending
- [x] Approval request workflow
- [x] Config file parsing

### Bidirectional Communication ⏳
- [ ] Start listener
- [ ] Stop listener
- [ ] Get listener status
- [ ] Command queue functionality
- [ ] Multiple commands in order
- [ ] Unauthorized chat rejection
- [ ] Bot self-message filtering
- [ ] 🤖 emoji reactions

### Hook Integration ✅ (Tested via Unit Tests)
- [x] Session start notifications (hook script)
- [x] Session end notifications (hook script)
- [x] Todo completion notifications (hook script)
- [x] Smart detection hook (hook script)
- [x] Approval request hook (hook script)
- [x] Config-based enable/disable

### Reliability ✅ (Tested via Unit Tests)
- [x] Message batching
- [x] Priority handling
- [x] Error handling
- [x] Graceful config missing handling
- [x] Input validation
- [ ] Rate limiting (30 msg/min) - Not yet implemented
- [ ] Retry logic (3 attempts) - Not yet implemented
- [ ] Log rotation - Not yet implemented

## Troubleshooting

### "Cannot find package 'node-telegram-bot-api'"
```bash
cd mcp-server
npm install
```

### "Config not found"
```bash
# Create config file
cp .claude/telegram.local.md.example ~/.claude/telegram.local.md
# Edit and add your credentials
```

### "jq command not found"
```bash
# macOS
brew install jq

# Linux
sudo apt install jq
```

### "MCP tools not available"
1. Verify plugin installed: `ls ~/.claude/plugins/`
2. Check MCP server config: `.mcp.json`
3. Restart Claude Code
4. Check MCP server list

### "Messages not formatting correctly"
1. Verify you're on latest version
2. Check parse_mode is "HTML" in telegram-bot.js
3. Test with test-html-conversion.js
4. Check Telegram for actual display

## Success Criteria

### Formatting ✅
- Messages display formatted text
- No visible Markdown characters
- HTML tags work correctly

### Bidirectional ⏳
- Listener starts/stops successfully
- Commands queued correctly
- Order preserved
- Unauthorized chats blocked
- Reactions appear on messages

### Reliability ⏳
- Rate limiter prevents API throttling
- Graceful shutdown prevents message loss
- Errors handled without crashes
- Logs rotate automatically

---

**Last Updated:** December 11, 2025
**Test Status:** ✅ 98/98 tests passing (85 Jest + 13 Bash)
**Bugs Fixed:** 3 critical bugs fixed during test suite execution

### Bugs Fixed (December 11, 2025)

1. **Hook Scripts Path Resolution** - Test script now uses relative paths
2. **get_bool_config Multiple Line Returns** - Fixed to return only first match
3. **Missing Config File Handling** - Fixed `set -euo pipefail` exit behavior

See [TEST_RESULTS_2025-12-11.md](TEST_RESULTS_2025-12-11.md) for detailed test results.
