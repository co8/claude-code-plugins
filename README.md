# Claude Code Plugins by co8

![Plugins](https://img.shields.io/badge/plugins-1-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Maintained](https://img.shields.io/badge/maintained-yes-brightgreen)

A curated collection of Claude Code plugins for enhanced productivity and workflow automation.

## 📦 Available Plugins

### [Telegram Plugin](./plugins/telegram-plugin) ![Version](https://img.shields.io/badge/version-0.3.1-blue)

**Remote interaction with Claude Code via Telegram**

Control and monitor Claude Code remotely via Telegram. Receive smart notifications about task completions, errors, session events, and important insights. Respond to Claude's questions via Telegram inline keyboards from anywhere.

**Features:**

- 🚀 Auto-Setup Detection - Automatic configuration prompts
- 📬 Smart Notifications - Task updates and insights
- ✅ Remote Approvals - Interactive inline keyboards
- 🔔 Keyword Detection - Automatic insight detection
- ⚡ Message Batching - Intelligent notification grouping
- 🎛️ Fully Configurable - Customize all settings

**Quick Start:**

```bash
/telegram-plugin:configure
```

[View Documentation →](./plugins/telegram-plugin/README.md)

---

## 🚀 Installation

Each plugin can be installed independently. Visit the plugin's directory for specific installation instructions.

### General Installation Pattern

1. Clone this repository:

```bash
git clone https://github.com/co8/cc-plugins.git
```

2. Navigate to the desired plugin:

```bash
cd cc-plugins/plugins/<plugin-name>
```

3. Follow the plugin-specific installation instructions in its README.md

## 🛠️ Creating Your Own Plugin

Use our plugin generator to quickly create new plugins with best practices built-in:

```bash
# Clone the repository
git clone https://github.com/co8/cc-plugins.git
cd cc-plugins

# Run the plugin generator
npm run create-plugin
```

The generator provides three template types:

1. **Full-featured** - Complete plugin with MCP server, hooks, commands, and skills
2. **MCP Server Only** - Just an MCP server for providing tools to Claude
3. **Hooks Only (minimal)** - Simple event-driven automation

**Features:**
- 🎨 Interactive setup wizard
- 📦 Automatic dependency installation
- ✅ Built-in testing framework
- 📝 Complete documentation templates
- 🔧 Shared utility libraries (config, logging, rate limiting)

**Documentation:**
- [Plugin Development Guide](./docs/PLUGIN_DEVELOPMENT.md)
- [Template Documentation](./templates/README.md)
- [Scripts Documentation](./scripts/README.md)

**Example workflow:**
```bash
# Create plugin
npm run create-plugin

# Develop
cd plugins/my-awesome-plugin
# Edit mcp-server/server/handlers.js
# Add hooks in hooks/scripts/

# Test
cd mcp-server && npm test

# Use in Claude Code
/my-awesome-plugin:configure
```

## 📦 Plugin Management & Registry

### Plugin Manager CLI

Use the plugin manager CLI to search, discover, and manage plugins from the registry:

```bash
# Install CLI dependencies
cd cli
npm install

# Optional: Link globally for easier access
npm link
```

**Available Commands:**

```bash
# Search for plugins
plugin-manager search <query>

# Get detailed plugin information
plugin-manager info <plugin-name>

# Validate plugin structure
plugin-manager validate <plugin-path>

# List installed plugins
plugin-manager list

# Show help
plugin-manager help
```

**Example Usage:**

```bash
# Search for telegram-related plugins
plugin-manager search telegram

# Get info about telegram-plugin
plugin-manager info telegram-plugin

# Validate your plugin
plugin-manager validate ./plugins/my-plugin
```

### Plugin Registry

The centralized plugin registry provides:

- **Plugin Discovery** - Search and browse available plugins
- **Version Management** - Track multiple plugin versions
- **Integrity Verification** - SHA-512 hash validation
- **Publisher Verification** - Verified plugin authors
- **Metadata** - Categories, tags, ratings, downloads

**Registry Structure:**
- Registry file: `registry/registry.json`
- Schema validation: `registry/schema.json`
- API documentation: [docs/REGISTRY_API.md](./docs/REGISTRY_API.md)

**Publishing Your Plugin:**

1. Create a GitHub release with tarball
2. Generate SHA-512 integrity hash
3. Update `registry/registry.json` with plugin metadata
4. Submit pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed publishing instructions.

### Quick Start Guides

- **[Generator Quick Start](./GENERATOR_QUICKSTART.md)** - Create your first plugin in 30 minutes
- **[Registry Quick Start](./QUICKSTART_REGISTRY.md)** - Get started with the registry in 5 minutes

## 📋 Plugin Structure

Each plugin in this marketplace follows the standard Claude Code plugin structure:

```
plugin-name/
├── .claude-plugin/
│   ├── plugin.json          # Plugin metadata
│   └── marketplace.json     # Marketplace listing info
├── commands/                # Slash commands
├── skills/                  # Knowledge bases
├── agents/                  # Specialized agents
├── hooks/                   # Event hooks
├── mcp-server/             # MCP server (if applicable)
├── README.md               # Plugin documentation
└── LICENSE                 # Plugin license
```

## 🤝 Contributing

Interested in contributing a plugin? We welcome high-quality plugins that enhance the Claude Code experience.

### Plugin Submission Guidelines

1. **Quality Standards**

   - Clear documentation
   - Working examples
   - Proper error handling
   - Security best practices

2. **Required Files**

   - `.claude-plugin/plugin.json`
   - `.claude-plugin/marketplace.json`
   - `README.md` with setup instructions
   - `LICENSE` file

3. **Submission Process**
   - Fork this repository
   - Create your plugin in `plugins/<your-plugin-name>/`
   - Test thoroughly
   - Submit a pull request

## 📄 License

This marketplace repository is licensed under MIT License. Individual plugins may have their own licenses - please check each plugin's LICENSE file.

## 🔗 Links

- [Claude Code Documentation](https://claude.ai/claude-code)
- [Report Issues](https://github.com/co8/cc-plugins/issues)
- [co8 Website](https://co8.com)

## 📬 Contact

**Enrique R Grullon** Email: e@co8.com GitHub: [@co8](https://github.com/co8)

---

Made with ❤️ by co8.com
