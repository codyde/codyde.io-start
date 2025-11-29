import { createServerFn } from '@tanstack/react-start'
import { type BlogPost, type BlogPostMetadata } from './blog'
import postsData from '../generated/posts.json'

// Type the imported data
const posts = postsData as Array<{
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
}>

export const getAllPosts = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BlogPostMetadata[]> => {
    return posts.map(post => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
    }))
  }
)

export const getPostBySlug = createServerFn({ method: 'GET' })
  .inputValidator((data: string) => data)
  .handler(async ({ data: slug }): Promise<BlogPost | null> => {
    const post = posts.find(p => p.slug === slug)

    if (!post) {
      return null
    }

    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      content: post.content,
    }
  })
