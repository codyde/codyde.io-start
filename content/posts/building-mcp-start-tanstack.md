---
title: "Building MCP-Start: Bringing Model Context Protocol to TanStack Start"
date: '2025-11-29'
slug: building-mcp-start-tanstack
cover_image: https://placeholder-for-cover-image.com/mcp-start.png
description: I needed MCP servers in TanStack Start, and the existing solutions didn't quite fit. Here's how Claude Code helped me build mcp-start, and the wild ride of WebStandardTransport implementation.
---

I've been going deep on [TanStack Start](https://tanstack.com/start) lately. It's been my framework of choice for new projects - the file-based routing, server functions, and overall DX just clicks for me. But when I wanted to add MCP (Model Context Protocol) server support to expose tools for AI agents, I hit a wall.

The existing solutions didn't fit.

[Vercel's mcp-handler](https://github.com/vercel/mcp-handler) is fantastic, but it's built specifically for Next.js and Vercel's edge runtime primitives. TanStack Start has its own patterns - different route handlers, different server context, different everything. I couldn't just drop it in and call it a day.

So I built [mcp-start](https://github.com/codyde/mcp-start). And I used Claude Code to help me do it.

## Starting With Research, Not Code

Here's the thing I've learned about using AI for development - the real power isn't in asking it to write code from scratch. It's in using it to understand existing implementations so you can make informed decisions about your own.

I pointed Claude Code at the mcp-handler repository and basically said: "Explain this to me. How does it work? What are the key architectural decisions? Where does it integrate with Next.js specifically?"

The exploration was eye-opening. I learned that:
- MCP uses JSON-RPC 2.0 as its core message format
- In the Node/TypeScript implementations I was studying, that JSON-RPC traffic is carried over HTTP with a streamable transport (SSE for server-to-client notifications)
- Tool registration in that ecosystem happens through the `@modelcontextprotocol/sdk` package
- There's a bunch of message routing and session management happening under the hood

But here's where it got interesting - mcp-handler was using what I'll call a "fake message" approach for certain transport scenarios. The implementation was clever, but it felt like a workaround rather than a solution. I didn't want to ship that.

## The TanStack Start Difference

TanStack Start uses `createFileRoute` for API routes with a specific handler signature:

```typescript
export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Your handler here - receives Web Standard Request
        // Must return Web Standard Response
      },
    },
  },
})
```

This is fundamentally different from Next.js's route handlers. TanStack Start gives you raw Web Standard `Request` and expects Web Standard `Response` objects. No fancy wrappers, no edge runtime specific APIs. Just standards.

This was actually a blessing in disguise. It meant I could build a transport layer using pure Web APIs. By sticking to Web Standard `Request`/`Response` primitives, it becomes much easier to adapt the same transport to other runtimes and frameworks that expose those standards, instead of rewriting everything for each platform.

## Building the WebStandardTransport

The MCP SDK expects you to implement a `Transport` interface. The existing implementations either use Node.js `http` module primitives or framework-specific adapters. I needed something different.

I built `WebStandardTransport` from scratch. Here's the core idea:

```typescript
export class WebStandardTransport implements Transport {
  async handleRequest(request: Request, options?: McpRequestOptions): Promise<Response> {
    if (request.method === "GET") {
      return this.handleGetRequest(request);  // SSE stream
    }
    if (request.method === "POST") {
      return this.handlePostRequest(request); // JSON-RPC messages
    }
    return new Response("Method not allowed", { status: 405 });
  }
}
```

Simple, right? Famous last words.

### The Batch Request Problem

JSON-RPC 2.0 allows batch requests - you can send multiple messages in a single HTTP request. Sounds straightforward until you realize that responses can arrive in any order, and you need to collect them all before responding to the client.

My first implementation was... broken. Spectacularly broken.

```typescript
// What I initially wrote (DON'T DO THIS)
for (const req of requests) {
  const pending = {
    id: req.id,
    resolve,  // Same resolve function for ALL requests!
    responses: [],
  };
  this._pendingRequests.set(req.id, pending);
}
```

See the problem? Every pending request shared the same `resolve` function. When the first response came back, it resolved the Promise and returned. The other responses? Lost forever.

Claude Code actually wrote this initial implementation. It looked reasonable, it compiled, it even worked for single requests. But batch requests were silently corrupted. This is exactly the kind of thing AI can miss - the code is syntactically correct but semantically wrong.

After catching this during testing, I rewrote the batch handling to track requests by batch ID:

```typescript
// The fixed version
interface PendingBatch {
  requestIds: Set<string | number>;
  resolve: (response: Response) => void;
  responses: Map<string | number, JSONRPCMessage>;
  expectedCount: number;
  timeoutId: ReturnType<typeof setTimeout>;
  resolved: boolean;
}
```

Now each batch gets its own tracking structure, responses accumulate properly, and the Promise only resolves when ALL responses are collected.

### The Race Condition Saga

Another fun one - server initialization. The MCP server needs to be "connected" to the transport before handling requests. My first pass:

```typescript
// Classic check-then-act bug
if (!isConnected) {
  await server.connect(transport);
  isConnected = true;
}
```

Can you spot it? Two concurrent requests could both pass the `!isConnected` check before either sets `isConnected = true`. Double connection, undefined behavior, sad times.

Fixed with a Promise-based lock:

```typescript
let connectionPromise: Promise<void> | null = null;

// Now concurrent requests share the same connection promise
if (!connectionPromise) {
  connectionPromise = server.connect(transport);
}
await connectionPromise;
```

## The Authentication Story

I wanted authentication to actually work. Not just exist in the code, but actually flow through to tool execution. Here's what the API looks like:

```typescript
import { withMcpAuth } from 'mcp-start'

const authenticatedHandler = withMcpAuth(
  async (request, auth) => {
    // auth is available here
    return mcp.handleRequest(request, { auth })
  },
  async (request) => {
    const token = extractToken(request);
    if (!token) return null;
    const claims = await verifyJWT(token);
    return { token, claims };
  }
)
```

And in your tools:

```typescript
const userTool = defineTool({
  name: 'get_user_data',
  description: 'Get authenticated user data',
  parameters: z.object({}),
  execute: async (params, context) => {
    // context.auth contains the auth info passed from withMcpAuth
    const userId = context.auth?.claims?.sub;
    if (!userId) {
      return 'Not authenticated';
    }
    return JSON.stringify(await fetchUser(userId));
  },
})
```

The auth flows from middleware -> server -> transport -> tool execution. The MCP SDK doesn't prescribe a built-in auth pattern, so I had to design how that auth context gets threaded from the HTTP layer all the way down into the tool execution environment.

## Getting Started

If you want to try it out, here's the quick setup:

```bash
npm install mcp-start @modelcontextprotocol/sdk zod
```

`mcp-start` is published on npm as [`mcp-start`](https://www.npmjs.com/package/mcp-start), so you can add it to any compatible TypeScript/JavaScript project just like any other package.

Define a tool:

```typescript
// src/mcp/tools/weather.ts
import { defineTool } from 'mcp-start'
import { z } from 'zod'

export const weatherTool = defineTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: z.object({
    city: z.string().describe('City name'),
  }),
  execute: async ({ city }) => {
    // Your logic here
    return `Weather in ${city}: Sunny, 72°F`
  },
})
```

Create the server:

```typescript
// src/mcp/index.ts
import { createMcpServer } from 'mcp-start'
import { weatherTool } from './tools/weather'

export const mcp = createMcpServer({
  name: 'my-app',
  version: '1.0.0',
  tools: [weatherTool],
})
```

Wire up the route:

```typescript
// src/routes/api/mcp.ts
import { createFileRoute } from '@tanstack/react-router'
import { mcp } from '../../mcp'

export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      POST: async ({ request }) => mcp.handleRequest(request),
      GET: async ({ request }) => mcp.handleRequest(request),
    },
  },
})
```

That's it. Your MCP server is live at `/api/mcp`.

## What's Missing (Honest Assessment)

This is v0.1.0. It works, but there's plenty of room for improvement:

**Current gaps:**
- No automatic tool discovery from file system
- Limited resources/prompts support (tools only right now)
- No built-in rate limiting
- CORS needs to be handled by the user
- The Zod schema conversion uses internal Zod APIs (fragile)

**On the roadmap:**
- Better auth patterns (OAuth flows, API keys)
- Automatic tool registration from directories
- Resources and prompts support
- Built-in instrumentation for observability
- Connection pooling for stateful mode

## The Meta Moment

Using Claude Code to build MCP tooling has a certain irony to it. The thing I'm building enables AI to call tools, and I'm using AI to help build it.

But here's what I've learned through this process - AI doesn't replace judgment. It accelerates implementation once you know what you're building. The race conditions, the batch handling bugs, the auth flow design - those required human understanding of what should happen. AI helped me write the code faster, but I still had to catch when it was wrong.

If you're building with TanStack Start and want MCP support, give [mcp-start](https://github.com/codyde/mcp-start) a spin. And if you find bugs (you will), PRs are welcome.

Let's keep building.

---

*This project was inspired by [Vercel's mcp-handler](https://github.com/vercel/mcp-handler). If you're in the Next.js ecosystem, definitely check that out instead.*
