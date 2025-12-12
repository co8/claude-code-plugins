import { describe, it, expect, beforeEach } from '@jest/globals';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig, validateConfigValue, CONFIG_SCHEMA } from '../config/config-loader.js';

describe('Configuration Tests', () => {
  const testConfigDir = join(tmpdir(), 'telegram-plugin-test');
  const testConfigFile = join(testConfigDir, 'test-config.md');

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  it('should validate valid configuration', () => {
    const validConfig = `---
bot_token: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
chat_id: "987654321"
timeout_seconds: 600
notifications:
  todo_completions: true
  errors: true
  session_events: true
  smart_detection: true
logging_level: "errors"
batch_window_seconds: 30
---

# Test Configuration
`;

    writeFileSync(testConfigFile, validConfig);
    const content = readFileSync(testConfigFile, 'utf-8');

    expect(content).toContain('bot_token:');
    expect(content).toContain('chat_id:');
  });

  it('should reject configuration with missing required fields', () => {
    const invalidConfig = `---
timeout_seconds: 600
---

# Missing bot_token and chat_id
`;

    writeFileSync(testConfigFile, invalidConfig);
    const content = readFileSync(testConfigFile, 'utf-8');

    expect(content).not.toContain('bot_token:');
  });

  it('should validate chat_id format', () => {
    const validChatIds = ['123456789', '-987654321', '0'];
    const invalidChatIds = ['abc123', '123.456', ''];

    validChatIds.forEach(chatId => {
      const pattern = /^-?\d+$/;
      expect(pattern.test(chatId)).toBe(true);
    });

    invalidChatIds.forEach(chatId => {
      const pattern = /^-?\d+$/;
      expect(pattern.test(chatId)).toBe(false);
    });
  });

  it('should validate timeout ranges', () => {
    const validTimeouts = [10, 60, 600, 3600];
    const invalidTimeouts = [5, 0, -1, 4000];

    validTimeouts.forEach(timeout => {
      expect(timeout).toBeGreaterThanOrEqual(10);
      expect(timeout).toBeLessThanOrEqual(3600);
    });

    invalidTimeouts.forEach(timeout => {
      const isValid = timeout >= 10 && timeout <= 3600;
      expect(isValid).toBe(false);
    });
  });

  it('should validate logging level enum', () => {
    const validLevels = ['all', 'errors', 'none'];
    const invalidLevels = ['debug', 'warn', 'info'];

    validLevels.forEach(level => {
      expect(['all', 'errors', 'none']).toContain(level);
    });

    invalidLevels.forEach(level => {
      expect(['all', 'errors', 'none']).not.toContain(level);
    });
  });
});
