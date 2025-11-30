import { createFileRoute } from '@tanstack/react-router'
import { ImageResponse } from '@vercel/og'
import type { ReactElement } from 'react'

export const Route = createFileRoute('/api/og' as any)({
  server: {
    handlers: {
      all: async () => {
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
                      alignItems: 'center',
                    },
                    children: [
                      // Greeting
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '72px',
                            fontWeight: 700,
                            color: '#fafafa',
                            marginBottom: '24px',
                          },
                          children: "Hi, I'm Cody! 👋",
                        },
                      },
                      // Tagline
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '32px',
                            color: '#a1a1aa',
                            lineHeight: 1.5,
                            textAlign: 'center',
                            maxWidth: '900px',
                          },
                          children:
                            'Dad, husband, builder, learner. I love to learn, and love to teach.',
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
                            gap: '12px',
                          },
                          children: [
                            {
                              type: 'div',
                              props: {
                                style: {
                                  fontSize: '20px',
                                  color: '#f97316',
                                  fontWeight: 600,
                                },
                                children: 'Developer Experience @ Sentry',
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
    } as Record<string, () => Promise<Response>>,
  },
})
