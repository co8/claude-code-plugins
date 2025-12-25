import TelegramBot from "node-telegram-bot-api";
import { log } from "../utils/logger.js";
import { RateLimiter } from "../utils/rate-limiter.js";

export class TelegramClient {
  constructor(config) {
    this.config = config;
    this.bot = new TelegramBot(config.bot_token, { polling: false });

    // Use configurable rate limiting with burst protection
    const messagesPerMinute = config.rate_limiting?.messages_per_minute || 20;
    const burstSize = config.rate_limiting?.burst_size || 5;
    this.rateLimiter = new RateLimiter(messagesPerMinute, burstSize);
    this.botInfo = null;
  }

  async init() {
    try {
      this.botInfo = await this.bot.getMe();
      log("info", "Telegram bot initialized", {
        chat_id: this.config.chat_id,
        bot_id: this.botInfo.id,
        bot_username: this.botInfo.username,
      });
    } catch (error) {
      log("error", "Failed to get bot info", { error: error.message });
    }
  }

  getBotInfo() {
    return this.botInfo;
  }

  getBot() {
    return this.bot;
  }

  isPolling() {
    return this.bot.isPolling();
  }

  async startPolling() {
    return this.bot.startPolling();
  }

  async stopPolling() {
    return this.bot.stopPolling();
  }

  on(event, handler) {
    this.bot.on(event, handler);
  }

  removeAllListeners(event) {
    this.bot.removeAllListeners(event);
  }

  removeListener(event, handler) {
    this.bot.removeListener(event, handler);
  }

  // Send message to Telegram with retry logic
  async sendMessage(text, priority = "normal", options = {}, retries = 3) {
    // Apply rate limiting
    await this.rateLimiter.throttle();

    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const message = await this.bot.sendMessage(this.config.chat_id, text, {
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
          await this.bot.setMessageReaction(
            this.config.chat_id,
            message.message_id,
            [{ type: "emoji", emoji: "🤖" }]
          );
        } catch (reactionError) {
          // Reaction might not be supported, ignore error
          log("info", "Could not add reaction", {
            error: reactionError.message,
          });
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
  async editMessage(messageId, text, options = {}, retries = 3) {
    // Apply rate limiting
    await this.rateLimiter.throttle();

    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.bot.editMessageText(text, {
          chat_id: this.config.chat_id,
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
}
