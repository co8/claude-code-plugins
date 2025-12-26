/**
 * MCP Tool Schemas
 * Define your tools here
 */

export const TOOLS = [
  {
    name: "{{PLUGIN_NAME}}:example_tool",
    description: "An example tool that does something useful",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "Input parameter for the tool"
        }
      },
      required: ["input"]
    }
  }
];
