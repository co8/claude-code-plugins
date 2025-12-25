# Plugin Generator Quick Start

**Create your first Claude Code plugin in under 30 minutes!**

## Prerequisites

- Node.js 18+ installed
- Git (optional, for cloning)
- Text editor

## Installation

```bash
# Clone the repository
git clone https://github.com/co8/cc-plugins.git
cd cc-plugins
```

## Create Your First Plugin

### Step 1: Run the Generator

```bash
npm run create-plugin
```

### Step 2: Answer the Prompts

```
🚀 Claude Code Plugin Generator

Plugin name (kebab-case): my-first-plugin
Display name (My First Plugin): ⏎
Short description: A simple plugin to learn the system
Author name: Your Name
Author email: you@example.com

License:
  1. MIT
  2. Apache-2.0
  3. GPL-3.0
  4. BSD-3-Clause
  5. ISC
Enter your choice (1-5): 1

Template type:
  1. Full-featured (MCP + Hooks + Commands + Skills)
  2. MCP Server Only
  3. Hooks Only (minimal)
Enter your choice (1-3): 1

Plugin category:
  1. Productivity
  2. Development Tools
  3. Communication
  4. Integration
  5. Testing
  6. Documentation
  7. Other
Enter your choice (1-7): 1
```

### Step 3: Wait for Setup

The generator will:
1. ✓ Create plugin directory
2. ✓ Copy template files
3. ✓ Replace placeholders with your info
4. ✓ Make scripts executable
5. ✓ Install npm dependencies
6. ✓ Add to marketplace

### Step 4: Navigate to Your Plugin

```bash
cd plugins/my-first-plugin
```

## Project Structure

Your new plugin has this structure:

```
my-first-plugin/
├── .claude-plugin/
│   ├── plugin.json              # Plugin metadata
│   └── marketplace.json         # Marketplace info
├── .mcp.json                    # MCP server config
├── mcp-server/
│   ├── server.js                # Main entry point
│   ├── package.json             # Dependencies
│   ├── config/
│   │   └── config-loader.js     # Config loading
│   ├── server/
│   │   ├── schemas.js           # Tool definitions
│   │   └── handlers.js          # Tool implementations
│   └── utils/
│       └── logger.js            # Logging
├── hooks/
│   ├── hooks.json               # Hook definitions
│   └── scripts/
│       ├── lib/core.sh          # Utilities
│       ├── session-start.sh     # Session start hook
│       └── session-end.sh       # Session end hook
├── commands/
│   └── configure.md             # Configuration command
├── tests/
│   └── config.test.js           # Tests
└── README.md                    # Documentation
```

## Next Steps

### 1. Implement Your First Tool

Edit `mcp-server/server/schemas.js`:

```javascript
export const TOOLS = [
  {
    name: "my-first-plugin:greet",
    description: "Greets the user",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name to greet"
        }
      },
      required: ["name"]
    }
  }
];
```

Edit `mcp-server/server/handlers.js`:

```javascript
export async function handleToolCall(request, config) {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "my-first-plugin:greet":
      return handleGreet(args, config);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleGreet(args, config) {
  const { name } = args;
  const greeting = `Hello, ${name}! Welcome to your first plugin.`;

  return {
    content: [
      {
        type: "text",
        text: greeting
      }
    ]
  };
}
```

### 2. Add Configuration

Create config file at `~/.claude/my-first-plugin.local.md`:

```yaml
---
greeting_style: friendly
logging_level: errors
---

# My First Plugin Configuration

This is your plugin's configuration file.
```

### 3. Test Your Plugin

```bash
cd mcp-server
npm test
```

### 4. Try It in Claude Code

In Claude Code, run:
```
/my-first-plugin:configure
```

Then ask Claude to use your tool:
```
Use the my-first-plugin:greet tool to greet John
```

## Common Tasks

### Add a New Hook

1. Edit `hooks/hooks.json`:
```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "script": "scripts/post-tool.sh",
      "description": "Log tool usage"
    }
  ]
}
```

2. Create `hooks/scripts/post-tool.sh`:
```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/core.sh"

# Log the tool usage
log_info "Tool used: $TOOL_NAME"

json_success "Logged tool usage"
```

3. Make it executable:
```bash
chmod +x hooks/scripts/post-tool.sh
```

### Add a Command

Create `commands/status.md`:
```markdown
---
name: status
description: Show plugin status
---

# Plugin Status

Your plugin is running! Here's the current status:

- Configuration: Loaded
- Logging: Enabled
- Version: 0.3.1
```

### Add Tests

Create `tests/greet.test.js`:
```javascript
import { describe, test, expect } from '@jest/globals';
import { handleToolCall } from '../mcp-server/server/handlers.js';

describe('Greet Tool', () => {
  test('greets user by name', async () => {
    const request = {
      params: {
        name: 'my-first-plugin:greet',
        arguments: { name: 'Alice' }
      }
    };

    const config = {};
    const result = await handleToolCall(request, config);

    expect(result.content[0].text).toContain('Alice');
  });
});
```

Run tests:
```bash
cd mcp-server && npm test
```

## Template Types

### Full-Featured (What you just created)
- ✅ MCP server with tools
- ✅ Hook system
- ✅ Commands
- ✅ Skills scaffolding
- ✅ Testing framework
- ✅ Complete documentation

**Best for:** Complex plugins with multiple features

### MCP Server Only
- ✅ MCP server with tools
- ✅ Configuration system
- ✅ Basic testing

**Best for:** Plugins that only provide tools

### Hooks Only (Minimal)
- ✅ Hook scripts
- ✅ Minimal config

**Best for:** Simple event-driven automation

## Tips & Tricks

### Configuration Best Practices
- Use YAML frontmatter in `.claude/*.local.md`
- Support both project-local and global configs
- Validate required fields on startup

### Logging
- Use `log('info', ...)` for debugging
- Use `log('error', ...)` for errors
- Respect `logging_level` config setting

### Error Handling
- Always catch errors in handlers
- Provide helpful error messages
- Log errors with context

### Testing
- Write tests as you develop
- Aim for 80%+ coverage
- Test both success and error cases

## Troubleshooting

### "Configuration file not found"
Create the config file:
```bash
mkdir -p ~/.claude
cat > ~/.claude/my-first-plugin.local.md << 'EOF'
---
logging_level: all
---
EOF
```

### "npm install failed"
Install dependencies manually:
```bash
cd plugins/my-first-plugin/mcp-server
npm install
```

### Hook script not working
Make sure it's executable:
```bash
chmod +x hooks/scripts/*.sh
```

## Resources

- [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md) - Complete guide
- [Template Documentation](templates/README.md) - Template system docs
- [Example Plugin](plugins/telegram-plugin/) - Real-world example
- [Scripts Documentation](scripts/README.md) - Generator details

## What's Next?

### Level Up Your Plugin

1. **Add more tools** - Expand functionality
2. **Improve hooks** - React to more events
3. **Create skills** - Help Claude understand your plugin
4. **Write docs** - Update README with examples
5. **Share it** - Submit to marketplace

### Contribute to Ecosystem

1. **Test thoroughly** - Ensure quality
2. **Document well** - Help others
3. **Follow standards** - Use templates
4. **Share knowledge** - Write guides
5. **Help others** - Answer questions

## Success!

You've created your first Claude Code plugin! 🎉

The plugin system gives you unlimited potential to extend Claude Code. Build something amazing!

---

**Need help?** Check the [documentation](docs/) or open an issue on GitHub.

**Ready to share?** Submit your plugin to the marketplace!

**Happy coding!** 🚀
