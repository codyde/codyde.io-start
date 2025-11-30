import { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const POSTS_DIR = path.resolve(process.cwd(), 'content/posts')
const OUTPUT_PATH = path.resolve(process.cwd(), 'src/generated/posts.json')

function generatePostsData() {
  const files = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md'))

  const allPosts = files.map(file => {
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
      draft: data.draft || false,
    }
  })

  // Sort by date descending
  allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Write JSON file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allPosts, null, 2), 'utf-8')
  console.log(`\n✨ Regenerated posts.json (${allPosts.length} posts)`)
}

export function markdownHotReload(): Plugin {
  return {
    name: 'markdown-hot-reload',
    configureServer(server) {
      // Watch the content/posts directory
      server.watcher.add(POSTS_DIR)

      server.watcher.on('change', (filePath) => {
        if (filePath.startsWith(POSTS_DIR) && filePath.endsWith('.md')) {
          console.log(`\n📝 Markdown changed: ${path.basename(filePath)}`)
          generatePostsData()
          
          // Invalidate the posts.json module to trigger HMR
          const module = server.moduleGraph.getModuleById(OUTPUT_PATH)
          if (module) {
            server.moduleGraph.invalidateModule(module)
          }
          
          // Send full reload since the data is used server-side
          server.ws.send({ type: 'full-reload' })
        }
      })

      server.watcher.on('add', (filePath) => {
        if (filePath.startsWith(POSTS_DIR) && filePath.endsWith('.md')) {
          console.log(`\n📄 New markdown file: ${path.basename(filePath)}`)
          generatePostsData()
          server.ws.send({ type: 'full-reload' })
        }
      })

      server.watcher.on('unlink', (filePath) => {
        if (filePath.startsWith(POSTS_DIR) && filePath.endsWith('.md')) {
          console.log(`\n🗑️  Markdown deleted: ${path.basename(filePath)}`)
          generatePostsData()
          server.ws.send({ type: 'full-reload' })
        }
      })
    },
  }
}


