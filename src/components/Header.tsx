import { Link } from '@tanstack/react-router'
import { Moon, Sun, Linkedin, Rss } from 'lucide-react'
import { SiGithub, SiX } from '@icons-pack/react-simple-icons'
import { useTheme } from './theme-provider'
import { Button } from './ui/button'

export default function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="transition-opacity hover:opacity-80"
          >
            <img 
              src={theme === 'dark' ? '/CodyLogoLight.png' : '/CodyLogoDark.png'} 
              alt="codyde.io" 
              className="h-8 w-auto"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/codyde"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-600 transition-colors hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-500"
            aria-label="GitHub"
          >
            <SiGithub size={20} />
          </a>
          <a
            href="https://twitter.com/codydearkland"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-600 transition-colors hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-500"
            aria-label="X (Twitter)"
          >
            <SiX size={20} />
          </a>
          <a
            href="https://linkedin.com/in/codydearkland"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-600 transition-colors hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-500"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href="/rss.xml"
            className="p-2 text-gray-600 transition-colors hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-500"
            aria-label="RSS Feed"
          >
            <Rss className="h-5 w-5" />
          </a>
          <div className="ml-2 h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
            className="hover:text-orange-600 dark:hover:text-orange-500"
          >
            {theme === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
