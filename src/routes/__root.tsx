import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ThemeProvider } from '../components/theme-provider'
import Header from '../components/Header'
import { lazy, Suspense } from 'react'

import appCss from '../styles.css?url'

// Only load devtools in development
const TanStackDevtools =
  process.env.NODE_ENV === 'production'
    ? () => null
    : lazy(() =>
        import('@tanstack/react-devtools').then((mod) => ({
          default: mod.TanStackDevtools,
        }))
      )

const TanStackRouterDevtoolsPanel =
  process.env.NODE_ENV === 'production'
    ? () => null
    : lazy(() =>
        import('@tanstack/react-router-devtools').then((mod) => ({
          default: mod.TanStackRouterDevtoolsPanel,
        }))
      )

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Blog',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('ui-theme') || 'dark';
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white text-gray-900 antialiased transition-colors dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider>
          <Header />
          {children}
          {process.env.NODE_ENV !== 'production' && (
            <Suspense fallback={null}>
              <TanStackDevtools
                config={{
                  position: 'bottom-right',
                }}
                plugins={[
                  {
                    name: 'Tanstack Router',
                    render: (
                      <Suspense fallback={null}>
                        <TanStackRouterDevtoolsPanel />
                      </Suspense>
                    ),
                  },
                ]}
              />
            </Suspense>
          )}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
