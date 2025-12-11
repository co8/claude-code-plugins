# Changelog

All notable changes to the Telegram Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.2.3] - 2024-12-11

### Fixed

- **Enhanced Markdown Formatting** 🎨
  - Added support for double asterisk bold: `**text**` → **text**
  - Added support for double underscore italic: `__text__` → _italic_
  - Improved `markdownToHTML()` regex patterns to handle both single and double markers
  - Processing order optimized: code first, then bold, then italic (prevents conflicts)
  - All mixed formatting combinations now work correctly

## [0.2.2] - 2024-12-11

### Fixed

- **Formatting in Approval Requests** 🔧
  - Fixed approval request questions not showing formatted text
  - Added `preserveFormatting: true` to all `markdownToHTML()` calls in:
    - Approval request headers, questions, and option labels/descriptions
    - Batch notification messages
    - Callback acknowledgement messages
  - All user-facing text now properly displays **bold**, _italic_, and `code` formatting

## [0.2.1] - 2024-12-11

### Fixed

- Version bump and plugin metadata updates

## [0.2.0] - 2024-12-11

### Fixed

- **HTML Formatting** 🎨
  - Fixed Markdown formatting not displaying correctly in Telegram messages
  - Switched from MarkdownV2 to HTML parse mode for better reliability
  - Fixed bash helper library to properly convert Markdown to HTML
  - Fixed `get_config_value` function to extract only first YAML frontmatter block
  - Messages now display bold, italic, and code formatting correctly without asterisks showing

### Added

- **Bidirectional Communication** 🔄
  - `start_listener` - Start listening for incoming Telegram messages
  - `stop_listener` - Stop listening and clear command queue
  - `get_pending_commands` - Retrieve queued messages from user
  - `get_listener_status` - Check listener state and pending count
  - New `UserPromptSubmit` hook to suggest checking for incoming messages
  - Command queue for storing user messages

- **Rate Limiting** ⚡
  - `RateLimiter` class enforces 30 messages per minute
  - Prevents hitting Telegram API limits
  - Applied to all message sending operations

- **Graceful Shutdown** 🛡️
  - Flushes pending batched messages on shutdown
  - Stops polling cleanly
  - Handles SIGINT and SIGTERM signals
  - Prevents message loss during restarts

### Changed

- **Message Style** ✨
  - Added emojis to all notifications for better visual feedback
  - Removed exclamation points (use emojis for emphasis instead)
  - Task completion: `✅ *Task Completed* 🎯`
  - Session start: `🚀 *Claude Code Started* 💻`
  - Session end: `🛑 *Claude Code Stopped* 🏁`

- **Autonomous Notifications** 📬
  - Session start/end hooks now send messages directly
  - Previously only suggested Claude send messages
  - More reliable notification delivery

### Security

- **Token Protection** 🔒
  - Health check now masks bot token: `**********... (46 chars)`
  - Previously showed first 10 characters

- **Error Handling** 🛠️
  - Added try-catch around callback data JSON parsing
  - Wrapped periodic cleanup in error handler
  - Prevents crashes from malformed input

### Improved

- Better error messages throughout codebase
- Enhanced logging for bidirectional communication
- More robust polling state management
- Documentation updated with new features

### Technical

- New `check-incoming-messages.sh` hook script
- Message listener with chat authorization
- Command queue with metadata (id, text, from, timestamp)
- Bot self-identification to filter own messages

### Documentation

- Created `IMPROVEMENTS_2024-12.md` with detailed code review results
- Updated `SKILL.md` with emoji guidelines
- Added usage examples for bidirectional communication

## [0.1.5] - 2025-12-06

### Added

- **Configuration Schema Validation**: Robust YAML parsing with js-yaml library and comprehensive validation
- **Retry Logic**: Automatic retry with exponential backoff (3 attempts) for network failures
- **Log Rotation**: Automatic log file rotation when exceeding 10MB (keeps 3 backup files)
- **Health Check Command**: New `/telegram-plugin:health` command and `npm run health` script
- **Unit Tests**: Comprehensive test suite for configuration, validation, and markdown escaping
- **Config Helper Library**: Shared bash library for hook scripts with CLAUDE_PROJECT_DIR support
- **Dependency Warnings**: Hook scripts now warn users when jq is missing instead of failing silently

### Changed

- **MCP SDK Updated**: Upgraded from 0.5.0 to 1.24.3 (latest version)
- **Markdown Format**: Standardized on MarkdownV2 for all Telegram messages
- **Polling Cleanup**: Improved polling state management to prevent resource leaks
- **Hook Scripts**: All hooks now use centralized config discovery matching MCP server behavior
- **Version Sync**: Synchronized version numbers across plugin.json, marketplace.json, and package.json

### Improved

- Better error messages for configuration validation failures
- More robust config file discovery (project-specific vs global)
- Enhanced cleanup mechanism in pollResponse with proper state tracking
- Immediate approval cleanup when response received
- Log rotation prevents disk space issues

### Technical

- Added CONFIG_SCHEMA with type validation and range checks
- Implemented rotateLogFile() function with configurable limits
- Enhanced sendMessage() with retry logic and exponential backoff
- Improved pollResponse() to track and restore polling state
- Created config-helper.sh library for bash hook scripts

## [0.1.4] - 2025-12-06

### Fixed

- Fixed regex bug in `escapeMarkdown()` function that caused `send_approval_request` to crash with "Invalid regular expression: /\\[/g: Unterminated character class" error. Replaced loop-based string concatenation with single regex pattern using proper character class escaping. See [BUGFIXES.md](BUGFIXES.md) for technical details.

### Changed

- Improved `escapeMarkdown()` performance by using single regex pass instead of multiple replace operations

## [0.1.0] - Initial Release

### Added
- MCP server integration for Telegram Bot API
- Three core tools:
  - `send_message` - Send text messages with priority levels
  - `send_approval_request` - Send questions with inline keyboard buttons
  - `poll_response` - Wait for user responses to approval requests
- Configuration via `~/.claude/telegram.local.md` with YAML frontmatter
- Smart notification system with keyword detection
- Message batching with configurable time windows
- Five event hooks:
  - `PostToolUse` (TodoWrite) - Task completion notifications
  - `PreToolUse` (AskUserQuestion) - Approval workflows
  - `Notification` - Smart detection of important messages
  - `SessionStart` - Session start notifications
  - `SessionEnd` - Session end notifications
- Logging system with configurable levels (all/errors/none)
- Automatic approval cleanup (24-hour retention)
- Project-specific and global configuration support
- Interactive setup command (`/telegram-plugin:configure`)
- Connection test command (`/telegram-plugin:test`)

### Security
- Bot token stored in local `.md` files (gitignored)
- No tokens in code or version control
- Markdown escaping to prevent injection attacks
