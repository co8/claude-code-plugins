#!/usr/bin/env node

/**
 * CC-Plugins CLI Plugin Manager
 *
 * Provides command-line interface for plugin management:
 * - Search for plugins in the registry
 * - Install plugins from the registry
 * - Update installed plugins
 * - List installed plugins
 * - Show plugin information
 * - Validate plugin structure
 *
 * Usage:
 *   plugin-manager search <query>
 *   plugin-manager install <plugin-name> [version]
 *   plugin-manager update <plugin-name>
 *   plugin-manager list
 *   plugin-manager info <plugin-name>
 *   plugin-manager validate <plugin-path>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const REGISTRY_URL = process.env.CC_PLUGINS_REGISTRY || 'https://raw.githubusercontent.com/co8/cc-plugins/main/registry/registry.json';
const PLUGINS_DIR = process.env.CC_PLUGINS_DIR || join(process.env.HOME, '.claude', 'plugins');
const CACHE_DIR = join(process.env.HOME, '.cache', 'cc-plugins');
const REGISTRY_CACHE = join(CACHE_DIR, 'registry.json');
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Print colored output to console
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print error message and exit
 */
function error(message) {
  print(`✗ Error: ${message}`, 'red');
  process.exit(1);
}

/**
 * Print success message
 */
function success(message) {
  print(`✓ ${message}`, 'green');
}

/**
 * Print info message
 */
function info(message) {
  print(`ℹ ${message}`, 'blue');
}

/**
 * Print warning message
 */
function warn(message) {
  print(`⚠ ${message}`, 'yellow');
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Fetch registry data from remote or cache
 */
async function fetchRegistry(forceRefresh = false) {
  ensureCacheDir();

  // Check cache freshness
  if (!forceRefresh && existsSync(REGISTRY_CACHE)) {
    const stats = statSync(REGISTRY_CACHE);
    const age = Date.now() - stats.mtimeMs;

    if (age < CACHE_TTL) {
      const cached = JSON.parse(readFileSync(REGISTRY_CACHE, 'utf8'));
      return cached;
    }
  }

  // Fetch from remote
  try {
    info('Fetching registry...');
    const response = await fetch(REGISTRY_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const registry = await response.json();

    // Update cache
    writeFileSync(REGISTRY_CACHE, JSON.stringify(registry, null, 2));

    return registry;
  } catch (err) {
    // Fall back to cache if available
    if (existsSync(REGISTRY_CACHE)) {
      warn('Failed to fetch registry, using cached version');
      return JSON.parse(readFileSync(REGISTRY_CACHE, 'utf8'));
    }

    error(`Failed to fetch registry: ${err.message}`);
  }
}

/**
 * Search for plugins in the registry
 */
async function searchPlugins(query) {
  const registry = await fetchRegistry();
  const results = [];

  const lowerQuery = query.toLowerCase();

  for (const [name, plugin] of Object.entries(registry.plugins)) {
    // Search in name, display name, description, tags
    const searchableText = [
      plugin.name,
      plugin.displayName,
      plugin.description,
      ...plugin.tags,
      ...plugin.categories
    ].join(' ').toLowerCase();

    if (searchableText.includes(lowerQuery)) {
      results.push(plugin);
    }
  }

  if (results.length === 0) {
    info(`No plugins found matching "${query}"`);
    return;
  }

  print(`\nFound ${results.length} plugin(s):\n`, 'bright');

  results.forEach(plugin => {
    print(`${plugin.displayName}`, 'cyan');
    print(`  ${plugin.name}@${plugin.latest}`, 'dim');
    print(`  ${plugin.description}`);
    print(`  Categories: ${plugin.categories.join(', ')}`, 'dim');
    print(`  Rating: ${'⭐'.repeat(Math.round(plugin.rating))} (${plugin.rating}/5)`, 'yellow');
    if (plugin.verified) {
      print(`  ✓ Verified publisher`, 'green');
    }
    print('');
  });
}

/**
 * Show detailed information about a plugin
 */
async function showPluginInfo(pluginName) {
  const registry = await fetchRegistry();
  const plugin = registry.plugins[pluginName];

  if (!plugin) {
    error(`Plugin "${pluginName}" not found in registry`);
  }

  print(`\n${plugin.displayName}`, 'bright');
  print(`${'='.repeat(plugin.displayName.length)}\n`);

  print(plugin.description);
  if (plugin.longDescription) {
    print(`\n${plugin.longDescription}`, 'dim');
  }

  print(`\nDetails:`, 'bright');
  print(`  Name: ${plugin.name}`);
  print(`  Latest Version: ${plugin.latest}`);
  print(`  Author: ${plugin.author.name}${plugin.author.verified ? ' ✓' : ''}`);
  print(`  License: ${plugin.license}`);
  print(`  Categories: ${plugin.categories.join(', ')}`);
  print(`  Tags: ${plugin.tags.join(', ')}`, 'dim');
  print(`  Downloads: ${plugin.downloads.toLocaleString()}`);
  print(`  Rating: ${'⭐'.repeat(Math.round(plugin.rating))} (${plugin.rating}/5)`, 'yellow');

  if (plugin.features && plugin.features.length > 0) {
    print(`\nFeatures:`, 'bright');
    plugin.features.forEach(feature => {
      print(`  ${feature.icon || '•'} ${feature.title}`, 'cyan');
      print(`    ${feature.description}`, 'dim');
    });
  }

  const latestVersion = plugin.versions[plugin.latest];
  print(`\nVersion ${plugin.latest}:`, 'bright');
  print(`  Released: ${new Date(latestVersion.releaseDate).toLocaleDateString()}`);
  print(`  Min Claude Code: ${latestVersion.minClaudeVersion || 'N/A'}`);
  print(`  Min Node.js: ${latestVersion.minNodeVersion || 'N/A'}`);

  if (latestVersion.releaseNotes) {
    print(`  Release Notes: ${latestVersion.releaseNotes}`, 'dim');
  }

  print(`\nRepository: ${plugin.repository.url}`);
  if (plugin.homepage) {
    print(`Homepage: ${plugin.homepage}`);
  }

  print(`\nInstall:`, 'bright');
  print(`  plugin-manager install ${plugin.name}`, 'green');
  print('');
}

/**
 * List installed plugins
 */
function listInstalledPlugins() {
  if (!existsSync(PLUGINS_DIR)) {
    info('No plugins directory found');
    return;
  }

  const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
  const plugins = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

  if (plugins.length === 0) {
    info('No plugins installed');
    return;
  }

  print(`\nInstalled plugins (${plugins.length}):\n`, 'bright');

  plugins.forEach(dir => {
    const pluginJsonPath = join(PLUGINS_DIR, dir.name, '.claude-plugin', 'plugin.json');

    if (existsSync(pluginJsonPath)) {
      try {
        const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
        print(`${pluginJson.name}@${pluginJson.version}`, 'cyan');
        print(`  ${pluginJson.description || 'No description'}`, 'dim');
      } catch (err) {
        warn(`  ${dir.name} - Invalid plugin.json`);
      }
    } else {
      warn(`  ${dir.name} - No plugin.json found`);
    }
  });

  print('');
}

/**
 * Download and verify plugin tarball
 */
async function downloadPlugin(plugin, version) {
  const versionData = plugin.versions[version];

  if (!versionData) {
    error(`Version ${version} not found for plugin ${plugin.name}`);
  }

  info(`Downloading ${plugin.name}@${version}...`);

  try {
    const response = await fetch(versionData.tarball);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Verify integrity if provided (skip placeholder)
    if (versionData.integrity && !versionData.integrity.includes('placeholder')) {
      const hash = createHash('sha512').update(buffer).digest('base64');
      const expected = versionData.integrity.replace('sha512-', '');

      if (hash !== expected) {
        error('Integrity check failed - downloaded file may be corrupted');
      }
    }

    return buffer;
  } catch (err) {
    error(`Failed to download plugin: ${err.message}`);
  }
}

/**
 * Install a plugin from the registry
 */
async function installPlugin(pluginName, version = 'latest') {
  const registry = await fetchRegistry();
  const plugin = registry.plugins[pluginName];

  if (!plugin) {
    error(`Plugin "${pluginName}" not found in registry`);
  }

  if (plugin.deprecated) {
    warn(`Plugin "${pluginName}" is deprecated`);
    if (plugin.deprecationMessage) {
      print(plugin.deprecationMessage, 'yellow');
    }
    print('');
  }

  // Resolve version
  const targetVersion = version === 'latest' ? plugin.latest : version;

  // Check if already installed
  const installPath = join(PLUGINS_DIR, pluginName);
  if (existsSync(installPath)) {
    const pluginJsonPath = join(installPath, '.claude-plugin', 'plugin.json');
    if (existsSync(pluginJsonPath)) {
      const installed = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
      if (installed.version === targetVersion) {
        info(`Plugin ${pluginName}@${targetVersion} is already installed`);
        return;
      } else {
        info(`Upgrading ${pluginName} from ${installed.version} to ${targetVersion}`);
      }
    }
  }

  // Download plugin
  const tarball = await downloadPlugin(plugin, targetVersion);

  // Create plugins directory
  if (!existsSync(PLUGINS_DIR)) {
    mkdirSync(PLUGINS_DIR, { recursive: true });
  }

  // Extract tarball
  info('Installing plugin...');

  try {
    // Save tarball to temp location
    const tempTarball = join(CACHE_DIR, `${pluginName}-${targetVersion}.tar.gz`);
    writeFileSync(tempTarball, tarball);

    // Remove existing installation
    if (existsSync(installPath)) {
      rmSync(installPath, { recursive: true, force: true });
    }

    // Extract
    mkdirSync(installPath, { recursive: true });
    execSync(`tar -xzf "${tempTarball}" -C "${installPath}" --strip-components=1`, {
      stdio: 'ignore'
    });

    // Clean up temp file
    rmSync(tempTarball);

    success(`Successfully installed ${pluginName}@${targetVersion}`);

    // Show post-install instructions if available
    const readmePath = join(installPath, 'README.md');
    if (existsSync(readmePath)) {
      print('\nQuick Start:', 'bright');
      const readme = readFileSync(readmePath, 'utf8');
      const quickStartMatch = readme.match(/## Quick Start\n([\s\S]*?)(?=\n##|$)/);
      if (quickStartMatch) {
        print(quickStartMatch[1].trim(), 'dim');
      } else {
        print(`  See ${readmePath} for documentation`, 'dim');
      }
    }

  } catch (err) {
    error(`Failed to install plugin: ${err.message}`);
  }
}

/**
 * Update an installed plugin
 */
async function updatePlugin(pluginName) {
  // Check if installed
  const installPath = join(PLUGINS_DIR, pluginName);
  if (!existsSync(installPath)) {
    error(`Plugin "${pluginName}" is not installed`);
  }

  const pluginJsonPath = join(installPath, '.claude-plugin', 'plugin.json');
  if (!existsSync(pluginJsonPath)) {
    error(`Invalid plugin installation - missing plugin.json`);
  }

  const installed = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
  const currentVersion = installed.version;

  // Fetch registry
  const registry = await fetchRegistry(true); // Force refresh for updates
  const plugin = registry.plugins[pluginName];

  if (!plugin) {
    error(`Plugin "${pluginName}" not found in registry`);
  }

  if (plugin.latest === currentVersion) {
    success(`Plugin ${pluginName} is already up to date (${currentVersion})`);
    return;
  }

  info(`Updating ${pluginName} from ${currentVersion} to ${plugin.latest}`);

  // Check for breaking changes
  const newVersion = plugin.versions[plugin.latest];
  if (newVersion.breaking) {
    warn('This update contains breaking changes!');
    if (newVersion.releaseNotes) {
      print(`Release notes: ${newVersion.releaseNotes}`, 'yellow');
    }
  }

  // Proceed with installation
  await installPlugin(pluginName, plugin.latest);
}

/**
 * Validate plugin structure against schema
 */
function validatePlugin(pluginPath) {
  const pluginJsonPath = join(pluginPath, '.claude-plugin', 'plugin.json');

  if (!existsSync(pluginJsonPath)) {
    error('No plugin.json found at specified path');
  }

  try {
    const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));

    // Load schema
    const schemaPath = join(__dirname, '..', 'registry', 'schema.json');
    if (!existsSync(schemaPath)) {
      warn('Schema file not found, skipping validation');
      return;
    }

    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

    // Validate against plugin definition in schema
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);

    const validate = ajv.compile(schema.definitions.plugin);
    const valid = validate(pluginJson);

    if (valid) {
      success('Plugin structure is valid');
    } else {
      error('Plugin validation failed:');
      validate.errors.forEach(err => {
        print(`  ${err.instancePath}: ${err.message}`, 'red');
      });
    }

  } catch (err) {
    error(`Validation failed: ${err.message}`);
  }
}

/**
 * Display help information
 */
function showHelp() {
  print('\nCC-Plugins CLI Plugin Manager', 'bright');
  print('Manage Claude Code plugins from the centralized registry\n');

  print('Usage:', 'cyan');
  print('  plugin-manager <command> [options]\n');

  print('Commands:', 'cyan');
  print('  search <query>          Search for plugins in the registry');
  print('  info <plugin-name>      Show detailed information about a plugin');
  print('  install <plugin-name>   Install a plugin from the registry');
  print('  update <plugin-name>    Update an installed plugin');
  print('  list                    List all installed plugins');
  print('  validate <path>         Validate plugin structure');
  print('  help                    Show this help message\n');

  print('Examples:', 'cyan');
  print('  plugin-manager search telegram');
  print('  plugin-manager info telegram-plugin');
  print('  plugin-manager install telegram-plugin');
  print('  plugin-manager update telegram-plugin');
  print('  plugin-manager list');
  print('  plugin-manager validate ./plugins/my-plugin\n');

  print('Environment Variables:', 'cyan');
  print('  CC_PLUGINS_REGISTRY     Custom registry URL');
  print('  CC_PLUGINS_DIR          Custom plugins directory\n');
}

/**
 * Main CLI entry point
 */
async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'search':
        if (args.length === 0) {
          error('Please provide a search query');
        }
        await searchPlugins(args.join(' '));
        break;

      case 'info':
        if (args.length === 0) {
          error('Please provide a plugin name');
        }
        await showPluginInfo(args[0]);
        break;

      case 'install':
        if (args.length === 0) {
          error('Please provide a plugin name');
        }
        await installPlugin(args[0], args[1]);
        break;

      case 'update':
        if (args.length === 0) {
          error('Please provide a plugin name');
        }
        await updatePlugin(args[0]);
        break;

      case 'list':
        listInstalledPlugins();
        break;

      case 'validate':
        if (args.length === 0) {
          error('Please provide a plugin path');
        }
        validatePlugin(args[0]);
        break;

      default:
        error(`Unknown command: ${command}\nRun 'plugin-manager help' for usage information`);
    }
  } catch (err) {
    error(err.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  fetchRegistry,
  searchPlugins,
  showPluginInfo,
  installPlugin,
  updatePlugin,
  listInstalledPlugins,
  validatePlugin
};
