import { createServerFn } from '@tanstack/react-start'
import { type BlogPost, type BlogPostMetadata } from './blog'
import postsData from '../generated/posts.json'

// Type the imported data
const allPosts = postsData as Array<{
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  draft?: boolean
}>

// Helper to check if we're in development mode (evaluated at runtime)
function isDevelopment(): boolean {
  return import.meta.env.DEV === true
}

export const getAllPosts = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BlogPostMetadata[]> => {
    // In production, filter out drafts. In development, show all posts.
    const showDrafts = isDevelopment()
    const posts = showDrafts ? allPosts : allPosts.filter(p => !p.draft)
    
    return posts.map(post => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      draft: post.draft,
    }))
  }
)

export const getPostBySlug = createServerFn({ method: 'GET' })
  .inputValidator((data: string) => data)
  .handler(async ({ data: slug }): Promise<BlogPost | null> => {
    const post = allPosts.find(p => p.slug === slug)

    if (!post) {
      return null
    }

    // In production, don't serve draft posts
    const showDrafts = isDevelopment()
    if (!showDrafts && post.draft) {
      return null
    }

    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      content: post.content,
      draft: post.draft,
    }
  })
