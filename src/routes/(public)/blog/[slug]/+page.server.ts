import type { PageServerLoad } from './$types'
import type { BlogPost } from '$lib/types/blog'

import { error } from '@sveltejs/kit'
import { getPrisma } from '$lib/server/db'
import { getR2Url } from '$lib/server/r2'
import { renderMarkdown } from '$lib/server/markdown'

export const load: PageServerLoad = async ({ params }) => {
  const prisma = getPrisma()

  // Fetch post - DB errors become 500, missing post becomes 404
  let post
  try {
    post = await prisma.post.findUnique({
      where: { slug: params.slug, status: 'published' },
      include: {
        tags: { include: { tag: true } }
      }
    })
  } catch (err) {
    console.error('[blog/slug] DB error fetching post:', err)
    error(500, 'Failed to load post')
  }

  if (!post) {
    error(404, 'Post not found')
  }

  // TipTap content is already HTML; only Markdown needs rendering
  let renderedContent = ''
  try {
    renderedContent =
      post.editorMode === 'tiptap'
        ? post.content
        : await renderMarkdown(post.content)
  } catch (err) {
    console.error('[blog/slug] Failed to render content:', err)
    renderedContent = '<p>Content rendering failed.</p>'
  }

  // Adjacent posts for navigation - non-critical, fallback to null
  let prevRow = null
  let nextRow = null
  try {
    ;[prevRow, nextRow] = await Promise.all([
      post.publishedAt
        ? prisma.post.findFirst({
            where: {
              status: 'published',
              publishedAt: { lt: post.publishedAt }
            },
            orderBy: { publishedAt: 'desc' },
            select: { slug: true, title: true }
          })
        : null,
      post.publishedAt
        ? prisma.post.findFirst({
            where: {
              status: 'published',
              publishedAt: { gt: post.publishedAt }
            },
            orderBy: { publishedAt: 'asc' },
            select: { slug: true, title: true }
          })
        : null
    ])
  } catch (err) {
    console.error('[blog/slug] Failed to load adjacent posts:', err)
  }

  const blogPost: BlogPost = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description,
    coverUrl: post.coverR2Key ? getR2Url(post.coverR2Key) : null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    readingTime: post.readingTime,
    tags: post.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      slug: pt.tag.slug
    })),
    content: post.content,
    renderedContent,
    editorMode: post.editorMode,
    updatedAt: post.updatedAt.toISOString(),
    nextPost: nextRow ? { slug: nextRow.slug, title: nextRow.title } : null,
    prevPost: prevRow ? { slug: prevRow.slug, title: prevRow.title } : null
  }

  return { post: blogPost }
}
