---
title: "Building MCP TanStack Start: Bringing Model Context Protocol to TanStack Start"
date: '2025-11-29'
slug: building-mcp-start-tanstack
cover_image: https://placeholder-for-cover-image.com/mcp-start.png
description: "I wanted MCP servers in TanStack Start, so I built one. Here's how Claude Code helped me build mcp-tanstack-start."
---

I've been going deep on [TanStack Start](https://tanstack.com/start) lately. It's been my framework of choice for new projects - it's REALLY fast, the client-side first/server-side "opt-in" model, server functions, and overall DX just clicks for me. Plus, how can you not root for everything Tanner does?

I've also been tooling around A LOT with MCP (Model Context Protocol), and have really enjoyed using [Vercel's mcp-handler](https://github.com/vercel/mcp-handler), but didn't have something similar I could just `npm install` for TanStack Start. There are a few example repos floating around, but nothing drop-in. Big sads. 

TanStack Start is very different architecturally from Next.js. Different route handlers, different server context, client/server is approached differently - in fact it's just "different everything" except React. 

MCP's shape on the other hand, stays pretty consistent, so I thought I'd try an experiment - what if we looked at the way mcp-handler was built, and used that as a model for TanStack Start and then made adjustments to adopt more of the "TanStack style" of things? 

So alongside my good buddy and faithful intern Claude, I built [mcp-tanstack-start](https://github.com/codyde/mcp-tanstack-start). 

You can get started using it in TanStack Start apps by installing it from [npm](https://www.npmjs.com/package/mcp-tanstack-start)...

```bash
npm install mcp-tanstack-start @modelcontextprotocol/sdk zod
```

From there, you can set up a complete MCP endpoint in a single file. Define your tools, create the server, and expose it through TanStack Start's API routes:

```typescript
// routes/api/mcp.ts (or app/routes/api/mcp.ts)
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

// Wire up the route handlers for GET (SSE) and POST (JSON-RPC)
export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => mcp.handleRequest(request),
      POST: async ({ request }) => mcp.handleRequest(request),
    },
  },
});
```

MCP uses both POST (for JSON-RPC requests) and GET (for SSE streams), so we define handlers for both methods. The same `handleRequest` method works for either - it inspects the request method internally and routes appropriately.

### Why `createFileRoute` vs `createAPIFileRoute`?

If you've poked around TanStack Start before, you might have seen `createAPIFileRoute` from `@tanstack/react-start/api`. It exists! It works! So why am I using `createFileRoute` with `server.handlers` instead?

Here's the deal: TanStack Start actually has two patterns for API routes, and they serve different purposes.

**`createAPIFileRoute`** is the simpler, standalone pattern:

```typescript
import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/something')({
  GET: async ({ request }) => { ... },
  POST: async ({ request }) => { ... },
});
```

This approach is great for simple endpoints. But routes defined this way don't get registered in TanStack's router system. They're essentially escape hatches for when you just need a quick HTTP endpoint without the full router integration.

**`createFileRoute` with `server.handlers`** is the unified, router-integrated pattern:

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      GET: async ({ request }) => { ... },
      POST: async ({ request }) => { ... },
    },
  },
});
```

This approach registers your route in the router tree and plays nicely with TanStack Start's middleware system. It's the more "TanStack-native" way of doing things.

For MCP specifically, I went with `createFileRoute` because:
1. It integrates with the router's middleware pipeline
2. It feels more aligned with how TanStack Start wants you to structure things
3. You get full control over each HTTP method's handling

Ok, back to MCP things...

## Beta thing is beta warning

Word of caution here, it's very much "beta" level software. I added some basic authentication functionality. It's stateless only for now, so no session support yet (I'm going to build this in). I want to add some clever auto-discovery of tools based on directory.

That said, it works, and it should be pretty easy to get started using!

Let's talk about how we got there...

## Reverse engineering mcp-handler for TanStack Start

The research parts of building with AI are by far the most underrated. Everyone gets hyped about "go build the thing" with AI... but my mind is consistently the most blown when I have AI dig into something complex and break it down for me. For my own personal learning style, that's what works best - and the context from that becomes really useful for building net new things, or extending other things (SDKs are a great example here).

I tend to start a lot of projects out this way these days. I like to have AI (either Claude Code or Cursor) look at a reference implementation, and pull out the details of how it's built out, the architecture, and the expected user workflow - and then in the same context window, ask it to do an analysis of what implementing it would look like in a new framework.

Vercel’s mcp-handler leans into Node’s HTTP primitives under the hood – `IncomingMessage`, `ServerResponse`, raw streams. Even though Next.js route handlers expose something that looks like Web `Request`/`Response`, the adapter still converts them back into Node objects so it can plug into the SDK’s server transport. 

TanStack Start, on the other hand, is happily Web‑native: your handlers get a real `Request` and must return a `Response`. That made it feel natural to build a Web‑standards transport instead of faking Node types.

This isn't a flaw in either approach; it's a design philosophy difference. The `@modelcontextprotocol/sdk` provides transports optimized for Node.js environments. Building for TanStack Start meant either mocking out that same flow and piping our responses into it, or implementing the same MCP Streamable HTTP specification, but using the primitives that framework expects natively.

This mcp-handler example is a simplified sketch of that adapter pattern, not a direct copy of their source:

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
    if (request.method === 'GET') {
      // Create an SSE-style Response whose body is fed from MCP notifications
      return this.createSseStream();
    }

    if (request.method === 'POST') {
      const json = await request.json();
      // Push the incoming JSON-RPC message into the MCP server
      this.onmessage?.(json);
      // wait until all responses for this batch are collected…
      const responseBody = await this.awaitBatchResponse(json);
      return new Response(JSON.stringify(responseBody), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
```

The real `WebStandardTransport` in the repo handles batching, timeouts, and SSE streaming – this example just sketches the shape.

MCP-handler's approach is clever and it works - but for TanStack Start, I wanted something that felt native to the framework. No fake objects, no adapters, just Web Standards.

The deeper I dug, the more I realized the MCP side is pretty straightforward: JSON‑RPC 2.0 messages over either stdio or HTTP. In practice that means using the newer Streamable HTTP transport from the spec – POSTs carrying JSON‑RPC requests, plus an HTTP response stream (often SSE-flavored) for server‑to-client messages.

The TypeScript SDK wraps that in a small transport abstraction (send messages + receive callbacks), which made it pretty reasonable to write a Web‑standards‑only implementation without forking the SDK.

## The TanStack Start Difference

TanStack Start uses file-based routes for both pages and HTTP handlers. For MCP, I lean on API routes with a specific handler signature:

```typescript
// routes/api/mcp.ts
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      // ALL handles any HTTP method - perfect for MCP which uses GET and POST
      ALL: async ({ request }) => {
        // Your handler here - receives Web Standard Request
        // Must return Web Standard Response
      },
    },
  },
});
```

For this project, the important difference from Next.js's route handlers wired through `mcp-handler` is that TanStack Start hands you a Web Standard Request and expects a Web Standard Response back, while `mcp-handler` adapts those into Node `IncomingMessage` / `ServerResponse` under the hood. No extra framework-specific HTTP wrapper objects on the Start side — just standards.

This was actually a blessing in disguise. It meant I could build a transport layer using pure Web APIs. By sticking to Web Standard `Request`/`Response` primitives, the same code works everywhere those standards are supported - Node.js, Deno, Bun, Cloudflare Workers, Vercel Edge. Instead of rewriting for each platform, you get portability for free.

The MCP SDK may end up implementing this transport functionality by default in future updates, which could make parts of this obsolete... but for now, I like it. Ship it.

## Building the WebStandardTransport

The MCP SDK expects you to implement a `Transport` interface. The existing implementations either use Node.js `http` module primitives or framework-specific adapters.

I opted to go with building a `WebStandardTransport` from scratch instead of taking the same "mock messages" approach. Here's the core idea:

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

It worked out fairly straightforward, but in practice, the implementation introduced some complications.

### The Batch Request Problem

JSON‑RPC explicitly says batch responses can come back in any order, and the client must match them up by `id`, not by array index. My first pass pretended everything was single‑request and just reused one resolve for the whole batch; that meant whichever response arrived first “won” and the rest never got surfaced.

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

This was an area where Claude Code stumbled in how it actually wrote the initial implementation. It looked reasonable at first glance, compiled, and the first few times worked for single requests. But larger batch requests failed in weird ways, often silently. This is exactly the kind of thing AI can miss - the code is syntactically correct but semantically wrong.

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

There might be a better way to do this; this just worked for now!

### The Race Condition Saga

Another fun one - server initialization. The MCP server needs to be "connected" to the transport before handling requests. My first pass:

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

## The Authentication Story

Full disclosure - authentication is minimally implemented at this point. But I wanted *something* that worked, even if it's basic. MCP servers that expose tools to AI clients probably shouldn't be wide open to the world, right?

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
      ALL: async ({ request }) => authenticatedHandler(request),
    },
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

This isn’t a full implementation of the MCP Authorization spec (OAuth discovery docs, .well-known endpoints, scope negotiation, etc.) – it’s a simple “pass a verified JWT down to your tools” layer. If you need full-blown OAuth flows, look at how Vercel’s `withMcpAuth` or Better Auth’s MCP plugin wire into the spec and then port the parts you need.

## What's Missing (Honest Assessment)

This is v0.2.0. It works, but there's plenty of room for improvement:

**Current gaps:**
- Right now mcp-tanstack-start implements the stateless variant of Streamable HTTP – no `Mcp-Session-Id`, no per-client state. The spec has a full story for stateful sessions and resumability over Streamable HTTP; that’s on my roadmap once I’m happy with the basic ergonomics.
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

## It's All So Meta...

Using Claude Code to build MCP tooling has a certain irony to it. The thing I'm building enables AI to call tools, and I'm using AI to help build it. 🤯

A few things I’m taking away from this experiment:

**I started this as a “let’s just see what happens” experiment, and it got further than I expected.** I had zero clue how well this was going to work when I started. "Let's just see what happens" is an underrated project philosophy; sometimes the experiment actually ships.

**AI got me 80% of the way, but the last 20% was squinting at batch responses, race conditions, and API ergonomics – the boring human stuff.** Everything compiled right on the first try. It just didn't *do* anything useful (or really, even work). The batch request bug? Syntactically perfect, semantically broken. The race condition? Looked reasonable until you thought about concurrency. There was a lot of "in the loop" iteration to get things working right.

**And finally, there’s taste. Claude doesn’t care if we use Node adapters or Web standards. I do. That’s the fun part.** There were certain ergonomics I wanted to hit - like building a native Web Standard transport instead of using adapters. The adapter approach works great (mcp-handler does it really well!), but I wanted a different feel for this library. That's a human decision about what you want the code to *be*, not just what you want it to *do*.

If you're building with TanStack Start and want MCP support, give [mcp-tanstack-start](https://github.com/codyde/mcp-tanstack-start) a spin. And if you find bugs (you will), PRs are welcome.

Let's keep building. Everyone can cook.

---

*This project was inspired by [Vercel's mcp-handler](https://github.com/vercel/mcp-handler). If you're in the Next.js ecosystem, definitely check that out instead.*