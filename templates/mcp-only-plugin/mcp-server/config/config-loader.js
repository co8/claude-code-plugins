import { readFileSync, existsSync } from 'fs';
import { load as yamlLoad } from 'js-yaml';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Get the path to the plugin configuration file
 * Checks project-local config first, then falls back to global config
 */
export function getConfigPath() {
  // Check for project-local config
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    const projectConfig = join(projectDir, '.claude', '{{PLUGIN_NAME}}.local.md');
    if (existsSync(projectConfig)) {
      return projectConfig;
    }
  }

  // Fall back to global config
  return join(homedir(), '.claude', '{{PLUGIN_NAME}}.local.md');
}

/**
 * Load and parse the plugin configuration file
 * Expects YAML frontmatter format
 */
export function loadConfig(configPath) {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, 'utf8');

  // Extract YAML from frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('Invalid configuration format. Expected YAML frontmatter (---...---)');
  }

  const config = yamlLoad(match[1]);

  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be a valid YAML object');
  }

  validateConfig(config);

  return config;
}

/**
 * Validate required configuration fields
 */
function validateConfig(config) {
  const required = [
    // Add your required fields here
    // 'api_key',
    // 'api_url',
  ];

  const missing = [];

  for (const field of required) {
    if (!config[field]) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required configuration fields: ${missing.join(', ')}`);
  }

  return true;
}
