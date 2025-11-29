import { createMcpServer } from "mcp-start";

// Import tools
import { listPostsTool, getPostTool, searchPostsTool } from "./tools/blog";
import { echoTool, serverInfoTool } from "./tools/echo";

/**
 * MCP Server for codyde-start blog
 *
 * This server exposes tools that allow AI assistants to:
 * - List and read blog posts
 * - Search blog content
 * - Test connectivity
 */
export const mcp = createMcpServer({
  name: "codyde-start",
  version: "1.0.0",
  instructions: `This is Cody's personal blog built with TanStack Start.
You can use the available tools to explore blog posts, search for content,
and retrieve full post details. Use list_posts to see available content,
search_posts to find specific topics, and get_post to read full articles.`,
  tools: [
    // Blog tools
    listPostsTool,
    getPostTool,
    searchPostsTool,
    // Utility tools
    echoTool,
    serverInfoTool,
  ],
});
