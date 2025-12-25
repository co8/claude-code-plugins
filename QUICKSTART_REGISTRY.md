# Quick Start: Plugin Registry

Get started with the CC-Plugins Registry in 5 minutes.

## Installation

### 1. Install CLI Dependencies

```bash
cd cli
npm install
```

### 2. Make CLI Executable (Optional)

```bash
# Link globally
npm link

# OR use directly
alias plugin-manager='node /path/to/cc-plugins/cli/plugin-manager.js'
```

## Basic Usage

### Search for Plugins

```bash
plugin-manager search telegram
```

**Output:**
```
Found 1 plugin(s):

Claude Code Telegram Bot
  telegram-plugin@0.3.1
  Remote interaction with Claude Code via Telegram...
  Categories: notifications, remote-control, productivity
  Rating: ⭐⭐⭐⭐⭐ (4.8/5)
  ✓ Verified publisher
```

### Get Plugin Information

```bash
plugin-manager info telegram-plugin
```

**Shows:**
- Complete plugin details
- Feature list
- Version information
- Installation instructions
- Author information

### Validate Plugin Structure

```bash
plugin-manager validate ./plugins/telegram-plugin
```

**Output:**
```
✓ Plugin structure is valid
```

### List Installed Plugins

```bash
plugin-manager list
```

## Testing

Run the complete test suite:

```bash
cd cli
npm test
```

**Expected:**
```
# tests 56
# suites 15
# pass 56
# fail 0
```

## Development

### Add a New Plugin to Registry

1. **Create Plugin Metadata**

Edit `registry/registry.json`:

```json
{
  "plugins": {
    "your-plugin": {
      "name": "your-plugin",
      "displayName": "Your Plugin",
      "description": "What your plugin does",
      "author": {
        "name": "Your Name",
        "email": "you@example.com"
      },
      "license": "MIT",
      "repository": {
        "type": "git",
        "url": "https://github.com/you/repo"
      },
      "versions": {
        "1.0.0": {
          "version": "1.0.0",
          "releaseDate": "2024-12-25T00:00:00.000Z",
          "tarball": "https://github.com/you/repo/releases/download/v1.0.0/your-plugin-1.0.0.tar.gz",
          "integrity": "sha512-your-hash-here",
          "minClaudeVersion": "1.0.0"
        }
      },
      "latest": "1.0.0",
      "categories": ["utilities"],
      "tags": ["your", "tags"]
    }
  }
}
```

2. **Validate**

```bash
cd cli
npm test
```

3. **Submit PR**

```bash
git add registry/registry.json
git commit -m "Add your-plugin to registry"
git push origin add-your-plugin
```

## File Structure

```
cc-plugins/
├── registry/
│   ├── registry.json      # Main registry
│   ├── schema.json        # Validation schema
│   └── README.md          # Documentation
│
├── cli/
│   ├── plugin-manager.js  # CLI tool
│   ├── package.json       # Dependencies
│   └── tests/             # Test suite
│
└── docs/
    ├── REGISTRY_API.md            # API reference
    └── STEP3_IMPLEMENTATION.md    # Implementation details
```

## Common Commands

```bash
# Search
plugin-manager search <query>

# Info
plugin-manager info <plugin-name>

# Validate
plugin-manager validate <plugin-path>

# List
plugin-manager list

# Help
plugin-manager help
```

## Environment Variables

```bash
# Custom registry URL
export CC_PLUGINS_REGISTRY=https://custom-url.com/registry.json

# Custom plugins directory
export CC_PLUGINS_DIR=/path/to/plugins
```

## Cache Management

**Cache Location:** `~/.cache/cc-plugins/registry.json`

**Clear Cache:**
```bash
rm ~/.cache/cc-plugins/registry.json
```

## Next Steps

- Read full documentation: [registry/README.md](registry/README.md)
- Explore CLI features: [cli/README.md](cli/README.md)
- API reference: [docs/REGISTRY_API.md](docs/REGISTRY_API.md)
- Implementation details: [docs/STEP3_IMPLEMENTATION.md](docs/STEP3_IMPLEMENTATION.md)

## Support

- **Issues:** [GitHub Issues](https://github.com/co8/cc-plugins/issues)
- **Roadmap:** [docs/plans/ROADMAP.md](docs/plans/ROADMAP.md)

## License

MIT - See [LICENSE](LICENSE)
