import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getAllPosts } from '../lib/posts.server'
import { formatDate } from '../lib/blog'
import { InlineMarkdown } from '../components/InlineMarkdown'

const SITE_URL = 'https://codyde.io'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const posts = await getAllPosts()
    return { posts }
  },
  head: () => ({
    meta: [
      { title: 'Cody De Arkland | Developer Experience' },
      { name: 'description', content: "Hi, I'm Cody! Dad, husband, builder, learner. I love to learn, and love to teach. Developer Experience @ Sentry." },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Cody De Arkland' },
      { property: 'og:description', content: "Hi, I'm Cody! Dad, husband, builder, learner. I love to learn, and love to teach." },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:image', content: `${SITE_URL}/api/og` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:site_name', content: 'Cody De Arkland' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Cody De Arkland' },
      { name: 'twitter:description', content: "Hi, I'm Cody! Dad, husband, builder, learner. I love to learn, and love to teach." },
      { name: 'twitter:image', content: `${SITE_URL}/api/og` },
    ],
  }),
})

function TypewriterHeading() {
  const text = "Hi, I'm Cody!"
  const [displayedText, setDisplayedText] = useState('')
  const [showWave, setShowWave] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const isTyping = displayedText.length < text.length

  useEffect(() => {
    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1))
      }, 80)
      return () => clearTimeout(timeout)
    } else if (!showWave) {
      const timeout = setTimeout(() => {
        setShowWave(true)
        setTimeout(() => setIsComplete(true), 100)
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [displayedText, showWave])

  return (
    <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
      {displayedText}
      <span 
        className={`inline-block w-[3px] bg-orange-500 ml-0.5 align-middle transition-opacity duration-150 ${
          isTyping ? 'animate-blink' : 'opacity-0'
        }`}
        style={{ height: '0.85em' }}
      />
      <span 
        className={`inline-block transition-opacity duration-300 ${
          showWave ? 'opacity-100' : 'opacity-0'
        } ${isComplete ? 'animate-wave' : ''}`}
      >
        {' '}👋
      </span>
    </h1>
  )
}

function Home() {
  const { posts } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="mb-20">
        <TypewriterHeading />
        <p className="mt-6 text-xl leading-relaxed text-gray-600 dark:text-gray-400">
          I'm a Dad, husband, builder, learner, and I BBQ a lot. I love to learn, and love to teach. I work at{' '}
          <a 
            href="https://sentry.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            Sentry
          </a>{' '}
          where I look after Developer Experience.
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
                  <InlineMarkdown>{post.title}</InlineMarkdown>
                  {post.draft && (
                    <span className="ml-3 inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30">
                      DRAFT
                    </span>
                  )}
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
