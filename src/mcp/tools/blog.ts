import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { getAllPosts, getPostBySlug } from "../../lib/posts.server";

/**
 * Tool to list all blog posts
 */
export const listPostsTool = defineTool({
  name: "list_posts",
  description:
    "List all blog posts with their titles, dates, and excerpts. Use this to discover available content.",
  parameters: z.object({
    limit: z
      .number()
      .optional()
      .describe("Maximum number of posts to return (default: all)"),
  }),
  execute: async ({ limit }) => {
    const posts = await getAllPosts();
    const limitedPosts = limit ? posts.slice(0, limit) : posts;

    const formatted = limitedPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
    }));

    return JSON.stringify(formatted, null, 2);
  },
});

/**
 * Tool to get a specific blog post by slug
 */
export const getPostTool = defineTool({
  name: "get_post",
  description:
    "Get the full content of a specific blog post by its slug. Returns the complete markdown content.",
  parameters: z.object({
    slug: z.string().describe("The URL slug of the post to retrieve"),
  }),
  execute: async ({ slug }) => {
    const post = await getPostBySlug({ data: slug });

    if (!post) {
      return {
        content: [{ type: "text" as const, text: `Post not found: ${slug}` }],
        isError: true,
      };
    } 

    return JSON.stringify(
      {
        slug: post.slug,
        title: post.title,
        date: post.date,
        content: post.content,
      },
      null,
      2
    );
  },
});

/**
 * Tool to search blog posts
 */
export const searchPostsTool = defineTool({
  name: "search_posts",
  description:
    "Search blog posts by keyword. Searches in titles and excerpts.",
  parameters: z.object({
    query: z.string().describe("Search query to find in post titles or excerpts"),
  }),
  execute: async ({ query }) => {
    const posts = await getAllPosts();
    const lowerQuery = query.toLowerCase();

    const matches = posts.filter(
      (post) =>
        post.title.toLowerCase().includes(lowerQuery) ||
        post.excerpt.toLowerCase().includes(lowerQuery)
    );

    if (matches.length === 0) {
      return `No posts found matching "${query}"`;
    }

    const formatted = matches.map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
    }));

    return JSON.stringify(formatted, null, 2);
  },
});
