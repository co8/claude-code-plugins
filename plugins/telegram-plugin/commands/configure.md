---
description: Interactive Telegram bot setup and configuration
allowed-tools: [Read, Write, Edit, Bash(curl:*), AskUserQuestion]
model: sonnet
---

# Telegram Plugin Configuration

Guide the user through setting up their Telegram bot for Claude Code integration.

## Configuration Options

Ask user if they want:
1. Interactive guided setup (create bot, get chat ID, test connection)
2. Manual configuration (provide instructions for editing .local.md file)

## Interactive Setup (Option 1)

If interactive setup chosen:

### Step 1: Create Telegram Bot

Explain to user:
1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Follow prompts to choose bot name and username
4. Copy the bot token provided (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

Ask user to paste their bot token.

### Step 2: Get Chat ID

Explain to user:
1. Send any message to their new bot in Telegram
2. Visit this URL in browser (replace TOKEN): `https://api.telegram.org/botTOKEN/getUpdates`
3. Look for `"chat":{"id":123456789}` in the JSON response
4. Copy the chat ID number

Ask user to provide their chat ID.

### Step 3: Create Configuration File

Create or update `~/.claude/telegram.local.md` with user's credentials:

```yaml
---
bot_token: "[USER'S BOT TOKEN]"
chat_id: "[USER'S CHAT ID]"
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

# Telegram Plugin Configuration

Your Telegram bot is configured and ready to use!

**Bot Token:** [masked, first 10 chars only]
**Chat ID:** [user's chat ID]

## Customization

Edit this file to customize:
- `timeout_seconds`: How long to wait for approval responses (default: 600)
- `notifications`: Enable/disable notification types
- `smart_keywords`: Keywords that trigger smart notifications
- `logging_level`: "all", "errors", or "none"
- `batch_window_seconds`: Time window to combine similar notifications

## Testing

Run `/telegram:test` to verify your configuration.
```

### Step 4: Test Connection

After creating config, run `/telegram:test` to verify bot works.

## Manual Configuration (Option 2)

If manual configuration chosen:

Provide these instructions:

### Create Bot with @BotFather

```
1. Open Telegram and search for @BotFather
2. Send: /newbot
3. Follow prompts to name your bot
4. Copy the bot token (format: 1234567890:ABC...)
```

### Get Your Chat ID

```
1. Send a message to your bot
2. Visit: https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
3. Find "chat":{"id":YOUR_CHAT_ID}
4. Copy the numeric chat ID
```

### Create Configuration File

Create file at: `~/.claude/telegram.local.md`

```yaml
---
bot_token: "YOUR_BOT_TOKEN_HERE"
chat_id: "YOUR_CHAT_ID_HERE"
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

# Telegram Plugin Configuration

Replace YOUR_BOT_TOKEN_HERE and YOUR_CHAT_ID_HERE with your actual credentials.

## Notification Settings

- `todo_completions`: Get notified when tasks complete
- `errors`: Receive error and warning alerts
- `session_events`: Know when Claude Code starts/stops
- `smart_detection`: Auto-detect important insights/suggestions

## Advanced Settings

- `timeout_seconds`: Approval request timeout (default: 600)
- `smart_keywords`: Keywords for smart detection
- `logging_level`: "all", "errors", or "none"
- `batch_window_seconds`: Notification batching window (default: 30)
```

### Test Configuration

After setup, run: `/telegram:test`

## Troubleshooting

**Bot not responding:**
- Verify token is correct
- Send `/start` to your bot in Telegram
- Check bot isn't already stopped

**Can't find chat ID:**
- Make sure you sent a message to the bot first
- Try: https://api.telegram.org/bot<TOKEN>/getUpdates
- Look for the "id" field under "chat"

**Permission errors:**
- Ensure ~/.claude/ directory exists
- Check file permissions allow writing
- Make sure telegram.local.md is in .gitignore

## Next Steps

After configuration:
1. Test with `/telegram:test`
2. Try manual send: `/telegram:send "Hello from Claude!"`
3. The plugin will automatically send notifications based on your settings
4. Approval requests will appear in Telegram when Claude uses AskUserQuestion

**Security Note:** Never commit telegram.local.md to version control. It contains your bot token which should remain secret.
