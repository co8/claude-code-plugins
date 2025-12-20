- add features only to the development files of telegram-plugin, not the installed version. then plugin request update
- VERSION UPDATES: replace all mentions in plugin and marketplace files:
  1. .claude-plugin/marketplace.json:19 (root marketplace)
  2. plugins/telegram-plugin/.claude-plugin/marketplace.json:4
  3. plugins/telegram-plugin/.claude-plugin/plugin.json:3
  4. plugins/telegram-plugin/mcp-server/package.json:3
  5. plugins/telegram-plugin/mcp-server/telegram-bot.js:1109
  6. plugins/telegram-plugin/mcp-server/package-lock.json:3,9
