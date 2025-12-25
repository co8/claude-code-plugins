import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { log, setConfig, __resetLoggerState } from '../utils/logger.js';
import { existsSync, unlinkSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_PATH = join(dirname(dirname(__dirname)), 'telegram.log');

describe('Logger', () => {
  beforeEach(() => {
    // Reset logger state to avoid test interference
    __resetLoggerState();

    // Clean up any existing log files
    if (existsSync(LOG_PATH)) {
      unlinkSync(LOG_PATH);
    }
    for (let i = 1; i <= 3; i++) {
      const rotatedLog = `${LOG_PATH}.${i}`;
      if (existsSync(rotatedLog)) {
        unlinkSync(rotatedLog);
      }
    }
  });

  afterEach(() => {
    // Clean up test logs
    if (existsSync(LOG_PATH)) {
      unlinkSync(LOG_PATH);
    }
    for (let i = 1; i <= 3; i++) {
      const rotatedLog = `${LOG_PATH}.${i}`;
      if (existsSync(rotatedLog)) {
        unlinkSync(rotatedLog);
      }
    }
  });

  describe('Basic logging', () => {
    it('should not log when config is not set', () => {
      log('info', 'Test message');
      expect(existsSync(LOG_PATH)).toBe(false);
    });

    it('should log when config is set to "all"', () => {
      setConfig({ logging_level: 'all' });
      log('info', 'Test message');

      expect(existsSync(LOG_PATH)).toBe(true);
      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('Test message');
      expect(content).toContain('[INFO]');
    });

    it('should not log when config is set to "none"', () => {
      setConfig({ logging_level: 'none' });
      log('info', 'Test message');

      expect(existsSync(LOG_PATH)).toBe(false);
    });

    it('should only log errors when config is set to "errors"', () => {
      setConfig({ logging_level: 'errors' });

      log('info', 'Info message');
      expect(existsSync(LOG_PATH)).toBe(false);

      log('error', 'Error message');
      expect(existsSync(LOG_PATH)).toBe(true);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('Error message');
      expect(content).not.toContain('Info message');
    });

    it('should include timestamp in log entries', () => {
      setConfig({ logging_level: 'all' });
      log('info', 'Test message');

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include log level in log entries', () => {
      setConfig({ logging_level: 'all' });

      log('info', 'Info message');
      log('error', 'Error message');

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('[INFO]');
      expect(content).toContain('[ERROR]');
    });

    it('should include data object in log entries', () => {
      setConfig({ logging_level: 'all' });
      log('info', 'Test message', { user: 'test', count: 5 });

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('user');
      expect(content).toContain('test');
      expect(content).toContain('count');
      expect(content).toContain('5');
    });

    it('should handle empty data object', () => {
      setConfig({ logging_level: 'all' });
      log('info', 'Test message', {});

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('Test message');
    });
  });

  describe('Log rotation', () => {
    it('should rotate log file when size exceeds limit', () => {
      setConfig({ logging_level: 'all' });

      // Create a large log file
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      writeFileSync(LOG_PATH, largeContent);

      // Log a new message
      log('info', 'After rotation');

      // Check that rotation occurred
      expect(existsSync(`${LOG_PATH}.1`)).toBe(true);

      // New log should be small
      const stats = statSync(LOG_PATH);
      expect(stats.size).toBeLessThan(1000);
    });

    it('should maintain up to 3 rotated log files', () => {
      setConfig({ logging_level: 'all' });

      // Simulate multiple rotations by creating large files
      for (let i = 0; i < 4; i++) {
        const largeContent = 'x'.repeat(11 * 1024 * 1024);
        writeFileSync(LOG_PATH, largeContent);
        log('info', `Rotation ${i}`);
      }

      // Should have at most 3 rotated files (or fewer)
      const rotatedCount = [1, 2, 3].filter(i => existsSync(`${LOG_PATH}.${i}`)).length;
      expect(rotatedCount).toBeLessThanOrEqual(3);
      expect(existsSync(`${LOG_PATH}.4`)).toBe(false);
    });

    it('should not rotate small log files', () => {
      setConfig({ logging_level: 'all' });

      // Log multiple small messages
      for (let i = 0; i < 100; i++) {
        log('info', `Message ${i}`);
      }

      // Should not have rotated
      expect(existsSync(`${LOG_PATH}.1`)).toBe(false);
      expect(existsSync(LOG_PATH)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle logging to non-existent directory gracefully', () => {
      setConfig({ logging_level: 'all' });

      // This should not throw even if there are permission issues
      expect(() => {
        log('info', 'Test message');
      }).not.toThrow();
    });

    it('should handle complex data objects', () => {
      setConfig({ logging_level: 'all' });

      const complexData = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        string: 'test'
      };

      // Should not throw
      expect(() => {
        log('info', 'Test', complexData);
      }).not.toThrow();

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('Test');
    });
  });

  describe('Security: Sensitive data scrubbing', () => {
    it('should mask bot_token in logs', () => {
      setConfig({ logging_level: 'all' });

      const sensitiveData = {
        bot_token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        message: 'Test message'
      };

      log('info', 'Bot initialized', sensitiveData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('123456789:***');
      expect(content).not.toContain('ABCdefGHIjklMNOpqrsTUVwxyz');
      expect(content).toContain('Test message');
    });

    it('should mask token field in logs', () => {
      setConfig({ logging_level: 'all' });

      const sensitiveData = {
        token: 'secret_token_123456789',
        user: 'testuser'
      };

      log('info', 'Authentication', sensitiveData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('secret_tok***');
      expect(content).not.toContain('secret_token_123456789');
      expect(content).toContain('testuser');
    });

    it('should mask password field in logs', () => {
      setConfig({ logging_level: 'all' });

      const sensitiveData = {
        username: 'admin',
        password: 'super_secret_password'
      };

      log('info', 'Login attempt', sensitiveData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('super_secr***');
      expect(content).not.toContain('super_secret_password');
      expect(content).toContain('admin');
    });

    it('should mask secret field in logs', () => {
      setConfig({ logging_level: 'all' });

      const sensitiveData = {
        secret: 'my_secret_key_12345',
        config: 'test'
      };

      log('info', 'Config loaded', sensitiveData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('my_secret_***');
      expect(content).not.toContain('my_secret_key_12345');
      expect(content).toContain('test');
    });

    it('should mask apiKey and api_key fields in logs', () => {
      setConfig({ logging_level: 'all' });

      const sensitiveData = {
        apiKey: 'api_key_123456789',
        api_key: 'another_key_987654321',
        service: 'external_api'
      };

      log('info', 'API call', sensitiveData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('api_key_12***');
      expect(content).toContain('another_ke***');
      expect(content).not.toContain('api_key_123456789');
      expect(content).not.toContain('another_key_987654321');
      expect(content).toContain('external_api');
    });

    it('should mask nested sensitive data in logs', () => {
      setConfig({ logging_level: 'all' });

      const sensitiveData = {
        config: {
          bot_token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
          timeout: 600
        },
        status: 'active'
      };

      log('info', 'Nested config', sensitiveData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('123456789:***');
      expect(content).not.toContain('ABCdefGHIjklMNOpqrsTUVwxyz');
      expect(content).toContain('600');
      expect(content).toContain('active');
    });

    it('should handle case-insensitive sensitive key matching', () => {
      setConfig({ logging_level: 'all' });

      const sensitiveData = {
        Bot_Token: 'token_with_mixed_case_123',
        PASSWORD: 'uppercase_password',
        ApiKey: 'mixed_case_api_key'
      };

      log('info', 'Mixed case test', sensitiveData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('token_with***');
      expect(content).toContain('uppercase_***');
      expect(content).toContain('mixed_case***');
      expect(content).not.toContain('token_with_mixed_case_123');
      expect(content).not.toContain('uppercase_password');
      expect(content).not.toContain('mixed_case_api_key');
    });

    it('should mask sensitive data in arrays', () => {
      setConfig({ logging_level: 'all' });

      const sensitiveData = {
        credentials: [
          { token: 'token1_secret' },
          { token: 'token2_secret' }
        ]
      };

      log('info', 'Array test', sensitiveData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('token1_sec***');
      expect(content).toContain('token2_sec***');
      expect(content).not.toContain('token1_secret');
      expect(content).not.toContain('token2_secret');
    });

    it('should not mask non-sensitive data', () => {
      setConfig({ logging_level: 'all' });

      const normalData = {
        message_id: 12345,
        chat_id: '987654321',
        text: 'Hello world',
        priority: 'high'
      };

      log('info', 'Normal data', normalData);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('12345');
      expect(content).toContain('987654321');
      expect(content).toContain('Hello world');
      expect(content).toContain('high');
    });

    it('should handle empty strings in sensitive fields', () => {
      setConfig({ logging_level: 'all' });

      const data = {
        bot_token: '',
        message: 'test'
      };

      log('info', 'Empty token', data);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('test');
    });

    it('should handle null and undefined values', () => {
      setConfig({ logging_level: 'all' });

      const data = {
        bot_token: null,
        password: undefined,
        message: 'test'
      };

      log('info', 'Null values', data);

      const content = readFileSync(LOG_PATH, 'utf-8');
      expect(content).toContain('test');
    });

    it('should not modify original data object', () => {
      setConfig({ logging_level: 'all' });

      const originalData = {
        bot_token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        message: 'test'
      };

      log('info', 'Original preservation', originalData);

      // Original should remain unchanged
      expect(originalData.bot_token).toBe('123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
      expect(originalData.message).toBe('test');
    });
  });
});
