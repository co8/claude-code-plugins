#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import TelegramBot from "node-telegram-bot-api";
import {
  readFileSync,
  existsSync,
  appendFileSync,
  statSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration discovery
function getConfigPath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;

  // Try project-specific config first
  if (projectDir) {
    const projectConfig = join(projectDir, ".claude", "telegram.local.md");
    if (existsSync(projectConfig)) {
      console.log(
        `[telegram-bot] Using project-specific config: ${projectConfig}`
      );
      return projectConfig;
    }
  }

  // Fall back to global config
  const globalConfig = join(homedir(), ".claude", "telegram.local.md");
  if (existsSync(globalConfig)) {
    console.log(`[telegram-bot] Using global config: ${globalConfig}`);
    return globalConfig;
  }

  throw new Error(
    "No configuration file found. Expected one of:\n" +
      (projectDir
        ? `  - ${join(projectDir, ".claude", "telegram.local.md")}\n`
        : "") +
      `  - ${join(homedir(), ".claude", "telegram.local.md")}`
  );
}

const CONFIG_PATH = getConfigPath();
const LOG_PATH = join(dirname(__dirname), "telegram.log");
const AFK_STATE_PATH = join(dirname(__dirname), ".afk-mode.state");
const PENDING_COUNT_PATH = join(dirname(__dirname), ".pending-messages-count");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 3;

// Rate limiting for Telegram API
class RateLimiter {
  constructor(maxPerMinute = 30) {
    this.maxPerMinute = maxPerMinute;
    this.calls = [];
  }

  async throttle() {
    const now = Date.now();
    // Remove calls older than 1 minute
    this.calls = this.calls.filter((t) => now - t < 60000);

    if (this.calls.length >= this.maxPerMinute) {
      // Wait until the oldest call is more than 1 minute old
      const waitTime = 60000 - (now - this.calls[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime + 100)); // Add 100ms buffer
    }

    this.calls.push(now);
  }
}

// Configuration schema for validation
const CONFIG_SCHEMA = {
  bot_token: { type: "string", required: true, minLength: 10 },
  chat_id: { type: "string", required: true, pattern: /^-?\d+$/ },
  timeout_seconds: { type: "number", min: 10, max: 3600, default: 600 },
  logging_level: {
    type: "string",
    enum: ["all", "errors", "none"],
    default: "errors",
  },
  batch_window_seconds: { type: "number", min: 5, max: 300, default: 30 },
  notifications: {
    type: "object",
    properties: {
      todo_completions: { type: "boolean", default: true },
      errors: { type: "boolean", default: true },
      session_events: { type: "boolean", default: true },
      smart_detection: { type: "boolean", default: true },
    },
  },
  smart_keywords: {
    type: "array",
    default: [
      "suggest",
      "recommend",
      "discovered",
      "insight",
      "clarify",
      "important",
      "note",
      "warning",
    ],
  },
};

// Validate configuration value against schema
function validateConfigValue(key, value, schema) {
  if (schema.type === "string") {
    if (typeof value !== "string") return `${key} must be a string`;
    if (schema.minLength && value.length < schema.minLength)
      return `${key} must be at least ${schema.minLength} characters`;
    if (schema.pattern && !schema.pattern.test(value))
      return `${key} has invalid format`;
    if (schema.enum && !schema.enum.includes(value))
      return `${key} must be one of: ${schema.enum.join(", ")}`;
  } else if (schema.type === "number") {
    if (typeof value !== "number") return `${key} must be a number`;
    if (schema.min !== undefined && value < schema.min)
      return `${key} must be at least ${schema.min}`;
    if (schema.max !== undefined && value > schema.max)
      return `${key} must be at most ${schema.max}`;
  } else if (schema.type === "boolean") {
    if (typeof value !== "boolean") return `${key} must be a boolean`;
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) return `${key} must be an array`;
  }
  return null;
}

// Load configuration from .local.md file with validation
function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Configuration file not found: ${CONFIG_PATH}`);
  }

  const content = readFileSync(CONFIG_PATH, "utf-8");
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!yamlMatch) {
    throw new Error("No YAML frontmatter found in configuration file");
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
    bot_token: parsedConfig.bot_token || "",
    chat_id: parsedConfig.chat_id || "",
    timeout_seconds:
      parsedConfig.timeout_seconds ?? CONFIG_SCHEMA.timeout_seconds.default,
    logging_level:
      parsedConfig.logging_level || CONFIG_SCHEMA.logging_level.default,
    batch_window_seconds:
      parsedConfig.batch_window_seconds ??
      CONFIG_SCHEMA.batch_window_seconds.default,
    notifications: {
      todo_completions: parsedConfig.notifications?.todo_completions ?? true,
      errors: parsedConfig.notifications?.errors ?? true,
      session_events: parsedConfig.notifications?.session_events ?? true,
      smart_detection: parsedConfig.notifications?.smart_detection ?? true,
    },
    smart_keywords:
      parsedConfig.smart_keywords || CONFIG_SCHEMA.smart_keywords.default,
  };

  // Validate required fields
  const errors = [];

  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    if (schema.type === "object") continue; // Skip nested objects for now

    const value = config[key];

    if (schema.required && (!value || value === "")) {
      errors.push(`${key} is required`);
      continue;
    }

    if (value !== undefined && value !== "") {
      const error = validateConfigValue(key, value, schema);
      if (error) errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n  - ${errors.join("\n  - ")}`
    );
  }

  return config;
}

// Convert Markdown to HTML and escape for Telegram
function markdownToHTML(text, options = { preserveFormatting: false }) {
  if (typeof text !== "string") return "";

  // First, escape HTML special characters
  let result = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (options.preserveFormatting) {
    // Use placeholder approach to handle nested formatting correctly
    const placeholders = [];
    let placeholderIndex = 0;

    // Helper to create placeholder
    // Use a format that won't be matched by any markdown patterns
    // Avoiding *, _, `, ~, [, ], <, >, and other markdown special chars
    const createPlaceholder = (html) => {
      const id = `XXXPH${placeholderIndex++}XXX`;
      placeholders.push({ id, html });
      return id;
    };

    // Helper to restore placeholders
    const restorePlaceholders = (text) => {
      let restored = text;
      // Restore in reverse order to handle nested placeholders
      for (let i = placeholders.length - 1; i >= 0; i--) {
        restored = restored.replace(placeholders[i].id, placeholders[i].html);
      }
      return restored;
    };

    // 1. Protect code blocks first (they should not be processed further)
    result = result.replace(/```(\w+)?[\r\n]+([\s\S]*?)```/g, (match, lang, code) => {
      const html = lang
        ? `<pre><code class="language-${lang}">${code}</code></pre>`
        : `<pre><code>${code}</code></pre>`;
      return createPlaceholder(html);
    });

    // 2. Protect inline code
    result = result.replace(/`([^`]+?)`/g, (match, code) => {
      return createPlaceholder(`<code>${code}</code>`);
    });

    // 3. Protect links (process content inside links later)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return createPlaceholder(`<a href="${url}">${text}</a>`);
    });

    // 4. Process formatting markers - simple approach, no nesting support
    // Process longer patterns first to avoid conflicts

    // Bold: **text** -> <b>text</b> (exclude *** patterns)
    result = result.replace(/\*\*([^*]+?)\*\*/g, "<b>$1</b>");

    // Underline: __text__ -> <u>text</u>
    result = result.replace(/__([^_]+?)__/g, "<u>$1</u>");

    // Strikethrough: ~~text~~ -> <s>text</s>
    result = result.replace(/~~([^~]+?)~~/g, "<s>$1</s>");

    // Italic: *text* or _text_ -> <i>text</i>
    result = result.replace(/\*([^*]+?)\*/g, "<i>$1</i>");
    result = result.replace(/_([^_]+?)_/g, "<i>$1</i>");

    // Blockquote: > text -> <blockquote>text</blockquote>
    result = result.replace(/^&gt;\s*(.+)$/gm, "<blockquote>$1</blockquote>");

    // Restore all placeholders
    result = restorePlaceholders(result);
  }

  return result;
}

// Legacy function name for compatibility
function escapeMarkdown(text, options) {
  return markdownToHTML(text, options);
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
    console.error("Failed to rotate log:", err);
  }
}

// FIX #1: Logging utility with rotation - use cached config
function log(level, message, data = {}) {
  // Use cached config to avoid loading on every log call
  if (!config) return;

  if (config.logging_level === "none") return;
  if (config.logging_level === "errors" && level !== "error") return;

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(
    data
  )}\n`;

  try {
    rotateLogFile();
    appendFileSync(LOG_PATH, logEntry);
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}

// Message batching
class MessageBatcher {
  constructor(windowSeconds) {
    this.window = windowSeconds * 1000;
    this.pending = [];
    this.timer = null;
    this.compactingMessageId = null;
  }

  async add(message, priority = "normal") {
    this.pending.push({ message, priority, timestamp: Date.now() });

    // High priority messages send immediately
    if (priority === "high") {
      await this.flush();
      return;
    }

    // Otherwise, batch within window
    if (!this.timer) {
      this.timer = setTimeout(async () => {
        await this.flush();
      }, this.window);
    }
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pending.length === 0) return null;

    // Send compacting notification
    try {
      const count = this.pending.length;
      const result = await sendMessage(
        `📦 Compacting ${count} message${count > 1 ? "s" : ""}...`,
        "high"
      );
      this.compactingMessageId = result.message_id;
    } catch (error) {
      log("error", "Failed to send compacting notification", {
        error: error.message,
      });
    }

    // Combine similar messages
    const messages = this.pending.map((p) => p.message);
    const combined = messages.join("\n\n---\n\n");

    this.pending = [];

    // Update compacting notification to show completion
    if (this.compactingMessageId) {
      try {
        await editMessage(
          this.compactingMessageId,
          `✅ Compacting complete\n\n${combined}`
        );
        this.compactingMessageId = null;
        return null; // Message already sent via edit
      } catch (error) {
        log("error", "Failed to edit compacting notification", {
          error: error.message,
        });
        this.compactingMessageId = null;
        // Fall through to return combined message
      }
    }

    return combined;
  }
}

// Approval request storage
const pendingApprovals = new Map();

// Command queue for incoming Telegram messages
const commandQueue = [];
let isListeningForCommands = false;

// AFK mode state
let isAfkMode = false;
let afkStartTime = null;

// Persist AFK mode state to file
function saveAfkState(enabled, startTime = null) {
  try {
    const stateData = {
      enabled,
      startTime: startTime || (enabled ? Date.now() : null),
    };
    writeFileSync(AFK_STATE_PATH, JSON.stringify(stateData), "utf-8");
  } catch (error) {
    log("error", "Failed to save AFK state", { error: error.message });
  }
}

// Load AFK mode state from file on startup
function loadAfkState() {
  try {
    if (existsSync(AFK_STATE_PATH)) {
      const content = readFileSync(AFK_STATE_PATH, "utf-8").trim();
      // Support legacy format
      if (content === "enabled" || content === "disabled") {
        afkStartTime = null;
        return content === "enabled";
      }
      // New JSON format
      const stateData = JSON.parse(content);
      afkStartTime = stateData.startTime;
      return stateData.enabled;
    }
  } catch (error) {
    log("error", "Failed to load AFK state", { error: error.message });
  }
  return false;
}

// Format duration in human-readable format
function formatDuration(milliseconds) {
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
}

// Update pending messages count file for hooks to read
function updatePendingCount() {
  try {
    const count = commandQueue.length;
    writeFileSync(PENDING_COUNT_PATH, count.toString(), "utf-8");
  } catch (error) {
    log("error", "Failed to update pending count file", { error: error.message });
  }
}

// FIX #3: Periodic cleanup for pendingApprovals
function cleanupOldApprovals() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  let cleaned = 0;

  for (const [approvalId, approval] of pendingApprovals.entries()) {
    if (now - approval.timestamp > maxAge) {
      pendingApprovals.delete(approvalId);
      cleaned++;
      log("info", "Cleaned up old approval", {
        approval_id: approvalId,
        age_hours: (now - approval.timestamp) / (60 * 60 * 1000),
      });
    }
  }

  if (cleaned > 0) {
    log("info", "Approval cleanup completed", {
      cleaned_count: cleaned,
      remaining: pendingApprovals.size,
    });
  }
}

// Run cleanup every hour with error handling
setInterval(() => {
  try {
    cleanupOldApprovals();
  } catch (err) {
    log("error", "Approval cleanup failed", { error: err.message });
  }
}, 60 * 60 * 1000);

// Initialize Telegram bot
let bot = null;
let config = null;
let batcher = null;
let botInfo = null;
let rateLimiter = null;

async function initBot() {
  config = loadConfig();
  bot = new TelegramBot(config.bot_token, { polling: false });
  batcher = new MessageBatcher(config.batch_window_seconds);
  rateLimiter = new RateLimiter(30); // 30 messages per minute

  // Load AFK state from file
  isAfkMode = loadAfkState();
  if (isAfkMode) {
    log("info", "Restored AFK mode from previous session");
  }

  // Initialize pending count file
  updatePendingCount();

  // Get bot info to identify own messages
  try {
    botInfo = await bot.getMe();
    log("info", "Telegram bot initialized", {
      chat_id: config.chat_id,
      config_path: CONFIG_PATH,
      bot_id: botInfo.id,
      bot_username: botInfo.username,
      afk_mode: isAfkMode,
    });
  } catch (error) {
    log("error", "Failed to get bot info", { error: error.message });
  }
}

// Start listening for incoming messages and commands
async function startMessageListener() {
  if (isListeningForCommands) {
    log("info", "Message listener already active");
    return { success: true, already_active: true };
  }

  if (!bot) await initBot();

  try {
    // Start polling if not already polling
    if (!bot.isPolling()) {
      await bot.startPolling();
      log("info", "Started polling for messages");
    }

    // Listen for text messages
    bot.on("message", async (msg) => {
      // Ignore messages from the bot itself
      if (botInfo && msg.from && msg.from.id === botInfo.id) {
        return;
      }

      // Only process messages from configured chat
      if (msg.chat.id.toString() !== config.chat_id) {
        log("warn", "Ignoring message from unauthorized chat", {
          chat_id: msg.chat.id,
        });
        return;
      }

      // Process text messages as commands
      if (msg.text) {
        const command = {
          id: msg.message_id,
          text: msg.text,
          from: msg.from.username || msg.from.first_name,
          timestamp: msg.date * 1000,
          chat_id: msg.chat.id,
        };

        commandQueue.push(command);
        updatePendingCount(); // Update count for hooks
        log("info", "Command received", {
          command: msg.text.substring(0, 50),
          from: command.from,
        });

        // React with robot emoji to acknowledge receipt
        try {
          await bot.setMessageReaction(config.chat_id, msg.message_id, [
            { type: "emoji", emoji: "🤖" },
          ]);
        } catch (err) {
          log("info", "Could not add robot reaction", {
            error: err.message,
          });
        }
      }
    });

    isListeningForCommands = true;
    log("info", "Message listener started successfully");

    return {
      success: true,
      listening: true,
      bot_username: botInfo?.username,
    };
  } catch (error) {
    log("error", "Failed to start message listener", { error: error.message });
    throw error;
  }
}

// Stop listening for incoming messages
async function stopMessageListener() {
  if (!isListeningForCommands) {
    return { success: true, already_stopped: true };
  }

  try {
    if (bot && bot.isPolling()) {
      await bot.stopPolling();
      log("info", "Stopped polling for messages");
    }

    bot.removeAllListeners("message");
    isListeningForCommands = false;
    commandQueue.length = 0; // Clear queue
    updatePendingCount(); // Update count for hooks

    log("info", "Message listener stopped");
    return { success: true, listening: false };
  } catch (error) {
    log("error", "Failed to stop message listener", { error: error.message });
    throw error;
  }
}

// Get pending commands from queue
function getPendingCommands(limit = 10) {
  const commands = commandQueue.splice(0, limit);
  updatePendingCount(); // Update count for hooks after removing commands
  log("info", "Retrieved pending commands", { count: commands.length });
  return {
    commands,
    remaining: commandQueue.length,
  };
}

// Check if listener is active
function getListenerStatus() {
  return {
    listening: isListeningForCommands,
    pending_commands: commandQueue.length,
    polling_active: bot ? bot.isPolling() : false,
  };
}

// Enable AFK mode
async function enableAfkMode() {
  try {
    isAfkMode = true;
    afkStartTime = Date.now();
    saveAfkState(true, afkStartTime);

    // Automatically start the message listener when entering AFK mode
    if (!isListeningForCommands) {
      await startMessageListener();
      log("info", "Message listener started automatically with AFK mode");
    }

    const message = "🤖 <b>AFK Enabled</b> | Claude will notify you via Telegram";
    await sendMessage(message, "high");
    log("info", "AFK mode enabled");
    return {
      success: true,
      message: "AFK mode enabled",
      afk_mode: true,
      listener_started: true,
    };
  } catch (error) {
    log("error", "Failed to enable AFK mode", { error: error.message });
    throw error;
  }
}

// Disable AFK mode
async function disableAfkMode() {
  try {
    isAfkMode = false;
    const duration = afkStartTime ? formatDuration(Date.now() - afkStartTime) : "Unknown";
    saveAfkState(false);
    afkStartTime = null;

    // Clear the todo message ID file
    const todoMessageIdPath = join(dirname(__dirname), ".todo-message-id");
    if (existsSync(todoMessageIdPath)) {
      unlinkSync(todoMessageIdPath);
      log("info", "Cleared todo message ID");
    }

    // Automatically stop the message listener when leaving AFK mode
    if (isListeningForCommands) {
      await stopMessageListener();
      log("info", "Message listener stopped automatically with AFK mode");
    }

    const message = `🖥️ <b>AFK Disabled</b> | Duration of Session: ${duration}`;
    await sendMessage(message, "high");
    log("info", "AFK mode disabled", { duration });
    return {
      success: true,
      message: "AFK mode disabled",
      afk_mode: false,
      duration,
      listener_stopped: true,
    };
  } catch (error) {
    log("error", "Failed to disable AFK mode", { error: error.message });
    throw error;
  }
}

// Send message to Telegram with retry logic
async function sendMessage(
  text,
  priority = "normal",
  options = {},
  retries = 3
) {
  if (!bot) await initBot();

  // Apply rate limiting
  await rateLimiter.throttle();

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const message = await bot.sendMessage(config.chat_id, text, {
        parse_mode: "HTML",
        ...options,
      });

      log("info", "Message sent", {
        message_id: message.message_id,
        priority,
        attempt,
      });

      // Add robot icon reaction to indicate receipt
      try {
        await bot.setMessageReaction(config.chat_id, message.message_id, [
          { type: "emoji", emoji: "🤖" },
        ]);
      } catch (reactionError) {
        // Reaction might not be supported, ignore error
        log("info", "Could not add reaction", { error: reactionError.message });
      }

      return { success: true, message_id: message.message_id };
    } catch (error) {
      lastError = error;
      log("error", `Failed to send message (attempt ${attempt}/${retries})`, {
        error: error.message,
      });

      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Edit an existing message
async function editMessage(messageId, text, options = {}, retries = 3) {
  if (!bot) await initBot();

  // Apply rate limiting
  await rateLimiter.throttle();

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await bot.editMessageText(text, {
        chat_id: config.chat_id,
        message_id: messageId,
        parse_mode: "HTML",
        ...options,
      });

      log("info", "Message edited", {
        message_id: messageId,
        attempt,
      });

      return { success: true, message_id: messageId };
    } catch (error) {
      lastError = error;
      log("error", `Failed to edit message (attempt ${attempt}/${retries})`, {
        error: error.message,
        message_id: messageId,
      });

      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Send approval request with inline keyboard
async function sendApprovalRequest(question, options, header) {
  if (!bot) await initBot();

  try {
    // Create inline keyboard with options in 2 columns
    const keyboard = [];
    for (let i = 0; i < options.length; i += 2) {
      const row = [];
      // First button in row
      row.push({
        text: options[i].label,
        callback_data: JSON.stringify({ idx: i, label: options[i].label }),
      });
      // Second button in row (if exists)
      if (i + 1 < options.length) {
        row.push({
          text: options[i + 1].label,
          callback_data: JSON.stringify({
            idx: i + 1,
            label: options[i + 1].label,
          }),
        });
      }
      keyboard.push(row);
    }

    // Add "Other" button for custom input
    keyboard.push([
      {
        text: "💬 Other (custom text)",
        callback_data: JSON.stringify({ idx: -1, label: "Other" }),
      },
    ]);

    // Escape user-provided text for HTML and convert Markdown formatting
    const escapedQuestion = markdownToHTML(question, {
      preserveFormatting: true,
    });
    const escapedHeader = markdownToHTML(header || "Approval Request", {
      preserveFormatting: true,
    });
    const escapedOptions = options
      .map(
        (o, i) =>
          `${i + 1}. <b>${markdownToHTML(o.label, {
            preserveFormatting: true,
          })}</b>: ${markdownToHTML(o.description, {
            preserveFormatting: true,
          })}`
      )
      .join("\n");

    const messageText = `🤔 <b>${escapedHeader}</b>\n\n${escapedQuestion}\n\n<i>Options:</i>\n${escapedOptions}`;

    // Debug logging to file
    const debugPath = join(dirname(__dirname), "debug-approval.log");
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
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });

    log("info", "Approval request sent", {
      message_id: message.message_id,
      question: header || question.substring(0, 50),
    });

    // Store pending approval
    const approvalId = `approval_${message.message_id}`;
    pendingApprovals.set(approvalId, {
      message_id: message.message_id,
      question,
      options,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message_id: message.message_id,
      approval_id: approvalId,
    };
  } catch (error) {
    log("error", "Failed to send approval request", { error: error.message });
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
      log("error", "Failed to start polling", { error: err.message });
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
          bot.removeListener("callback_query", callbackHandler);
          callbackHandler = null;
        }
        if (textHandler) {
          bot.removeListener("message", textHandler);
          textHandler = null;
        }
        if (checkTimeout) {
          clearInterval(checkTimeout);
          checkTimeout = null;
        }

        // Only stop polling if we started it
        if (!wasPolling && bot.isPolling()) {
          bot.stopPolling().catch((err) => {
            log("error", "Error stopping polling", { error: err.message });
          });
        }

        // Clean up approval immediately
        pendingApprovals.delete(approvalId);
      } catch (err) {
        log("error", "Error during cleanup", { error: err.message });
      }
    };

    try {
      // Handle callback query (button press)
      callbackHandler = async (callbackQuery) => {
        if (callbackQuery.message.message_id !== approval.message_id) return;
        if (responseReceived) return;

        responseReceived = true;
        let data;
        try {
          data = JSON.parse(callbackQuery.data);
        } catch (err) {
          log("error", "Invalid callback data", { error: err.message });
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: "Invalid response format",
          });
          return;
        }

        try {
          // Acknowledge the callback
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: `Selected: ${data.label}`,
          });

          // Update the message to show the selected option with visual feedback
          const selectedIdx = data.idx;
          const updatedKeyboard = [];

          for (let i = 0; i < approval.options.length; i += 2) {
            const row = [];
            // First button in row
            const isFirstSelected = i === selectedIdx;
            row.push({
              text: isFirstSelected ? `✅ ${approval.options[i].label}` : approval.options[i].label,
              callback_data: JSON.stringify({ idx: i, label: approval.options[i].label }),
            });
            // Second button in row (if exists)
            if (i + 1 < approval.options.length) {
              const isSecondSelected = (i + 1) === selectedIdx;
              row.push({
                text: isSecondSelected ? `✅ ${approval.options[i + 1].label}` : approval.options[i + 1].label,
                callback_data: JSON.stringify({ idx: i + 1, label: approval.options[i + 1].label }),
              });
            }
            updatedKeyboard.push(row);
          }

          // Add "Other" button
          const isOtherSelected = selectedIdx === -1;
          updatedKeyboard.push([
            {
              text: isOtherSelected ? "✅ 💬 Other (custom text)" : "💬 Other (custom text)",
              callback_data: JSON.stringify({ idx: -1, label: "Other" }),
            },
          ]);

          // Edit the message to update button appearance
          try {
            await bot.editMessageReplyMarkup(
              { inline_keyboard: updatedKeyboard },
              {
                chat_id: config.chat_id,
                message_id: callbackQuery.message.message_id,
              }
            );
          } catch (editError) {
            log("info", "Could not update button appearance", {
              error: editError.message,
            });
          }

          // Handle "Other" option - request text input
          if (data.idx === -1) {
            await bot.sendMessage(
              config.chat_id,
              "💬 Please send your custom response as a text message:"
            );

            // Wait for text message
            textHandler = (msg) => {
              // Ignore messages from the bot itself
              if (botInfo && msg.from && msg.from.id === botInfo.id) {
                return;
              }

              if (msg.chat.id.toString() === config.chat_id && msg.text) {
                cleanup();

                log("info", "Approval response received (custom text)", {
                  approval_id: approvalId,
                  response: msg.text.substring(0, 50),
                });

                resolve({
                  selected: "Other",
                  custom_text: msg.text,
                  elapsed_seconds: (Date.now() - startTime) / 1000,
                });
              }
            };

            bot.on("message", textHandler);
            return;
          }

          // Regular option selected
          const selectedOption = approval.options[data.idx];
          cleanup();

          log("info", "Approval response received", {
            approval_id: approvalId,
            selected: selectedOption.label,
          });

          resolve({
            selected: selectedOption.label,
            elapsed_seconds: (Date.now() - startTime) / 1000,
          });
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      bot.on("callback_query", callbackHandler);

      // Timeout mechanism
      checkTimeout = setInterval(() => {
        if (Date.now() - startTime >= timeout) {
          if (!responseReceived) {
            cleanup();

            log("info", "Approval request timed out", {
              approval_id: approvalId,
            });

            resolve({
              selected: null,
              timed_out: true,
              elapsed_seconds: timeoutSeconds,
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
    // Escape each message text before batching and convert Markdown formatting
    const escapedText = escapeMarkdown(msg.text, { preserveFormatting: true });
    await batcher.add(escapedText, msg.priority || "normal");
  }

  // Flush immediately if any high priority
  const hasHighPriority = messages.some((m) => m.priority === "high");
  if (hasHighPriority) {
    const combined = await batcher.flush();
    if (combined) {
      // Combined text is already escaped, so send directly
      await sendMessage(combined, "high");
    }
  }

  return { success: true, batched: messages.length };
}

// FIX #5: Input validation helpers
function validateSendMessage(args) {
  if (!args.text || typeof args.text !== "string") {
    throw new Error('Invalid input: "text" must be a non-empty string');
  }

  if (args.priority && !["low", "normal", "high"].includes(args.priority)) {
    throw new Error(
      'Invalid input: "priority" must be one of: low, normal, high'
    );
  }
}

function validateApprovalRequest(args) {
  if (!args.question || typeof args.question !== "string") {
    throw new Error('Invalid input: "question" must be a non-empty string');
  }

  if (!Array.isArray(args.options) || args.options.length === 0) {
    throw new Error('Invalid input: "options" must be a non-empty array');
  }

  for (let i = 0; i < args.options.length; i++) {
    const opt = args.options[i];
    if (!opt || typeof opt !== "object") {
      throw new Error(`Invalid input: option at index ${i} must be an object`);
    }
    if (!opt.label || typeof opt.label !== "string") {
      throw new Error(
        `Invalid input: option at index ${i} must have a "label" string`
      );
    }
    if (!opt.description || typeof opt.description !== "string") {
      throw new Error(
        `Invalid input: option at index ${i} must have a "description" string`
      );
    }
  }

  if (args.header && typeof args.header !== "string") {
    throw new Error('Invalid input: "header" must be a string if provided');
  }
}

function validatePollResponse(args) {
  if (!args.approval_id || typeof args.approval_id !== "string") {
    throw new Error('Invalid input: "approval_id" must be a non-empty string');
  }

  if (
    args.timeout_seconds !== undefined &&
    (typeof args.timeout_seconds !== "number" || args.timeout_seconds <= 0)
  ) {
    throw new Error(
      'Invalid input: "timeout_seconds" must be a positive number'
    );
  }
}

function validateBatchNotifications(args) {
  if (!Array.isArray(args.messages) || args.messages.length === 0) {
    throw new Error('Invalid input: "messages" must be a non-empty array');
  }

  for (let i = 0; i < args.messages.length; i++) {
    const msg = args.messages[i];
    if (!msg || typeof msg !== "object") {
      throw new Error(`Invalid input: message at index ${i} must be an object`);
    }
    if (!msg.text || typeof msg.text !== "string") {
      throw new Error(
        `Invalid input: message at index ${i} must have a "text" string`
      );
    }
    if (msg.priority && !["low", "normal", "high"].includes(msg.priority)) {
      throw new Error(
        `Invalid input: message at index ${i} has invalid priority (must be: low, normal, high)`
      );
    }
  }
}

// MCP Server setup
const server = new Server(
  {
    name: "telegram-bot",
    version: "0.2.19",
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
        name: "send_message",
        description:
          "Send a message to Telegram. Use for notifications, updates, and alerts.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Message text (supports Markdown formatting)",
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high"],
              description:
                "Message priority (high sends immediately, bypassing batching)",
              default: "normal",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "send_approval_request",
        description:
          "Send an approval request with multiple choice options. Returns approval_id for polling.",
        inputSchema: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question to ask",
            },
            options: {
              type: "array",
              description: "Array of option objects with label and description",
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string",
                    description: "Short option label",
                  },
                  description: {
                    type: "string",
                    description: "Detailed option description",
                  },
                },
                required: ["label", "description"],
              },
            },
            header: {
              type: "string",
              description: "Optional header/title for the request",
            },
          },
          required: ["question", "options"],
        },
      },
      {
        name: "poll_response",
        description:
          "Poll for response to an approval request. Blocks until response or timeout.",
        inputSchema: {
          type: "object",
          properties: {
            approval_id: {
              type: "string",
              description: "Approval ID from send_approval_request",
            },
            timeout_seconds: {
              type: "number",
              description: "How long to wait for response (default: 600)",
              default: 600,
            },
          },
          required: ["approval_id"],
        },
      },
      {
        name: "batch_notifications",
        description:
          "Add multiple messages to the batch queue. Messages are combined and sent within the batch window.",
        inputSchema: {
          type: "object",
          properties: {
            messages: {
              type: "array",
              description: "Array of message objects to batch",
              items: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                    description: "Message text",
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "normal", "high"],
                    default: "normal",
                  },
                },
                required: ["text"],
              },
            },
          },
          required: ["messages"],
        },
      },
      {
        name: "start_listener",
        description:
          "Start listening for incoming messages from Telegram. Once started, the bot will queue all messages sent by the user.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "stop_listener",
        description:
          "Stop listening for incoming messages from Telegram and clear the command queue.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_pending_commands",
        description:
          "Retrieve pending commands from the message queue. Returns up to specified limit of commands.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description:
                "Maximum number of commands to retrieve (default: 10)",
              default: 10,
            },
          },
        },
      },
      {
        name: "get_listener_status",
        description:
          "Get the current status of the message listener, including whether it's active and how many pending commands are in the queue.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "enable_afk_mode",
        description:
          "Enable AFK (Away From Keyboard) mode - Telegram becomes the primary communication channel. Sends a notification to Telegram confirming AFK mode is active.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "disable_afk_mode",
        description:
          "Disable AFK (Away From Keyboard) mode - Return to normal communication. Sends a notification to Telegram confirming user is back.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "send_message": {
        validateSendMessage(request.params.arguments);
        const { text, priority = "normal" } = request.params.arguments;
        // Escape markdown special characters for Telegram MarkdownV2
        // Use preserveFormatting to allow intentional bold/italic
        const escapedText = escapeMarkdown(text, { preserveFormatting: true });
        const result = await sendMessage(escapedText, priority);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "send_approval_request": {
        validateApprovalRequest(request.params.arguments);
        const { question, options, header } = request.params.arguments;
        const result = await sendApprovalRequest(question, options, header);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "poll_response": {
        validatePollResponse(request.params.arguments);
        const { approval_id, timeout_seconds = 600 } = request.params.arguments;
        const result = await pollResponse(approval_id, timeout_seconds);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "batch_notifications": {
        validateBatchNotifications(request.params.arguments);
        const { messages } = request.params.arguments;
        const result = await batchNotifications(messages);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "start_listener": {
        const result = await startMessageListener();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "stop_listener": {
        const result = await stopMessageListener();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_pending_commands": {
        const { limit = 10 } = request.params.arguments || {};
        const result = getPendingCommands(limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_listener_status": {
        const result = getListenerStatus();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "enable_afk_mode": {
        const result = await enableAfkMode();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "disable_afk_mode": {
        const result = await disableAfkMode();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    log("error", `Tool call failed: ${request.params.name}`, {
      error: error.message,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: error.message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Health check function
async function healthCheck() {
  console.log("🏥 Telegram MCP Server Health Check\n");

  try {
    // 1. Check configuration
    console.log("1️⃣ Checking configuration...");
    const testConfig = loadConfig();
    console.log("   ✅ Configuration valid");
    console.log(`   📄 Config path: ${CONFIG_PATH}`);
    console.log(
      `   🤖 Bot token: ${"*".repeat(10)}... (${
        testConfig.bot_token.length
      } chars)`
    );
    console.log(`   💬 Chat ID: ${testConfig.chat_id}`);

    // 2. Check bot token
    console.log("\n2️⃣ Testing bot connection...");
    const testBot = new TelegramBot(testConfig.bot_token, { polling: false });
    const botInfo = await testBot.getMe();
    console.log(`   ✅ Bot connected: @${botInfo.username}`);

    // 3. Check dependencies
    console.log("\n3️⃣ Checking dependencies...");
    console.log("   ✅ @modelcontextprotocol/sdk: installed");
    console.log("   ✅ node-telegram-bot-api: installed");
    console.log("   ✅ js-yaml: installed");

    console.log("\n✅ Health check passed! Server is ready.\n");
    process.exit(0);
  } catch (error) {
    console.log(`\n❌ Health check failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  log("info", `Received ${signal}, shutting down gracefully...`);

  try {
    // Flush pending messages
    if (batcher) {
      const combined = await batcher.flush();
      if (combined) {
        await sendMessage(combined, "high").catch((err) => {
          log("error", "Failed to flush messages on shutdown", {
            error: err.message,
          });
        });
      }
    }

    // Stop polling if active
    if (bot && bot.isPolling()) {
      await bot.stopPolling();
      log("info", "Stopped polling");
    }

    log("info", "Shutdown complete");
    process.exit(0);
  } catch (error) {
    log("error", "Error during shutdown", { error: error.message });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start server
async function main() {
  // Check for health check flag
  if (process.argv.includes("--health")) {
    await healthCheck();
    return;
  }

  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("info", "MCP server started");
  } catch (error) {
    log("error", "Failed to start server", { error: error.message });
    process.exit(1);
  }
}

main();
