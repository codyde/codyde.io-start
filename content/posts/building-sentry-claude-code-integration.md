---
title: "Extending Sentry's JavaScript SDK to support Claude Code (using...Claude Code)"
date: '2025-11-29'
slug: building-sentry-claude-code-integration
cover_image: https://placeholder-for-cover-image.com/sentry-claude-code.png
description: Turns out AI is pretty good at researching existing patterns, and you can extend SDKs pretty reasonably with it. I took Claude Code on a spin to see if I could integrate the Claude Code Agent SDK... and it did pretty ok!
---

I spend way too much time debugging AI agents.

There, I said it. When you're building applications that use AI agents to do real work - reading files, executing commands, making API calls - you need visibility into what's actually happening. Not just the final output, but the whole journey: which tools got called, how many tokens were used, where things went wrong.

I've been using [Claude Code](https://claude.ai/claude-code) for a while now (including to build this integration, which is meta enough to hurt my brain a little), and while it's incredibly powerful, I was flying blind when things didn't work as expected. Sentry already has great integrations for AI monitoring with the [Anthropic SDK](https://docs.sentry.io/platforms/javascript/guides/node/ai-monitoring/anthropic/) and the [Vercel AI SDK](https://docs.sentry.io/platforms/javascript/guides/node/ai-monitoring/vercel-ai-sdk/), but nothing for Claude Code's Agent SDK yet.

So I decided to build it. With Claude Code. Using Claude Code to instrument Claude Code. 🤯

But here's the thing - this post isn't really about that specific integration. It's about something I think more developers should be doing: **using AI to understand and extend existing open source projects**, not just to write greenfield code.

## AI as Your Research Partner

Most people I talk to use AI for code generation: "Write me a function that does X" or "Create a React component for Y". And that's great! AI is excellent at that.

But where AI really shines - and what I think is underutilized - is as a research assistant for navigating complex codebases. Instead of spending hours clicking through GitHub, reading docs, and trying to piece together patterns, you can have AI do the exploratory work.

For this project, I pointed Claude Code at Sentry's existing AI integrations and basically said: "Show me how these work. What patterns do they follow? How do they capture spans and metrics?"

Here's what one of those existing integrations looks like (simplified):

```typescript
// From Sentry's Anthropic integration
export const anthropicIntegration = defineIntegration((options = {}) => {
  return {
    name: 'Anthropic',
    setupOnce() {
      // Integration setup
    },
  };
});

// The integration captures:
// - LLM chat spans with token usage
// - Request/response messages
// - Model information
```

Claude Code dug through the codebase, pulled out the relevant parts, and explained the architecture to me. It found how Sentry uses OpenTelemetry semantic conventions for GenAI spans, how they handle PII concerns with `recordInputs` and `recordOutputs` flags, and how they structure the instrumentation code.

**This is the real power move**: Using AI not to write code from scratch, but to learn from existing implementations so you can build something that fits the existing patterns.

## The Technical Challenge: Agent SDK ≠ Chat API

Once I understood how Sentry's existing integrations worked, I hit the real challenge: Claude Code's Agent SDK is fundamentally different from typical AI SDKs.

Most AI interactions are simple request/response:
```
User: "What's the weather?"
AI: "It's sunny and 72°F"
```

But Claude Code agents have a complex lifecycle:

1. **Agent invocation**: Top-level session span
2. **Multiple LLM turns**: Each time Claude "thinks"
3. **Tool executions**: Reading files, running commands, searching the web
4. **Streaming responses**: Messages come in chunks

Each of these needed to be captured as proper OpenTelemetry spans following Sentry's semantic conventions. Here's what I needed to track:

```typescript
// What we needed to capture:
interface ClaudeCodeSpans {
  // Top level: Agent session
  invoke_agent: {
    name: 'invoke_agent claude-code',
    attributes: {
      'gen_ai.system': 'claude-code',
      'gen_ai.request.model': 'claude-sonnet-4-5',
      'gen_ai.operation.name': 'invoke_agent'
    }
  },

  // Each LLM interaction
  chat: {
    name: 'chat claude-sonnet-4-5',
    attributes: {
      'gen_ai.usage.input_tokens': 1234,
      'gen_ai.usage.output_tokens': 567,
      'gen_ai.response.finish_reasons': ['end_turn']
    }
  },

  // Each tool call
  execute_tool: {
    name: 'execute_tool Read',
    attributes: {
      'gen_ai.tool.name': 'Read',
      'gen_ai.tool.type': 'function'
    }
  }
}
```

I had Claude Code reference [Sentry's developer documentation](https://develop.sentry.dev/sdk/telemetry/traces/modules/ai-agents/) on GenAI spans to understand the exact attributes needed. This is where having AI that can read and synthesize documentation really pays off - instead of me reading through pages of specs, Claude Code extracted the relevant parts and applied them.

## The Human-in-the-Loop Dance

Here's where I need to be honest: **this wasn't fully autonomous**. Not even close.

Yes, Claude Code did a ton of the heavy lifting. But there were multiple moments where the AI got something "working" that I knew was wrong, or made assumptions that seemed reasonable but didn't fit the actual behavior of the Agent SDK.

A few examples where I had to step in:

**1. Tool Type Mapping**

Claude Code initially mapped all tools as `type: 'function'`. But OpenTelemetry has three tool types: `function`, `extension`, and `datastore`. I had to correct it:

```typescript
// AI's first attempt - too simple
function getToolType(toolName: string) {
  return 'function';
}

// After my correction - properly categorized
function getToolType(toolName: string) {
  const functionTools = new Set(['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep']);
  const extensionTools = new Set(['WebSearch', 'WebFetch']);
  const datastoreTools = new Set([]);

  if (functionTools.has(toolName)) return 'function';
  if (extensionTools.has(toolName)) return 'extension';
  if (datastoreTools.has(toolName)) return 'datastore';
  return 'function'; // Safe default
}
```

**2. Handling Async Generators**

The Claude Code Agent SDK returns an async generator that yields messages over time. The AI's first implementation didn't properly handle the streaming nature:

```typescript
// What the AI initially tried - didn't handle streaming properly
async function instrumentQuery(query) {
  const result = await query.run();
  captureSpan(result);
  return result;
}

// What we actually needed - wrap the generator
async function* instrumentQuery(query) {
  for await (const message of query) {
    // Process message, capture spans
    yield message;
  }
}
```

**3. Span Lifecycle Management**

Knowing when to end one span and start another required understanding the message flow of the Agent SDK. The AI initially created overlapping spans. I had to give explicit instructions about when to end the LLM span (when we see tool execution start) and when to start a new one (when tools complete).

This back-and-forth, iterative process was actually where the real value emerged. The AI had velocity - it could write and refactor quickly. I had judgment - I knew what should happen based on how the SDK actually behaved.

## What It Looks Like in Practice

After all that work, here's what developers can now do:

```typescript
// Step 1: Initialize Sentry with the integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'your-dsn-here',
  integrations: [
    Sentry.claudeCodeIntegration({
      recordInputs: true,  // Capture prompts
      recordOutputs: true  // Capture responses
    })
  ],
});

// Step 2: Use the helper to instrument your Claude Code queries
import { createInstrumentedClaudeQuery } from '@sentry/node';

const query = createInstrumentedClaudeQuery();

// Use it like normal - automatically instrumented!
for await (const message of query({
  prompt: 'Analyze the errors in my log file',
  options: { model: 'claude-sonnet-4-5' }
})) {
  console.log(message);
}
```

And now in Sentry, you get full visibility:
- How long the agent session took
- Each LLM interaction with token counts
- Every tool that was executed
- Where errors occurred in the flow
- Performance bottlenecks

All following OpenTelemetry semantic conventions, so it integrates seamlessly with Sentry's existing AI monitoring features.

## Why This Matters for Open Source

Look, I'm not going to claim that AI makes contributing to open source "easy" or that anyone can do it now without knowing how to code. That's not true, and it's not helpful.

But what *is* true is that **the barrier to extending and customizing open source software has dropped significantly**.

A few years ago, if I wanted to add this integration, I would have needed to:
1. Spend hours reading through Sentry's codebase to understand patterns
2. Read through OpenTelemetry specs to understand semantic conventions
3. Figure out how the Claude Code Agent SDK works internally
4. Write all the instrumentation code from scratch
5. Debug why it's not working

Instead, I:
1. Had AI research the existing patterns (10 minutes)
2. Had AI read and summarize the relevant docs (5 minutes)
3. Guided AI through implementing the integration (2 hours)
4. Tested, corrected, and refined (1 hour)

The time savings are dramatic, but more importantly, **AI made the research and learning phase way more efficient**. I didn't need to become an expert in Sentry's internals or memorize OpenTelemetry specs. I needed to understand the concepts well enough to guide the AI and validate its work.

This is huge for open source. It means more people can contribute extensions, integrations, and customizations to the tools they use daily. You don't need to be a core maintainer to add functionality that helps your specific use case.

## Practical Takeaways

If you want to try this approach for extending an open source project, here's what I learned:

**1. Start with similar implementations**
Don't ask AI to build from scratch. Find something close to what you want and say "make me something like this, but for X". Patterns are your friend.

**2. Use AI to read and synthesize docs**
Instead of reading hundreds of pages of documentation yourself, have AI extract the relevant parts and explain how they apply to your specific case.

**3. Be specific about your domain knowledge**
When you know something about how the system should behave, override the AI. Don't assume it got it right just because the code runs.

**4. Test thoroughly**
AI is great at making code that looks right and even runs. It's not always great at making code that handles edge cases correctly. Test the hell out of it.

**5. Iterate in small chunks**
Don't try to build the whole thing at once. Build one piece, validate it works, then move to the next. This makes it easier to catch where the AI went off track.

## Wrapping Up

The meta nature of this project - using Claude Code to build observability tooling for Claude Code - isn't lost on me. But it's actually a perfect example of how AI can accelerate our ability to extend and customize the tools we use.

AI isn't replacing software development. It's changing what software development looks like. Less time spelunking through code trying to understand patterns. More time guiding implementation and validating that things work correctly.

The human is still very much in the loop. But the loop is faster, and the barrier to contribution is lower. That's exciting for the future of open source.

If you want to try out the integration, it's available in `@sentry/node` version X.X.X and above. I'd love to hear if this approach resonates with you or if you've tried something similar with other open source projects.

Let's keep building. 🚀

---

*P.S. - Yes, Claude Code helped me write parts of this blog post too. The irony is not lost on me.*
