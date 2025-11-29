import matter from 'gray-matter'

export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
}

export interface BlogPostMetadata {
  slug: string
  title: string
  date: string
  excerpt: string
}

export function parseMarkdown(filename: string, content: string): BlogPost {
  const { data, content: markdownContent } = matter(content)

  const slug = filename.replace(/\.md$/, '')

  // Use description from frontmatter, fallback to extracting first 2 sentences
  const excerpt = data.description || extractPreview(markdownContent, 2)

  return {
    slug,
    title: data.title || 'Untitled',
    date: data.date || new Date().toISOString(),
    excerpt,
    content: markdownContent,
  }
}

export function getPostMetadata(post: BlogPost): BlogPostMetadata {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function extractPreview(content: string, sentences: number = 3): string {
  const cleaned = content
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim()

  const sentenceRegex = /[^.!?]+[.!?]+/g
  const sentences_array = cleaned.match(sentenceRegex) || []

  return sentences_array.slice(0, sentences).join(' ').trim()
}
