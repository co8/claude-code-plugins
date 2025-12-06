# Claude Code Plugins by co8

A curated collection of Claude Code plugins for enhanced productivity and workflow automation.

## 📦 Available Plugins

### [Telegram Plugin](./plugins/telegram-plugin)

**Remote interaction with Claude Code via Telegram**

Control and monitor Claude Code remotely via Telegram. Receive smart notifications about task completions, errors, session events, and important insights. Respond to Claude's questions via Telegram inline keyboards from anywhere.

**Features:**

- 📬 Smart Notifications
- ✅ Remote Approvals via inline keyboards
- 🔔 Keyword Detection for insights
- ⚡ Intelligent message batching
- 🎛️ Fully configurable settings

**Quick Start:**

```bash
/telegram:configure
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
- [CO8 Website](https://co8.com)

## 📬 Contact

**Enrique R Grullon** Email: e@co8.com GitHub: [@co8](https://github.com/co8)

---

Made with ❤️ by CO8
