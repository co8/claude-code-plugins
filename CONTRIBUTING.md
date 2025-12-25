# Contributing to CC-Plugins

Thank you for your interest in contributing to the Claude Code Plugins ecosystem! This guide will help you contribute high-quality plugins and improvements.

## Table of Contents

- [Getting Started](#getting-started)
- [Plugin Contribution Guidelines](#plugin-contribution-guidelines)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Submission Process](#submission-process)
- [Publishing to Registry](#publishing-to-registry)
- [Code Review Process](#code-review-process)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Git
- Basic understanding of Claude Code plugin architecture
- Familiarity with MCP (Model Context Protocol) for server-based plugins

### Development Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/YOUR-USERNAME/cc-plugins.git
cd cc-plugins
```

2. Create a new branch:
```bash
git checkout -b add-my-plugin
```

3. Use the plugin generator:
```bash
npm run create-plugin
```

## Plugin Contribution Guidelines

### Quality Standards

All plugins must meet these minimum standards:

#### 1. **Functionality**
- ✅ Plugin must work as described in documentation
- ✅ No critical bugs or security vulnerabilities
- ✅ Graceful error handling and user-friendly error messages
- ✅ Proper resource cleanup (no memory leaks)

#### 2. **Security**
- ✅ No hardcoded credentials or secrets
- ✅ Input validation for all user-provided data
- ✅ Sensitive data must be stored securely (use config files, not code)
- ✅ Dependencies must be from trusted sources and up-to-date
- ✅ Follow OWASP security best practices

#### 3. **Performance**
- ✅ Minimal startup time (< 1 second for MCP servers)
- ✅ Efficient resource usage (memory, CPU, network)
- ✅ Rate limiting for external API calls
- ✅ Proper caching where appropriate

#### 4. **User Experience**
- ✅ Clear configuration documentation
- ✅ Helpful error messages with actionable advice
- ✅ Progress indicators for long-running operations
- ✅ Sensible defaults (minimize required configuration)

## Code Standards

### JavaScript/Node.js

```javascript
// Use ES modules
import { something } from './module.js';

// Use modern JavaScript features
const result = await fetchData();

// Proper error handling
try {
  await operation();
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  throw new Error(`Failed to complete operation: ${error.message}`);
}

// Use structured logging
log('info', 'Processing started', { itemCount: items.length });

// Document complex functions
/**
 * Processes batch of items with rate limiting
 * @param {Array} items - Items to process
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Processing results
 */
async function processBatch(items, config) {
  // Implementation
}
```

### Bash Scripts

```bash
#!/bin/bash
set -euo pipefail  # Fail on errors, undefined variables, pipe failures

# Use the shared utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/core.sh"

# Structured output
log_info "Processing started"

# Error handling
if ! command_exists "required-tool"; then
  log_error "Required tool not found: required-tool"
  json_error "Missing dependency: required-tool"
  exit 1
fi

# Always return JSON for hook scripts
json_success "Operation completed"
```

### File Structure

Follow the standard plugin structure:

```
my-plugin/
├── .claude-plugin/
│   ├── plugin.json          # Required: Plugin metadata
│   └── marketplace.json     # Required: Marketplace info
├── mcp-server/              # Optional: MCP server
│   ├── server.js
│   ├── package.json
│   └── server/
├── hooks/                   # Optional: Hook scripts
│   ├── hooks.json
│   └── scripts/
├── commands/                # Optional: Slash commands
├── skills/                  # Optional: Knowledge bases
├── tests/                   # Required: Test suite
├── docs/                    # Recommended: Additional docs
├── README.md                # Required: Plugin documentation
├── LICENSE                  # Required: License file
├── CHANGELOG.md             # Recommended: Version history
└── .gitignore              # Required: Ignore patterns
```

## Testing Requirements

### Minimum Test Coverage

- ✅ **80%+ code coverage** for MCP server code
- ✅ All public functions must have tests
- ✅ Both success and error cases covered
- ✅ Edge cases and boundary conditions tested

### Test Structure

```javascript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('Feature Name', () => {
  let testContext;

  beforeEach(() => {
    // Setup
    testContext = createTestContext();
  });

  afterEach(() => {
    // Cleanup
    testContext.cleanup();
  });

  test('should handle normal case', async () => {
    const result = await feature.execute(validInput);
    expect(result.success).toBe(true);
  });

  test('should handle error case gracefully', async () => {
    await expect(feature.execute(invalidInput))
      .rejects
      .toThrow('Expected error message');
  });

  test('should validate input', async () => {
    const result = await feature.execute(malformedInput);
    expect(result.error).toBeDefined();
  });
});
```

### Running Tests

```bash
cd my-plugin/mcp-server
npm test                 # Run all tests
npm test -- --coverage   # With coverage report
npm test -- --watch      # Watch mode
```

## Documentation Requirements

### README.md

Every plugin must have a comprehensive README with:

1. **Header**
   - Plugin name
   - Brief description (1-2 sentences)
   - Badges (version, license, status)

2. **Features**
   - Bullet list of key features
   - What problems it solves

3. **Installation**
   - Step-by-step setup instructions
   - Configuration requirements
   - Dependencies

4. **Usage**
   - Basic usage examples
   - Common use cases
   - Screenshots/examples (if applicable)

5. **Configuration**
   - All configuration options documented
   - Default values shown
   - Example configuration file

6. **API/Tools Reference** (for MCP plugins)
   - List of all tools provided
   - Parameters and return values
   - Usage examples

7. **Hooks Reference** (for hook-based plugins)
   - List of all hooks
   - When they trigger
   - Expected behavior

8. **Troubleshooting**
   - Common issues and solutions
   - How to get help

9. **Contributing**
   - Link to CONTRIBUTING.md
   - Development setup

10. **License**
    - License type
    - Copyright notice

### Code Comments

- Use JSDoc for all exported functions
- Explain "why" not "what" in comments
- Document non-obvious behavior
- Add TODO comments for known issues

## Submission Process

### 1. Pre-Submission Checklist

Before submitting, ensure:

- [ ] Plugin works end-to-end
- [ ] All tests pass (`npm test`)
- [ ] Code passes linting (if applicable)
- [ ] Documentation is complete
- [ ] No sensitive data in code or git history
- [ ] LICENSE file included
- [ ] README.md is comprehensive
- [ ] `.gitignore` excludes node_modules, secrets, etc.

### 2. Create Pull Request

```bash
# Commit your changes
git add plugins/my-plugin
git commit -m "Add my-plugin: Brief description"

# Push to your fork
git push origin add-my-plugin

# Create PR on GitHub
```

### 3. Pull Request Template

Use this template for your PR description:

```markdown
## Plugin Name

Brief description of what the plugin does.

## Type of Plugin

- [ ] MCP Server
- [ ] Hooks
- [ ] Commands
- [ ] Skills
- [ ] Full-featured (multiple components)

## Features

- Feature 1
- Feature 2
- Feature 3

## Testing

- [ ] All tests pass
- [ ] Tested in real Claude Code session
- [ ] Tested error handling
- [ ] Coverage > 80%

## Documentation

- [ ] README.md complete
- [ ] Configuration documented
- [ ] Usage examples included
- [ ] Troubleshooting guide included

## Checklist

- [ ] No security vulnerabilities
- [ ] No hardcoded secrets
- [ ] Follows code standards
- [ ] License included (MIT recommended)
- [ ] Works with latest Claude Code version

## Screenshots/Examples

[Optional: Add screenshots or example output]

## Additional Notes

[Any other information reviewers should know]
```

## Publishing to Registry

Once your plugin is merged, follow these steps to publish to the registry:

### 1. Create Release

```bash
# Tag the release
git tag -a my-plugin-v1.0.0 -m "Release my-plugin v1.0.0"
git push origin my-plugin-v1.0.0

# Create GitHub release
gh release create my-plugin-v1.0.0 \
  --title "my-plugin v1.0.0" \
  --notes "Initial release"
```

### 2. Generate Tarball

```bash
cd plugins/my-plugin
tar -czf my-plugin-1.0.0.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  .
```

### 3. Upload to GitHub Release

```bash
gh release upload my-plugin-v1.0.0 my-plugin-1.0.0.tar.gz
```

### 4. Calculate Integrity Hash

```bash
sha512sum my-plugin-1.0.0.tar.gz
# Copy the hash for registry.json
```

### 5. Update Registry

Edit `registry/registry.json`:

```json
{
  "plugins": {
    "my-plugin": {
      "name": "my-plugin",
      "displayName": "My Plugin",
      "description": "What it does",
      "author": {
        "name": "Your Name",
        "email": "you@example.com"
      },
      "license": "MIT",
      "repository": {
        "type": "git",
        "url": "https://github.com/co8/cc-plugins"
      },
      "versions": {
        "1.0.0": {
          "version": "1.0.0",
          "releaseDate": "2024-12-25T00:00:00.000Z",
          "tarball": "https://github.com/co8/cc-plugins/releases/download/my-plugin-v1.0.0/my-plugin-1.0.0.tar.gz",
          "integrity": "sha512-YOUR_HASH_HERE",
          "minClaudeVersion": "1.0.0"
        }
      },
      "latest": "1.0.0",
      "categories": ["productivity"],
      "tags": ["automation", "workflow"]
    }
  }
}
```

### 6. Submit Registry PR

```bash
git add registry/registry.json
git commit -m "Add my-plugin v1.0.0 to registry"
git push origin add-my-plugin-to-registry
```

## Code Review Process

### What Reviewers Check

1. **Functionality**: Does it work as described?
2. **Code Quality**: Is it well-written and maintainable?
3. **Security**: Are there any vulnerabilities?
4. **Tests**: Adequate coverage and quality?
5. **Documentation**: Clear and complete?
6. **Performance**: Efficient resource usage?

### Review Timeline

- Initial review: Within 3-5 business days
- Follow-up reviews: Within 2 business days
- Merge: After all feedback addressed and approval received

### Addressing Feedback

- Respond to all review comments
- Make requested changes in new commits
- Mark conversations as resolved when fixed
- Be respectful and collaborative

## Plugin Categories

Choose the most appropriate category for your plugin:

- **productivity** - Time-saving and workflow tools
- **development** - Developer tools and utilities
- **communication** - Messaging and collaboration
- **integration** - Third-party service integrations
- **testing** - Testing and quality assurance
- **documentation** - Documentation generation and management
- **ai-tools** - AI and machine learning utilities
- **data** - Data processing and analysis
- **automation** - Workflow automation
- **monitoring** - System and application monitoring
- **security** - Security and privacy tools
- **utilities** - General utilities
- **other** - Other categories

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License, unless you explicitly specify a different license for your plugin.

Individual plugins may use different licenses (MIT, Apache-2.0, GPL-3.0, etc.), but they must include a LICENSE file.

## Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/co8/cc-plugins/discussions)
- **Bugs**: Open a [GitHub Issue](https://github.com/co8/cc-plugins/issues)
- **Discord**: Join our community (coming soon)
- **Email**: e@co8.com

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help newcomers
- Focus on the best outcome for the project
- Assume good intent

## Recognition

Contributors will be:
- Listed in plugin README.md
- Mentioned in release notes
- Added to CONTRIBUTORS.md

Thank you for contributing to CC-Plugins! Together we're building an amazing ecosystem for Claude Code. 🚀
