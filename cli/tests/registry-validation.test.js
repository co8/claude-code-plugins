/**
 * Registry Validation Tests
 *
 * Tests for validating the plugin registry structure and schema compliance
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REGISTRY_PATH = join(__dirname, '..', '..', 'registry', 'registry.json');
const SCHEMA_PATH = join(__dirname, '..', '..', 'registry', 'schema.json');

describe('Registry Validation', () => {
  let registry;
  let schema;
  let ajv;

  test('setup', () => {
    // Load registry and schema
    registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
    schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

    // Initialize AJV validator
    ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);
  });

  describe('Registry Structure', () => {
    test('should have required top-level fields', () => {
      assert.ok(registry.version, 'Registry should have version');
      assert.ok(registry.metadata, 'Registry should have metadata');
      assert.ok(registry.plugins, 'Registry should have plugins object');
    });

    test('should have valid version format', () => {
      assert.match(registry.version, /^\d+\.\d+\.\d+$/, 'Version should be semver format');
    });

    test('metadata should have required fields', () => {
      assert.ok(registry.metadata.last_updated, 'Metadata should have last_updated');
      assert.ok(typeof registry.metadata.total_plugins === 'number', 'Metadata should have total_plugins count');
    });

    test('metadata totals should match actual counts', () => {
      const actualCount = Object.keys(registry.plugins).length;
      assert.strictEqual(
        registry.metadata.total_plugins,
        actualCount,
        `total_plugins (${registry.metadata.total_plugins}) should match actual plugin count (${actualCount})`
      );
    });

    test('last_updated should be valid ISO 8601 date', () => {
      const date = new Date(registry.metadata.last_updated);
      assert.ok(!isNaN(date.getTime()), 'last_updated should be valid date');
    });
  });

  describe('Schema Validation', () => {
    test('registry should validate against schema', () => {
      const validate = ajv.compile(schema);
      const valid = validate(registry);

      if (!valid) {
        console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
      }

      assert.ok(valid, 'Registry should validate against schema');
    });

    test('schema should have all required definitions', () => {
      assert.ok(schema.definitions, 'Schema should have definitions');
      assert.ok(schema.definitions.plugin, 'Schema should define plugin');
      assert.ok(schema.definitions.version, 'Schema should define version');
      assert.ok(schema.definitions.author, 'Schema should define author');
    });
  });

  describe('Plugin Validation', () => {
    test('all plugins should have unique names', () => {
      const names = Object.keys(registry.plugins);
      const uniqueNames = new Set(names);
      assert.strictEqual(
        names.length,
        uniqueNames.size,
        'All plugin names should be unique'
      );
    });

    test('plugin names should match object keys', () => {
      for (const [key, plugin] of Object.entries(registry.plugins)) {
        assert.strictEqual(
          plugin.name,
          key,
          `Plugin name "${plugin.name}" should match object key "${key}"`
        );
      }
    });

    test('plugin names should be kebab-case', () => {
      for (const name of Object.keys(registry.plugins)) {
        assert.match(
          name,
          /^[a-z0-9]+(-[a-z0-9]+)*$/,
          `Plugin name "${name}" should be kebab-case`
        );
      }
    });

    test('all plugins should have required fields', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        assert.ok(plugin.displayName, `${name} should have displayName`);
        assert.ok(plugin.description, `${name} should have description`);
        assert.ok(plugin.author, `${name} should have author`);
        assert.ok(plugin.license, `${name} should have license`);
        assert.ok(plugin.repository, `${name} should have repository`);
        assert.ok(plugin.versions, `${name} should have versions`);
        assert.ok(plugin.latest, `${name} should have latest version`);
        assert.ok(plugin.categories, `${name} should have categories`);
        assert.ok(plugin.tags, `${name} should have tags`);
      }
    });

    test('all plugins should have valid descriptions', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        assert.ok(
          plugin.description.length >= 10,
          `${name} description should be at least 10 characters`
        );
        assert.ok(
          plugin.description.length <= 200,
          `${name} description should be at most 200 characters`
        );
      }
    });

    test('all plugins should have at least one category', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        assert.ok(
          Array.isArray(plugin.categories),
          `${name} categories should be an array`
        );
        assert.ok(
          plugin.categories.length > 0,
          `${name} should have at least one category`
        );
        assert.ok(
          plugin.categories.length <= 3,
          `${name} should have at most 3 categories`
        );
      }
    });

    test('all plugins should have valid tags', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        assert.ok(
          Array.isArray(plugin.tags),
          `${name} tags should be an array`
        );
        assert.ok(
          plugin.tags.length > 0,
          `${name} should have at least one tag`
        );

        // All tags should be lowercase with hyphens only
        for (const tag of plugin.tags) {
          assert.match(
            tag,
            /^[a-z0-9-]+$/,
            `Tag "${tag}" in ${name} should be lowercase with hyphens only`
          );
        }

        // Tags should be unique
        const uniqueTags = new Set(plugin.tags);
        assert.strictEqual(
          plugin.tags.length,
          uniqueTags.size,
          `${name} tags should be unique`
        );
      }
    });

    test('all plugins should have valid author information', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        assert.ok(plugin.author.name, `${name} should have author name`);

        if (plugin.author.email) {
          assert.match(
            plugin.author.email,
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            `${name} author email should be valid`
          );
        }

        if (plugin.author.url) {
          assert.match(
            plugin.author.url,
            /^https?:\/\//,
            `${name} author URL should start with http:// or https://`
          );
        }
      }
    });

    test('all plugins should have valid repository information', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        assert.strictEqual(
          plugin.repository.type,
          'git',
          `${name} repository type should be git`
        );
        assert.ok(
          plugin.repository.url,
          `${name} should have repository URL`
        );
        assert.match(
          plugin.repository.url,
          /^https?:\/\//,
          `${name} repository URL should be valid`
        );
      }
    });

    test('plugins with deprecated flag should have deprecation message', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        if (plugin.deprecated) {
          assert.ok(
            plugin.deprecationMessage,
            `Deprecated plugin ${name} should have deprecationMessage`
          );
        }
      }
    });
  });

  describe('Version Validation', () => {
    test('all plugins should have at least one version', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        const versionCount = Object.keys(plugin.versions).length;
        assert.ok(
          versionCount > 0,
          `${name} should have at least one version`
        );
      }
    });

    test('latest version should exist in versions object', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        assert.ok(
          plugin.versions[plugin.latest],
          `${name} latest version "${plugin.latest}" should exist in versions`
        );
      }
    });

    test('all versions should have valid semver format', () => {
      const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

      for (const [name, plugin] of Object.entries(registry.plugins)) {
        for (const [versionKey, versionData] of Object.entries(plugin.versions)) {
          assert.match(
            versionKey,
            semverPattern,
            `Version key "${versionKey}" in ${name} should be valid semver`
          );
          assert.match(
            versionData.version,
            semverPattern,
            `Version "${versionData.version}" in ${name} should be valid semver`
          );
          assert.strictEqual(
            versionKey,
            versionData.version,
            `Version key and version field should match in ${name}`
          );
        }
      }
    });

    test('all versions should have required fields', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        for (const [versionKey, versionData] of Object.entries(plugin.versions)) {
          assert.ok(
            versionData.releaseDate,
            `${name}@${versionKey} should have releaseDate`
          );
          assert.ok(
            versionData.tarball,
            `${name}@${versionKey} should have tarball URL`
          );
          assert.ok(
            versionData.integrity,
            `${name}@${versionKey} should have integrity hash`
          );
        }
      }
    });

    test('all version release dates should be valid ISO 8601', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        for (const [versionKey, versionData] of Object.entries(plugin.versions)) {
          const date = new Date(versionData.releaseDate);
          assert.ok(
            !isNaN(date.getTime()),
            `${name}@${versionKey} releaseDate should be valid date`
          );
        }
      }
    });

    test('all version tarballs should be valid URLs', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        for (const [versionKey, versionData] of Object.entries(plugin.versions)) {
          assert.match(
            versionData.tarball,
            /^https?:\/\/.+\.tar\.gz$/,
            `${name}@${versionKey} tarball should be valid .tar.gz URL`
          );
        }
      }
    });

    test('all version integrity hashes should have correct format', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        for (const [versionKey, versionData] of Object.entries(plugin.versions)) {
          assert.match(
            versionData.integrity,
            /^sha512-[A-Za-z0-9+/]+=*$/,
            `${name}@${versionKey} integrity should be sha512 hash`
          );
        }
      }
    });

    test('version dependencies should have valid format', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        for (const [versionKey, versionData] of Object.entries(plugin.versions)) {
          if (versionData.dependencies) {
            for (const [depName, depVersion] of Object.entries(versionData.dependencies)) {
              assert.ok(
                depVersion,
                `${name}@${versionKey} dependency ${depName} should have version`
              );
            }
          }
        }
      }
    });

    test('minClaudeVersion should be valid semver if present', () => {
      const semverPattern = /^\d+\.\d+\.\d+$/;

      for (const [name, plugin] of Object.entries(registry.plugins)) {
        for (const [versionKey, versionData] of Object.entries(plugin.versions)) {
          if (versionData.minClaudeVersion) {
            assert.match(
              versionData.minClaudeVersion,
              semverPattern,
              `${name}@${versionKey} minClaudeVersion should be valid semver`
            );
          }
        }
      }
    });
  });

  describe('Data Quality', () => {
    test('plugin ratings should be between 0 and 5', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        if (plugin.rating !== undefined) {
          assert.ok(
            plugin.rating >= 0 && plugin.rating <= 5,
            `${name} rating should be between 0 and 5`
          );
        }
      }
    });

    test('plugin downloads should be non-negative', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        if (plugin.downloads !== undefined) {
          assert.ok(
            plugin.downloads >= 0,
            `${name} downloads should be non-negative`
          );
        }
      }
    });

    test('features should have valid structure', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        if (plugin.features) {
          assert.ok(
            Array.isArray(plugin.features),
            `${name} features should be an array`
          );

          for (const feature of plugin.features) {
            assert.ok(feature.title, `Feature in ${name} should have title`);
            assert.ok(feature.description, `Feature in ${name} should have description`);
            assert.ok(
              feature.title.length <= 50,
              `Feature title in ${name} should be <= 50 chars`
            );
            assert.ok(
              feature.description.length <= 200,
              `Feature description in ${name} should be <= 200 chars`
            );
          }
        }
      }
    });

    test('screenshots should be valid URLs', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        if (plugin.screenshots) {
          assert.ok(
            Array.isArray(plugin.screenshots),
            `${name} screenshots should be an array`
          );

          for (const screenshot of plugin.screenshots) {
            assert.match(
              screenshot,
              /^https?:\/\//,
              `Screenshot in ${name} should be valid URL`
            );
          }
        }
      }
    });
  });

  describe('Cross-Plugin Validation', () => {
    test('no duplicate display names', () => {
      const displayNames = Object.values(registry.plugins).map(p => p.displayName);
      const uniqueDisplayNames = new Set(displayNames);

      assert.strictEqual(
        displayNames.length,
        uniqueDisplayNames.size,
        'All plugin display names should be unique'
      );
    });

    test('all referenced categories are valid', () => {
      const validCategories = new Set([
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
      ]);

      for (const [name, plugin] of Object.entries(registry.plugins)) {
        for (const category of plugin.categories) {
          assert.ok(
            validCategories.has(category),
            `Category "${category}" in ${name} should be valid`
          );
        }
      }
    });

    test('verified publishers should have email', () => {
      for (const [name, plugin] of Object.entries(registry.plugins)) {
        if (plugin.verified || plugin.author.verified) {
          assert.ok(
            plugin.author.email,
            `Verified plugin ${name} should have author email`
          );
        }
      }
    });
  });
});
