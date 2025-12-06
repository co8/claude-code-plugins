---
description: Send a message to Telegram
argument-hint: <message> [priority]
allowed-tools: [mcp__plugin_telegram-plugin_telegram-bot__send_message]
---

Send message to Telegram: "$ARGUMENTS"

Parse arguments:
- Message text: Everything up to last word (or all if single argument)
- Priority: Last word if it matches "low|normal|high", otherwise "normal"

Use the `mcp__plugin_telegram-plugin_telegram-bot__send_message` tool with:
- text: The message text (supports Markdown formatting)
- priority: Parsed priority level

Report success or error to user.

**Markdown formatting supported:**
- *italic* with `*text*`
- **bold** with `**text**`
- `code` with `` `text` ``
- [links](url) with `[text](url)`

**Example usage:**
```
/telegram:send "Build completed successfully! ✅"
/telegram:send "Error in deployment - check logs" high
/telegram:send "FYI: New PR opened" low
```
