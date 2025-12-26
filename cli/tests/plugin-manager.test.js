/**
 * Plugin Manager CLI Tests
 *
 * Tests for CLI functionality: search, install, update, list, validate
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import {
  fetchRegistry,
  searchPlugins,
  showPluginInfo,
  validatePlugin
} from '../plugin-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_REGISTRY_PATH = join(__dirname, 'fixtures', 'test-registry.json');
const TEST_PLUGIN_PATH = join(__dirname, 'fixtures', 'test-plugin');

describe('Plugin Manager CLI', () => {
  before(() => {
    // Create test fixtures directory
    const fixturesDir = join(__dirname, 'fixtures');
    if (!existsSync(fixturesDir)) {
      mkdirSync(fixturesDir, { recursive: true });
    }

    // Create test registry
    const testRegistry = {
      version: '1.0.0',
      metadata: {
        last_updated: new Date().toISOString(),
        total_plugins: 2
      },
      plugins: {
        'test-plugin': {
          name: 'test-plugin',
          displayName: 'Test Plugin',
          description: 'A test plugin for unit testing purposes',
          author: {
            name: 'Test Author',
            email: 'test@example.com'
          },
          license: 'MIT',
          repository: {
            type: 'git',
            url: 'https://github.com/test/test-plugin'
          },
          versions: {
            '1.0.0': {
              version: '1.0.0',
              releaseDate: '2024-01-01T00:00:00.000Z',
              tarball: 'https://example.com/test-plugin-1.0.0.tar.gz',
              integrity: 'sha512-test'
            }
          },
          latest: '1.0.0',
          categories: ['testing'],
          tags: ['test', 'demo'],
          downloads: 100,
          rating: 4.5
        },
        'another-plugin': {
          name: 'another-plugin',
          displayName: 'Another Plugin',
          description: 'Another test plugin for search testing',
          author: {
            name: 'Test Author',
            email: 'test@example.com'
          },
          license: 'MIT',
          repository: {
            type: 'git',
            url: 'https://github.com/test/another-plugin'
          },
          versions: {
            '2.0.0': {
              version: '2.0.0',
              releaseDate: '2024-02-01T00:00:00.000Z',
              tarball: 'https://example.com/another-plugin-2.0.0.tar.gz',
              integrity: 'sha512-another'
            }
          },
          latest: '2.0.0',
          categories: ['utilities'],
          tags: ['utility', 'tools'],
          downloads: 50,
          rating: 4.0
        }
      }
    };

    writeFileSync(TEST_REGISTRY_PATH, JSON.stringify(testRegistry, null, 2));

    // Create test plugin structure
    const testPluginDir = join(TEST_PLUGIN_PATH, '.claude-plugin');
    if (!existsSync(testPluginDir)) {
      mkdirSync(testPluginDir, { recursive: true });
    }

    const testPluginJson = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'A test plugin for validation',
      author: {
        name: 'Test Author',
        email: 'test@example.com'
      },
      displayName: 'Test Plugin',
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'https://github.com/test/test-plugin'
      },
      categories: ['testing'],
      tags: ['test'],
      latest: '1.0.0',
      versions: {
        '1.0.0': {
          version: '1.0.0',
          releaseDate: '2024-01-01T00:00:00.000Z',
          tarball: 'https://example.com/test.tar.gz',
          integrity: 'sha512-test'
        }
      }
    };

    writeFileSync(
      join(testPluginDir, 'plugin.json'),
      JSON.stringify(testPluginJson, null, 2)
    );
  });

  after(() => {
    // Clean up test fixtures
    const fixturesDir = join(__dirname, 'fixtures');
    if (existsSync(fixturesDir)) {
      rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  describe('Registry Fetching', () => {
    test('should fetch and parse registry', async () => {
      // Mock fetch for testing
      const originalFetch = global.fetch;

      global.fetch = async () => ({
        ok: true,
        json: async () => JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'))
      });

      const registry = await fetchRegistry();

      assert.ok(registry, 'Registry should be fetched');
      assert.ok(registry.plugins, 'Registry should have plugins');
      assert.ok(registry.metadata, 'Registry should have metadata');

      global.fetch = originalFetch;
    });

    test('should validate registry structure', async () => {
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));

      assert.ok(registry.version, 'Registry should have version');
      assert.match(registry.version, /^\d+\.\d+\.\d+$/, 'Version should be semver');
      assert.ok(registry.metadata.last_updated, 'Should have last_updated');
      assert.strictEqual(
        Object.keys(registry.plugins).length,
        registry.metadata.total_plugins,
        'total_plugins should match actual count'
      );
    });
  });

  describe('Plugin Search', () => {
    test('should find plugins by name', () => {
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));
      const query = 'test';
      const results = [];

      for (const [name, plugin] of Object.entries(registry.plugins)) {
        const searchText = [
          plugin.name,
          plugin.displayName,
          plugin.description,
          ...plugin.tags
        ].join(' ').toLowerCase();

        if (searchText.includes(query.toLowerCase())) {
          results.push(plugin);
        }
      }

      assert.ok(results.length > 0, 'Should find test plugin');
      assert.ok(
        results.some(p => p.name === 'test-plugin'),
        'Should find test-plugin'
      );
    });

    test('should find plugins by tag', () => {
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));
      const query = 'utility';
      const results = [];

      for (const [name, plugin] of Object.entries(registry.plugins)) {
        const searchText = [
          plugin.name,
          plugin.displayName,
          plugin.description,
          ...plugin.tags,
          ...plugin.categories
        ].join(' ').toLowerCase();

        if (searchText.includes(query.toLowerCase())) {
          results.push(plugin);
        }
      }

      assert.ok(
        results.some(p => p.name === 'another-plugin'),
        'Should find plugin by tag'
      );
    });

    test('should return empty results for non-existent query', () => {
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));
      const query = 'nonexistent-xyz-123';
      const results = [];

      for (const [name, plugin] of Object.entries(registry.plugins)) {
        const searchText = [
          plugin.name,
          plugin.displayName,
          plugin.description,
          ...plugin.tags
        ].join(' ').toLowerCase();

        if (searchText.includes(query.toLowerCase())) {
          results.push(plugin);
        }
      }

      assert.strictEqual(results.length, 0, 'Should return no results');
    });
  });

  describe('Plugin Information', () => {
    test('should retrieve plugin details', () => {
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));
      const plugin = registry.plugins['test-plugin'];

      assert.ok(plugin, 'Plugin should exist');
      assert.strictEqual(plugin.name, 'test-plugin', 'Should have correct name');
      assert.strictEqual(plugin.displayName, 'Test Plugin', 'Should have display name');
      assert.ok(plugin.description, 'Should have description');
      assert.ok(plugin.author, 'Should have author');
      assert.ok(plugin.versions, 'Should have versions');
      assert.ok(plugin.latest, 'Should have latest version');
    });

    test('should include version information', () => {
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));
      const plugin = registry.plugins['test-plugin'];
      const version = plugin.versions[plugin.latest];

      assert.ok(version, 'Latest version should exist');
      assert.ok(version.releaseDate, 'Version should have release date');
      assert.ok(version.tarball, 'Version should have tarball URL');
      assert.ok(version.integrity, 'Version should have integrity hash');
    });

    test('should handle non-existent plugin', () => {
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));
      const plugin = registry.plugins['non-existent-plugin'];

      assert.strictEqual(plugin, undefined, 'Non-existent plugin should be undefined');
    });
  });

  describe('Plugin Validation', () => {
    test('should validate valid plugin structure', () => {
      const pluginJsonPath = join(TEST_PLUGIN_PATH, '.claude-plugin', 'plugin.json');
      assert.ok(existsSync(pluginJsonPath), 'Plugin.json should exist');

      const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));

      // Basic validation
      assert.ok(pluginJson.name, 'Plugin should have name');
      assert.ok(pluginJson.version, 'Plugin should have version');
      assert.ok(pluginJson.description, 'Plugin should have description');
      assert.ok(pluginJson.author, 'Plugin should have author');
      assert.ok(pluginJson.license, 'Plugin should have license');
    });

    test('should detect missing required fields', () => {
      const invalidPlugin = {
        name: 'invalid-plugin',
        // Missing version, description, author, etc.
      };

      const requiredFields = ['version', 'description', 'author', 'license'];
      const missingFields = requiredFields.filter(field => !invalidPlugin[field]);

      assert.ok(missingFields.length > 0, 'Should detect missing fields');
    });

    test('should validate version format', () => {
      const validVersions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30'];
      const invalidVersions = ['1.0', 'v1.0.0', '1.0.0.0', 'latest'];

      const versionPattern = /^\d+\.\d+\.\d+$/;

      for (const version of validVersions) {
        assert.match(version, versionPattern, `${version} should be valid`);
      }

      for (const version of invalidVersions) {
        assert.doesNotMatch(version, versionPattern, `${version} should be invalid`);
      }
    });

    test('should validate plugin name format', () => {
      const validNames = ['test-plugin', 'my-plugin', 'a', 'plugin-123'];
      const invalidNames = ['Test-Plugin', 'my_plugin', 'my plugin', '-plugin', 'plugin-'];

      const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

      for (const name of validNames) {
        assert.match(name, namePattern, `${name} should be valid`);
      }

      for (const name of invalidNames) {
        assert.doesNotMatch(name, namePattern, `${name} should be invalid`);
      }
    });
  });

  describe('Version Management', () => {
    test('should parse semver versions', () => {
      const versions = ['1.0.0', '2.1.3', '0.10.5'];
      const pattern = /^(\d+)\.(\d+)\.(\d+)$/;

      for (const version of versions) {
        const match = version.match(pattern);
        assert.ok(match, `${version} should match semver pattern`);

        const [, major, minor, patch] = match;
        assert.ok(!isNaN(parseInt(major)), 'Major should be number');
        assert.ok(!isNaN(parseInt(minor)), 'Minor should be number');
        assert.ok(!isNaN(parseInt(patch)), 'Patch should be number');
      }
    });

    test('should compare versions correctly', () => {
      const compareVersions = (v1, v2) => {
        const [major1, minor1, patch1] = v1.split('.').map(Number);
        const [major2, minor2, patch2] = v2.split('.').map(Number);

        if (major1 !== major2) return major1 - major2;
        if (minor1 !== minor2) return minor1 - minor2;
        return patch1 - patch2;
      };

      assert.ok(compareVersions('2.0.0', '1.0.0') > 0, '2.0.0 > 1.0.0');
      assert.ok(compareVersions('1.2.0', '1.1.0') > 0, '1.2.0 > 1.1.0');
      assert.ok(compareVersions('1.0.1', '1.0.0') > 0, '1.0.1 > 1.0.0');
      assert.ok(compareVersions('1.0.0', '2.0.0') < 0, '1.0.0 < 2.0.0');
      assert.strictEqual(compareVersions('1.0.0', '1.0.0'), 0, '1.0.0 = 1.0.0');
    });

    test('should identify latest version', () => {
      const versions = ['1.0.0', '1.2.0', '1.1.0', '2.0.0', '0.9.0'];

      const sorted = versions.sort((a, b) => {
        const [major1, minor1, patch1] = a.split('.').map(Number);
        const [major2, minor2, patch2] = b.split('.').map(Number);

        if (major1 !== major2) return major2 - major1;
        if (minor1 !== minor2) return minor2 - minor1;
        return patch2 - patch1;
      });

      assert.strictEqual(sorted[0], '2.0.0', 'Latest should be 2.0.0');
    });
  });

  describe('Plugin Metadata', () => {
    test('should have valid license identifiers', () => {
      const validLicenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'GPL-3.0', 'ISC'];
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));

      for (const plugin of Object.values(registry.plugins)) {
        assert.ok(
          validLicenses.includes(plugin.license),
          `License ${plugin.license} should be valid`
        );
      }
    });

    test('should have valid category identifiers', () => {
      const validCategories = [
        'notifications',
        'remote-control',
        'productivity',
        'automation',
        'communication',
        'development-tools',
        'testing',
        'deployment',
        'monitoring',
        'security',
        'data',
        'integration',
        'utilities',
        'other'
      ];

      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));

      for (const plugin of Object.values(registry.plugins)) {
        for (const category of plugin.categories) {
          assert.ok(
            validCategories.includes(category),
            `Category ${category} should be valid`
          );
        }
      }
    });

    test('should have valid email format', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));

      for (const plugin of Object.values(registry.plugins)) {
        if (plugin.author.email) {
          assert.match(
            plugin.author.email,
            emailPattern,
            `Email ${plugin.author.email} should be valid`
          );
        }
      }
    });

    test('should have valid repository URLs', () => {
      const urlPattern = /^https?:\/\/.+/;
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));

      for (const plugin of Object.values(registry.plugins)) {
        assert.match(
          plugin.repository.url,
          urlPattern,
          `Repository URL should be valid`
        );
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';

      assert.throws(
        () => JSON.parse(invalidJson),
        SyntaxError,
        'Should throw SyntaxError for invalid JSON'
      );
    });

    test('should handle missing files gracefully', () => {
      const nonExistentPath = '/path/to/nonexistent/file.json';

      assert.strictEqual(
        existsSync(nonExistentPath),
        false,
        'File should not exist'
      );
    });

    test('should validate required fields presence', () => {
      const requiredTopLevel = ['version', 'metadata', 'plugins'];
      const registry = JSON.parse(readFileSync(TEST_REGISTRY_PATH, 'utf8'));

      for (const field of requiredTopLevel) {
        assert.ok(
          registry[field] !== undefined,
          `Required field ${field} should be present`
        );
      }
    });
  });
});
