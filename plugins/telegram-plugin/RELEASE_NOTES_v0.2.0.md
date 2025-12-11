# Release Notes - Telegram Plugin v0.2.0

**Release Date**: December 11, 2024
**Commit**: 6405544
**Previous Version**: 0.1.10

## Overview

Version 0.2.0 brings major improvements to message formatting reliability and introduces bidirectional communication features, enabling true two-way interaction with Claude Code via Telegram.

## What's New

### 🎨 HTML Formatting Fix (CRITICAL)

**Problem**: Messages displayed raw Markdown syntax (`*bold*`) instead of formatted text.

**Solution**: Switched from Telegram's MarkdownV2 to HTML parse mode.

**Impact**:
- ✅ Messages now display properly formatted text
- ✅ No more visible asterisks, underscores, or backticks
- ✅ Works consistently across all message types
- ✅ Simpler, more reliable escaping

**Files Changed**:
- `telegram-bot.js` - Added `markdownToHTML()` function
- `config-helper.sh` - Rewrote `send_telegram_message()` for HTML
- `config-helper.sh` - Fixed `get_config_value()` to parse first YAML block only

### 🔄 Bidirectional Communication (NEW)

**Feature**: Claude can now listen for and respond to your Telegram messages.

**New MCP Tools**:

1. **start_listener** - Begin listening for incoming messages
   ```javascript
   await mcp__plugin_telegram-plugin_telegram-bot__start_listener()
   ```

2. **stop_listener** - Stop listening and clear command queue
   ```javascript
   await mcp__plugin_telegram-plugin_telegram-bot__stop_listener()
   ```

3. **get_pending_commands** - Retrieve queued user messages
   ```javascript
   await mcp__plugin_telegram-plugin_telegram-bot__get_pending_commands({ limit: 10 })
   ```

4. **get_listener_status** - Check listener state
   ```javascript
   await mcp__plugin_telegram-plugin_telegram-bot__get_listener_status()
   ```

**Features**:
- In-memory command queue
- Chat ID authorization (only configured user)
- Bot self-message filtering
- 🤖 emoji reactions on received messages
- UserPromptSubmit hook integration

**Use Cases**:
- Send commands to Claude remotely via Telegram
- Check status while away from computer
- Queue multiple requests for processing
- True two-way communication

**Configuration**:
```yaml
---
bidirectional_communication: true
---
```

### ⚡ Rate Limiting (NEW)

**Feature**: Prevents hitting Telegram API rate limits.

**Implementation**:
- RateLimiter class enforces 30 messages per minute
- Automatic throttling with exponential backoff
- Applied to all message sending operations

**Benefit**: Plugin can run continuously without API throttling errors.

### 🛡️ Graceful Shutdown (NEW)

**Feature**: Clean shutdown handling prevents message loss.

**Implementation**:
- Flushes pending batched messages on shutdown
- Stops polling cleanly
- Handles SIGINT and SIGTERM signals

**Benefit**: No message loss during restarts or system shutdowns.

### 🎯 Autonomous Notifications

**Change**: Session hooks now send messages directly instead of suggesting Claude send them.

**Impact**:
- More reliable notification delivery
- Session start/end messages always sent
- No dependency on Claude's message handling

### 📝 Enhanced Documentation

**New Documents**:
- `FORMATTING_FIX_2024-12.md` - Detailed formatting fix explanation
- `TESTING_GUIDE.md` - Comprehensive testing instructions
- `CODE_REVIEW_SUMMARY.md` - Security audit results
- `IMPROVEMENTS_2024-12.md` - Complete code review findings
- `RELEASE_NOTES_v0.2.0.md` - This document

**Updated**:
- `CHANGELOG.md` - Full version history
- `SKILL.md` - Updated with new features
- `configure.md` - Added bidirectional setup

### 🧪 Test Suite

**New Tests**:
- `test-html-conversion.js` - JavaScript HTML conversion (5/5 passing)
- `test-bash-formatting.sh` - Bash helper formatting (passing)
- `test-bidirectional.js` - Bidirectional features (ready for use)

## Technical Changes

### Code Quality Improvements

**Security**:
- ✅ Token masking in health checks
- ✅ JSON parsing error handling
- ✅ Comprehensive error handling
- ✅ Chat authorization in bidirectional mode

**Reliability**:
- ✅ Rate limiting prevents API throttling
- ✅ Graceful shutdown prevents message loss
- ✅ Better error recovery
- ✅ Improved state management

**Performance**:
- ✅ Efficient HTML conversion
- ✅ Optimized queue operations
- ✅ Minimal memory overhead

### File Statistics

```
21 files changed
2,250 lines added
68 lines removed

New Files:
- CODE_REVIEW_SUMMARY.md
- FORMATTING_FIX_2024-12.md
- IMPROVEMENTS_2024-12.md
- TESTING_GUIDE.md
- RELEASE_NOTES_v0.2.0.md
- hooks/scripts/check-incoming-messages.sh
- hooks/scripts/test-bash-formatting.sh
- mcp-server/test-bidirectional.js
- mcp-server/test-html-conversion.js

Modified Files:
- .claude-plugin/plugin.json (version bump)
- mcp-server/telegram-bot.js (major updates)
- mcp-server/package.json (version sync)
- hooks/scripts/lib/config-helper.sh (HTML conversion)
- hooks/hooks.json (UserPromptSubmit hook)
- All session/notification hooks
- CHANGELOG.md
- configure.md
- SKILL.md
```

## Breaking Changes

**None** - All changes are backward compatible.

## Migration Guide

### For Existing Users

1. **Update Plugin**:
   ```
   Request plugin update for telegram-plugin@co8-plugins
   ```

2. **Restart Claude Code** (if necessary)

3. **Optional - Enable Bidirectional Communication**:
   Edit `~/.claude/telegram.local.md`:
   ```yaml
   ---
   bidirectional_communication: true
   ---
   ```

4. **Test Formatting**:
   Send a test message and verify formatting works correctly

5. **Test Bidirectional** (if enabled):
   - Start listener
   - Send message to bot via Telegram
   - Check for 🤖 reaction
   - Retrieve commands

### For New Users

Follow the setup guide at `configure.md` or run:
```
/telegram-plugin:configure
```

## Upgrade Path

```
0.1.10 → 0.2.0
```

**Required Actions**: Update plugin (automatic)
**Recommended Actions**: Enable bidirectional communication
**Optional Actions**: Review new test suite

## Testing

### Formatting Tests ✅

```bash
cd mcp-server
node test-html-conversion.js
# Expected: 5/5 passing

cd ../hooks/scripts
./test-bash-formatting.sh
# Expected: ✅ Message sent successfully
```

### Bidirectional Tests ⏳

```bash
cd mcp-server
node test-bidirectional.js
# Requires manual interaction (sending Telegram messages)
```

See `TESTING_GUIDE.md` for comprehensive testing instructions.

## Known Issues

None at release time.

## Future Enhancements

### Short Term
- Persistent command queue (database/file)
- Support multiple chat monitoring
- Command ACL (access control list)
- Command timeouts/expiry

### Long Term
- Metrics collection system
- TypeScript migration
- Class-based architecture refactor
- Configuration hot reload
- Webhook support (alternative to polling)

## Resources

- [Full CHANGELOG](CHANGELOG.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Formatting Fix Details](FORMATTING_FIX_2024-12.md)
- [Code Review Summary](CODE_REVIEW_SUMMARY.md)
- [Setup Guide](configure.md)
- [Telegram Bot API Docs](https://core.telegram.org/bots/api)

## Credits

**Developed by**: Enrique (e@co8.com)
**Code Review & Implementation**: Claude Sonnet 4.5
**Repository**: co8-plugins/telegram-plugin

## Support

**Issues**: Report at plugin repository
**Documentation**: See plugin `.claude/` directory
**Questions**: Contact plugin author

---

## Summary

Version 0.2.0 is a significant update that:
- ✅ Fixes critical formatting issues
- ✅ Adds bidirectional communication
- ✅ Improves reliability and security
- ✅ Maintains backward compatibility
- ✅ Provides comprehensive documentation

**Status**: ✅ Ready for Production
**Recommendation**: Update immediately for formatting fixes

---

**Generated**: December 11, 2024
**Version**: 0.2.0
**Commit**: 6405544
