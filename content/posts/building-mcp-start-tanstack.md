---
title: "Building MCP TanStack Start: Bringing Model Context Protocol to TanStack Start"
date: '2025-11-29'
slug: building-mcp-start-tanstack
cover_image: https://placeholder-for-cover-image.com/mcp-start.png
description: "I wanted MCP servers in TanStack Start, and I really like the DX of `mcp-handler`, so... I built one. Here's how Claude Code helped me build mcp-tanstack-start."
---

I've been really enjoying the developments coming out of [TanStack Start](https://tanstack.com/start) lately. It's become my goto framework of choice for new projects. It's REALLY fast, I really like the client-side first/server-side "opt-in" model, server functions feel a lot cleaner to me than RSCs (not trying to start a war...). Overall DX just clicks for me. 

Plus, how can you not root for everything Tanner does?

I've also been tooling around A LOT with MCP (Model Context Protocol). I really like [Vercel's mcp-handler](https://github.com/vercel/mcp-handler), and wanted a similar experience in TanStack Start. There are a few example repos floating around for MCP, but nothing that matched a similar "feel". Big sads. 

So I thought I'd try an experiment - what if we looked at the way `mcp-handler` was built, used that as a model for building one in TanStack Start, and made quality of life adjustments along the way to adopt more of the "TanStack style" of things? 

So alongside my good buddy and faithful intern Claude, I was able to put together [mcp-tanstack-start](https://github.com/codyde/mcp-tanstack-start). 

You can get started using it in TanStack Start apps by installing it from [npm](https://www.npmjs.com/package/mcp-tanstack-start)...

```bash
npm install mcp-tanstack-start @modelcontextprotocol/sdk zod
```

From there, you can set up a complete MCP endpoint in a single file. Define your tools, create the server, and expose it through TanStack Start's API routes. The server runs in stateless mode by default, which means it works out of the box on serverless, edge, and container deployments:

```typescript
// routes/api/mcp.ts
import { createFileRoute } from "@tanstack/react-router";
import { createMcpServer, defineTool } from "mcp-tanstack-start";
import { z } from "zod";

// Define a simple tool
const echoTool = defineTool({
  name: "echo",
  description: "Echo back a message",
  parameters: z.object({
    message: z.string().describe("The message to echo back"),
  }),
  execute: async ({ message }) => {
    return `You said: ${message}`;
  },
});

// Create the MCP server
const mcp = createMcpServer({
  name: "my-app",
  version: "1.0.0",
  tools: [echoTool],
});

// Wire up all HTTP methods with a single handler
export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      all: async ({ request }) => mcp.handleRequest(request),
    } as Record<string, (ctx: { request: Request }) => Promise<Response>>,
  },
});
```

The 2025-06-18 MCP spec uses three HTTP methods - POST for JSON-RPC requests, GET for SSE streams, and DELETE for session termination. The `all` handler catches them all, and `handleRequest` inspects the method internally to route appropriately.

> **Note on the type assertion:** There's a case-sensitivity quirk in TanStack Start's handler lookup that requires using lowercase `all` instead of uppercase `ALL`. The TypeScript types expect uppercase, so we add a type assertion. More on this in the "Bug Hunting" section below.

## Reverse Engineering mcp-handler for TanStack Start

The research parts of building with AI are by far the most underrated. Everyone gets hyped about "go build the thing" with AI... but my mind is consistently the most blown when I have AI dig into something complex and break it down for me. For my own personal learning style, that's what works best - and the context from that becomes really useful for building net new things, or extending other things (SDKs are a great example here).

I tend to start a lot of projects out this way these days. I like to have AI (either Claude Code or Cursor) look at a reference implementation, and pull out the details of how it's built out, the architecture, and the expected user workflow - and then in the same context window, ask it to do an analysis of what implementing it would look like in a new framework.

Vercel's `mcp-handler` leans into Node's HTTP primitives under the hood – `IncomingMessage`, `ServerResponse`, raw streams. Even though Next.js route handlers expose something that looks like Web `Request`/`Response`, the adapter still converts them back into Node objects so it can plug into the SDK's server transport. 

TanStack Start, on the other hand, is happily Web‑native: your handlers get a real `Request` and must return a `Response`. That made it feel natural to build a Web‑standards transport instead of faking Node types.

This isn't a flaw in either approach; it's a design philosophy difference. The `@modelcontextprotocol/sdk` provides transports optimized for Node.js environments. Building for TanStack Start meant either mocking out that same flow and piping our responses into it, or implementing the same MCP Streamable HTTP specification, but using the primitives that framework expects natively.

This `mcp-handler` example is a simplified sketch of that adapter pattern, not a direct copy of their source:

```typescript
// Inside mcp-handler, Web Requests get converted to fake Node.js objects
function createFakeIncomingMessage(options) {
  const readable = new Readable();
  readable._read = () => {};

  if (body) {
    readable.push(JSON.stringify(body));
    readable.push(null);
  }

  const req = new IncomingMessage(new Socket());
  req.method = method;
  req.url = url;
  req.headers = headers;
  req.push = readable.push.bind(readable);

  return req;
}

// Then passed to the SDK's transport
await statelessTransport.handleRequest(fakeIncomingMessage, fakeServerResponse);
```

**mcp-tanstack-start (Web Standard APIs directly):**

```typescript
class WebStandardTransport implements Transport {
  async handleRequest(request: Request): Promise<Response> {
    // Validate Origin header (DNS rebinding protection)
    if (!this.validateOrigin(request)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'GET') {
      // Create SSE stream with event IDs for resumability
      return this.handleGetRequest(request);
    }

    if (request.method === 'POST') {
      // Single JSON-RPC message (no batches per 2025-06-18 spec)
      return this.handlePostRequest(request);
    }

    if (request.method === 'DELETE') {
      // Session termination
      return this.handleDeleteRequest(request);
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
```

The real `WebStandardTransport` handles session management, SSE event IDs for resumability, origin validation, and protocol version negotiation – this example just sketches the shape.

`MCP-handler`'s approach is clever and it works - but for TanStack Start, I wanted something that felt native to the framework. No fake objects, no adapters, just Web Standards.

At the end of the day, the MCP side is pretty straightforward: JSON‑RPC 2.0 messages over either stdio or HTTP. In practice that means using the Streamable HTTP transport from the spec – POSTs carrying JSON‑RPC requests, plus an HTTP response stream (often SSE-flavored) for server‑to-client messages.

The TypeScript SDK wraps that in a small transport abstraction (send messages + receive callbacks), which made it pretty reasonable to write a Web‑standards‑only implementation.

## The TanStack Start Difference

TanStack Start uses file-based routes for both pages and HTTP handlers. For MCP, I lean on API routes with a simple handler signature:

```typescript
// routes/api/mcp.ts
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      all: async ({ request }) => mcp.handleRequest(request),
    } as Record<string, (ctx: { request: Request }) => Promise<Response>>,
  },
});
```

For this project, the important difference from Next.js's route handlers wired through `mcp-handler` is that TanStack Start hands you a Web Standard Request and expects a Web Standard Response back, while `mcp-handler` adapts those into Node `IncomingMessage` / `ServerResponse` under the hood. 

This ended up working out really well, because it meant I could build a transport layer using pure Web APIs. By sticking to Web Standard `Request`/`Response` primitives, the same code should work everywhere those standards are supported - Node.js, Deno, Bun, Cloudflare Workers, Vercel Edge. Instead of rewriting for each platform, you get portability for free.

Who knows, the MCP SDK may end up implementing this transport functionality by default in future updates, which could make parts of this obsolete... but for now, I like it. Ship it.

## Bug Hunting: "Uh... why are my API routes loading HTML?"

While building this, I ran into a fun bug that had me scratching my head. When I tried using `ALL` (uppercase) as my handler key, the route would return HTML instead of my API response. But when I switched to explicit `GET`, `POST`, `DELETE` handlers, everything worked fine. A great example of a "bug" that doesn't throw an error.

Time to dig into TanStack Start's internals.

After spelunking through `node_modules/@tanstack/start-server-core/src/createStartHandler.ts`, I found the culprit. Here's the handler lookup logic:

```typescript
// First, try to find a handler matching the exact request method
let method = Object.keys(handlers).find(
  (method) => method.toLowerCase() === requestMethod,
)

// If no method is found, attempt to find the 'all' method
if (!method) {
  method = Object.keys(handlers).find(
    (method) => method.toLowerCase() === 'all',
  )
    ? 'all'  // <-- Bug: returns literal 'all', not the actual key
    : undefined
}

// Then later...
const handler = handlers[method as RouteMethod]
```

When looking for specific methods like GET or POST, the code returns the *actual key* from your handlers object. But for the ALL fallback, it returns the literal string `'all'` (lowercase) regardless of what key you used.

So if your handlers object has `{ ALL: ... }` (uppercase), then `handlers['all']` returns `undefined` because JavaScript object keys are case-sensitive. No handler gets added to the middleware chain, and you fall through to the default SSR rendering – which returns HTML.

The fix is simple: use lowercase `all`:

```typescript
export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      all: async ({ request }) => mcp.handleRequest(request),
    } as Record<string, (ctx: { request: Request }) => Promise<Response>>,
  },
});
```

The type assertion is needed because TypeScript's `RouteMethod` type only allows uppercase `'ALL'`, but the runtime expects lowercase. Classic types-vs-runtime mismatch.

If you want to be explicit about each method (and avoid the type assertion), you can still do:

```typescript
export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => mcp.handleRequest(request),
      POST: async ({ request }) => mcp.handleRequest(request),
      DELETE: async ({ request }) => mcp.handleRequest(request),
    },
  },
});
```

Both approaches work. I prefer the `all` version for its simplicity, but the explicit version is more self-documenting about which methods your API supports.

## Building the WebStandardTransport

The MCP SDK expects you to implement a `Transport` interface. The existing implementations either use Node.js `http` module primitives or framework-specific adapters.

I opted to go with building a `WebStandardTransport` from scratch instead of taking the same "mock messages" approach. Here's the core idea:

```typescript
export class WebStandardTransport implements Transport {
  async handleRequest(request: Request, options?: McpRequestOptions): Promise<Response> {
    // Security: Validate Origin header
    if (!this.validateOrigin(request)) {
      return new Response('Forbidden: Origin not allowed', { status: 403 });
    }

    if (request.method === "GET") {
      return this.handleGetRequest(request);  // SSE stream with event IDs
    }
    if (request.method === "POST") {
      return this.handlePostRequest(request); // Single JSON-RPC message
    }
    if (request.method === "DELETE") {
      return this.handleDeleteRequest(request); // Session termination
    }
    return new Response("Method not allowed", { status: 405 });
  }
}
```

It worked out fairly straightforward, but in practice, the implementation introduced some complications.

### The Joy of Race Conditions

One fun one - server initialization. The MCP server needs to be "connected" to the transport before handling requests. My first pass:

```typescript
// Classic check-then-act bug
if (!isConnected) {
  await server.connect(transport);
  isConnected = true;
}
```

Two concurrent requests could both pass the `!isConnected` check before either sets `isConnected = true`. Double connection, undefined behavior, sad times.

Fixed with a Promise-based lock:

```typescript
let connectionPromise: Promise<void> | null = null;

// Now concurrent requests share the same connection promise
if (!connectionPromise) {
  connectionPromise = server.connect(transport);
}
await connectionPromise;
```

### Accept Header Validation

The 2025-06-18 spec is strict about this: clients MUST include an `Accept` header that lists BOTH `application/json` AND `text/event-stream`. Not one or the other - both. This ensures clients can handle either response format.

```typescript
const acceptsJson = this.acceptsMediaType(acceptHeader, "application/json");
const acceptsSse = this.acceptsMediaType(acceptHeader, "text/event-stream");

if (!acceptsJson || !acceptsSse) {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Not Acceptable: Client must accept both application/json and text/event-stream",
      },
      id: null,
    }),
    { status: 406 }
  );
}
```

This is one of those spec requirements that might trip up older clients, but it's there for good reason.

## Chasing 2025-06-18 Spec Compliance

One thing I'm genuinely proud of with this library - I focused a lot on the implementation aligning to the [latest MCP Streamable HTTP specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports). 

Here's what it gets us out of the box:

### Session Management (along with the struggles, and fixes)

Here's the thing about sessions: the 2025-06-18 spec has proper session handling with `Mcp-Session-Id` headers, timeouts, all that good stuff. And we implemented it... initially with in-memory storage.

Which worked great until I deployed to Railway and started getting `"Session does not exist or has expired"` errors after a few minutes. 🤦

The problem? In-memory sessions are fundamentally incompatible with how most of us actually deploy things:
- **Serverless** (Vercel, Netlify, Lambda): No persistent memory between invocations
- **Containers** (Railway, Fly.io): Can restart, scale horizontally at any moment
- **Edge** (Cloudflare Workers, Deno Deploy): Distributed with no shared state

So we rethought the whole thing. The transport now defaults to **stateless mode** - each request is handled independently, and if a session isn't found, we handle it gracefully instead of throwing a 404. Your Railway deployment won't explode when the container restarts. Your Vercel function won't cry about missing sessions.

```typescript
// Stateless by default - just works everywhere
const mcp = createMcpServer({
  name: "my-app",
  version: "1.0.0",
  tools: [echoTool],
});
```

Need SSE push notifications? Opt into stateful mode:

```typescript
// Stateful mode for SSE push notifications
const mcp = createMcpServer({
  name: "my-app",
  version: "1.0.0",
  tools: [echoTool],
  transport: {
    stateful: true,
    sessionTimeout: 3600000, // 1 hour
  },
});
```

And if you're running multiple instances but still need stateful sessions, bring your own storage:

```typescript
// Distributed stateful mode with Redis
const mcp = createMcpServer({
  name: "my-app", 
  version: "1.0.0",
  tools: [echoTool],
  transport: {
    stateful: true,
    sessionStore: {
      get: (id) => redis.get(`mcp:${id}`).then(JSON.parse),
      set: (id, session, ttlMs) => redis.set(`mcp:${id}`, JSON.stringify(session), 'PX', ttlMs),
      delete: (id) => redis.del(`mcp:${id}`),
    },
  },
});
```

This was inspired by how [mcp-handler](https://github.com/vercel/mcp-handler) approaches pluggable storage, but adapted for the deployment reality most of us live in. Simple things should just work. Advanced features can be opt-in.

### SSE Resumability

Ever had a long-running AI interaction get interrupted by a flaky network connection? The spec now supports SSE event IDs and the `Last-Event-ID` header for resuming streams. If a client disconnects and reconnects, it can pick up where it left off instead of losing messages.

We implemented this with per-stream event ID counters and a message history buffer. When a client reconnects with `Last-Event-ID`, we replay any messages they missed. It's the kind of thing you don't think about until your connection drops mid-response. 

### Origin Validation (DNS Rebinding Protection)

This one's a security requirement from the spec, and it's important. The spec explicitly warns:

> "Servers **MUST** validate the `Origin` header on all incoming connections to prevent DNS rebinding attacks"

DNS rebinding is a nasty attack where a malicious website can trick your browser into making requests to localhost services. If your MCP server is running locally and doesn't validate origins, bad actors could potentially call your tools from their websites.

By default, mcp-tanstack-start only accepts requests from localhost origins. For production, you configure your allowed origins:

```typescript
const mcp = createMcpServer({
  name: "my-app",
  version: "1.0.0",
  tools: [echoTool],
  transport: {
    allowedOrigins: [
      'https://my-app.com',
      'https://api.my-app.com',
    ],
  },
});
```

### Multiple SSE Streams Per Session

The spec allows clients to maintain multiple SSE connections simultaneously. We support this - each session can have multiple active streams, and the server ensures messages are sent on exactly one stream (no duplicate broadcasts). This is useful for more complex client architectures.

### Protocol Version Handling

The spec requires servers to handle the `MCP-Protocol-Version` header, with a fallback to `2025-03-26` if it's missing. We support versions `2024-11-05`, `2025-03-26`, and `2025-06-18`, so older clients still work.

## The Authentication Story

Full disclosure - authentication is minimally implemented at this point. But I wanted *something* that worked, even if it's basic. 

The MCP spec has an OAuth-style authorization framework now, but the TypeScript SDK doesn't prescribe a built-in auth implementation for you. So I designed a simple middleware approach that threads auth context from the HTTP layer all the way down into tool execution.

Here's the wrapper:

```typescript
// routes/api/mcp.ts
import { createFileRoute } from '@tanstack/react-router';
import { withMcpAuth } from 'mcp-tanstack-start';

const authenticatedHandler = withMcpAuth(
  // Your handler - receives the auth object
  async (request, auth) => {
    return mcp.handleRequest(request, { auth });
  },
  // Your token verification function
  async (request) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    try {
      const claims = await verifyJWT(token);
      return { token, claims };
    } catch {
      return null;
    }
  }
);

export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      all: async ({ request }) => authenticatedHandler(request),
    } as Record<string, (ctx: { request: Request }) => Promise<Response>>,
  },
});
```

And then in your tools, you can access the auth context:

```typescript
const userTool = defineTool({
  name: 'get_user_data',
  description: 'Get authenticated user data',
  parameters: z.object({}),
  execute: async (params, context) => {
    // context.auth contains the auth info passed from withMcpAuth
    const userId = context.auth?.claims?.sub;
    if (!userId) {
      return {
        content: [{ type: 'text', text: 'Not authenticated' }],
        isError: true,
      };
    }
    return JSON.stringify(await fetchUser(userId));
  },
});
```

The flow is: HTTP request → `withMcpAuth` middleware → `handleRequest` → transport → tool execution. The auth object travels the whole way down.

This isn't a full implementation of the MCP Authorization spec (OAuth discovery docs, .well-known endpoints, scope negotiation, etc.) – it's a simple "pass a verified JWT down to your tools" layer. If you need full-blown OAuth flows, look at how Vercel's `withMcpAuth` or Better Auth's MCP plugin wire into the spec and then port the parts you need.

## Transport Configuration

You can configure the transport behavior when creating the server:

```typescript
const mcp = createMcpServer({
  name: "my-app",
  version: "1.0.0",
  tools: [echoTool],
  transport: {
    // Session mode (stateless by default)
    stateful: true, // Enable for SSE push notifications
    
    // Security: which origins can connect
    allowedOrigins: ['https://my-app.com'],
    
    // Session management (stateful mode only)
    sessionTimeout: 3600000, // 1 hour (default)
    requestTimeout: 60000,   // 60 seconds (default: 30 sec)
    
    // Response format
    enableJsonResponse: false, // Use SSE (default)
    
    // Resumability (stateful mode only)
    enableResumability: true, // SSE event IDs (default: true)
  },
});
```

| Option | Default | What it does |
|--------|---------|--------------|
| `stateful` | `false` | Enable persistent sessions for SSE push notifications |
| `sessionStore` | In-memory | Pluggable storage for distributed stateful deployments |
| `allowedOrigins` | localhost only | Origins allowed to connect (DNS rebinding protection) |
| `sessionTimeout` | 1 hour | How long before inactive sessions are cleaned up (stateful mode only) |
| `requestTimeout` | 30 seconds | Timeout for individual requests |
| `enableJsonResponse` | `false` | Return JSON instead of SSE for POST responses |
| `enableResumability` | `true` | Include SSE event IDs for client reconnection (stateful mode only) |

## What's Missing (Honest Assessment)

It works, and it's spec-compliant, but there's still room for improvement:

**Solved since initial release:**
- ✅ Session management that works on serverless/edge/containers (stateless mode is now the default)
- ✅ Pluggable session storage for distributed stateful deployments

**Current gaps:**
- No automatic tool discovery from file system
- Limited resources/prompts support (tools only right now)
- No built-in rate limiting
- The Zod schema conversion uses internal Zod APIs (fragile)

**On the roadmap:**
- Better auth patterns (OAuth flows, API keys)
- Automatic tool registration from directories
- Resources and prompts support
- Built-in instrumentation for observability

## Eating My Own Cooking

You know I had to actually use this thing, right? This very blog is running an MCP server using `mcp-tanstack-start`. It exposes a few tools - you can search posts, get full post content by slug, and a little echo tool for testing connectivity. Nothing fancy, but it's real.

If you want to kick the tires yourself, you can add it to your MCP client config. Here's what that looks like in Cursor:

```json
{
  "mcpServers": {
    "codyde": {
      "url": "https://codyde.io/api/mcp"
    }
  }
}
```

That's it. No API keys, no auth (yet - it's a blog, not Fort Knox). Point your AI at it and ask it to search my posts or grab the content of a specific article. It's a fun way to see the library actually working in the wild, not just in a README example.

Fair warning - if you find bugs this way, I expect PRs, not just complaints. 😄

## Post-Launch Learnings: The Stateless Pivot

After shipping the initial version and deploying to Railway, I kept hitting session expiration errors. Containers restart. Serverless functions are ephemeral. Edge is distributed. The "proper" session management we implemented was actively fighting against how modern infrastructure works.

So we pivoted. Stateless is now the default. The transport gracefully handles missing sessions instead of throwing 404s. If you need persistent sessions for SSE push notifications, opt in. If you're running distributed and need sessions, bring your own Redis.


## It's All So Meta...

Using Claude Code to build MCP tooling has a certain irony to it. The thing I'm building enables AI to call tools, and I'm using AI to help build it. 🤯

A few things I'm taking away from this experiment:

**I started this as a "let's just see what happens" experiment, and it got further than I expected.** I had zero clue how well this was going to work when I started. "Let's just see what happens" is an underrated project philosophy; sometimes the experiment actually ships.

**Going all-in on spec compliance paid off.** We could have shipped something that "worked" without proper session management, origin validation, or resumability. But implementing the full 2025-06-18 spec means the library is production-ready out of the box. Security isn't bolted on later - it's baked in from the start.

**AI got me 80% of the way, but the last 20% was squinting at race conditions and API ergonomics – the boring human stuff.** Everything compiled right on the first try. It just didn't *do* anything useful (or really, even work). The race condition? Looked reasonable until you thought about concurrency. There was a lot of "in the loop" iteration to get things working right.

**And finally, there's taste. Claude doesn't care if we use Node adapters or Web standards. I do. That's the fun part.** There were certain ergonomics I wanted to hit - like building a native Web Standard transport instead of using adapters. The adapter approach works great (mcp-handler does it really well!), but I wanted a different feel for this library. That's a human decision about what you want the code to *be*, not just what you want it to *do*.

If you're building with TanStack Start and want MCP support, give [mcp-tanstack-start](https://github.com/codyde/mcp-tanstack-start) a spin. And if you find bugs (you will), PRs are welcome.

Let's keep building. Everyone can cook.

---

*This project was inspired by [Vercel's mcp-handler](https://github.com/vercel/mcp-handler). If you're in the Next.js ecosystem, definitely check that out instead.*
