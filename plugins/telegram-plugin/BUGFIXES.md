# Telegram Plugin Bug Fixes

## 2025-12-06 - Regex Bug in escapeMarkdown Function

### Issue
The `escapeMarkdown()` function in `mcp-server/telegram-bot.js` had an invalid regular expression that caused crashes when processing approval requests.

**Error Message:**
```
Invalid regular expression: /\\[/g: Unterminated character class
```

### Root Cause
The function was attempting to build regex patterns dynamically by concatenating strings:

```javascript
// BROKEN CODE (line 105)
for (const char of specialChars) {
  escaped = escaped.replace(new RegExp('\\\\' + char, 'g'), '\\\\' + char);
}
```

When `char` was `[`, this created the pattern `/\\[/g`, which has an unterminated character class because `[` is a special regex character that needs to be escaped in the pattern itself.

### Fix
Replaced the loop-based approach with a single regex using a character class and proper escaping:

```javascript
// FIXED CODE (lines 97-103)
function escapeMarkdown(text) {
  if (typeof text !== 'string') return '';

  // Escape special Markdown characters for Telegram MarkdownV2
  // Need to escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
}
```

**Key improvements:**
1. Single regex pattern instead of multiple replaces
2. Proper escaping of `[` and `]` within the character class (`\[` and `\]`)
3. Uses `$&` to reference the matched character for replacement
4. More efficient (single pass vs multiple passes)

### Impact
- **Before:** `send_approval_request` tool would crash with regex error
- **After:** Approval requests with buttons work correctly

### Files Modified
- `mcp-server/telegram-bot.js` (lines 96-103)

### Testing
To test the fix:

1. Reconnect MCP server: `/mcp`
2. Send approval request:
   ```javascript
   mcp__plugin_telegram-plugin_telegram-bot__send_approval_request({
     question: "Test question?",
     header: "Test",
     options: [
       {label: "Option 1", description: "First choice"},
       {label: "Option 2", description: "Second choice"}
     ]
   })
   ```
3. Verify message appears in Telegram with inline keyboard buttons
4. Click a button and verify response is captured

### Related Issues
None - this was discovered during initial testing of the approval request feature.

### Future Improvements
Consider additional validation:
- Maximum number of options (Telegram limits inline keyboard size)
- Maximum text length for labels and descriptions
- Proper handling of MarkdownV2 vs Markdown parse modes
