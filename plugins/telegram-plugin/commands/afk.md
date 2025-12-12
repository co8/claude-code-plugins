---
description: Enable Telegram as main communication method (AFK mode)
allowed-tools: [mcp__plugin_telegram-plugin_telegram-bot__enable_afk_mode]
---

Enable AFK (Away From Keyboard) mode - Telegram becomes the primary communication channel.

Use the `mcp__plugin_telegram-plugin_telegram-bot__enable_afk_mode` tool to:
- Enable AFK mode state
- Send notification to Telegram confirming AFK mode is active

The tool will send a message to Telegram like:
"🔕 AFK mode enabled - I'll communicate via Telegram while you're away"

Report success or error to user.

**Example usage:**
```
/telegram-plugin:afk
```
