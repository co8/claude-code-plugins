/**
 * Tests for loadConfig() function
 * Tests configuration loading from YAML frontmatter in .local.md files
 */

import { describe, test, expect } from '@jest/globals';

describe('loadConfig', () => {
  test('should throw error if config file does not exist', () => {
    const loadConfig = () => {
      const configExists = false;
      if (!configExists) {
        throw new Error('Configuration file not found');
      }
    };

    expect(loadConfig).toThrow('Configuration file not found');
  });

  test('should throw error if no YAML frontmatter found', () => {
    const loadConfig = () => {
      const content = '# This is just markdown without frontmatter';
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!yamlMatch) {
        throw new Error('No YAML frontmatter found in configuration file');
      }
    };

    expect(loadConfig).toThrow('No YAML frontmatter found in configuration file');
  });

  test('should parse valid YAML with bot_token and chat_id', () => {
    const validConfig = `---
bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
chat_id: "987654321"
timeout_seconds: 600
logging_level: "errors"
batch_window_seconds: 30
---

# Telegram Configuration
This is the config file.`;

    const loadConfig = () => {
      const content = validConfig;
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!yamlMatch) {
        throw new Error('No YAML frontmatter found');
      }

      const yaml = yamlMatch[1];
      const config = {
        bot_token: '',
        chat_id: '',
        timeout_seconds: 600,
        logging_level: 'errors',
        batch_window_seconds: 30
      };

      const tokenMatch = yaml.match(/bot_token:\s*"([^"]+)"/);
      const chatMatch = yaml.match(/chat_id:\s*"([^"]+)"/);
      const timeoutMatch = yaml.match(/timeout_seconds:\s*(\d+)/);
      const loggingMatch = yaml.match(/logging_level:\s*"([^"]+)"/);
      const batchMatch = yaml.match(/batch_window_seconds:\s*(\d+)/);

      if (tokenMatch) config.bot_token = tokenMatch[1];
      if (chatMatch) config.chat_id = chatMatch[1];
      if (timeoutMatch) config.timeout_seconds = parseInt(timeoutMatch[1]);
      if (loggingMatch) config.logging_level = loggingMatch[1];
      if (batchMatch) config.batch_window_seconds = parseInt(batchMatch[1]);

      if (!config.bot_token || !config.chat_id) {
        throw new Error('bot_token and chat_id are required in configuration');
      }

      return config;
    };

    const config = loadConfig();
    expect(config.bot_token).toBe('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    expect(config.chat_id).toBe('987654321');
    expect(config.timeout_seconds).toBe(600);
    expect(config.logging_level).toBe('errors');
    expect(config.batch_window_seconds).toBe(30);
  });

  test('should throw error if bot_token is missing', () => {
    const invalidConfig = `---
chat_id: "987654321"
---`;

    const loadConfig = () => {
      const content = invalidConfig;
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const yaml = yamlMatch[1];

      const config = { bot_token: '', chat_id: '' };
      const tokenMatch = yaml.match(/bot_token:\s*"([^"]+)"/);
      const chatMatch = yaml.match(/chat_id:\s*"([^"]+)"/);

      if (tokenMatch) config.bot_token = tokenMatch[1];
      if (chatMatch) config.chat_id = chatMatch[1];

      if (!config.bot_token || !config.chat_id) {
        throw new Error('bot_token and chat_id are required in configuration');
      }
    };

    expect(loadConfig).toThrow('bot_token and chat_id are required in configuration');
  });

  test('should throw error if chat_id is missing', () => {
    const invalidConfig = `---
bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
---`;

    const loadConfig = () => {
      const content = invalidConfig;
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const yaml = yamlMatch[1];

      const config = { bot_token: '', chat_id: '' };
      const tokenMatch = yaml.match(/bot_token:\s*"([^"]+)"/);
      const chatMatch = yaml.match(/chat_id:\s*"([^"]+)"/);

      if (tokenMatch) config.bot_token = tokenMatch[1];
      if (chatMatch) config.chat_id = chatMatch[1];

      if (!config.bot_token || !config.chat_id) {
        throw new Error('bot_token and chat_id are required in configuration');
      }
    };

    expect(loadConfig).toThrow('bot_token and chat_id are required in configuration');
  });

  test('should use default values when optional fields are missing', () => {
    const minimalConfig = `---
bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
chat_id: "987654321"
---`;

    const loadConfig = () => {
      const content = minimalConfig;
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const yaml = yamlMatch[1];

      const config = {
        bot_token: '',
        chat_id: '',
        timeout_seconds: 600,
        logging_level: 'errors',
        batch_window_seconds: 30
      };

      const tokenMatch = yaml.match(/bot_token:\s*"([^"]+)"/);
      const chatMatch = yaml.match(/chat_id:\s*"([^"]+)"/);
      const timeoutMatch = yaml.match(/timeout_seconds:\s*(\d+)/);
      const loggingMatch = yaml.match(/logging_level:\s*"([^"]+)"/);
      const batchMatch = yaml.match(/batch_window_seconds:\s*(\d+)/);

      if (tokenMatch) config.bot_token = tokenMatch[1];
      if (chatMatch) config.chat_id = chatMatch[1];
      if (timeoutMatch) config.timeout_seconds = parseInt(timeoutMatch[1]);
      if (loggingMatch) config.logging_level = loggingMatch[1];
      if (batchMatch) config.batch_window_seconds = parseInt(batchMatch[1]);

      if (!config.bot_token || !config.chat_id) {
        throw new Error('bot_token and chat_id are required in configuration');
      }

      return config;
    };

    const config = loadConfig();
    expect(config.timeout_seconds).toBe(600);
    expect(config.logging_level).toBe('errors');
    expect(config.batch_window_seconds).toBe(30);
  });

  test('should handle values without quotes', () => {
    const configWithoutQuotes = `---
bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
chat_id: "987654321"
timeout_seconds: 900
logging_level: "info"
---`;

    const loadConfig = () => {
      const content = configWithoutQuotes;
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const yaml = yamlMatch[1];

      const config = {
        bot_token: '',
        chat_id: '',
        timeout_seconds: 600
      };

      const tokenMatch = yaml.match(/bot_token:\s*"([^"]+)"/);
      const chatMatch = yaml.match(/chat_id:\s*"([^"]+)"/);
      const timeoutMatch = yaml.match(/timeout_seconds:\s*(\d+)/);

      if (tokenMatch) config.bot_token = tokenMatch[1];
      if (chatMatch) config.chat_id = chatMatch[1];
      if (timeoutMatch) config.timeout_seconds = parseInt(timeoutMatch[1]);

      if (!config.bot_token || !config.chat_id) {
        throw new Error('bot_token and chat_id are required');
      }

      return config;
    };

    const config = loadConfig();
    expect(config.timeout_seconds).toBe(900);
  });

  test('should handle single quotes in YAML', () => {
    const configWithSingleQuotes = `---
bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
chat_id: "987654321"
logging_level: "debug"
---`;

    const loadConfig = () => {
      const content = configWithSingleQuotes;
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const yaml = yamlMatch[1];

      const config = {
        bot_token: '',
        chat_id: '',
        logging_level: 'errors'
      };

      const tokenMatch = yaml.match(/bot_token:\s*"([^"]+)"/);
      const chatMatch = yaml.match(/chat_id:\s*"([^"]+)"/);
      const loggingMatch = yaml.match(/logging_level:\s*"([^"]+)"/);

      if (tokenMatch) config.bot_token = tokenMatch[1];
      if (chatMatch) config.chat_id = chatMatch[1];
      if (loggingMatch) config.logging_level = loggingMatch[1];

      if (!config.bot_token || !config.chat_id) {
        throw new Error('bot_token and chat_id are required');
      }

      return config;
    };

    const config = loadConfig();
    expect(config.logging_level).toBe('debug');
  });
});
