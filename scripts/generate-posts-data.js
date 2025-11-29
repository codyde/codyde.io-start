import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const POSTS_DIR = path.join(__dirname, '../content/posts')
const OUTPUT_PATH = path.join(__dirname, '../src/generated/posts.json')

function generatePostsData() {
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
      content: markdownContent,
    }
  })

  // Sort by date descending
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Write JSON file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(posts, null, 2), 'utf-8')
  console.log(`Generated posts data at ${OUTPUT_PATH} (${posts.length} posts)`)
}

generatePostsData()
