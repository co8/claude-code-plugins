import { log } from "../utils/logger.js";
import { escapeMarkdown } from "../utils/markdown.js";
import {
  validateSendMessage,
  validateApprovalRequest,
  validatePollResponse,
  validateBatchNotifications,
} from "../config/validation.js";
import { sendApprovalRequest, pollResponse } from "../services/approval-manager.js";
import { batchNotifications } from "../services/message-batcher.js";
import {
  startMessageListener,
  stopMessageListener,
  getPendingCommands,
  getListenerStatus,
} from "../services/message-listener.js";
import { enableAfkMode, disableAfkMode } from "../services/afk-manager.js";

// Tool request handlers
export async function handleToolCall(
  request,
  telegramClient,
  config,
  batcher
) {
  try {
    switch (request.params.name) {
      case "send_message": {
        validateSendMessage(request.params.arguments);
        const { text, priority = "normal" } = request.params.arguments;
        // Escape markdown special characters for Telegram MarkdownV2
        // Use preserveFormatting to allow intentional bold/italic
        const escapedText = escapeMarkdown(text, { preserveFormatting: true });
        const result = await telegramClient.sendMessage(escapedText, priority);
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
        const result = await sendApprovalRequest(
          question,
          options,
          header,
          telegramClient,
          config
        );
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
        const result = await pollResponse(
          approval_id,
          timeout_seconds,
          telegramClient,
          config
        );
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
        const result = await batchNotifications(
          messages,
          batcher,
          (text, priority) => telegramClient.sendMessage(text, priority)
        );
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
        const result = await startMessageListener(telegramClient, config);
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
        const result = await stopMessageListener(telegramClient);
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
        const result = getListenerStatus(telegramClient);
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
        const result = await enableAfkMode(
          async () => startMessageListener(telegramClient, config),
          (msg, priority) => telegramClient.sendMessage(msg, priority)
        );
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
        const result = await disableAfkMode(
          async () => stopMessageListener(telegramClient),
          (msg, priority) => telegramClient.sendMessage(msg, priority)
        );
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
}
