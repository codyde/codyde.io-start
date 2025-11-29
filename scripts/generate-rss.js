import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const POSTS_DIR = path.join(__dirname, '../content/posts')
const OUTPUT_PATH = path.join(__dirname, '../public/rss.xml')
const SITE_URL = 'https://codyde.io' // Update with your actual domain

async function generateRSS() {
  const files = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md'))

  const posts = files.map(file => {
    const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
    const { data, content: markdownContent } = matter(content)
    const slug = file.replace(/\.md$/, '')

    // Extract first 2 sentences for excerpt if description doesn't exist
    let excerpt = data.description || ''
    if (!excerpt) {
      const cleaned = markdownContent
        .replace(/^#.*$/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_~]/g, '')
        .trim()
      const sentenceRegex = /[^.!?]+[.!?]+/g
      const sentences = cleaned.match(sentenceRegex) || []
      excerpt = sentences.slice(0, 2).join(' ').trim()
    }

    return {
      slug,
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      excerpt,
    }
  })

  // Sort by date descending
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const rssItems = posts
    .map(post => {
      const postUrl = `${SITE_URL}/posts/${post.slug}`
      const pubDate = new Date(post.date).toUTCString()

      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.excerpt}]]></description>
    </item>`
    })
    .join('')

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Cody De Arkland</title>
    <link>${SITE_URL}</link>
    <description>Writing about developer experience, cloud infrastructure, and building with modern web technologies.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`

  fs.writeFileSync(OUTPUT_PATH, rssFeed, 'utf-8')
  console.log('RSS feed generated at public/rss.xml')
}

generateRSS()
