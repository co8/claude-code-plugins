# Telegram Plugin Testing Guide

This document provides comprehensive testing procedures for the Telegram Plugin to ensure all features work correctly.

## Prerequisites

1. **Telegram Bot Setup:**
   - Bot created via @BotFather
   - Bot token obtained
   - Chat ID retrieved (send message to bot, check `/getUpdates`)

2. **Configuration File:**
   - `~/.claude/telegram.local.md` exists with valid YAML frontmatter
   - Bot token and chat ID configured

3. **MCP Server:**
   - Dependencies installed: `cd mcp-server && npm install`
   - MCP server enabled in Claude Code

## Test Suite

### 1. Configuration Test

**Purpose:** Verify configuration file is valid and readable

```bash
/telegram-plugin:test
```

**Expected Results:**
- ✅ Configuration file found
- ✅ Bot token valid (masked display)
- ✅ Chat ID present
- ✅ Test message sent to Telegram

**Failure Scenarios:**
- Missing config file → Error with path suggestions
- Invalid YAML → Parse error
- Invalid bot token → API error from Telegram
- Invalid chat ID → Message not delivered

---

### 2. Basic Message Sending

**Purpose:** Test simple text message delivery

**Test A: Normal Priority Message**
```javascript
mcp__plugin_telegram-plugin_telegram-bot__send_message({
  text: "Test message - normal priority",
  priority: "normal"
})
```

**Expected:**
- Message batched (if within batch window)
- Delivered to Telegram within 30 seconds (default batch window)

**Test B: High Priority Message**
```javascript
mcp__plugin_telegram-plugin_telegram-bot__send_message({
  text: "⚠️ Test message - high priority",
  priority: "high"
})
```

**Expected:**
- Message sent immediately (bypasses batching)
- Instant delivery to Telegram

**Test C: Markdown Formatting**
```javascript
mcp__plugin_telegram-plugin_telegram-bot__send_message({
  text: "*Bold* _italic_ `code` [link](https://example.com)",
  priority: "high"
})
```

**Expected:**
- Markdown rendered correctly in Telegram
- Special characters escaped properly

---

### 3. Approval Request with Inline Keyboard

**Purpose:** Test interactive approval workflow with buttons

**Test:**
```javascript
mcp__plugin_telegram-plugin_telegram-bot__send_approval_request({
  question: "Which feature should we prioritize?",
  header: "Sprint Planning",
  options: [
    {
      label: "Bug Fixes",
      description: "Address reported issues and stability"
    },
    {
      label: "New Features",
      description: "Implement requested functionality"
    },
    {
      label: "Performance",
      description: "Optimize speed and resource usage"
    }
  ]
})
```

**Expected Results:**
- Message appears in Telegram with:
  - Header: "🤔 Sprint Planning"
  - Question text
  - Numbered options with descriptions
  - 3 labeled buttons (Bug Fixes, New Features, Performance)
  - 1 "💬 Other (custom text)" button
- Returns: `{success: true, message_id: X, approval_id: "approval_X"}`

**Interactive Test:**
1. Click "Bug Fixes" button → Should respond immediately
2. Click "Other" button → Bot should prompt for text input
3. Type custom response → Should be captured

**Edge Cases:**
- Empty options array → Validation error
- Missing label → Validation error
- Missing description → Validation error
- Special characters in text → Properly escaped

---

### 4. Polling for Approval Response

**Purpose:** Wait for user's button click and retrieve response

**Test:**
```javascript
// First send approval request (from Test 3)
const result = await send_approval_request(...);
const approvalId = result.approval_id;

// Then poll for response
mcp__plugin_telegram-plugin_telegram-bot__poll_response({
  approval_id: approvalId,
  timeout_seconds: 60
})
```

**Expected Results:**
- Function blocks until user clicks button
- Returns selected option data:
  ```json
  {
    "response": "Bug Fixes",
    "index": 0,
    "custom_text": null
  }
  ```

**Edge Cases:**
- Timeout expires before response → Timeout error
- Invalid approval_id → Error: "Approval not found"
- User selects "Other" → Returns custom text in `custom_text` field

---

### 5. Hook Integration Tests

#### A. TodoWrite Hook (PostToolUse)

**Purpose:** Verify task completion notifications

**Test:**
```javascript
TodoWrite({
  todos: [
    {content: "Test task", activeForm: "Testing task", status: "completed"}
  ]
})
```

**Expected:**
- If `notifications.todo_completions: true`:
  - Message sent to Telegram: "✅ Task completed: Test task"
- If disabled: No notification

#### B. AskUserQuestion Hook (PreToolUse)

**Purpose:** Verify approval requests triggered automatically

**Test:**
```javascript
AskUserQuestion({
  questions: [{
    question: "Should we proceed?",
    header: "Confirmation",
    multiSelect: false,
    options: [
      {label: "Yes", description: "Continue with operation"},
      {label: "No", description: "Cancel operation"}
    ]
  }]
})
```

**Expected:**
- Hook intercepts the call
- Sends approval request to Telegram with inline buttons
- Waits for user response
- Response passed back to Claude Code

#### C. Session Hooks

**Purpose:** Verify session start/end notifications

**Test:**
- Start new Claude Code session

**Expected (if `notifications.session_events: true`):**
- Session start: "🚀 Claude Code session started"
- Session end: "👋 Claude Code session ended"

#### D. Smart Detection Hook (Notification)

**Purpose:** Verify keyword-based smart notifications

**Test:**
Configure keywords: `["important", "warning", "suggest"]`

When Claude says:
> "I suggest we refactor this code for better performance"

**Expected (if `notifications.smart_detection: true`):**
- Notification sent: "💡 [Suggestion detected] I suggest we refactor..."

---

### 6. Message Batching Test

**Purpose:** Verify messages are batched correctly

**Test:**
```javascript
// Send 3 normal priority messages within batch window (default 30s)
send_message({text: "Message 1", priority: "normal"})
send_message({text: "Message 2", priority: "normal"})
send_message({text: "Message 3", priority: "normal"})

// Wait 5 seconds, then send high priority
setTimeout(() => {
  send_message({text: "URGENT", priority: "high"})
}, 5000)
```

**Expected:**
- Messages 1-3 batched together
- When "URGENT" arrives, all 4 messages sent immediately in one combined message
- Format:
  ```
  Message 1
  ---
  Message 2
  ---
  Message 3
  ---
  URGENT
  ```

---

### 7. Error Handling Tests

#### A. Invalid Bot Token

**Setup:** Temporarily modify token in config

**Expected:**
- Clear error message: "Invalid bot token"
- No crash
- Graceful fallback

#### B. Invalid Chat ID

**Setup:** Use non-existent chat ID

**Expected:**
- Error: "Chat not found"
- Suggestion to verify chat ID

#### C. Network Failure

**Setup:** Disconnect network, attempt send

**Expected:**
- Retry mechanism (if implemented)
- Clear error message
- No data loss

#### D. Malformed Input

**Test:**
```javascript
send_message({text: null}) // Invalid
send_approval_request({options: "not-an-array"}) // Invalid
```

**Expected:**
- Validation errors before API calls
- Helpful error messages

---

### 8. Cleanup and Maintenance

**Purpose:** Verify old approvals are cleaned up

**Test:**
1. Create approval request
2. Don't respond
3. Wait 24+ hours
4. Check internal state (via logs)

**Expected:**
- Old approval deleted from `pendingApprovals` map
- Log entry: "Cleaned up old approval"

---

### 9. Configuration Reload Test

**Purpose:** Verify config changes take effect

**Test:**
1. Send message (works)
2. Modify `timeout_seconds` in config: 600 → 120
3. Restart MCP server: `pkill -f telegram-bot.js`
4. Reconnect: `/mcp`
5. Send approval request

**Expected:**
- New timeout (120s) used
- No restart required for most changes

---

### 10. Multi-Project Configuration

**Purpose:** Test project-specific vs global config

**Setup:**
- Global: `~/.claude/telegram.local.md` (chat_id: 111)
- Project: `/project/.claude/telegram.local.md` (chat_id: 222)

**Test:**
```bash
cd /project
# Start Claude Code
/telegram-plugin:test
```

**Expected:**
- Uses project config (chat_id: 222)
- Logs show: "Using project-specific config"

**Test 2:**
```bash
cd /other-project # No local config
/telegram-plugin:test
```

**Expected:**
- Falls back to global config (chat_id: 111)
- Logs show: "Using global config"

---

## Automated Test Script

For development/CI, create `test/telegram-plugin.test.sh`:

```bash
#!/bin/bash
set -e

echo "Running Telegram Plugin Test Suite..."

# 1. Check config exists
if [ ! -f "$HOME/.claude/telegram.local.md" ]; then
  echo "❌ Config file not found"
  exit 1
fi

# 2. Test MCP server starts
cd mcp-server
timeout 3 node telegram-bot.js 2>&1 | grep "Telegram bot initialized" && echo "✅ Server starts" || echo "❌ Server failed"

# 3. Test message send via API
BOT_TOKEN=$(grep 'bot_token:' ~/.claude/telegram.local.md | cut -d'"' -f2)
CHAT_ID=$(grep 'chat_id:' ~/.claude/telegram.local.md | cut -d'"' -f2)

curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
  -d "chat_id=$CHAT_ID" \
  -d "text=🧪 Automated test message" \
  | grep '"ok":true' && echo "✅ Message API works" || echo "❌ Message API failed"

echo "Test suite complete"
```

---

## Regression Testing

After any code changes, run this minimal regression test:

1. **Basic send:** `/telegram-plugin:test` → Message received
2. **Approval request:** Send question with 2+ options → Buttons appear
3. **Hook trigger:** Use `TodoWrite` → Notification received (if enabled)
4. **Error handling:** Invalid input → Graceful error, no crash

---

## Known Issues & Workarounds

### Issue: Markdown Escaping
- **Problem:** Some special characters may not render correctly
- **Workaround:** Use plain text for complex formatting
- **Fix:** Improved escapeMarkdown() function (2025-12-06)

### Issue: MCP Server Disconnection
- **Problem:** Server disconnects after inactivity
- **Workaround:** Reconnect with `/mcp`
- **Status:** Expected behavior - MCP servers restart as needed

---

## Reporting Issues

When reporting bugs, include:

1. **Steps to reproduce**
2. **Expected vs actual behavior**
3. **Error messages** (check `telegram.log`)
4. **Configuration** (masked tokens):
   ```yaml
   bot_token: "123456:ABC..." (masked)
   chat_id: "123456789"
   timeout_seconds: 600
   ```
5. **Environment:**
   - Node.js version: `node --version`
   - Claude Code version
   - OS: macOS/Linux/Windows

**Logs Location:** `~/.claude/plugins/.../telegram-plugin/telegram.log`
