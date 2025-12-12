import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { loadConfig, validateConfigValue, CONFIG_SCHEMA, getConfigPath } from '../config/config-loader.js';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Config Loader', () => {
  const testDir = join(tmpdir(), 'telegram-test-config');
  const testConfigFile = join(testDir, 'telegram.local.md');
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env.CLAUDE_PROJECT_DIR;

    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Restore env
    if (originalEnv !== undefined) {
      process.env.CLAUDE_PROJECT_DIR = originalEnv;
    } else {
      delete process.env.CLAUDE_PROJECT_DIR;
    }

    // Cleanup
    if (existsSync(testConfigFile)) {
      unlinkSync(testConfigFile);
    }
    if (existsSync(testDir)) {
      try {
        rmdirSync(testDir);
      } catch (e) {
        // Ignore if directory not empty
      }
    }
  });

  describe('validateConfigValue', () => {
    it('should validate string type', () => {
      const schema = { type: 'string' };
      expect(validateConfigValue('test', 'hello', schema)).toBeNull();
      expect(validateConfigValue('test', 123, schema)).toContain('must be a string');
    });

    it('should validate string minLength', () => {
      const schema = { type: 'string', minLength: 5 };
      expect(validateConfigValue('test', 'hello', schema)).toBeNull();
      expect(validateConfigValue('test', 'hi', schema)).toContain('at least 5');
    });

    it('should validate string pattern', () => {
      const schema = { type: 'string', pattern: /^\d+$/ };
      expect(validateConfigValue('test', '123', schema)).toBeNull();
      expect(validateConfigValue('test', 'abc', schema)).toContain('invalid format');
    });

    it('should validate string enum', () => {
      const schema = { type: 'string', enum: ['a', 'b', 'c'] };
      expect(validateConfigValue('test', 'a', schema)).toBeNull();
      expect(validateConfigValue('test', 'd', schema)).toContain('must be one of');
    });

    it('should validate number type', () => {
      const schema = { type: 'number' };
      expect(validateConfigValue('test', 123, schema)).toBeNull();
      expect(validateConfigValue('test', 'abc', schema)).toContain('must be a number');
    });

    it('should validate number min/max', () => {
      const schema = { type: 'number', min: 10, max: 100 };
      expect(validateConfigValue('test', 50, schema)).toBeNull();
      expect(validateConfigValue('test', 5, schema)).toContain('at least 10');
      expect(validateConfigValue('test', 150, schema)).toContain('at most 100');
    });

    it('should validate boolean type', () => {
      const schema = { type: 'boolean' };
      expect(validateConfigValue('test', true, schema)).toBeNull();
      expect(validateConfigValue('test', 'true', schema)).toContain('must be a boolean');
    });

    it('should validate array type', () => {
      const schema = { type: 'array' };
      expect(validateConfigValue('test', [], schema)).toBeNull();
      expect(validateConfigValue('test', 'not-array', schema)).toContain('must be an array');
    });
  });

  describe('loadConfig', () => {
    it('should load valid configuration', () => {
      const validConfig = `---
bot_token: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
chat_id: "987654321"
timeout_seconds: 600
logging_level: "errors"
batch_window_seconds: 30
notifications:
  todo_completions: true
  errors: true
  session_events: true
  smart_detection: true
smart_keywords:
  - "test"
  - "demo"
---

# Test Config
`;

      writeFileSync(testConfigFile, validConfig);
      const config = loadConfig(testConfigFile);

      expect(config.bot_token).toBe('123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
      expect(config.chat_id).toBe('987654321');
      expect(config.timeout_seconds).toBe(600);
      expect(config.logging_level).toBe('errors');
      expect(config.batch_window_seconds).toBe(30);
    });

    it('should apply default values for optional fields', () => {
      const minimalConfig = `---
bot_token: "test_token"
chat_id: "123456"
---`;

      writeFileSync(testConfigFile, minimalConfig);
      const config = loadConfig(testConfigFile);

      expect(config.timeout_seconds).toBe(600);
      expect(config.logging_level).toBe('errors');
      expect(config.batch_window_seconds).toBe(30);
      expect(config.notifications.todo_completions).toBe(true);
      expect(config.smart_keywords).toEqual(CONFIG_SCHEMA.smart_keywords.default);
    });

    it('should throw error for missing config file', () => {
      expect(() => {
        loadConfig('/nonexistent/path.md');
      }).toThrow('not found');
    });

    it('should throw error for missing YAML frontmatter', () => {
      writeFileSync(testConfigFile, 'Just some text without frontmatter');

      expect(() => {
        loadConfig(testConfigFile);
      }).toThrow('No YAML frontmatter');
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = `---
bot_token: "test"
  invalid indentation
chat_id: "123"
---`;

      writeFileSync(testConfigFile, invalidYaml);

      expect(() => {
        loadConfig(testConfigFile);
      }).toThrow('Invalid YAML');
    });

    it('should throw error for missing required bot_token', () => {
      const configWithoutToken = `---
chat_id: "123456"
---`;

      writeFileSync(testConfigFile, configWithoutToken);

      expect(() => {
        loadConfig(testConfigFile);
      }).toThrow('bot_token is required');
    });

    it('should throw error for missing required chat_id', () => {
      const configWithoutChatId = `---
bot_token: "test_token"
---`;

      writeFileSync(testConfigFile, configWithoutChatId);

      expect(() => {
        loadConfig(testConfigFile);
      }).toThrow('chat_id is required');
    });

    it('should validate chat_id format', () => {
      const invalidChatId = `---
bot_token: "test_token"
chat_id: "not-a-number"
---`;

      writeFileSync(testConfigFile, invalidChatId);

      expect(() => {
        loadConfig(testConfigFile);
      }).toThrow('invalid format');
    });

    it('should validate timeout_seconds range', () => {
      const invalidTimeout = `---
bot_token: "test_token"
chat_id: "123"
timeout_seconds: 5
---`;

      writeFileSync(testConfigFile, invalidTimeout);

      expect(() => {
        loadConfig(testConfigFile);
      }).toThrow('at least 10');
    });

    it('should validate logging_level enum', () => {
      const invalidLogging = `---
bot_token: "test_token"
chat_id: "123"
logging_level: "debug"
---`;

      writeFileSync(testConfigFile, invalidLogging);

      expect(() => {
        loadConfig(testConfigFile);
      }).toThrow('must be one of');
    });

    it('should handle negative chat_id', () => {
      const negativeChat = `---
bot_token: "test_token"
chat_id: "-987654321"
---`;

      writeFileSync(testConfigFile, negativeChat);
      const config = loadConfig(testConfigFile);

      expect(config.chat_id).toBe('-987654321');
    });

    it('should handle all notification flags', () => {
      const allNotifications = `---
bot_token: "test_token"
chat_id: "123"
notifications:
  todo_completions: false
  errors: false
  session_events: false
  smart_detection: false
---`;

      writeFileSync(testConfigFile, allNotifications);
      const config = loadConfig(testConfigFile);

      expect(config.notifications.todo_completions).toBe(false);
      expect(config.notifications.errors).toBe(false);
      expect(config.notifications.session_events).toBe(false);
      expect(config.notifications.smart_detection).toBe(false);
    });

    it('should handle custom smart_keywords', () => {
      const customKeywords = `---
bot_token: "test_token"
chat_id: "123"
smart_keywords:
  - "custom1"
  - "custom2"
  - "custom3"
---`;

      writeFileSync(testConfigFile, customKeywords);
      const config = loadConfig(testConfigFile);

      expect(config.smart_keywords).toEqual(['custom1', 'custom2', 'custom3']);
    });
  });

  describe('CONFIG_SCHEMA', () => {
    it('should have all required fields defined', () => {
      expect(CONFIG_SCHEMA.bot_token).toBeDefined();
      expect(CONFIG_SCHEMA.chat_id).toBeDefined();
      expect(CONFIG_SCHEMA.timeout_seconds).toBeDefined();
      expect(CONFIG_SCHEMA.logging_level).toBeDefined();
      expect(CONFIG_SCHEMA.batch_window_seconds).toBeDefined();
      expect(CONFIG_SCHEMA.notifications).toBeDefined();
      expect(CONFIG_SCHEMA.smart_keywords).toBeDefined();
    });

    it('should have correct default values', () => {
      expect(CONFIG_SCHEMA.timeout_seconds.default).toBe(600);
      expect(CONFIG_SCHEMA.logging_level.default).toBe('errors');
      expect(CONFIG_SCHEMA.batch_window_seconds.default).toBe(30);
    });

    it('should have correct validation rules', () => {
      expect(CONFIG_SCHEMA.bot_token.required).toBe(true);
      expect(CONFIG_SCHEMA.chat_id.required).toBe(true);
      expect(CONFIG_SCHEMA.timeout_seconds.min).toBe(10);
      expect(CONFIG_SCHEMA.timeout_seconds.max).toBe(3600);
    });
  });
});
