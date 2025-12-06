# Changelog

All notable changes to the Telegram Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed
- **[2025-12-06]** Fixed regex bug in `escapeMarkdown()` function that caused `send_approval_request` to crash with "Invalid regular expression: /\\[/g: Unterminated character class" error. Replaced loop-based string concatenation with single regex pattern using proper character class escaping.

### Changed
- **[2025-12-06]** Improved `escapeMarkdown()` performance by using single regex pass instead of multiple replace operations

## [1.0.0] - Initial Release

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
