# CC-Plugins CLI

Command-line interface for managing Claude Code plugins from the centralized registry.

## Installation

### From Source

```bash
cd cli
npm install
npm link  # Makes 'plugin-manager' and 'cc-plugin' available globally
```

### Usage Without Installation

```bash
node /path/to/cc-plugins/cli/plugin-manager.js <command> [args]
```

## Commands

### Search for Plugins

Search the registry for plugins matching a query:

```bash
plugin-manager search <query>
```

**Examples:**

```bash
plugin-manager search telegram
plugin-manager search notifications
plugin-manager search "remote control"
```

**Output:**

```
Found 1 plugin(s):

Claude Code Telegram Bot
  telegram-plugin@0.3.1
  Remote interaction with Claude Code via Telegram - receive task updates, approval requests, and control sessions from your phone
  Categories: notifications, remote-control, productivity
  Rating: ⭐⭐⭐⭐⭐ (4.8/5)
  ✓ Verified publisher
```

### Show Plugin Information

Display detailed information about a specific plugin:

```bash
plugin-manager info <plugin-name>
```

**Example:**

```bash
plugin-manager info telegram-plugin
```

**Output:**

```
Claude Code Telegram Bot
============================

Remote interaction with Claude Code via Telegram - receive task updates...

Details:
  Name: telegram-plugin
  Latest Version: 0.3.1
  Author: Enrique R Grullon ✓
  License: MIT
  Categories: notifications, remote-control, productivity
  Tags: telegram, bot, remote-control, notifications, mobile, workflow...
  Downloads: 0
  Rating: ⭐⭐⭐⭐⭐ (4.8/5)

Features:
  📬 Smart Notifications
    Get notified about task completions, errors, session events...
  ✅ Remote Approvals
    Respond to Claude's questions via Telegram inline keyboards...

Version 0.3.1:
  Released: 12/20/2024
  Min Claude Code: 1.0.0
  Min Node.js: 18.0.0
  Release Notes: Initial registry release with core features...

Repository: https://github.com/co8/cc-plugins
Homepage: https://github.com/co8/cc-plugins/tree/main/plugins/telegram-plugin

Install:
  plugin-manager install telegram-plugin
```

### Install a Plugin

Install a plugin from the registry:

```bash
plugin-manager install <plugin-name> [version]
```

**Examples:**

```bash
# Install latest version
plugin-manager install telegram-plugin

# Install specific version
plugin-manager install telegram-plugin 0.3.0
```

**Output:**

```
ℹ Downloading telegram-plugin@0.3.1...
ℹ Installing plugin...
✓ Successfully installed telegram-plugin@0.3.1

Quick Start:
  Create a Telegram bot with @BotFather
  Get your chat ID from bot messages
  Run /telegram:configure for guided setup
  Test connection with /telegram:test
```

**Installation Location:**

Plugins are installed to `~/.claude/plugins/` by default. Override with:

```bash
export CC_PLUGINS_DIR=/custom/path
```

### Update a Plugin

Update an installed plugin to the latest version:

```bash
plugin-manager update <plugin-name>
```

**Example:**

```bash
plugin-manager update telegram-plugin
```

**Output:**

```
ℹ Updating telegram-plugin from 0.3.0 to 0.3.1
ℹ Downloading telegram-plugin@0.3.1...
ℹ Installing plugin...
✓ Successfully installed telegram-plugin@0.3.1
```

**Update Checks:**

The update command automatically refreshes the registry cache to ensure you get the latest version information.

### List Installed Plugins

Show all currently installed plugins:

```bash
plugin-manager list
```

**Output:**

```
Installed plugins (1):

telegram-plugin@0.3.1
  Remote interaction with Claude Code via Telegram - receive task updates...
```

### Validate Plugin Structure

Validate a plugin's structure against the schema:

```bash
plugin-manager validate <plugin-path>
```

**Example:**

```bash
plugin-manager validate ./plugins/my-plugin
```

**Output (Success):**

```
✓ Plugin structure is valid
```

**Output (Failure):**

```
✗ Error: Plugin validation failed:
  /categories: should have at least 1 items
  /tags: should have at least 1 items
```

### Help

Display help information:

```bash
plugin-manager help
# or
plugin-manager --help
# or
plugin-manager -h
```

## Environment Variables

### CC_PLUGINS_REGISTRY

Override the default registry URL:

```bash
export CC_PLUGINS_REGISTRY=https://custom-registry.com/registry.json
plugin-manager search telegram
```

**Default:** `https://raw.githubusercontent.com/co8/cc-plugins/main/registry/registry.json`

### CC_PLUGINS_DIR

Override the default plugins installation directory:

```bash
export CC_PLUGINS_DIR=/custom/plugins/dir
plugin-manager install telegram-plugin
```

**Default:** `~/.claude/plugins`

## Cache Management

### Cache Location

The CLI caches the registry file to speed up operations:

```
~/.cache/cc-plugins/registry.json
```

### Cache Behavior

- **TTL:** 1 hour (3600 seconds)
- **Refresh:** Automatic on cache expiration
- **Force Refresh:** Use `update` command
- **Fallback:** Uses cache if remote fetch fails

### Clear Cache

To force a fresh registry fetch, delete the cache:

```bash
rm ~/.cache/cc-plugins/registry.json
plugin-manager search telegram  # Will fetch fresh registry
```

## Exit Codes

The CLI uses standard exit codes:

- `0` - Success
- `1` - Error (invalid command, plugin not found, validation failed, etc.)

## Examples

### Install Workflow

```bash
# Search for plugins
plugin-manager search telegram

# Get detailed information
plugin-manager info telegram-plugin

# Install the plugin
plugin-manager install telegram-plugin

# Verify installation
plugin-manager list
```

### Update Workflow

```bash
# Check for updates (manual check)
plugin-manager info telegram-plugin

# Update to latest
plugin-manager update telegram-plugin

# Verify new version
plugin-manager list
```

### Development Workflow

```bash
# Create a new plugin
mkdir -p plugins/my-plugin/.claude-plugin
cd plugins/my-plugin

# ... develop plugin ...

# Validate structure
plugin-manager validate .

# Test locally
ln -s $(pwd) ~/.claude/plugins/my-plugin

# Verify
plugin-manager list
```

## Troubleshooting

### Cannot Fetch Registry

**Error:**
```
✗ Error: Failed to fetch registry: HTTP 404
```

**Solutions:**
1. Check internet connection
2. Verify registry URL is accessible
3. Check if cache exists: `ls ~/.cache/cc-plugins/`
4. Use custom registry: `export CC_PLUGINS_REGISTRY=...`

### Plugin Not Found

**Error:**
```
✗ Error: Plugin "xyz" not found in registry
```

**Solutions:**
1. Search for correct plugin name: `plugin-manager search xyz`
2. Check spelling and case sensitivity
3. Refresh registry cache: `rm ~/.cache/cc-plugins/registry.json`

### Installation Failed

**Error:**
```
✗ Error: Failed to install plugin: EACCES: permission denied
```

**Solutions:**
1. Check permissions on plugins directory
2. Create directory: `mkdir -p ~/.claude/plugins`
3. Fix permissions: `chmod 755 ~/.claude/plugins`
4. Use custom directory: `export CC_PLUGINS_DIR=/writable/path`

### Validation Failed

**Error:**
```
✗ Error: Plugin validation failed
```

**Solutions:**
1. Review validation errors carefully
2. Check plugin.json format
3. Ensure all required fields are present
4. Validate against schema: [registry/schema.json](../registry/schema.json)

## API Usage

The CLI can be imported as a module in Node.js:

```javascript
import {
  fetchRegistry,
  searchPlugins,
  showPluginInfo,
  installPlugin,
  updatePlugin,
  listInstalledPlugins,
  validatePlugin
} from '@cc-plugins/cli';

// Fetch registry
const registry = await fetchRegistry();

// Search plugins
await searchPlugins('telegram');

// Install plugin
await installPlugin('telegram-plugin', 'latest');
```

## Testing

Run the test suite:

```bash
cd cli
npm test
```

**Test Coverage:**

- ✅ Registry fetching and caching
- ✅ Plugin search functionality
- ✅ Plugin information retrieval
- ✅ Plugin validation
- ✅ Version management
- ✅ Metadata validation
- ✅ Error handling

**Total Tests:** 56
**Coverage:** 100%

## Development

### Project Structure

```
cli/
├── plugin-manager.js      # Main CLI script
├── package.json           # Package configuration
├── README.md             # This file
└── tests/
    ├── registry-validation.test.js  # Registry validation tests
    └── plugin-manager.test.js       # CLI functionality tests
```

### Adding New Commands

1. Add command handler in `plugin-manager.js`
2. Update help text
3. Add tests in `tests/plugin-manager.test.js`
4. Update this README

### Running Tests During Development

```bash
# Run all tests
npm test

# Run with verbose output
npm test -- --reporter=spec

# Run specific test file
node --test tests/registry-validation.test.js
```

## Roadmap

### v1.1.0 (Next Release)
- [ ] Colored output improvements
- [ ] Progress bars for downloads
- [ ] Interactive plugin selection
- [ ] Auto-update check on CLI start

### v1.2.0
- [ ] Plugin publishing command
- [ ] Dependency resolution
- [ ] Plugin removal command
- [ ] Rollback to previous version

### v2.0.0
- [ ] Plugin development scaffolding
- [ ] Testing utilities
- [ ] Plugin debugging tools
- [ ] CI/CD integration

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## License

MIT License - See [LICENSE](../LICENSE) for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/co8/cc-plugins/issues)
- **Documentation:** [registry/README.md](../registry/README.md)
- **Roadmap:** [docs/plans/ROADMAP.md](../docs/plans/ROADMAP.md)
