import { appendFileSync, existsSync, statSync, renameSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_PATH = join(dirname(dirname(__dirname)), "telegram.log");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 3;
const SIZE_CHECK_INTERVAL = 10000; // Check file size every 10 seconds

let cachedConfig = null;
let lastSizeCheck = 0;
let estimatedSize = 0;

/**
 * Sets the configuration reference for the logger
 * @param {Object} config - Plugin configuration
 */
export function setConfig(config) {
  cachedConfig = config;
}

/**
 * Scrubs sensitive data from objects before logging
 * Masks values for keys like bot_token, password, api_key, etc.
 * @param {*} obj - Object to scrub (can be object, array, or primitive)
 * @returns {*} Scrubbed copy of the object
 */
function scrubSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const scrubbed = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = ['bot_token', 'token', 'password', 'secret', 'key', 'apiKey', 'api_key'];

  for (const key of Object.keys(scrubbed)) {
    const lowerKey = key.toLowerCase();

    // Check if key name suggests sensitive data
    const isSensitive = sensitiveKeys.some(sensitiveKey =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      const value = scrubbed[key];
      if (typeof value === 'string' && value.length > 0) {
        // Show first 10 characters followed by asterisks
        scrubbed[key] = value.slice(0, 10) + '***';
      }
    } else if (typeof scrubbed[key] === 'object' && scrubbed[key] !== null) {
      // Recursively scrub nested objects
      scrubbed[key] = scrubSensitiveData(scrubbed[key]);
    }
  }

  return scrubbed;
}

/**
 * Rotates log files when max size is reached
 * Uses cached size checks to avoid excessive I/O operations
 */
function rotateLogFile() {
  const now = Date.now();

  try {
    if (!existsSync(LOG_PATH)) {
      estimatedSize = 0;
      lastSizeCheck = now;
      return;
    }

    // Check actual file size if:
    // 1. Periodic check interval has passed (every 10 seconds)
    // 2. Estimated size suggests rotation might be needed
    // 3. First check (lastSizeCheck is 0)
    const needsSizeCheck =
      (lastSizeCheck === 0) ||
      (now - lastSizeCheck > SIZE_CHECK_INTERVAL) ||
      (estimatedSize >= MAX_LOG_SIZE);

    if (needsSizeCheck) {
      const stats = statSync(LOG_PATH);
      estimatedSize = stats.size;
      lastSizeCheck = now;
    }

    // Use estimated size for quick check
    if (estimatedSize < MAX_LOG_SIZE) return;

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

    // Reset estimated size after rotation
    estimatedSize = 0;
  } catch (err) {
    console.error("Failed to rotate log:", err);
  }
}

/**
 * Resets the logger state (for testing purposes)
 * @private
 */
export function __resetLoggerState() {
  lastSizeCheck = 0;
  estimatedSize = 0;
  cachedConfig = null;
}

/**
 * Logs a message with the specified level
 * Includes automatic log rotation, sensitive data scrubbing, and config-based filtering
 * @param {string} level - Log level (info, error, debug, warn)
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log (will be JSON stringified)
 */
export function log(level, message, data = {}) {
  // Use cached config to avoid loading on every log call
  if (!cachedConfig) return;

  if (cachedConfig.logging_level === "none") return;
  if (cachedConfig.logging_level === "errors" && level !== "error") return;

  // Scrub sensitive data before logging
  const scrubbedData = scrubSensitiveData(data);

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(
    scrubbedData
  )}\n`;

  // Update estimated size
  estimatedSize += logEntry.length;

  try {
    rotateLogFile();
    appendFileSync(LOG_PATH, logEntry);
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}
