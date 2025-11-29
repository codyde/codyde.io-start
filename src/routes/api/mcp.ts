import { createFileRoute } from "@tanstack/react-router";
import { mcp } from "../../mcp";

/**
 * MCP API Route
 *
 * This endpoint handles Model Context Protocol requests.
 * AI assistants and MCP clients can connect to this endpoint
 * to interact with the blog's tools.
 *
 * Endpoints:
 * - POST /api/mcp - JSON-RPC 2.0 requests
 * - GET /api/mcp - SSE stream for server-to-client notifications
 */
export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return mcp.handleRequest(request);
      },
      GET: async ({ request }) => {
        return mcp.handleRequest(request);
      },
    },
  },
});
