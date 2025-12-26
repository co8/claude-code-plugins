import { log } from '../utils/logger.js';

/**
 * Handle tool calls from Claude
 * @param {object} request - The MCP tool call request
 * @param {object} config - Plugin configuration
 * @returns {object} MCP response
 */
export async function handleToolCall(request, config) {
  const { name, arguments: args } = request.params;

  log('info', 'Tool called', { tool: name, args });

  switch (name) {
    case "{{PLUGIN_NAME}}:example_tool":
      return handleExampleTool(args, config);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Example tool handler
 */
async function handleExampleTool(args, config) {
  const { input } = args;

  // TODO: Implement your tool logic here
  const result = `Processed: ${input}`;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ result }, null, 2)
      }
    ]
  };
}
