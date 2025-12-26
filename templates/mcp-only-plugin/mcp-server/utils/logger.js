import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const LOG_DIR = join(homedir(), '.claude', 'logs');
const LOG_FILE = join(LOG_DIR, '{{PLUGIN_NAME}}.log');

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

let config = null;

/**
 * Set the configuration for the logger
 */
export function setConfig(cfg) {
  config = cfg;
}

/**
 * Log a message to file and optionally to console
 * @param {string} level - Log level: 'info', 'warn', 'error'
 * @param {string} message - Log message
 * @param {object} context - Additional context to log
 */
export function log(level, message, context = {}) {
  if (!shouldLog(level)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };

  const line = JSON.stringify(entry) + '\n';

  // Always log errors to stderr
  if (level === 'error') {
    console.error(line);
  }

  // Write to log file
  try {
    appendFileSync(LOG_FILE, line);
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
}

/**
 * Determine if a message should be logged based on config
 */
function shouldLog(level) {
  if (!config) return level === 'error';

  const loggingLevel = config.logging_level || 'errors';

  const levels = {
    'all': ['info', 'warn', 'error'],
    'errors': ['error'],
    'none': []
  };

  return levels[loggingLevel]?.includes(level) || false;
}

/**
 * Get the log file path
 */
export function getLogPath() {
  return LOG_FILE;
}
