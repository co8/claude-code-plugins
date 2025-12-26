# CC-Plugins Templates

This directory contains templates and tools for creating new Claude Code plugins.

## Quick Start

Create a new plugin using the generator:

```bash
npm run create-plugin
```

The generator will guide you through the setup process with interactive prompts.

## Template Types

### 1. Full-Featured Template (`plugin-template`)

Complete plugin with all components:
- MCP server with modular architecture
- Hook system with Bash library
- Command implementations
- Skill knowledge base
- Comprehensive testing setup
- Full documentation

**Use when:** Building a complex plugin with multiple features

### 2. MCP Server Only (`mcp-only-plugin`)

Minimal plugin with just an MCP server:
- MCP server skeleton
- Tool schema definitions
- Configuration system
- Basic testing

**Use when:** You only need to provide tools to Claude

### 3. Hooks Only (`minimal-plugin`)

Ultra-minimal plugin with just hooks:
- Hook scripts
- Minimal configuration
- Basic documentation

**Use when:** Simple automation that only needs to react to events

## Shared Libraries

The `shared/` directory contains reusable components:

### Configuration (`shared/config/`)
- `config-loader.js` - Load YAML frontmatter configs
- Supports project-local and global configs
- Built-in validation

### Utilities (`shared/utils/`)
- `logger.js` - Structured logging with levels
- `rate-limiter.js` - Sliding window rate limiting

### Hooks (`shared/hooks/`)
- `core.sh` - Common Bash utilities for hooks
- JSON output helpers
- Config reading functions

## Template Structure

```
plugin-template/
├── .claude-plugin/
│   ├── plugin.json.template        # Plugin metadata
│   └── marketplace.json.template   # Marketplace listing
├── .mcp.json.template              # MCP server configuration
├── mcp-server/
│   ├── server.js.template          # Main MCP server
│   ├── package.json.template       # Dependencies
│   ├── config/                     # Configuration loading
│   ├── server/                     # Tool schemas and handlers
│   ├── services/                   # Business logic
│   └── utils/                      # Utilities
├── hooks/
│   ├── hooks.json.template         # Hook definitions
│   └── scripts/                    # Hook implementations
├── commands/                       # Slash commands
├── skills/                         # Knowledge bases
├── tests/                          # Test suites
└── README.md.template              # Documentation
```

## Template Variables

Templates use the following placeholders that are automatically replaced:

- `{{PLUGIN_NAME}}` - Plugin identifier (kebab-case)
- `{{DISPLAY_NAME}}` - Human-readable name
- `{{DESCRIPTION}}` - Short description
- `{{AUTHOR_NAME}}` - Author's name
- `{{AUTHOR_EMAIL}}` - Author's email
- `{{LICENSE}}` - License type (MIT, Apache-2.0, etc.)
- `{{CATEGORY}}` - Plugin category
- `{{VERSION}}` - Initial version (0.1.0)
- `{{YEAR}}` - Current year

## Development Workflow

1. **Create plugin:**
   ```bash
   npm run create-plugin
   ```

2. **Implement features:**
   - Edit MCP tools in `mcp-server/server/handlers.js`
   - Add hook logic in `hooks/scripts/`
   - Create commands in `commands/`

3. **Test:**
   ```bash
   cd plugins/your-plugin/mcp-server
   npm test
   ```

4. **Document:**
   - Update README.md with usage instructions
   - Add examples to commands
   - Document configuration options

5. **Publish:**
   - Update version in all required files
   - Add entry to root marketplace.json
   - Create GitHub release

## Testing Templates

Run template validation tests:

```bash
npm run test:templates
```

This verifies:
- All template directories exist
- Required files are present
- Template placeholders are correct
- JSON structure is valid

## Best Practices

### Configuration
- Use YAML frontmatter in `.claude/*.local.md`
- Support both project-local and global configs
- Validate required fields on startup
- Provide sensible defaults

### Logging
- Use structured JSON logging
- Respect `logging_level` config
- Always log errors
- Include context in log entries

### Error Handling
- Fail gracefully with helpful messages
- Log errors with full context
- Provide troubleshooting hints
- Never expose sensitive data

### Testing
- Aim for 80%+ code coverage
- Test both success and error cases
- Use fixtures for test data
- Mock external dependencies

### Documentation
- Keep README up to date
- Include usage examples
- Document all configuration options
- Provide troubleshooting section

## Adding New Templates

1. Create directory in `templates/`
2. Add required files with `.template` extension
3. Use template variables for customization
4. Add tests in `scripts/test-templates.js`
5. Update this README

## Support

For issues or questions:
- Check the [main documentation](../docs/)
- Review existing plugins for examples
- Open an issue on GitHub

## License

Templates are MIT licensed and free to use for any purpose.
