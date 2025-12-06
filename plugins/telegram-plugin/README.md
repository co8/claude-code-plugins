# Telegram Plugin for Claude Code

Control and monitor Claude Code remotely via Telegram. Receive task updates, respond to approval requests, and stay connected to your development workflow from anywhere.

## Features

- **📬 Smart Notifications**: Get notified about task completions, errors, session events, and important insights
- **✅ Remote Approvals**: Respond to Claude's questions via Telegram inline keyboards
- **🔔 Keyword Detection**: Automatically detect suggestions, clarifications, and discoveries
- **⚡ Batched Messages**: Reduce noise with intelligent message batching
- **🎛️ Configurable**: Customize notifications, timeouts, and logging preferences

## Prerequisites

1. **Telegram Bot Token**: Create a bot via [@BotFather](https://t.me/botfather)
2. **Chat ID**: Your Telegram user or group chat ID
3. **Node.js**: v18+ (for MCP server)

## Installation

### Quick Setup (Interactive)

```bash
/telegram:configure
```

Follow the guided setup to:
1. Create your Telegram bot (or enter existing token)
2. Get your chat ID
3. Test the connection
4. Configure notification preferences

### Manual Setup

1. Create bot with [@BotFather](https://t.me/botfather):
   - Send `/newbot` to @BotFather
   - Choose a name and username
   - Copy the bot token

2. Get your chat ID:
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   - Copy the `chat.id` value

3. Create configuration file at `.claude/telegram.local.md`:

   **Note**: Configuration files are discovered in priority order:
   - Project-specific: `$PROJECT/.claude/telegram.local.md` (if `CLAUDE_PROJECT_DIR` is set)
   - Global fallback: `~/.claude/telegram.local.md`

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

This file stores your Telegram bot credentials and notification preferences.

**Security Note**: This file is gitignored and should NEVER be committed to version control.
```

4. **Enable MCP Server** (Required):

   The plugin requires an MCP server to communicate with Telegram. After creating the config file:

   **Option A - Auto-discovery** (if supported):

   - Restart Claude Code
   - The MCP server should be automatically discovered from `.mcp.json`

   **Option B - Manual setup** (if auto-discovery not available):

   - Add to `~/.claude/settings.json`:

     ```json
     {
       "mcp": {
         "telegram-bot": {
           "command": "node",
           "args": ["/path/to/telegram-plugin/mcp-server/telegram-bot.js"],
           "env": {
             "NODE_ENV": "production"
           }
         }
       }
     }
     ```

   - Replace `/path/to/telegram-plugin/` with your actual plugin path
   - Restart Claude Code

5. Test connection:

   ```bash
   /telegram:test
   ```

## Usage

### Commands

- `/telegram:configure` - Interactive bot setup and configuration
- `/telegram:send <message>` - Manually send a message to Telegram
- `/telegram:test` - Verify bot connection and settings

### Automatic Notifications

The plugin automatically sends notifications for:

- **Task Completions**: When Claude marks todos as completed
- **Errors & Warnings**: Critical issues that need attention
- **Session Events**: When Claude Code starts/stops
- **Smart Detection**: Suggestions, insights, clarifications, discoveries (keyword-based)

### Approval Requests

When Claude uses `AskUserQuestion`, you'll receive:
- The question in Telegram
- Inline keyboard buttons for each option
- "Other" button for custom text responses
- 10-minute timeout (configurable) before Claude proceeds with default

## Configuration

### Configuration File Discovery

The plugin automatically discovers configuration files in this priority order:

1. **Project-Specific Config** (if `CLAUDE_PROJECT_DIR` environment variable is set)
   - Path: `$PROJECT_ROOT/.claude/telegram.local.md`
   - Use case: Different bots per project, project-specific notification settings

2. **Global Config** (fallback)
   - Path: `~/.claude/telegram.local.md`
   - Use case: Single bot used across all projects

When Claude Code runs, it automatically sets `CLAUDE_PROJECT_DIR` to the project root. The telegram plugin detects this and checks for a project-specific config file first, then falls back to the global config if not found.

### Settings Reference

Edit `.claude/telegram.local.md` to customize:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `bot_token` | string | required | Your Telegram bot token from @BotFather |
| `chat_id` | string | required | Your Telegram chat ID |
| `timeout_seconds` | number | 600 | How long to wait for approval responses (seconds) |
| `notifications.todo_completions` | boolean | true | Notify when tasks complete |
| `notifications.errors` | boolean | true | Notify on errors/warnings |
| `notifications.session_events` | boolean | true | Notify on session start/end |
| `notifications.smart_detection` | boolean | true | Detect insights/suggestions via keywords |
| `smart_keywords` | string[] | [...] | Keywords to trigger smart notifications |
| `logging_level` | string | "errors" | Message logging: "all", "errors", "none" |
| `batch_window_seconds` | number | 30 | Time window to batch similar notifications |

## Architecture

### Components

- **MCP Server** (`mcp-server/telegram-bot.js`): Handles Telegram Bot API communication
- **Hooks** (`hooks/hooks.json`): Event-driven notification triggers
- **Commands** (`commands/`): User-facing slash commands
- **Skill** (`skills/telegram-integration/`): Telegram Bot API knowledge

### Message Flow

```
Claude Event → Hook Trigger → MCP Server → Telegram API → Your Phone
Your Response → Telegram → MCP Polling → Claude Continues
```

### Rate Limiting

The plugin intelligently batches notifications within the configured window to:
- Reduce Telegram API calls
- Minimize notification noise
- Stay within rate limits (30 messages/second to same chat)

## Troubleshooting

### Bot not responding

1. Verify token: `/telegram:test`
2. Check bot is started (send `/start` to your bot)
3. Verify chat ID is correct
4. Check logs: `cat ~/.claude/plugins/telegram-plugin/telegram.log`

### Not receiving notifications

1. Check notification settings in `.claude/telegram.local.md`
2. Verify hooks are loaded: `claude --debug`
3. Test manual send: `/telegram:send "test message"`

### Approval requests timing out

1. Increase timeout: Set `timeout_seconds` higher in settings
2. Check Telegram app is receiving messages
3. Verify inline keyboard buttons are working

### Rate limit errors

1. Increase batch window: Set `batch_window_seconds` higher
2. Disable non-critical notifications
3. Check for notification loops in logs

## Security

- **Never commit** `.claude/telegram.local.md` to version control
- **Bot token** is like a password - keep it secret
- **Chat ID** should be private to prevent spam
- **HTTPS only**: All Telegram API calls use TLS
- **Local logs**: Message logs stay on your machine

## Development

### Running Tests

```bash
npm test
```

### MCP Server Development

The MCP server is in `mcp-server/telegram-bot.js`. To run standalone:

```bash
node mcp-server/telegram-bot.js
```

### Hook Testing

Test hooks with Claude's debug mode:

```bash
claude --debug
```

## License

MIT

## Support

- Report issues: [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- Claude Code docs: [claude.ai/claude-code](https://claude.ai/claude-code)
