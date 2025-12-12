import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/logger.js";
import { formatDuration } from "../utils/formatting.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AFK_STATE_PATH = join(dirname(dirname(__dirname)), ".afk-mode.state");
const TODO_MESSAGE_ID_PATH = join(dirname(dirname(__dirname)), ".todo-message-id");

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
export function loadAfkState() {
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

// Initialize AFK state
export function initAfkState() {
  isAfkMode = loadAfkState();
  if (isAfkMode) {
    log("info", "Restored AFK mode from previous session");
  }
  return isAfkMode;
}

// Enable AFK mode
export async function enableAfkMode(startListenerFn, sendMessageFn) {
  try {
    isAfkMode = true;
    afkStartTime = Date.now();
    saveAfkState(true, afkStartTime);

    // Automatically start the message listener when entering AFK mode
    await startListenerFn();
    log("info", "Message listener started automatically with AFK mode");

    const message = "🤖 <b>AFK Enabled</b> | Claude will notify you via Telegram";
    await sendMessageFn(message, "high");
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
export async function disableAfkMode(stopListenerFn, sendMessageFn) {
  try {
    isAfkMode = false;
    const duration = afkStartTime
      ? formatDuration(Date.now() - afkStartTime)
      : "Unknown";
    saveAfkState(false);
    afkStartTime = null;

    // Clear the todo message ID file
    if (existsSync(TODO_MESSAGE_ID_PATH)) {
      unlinkSync(TODO_MESSAGE_ID_PATH);
      log("info", "Cleared todo message ID");
    }

    // Automatically stop the message listener when leaving AFK mode
    await stopListenerFn();
    log("info", "Message listener stopped automatically with AFK mode");

    const message = `🖥️ <b>AFK Disabled</b> | Duration of Session: ${duration}`;
    await sendMessageFn(message, "high");
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

// Check if AFK mode is enabled
export function isAfkModeEnabled() {
  return isAfkMode;
}
