#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import TelegramBot from 'node-telegram-bot-api';
import { readFileSync, existsSync, appendFileSync, statSync, renameSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import yaml from 'js-yaml';

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
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 3;

// Configuration schema for validation
const CONFIG_SCHEMA = {
  bot_token: { type: 'string', required: true, minLength: 10 },
  chat_id: { type: 'string', required: true, pattern: /^-?\d+$/ },
  timeout_seconds: { type: 'number', min: 10, max: 3600, default: 600 },
  logging_level: { type: 'string', enum: ['all', 'errors', 'none'], default: 'errors' },
  batch_window_seconds: { type: 'number', min: 5, max: 300, default: 30 },
  notifications: {
    type: 'object',
    properties: {
      todo_completions: { type: 'boolean', default: true },
      errors: { type: 'boolean', default: true },
      session_events: { type: 'boolean', default: true },
      smart_detection: { type: 'boolean', default: true }
    }
  },
  smart_keywords: { type: 'array', default: ['suggest', 'recommend', 'discovered', 'insight', 'clarify', 'important', 'note', 'warning'] }
};

// Validate configuration value against schema
function validateConfigValue(key, value, schema) {
  if (schema.type === 'string') {
    if (typeof value !== 'string') return `${key} must be a string`;
    if (schema.minLength && value.length < schema.minLength) return `${key} must be at least ${schema.minLength} characters`;
    if (schema.pattern && !schema.pattern.test(value)) return `${key} has invalid format`;
    if (schema.enum && !schema.enum.includes(value)) return `${key} must be one of: ${schema.enum.join(', ')}`;
  } else if (schema.type === 'number') {
    if (typeof value !== 'number') return `${key} must be a number`;
    if (schema.min !== undefined && value < schema.min) return `${key} must be at least ${schema.min}`;
    if (schema.max !== undefined && value > schema.max) return `${key} must be at most ${schema.max}`;
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') return `${key} must be a boolean`;
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) return `${key} must be an array`;
  }
  return null;
}

// Load configuration from .local.md file with validation
function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Configuration file not found: ${CONFIG_PATH}`);
  }

  const content = readFileSync(CONFIG_PATH, 'utf-8');
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!yamlMatch) {
    throw new Error('No YAML frontmatter found in configuration file');
  }

  // Parse YAML using js-yaml library for robust parsing
  let parsedConfig;
  try {
    parsedConfig = yaml.load(yamlMatch[1]);
  } catch (err) {
    throw new Error(`Invalid YAML in configuration file: ${err.message}`);
  }

  // Apply defaults and validate
  const config = {
    bot_token: parsedConfig.bot_token || '',
    chat_id: parsedConfig.chat_id || '',
    timeout_seconds: parsedConfig.timeout_seconds ?? CONFIG_SCHEMA.timeout_seconds.default,
    logging_level: parsedConfig.logging_level || CONFIG_SCHEMA.logging_level.default,
    batch_window_seconds: parsedConfig.batch_window_seconds ?? CONFIG_SCHEMA.batch_window_seconds.default,
    notifications: {
      todo_completions: parsedConfig.notifications?.todo_completions ?? true,
      errors: parsedConfig.notifications?.errors ?? true,
      session_events: parsedConfig.notifications?.session_events ?? true,
      smart_detection: parsedConfig.notifications?.smart_detection ?? true
    },
    smart_keywords: parsedConfig.smart_keywords || CONFIG_SCHEMA.smart_keywords.default
  };

  // Validate required fields
  const errors = [];

  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    if (schema.type === 'object') continue; // Skip nested objects for now

    const value = config[key];

    if (schema.required && (!value || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    if (value !== undefined && value !== '') {
      const error = validateConfigValue(key, value, schema);
      if (error) errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  return config;
}

// FIX #4: Markdown escaping function
function escapeMarkdown(text) {
  if (typeof text !== 'string') return '';

  // Escape special Markdown characters for Telegram MarkdownV2
  // Need to escape: _ * [ ] ( ) ~ ` > # + - = | { } . ! \
  // IMPORTANT: Escape backslash first to avoid double-escaping
  return text
    .replace(/\\/g, '\\\\')
    .replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// Rotate log files when max size is reached
function rotateLogFile() {
  try {
    if (!existsSync(LOG_PATH)) return;

    const stats = statSync(LOG_PATH);
    if (stats.size < MAX_LOG_SIZE) return;

    // Rotate existing logs
    for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
      const oldPath = `${LOG_PATH}.${i}`;
      const newPath = `${LOG_PATH}.${i + 1}`;

      if (existsSync(oldPath)) {
        if (i === MAX_LOG_FILES - 1) {
          unlinkSync(oldPath); // Delete oldest
        } else {
          renameSync(oldPath, newPath);
        }
      }
    }

    // Move current log to .1
    renameSync(LOG_PATH, `${LOG_PATH}.1`);
  } catch (err) {
    console.error('Failed to rotate log:', err);
  }
}

// FIX #1: Logging utility with rotation - use cached config
function log(level, message, data = {}) {
  // Use cached config to avoid loading on every log call
  if (!config) return;

  if (config.logging_level === 'none') return;
  if (config.logging_level === 'errors' && level !== 'error') return;

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}\n`;

  try {
    rotateLogFile();
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
let botInfo = null;

async function initBot() {
  config = loadConfig();
  bot = new TelegramBot(config.bot_token, { polling: false });
  batcher = new MessageBatcher(config.batch_window_seconds);

  // Get bot info to identify own messages
  try {
    botInfo = await bot.getMe();
    log('info', 'Telegram bot initialized', {
      chat_id: config.chat_id,
      config_path: CONFIG_PATH,
      bot_id: botInfo.id,
      bot_username: botInfo.username
    });
  } catch (error) {
    log('error', 'Failed to get bot info', { error: error.message });
  }
}

// Send message to Telegram with retry logic
async function sendMessage(text, priority = 'normal', options = {}, retries = 3) {
  if (!bot) await initBot();

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const message = await bot.sendMessage(config.chat_id, text, {
        parse_mode: 'MarkdownV2',
        ...options
      });

      log('info', 'Message sent', { message_id: message.message_id, priority, attempt });

      // Add robot icon reaction to indicate receipt
      try {
        await bot.setMessageReaction(config.chat_id, message.message_id, [{ type: 'emoji', emoji: '🤖' }]);
      } catch (reactionError) {
        // Reaction might not be supported, ignore error
        log('info', 'Could not add reaction', { error: reactionError.message });
      }

      return { success: true, message_id: message.message_id };
    } catch (error) {
      lastError = error;
      log('error', `Failed to send message (attempt ${attempt}/${retries})`, { error: error.message });

      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Send approval request with inline keyboard
async function sendApprovalRequest(question, options, header) {
  if (!bot) await initBot();

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
      `${i + 1}\\. *${escapeMarkdown(o.label)}*: ${escapeMarkdown(o.description)}`
    ).join('\n');

    const messageText = `🤔 *${escapedHeader}*\n\n${escapedQuestion}\n\n_Options\\:_\n${escapedOptions}`;

    // Debug logging to file
    const debugPath = join(dirname(__dirname), 'debug-approval.log');
    const debugInfo = `
=== APPROVAL REQUEST DEBUG ===
Time: ${new Date().toISOString()}
Escaped Header: ${escapedHeader}
Escaped Question: ${escapedQuestion}
Escaped Options: ${escapedOptions}
Full Message Text:
${messageText}
===========================
`;
    appendFileSync(debugPath, debugInfo);

    const message = await bot.sendMessage(config.chat_id, messageText, {
      parse_mode: 'MarkdownV2',
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

// FIX #2: Poll for approval response with improved cleanup
async function pollResponse(approvalId, timeoutSeconds = 600) {
  if (!bot) await initBot();

  const approval = pendingApprovals.get(approvalId);
  if (!approval) {
    throw new Error(`No pending approval found: ${approvalId}`);
  }

  const startTime = Date.now();
  const timeout = timeoutSeconds * 1000;
  const pollInterval = 2000; // 2 seconds

  // Track polling state to avoid conflicts
  let wasPolling = bot.isPolling();

  // Enable polling temporarily to catch callback queries
  if (!wasPolling) {
    try {
      await bot.startPolling();
    } catch (err) {
      log('error', 'Failed to start polling', { error: err.message });
      // Continue anyway - might already be polling
    }
  }

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
          callbackHandler = null;
        }
        if (textHandler) {
          bot.removeListener('message', textHandler);
          textHandler = null;
        }
        if (checkTimeout) {
          clearInterval(checkTimeout);
          checkTimeout = null;
        }

        // Only stop polling if we started it
        if (!wasPolling && bot.isPolling()) {
          bot.stopPolling().catch(err => {
            log('error', 'Error stopping polling', { error: err.message });
          });
        }

        // Clean up approval immediately
        pendingApprovals.delete(approvalId);
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

          // Send acknowledgement message to user
          await bot.sendMessage(config.chat_id, `✅ Response received: *${escapeMarkdown(data.label)}*`, {
            parse_mode: 'MarkdownV2',
            reply_to_message_id: callbackQuery.message.message_id
          });

          // Handle "Other" option - request text input
          if (data.idx === -1) {
            await bot.sendMessage(config.chat_id, '💬 Please send your custom response as a text message:');

            // Wait for text message
            textHandler = (msg) => {
              // Ignore messages from the bot itself
              if (botInfo && msg.from && msg.from.id === botInfo.id) {
                return;
              }

              if (msg.chat.id.toString() === config.chat_id && msg.text) {
                cleanup();

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
          const selectedOption = approval.options[data.idx];
          cleanup();

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
  if (!bot) await initBot();

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

// Health check function
async function healthCheck() {
  console.log('🏥 Telegram MCP Server Health Check\n');

  try {
    // 1. Check configuration
    console.log('1️⃣ Checking configuration...');
    const testConfig = loadConfig();
    console.log('   ✅ Configuration valid');
    console.log(`   📄 Config path: ${CONFIG_PATH}`);
    console.log(`   🤖 Bot token: ${testConfig.bot_token.substring(0, 10)}...`);
    console.log(`   💬 Chat ID: ${testConfig.chat_id}`);

    // 2. Check bot token
    console.log('\n2️⃣ Testing bot connection...');
    const testBot = new TelegramBot(testConfig.bot_token, { polling: false });
    const botInfo = await testBot.getMe();
    console.log(`   ✅ Bot connected: @${botInfo.username}`);

    // 3. Check dependencies
    console.log('\n3️⃣ Checking dependencies...');
    console.log('   ✅ @modelcontextprotocol/sdk: installed');
    console.log('   ✅ node-telegram-bot-api: installed');
    console.log('   ✅ js-yaml: installed');

    console.log('\n✅ Health check passed! Server is ready.\n');
    process.exit(0);
  } catch (error) {
    console.log(`\n❌ Health check failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Start server
async function main() {
  // Check for health check flag
  if (process.argv.includes('--health')) {
    await healthCheck();
    return;
  }

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
