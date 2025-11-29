import { defineTool } from "mcp-start";
import { z } from "zod";

/**
 * Simple echo tool for testing MCP connectivity
 */
export const echoTool = defineTool({
  name: "echo",
  description: "Echo back a message. Useful for testing MCP connectivity.",
  parameters: z.object({
    message: z.string().describe("The message to echo back"),
  }),
  execute: async ({ message }) => {
    return `Echo: ${message}`;
  },
});

/**
 * Tool that returns server information
 */
export const serverInfoTool = defineTool({
  name: "server_info",
  description: "Get information about this MCP server and available tools.",
  parameters: z.object({}),
  execute: async () => {
    return JSON.stringify(
      {
        name: "codyde-start",
        description: "MCP server for Cody's TanStack Start blog",
        version: "1.0.0",
        capabilities: [
          "List and read blog posts",
          "Search blog content",
          "Echo messages for testing",
        ],
      },
      null,
      2
    );
  },
});
