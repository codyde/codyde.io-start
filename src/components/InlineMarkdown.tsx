import React from 'react'

interface InlineMarkdownProps {
  children: string
  className?: string
}

/**
 * Renders inline markdown syntax (code, bold, italic) as React elements.
 * Supports: `code`, **bold**, *italic*
 */
export function InlineMarkdown({ children, className }: InlineMarkdownProps) {
  const parts = parseInlineMarkdown(children)
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <code
              key={index}
              className="rounded bg-gray-100 px-2 py-1 font-mono text-[0.85em] font-medium text-orange-600 dark:bg-gray-800 dark:text-orange-400"
            >
              {part.content}
            </code>
          )
        }
        if (part.type === 'bold') {
          return <strong key={index}>{part.content}</strong>
        }
        if (part.type === 'italic') {
          return <em key={index}>{part.content}</em>
        }
        return <React.Fragment key={index}>{part.content}</React.Fragment>
      })}
    </span>
  )
}

type ParsedPart = {
  type: 'text' | 'code' | 'bold' | 'italic'
  content: string
}

function parseInlineMarkdown(text: string): ParsedPart[] {
  const parts: ParsedPart[] = []
  
  // Combined regex for code, bold, and italic
  // Order matters: check ** before * to avoid conflicts
  const regex = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  
  let lastIndex = 0
  let match: RegExpExecArray | null
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }
    
    // Determine which group matched
    if (match[1] !== undefined) {
      // Code (backticks)
      parts.push({ type: 'code', content: match[1] })
    } else if (match[2] !== undefined) {
      // Bold (double asterisk)
      parts.push({ type: 'bold', content: match[2] })
    } else if (match[3] !== undefined) {
      // Italic (single asterisk)
      parts.push({ type: 'italic', content: match[3] })
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }
  
  return parts
}

