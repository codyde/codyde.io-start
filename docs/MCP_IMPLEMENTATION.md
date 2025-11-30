# MCP Implementation Guide for TanStack Start

This document explains how Model Context Protocol (MCP) was implemented in this TanStack Start application using the `mcp-tanstack-start` package.

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

### What is mcp-tanstack-start?

`mcp-tanstack-start` is a TanStack Start-native implementation of MCP, fully compliant with the [2025-06-18 Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports). It was built from scratch to feel natural in the TanStack ecosystem, using:

- **Zod schemas** for type-safe tool parameters
- **API routes** for handling MCP requests
- **Web standard Request/Response** APIs
- **Full session management** with `Mcp-Session-Id` headers
- **Origin validation** for DNS rebinding protection
- **SSE resumability** via event IDs and `Last-Event-ID`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Assistant / MCP Client               │
│                  (Claude, ChatGPT, Cursor, etc.)            │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (POST/GET/DELETE)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              TanStack Start Application                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /api/mcp (API Route)                                  │ │
│  │  src/routes/api/mcp.ts                                 │ │
│  │                                                        │ │
│  │  Methods:                                              │ │
│  │  - POST: JSON-RPC requests                             │ │
│  │  - GET: SSE stream for notifications                   │ │
│  │  - DELETE: Session termination                         │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │  MCP Server (mcp-tanstack-start)                       │ │
│  │  - Session management (Mcp-Session-Id)                 │ │
│  │  - Origin validation (DNS rebinding protection)        │ │
│  │  - SSE resumability (event IDs)                        │ │
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
      },
      GET: async ({ request }) => { ... },
      DELETE: async ({ request }) => { ... },
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
- Control over headers (Content-Type, Accept, Mcp-Session-Id)
- JSON-RPC message format
- SSE streaming support

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
npm install mcp-tanstack-start @modelcontextprotocol/sdk zod
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
import { defineTool } from "mcp-tanstack-start";
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
import { createMcpServer } from "mcp-tanstack-start";
import { listPostsTool, getPostTool } from "./tools/blog";

export const mcp = createMcpServer({
  name: "my-app",
  version: "1.0.0",
  instructions: "This server provides access to blog posts...",
  tools: [listPostsTool, getPostTool],
  // Optional transport configuration
  transport: {
    allowedOrigins: ['https://my-app.com'], // Production origins
    sessionTimeout: 300000, // 5 minutes
  },
});
```

### Step 4: Create API Route

Expose the MCP server via an HTTP endpoint with all three required methods:

```typescript
// src/routes/api/mcp.ts
import { createFileRoute } from "@tanstack/react-router";
import { mcp } from "../../mcp";

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return mcp.handleRequest(request);
      },
      POST: async ({ request }) => {
        return mcp.handleRequest(request);
      },
      DELETE: async ({ request }) => {
        return mcp.handleRequest(request);
      },
    },
  },
});
```

That's it! The endpoint is now available at `/api/mcp`.

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

3. **MCP server validates** Origin header, session, and protocol version

4. **MCP server routes to tool** based on `params.name`

5. **Tool executes** with validated parameters
   ```typescript
   execute: async ({ limit }) => {
     const posts = await getAllPosts();
     return JSON.stringify(posts.slice(0, limit));
   }
   ```

6. **Response returned** as JSON-RPC (via SSE or JSON)
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
| `initialize` | Client connects, exchanges capabilities, receives session ID |
| `tools/list` | Client requests available tools |
| `tools/call` | Client invokes a specific tool |
| `ping` | Health check |

### HTTP Methods (2025-06-18 Spec)

| Method | Purpose |
|--------|---------|
| `POST` | JSON-RPC requests (single message per request) |
| `GET` | SSE stream for server-to-client notifications |
| `DELETE` | Session termination |

### Required Headers

| Header | When | Purpose |
|--------|------|---------|
| `Accept` | All POST requests | Must include both `application/json` and `text/event-stream` |
| `Content-Type` | POST requests | Must be `application/json` |
| `Mcp-Session-Id` | After initialization | Session identifier |
| `MCP-Protocol-Version` | Recommended | Protocol version (defaults to `2025-03-26` if missing) |

---

## Testing the Integration

### Using curl

**Initialize connection:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": { "name": "test-client", "version": "1.0.0" }
    },
    "id": 0
  }'
```

**List available tools (with session ID from initialize response):**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <session-id-from-init>" \
  -H "MCP-Protocol-Version: 2025-06-18" \
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
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <session-id>" \
  -H "MCP-Protocol-Version: 2025-06-18" \
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

**Terminate session:**
```bash
curl -X DELETE http://localhost:3000/api/mcp \
  -H "Mcp-Session-Id: <session-id>"
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
import { defineTool } from "mcp-tanstack-start";
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
import { text, image } from "mcp-tanstack-start";

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

### Origin Validation (Built-in)

The 2025-06-18 spec requires Origin header validation to prevent DNS rebinding attacks. By default, mcp-tanstack-start only allows localhost origins. Configure for production:

```typescript
const mcp = createMcpServer({
  // ...
  transport: {
    allowedOrigins: [
      'https://my-app.com',
      'https://api.my-app.com',
    ],
  },
});
```

> ⚠️ **Warning**: Setting `allowedOrigins: ["*"]` disables Origin validation entirely. This is NOT recommended for production.

### Authentication

For production, add authentication:

```typescript
import { withMcpAuth } from "mcp-tanstack-start";

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
      GET: authenticatedHandler,
      POST: authenticatedHandler,
      DELETE: authenticatedHandler,
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

Ensure you're using the correct HTTP method:
- `POST` for JSON-RPC requests
- `GET` for SSE streams
- `DELETE` for session termination

### "Not Acceptable" (406)

The Accept header must include BOTH types:
```bash
curl -H "Accept: application/json, text/event-stream" ...
```

### "Forbidden: Origin not allowed" (403)

The request Origin doesn't match `allowedOrigins`. Either:
- Add your origin to the allowed list
- If testing locally, ensure you're using localhost

### "Not Found: Session does not exist" (404)

The session has expired or was terminated. Send a new `initialize` request.

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

- [MCP Specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18)
- [TanStack Start Documentation](https://tanstack.com/start/latest)
- [mcp-tanstack-start Package](https://github.com/codyde/mcp-tanstack-start)
