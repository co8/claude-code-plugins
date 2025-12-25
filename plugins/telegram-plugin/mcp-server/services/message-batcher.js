import { log } from "../utils/logger.js";
import { markdownToHTML } from "../utils/markdown.js";

// Message batching
export class MessageBatcher {
  constructor(windowSeconds, sendMessageFn, editMessageFn, maxQueueSize = 100) {
    this.window = windowSeconds * 1000;
    this.pending = [];
    this.timer = null;
    this.compactingMessageId = null;
    this.sendMessageFn = sendMessageFn;
    this.editMessageFn = editMessageFn;
    this.maxQueueSize = maxQueueSize;
  }

  async add(message, priority = "normal") {
    // Auto-flush if queue is full
    if (this.pending.length >= this.maxQueueSize) {
      log("info", "Message queue at max capacity, auto-flushing", {
        queue_size: this.pending.length,
        max_size: this.maxQueueSize,
      });
      await this.flush();
    }

    this.pending.push({ message, priority, timestamp: Date.now() });

    // Remove old messages beyond retention window (2x batch window)
    const now = Date.now();
    const cutoff = now - (this.window * 2);
    const beforeCleanup = this.pending.length;
    this.pending = this.pending.filter(m => m.timestamp > cutoff);

    if (this.pending.length < beforeCleanup) {
      log("info", "Cleaned up old messages from queue", {
        removed: beforeCleanup - this.pending.length,
        remaining: this.pending.length,
      });
    }

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
      const result = await this.sendMessageFn(
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
        await this.editMessageFn(
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

// Batch and send notifications
export async function batchNotifications(messages, batcher, sendMessageFn) {
  for (const msg of messages) {
    // Escape each message text before batching and convert Markdown formatting
    const escapedText = markdownToHTML(msg.text, { preserveFormatting: true });
    await batcher.add(escapedText, msg.priority || "normal");
  }

  // Flush immediately if any high priority
  const hasHighPriority = messages.some((m) => m.priority === "high");
  if (hasHighPriority) {
    const combined = await batcher.flush();
    if (combined) {
      // Combined text is already escaped, so send directly
      await sendMessageFn(combined, "high");
    }
  }

  return { success: true, batched: messages.length };
}
