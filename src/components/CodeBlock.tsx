import { useState, useRef, useEffect } from 'react'
import { Check, Copy } from 'lucide-react'

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [isSingleLine, setIsSingleLine] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current) {
      const text = codeRef.current.textContent || ''
      // Check if there are no newlines in the content
      setIsSingleLine(!text.includes('\n') || text.trim().split('\n').length === 1)
    }
  }, [children])

  const handleCopy = async () => {
    const code = codeRef.current?.textContent || ''
    await navigator.clipboard.writeText(code)
    setCopied(true)
  }

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [copied])

  const CopyButton = ({ inline = false }: { inline?: boolean }) => (
    <button
      onClick={handleCopy}
      className={
        inline
          ? "ml-3 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-all hover:bg-gray-600 hover:text-white"
          : "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-gray-700/80 text-gray-300 opacity-0 backdrop-blur-sm transition-all hover:bg-gray-600 hover:text-white group-hover:opacity-100"
      }
      aria-label={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? (
        <Check className={inline ? "h-3.5 w-3.5 text-green-400" : "h-4 w-4 text-green-400"} />
      ) : (
        <Copy className={inline ? "h-3.5 w-3.5" : "h-4 w-4"} />
      )}
    </button>
  )

  if (isSingleLine) {
    return (
      <span className="flex items-center justify-between gap-2">
        <code ref={codeRef} className={`${className} flex-1 overflow-x-auto`}>
          {children}
        </code>
        <CopyButton inline />
      </span>
    )
  }

  return (
    <div className="group relative">
      <CopyButton />
      <code ref={codeRef} className={className}>
        {children}
      </code>
    </div>
  )
}

// Pre wrapper component to handle the pre element styling
interface PreBlockProps {
  children: React.ReactNode
  isSingleLine?: boolean
}

export function PreBlock({ children }: PreBlockProps) {
  return (
    <pre className="!relative overflow-x-auto">
      {children}
    </pre>
  )
}

