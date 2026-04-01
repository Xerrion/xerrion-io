import type { PageServerLoad } from './$types'
import type { BlogPostCard } from '$lib/types/blog'

import { getPrisma } from '$lib/server/db'
import { getR2Url } from '$lib/server/r2'

export const load: PageServerLoad = async () => {
  try {
    const prisma = getPrisma()
    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      include: { tags: { include: { tag: true } } }
    })

    const latestPosts: BlogPostCard[] = posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      coverUrl: post.coverR2Key ? getR2Url(post.coverR2Key) : null,
      readingTime: post.readingTime,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      tags: post.tags.map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug
      }))
    }))

    return { latestPosts }
  } catch (err) {
    console.error('[home] Failed to load latest posts:', err)
    return { latestPosts: [] }
  }
}
