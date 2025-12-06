#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import TelegramBot from 'node-telegram-bot-api';
import { readFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration discovery
function getConfigPath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;

  // Try project-specific config first
  if (projectDir) {
    const projectConfig = join(projectDir, '.claude', 'telegram.local.md');
    if (existsSync(projectConfig)) {
      console.log(`[telegram-bot] Using project-specific config: ${projectConfig}`);
      return projectConfig;
    }
  }

  // Fall back to global config
  const globalConfig = join(homedir(), '.claude', 'telegram.local.md');
  if (existsSync(globalConfig)) {
    console.log(`[telegram-bot] Using global config: ${globalConfig}`);
    return globalConfig;
  }

  throw new Error('No configuration file found. Expected one of:\n' +
    (projectDir ? `  - ${join(projectDir, '.claude', 'telegram.local.md')}\n` : '') +
    `  - ${join(homedir(), '.claude', 'telegram.local.md')}`);
}

const CONFIG_PATH = getConfigPath();
const LOG_PATH = join(dirname(__dirname), 'telegram.log');

// Load configuration from .local.md file
function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Configuration file not found: ${CONFIG_PATH}`);
  }

  const content = readFileSync(CONFIG_PATH, 'utf-8');
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!yamlMatch) {
    throw new Error('No YAML frontmatter found in configuration file');
  }

  // Simple YAML parsing for our use case
  const yaml = yamlMatch[1];
  const config = {
    bot_token: '',
    chat_id: '',
    timeout_seconds: 600,
    notifications: {
      todo_completions: true,
      errors: true,
      session_events: true,
      smart_detection: true
    },
    smart_keywords: ['suggest', 'recommend', 'discovered', 'insight', 'clarify', 'important', 'note', 'warning'],
    logging_level: 'errors',
    batch_window_seconds: 30
  };

  // Extract values
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
}

// FIX #4: Markdown escaping function
function escapeMarkdown(text) {
  if (typeof text !== 'string') return '';

  // Escape special Markdown characters
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let escaped = text;

  for (const char of specialChars) {
    escaped = escaped.replace(new RegExp('\\\\' + char, 'g'), '\\\\' + char);
  }

  return escaped;
}

// FIX #1: Logging utility - use cached config
function log(level, message, data = {}) {
  // Use cached config to avoid loading on every log call
  if (!config) return;

  if (config.logging_level === 'none') return;
  if (config.logging_level === 'errors' && level !== 'error') return;

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}\n`;

  try {
    appendFileSync(LOG_PATH, logEntry);
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

// Message batching
class MessageBatcher {
  constructor(windowSeconds) {
    this.window = windowSeconds * 1000;
    this.pending = [];
    this.timer = null;
  }

  add(message, priority = 'normal') {
    this.pending.push({ message, priority, timestamp: Date.now() });

    // High priority messages send immediately
    if (priority === 'high') {
      this.flush();
      return;
    }

    // Otherwise, batch within window
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.window);
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pending.length === 0) return null;

    // Combine similar messages
    const messages = this.pending.map(p => p.message);
    const combined = messages.join('\n\n---\n\n');

    this.pending = [];
    return combined;
  }
}

// Approval request storage
const pendingApprovals = new Map();

// FIX #3: Periodic cleanup for pendingApprovals
function cleanupOldApprovals() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  let cleaned = 0;

  for (const [approvalId, approval] of pendingApprovals.entries()) {
    if (now - approval.timestamp > maxAge) {
      pendingApprovals.delete(approvalId);
      cleaned++;
      log('info', 'Cleaned up old approval', { approval_id: approvalId, age_hours: (now - approval.timestamp) / (60 * 60 * 1000) });
    }
  }

  if (cleaned > 0) {
    log('info', 'Approval cleanup completed', { cleaned_count: cleaned, remaining: pendingApprovals.size });
  }
}

// Run cleanup every hour
setInterval(cleanupOldApprovals, 60 * 60 * 1000);

// Initialize Telegram bot
let bot = null;
let config = null;
let batcher = null;

function initBot() {
  config = loadConfig();
  bot = new TelegramBot(config.bot_token, { polling: false });
  batcher = new MessageBatcher(config.batch_window_seconds);

  log('info', 'Telegram bot initialized', { chat_id: config.chat_id, config_path: CONFIG_PATH });
}

// Send message to Telegram
async function sendMessage(text, priority = 'normal', options = {}) {
  if (!bot) initBot();

  try {
    const message = await bot.sendMessage(config.chat_id, text, {
      parse_mode: 'Markdown',
      ...options
    });

    log('info', 'Message sent', { message_id: message.message_id, priority });
    return { success: true, message_id: message.message_id };
  } catch (error) {
    log('error', 'Failed to send message', { error: error.message });
    throw error;
  }
}

// Send approval request with inline keyboard
async function sendApprovalRequest(question, options, header) {
  if (!bot) initBot();

  try {
    // Create inline keyboard with options
    const keyboard = options.map((opt, idx) => [{
      text: opt.label,
      callback_data: JSON.stringify({ idx, label: opt.label })
    }]);

    // Add "Other" button for custom input
    keyboard.push([{
      text: '💬 Other (custom text)',
      callback_data: JSON.stringify({ idx: -1, label: 'Other' })
    }]);

    // Escape user-provided text in Markdown
    const escapedQuestion = escapeMarkdown(question);
    const escapedHeader = escapeMarkdown(header || 'Approval Request');
    const escapedOptions = options.map((o, i) =>
      `${i + 1}. *${escapeMarkdown(o.label)}*: ${escapeMarkdown(o.description)}`
    ).join('\n');

    const messageText = `🤔 *${escapedHeader}*\n\n${escapedQuestion}\n\n_Options:_\n${escapedOptions}`;

    const message = await bot.sendMessage(config.chat_id, messageText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });

    log('info', 'Approval request sent', {
      message_id: message.message_id,
      question: header || question.substring(0, 50)
    });

    // Store pending approval
    const approvalId = `approval_${message.message_id}`;
    pendingApprovals.set(approvalId, {
      message_id: message.message_id,
      question,
      options,
      timestamp: Date.now()
    });

    return {
      success: true,
      message_id: message.message_id,
      approval_id: approvalId
    };
  } catch (error) {
    log('error', 'Failed to send approval request', { error: error.message });
    throw error;
  }
}

// FIX #2: Poll for approval response with try-finally
async function pollResponse(approvalId, timeoutSeconds = 600) {
  if (!bot) initBot();

  const approval = pendingApprovals.get(approvalId);
  if (!approval) {
    throw new Error(`No pending approval found: ${approvalId}`);
  }

  const startTime = Date.now();
  const timeout = timeoutSeconds * 1000;
  const pollInterval = 2000; // 2 seconds

  // Enable polling temporarily to catch callback queries
  bot.stopPolling();
  bot.startPolling();

  return new Promise((resolve, reject) => {
    let responseReceived = false;
    let callbackHandler = null;
    let textHandler = null;
    let checkTimeout = null;

    // Cleanup function to ensure resources are always released
    const cleanup = () => {
      try {
        if (callbackHandler) {
          bot.removeListener('callback_query', callbackHandler);
        }
        if (textHandler) {
          bot.removeListener('message', textHandler);
        }
        if (checkTimeout) {
          clearInterval(checkTimeout);
        }
        bot.stopPolling();
      } catch (err) {
        log('error', 'Error during cleanup', { error: err.message });
      }
    };

    try {
      // Handle callback query (button press)
      callbackHandler = async (callbackQuery) => {
        if (callbackQuery.message.message_id !== approval.message_id) return;
        if (responseReceived) return;

        responseReceived = true;
        const data = JSON.parse(callbackQuery.data);

        try {
          // Acknowledge the callback
          await bot.answerCallbackQuery(callbackQuery.id);

          // Handle "Other" option - request text input
          if (data.idx === -1) {
            await bot.sendMessage(config.chat_id, '💬 Please send your custom response as a text message:');

            // Wait for text message
            textHandler = (msg) => {
              if (msg.chat.id.toString() === config.chat_id && msg.text) {
                cleanup();

                pendingApprovals.delete(approvalId);
                log('info', 'Approval response received (custom text)', {
                  approval_id: approvalId,
                  response: msg.text.substring(0, 50)
                });

                resolve({
                  selected: 'Other',
                  custom_text: msg.text,
                  elapsed_seconds: (Date.now() - startTime) / 1000
                });
              }
            };

            bot.on('message', textHandler);
            return;
          }

          // Regular option selected
          cleanup();

          const selectedOption = approval.options[data.idx];
          pendingApprovals.delete(approvalId);

          log('info', 'Approval response received', {
            approval_id: approvalId,
            selected: selectedOption.label
          });

          resolve({
            selected: selectedOption.label,
            elapsed_seconds: (Date.now() - startTime) / 1000
          });
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      bot.on('callback_query', callbackHandler);

      // Timeout mechanism
      checkTimeout = setInterval(() => {
        if (Date.now() - startTime >= timeout) {
          if (!responseReceived) {
            cleanup();
            pendingApprovals.delete(approvalId);

            log('info', 'Approval request timed out', { approval_id: approvalId });

            resolve({
              selected: null,
              timed_out: true,
              elapsed_seconds: timeoutSeconds
            });
          }
        }
      }, pollInterval);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

// Batch and send notifications
async function batchNotifications(messages) {
  if (!bot) initBot();

  for (const msg of messages) {
    batcher.add(msg.text, msg.priority || 'normal');
  }

  // Flush immediately if any high priority
  const hasHighPriority = messages.some(m => m.priority === 'high');
  if (hasHighPriority) {
    const combined = batcher.flush();
    if (combined) {
      await sendMessage(combined, 'high');
    }
  }

  return { success: true, batched: messages.length };
}

// FIX #5: Input validation helpers
function validateSendMessage(args) {
  if (!args.text || typeof args.text !== 'string') {
    throw new Error('Invalid input: "text" must be a non-empty string');
  }

  if (args.priority && !['low', 'normal', 'high'].includes(args.priority)) {
    throw new Error('Invalid input: "priority" must be one of: low, normal, high');
  }
}

function validateApprovalRequest(args) {
  if (!args.question || typeof args.question !== 'string') {
    throw new Error('Invalid input: "question" must be a non-empty string');
  }

  if (!Array.isArray(args.options) || args.options.length === 0) {
    throw new Error('Invalid input: "options" must be a non-empty array');
  }

  for (let i = 0; i < args.options.length; i++) {
    const opt = args.options[i];
    if (!opt || typeof opt !== 'object') {
      throw new Error(`Invalid input: option at index ${i} must be an object`);
    }
    if (!opt.label || typeof opt.label !== 'string') {
      throw new Error(`Invalid input: option at index ${i} must have a "label" string`);
    }
    if (!opt.description || typeof opt.description !== 'string') {
      throw new Error(`Invalid input: option at index ${i} must have a "description" string`);
    }
  }

  if (args.header && typeof args.header !== 'string') {
    throw new Error('Invalid input: "header" must be a string if provided');
  }
}

function validatePollResponse(args) {
  if (!args.approval_id || typeof args.approval_id !== 'string') {
    throw new Error('Invalid input: "approval_id" must be a non-empty string');
  }

  if (args.timeout_seconds !== undefined && (typeof args.timeout_seconds !== 'number' || args.timeout_seconds <= 0)) {
    throw new Error('Invalid input: "timeout_seconds" must be a positive number');
  }
}

function validateBatchNotifications(args) {
  if (!Array.isArray(args.messages) || args.messages.length === 0) {
    throw new Error('Invalid input: "messages" must be a non-empty array');
  }

  for (let i = 0; i < args.messages.length; i++) {
    const msg = args.messages[i];
    if (!msg || typeof msg !== 'object') {
      throw new Error(`Invalid input: message at index ${i} must be an object`);
    }
    if (!msg.text || typeof msg.text !== 'string') {
      throw new Error(`Invalid input: message at index ${i} must have a "text" string`);
    }
    if (msg.priority && !['low', 'normal', 'high'].includes(msg.priority)) {
      throw new Error(`Invalid input: message at index ${i} has invalid priority (must be: low, normal, high)`);
    }
  }
}

// MCP Server setup
const server = new Server(
  {
    name: 'telegram-bot',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'send_message',
        description: 'Send a message to Telegram. Use for notifications, updates, and alerts.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Message text (supports Markdown formatting)',
            },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high'],
              description: 'Message priority (high sends immediately, bypassing batching)',
              default: 'normal',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'send_approval_request',
        description: 'Send an approval request with multiple choice options. Returns approval_id for polling.',
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The question to ask',
            },
            options: {
              type: 'array',
              description: 'Array of option objects with label and description',
              items: {
                type: 'object',
                properties: {
                  label: {
                    type: 'string',
                    description: 'Short option label',
                  },
                  description: {
                    type: 'string',
                    description: 'Detailed option description',
                  },
                },
                required: ['label', 'description'],
              },
            },
            header: {
              type: 'string',
              description: 'Optional header/title for the request',
            },
          },
          required: ['question', 'options'],
        },
      },
      {
        name: 'poll_response',
        description: 'Poll for response to an approval request. Blocks until response or timeout.',
        inputSchema: {
          type: 'object',
          properties: {
            approval_id: {
              type: 'string',
              description: 'Approval ID from send_approval_request',
            },
            timeout_seconds: {
              type: 'number',
              description: 'How long to wait for response (default: 600)',
              default: 600,
            },
          },
          required: ['approval_id'],
        },
      },
      {
        name: 'batch_notifications',
        description: 'Add multiple messages to the batch queue. Messages are combined and sent within the batch window.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of message objects to batch',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'Message text',
                  },
                  priority: {
                    type: 'string',
                    enum: ['low', 'normal', 'high'],
                    default: 'normal',
                  },
                },
                required: ['text'],
              },
            },
          },
          required: ['messages'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'send_message': {
        validateSendMessage(request.params.arguments);
        const { text, priority = 'normal' } = request.params.arguments;
        const result = await sendMessage(text, priority);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'send_approval_request': {
        validateApprovalRequest(request.params.arguments);
        const { question, options, header } = request.params.arguments;
        const result = await sendApprovalRequest(question, options, header);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'poll_response': {
        validatePollResponse(request.params.arguments);
        const { approval_id, timeout_seconds = 600 } = request.params.arguments;
        const result = await pollResponse(approval_id, timeout_seconds);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'batch_notifications': {
        validateBatchNotifications(request.params.arguments);
        const { messages } = request.params.arguments;
        const result = await batchNotifications(messages);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    log('error', `Tool call failed: ${request.params.name}`, { error: error.message });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log('info', 'MCP server started');
  } catch (error) {
    log('error', 'Failed to start server', { error: error.message });
    process.exit(1);
  }
}

main();
