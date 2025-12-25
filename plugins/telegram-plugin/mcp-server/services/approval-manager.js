import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/logger.js";
import { markdownToHTML } from "../utils/markdown.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Approval request storage
const pendingApprovals = new Map();
const MAX_CONCURRENT_APPROVALS = 50;

/**
 * Cleans up old approval requests that are older than 24 hours
 * This prevents memory leaks from abandoned approvals
 * @returns {void}
 */
export function cleanupOldApprovals() {
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

/**
 * Sends an approval request to Telegram with inline keyboard buttons
 * @param {string} question - The question to ask the user
 * @param {Array<{label: string, description: string}>} options - Available options
 * @param {string} header - Header text for the approval request
 * @param {Object} telegramClient - Telegram client instance
 * @param {Object} config - Plugin configuration
 * @returns {Promise<Object>} Approval request details
 */
export async function sendApprovalRequest(
  question,
  options,
  header,
  telegramClient,
  config
) {
  const bot = telegramClient.getBot();

  // Enforce max concurrent approvals (O2 optimization)
  if (pendingApprovals.size >= MAX_CONCURRENT_APPROVALS) {
    log("info", "Max concurrent approvals reached, cleaning up", {
      current_size: pendingApprovals.size,
      max_size: MAX_CONCURRENT_APPROVALS,
    });

    cleanupOldApprovals();

    // If still at limit, reject oldest
    if (pendingApprovals.size >= MAX_CONCURRENT_APPROVALS) {
      const oldestId = pendingApprovals.keys().next().value;
      pendingApprovals.delete(oldestId);
      log("info", "Deleted oldest approval to make room", {
        deleted_id: oldestId,
      });
    }
  }

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

    // Debug logging (non-blocking, using logger)
    log("debug", "Approval request details", {
      header: escapedHeader.substring(0, 100),
      question: escapedQuestion.substring(0, 100),
      options_count: options.length,
    });

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

// Poll for approval response with improved cleanup
export async function pollResponse(
  approvalId,
  timeoutSeconds,
  telegramClient,
  config
) {
  const bot = telegramClient.getBot();
  const botInfo = telegramClient.getBotInfo();

  const approval = pendingApprovals.get(approvalId);
  if (!approval) {
    throw new Error(`No pending approval found: ${approvalId}`);
  }

  const startTime = Date.now();
  const timeout = timeoutSeconds * 1000;
  let pollInterval = 100; // Start at 100ms for fast response

  // Track polling state to avoid conflicts
  let wasPolling = telegramClient.isPolling();

  // Enable polling temporarily to catch callback queries
  if (!wasPolling) {
    try {
      await telegramClient.startPolling();
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
          clearTimeout(checkTimeout);
          checkTimeout = null;
        }

        // Only stop polling if we started it
        if (!wasPolling && telegramClient.isPolling()) {
          telegramClient.stopPolling().catch((err) => {
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
              text: isFirstSelected
                ? `✅ ${approval.options[i].label}`
                : approval.options[i].label,
              callback_data: JSON.stringify({
                idx: i,
                label: approval.options[i].label,
              }),
            });
            // Second button in row (if exists)
            if (i + 1 < approval.options.length) {
              const isSecondSelected = i + 1 === selectedIdx;
              row.push({
                text: isSecondSelected
                  ? `✅ ${approval.options[i + 1].label}`
                  : approval.options[i + 1].label,
                callback_data: JSON.stringify({
                  idx: i + 1,
                  label: approval.options[i + 1].label,
                }),
              });
            }
            updatedKeyboard.push(row);
          }

          // Add "Other" button
          const isOtherSelected = selectedIdx === -1;
          updatedKeyboard.push([
            {
              text: isOtherSelected
                ? "✅ 💬 Other (custom text)"
                : "💬 Other (custom text)",
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

      // Timeout mechanism with adaptive backoff
      const checkTimeoutFn = () => {
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
        } else {
          // Adaptive backoff: 100ms → 500ms → 1000ms (max)
          // This reduces CPU usage while maintaining responsiveness
          if (pollInterval < 1000) {
            pollInterval = Math.min(pollInterval + 100, 1000);
          }

          // Schedule next check with updated interval
          checkTimeout = setTimeout(checkTimeoutFn, pollInterval);
        }
      };

      // Start timeout checking
      checkTimeout = setTimeout(checkTimeoutFn, pollInterval);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

// Start periodic cleanup (runs every hour)
// This prevents memory leaks from abandoned approvals
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  cleanupOldApprovals();
}, CLEANUP_INTERVAL);

log("info", "Approval manager initialized with periodic cleanup", {
  cleanup_interval_minutes: CLEANUP_INTERVAL / (60 * 1000),
});
