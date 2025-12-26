import { describe, test, expect } from '@jest/globals';
import { loadConfig, getConfigPath, validateConfig } from '../mcp-server/config/config-loader.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Configuration', () => {
  const testDir = join(tmpdir(), 'test-{{PLUGIN_NAME}}-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    test('should load valid YAML config', () => {
      const configPath = join(testDir, 'config.md');
      const configContent = `---
setting1: value1
setting2: value2
---`;
      writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);
      expect(config.setting1).toBe('value1');
      expect(config.setting2).toBe('value2');
    });

    test('should throw error for missing file', () => {
      expect(() => loadConfig('/nonexistent/path')).toThrow('Configuration file not found');
    });

    test('should throw error for invalid format', () => {
      const configPath = join(testDir, 'invalid.md');
      writeFileSync(configPath, 'This is not YAML frontmatter');

      expect(() => loadConfig(configPath)).toThrow('Invalid configuration format');
    });
  });
});
