import { createFileRoute } from '@tanstack/react-router'
import { ImageResponse } from '@vercel/og'
import type { ReactElement } from 'react'
import postsData from '../../generated/posts.json'

// Type the imported data
const allPosts = postsData as Array<{
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  draft?: boolean
}>

// Format date helper
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Truncate text helper
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export const Route = createFileRoute('/api/og/$slug' as any)({
  server: {
    handlers: {
      all: async ({ params }) => {
        const { slug } = params
        const post = allPosts.find((p) => p.slug === slug)

        if (!post) {
          return new Response('Post not found', { status: 404 })
        }

        return new ImageResponse(
          ({
            type: 'div',
            props: {
              style: {
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0a0a0a',
                padding: '60px',
                fontFamily: 'Inter',
              },
              children: [
                // Top accent bar
                {
                  type: 'div',
                  props: {
                    style: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '6px',
                      background: 'linear-gradient(90deg, #ea580c 0%, #f97316 100%)',
                    },
                  },
                },
                // Content container
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      justifyContent: 'center',
                    },
                    children: [
                      // Date
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '24px',
                            fontWeight: 600,
                            color: '#f97316',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '24px',
                          },
                          children: formatDate(post.date),
                        },
                      },
                      // Title
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '56px',
                            fontWeight: 700,
                            color: '#fafafa',
                            lineHeight: 1.2,
                            marginBottom: '32px',
                          },
                          children: truncate(post.title, 80),
                        },
                      },
                      // Excerpt
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '26px',
                            color: '#a1a1aa',
                            lineHeight: 1.5,
                          },
                          children: truncate(post.excerpt, 150),
                        },
                      },
                    ],
                  },
                },
                // Footer with site name
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                      paddingTop: '40px',
                      borderTop: '1px solid #27272a',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '22px',
                            fontWeight: 600,
                            color: '#71717a',
                          },
                          children: 'codyde.io',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          },
                          children: [
                            {
                              type: 'div',
                              props: {
                                style: {
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f97316',
                                },
                              },
                            },
                            {
                              type: 'div',
                              props: {
                                style: {
                                  fontSize: '20px',
                                  color: '#71717a',
                                },
                                children: 'Cody De Arkland',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          }) as ReactElement,
          {
            width: 1200,
            height: 630,
          }
        )
      },
    } as Record<string, (ctx: { params: { slug: string } }) => Promise<Response>>,
  },
})

