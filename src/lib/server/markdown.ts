import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeShiki, {
    themes: {
      light: 'github-light',
      dark: 'github-dark'
    }
  })
  .use(rehypeStringify)

/**
 * Render Markdown content to HTML string.
 * Uses remark (GFM) + rehype + shiki for syntax highlighting.
 * Raw HTML in Markdown is intentionally NOT passed through (XSS defence).
 */
export async function renderMarkdown(content: string): Promise<string> {
  const result = await processor.process(content)
  return String(result)
}
