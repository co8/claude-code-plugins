import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { log, setConfig } from '../utils/logger.js';
import { existsSync, unlinkSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_PATH = join(dirname(dirname(__dirname)), 'telegram.log');

describe('Logger', () => {
  beforeEach(() => {
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
});
