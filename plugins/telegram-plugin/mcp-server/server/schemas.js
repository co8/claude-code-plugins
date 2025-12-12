// MCP Tool Schemas

export const TOOL_SCHEMAS = [
  {
    name: "send_message",
    description:
      "Send a message to Telegram. Use for notifications, updates, and alerts.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Message text (supports Markdown formatting)",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high"],
          description:
            "Message priority (high sends immediately, bypassing batching)",
          default: "normal",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "send_approval_request",
    description:
      "Send an approval request with multiple choice options. Returns approval_id for polling.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question to ask",
        },
        options: {
          type: "array",
          description: "Array of option objects with label and description",
          items: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "Short option label",
              },
              description: {
                type: "string",
                description: "Detailed option description",
              },
            },
            required: ["label", "description"],
          },
        },
        header: {
          type: "string",
          description: "Optional header/title for the request",
        },
      },
      required: ["question", "options"],
    },
  },
  {
    name: "poll_response",
    description:
      "Poll for response to an approval request. Blocks until response or timeout.",
    inputSchema: {
      type: "object",
      properties: {
        approval_id: {
          type: "string",
          description: "Approval ID from send_approval_request",
        },
        timeout_seconds: {
          type: "number",
          description: "How long to wait for response (default: 600)",
          default: 600,
        },
      },
      required: ["approval_id"],
    },
  },
  {
    name: "batch_notifications",
    description:
      "Add multiple messages to the batch queue. Messages are combined and sent within the batch window.",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          description: "Array of message objects to batch",
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Message text",
              },
              priority: {
                type: "string",
                enum: ["low", "normal", "high"],
                default: "normal",
              },
            },
            required: ["text"],
          },
        },
      },
      required: ["messages"],
    },
  },
  {
    name: "start_listener",
    description:
      "Start listening for incoming messages from Telegram. Once started, the bot will queue all messages sent by the user.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "stop_listener",
    description:
      "Stop listening for incoming messages from Telegram and clear the command queue.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_pending_commands",
    description:
      "Retrieve pending commands from the message queue. Returns up to specified limit of commands.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of commands to retrieve (default: 10)",
          default: 10,
        },
      },
    },
  },
  {
    name: "get_listener_status",
    description:
      "Get the current status of the message listener, including whether it's active and how many pending commands are in the queue.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "enable_afk_mode",
    description:
      "Enable AFK (Away From Keyboard) mode - Telegram becomes the primary communication channel. Sends a notification to Telegram confirming AFK mode is active.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "disable_afk_mode",
    description:
      "Disable AFK (Away From Keyboard) mode - Return to normal communication. Sends a notification to Telegram confirming user is back.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];
