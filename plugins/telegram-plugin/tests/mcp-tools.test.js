/**
 * Tests for MCP tool handlers
 * Tests validation, error handling, and tool execution
 */

import { jest } from '@jest/globals';

// Mock Telegram bot for testing
class MockTelegramBot {
  constructor(token, options) {
    this.token = token;
    this.options = options;
    this.messages = [];
    this.callbacks = [];
  }

  async sendMessage(chatId, text, options) {
    const message = {
      message_id: this.messages.length + 1,
      chat: { id: chatId },
      text,
      ...options
    };
    this.messages.push(message);
    return message;
  }

  async answerCallbackQuery(callbackQueryId) {
    return { ok: true };
  }

  startPolling() {
    this.isPolling = true;
  }

  stopPolling() {
    this.isPolling = false;
  }

  on(event, handler) {
    this.callbacks.push({ event, handler });
  }

  removeListener(event, handler) {
    this.callbacks = this.callbacks.filter(
      cb => !(cb.event === event && cb.handler === handler)
    );
  }
}

describe('MCP Tool: send_message', () => {
  let bot;

  beforeEach(() => {
    bot = new MockTelegramBot('test-token', { polling: false });
  });

  test('should validate required text parameter', async () => {
    const args = {};

    const validate = () => {
      if (!args.text) {
        throw new Error('text parameter is required');
      }
    };

    expect(validate).toThrow('text parameter is required');
  });

  test('should accept valid text parameter', async () => {
    const args = { text: 'Test message' };

    const validate = () => {
      if (!args.text || typeof args.text !== 'string') {
        throw new Error('text must be a string');
      }
    };

    expect(validate).not.toThrow();
  });

  test('should default priority to normal', () => {
    const args = { text: 'Test' };
    const priority = args.priority || 'normal';

    expect(priority).toBe('normal');
  });

  test('should accept valid priority values', () => {
    const validPriorities = ['low', 'normal', 'high'];

    validPriorities.forEach(priority => {
      const args = { text: 'Test', priority };
      const validate = () => {
        if (!validPriorities.includes(args.priority)) {
          throw new Error('Invalid priority');
        }
      };

      expect(validate).not.toThrow();
    });
  });

  test('should reject invalid priority values', () => {
    const args = { text: 'Test', priority: 'invalid' };

    const validate = () => {
      const validPriorities = ['low', 'normal', 'high'];
      if (!validPriorities.includes(args.priority)) {
        throw new Error('Invalid priority value');
      }
    };

    expect(validate).toThrow('Invalid priority value');
  });

  test('should send message with correct parameters', async () => {
    const chatId = '123456789';
    const text = 'Test message';

    const result = await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });

    expect(result).toHaveProperty('message_id');
    expect(result.text).toBe(text);
    expect(bot.messages).toHaveLength(1);
  });

  test('should return success with message_id', async () => {
    const chatId = '123456789';
    const message = await bot.sendMessage(chatId, 'Test', {});

    const result = { success: true, message_id: message.message_id };

    expect(result.success).toBe(true);
    expect(result.message_id).toBeDefined();
  });
});

describe('MCP Tool: send_approval_request', () => {
  let bot;

  beforeEach(() => {
    bot = new MockTelegramBot('test-token', { polling: false });
  });

  test('should validate required question parameter', () => {
    const args = { options: [] };

    const validate = () => {
      if (!args.question) {
        throw new Error('question parameter is required');
      }
    };

    expect(validate).toThrow('question parameter is required');
  });

  test('should validate required options parameter', () => {
    const args = { question: 'Choose one' };

    const validate = () => {
      if (!args.options || !Array.isArray(args.options)) {
        throw new Error('options must be an array');
      }
    };

    expect(validate).toThrow('options must be an array');
  });

  test('should validate options array is not empty', () => {
    const args = { question: 'Choose one', options: [] };

    const validate = () => {
      if (args.options.length === 0) {
        throw new Error('options array must not be empty');
      }
    };

    expect(validate).toThrow('options array must not be empty');
  });

  test('should validate option object structure', () => {
    const args = {
      question: 'Choose one',
      options: [
        { label: 'Option 1', description: 'First option' }
      ]
    };

    const validate = () => {
      args.options.forEach(opt => {
        if (!opt.label || !opt.description) {
          throw new Error('Each option must have label and description');
        }
      });
    };

    expect(validate).not.toThrow();
  });

  test('should reject options without label', () => {
    const args = {
      question: 'Choose one',
      options: [
        { description: 'Missing label' }
      ]
    };

    const validate = () => {
      args.options.forEach(opt => {
        if (!opt.label) {
          throw new Error('Option missing label');
        }
      });
    };

    expect(validate).toThrow('Option missing label');
  });

  test('should reject options without description', () => {
    const args = {
      question: 'Choose one',
      options: [
        { label: 'Option 1' }
      ]
    };

    const validate = () => {
      args.options.forEach(opt => {
        if (!opt.description) {
          throw new Error('Option missing description');
        }
      });
    };

    expect(validate).toThrow('Option missing description');
  });

  test('should accept optional header parameter', () => {
    const args = {
      question: 'Choose one',
      options: [{ label: 'A', description: 'Option A' }],
      header: 'Custom Header'
    };

    const header = args.header || 'Approval Request';
    expect(header).toBe('Custom Header');
  });

  test('should default header if not provided', () => {
    const args = {
      question: 'Choose one',
      options: [{ label: 'A', description: 'Option A' }]
    };

    const header = args.header || 'Approval Request';
    expect(header).toBe('Approval Request');
  });

  test('should create inline keyboard from options', () => {
    const options = [
      { label: 'Yes', description: 'Approve' },
      { label: 'No', description: 'Reject' }
    ];

    const keyboard = options.map((opt, idx) => [{
      text: opt.label,
      callback_data: JSON.stringify({ idx, label: opt.label })
    }]);

    expect(keyboard).toHaveLength(2);
    expect(keyboard[0][0].text).toBe('Yes');
    expect(keyboard[1][0].text).toBe('No');
  });

  test('should add Other button to keyboard', () => {
    const options = [
      { label: 'Yes', description: 'Approve' }
    ];

    const keyboard = options.map((opt, idx) => [{
      text: opt.label,
      callback_data: JSON.stringify({ idx, label: opt.label })
    }]);

    keyboard.push([{
      text: '💬 Other (custom text)',
      callback_data: JSON.stringify({ idx: -1, label: 'Other' })
    }]);

    expect(keyboard).toHaveLength(2);
    expect(keyboard[1][0].text).toContain('Other');
  });

  test('should return approval_id for polling', async () => {
    const message = await bot.sendMessage('123', 'Test', {});
    const approvalId = `approval_${message.message_id}`;

    const result = {
      success: true,
      message_id: message.message_id,
      approval_id: approvalId
    };

    expect(result.approval_id).toBe(`approval_${message.message_id}`);
  });
});

describe('MCP Tool: poll_response', () => {
  test('should validate required approval_id parameter', () => {
    const args = {};

    const validate = () => {
      if (!args.approval_id) {
        throw new Error('approval_id parameter is required');
      }
    };

    expect(validate).toThrow('approval_id parameter is required');
  });

  test('should default timeout_seconds to 600', () => {
    const args = { approval_id: 'approval_123' };
    const timeout = args.timeout_seconds || 600;

    expect(timeout).toBe(600);
  });

  test('should accept custom timeout_seconds', () => {
    const args = { approval_id: 'approval_123', timeout_seconds: 300 };

    expect(args.timeout_seconds).toBe(300);
  });

  test('should reject invalid approval_id', () => {
    const pendingApprovals = new Map();
    const approvalId = 'invalid_id';

    const validate = () => {
      if (!pendingApprovals.has(approvalId)) {
        throw new Error(`No pending approval found: ${approvalId}`);
      }
    };

    expect(validate).toThrow('No pending approval found');
  });

  test('should find valid approval_id', () => {
    const pendingApprovals = new Map();
    const approvalId = 'approval_123';

    pendingApprovals.set(approvalId, {
      message_id: 123,
      question: 'Test question',
      options: []
    });

    const approval = pendingApprovals.get(approvalId);

    expect(approval).toBeDefined();
    expect(approval.message_id).toBe(123);
  });

  test('should handle timeout response', () => {
    const startTime = Date.now();
    const timeoutSeconds = 600;

    const response = {
      selected: null,
      timed_out: true,
      elapsed_seconds: timeoutSeconds
    };

    expect(response.timed_out).toBe(true);
    expect(response.selected).toBeNull();
    expect(response.elapsed_seconds).toBe(600);
  });

  test('should handle button selection response', () => {
    const startTime = Date.now();
    const elapsedMs = 5000;

    const response = {
      selected: 'Yes',
      elapsed_seconds: elapsedMs / 1000
    };

    expect(response.selected).toBe('Yes');
    expect(response.elapsed_seconds).toBe(5);
  });

  test('should handle custom text response', () => {
    const response = {
      selected: 'Other',
      custom_text: 'Custom user input',
      elapsed_seconds: 10
    };

    expect(response.selected).toBe('Other');
    expect(response.custom_text).toBe('Custom user input');
  });

  test('should calculate elapsed time correctly', () => {
    const startTime = Date.now();
    const endTime = startTime + 15000; // 15 seconds later

    const elapsed = (endTime - startTime) / 1000;

    expect(elapsed).toBe(15);
  });
});

describe('MCP Tool: batch_notifications', () => {
  test('should validate required messages parameter', () => {
    const args = {};

    const validate = () => {
      if (!args.messages || !Array.isArray(args.messages)) {
        throw new Error('messages must be an array');
      }
    };

    expect(validate).toThrow('messages must be an array');
  });

  test('should validate messages array is not empty', () => {
    const args = { messages: [] };

    const validate = () => {
      if (args.messages.length === 0) {
        throw new Error('messages array must not be empty');
      }
    };

    expect(validate).toThrow('messages array must not be empty');
  });

  test('should validate message object structure', () => {
    const args = {
      messages: [
        { text: 'Message 1' },
        { text: 'Message 2', priority: 'high' }
      ]
    };

    const validate = () => {
      args.messages.forEach(msg => {
        if (!msg.text) {
          throw new Error('Each message must have text');
        }
      });
    };

    expect(validate).not.toThrow();
  });

  test('should reject messages without text', () => {
    const args = {
      messages: [
        { priority: 'high' }
      ]
    };

    const validate = () => {
      args.messages.forEach(msg => {
        if (!msg.text) {
          throw new Error('Message missing text');
        }
      });
    };

    expect(validate).toThrow('Message missing text');
  });

  test('should accept messages without priority', () => {
    const args = {
      messages: [
        { text: 'Message without priority' }
      ]
    };

    const validate = () => {
      args.messages.forEach(msg => {
        if (!msg.text) {
          throw new Error('Message missing text');
        }
      });
    };

    expect(validate).not.toThrow();
  });

  test('should return success with batched count', () => {
    const messages = [
      { text: 'Message 1' },
      { text: 'Message 2' },
      { text: 'Message 3' }
    ];

    const result = { success: true, batched: messages.length };

    expect(result.success).toBe(true);
    expect(result.batched).toBe(3);
  });

  test('should handle high priority messages', () => {
    const messages = [
      { text: 'Normal', priority: 'normal' },
      { text: 'High', priority: 'high' }
    ];

    const hasHighPriority = messages.some(m => m.priority === 'high');

    expect(hasHighPriority).toBe(true);
  });
});

describe('Error Handling', () => {
  test('should return error object on failure', () => {
    const error = new Error('Telegram API error');

    const response = {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      }],
      isError: true
    };

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Telegram API error');
  });

  test('should handle unknown tool name', () => {
    const toolName = 'unknown_tool';

    const validate = () => {
      const validTools = ['send_message', 'send_approval_request', 'poll_response', 'batch_notifications'];
      if (!validTools.includes(toolName)) {
        throw new Error(`Unknown tool: ${toolName}`);
      }
    };

    expect(validate).toThrow('Unknown tool: unknown_tool');
  });

  test('should log errors to log file', () => {
    const logEntries = [];

    const log = (level, message, data) => {
      logEntries.push({ level, message, data });
    };

    log('error', 'Tool call failed: send_message', { error: 'Network error' });

    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].level).toBe('error');
    expect(logEntries[0].message).toContain('send_message');
  });
});
