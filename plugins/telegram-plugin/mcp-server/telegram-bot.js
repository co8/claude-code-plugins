#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import TelegramBot from "node-telegram-bot-api";

// Config
import { getConfigPath, loadConfig } from "./config/config-loader.js";

// Utils
import { log, setConfig } from "./utils/logger.js";

// Services
import { TelegramClient } from "./services/telegram-client.js";
import { MessageBatcher } from "./services/message-batcher.js";
import { initAfkState } from "./services/afk-manager.js";
import { cleanupOldApprovals } from "./services/approval-manager.js";
import { initPendingCount } from "./services/message-listener.js";

// Server
import { TOOL_SCHEMAS } from "./server/schemas.js";
import { handleToolCall } from "./server/handlers.js";

// Global state
let config = null;
let telegramClient = null;
let batcher = null;

// Initialize bot and services
async function initBot() {
  const configPath = getConfigPath();
  config = loadConfig(configPath);

  // Set config for logger
  setConfig(config);

  telegramClient = new TelegramClient(config);
  await telegramClient.init();

  batcher = new MessageBatcher(
    config.batch_window_seconds,
    (text, priority) => telegramClient.sendMessage(text, priority),
    (messageId, text) => telegramClient.editMessage(messageId, text)
  );

  // Load AFK state from file
  initAfkState();

  // Initialize pending count file
  initPendingCount();

  log("info", "Telegram bot initialized", {
    config_path: configPath,
  });
}

// Run cleanup every hour with error handling
setInterval(() => {
  try {
    cleanupOldApprovals();
  } catch (err) {
    log("error", "Approval cleanup failed", { error: err.message });
  }
}, 60 * 60 * 1000);

// MCP Server setup
const server = new Server(
  {
    name: "telegram-bot",
    version: "0.3.1",
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
    tools: TOOL_SCHEMAS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!telegramClient) await initBot();
  return handleToolCall(request, telegramClient, config, batcher);
});

// Health check function
async function healthCheck() {
  console.log("🏥 Telegram MCP Server Health Check\n");

  try {
    // 1. Check configuration
    console.log("1️⃣ Checking configuration...");
    const configPath = getConfigPath();
    const testConfig = loadConfig(configPath);
    console.log("   ✅ Configuration valid");
    console.log(`   📄 Config path: ${configPath}`);
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
        await telegramClient.sendMessage(combined, "high").catch((err) => {
          log("error", "Failed to flush messages on shutdown", {
            error: err.message,
          });
        });
      }
    }

    // Stop polling if active
    if (telegramClient && telegramClient.isPolling()) {
      await telegramClient.stopPolling();
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
