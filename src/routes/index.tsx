import { Link, createFileRoute } from '@tanstack/react-router'
import { getAllPosts } from '../lib/posts.server'
import { formatDate } from '../lib/blog'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const posts = await getAllPosts()
    return { posts }
  },
})

function Home() {
  const { posts } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="mb-20">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Hi, I'm Cody!
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-gray-600 dark:text-gray-400">
          I'm a Dad, a husband, a builder, a learner, and I BBQ a lot. I love to learn, and love to teach. I work at{' '}
          <a 
            href="https://sentry.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            Sentry.io
          </a>{' '}
          and look after Developer Experience.
        </p>
      </header>

      <div className="space-y-16">
        {posts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No posts yet. Check back soon!</p>
        ) : (
          posts.map((post) => (
            <article key={post.slug} className="group border-l-4 border-transparent pl-6 transition-all hover:border-orange-600 dark:hover:border-orange-500">
              <Link
                to="/posts/$slug"
                params={{ slug: post.slug }}
                className="block"
              >
                <time className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {formatDate(post.date)}
                </time>
                <h2 className="mt-3 text-3xl font-bold text-gray-900 transition-colors group-hover:text-orange-600 dark:text-gray-100 dark:group-hover:text-orange-500">
                  {post.title}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                  {post.excerpt}{' '}
                  <span className="inline-flex items-center gap-2 text-base font-semibold text-orange-600 transition-colors group-hover:text-orange-700 dark:text-orange-500 dark:group-hover:text-orange-400">
                    Read more
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </p>
              </Link>
            </article>
          ))
        )}
      </div>
    </main>
  )
}
