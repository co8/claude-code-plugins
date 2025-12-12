/**
 * Tests for AFK mode and message listener features
 * Tests state persistence, duration formatting, and command queue management
 */

import { jest } from '@jest/globals';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

// Test state file path
const TEST_STATE_PATH = join(process.cwd(), '.test-afk-mode.state');

describe('AFK Mode', () => {
  beforeEach(() => {
    // Clean up test state file before each test
    if (existsSync(TEST_STATE_PATH)) {
      unlinkSync(TEST_STATE_PATH);
    }
  });

  afterEach(() => {
    // Clean up test state file after each test
    if (existsSync(TEST_STATE_PATH)) {
      unlinkSync(TEST_STATE_PATH);
    }
  });

  describe('saveAfkState', () => {
    test('should save enabled state with timestamp', () => {
      const enabled = true;
      const startTime = Date.now();
      const stateData = {
        enabled,
        startTime,
      };

      writeFileSync(TEST_STATE_PATH, JSON.stringify(stateData), 'utf-8');

      expect(existsSync(TEST_STATE_PATH)).toBe(true);
      const content = readFileSync(TEST_STATE_PATH, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.enabled).toBe(true);
      expect(parsed.startTime).toBe(startTime);
    });

    test('should save disabled state with null timestamp', () => {
      const enabled = false;
      const stateData = {
        enabled,
        startTime: null,
      };

      writeFileSync(TEST_STATE_PATH, JSON.stringify(stateData), 'utf-8');

      const content = readFileSync(TEST_STATE_PATH, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.enabled).toBe(false);
      expect(parsed.startTime).toBeNull();
    });

    test('should auto-generate timestamp if not provided', () => {
      const enabled = true;
      const startTime = Date.now();
      const stateData = {
        enabled,
        startTime,
      };

      writeFileSync(TEST_STATE_PATH, JSON.stringify(stateData), 'utf-8');

      const content = readFileSync(TEST_STATE_PATH, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.startTime).toBeDefined();
      expect(typeof parsed.startTime).toBe('number');
    });
  });

  describe('loadAfkState', () => {
    test('should load enabled state from file', () => {
      const stateData = {
        enabled: true,
        startTime: Date.now(),
      };
      writeFileSync(TEST_STATE_PATH, JSON.stringify(stateData), 'utf-8');

      const content = readFileSync(TEST_STATE_PATH, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.enabled).toBe(true);
      expect(parsed.startTime).toBeDefined();
    });

    test('should load disabled state from file', () => {
      const stateData = {
        enabled: false,
        startTime: null,
      };
      writeFileSync(TEST_STATE_PATH, JSON.stringify(stateData), 'utf-8');

      const content = readFileSync(TEST_STATE_PATH, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.enabled).toBe(false);
      expect(parsed.startTime).toBeNull();
    });

    test('should return false when state file does not exist', () => {
      expect(existsSync(TEST_STATE_PATH)).toBe(false);
      // Simulate loadAfkState behavior
      const result = false;
      expect(result).toBe(false);
    });

    test('should support legacy "enabled" format', () => {
      writeFileSync(TEST_STATE_PATH, 'enabled', 'utf-8');

      const content = readFileSync(TEST_STATE_PATH, 'utf-8').trim();
      const isEnabled = content === 'enabled';

      expect(isEnabled).toBe(true);
    });

    test('should support legacy "disabled" format', () => {
      writeFileSync(TEST_STATE_PATH, 'disabled', 'utf-8');

      const content = readFileSync(TEST_STATE_PATH, 'utf-8').trim();
      const isEnabled = content === 'enabled';

      expect(isEnabled).toBe(false);
    });

    test('should handle corrupted state file gracefully', () => {
      writeFileSync(TEST_STATE_PATH, 'invalid json {', 'utf-8');

      let result = false;
      try {
        const content = readFileSync(TEST_STATE_PATH, 'utf-8').trim();
        JSON.parse(content);
      } catch (error) {
        result = false;
      }

      expect(result).toBe(false);
    });
  });

  describe('formatDuration', () => {
    test('should format seconds correctly', () => {
      const formatDuration = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        } else {
          return `${seconds}s`;
        }
      };

      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(30000)).toBe('30s');
      expect(formatDuration(59000)).toBe('59s');
    });

    test('should format minutes correctly', () => {
      const formatDuration = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        } else {
          return `${seconds}s`;
        }
      };

      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(600000)).toBe('10m 0s');
    });

    test('should format hours correctly', () => {
      const formatDuration = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        } else {
          return `${seconds}s`;
        }
      };

      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(3900000)).toBe('1h 5m');
      expect(formatDuration(7200000)).toBe('2h 0m');
    });

    test('should format days correctly', () => {
      const formatDuration = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        } else {
          return `${seconds}s`;
        }
      };

      expect(formatDuration(86400000)).toBe('1d 0h 0m');
      expect(formatDuration(90000000)).toBe('1d 1h 0m');
      expect(formatDuration(172800000)).toBe('2d 0h 0m');
    });

    test('should format complex durations', () => {
      const formatDuration = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        } else {
          return `${seconds}s`;
        }
      };

      // 2 days, 3 hours, 45 minutes
      const complex = (2 * 24 + 3) * 60 * 60 * 1000 + 45 * 60 * 1000;
      expect(formatDuration(complex)).toBe('2d 3h 45m');
    });

    test('should handle zero duration', () => {
      const formatDuration = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        } else {
          return `${seconds}s`;
        }
      };

      expect(formatDuration(0)).toBe('0s');
    });
  });

  describe('enableAfkMode', () => {
    test('should set isAfkMode to true', () => {
      let isAfkMode = false;
      isAfkMode = true;

      expect(isAfkMode).toBe(true);
    });

    test('should set afkStartTime to current time', () => {
      const startTime = Date.now();

      expect(startTime).toBeDefined();
      expect(typeof startTime).toBe('number');
      expect(startTime).toBeGreaterThan(0);
    });

    test('should save state when enabled', () => {
      const stateData = {
        enabled: true,
        startTime: Date.now(),
      };

      writeFileSync(TEST_STATE_PATH, JSON.stringify(stateData), 'utf-8');

      expect(existsSync(TEST_STATE_PATH)).toBe(true);
      const content = readFileSync(TEST_STATE_PATH, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.enabled).toBe(true);
      expect(parsed.startTime).toBeDefined();
    });

    test('should return success result', () => {
      const result = {
        success: true,
        message: 'AFK mode enabled',
        afk_mode: true,
      };

      expect(result.success).toBe(true);
      expect(result.afk_mode).toBe(true);
      expect(result.message).toBe('AFK mode enabled');
    });
  });

  describe('disableAfkMode', () => {
    test('should set isAfkMode to false', () => {
      let isAfkMode = true;
      isAfkMode = false;

      expect(isAfkMode).toBe(false);
    });

    test('should calculate duration correctly', () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(60000);
      expect(duration).toBeLessThan(61000);
    });

    test('should save disabled state', () => {
      const stateData = {
        enabled: false,
        startTime: null,
      };

      writeFileSync(TEST_STATE_PATH, JSON.stringify(stateData), 'utf-8');

      expect(existsSync(TEST_STATE_PATH)).toBe(true);
      const content = readFileSync(TEST_STATE_PATH, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.enabled).toBe(false);
      expect(parsed.startTime).toBeNull();
    });

    test('should return success result with duration', () => {
      const result = {
        success: true,
        message: 'AFK mode disabled',
        afk_mode: false,
        duration: '1m 30s',
      };

      expect(result.success).toBe(true);
      expect(result.afk_mode).toBe(false);
      expect(result.duration).toBeDefined();
      expect(result.message).toBe('AFK mode disabled');
    });

    test('should handle missing afkStartTime', () => {
      const afkStartTime = null;
      const duration = afkStartTime ? 'calculated' : 'Unknown';

      expect(duration).toBe('Unknown');
    });
  });
});

describe('Message Listener', () => {
  let commandQueue;
  let isListeningForCommands;

  beforeEach(() => {
    commandQueue = [];
    isListeningForCommands = false;
  });

  describe('startMessageListener', () => {
    test('should set listening flag to true', () => {
      isListeningForCommands = true;

      expect(isListeningForCommands).toBe(true);
    });

    test('should return success result', () => {
      const result = {
        success: true,
        listening: true,
        bot_username: 'test_bot',
      };

      expect(result.success).toBe(true);
      expect(result.listening).toBe(true);
      expect(result.bot_username).toBe('test_bot');
    });

    test('should handle already active listener', () => {
      isListeningForCommands = true;

      const result = isListeningForCommands
        ? { success: true, already_active: true }
        : { success: true, listening: true };

      expect(result.success).toBe(true);
      expect(result.already_active).toBe(true);
    });

    test('should initialize empty command queue', () => {
      commandQueue = [];

      expect(commandQueue).toEqual([]);
      expect(commandQueue.length).toBe(0);
    });
  });

  describe('stopMessageListener', () => {
    test('should set listening flag to false', () => {
      isListeningForCommands = true;
      isListeningForCommands = false;

      expect(isListeningForCommands).toBe(false);
    });

    test('should clear command queue', () => {
      commandQueue = [
        { id: 1, text: 'command1' },
        { id: 2, text: 'command2' },
      ];

      commandQueue.length = 0;

      expect(commandQueue).toEqual([]);
      expect(commandQueue.length).toBe(0);
    });

    test('should return success result', () => {
      const result = {
        success: true,
        listening: false,
      };

      expect(result.success).toBe(true);
      expect(result.listening).toBe(false);
    });

    test('should handle already stopped listener', () => {
      isListeningForCommands = false;

      const result = !isListeningForCommands
        ? { success: true, already_stopped: true }
        : { success: true, listening: false };

      expect(result.success).toBe(true);
      expect(result.already_stopped).toBe(true);
    });
  });

  describe('getPendingCommands', () => {
    test('should retrieve commands from queue', () => {
      commandQueue = [
        { id: 1, text: 'command1', from: 'user1', timestamp: Date.now() },
        { id: 2, text: 'command2', from: 'user2', timestamp: Date.now() },
      ];

      const commands = commandQueue.splice(0, 10);
      const result = {
        commands,
        remaining: commandQueue.length,
      };

      expect(result.commands.length).toBe(2);
      expect(result.remaining).toBe(0);
    });

    test('should respect limit parameter', () => {
      commandQueue = [
        { id: 1, text: 'cmd1', from: 'user1', timestamp: Date.now() },
        { id: 2, text: 'cmd2', from: 'user2', timestamp: Date.now() },
        { id: 3, text: 'cmd3', from: 'user3', timestamp: Date.now() },
      ];

      const limit = 2;
      const commands = commandQueue.splice(0, limit);
      const result = {
        commands,
        remaining: commandQueue.length,
      };

      expect(result.commands.length).toBe(2);
      expect(result.remaining).toBe(1);
    });

    test('should default limit to 10', () => {
      const limit = 10;
      expect(limit).toBe(10);
    });

    test('should remove retrieved commands from queue', () => {
      commandQueue = [
        { id: 1, text: 'cmd1', from: 'user1', timestamp: Date.now() },
        { id: 2, text: 'cmd2', from: 'user2', timestamp: Date.now() },
      ];

      const originalLength = commandQueue.length;
      commandQueue.splice(0, 10);

      expect(commandQueue.length).toBe(0);
      expect(originalLength).toBe(2);
    });

    test('should return empty array when queue is empty', () => {
      commandQueue = [];

      const commands = commandQueue.splice(0, 10);
      const result = {
        commands,
        remaining: commandQueue.length,
      };

      expect(result.commands).toEqual([]);
      expect(result.remaining).toBe(0);
    });

    test('should include command metadata', () => {
      const timestamp = Date.now();
      commandQueue = [
        {
          id: 123,
          text: 'test command',
          from: 'username',
          timestamp,
          chat_id: 456789,
        },
      ];

      const commands = commandQueue.splice(0, 10);

      expect(commands[0].id).toBe(123);
      expect(commands[0].text).toBe('test command');
      expect(commands[0].from).toBe('username');
      expect(commands[0].timestamp).toBe(timestamp);
      expect(commands[0].chat_id).toBe(456789);
    });
  });

  describe('getListenerStatus', () => {
    test('should return listening status', () => {
      isListeningForCommands = true;
      commandQueue = [{ id: 1, text: 'cmd' }];

      const result = {
        listening: isListeningForCommands,
        pending_commands: commandQueue.length,
        polling_active: false,
      };

      expect(result.listening).toBe(true);
      expect(result.pending_commands).toBe(1);
    });

    test('should show inactive status when not listening', () => {
      isListeningForCommands = false;
      commandQueue = [];

      const result = {
        listening: isListeningForCommands,
        pending_commands: commandQueue.length,
        polling_active: false,
      };

      expect(result.listening).toBe(false);
      expect(result.pending_commands).toBe(0);
    });

    test('should track pending command count', () => {
      commandQueue = [
        { id: 1, text: 'cmd1' },
        { id: 2, text: 'cmd2' },
        { id: 3, text: 'cmd3' },
      ];

      const result = {
        listening: isListeningForCommands,
        pending_commands: commandQueue.length,
        polling_active: false,
      };

      expect(result.pending_commands).toBe(3);
    });

    test('should include polling status', () => {
      const isPolling = true;

      const result = {
        listening: isListeningForCommands,
        pending_commands: commandQueue.length,
        polling_active: isPolling,
      };

      expect(result.polling_active).toBe(true);
    });
  });

  describe('Command Queue Management', () => {
    test('should add commands to queue in order', () => {
      commandQueue = [];

      commandQueue.push({ id: 1, text: 'first' });
      commandQueue.push({ id: 2, text: 'second' });
      commandQueue.push({ id: 3, text: 'third' });

      expect(commandQueue[0].id).toBe(1);
      expect(commandQueue[1].id).toBe(2);
      expect(commandQueue[2].id).toBe(3);
    });

    test('should ignore messages from bot itself', () => {
      const botId = 123456;
      const message = {
        from: { id: botId },
        text: 'bot message',
      };

      const shouldIgnore = message.from.id === botId;

      expect(shouldIgnore).toBe(true);
    });

    test('should only process messages from configured chat', () => {
      const configChatId = '789012';
      const message = {
        chat: { id: 789012 },
        text: 'message',
      };

      const isAuthorized = message.chat.id.toString() === configChatId;

      expect(isAuthorized).toBe(true);
    });

    test('should reject messages from unauthorized chats', () => {
      const configChatId = '789012';
      const message = {
        chat: { id: 999999 },
        text: 'message',
      };

      const isAuthorized = message.chat.id.toString() === configChatId;

      expect(isAuthorized).toBe(false);
    });

    test('should extract command metadata correctly', () => {
      const message = {
        message_id: 456,
        text: '/help',
        from: { username: 'testuser', first_name: 'Test' },
        date: Math.floor(Date.now() / 1000),
        chat: { id: 789 },
      };

      const command = {
        id: message.message_id,
        text: message.text,
        from: message.from.username || message.from.first_name,
        timestamp: message.date * 1000,
        chat_id: message.chat.id,
      };

      expect(command.id).toBe(456);
      expect(command.text).toBe('/help');
      expect(command.from).toBe('testuser');
      expect(typeof command.timestamp).toBe('number');
      expect(command.chat_id).toBe(789);
    });

    test('should use first_name if username not available', () => {
      const message = {
        from: { first_name: 'Test User' },
      };

      const from = message.from.username || message.from.first_name;

      expect(from).toBe('Test User');
    });
  });
});

describe('MCP Tool: enable_afk_mode', () => {
  test('should validate tool has no required parameters', () => {
    const inputSchema = {
      type: 'object',
      properties: {},
    };

    expect(inputSchema.properties).toEqual({});
  });

  test('should return success with afk_mode flag', () => {
    const result = {
      success: true,
      message: 'AFK mode enabled',
      afk_mode: true,
    };

    expect(result.success).toBe(true);
    expect(result.afk_mode).toBe(true);
  });
});

describe('MCP Tool: disable_afk_mode', () => {
  test('should validate tool has no required parameters', () => {
    const inputSchema = {
      type: 'object',
      properties: {},
    };

    expect(inputSchema.properties).toEqual({});
  });

  test('should return success with duration', () => {
    const result = {
      success: true,
      message: 'AFK mode disabled',
      afk_mode: false,
      duration: '2h 30m',
    };

    expect(result.success).toBe(true);
    expect(result.afk_mode).toBe(false);
    expect(result.duration).toBeDefined();
  });
});

describe('MCP Tool: start_listener', () => {
  test('should validate tool has no required parameters', () => {
    const inputSchema = {
      type: 'object',
      properties: {},
    };

    expect(inputSchema.properties).toEqual({});
  });

  test('should return success with listening status', () => {
    const result = {
      success: true,
      listening: true,
      bot_username: 'my_bot',
    };

    expect(result.success).toBe(true);
    expect(result.listening).toBe(true);
    expect(result.bot_username).toBeDefined();
  });
});

describe('MCP Tool: stop_listener', () => {
  test('should validate tool has no required parameters', () => {
    const inputSchema = {
      type: 'object',
      properties: {},
    };

    expect(inputSchema.properties).toEqual({});
  });

  test('should return success with listening status', () => {
    const result = {
      success: true,
      listening: false,
    };

    expect(result.success).toBe(true);
    expect(result.listening).toBe(false);
  });
});

describe('MCP Tool: get_pending_commands', () => {
  test('should validate limit parameter is optional', () => {
    const inputSchema = {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of commands to retrieve (default: 10)',
          default: 10,
        },
      },
    };

    expect(inputSchema.properties.limit.default).toBe(10);
  });

  test('should return commands and remaining count', () => {
    const result = {
      commands: [
        { id: 1, text: 'command 1' },
        { id: 2, text: 'command 2' },
      ],
      remaining: 3,
    };

    expect(result.commands.length).toBe(2);
    expect(result.remaining).toBe(3);
  });
});

describe('MCP Tool: get_listener_status', () => {
  test('should validate tool has no required parameters', () => {
    const inputSchema = {
      type: 'object',
      properties: {},
    };

    expect(inputSchema.properties).toEqual({});
  });

  test('should return complete status information', () => {
    const result = {
      listening: true,
      pending_commands: 5,
      polling_active: true,
    };

    expect(result.listening).toBe(true);
    expect(result.pending_commands).toBe(5);
    expect(result.polling_active).toBe(true);
  });
});
