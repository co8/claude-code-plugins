import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PENDING_COUNT_PATH = join(dirname(dirname(__dirname)), ".pending-messages-count");

// Command queue for incoming Telegram messages
const commandQueue = [];
let isListeningForCommands = false;

// Update pending messages count file for hooks to read
function updatePendingCount() {
  try {
    const count = commandQueue.length;
    writeFileSync(PENDING_COUNT_PATH, count.toString(), "utf-8");
  } catch (error) {
    log("error", "Failed to update pending count file", {
      error: error.message,
    });
  }
}

// Start listening for incoming messages and commands
export async function startMessageListener(telegramClient, config) {
  if (isListeningForCommands) {
    log("info", "Message listener already active");
    return { success: true, already_active: true };
  }

  const bot = telegramClient.getBot();
  const botInfo = telegramClient.getBotInfo();

  try {
    // Start polling if not already polling
    if (!telegramClient.isPolling()) {
      await telegramClient.startPolling();
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
export async function stopMessageListener(telegramClient) {
  if (!isListeningForCommands) {
    return { success: true, already_stopped: true };
  }

  try {
    if (telegramClient.isPolling()) {
      await telegramClient.stopPolling();
      log("info", "Stopped polling for messages");
    }

    telegramClient.removeAllListeners("message");
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
export function getPendingCommands(limit = 10) {
  const commands = commandQueue.splice(0, limit);
  updatePendingCount(); // Update count for hooks after removing commands
  log("info", "Retrieved pending commands", { count: commands.length });
  return {
    commands,
    remaining: commandQueue.length,
  };
}

// Check if listener is active
export function getListenerStatus(telegramClient) {
  return {
    listening: isListeningForCommands,
    pending_commands: commandQueue.length,
    polling_active: telegramClient ? telegramClient.isPolling() : false,
  };
}

// Initialize pending count file
export function initPendingCount() {
  updatePendingCount();
}
