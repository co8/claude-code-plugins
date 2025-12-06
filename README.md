# Claude Code Plugins by co8

![Plugins](https://img.shields.io/badge/plugins-1-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Maintained](https://img.shields.io/badge/maintained-yes-brightgreen)

A curated collection of Claude Code plugins for enhanced productivity and workflow automation.

## 📦 Available Plugins

### [Telegram Plugin](./plugins/telegram-plugin) ![Version](https://img.shields.io/badge/version-0.1.7-blue)

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
git clone https://github.com/co8/claude-code-plugins.git
```

2. Navigate to the desired plugin:

```bash
cd claude-code-plugins/plugins/<plugin-name>
```

3. Follow the plugin-specific installation instructions in its README.md

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
- [Report Issues](https://github.com/co8/claude-code-plugins/issues)
- [co8 Website](https://co8.com)

## 📬 Contact

**Enrique R Grullon** Email: e@co8.com GitHub: [@co8](https://github.com/co8)

---

Made with ❤️ by co8.com
