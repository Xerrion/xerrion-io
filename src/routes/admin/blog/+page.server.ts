import type { PageServerLoad, Actions } from './$types'
import { error, fail } from '@sveltejs/kit'
import { getPrisma } from '$lib/server/db'
import { deleteFromR2 } from '$lib/server/r2'

export const load: PageServerLoad = async () => {
  try {
    const prisma = getPrisma()
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { include: { tag: true } }
      }
    })

    return {
      posts: posts.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        status: post.status,
        readingTime: post.readingTime,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        tagCount: post.tags.length
      }))
    }
  } catch (err) {
    console.error('[admin/blog] Failed to load posts:', err)
    error(500, 'Failed to load posts')
  }
}

export const actions: Actions = {
  publish: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const data = await request.formData()
    const id = Number(data.get('id'))
    if (!id) return fail(400, { error: 'Post ID is required' })

    try {
      const prisma = getPrisma()
      const post = await prisma.post.findUnique({
        where: { id },
        select: { publishedAt: true }
      })
      if (!post) return fail(404, { error: 'Post not found' })

      await prisma.post.update({
        where: { id },
        data: {
          status: 'published',
          publishedAt: post.publishedAt ?? new Date()
        }
      })
      return { success: true }
    } catch (err) {
      console.error('[admin/blog] publish failed:', err)
      return fail(500, { error: 'Failed to publish post' })
    }
  },

  unpublish: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const data = await request.formData()
    const id = Number(data.get('id'))
    if (!id) return fail(400, { error: 'Post ID is required' })

    try {
      const prisma = getPrisma()
      await prisma.post.update({
        where: { id },
        data: { status: 'draft' }
      })
      return { success: true }
    } catch (err) {
      console.error('[admin/blog] unpublish failed:', err)
      return fail(500, { error: 'Failed to unpublish post' })
    }
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const data = await request.formData()
    const id = Number(data.get('id'))
    if (!id) return fail(400, { error: 'Post ID is required' })

    try {
      const prisma = getPrisma()
      const post = await prisma.post.findUnique({
        where: { id },
        select: { coverR2Key: true, coverR2KeyFull: true }
      })
      if (!post) return fail(404, { error: 'Post not found' })

      // Delete R2 objects first so the DB record is intact if R2 fails
      const r2Keys = [post.coverR2Key, post.coverR2KeyFull].filter(
        (k): k is string => k !== null
      )
      if (r2Keys.length > 0) {
        await deleteFromR2(r2Keys)
      }

      await prisma.post.delete({ where: { id } })
      return { success: true }
    } catch (err) {
      console.error('[admin/blog] delete failed:', err)
      return fail(500, { error: 'Failed to delete post' })
    }
  }
}
