import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getPostBySlug } from '../../lib/posts.server'
import { formatDate } from '../../lib/blog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/posts/$slug')({
  component: BlogPost,
  loader: async ({ params }) => {
    const post = await getPostBySlug({ data: params.slug })
    if (!post) {
      throw notFound()
    }
    return { post }
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
            {post.title}
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
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  )
}
