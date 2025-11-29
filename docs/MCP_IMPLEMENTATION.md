# MCP Implementation Guide for TanStack Start

This document explains how Model Context Protocol (MCP) was implemented in this TanStack Start application using the `mcp-start` package.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Why API Routes vs Server Functions](#why-api-routes-vs-server-functions)
4. [Project Structure](#project-structure)
5. [Step-by-Step Implementation](#step-by-step-implementation)
6. [How It Works](#how-it-works)
7. [Testing the Integration](#testing-the-integration)
8. [Extending with More Tools](#extending-with-more-tools)

---

## Overview

### What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is a standardized protocol that allows AI assistants (like Claude, ChatGPT, etc.) to interact with external tools and data sources. It uses JSON-RPC 2.0 over HTTP to enable:

- **Tools**: Functions that AI can call (e.g., search posts, get data)
- **Resources**: Data that AI can read (e.g., files, database records)
- **Prompts**: Pre-defined prompts that guide AI behavior

### What is mcp-start?

`mcp-start` is a TanStack Start-native implementation of MCP. It was built from scratch to feel natural in the TanStack ecosystem, using:

- **Zod schemas** for type-safe tool parameters
- **API routes** for handling MCP requests
- **Web standard Request/Response** APIs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Assistant / MCP Client               │
│                  (Claude, ChatGPT, etc.)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP POST (JSON-RPC 2.0)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              TanStack Start Application                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /api/mcp (API Route)                                  │ │
│  │  src/routes/api/mcp.ts                                 │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │  MCP Server (mcp-start)                                │ │
│  │  src/mcp/index.ts                                      │ │
│  │                                                        │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │ │
│  │  │ list_posts   │ │ get_post     │ │ search_posts │   │ │
│  │  │ Tool         │ │ Tool         │ │ Tool         │   │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘   │ │
│  │  ┌──────────────┐ ┌──────────────┐                    │ │
│  │  │ echo         │ │ server_info  │                    │ │
│  │  │ Tool         │ │ Tool         │                    │ │
│  │  └──────────────┘ └──────────────┘                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │  Application Data Layer                                │ │
│  │  (posts.server.ts, database, etc.)                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Why API Routes vs Server Functions

TanStack Start provides two ways to handle server-side logic:

### Server Functions (`createServerFn`)

```typescript
// Designed for RPC from React components
const getData = createServerFn({ method: 'GET' })
  .handler(async () => { ... })

// Called from React component
const data = await getData()
```

**Characteristics:**
- Automatic serialization via Seroval
- Internal routing (`/_start/invoke/...`)
- Tightly coupled to TanStack Start's internals
- **Not suitable for external HTTP clients**

### API Routes (`createFileRoute` with `server.handlers`)

```typescript
// Standard HTTP endpoint
export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return new Response(...)
      }
    }
  }
})
```

**Characteristics:**
- Web standard Request/Response
- Direct HTTP access
- External clients can call directly
- **Perfect for MCP protocol**

### Decision: API Routes

MCP requires:
- External HTTP access (AI clients connect over the network)
- Control over headers (Content-Type, Accept)
- JSON-RPC message format

API routes provide all of this, making them the correct choice.

---

## Project Structure

```
src/
├── mcp/
│   ├── index.ts              # MCP server configuration
│   └── tools/
│       ├── blog.ts           # Blog-related tools
│       └── echo.ts           # Utility tools
├── routes/
│   └── api/
│       └── mcp.ts            # MCP API endpoint
└── lib/
    └── posts.server.ts       # Data layer (reused by tools)
```

### File Responsibilities

| File | Purpose |
|------|---------|
| `src/mcp/index.ts` | Creates and configures the MCP server with all tools |
| `src/mcp/tools/blog.ts` | Tools for interacting with blog posts |
| `src/mcp/tools/echo.ts` | Utility tools for testing |
| `src/routes/api/mcp.ts` | HTTP endpoint that handles MCP requests |

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install mcp-start @modelcontextprotocol/sdk zod
```

Or link local development version:
```bash
npm install file:../mcp-start
```

### Step 2: Define Tools

Tools are the functions that AI assistants can call. Each tool needs:
- **name**: Unique identifier
- **description**: Explains what the tool does (AI reads this!)
- **parameters**: Zod schema defining inputs
- **execute**: Async function that runs the tool

```typescript
// src/mcp/tools/blog.ts
import { defineTool } from "mcp-start";
import { z } from "zod";

export const listPostsTool = defineTool({
  name: "list_posts",
  description: "List all blog posts with their titles, dates, and excerpts.",
  parameters: z.object({
    limit: z.number().optional().describe("Maximum number of posts"),
  }),
  execute: async ({ limit }) => {
    const posts = await getAllPosts();
    return JSON.stringify(posts.slice(0, limit));
  },
});
```

**Important:** The `description` is critical! AI assistants use it to decide when to call the tool.

### Step 3: Create MCP Server

The server registers all tools and handles the MCP protocol:

```typescript
// src/mcp/index.ts
import { createMcpServer } from "mcp-start";
import { listPostsTool, getPostTool } from "./tools/blog";

export const mcp = createMcpServer({
  name: "my-app",
  version: "1.0.0",
  instructions: "This server provides access to blog posts...",
  tools: [listPostsTool, getPostTool],
});
```

### Step 4: Create API Route

Expose the MCP server via an HTTP endpoint:

```typescript
// src/routes/api/mcp.ts
import { createFileRoute } from "@tanstack/react-router";
import { mcp } from "../../mcp";

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return mcp.handleRequest(request);
      },
    },
  },
});
```

That's it! The endpoint is now available at `POST /api/mcp`.

---

## How It Works

### Request Flow

1. **AI sends JSON-RPC request** to `POST /api/mcp`
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "list_posts",
       "arguments": { "limit": 5 }
     },
     "id": 1
   }
   ```

2. **API route receives request** and passes to MCP server
   ```typescript
   POST: async ({ request }) => {
     return mcp.handleRequest(request);
   }
   ```

3. **MCP server routes to tool** based on `params.name`

4. **Tool executes** with validated parameters
   ```typescript
   execute: async ({ limit }) => {
     const posts = await getAllPosts();
     return JSON.stringify(posts.slice(0, limit));
   }
   ```

5. **Response returned** as JSON-RPC
   ```json
   {
     "jsonrpc": "2.0",
     "result": {
       "content": [{
         "type": "text",
         "text": "[{\"title\": \"Hello World\", ...}]"
       }]
     },
     "id": 1
   }
   ```

### Protocol Messages

| Method | Description |
|--------|-------------|
| `initialize` | Client connects, exchanges capabilities |
| `tools/list` | Client requests available tools |
| `tools/call` | Client invokes a specific tool |
| `ping` | Health check |

---

## Testing the Integration

### Using curl

**List available tools:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

**Call a tool:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": { "message": "Hello MCP!" }
    },
    "id": 2
  }'
```

**Initialize connection:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "test-client", "version": "1.0.0" }
    },
    "id": 0
  }'
```

### Using MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a visual tool for testing MCP servers:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

---

## Extending with More Tools

### Adding a New Tool

1. **Create the tool definition:**

```typescript
// src/mcp/tools/analytics.ts
import { defineTool } from "mcp-start";
import { z } from "zod";

export const getPageViewsTool = defineTool({
  name: "get_page_views",
  description: "Get page view statistics for a specific post",
  parameters: z.object({
    slug: z.string().describe("Post slug to get views for"),
    days: z.number().optional().default(30).describe("Number of days"),
  }),
  execute: async ({ slug, days }) => {
    const views = await fetchAnalytics(slug, days);
    return JSON.stringify(views);
  },
});
```

2. **Register in MCP server:**

```typescript
// src/mcp/index.ts
import { getPageViewsTool } from "./tools/analytics";

export const mcp = createMcpServer({
  // ...
  tools: [
    // existing tools...
    getPageViewsTool,
  ],
});
```

### Rich Content Responses

Tools can return more than text:

```typescript
import { text, image } from "mcp-start";

execute: async ({ url }) => {
  const screenshot = await captureScreenshot(url);
  return [
    text(`Screenshot of ${url}`),
    image(screenshot.base64, "image/png"),
  ];
}
```

### Error Handling

Return errors explicitly:

```typescript
execute: async ({ id }) => {
  const item = await findItem(id);

  if (!item) {
    return {
      content: [{ type: "text", text: `Item ${id} not found` }],
      isError: true,
    };
  }

  return JSON.stringify(item);
}
```

---

## Security Considerations

### Authentication

For production, add authentication:

```typescript
import { withMcpAuth } from "mcp-start";

const authenticatedHandler = withMcpAuth(
  async (request, auth) => mcp.handleRequest(request, { auth }),
  async (request) => {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    return verifyToken(token);
  }
);

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      POST: authenticatedHandler,
    },
  },
});
```

### Rate Limiting

Consider adding rate limiting for production deployments to prevent abuse.

### Input Validation

Zod schemas automatically validate inputs, but be careful with:
- File paths (prevent directory traversal)
- Database queries (prevent injection)
- External API calls (validate URLs)

---

## Troubleshooting

### "Method not allowed"

Ensure you're using POST, not GET:
```bash
curl -X POST ...  # ✓
curl http://...   # ✗ (defaults to GET)
```

### "Content-Type must be application/json"

Include the header:
```bash
curl -H "Content-Type: application/json" ...
```

### Tool not found

Check tool registration in `src/mcp/index.ts` and verify the tool name matches exactly.

### Route not working

Ensure TanStack Start regenerated routes:
```bash
npm run dev  # Restarts and regenerates
```

---

## Further Reading

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-03-26)
- [TanStack Start Documentation](https://tanstack.com/start/latest)
- [mcp-start Package](../mcp-start/README.md)
