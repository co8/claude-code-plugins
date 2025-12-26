# CC-Plugins Registry

Centralized registry for Claude Code plugins, enabling plugin discovery, versioning, and distribution.

## Overview

The CC-Plugins Registry is a JSON-based catalog of all available Claude Code plugins. It provides:

- Plugin metadata and descriptions
- Version management with SemVer
- Download URLs and integrity hashes
- Search and filtering capabilities
- Publisher verification
- Dependency tracking

## Registry Structure

### File: `registry.json`

The main registry file containing all plugin metadata:

```json
{
  "version": "1.0.0",
  "metadata": {
    "last_updated": "2024-12-25T00:00:00.000Z",
    "total_plugins": 1,
    "total_downloads": 0
  },
  "plugins": {
    "plugin-name": {
      "name": "plugin-name",
      "displayName": "Plugin Display Name",
      "description": "Short description",
      "longDescription": "Detailed description with markdown support",
      "author": {
        "name": "Author Name",
        "email": "email@example.com",
        "url": "https://example.com",
        "verified": true
      },
      "license": "MIT",
      "repository": {
        "type": "git",
        "url": "https://github.com/user/repo",
        "directory": "plugins/plugin-name"
      },
      "versions": {
        "1.0.0": {
          "version": "1.0.0",
          "releaseDate": "2024-01-01T00:00:00.000Z",
          "tarball": "https://example.com/plugin-1.0.0.tar.gz",
          "integrity": "sha512-...",
          "dependencies": {},
          "minClaudeVersion": "1.0.0",
          "releaseNotes": "Initial release"
        }
      },
      "latest": "1.0.0",
      "categories": ["notifications", "remote-control"],
      "tags": ["telegram", "notifications"],
      "features": [
        {
          "title": "Feature Name",
          "description": "Feature description",
          "icon": "📬"
        }
      ],
      "downloads": 0,
      "rating": 4.8,
      "verified": true
    }
  }
}
```

### File: `schema.json`

JSON Schema for validating registry structure. See [schema.json](./schema.json) for full specification.

## Plugin Metadata Fields

### Required Fields

- `name` - Unique plugin identifier (kebab-case)
- `displayName` - Human-readable name
- `description` - Short description (10-200 chars)
- `author` - Author information object
- `license` - SPDX license identifier
- `repository` - Repository information
- `versions` - Map of versions to version metadata
- `latest` - Latest stable version
- `categories` - Array of category identifiers (1-3)
- `tags` - Array of searchable tags (1-10)

### Optional Fields

- `longDescription` - Detailed markdown description
- `homepage` - Plugin homepage URL
- `features` - Array of feature objects
- `screenshots` - Array of screenshot URLs
- `downloads` - Total download count
- `rating` - Average user rating (0-5)
- `verified` - Publisher verification status
- `deprecated` - Deprecation flag
- `deprecationMessage` - Deprecation notice

## Version Metadata

Each version entry contains:

- `version` - Semantic version string
- `releaseDate` - ISO 8601 timestamp
- `tarball` - Download URL
- `integrity` - SHA-512 hash for verification
- `dependencies` - Plugin dependencies (optional)
- `peerDependencies` - Peer dependencies (optional)
- `minClaudeVersion` - Minimum Claude Code version
- `minNodeVersion` - Minimum Node.js version
- `releaseNotes` - Markdown release notes
- `breaking` - Breaking changes flag
- `deprecated` - Version deprecation flag

## Categories

Valid plugin categories:

- `notifications` - Notification and alerting plugins
- `remote-control` - Remote control and monitoring
- `productivity` - Productivity enhancements
- `automation` - Automation and workflows
- `communication` - Communication integrations
- `development-tools` - Developer tools
- `testing` - Testing utilities
- `deployment` - Deployment and CI/CD
- `monitoring` - Monitoring and observability
- `security` - Security tools
- `data` - Data management and processing
- `integration` - Third-party integrations
- `utilities` - General utilities
- `other` - Other categories

## Licenses

Supported SPDX license identifiers:

- `MIT`
- `Apache-2.0`
- `BSD-3-Clause`
- `GPL-3.0`
- `ISC`
- `Unlicense`

## Registry API

### Endpoints (Planned)

The registry can be served as a static JSON file or via API:

#### GET /api/plugins

List all plugins.

**Response:**
```json
{
  "plugins": [...]
}
```

#### GET /api/plugins/search?query=telegram

Search for plugins.

**Parameters:**
- `query` - Search query
- `category` - Filter by category
- `tags` - Filter by tags

**Response:**
```json
{
  "results": [...],
  "count": 1
}
```

#### GET /api/plugins/:name

Get plugin details.

**Response:**
```json
{
  "name": "telegram-plugin",
  "displayName": "...",
  ...
}
```

#### GET /api/plugins/:name/:version

Get specific version details.

**Response:**
```json
{
  "version": "0.3.1",
  "releaseDate": "...",
  "tarball": "...",
  ...
}
```

#### GET /api/plugins/:name/:version/download

Download plugin tarball.

**Response:** Binary tarball stream

## CLI Integration

Use the `plugin-manager` CLI to interact with the registry:

### Search Plugins

```bash
plugin-manager search telegram
```

### View Plugin Information

```bash
plugin-manager info telegram-plugin
```

### Install Plugin

```bash
plugin-manager install telegram-plugin
plugin-manager install telegram-plugin 0.3.0  # Specific version
```

### Update Plugin

```bash
plugin-manager update telegram-plugin
```

### List Installed Plugins

```bash
plugin-manager list
```

### Validate Plugin

```bash
plugin-manager validate ./plugins/my-plugin
```

## Publishing Plugins

### Prerequisites

1. Plugin must follow the structure defined in [PLUGIN_TEMPLATES.md](../docs/plans/PLUGIN_TEMPLATES.md)
2. Plugin must have valid `plugin.json` and `marketplace.json`
3. Plugin must pass all validation tests

### Steps to Publish

1. **Prepare Plugin**
   - Ensure all metadata is complete
   - Update version in all required files
   - Write release notes

2. **Create Tarball**
   ```bash
   cd plugins/your-plugin
   tar -czf your-plugin-1.0.0.tar.gz .
   ```

3. **Generate Integrity Hash**
   ```bash
   cat your-plugin-1.0.0.tar.gz | openssl dgst -sha512 -binary | openssl base64 -A
   ```

4. **Upload Tarball**
   - Upload to GitHub Releases
   - Or use CDN of choice

5. **Update Registry**
   - Add plugin entry to `registry.json`
   - Update metadata counts
   - Validate with `plugin-manager validate`

6. **Submit Pull Request**
   - Fork repository
   - Update registry.json
   - Submit PR with description

### Automated Publishing (Future)

Planned CLI command:

```bash
plugin-manager publish ./plugins/my-plugin --version 1.0.0
```

This will:
- Validate plugin structure
- Create tarball
- Generate integrity hash
- Upload to GitHub Releases
- Update registry
- Create PR automatically

## Validation

### Schema Validation

All registry entries are validated against [schema.json](./schema.json):

```bash
cd cli
npm test
```

This runs:
- Registry structure validation
- Plugin metadata validation
- Version validation
- Cross-plugin validation
- Data quality checks

### Manual Validation

Use the CLI to validate plugin structure:

```bash
plugin-manager validate ./plugins/my-plugin
```

## Registry Hosting

### Current: GitHub Raw

The registry is hosted as a static JSON file on GitHub:

```
https://raw.githubusercontent.com/co8/cc-plugins/main/registry/registry.json
```

### Future: API Server

Planned deployment options:

1. **Vercel Functions**
   - Serverless API endpoints
   - Fast global CDN
   - Auto-scaling

2. **GitHub Pages**
   - Static site generation
   - Free hosting
   - Simple deployment

3. **Cloudflare Workers**
   - Edge computing
   - Low latency
   - Global distribution

## Cache Strategy

The CLI implements a smart caching strategy:

- **Cache Location:** `~/.cache/cc-plugins/registry.json`
- **TTL:** 1 hour (3600 seconds)
- **Update Checks:** Force refresh with `update` command
- **Fallback:** Use cache if remote fetch fails

## Security

### Integrity Verification

All plugin versions include SHA-512 integrity hashes:

```json
{
  "integrity": "sha512-AbC123..."
}
```

The CLI verifies downloaded tarballs match the expected hash.

### Publisher Verification

Verified publishers have:
- Email address confirmed
- GitHub account verified
- `verified: true` flag

### Secure Transport

All downloads use HTTPS for:
- Registry fetching
- Tarball downloads
- API requests

## Contribution Guidelines

### Adding a Plugin

1. Fork the repository
2. Add your plugin metadata to `registry.json`
3. Ensure all tests pass: `cd cli && npm test`
4. Submit PR with description

### Updating a Plugin

1. Update version metadata in `registry.json`
2. Upload new tarball to releases
3. Update integrity hash
4. Submit PR

### Registry Maintenance

- Update `metadata.last_updated` on changes
- Keep `metadata.total_plugins` accurate
- Validate before committing
- Follow semantic versioning

## Roadmap

### Phase 1: Foundation (Current)
- ✅ Registry structure defined
- ✅ Schema validation implemented
- ✅ CLI tool created
- ✅ Tests at 100% coverage

### Phase 2: Distribution
- ⬜ Automated publishing workflow
- ⬜ GitHub Actions integration
- ⬜ CDN setup
- ⬜ Rate limiting

### Phase 3: Features
- ⬜ User ratings and reviews
- ⬜ Download analytics
- ⬜ Search improvements
- ⬜ Dependency resolution

### Phase 4: Ecosystem
- ⬜ Web marketplace UI
- ⬜ Plugin discovery
- ⬜ Community features
- ⬜ Plugin monetization

## Support

- **Issues:** [GitHub Issues](https://github.com/co8/cc-plugins/issues)
- **Documentation:** [docs/](../docs/)
- **CLI Help:** `plugin-manager help`

## License

MIT License - See [LICENSE](../LICENSE) for details.
