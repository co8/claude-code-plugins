---
name: Telegram Integration
description: This skill should be used when working with the telegram-plugin, troubleshooting Telegram bot issues, understanding notification triggers, configuring approval workflows, or when the user asks about "Telegram notifications", "remote approvals", "bot configuration", "message batching", or "Telegram Bot API integration".
version: 0.1.0
---

# Telegram Integration for Claude Code

## Overview

This skill provides guidance for using and troubleshooting the Telegram plugin for Claude Code. The plugin enables remote monitoring and control of Claude Code sessions via Telegram, allowing developers to receive task updates, respond to approval requests, and stay connected to workflows from anywhere.

**Core capabilities:**
- Send notifications for task completions, errors, and insights
- Request approvals via Telegram with inline keyboards
- Batch similar notifications to reduce noise
- Smart keyword detection for important messages
- Session event tracking

## When to Use This Skill

Use this skill when:
- Setting up or configuring the Telegram bot
- Troubleshooting connection or notification issues
- Understanding how hooks trigger notifications
- Implementing approval request workflows
- Optimizing notification batching and filtering
- Debugging Telegram Bot API integration

## Architecture Overview

The plugin consists of four main components working together:

### MCP Server (telegram-bot.js)

Handles direct Telegram Bot API communication via stdio protocol.

**Tools provided:**
- `send_message(text, priority)` - Send notifications
- `send_approval_request(question, options, header)` - Send approval with inline keyboard
- `poll_response(approval_id, timeout_seconds)` - Wait for user response
- `batch_notifications(messages[])` - Batch similar messages

**Configuration:** Reads from `~/.claude/telegram.local.md` for bot token, chat ID, and settings.

### Hooks (5 event handlers)

Automatically detect events and suggest notifications:

1. **PostToolUse (TodoWrite)** - Detects task completions
2. **PreToolUse (AskUserQuestion)** - Detects approval requests
3. **Notification** - Smart keyword detection
4. **SessionStart** - Session beginning notifications
5. **SessionEnd** - Session ending notifications

**Important:** Hooks provide **system messages suggesting** Claude use MCP tools. They don't send messages directly.

### Commands (3 slash commands)

User-facing commands for manual operations:

- `/telegram:configure` - Interactive or manual setup
- `/telegram:send <message> [priority]` - Manual message sending
- `/telegram:test` - Connection verification

### Settings (.claude/telegram.local.md)

YAML frontmatter configuration:

```yaml
bot_token: "your-token"
chat_id: "your-chat-id"
timeout_seconds: 600
notifications:
  todo_completions: true
  errors: true
  session_events: true
  smart_detection: true
smart_keywords: ["suggest", "recommend", "discovered", "insight", "clarify", "important"]
logging_level: "errors"
batch_window_seconds: 30
```

## Notification Workflow

### How Notifications Work

1. **Event occurs** (e.g., TodoWrite with completed tasks)
2. **Hook executes** and analyzes the event
3. **Hook outputs system message** suggesting MCP tool use
4. **Claude reads system message** and decides whether to act
5. **Claude calls MCP tool** if notification is appropriate
6. **MCP server sends to Telegram** via Bot API

### Example Flow: Task Completion

```
User completes task → TodoWrite tool called →
PostToolUse hook detects completion →
Hook outputs: "Telegram notification queued: 1 task completed. Use send_message tool." →
Claude sees system message →
Claude calls: mcp__plugin_telegram-plugin_telegram-bot__send_message →
MCP server sends to Telegram →
User receives notification on phone
```

### Smart Notification Detection

The Notification hook scans messages for keywords:

**Default keywords:** suggest, recommend, discovered, insight, clarify, important, note, warning

**Trigger examples:**
- "I recommend using async/await here" → Triggers notification
- "Important: This will require database migration" → Triggers notification
- "Discovered an issue in the error handling" → Triggers notification

**Customization:** Edit `smart_keywords` in settings file.

## Approval Request Workflow

### How Approvals Work

When Claude uses `AskUserQuestion`:

1. **PreToolUse hook intercepts** the AskUserQuestion call
2. **Hook suggests** using `send_approval_request` MCP tool
3. **Claude sends approval request** to Telegram with inline keyboard
4. **Claude calls `poll_response`** to wait for user input
5. **User taps button** or sends custom text in Telegram
6. **MCP server returns response** to Claude
7. **Claude continues** with user's choice

### Inline Keyboard Format

Approval requests create buttons for each option:

```
🤔 Approval Request

Which library should we use?

1. React Query: Best for data fetching
2. SWR: Lightweight alternative
3. Custom hook: Full control

[React Query] [SWR] [Custom hook]
[💬 Other (custom text)]
```

### Timeout Behavior

Default timeout: 10 minutes (configurable via `timeout_seconds`)

**If timeout occurs:**
- `poll_response` returns `{"timed_out": true, "selected": null}`
- Claude proceeds with default choice or asks in terminal

**Hybrid approach:** Keeps workflow moving while allowing remote control.

## Using MCP Tools

### Send Message

```
Tool: mcp__plugin_telegram-plugin_telegram-bot__send_message

Parameters:
- text: Message content (Markdown supported)
- priority: "low" | "normal" | "high"

Priorities:
- high: Sends immediately, bypasses batching
- normal: Batches within window (default)
- low: Lower priority, batched
```

**When to use:**
- Task completion notifications (normal)
- Error alerts (high)
- Informational updates (low)
- Session events (low)

### Send Approval Request

```
Tool: mcp__plugin_telegram-plugin_telegram-bot__send_approval_request

Parameters:
- question: The question text
- options: Array of {label, description} objects
- header: Optional title/header

Returns:
- approval_id: Use with poll_response
- message_id: Telegram message ID
```

**Match AskUserQuestion format exactly:**
- Extract question from AskUserQuestion
- Convert options array to same format
- Use header from AskUserQuestion

### Poll Response

```
Tool: mcp__plugin_telegram-plugin_telegram-bot__poll_response

Parameters:
- approval_id: From send_approval_request
- timeout_seconds: How long to wait (default: 600)

Returns:
- selected: Chosen option label or null if timeout
- custom_text: User's custom input (if "Other" selected)
- timed_out: Boolean
- elapsed_seconds: How long it took
```

**Important:** This is a blocking call. Claude waits for response or timeout.

### Batch Notifications

```
Tool: mcp__plugin_telegram-plugin_telegram-bot__batch_notifications

Parameters:
- messages: Array of {text, priority} objects

Batches multiple notifications into one message:
- Combines within batch_window_seconds
- Reduces Telegram API calls
- Minimizes notification noise
```

**When to use:**
- Multiple similar events (several task completions)
- Bulk updates
- Non-urgent notifications

## Configuration Patterns

### Minimal Configuration (Testing)

```yaml
---
bot_token: "123:ABC..."
chat_id: "987654321"
---
```

Minimal config for basic testing. Uses all defaults.

### Recommended Configuration

```yaml
---
bot_token: "your-token"
chat_id: "your-chat-id"
timeout_seconds: 600
notifications:
  todo_completions: true
  errors: true
  session_events: true
  smart_detection: true
smart_keywords: ["suggest", "recommend", "discovered", "insight", "clarify", "important", "note", "warning"]
logging_level: "errors"
batch_window_seconds: 30
---
```

Balanced settings for most use cases.

### High-Volume Configuration

```yaml
---
bot_token: "your-token"
chat_id: "your-chat-id"
timeout_seconds: 300
notifications:
  todo_completions: true
  errors: true
  session_events: false
  smart_detection: true
smart_keywords: ["critical", "error", "important", "discovered"]
logging_level: "none"
batch_window_seconds: 60
---
```

Optimized for high-activity sessions:
- Shorter timeout (5 min)
- Disabled session events
- Fewer keywords (reduce noise)
- Longer batch window
- No logging overhead

## Troubleshooting

### Bot Not Responding

**Symptoms:** Messages not appearing in Telegram

**Checks:**
1. Verify token: `/telegram:test`
2. Check bot started: Send `/start` to bot in Telegram
3. Confirm chat ID: Use getUpdates API
4. Test network: `curl https://api.telegram.org/bot<TOKEN>/getMe`

**Common causes:**
- Incorrect token (typo in .local.md)
- Bot not started by user
- Wrong chat ID
- Firewall blocking api.telegram.org

### Notifications Not Triggering

**Symptoms:** Expected notifications don't arrive

**Checks:**
1. Verify hook is loaded: `claude --debug`
2. Check notification settings in .local.md
3. Test manual send: `/telegram:send "test"`
4. Review hook scripts are executable: `ls -la hooks/scripts/`

**Common causes:**
- Hook disabled in configuration
- Settings file has wrong YAML syntax
- Hook script not executable (chmod +x)
- MCP server not connected

### Approval Requests Timing Out

**Symptoms:** Approvals always timeout, Claude proceeds with default

**Checks:**
1. Verify timeout setting: Check `timeout_seconds` in .local.md
2. Test Telegram app receiving messages
3. Check inline keyboard appears correctly
4. Verify MCP server polling working

**Common causes:**
- Timeout too short for response
- Telegram app not showing buttons
- MCP server polling disabled
- Network latency issues

### Rate Limit Errors

**Symptoms:** Some messages not sent, "Too Many Requests" errors

**Telegram limits:**
- 30 messages/second to same chat
- 20 messages/minute to same group

**Solutions:**
1. Increase `batch_window_seconds` to batch more
2. Reduce notification frequency
3. Disable non-critical notifications
4. Use priority system (only high-priority immediate)

**Best practice:** Default 30-second batch window handles most cases.

### Message Formatting Issues

**Symptoms:** Messages have broken formatting

**Markdown syntax:**
- `*italic*` for italic
- `**bold**` for bold (use double asterisk)
- `` `code` `` for code
- `[link](url)` for links

**Common mistakes:**
- Using single `*` for bold (needs double `**`)
- Not escaping special chars: `_`, `*`, `[`, `]`
- Unclosed formatting tags

**Fix:** Escape special characters with backslash: `\*`, `\_`

## Rate Limiting and Batching

### Understanding Batching

The MessageBatcher class combines notifications within a time window:

1. **Message added** with priority and timestamp
2. **High priority:** Flushes immediately
3. **Normal/low priority:** Waits for batch window
4. **Timer expires:** Combines pending messages, sends as one

**Benefits:**
- Reduces API calls (avoids rate limits)
- Minimizes notification noise
- Preserves message content (all messages sent, just combined)

### Batch Window Configuration

```yaml
batch_window_seconds: 30  # Default
```

**Shorter window (10-15s):**
- More real-time notifications
- Higher API usage
- Risk of rate limits in high-activity sessions

**Longer window (60-90s):**
- Better batching, fewer messages
- Less real-time
- Lower API usage
- Good for bulk operations

**Recommended:** 30 seconds balances responsiveness and efficiency.

### Priority System

Use priorities to control batching:

**High priority:**
- Errors and critical issues
- Important user questions
- Time-sensitive alerts
- **Bypasses batching** - sends immediately

**Normal priority:**
- Task completions
- General updates
- Smart detections
- **Batches within window** - default behavior

**Low priority:**
- Session events
- Informational notices
- Debug messages
- **Batches aggressively** - lowest urgency

## Logging and Debugging

### Log Levels

```yaml
logging_level: "errors"  # Recommended
```

**Options:**
- `"all"` - Log everything (messages, API calls, responses)
- `"errors"` - Log only errors and failures
- `"none"` - No logging

**Log location:** `telegram-plugin/telegram.log`

### Debug Mode

Run Claude Code with debug flag to see hook execution:

```bash
claude --debug
```

Look for:
- Hook registration at startup
- Hook execution on events
- System messages from hooks
- MCP tool calls and responses

### Testing Without Sending

To test hooks without actual Telegram messages:

1. Set invalid bot token temporarily
2. Run workflows
3. Check hook system messages appear
4. Verify Claude attempts MCP tool calls
5. Restore valid token when ready

## Best Practices

### Notification Design

**DO:**
- Use high priority sparingly (errors only)
- Batch similar notifications together
- Include context in messages (project name, file, etc.)
- Use Markdown for readability
- Keep messages concise (< 200 chars ideal)

**DON'T:**
- Send every minor event
- Use high priority for informational updates
- Include sensitive data in messages (API keys, passwords)
- Spam with duplicate messages
- Rely solely on notifications (check terminal too)

### Approval Requests

**DO:**
- Provide clear option descriptions
- Include context in question
- Set appropriate timeout
- Handle timeout gracefully (fallback)
- Test inline keyboard formatting

**DON'T:**
- Send approvals for trivial choices
- Use extremely short timeouts (< 60s)
- Block on approvals for urgent decisions
- Send approval without context
- Forget to handle custom text responses

### Security

**DO:**
- Keep bot token secret
- Use .gitignore for .local.md files
- Verify chat ID is yours
- Use HTTPS for all API calls (automatic)
- Review message content before sending

**DON'T:**
- Commit .local.md to git
- Share bot token publicly
- Log sensitive information
- Use same bot for multiple users without groups
- Send credentials or secrets via Telegram

## Additional Resources

For detailed Telegram Bot API documentation:
- Official API: https://core.telegram.org/bots/api
- node-telegram-bot-api: https://github.com/yagop/node-telegram-bot-api

For MCP integration patterns:
- Load the mcp-integration skill for MCP server details
- See `.mcp.json` for server configuration

For hook development:
- Load the hook-development skill for hook patterns
- See `hooks/hooks.json` for hook configuration
- Review `hooks/scripts/` for implementation examples
