import type { PageServerLoad } from './$types'
import type { BlogPostCard } from '$lib/types/blog'
import type { Prisma } from '$lib/generated/prisma/client'
import { getPrisma } from '$lib/server/db'
import { getR2Url } from '$lib/server/r2'

export const load: PageServerLoad = async ({ url }) => {
  const tagFilter = url.searchParams.get('tag')

  try {
    const prisma = getPrisma()

    const whereClause: Prisma.PostWhereInput = { status: 'published' }
    if (tagFilter) {
      whereClause.tags = {
        some: { tag: { slug: tagFilter } }
      }
    }

    const [posts, tags] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        orderBy: { publishedAt: 'desc' },
        include: { tags: { include: { tag: true } } }
      }),
      prisma.tag.findMany({
        where: { posts: { some: { post: { status: 'published' } } } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' }
      })
    ])

    const mappedPosts: BlogPostCard[] = posts.map((post) => ({
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
      }))
    }))

    return { posts: mappedPosts, tags, activeTag: tagFilter, error: null }
  } catch (err) {
    console.error('[blog] Failed to load posts:', err)
    return {
      posts: [],
      tags: [],
      activeTag: tagFilter,
      error: 'Failed to load posts'
    }
  }
}
