import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getPostBySlug } from '../../lib/posts.server'
import { formatDate } from '../../lib/blog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { ArrowLeft } from 'lucide-react'
import { CodeBlock, PreBlock } from '../../components/CodeBlock'
import { InlineMarkdown } from '../../components/InlineMarkdown'

const SITE_URL = 'https://codyde.io'

export const Route = createFileRoute('/posts/$slug')({
  component: BlogPost,
  loader: async ({ params }) => {
    const post = await getPostBySlug({ data: params.slug })
    if (!post) {
      throw notFound()
    }
    return { post }
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post
    if (!post) return {}
    
    const ogImageUrl = `${SITE_URL}/api/og/${post.slug}`
    const pageUrl = `${SITE_URL}/posts/${post.slug}`
    
    return {
      meta: [
        { title: `${post.title} | Cody De Arkland` },
        { name: 'description', content: post.excerpt },
        // Open Graph
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: post.title },
        { property: 'og:description', content: post.excerpt },
        { property: 'og:url', content: pageUrl },
        { property: 'og:image', content: ogImageUrl },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:site_name', content: 'Cody De Arkland' },
        { property: 'article:published_time', content: post.date },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: post.title },
        { name: 'twitter:description', content: post.excerpt },
        { name: 'twitter:image', content: ogImageUrl },
      ],
    }
  },
})

function BlogPost() {
  const { post } = Route.useLoaderData()

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link
        to="/"
        className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-500"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to all posts
      </Link>

      <article className="mt-12">
        <header className="mb-12 border-l-4 border-orange-600 pl-6 dark:border-orange-500">
          <time className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {formatDate(post.date)}
          </time>
          <h1 className="mt-3 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            <InlineMarkdown>{post.title}</InlineMarkdown>
            {post.draft && (
              <span className="ml-4 inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30">
                DRAFT
              </span>
            )}
          </h1>
        </header>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: 'wrap' }],
              rehypeHighlight,
            ]}
            components={{
              pre: ({ children }) => <PreBlock>{children}</PreBlock>,
              code: ({ className, children, ...props }) => {
                // Check if this is a code block (inside pre) or inline code
                const isInline = !className?.includes('hljs')
                if (isInline) {
                  return <code className={className} {...props}>{children}</code>
                }
                return <CodeBlock className={className}>{children}</CodeBlock>
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  )
}
