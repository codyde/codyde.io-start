import { createFileRoute } from "@tanstack/react-router";
import { createMcpServer } from "mcp-tanstack-start";

// Import tools
import { listPostsTool, getPostTool, searchPostsTool } from "../../mcp/tools/blog";
import { echoTool, serverInfoTool } from "../../mcp/tools/echo";

/**
 * MCP Server for codyde-start blog
 *
 * This server exposes tools that allow AI assistants to:
 * - List and read blog posts
 * - Search blog content
 * - Test connectivity
 */
const mcp = createMcpServer({
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

/**
 * MCP API Route (2025-06-18 Spec Compliant)
 *
 * This endpoint handles Model Context Protocol requests.
 * AI assistants and MCP clients can connect to this endpoint
 * to interact with the blog's tools.
 *
 * Endpoints:
 * - POST /api/mcp - JSON-RPC 2.0 requests (single message per request)
 * - GET /api/mcp - SSE stream for server-to-client notifications
 * - DELETE /api/mcp - Session termination
 */
export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      // Using lowercase 'all' due to a bug in TanStack Start's handler lookup
      // See: https://github.com/TanStack/router - the runtime looks for 'all' but types expect 'ALL'
      all: async ({ request }) => {
        return mcp.handleRequest(request);
      },
    } as Record<string, (ctx: { request: Request }) => Promise<Response>>,
  },
});
