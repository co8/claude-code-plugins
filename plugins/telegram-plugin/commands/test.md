---
description: Test Telegram bot connection and configuration
allowed-tools: [Read, mcp__plugin_telegram-plugin_telegram-bot__send_message]
---

Test Telegram plugin configuration and connectivity.

## Step 1: Check Configuration File

Read configuration file: @~/.claude/telegram.local.md

Verify:
- File exists
- Contains bot_token field
- Contains chat_id field
- YAML frontmatter is valid

Report configuration status (mask token, show only first 10 characters).

## Step 2: Test Connection

Use `mcp__plugin_telegram-plugin_telegram-bot__send_message` tool to send test message:

```
text: "🧪 *Test Message from Claude Code*\n\nYour Telegram plugin is configured correctly!\n\n✅ Connection successful\n⏰ " + current_time
priority: "high"
```

## Step 3: Report Results

If successful:
- ✅ Configuration valid
- ✅ Bot token accepted
- ✅ Message sent successfully
- ✅ Check your Telegram for the test message

If failed:
- ❌ Error details
- Troubleshooting suggestions:
  - Verify bot token is correct
  - Check chat ID is correct
  - Ensure bot is started (send /start to bot)
  - Check network connectivity
  - Review ~/.claude/telegram.local.md format

## Configuration Summary

Display (with masked token):
- Bot token: [first 10 chars]...
- Chat ID: [full chat ID]
- Timeout: [timeout_seconds] seconds
- Notifications enabled: [list enabled notification types]
- Logging level: [logging_level]
- Batch window: [batch_window_seconds] seconds

**Next steps:**
- Try sending a manual message: `/telegram:send "Hello!"`
- Plugin will automatically send notifications based on your settings
- Approval requests will appear when Claude uses AskUserQuestion
