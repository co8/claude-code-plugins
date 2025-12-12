import { appendFileSync, existsSync, statSync, renameSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_PATH = join(dirname(dirname(__dirname)), "telegram.log");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 3;

let cachedConfig = null;

// Set the config reference (called from main)
export function setConfig(config) {
  cachedConfig = config;
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

// Logging utility with rotation - use cached config
export function log(level, message, data = {}) {
  // Use cached config to avoid loading on every log call
  if (!cachedConfig) return;

  if (cachedConfig.logging_level === "none") return;
  if (cachedConfig.logging_level === "errors" && level !== "error") return;

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
