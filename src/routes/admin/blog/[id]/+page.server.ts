import type { PageServerLoad, Actions } from './$types'
import { error, fail, redirect } from '@sveltejs/kit'
import { superValidate } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { postUpdateSchema } from '$lib/schemas/blog'
import { getPrisma } from '$lib/server/db'
import { deleteFromR2, getR2Url } from '$lib/server/r2'
import { calculateReadingTime } from '$lib/server/blog'

export const load: PageServerLoad = async ({ params }) => {
  const id = Number(params.id)
  if (!id) error(400, 'Invalid post ID')

  try {
    const prisma = getPrisma()
    const [post, allTags] = await Promise.all([
      prisma.post.findUnique({
        where: { id },
        include: { tags: { include: { tag: true } } }
      }),
      prisma.tag.findMany({ orderBy: { name: 'asc' } })
    ])

    if (!post) error(404, 'Post not found')

    return {
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        description: post.description,
        content: post.content,
        status: post.status,
        coverR2Key: post.coverR2Key,
        coverR2KeyFull: post.coverR2KeyFull,
        coverUrl: post.coverR2Key ? getR2Url(post.coverR2Key) : null,
        readingTime: post.readingTime,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        tagIds: post.tags.map((pt) => pt.tagId)
      },
      tags: allTags.map((t) => ({ id: t.id, slug: t.slug, name: t.name })),
      form: await superValidate(
        {
          id: post.id,
          title: post.title,
          slug: post.slug,
          description: post.description ?? undefined,
          content: post.content,
          status: post.status,
          tagIds: post.tags.map((pt) => pt.tagId),
          coverR2Key: post.coverR2Key ?? '',
          coverR2KeyFull: post.coverR2KeyFull ?? '',
          existingCoverR2Key: post.coverR2Key ?? '',
          existingCoverR2KeyFull: post.coverR2KeyFull ?? ''
        },
        zod4(postUpdateSchema)
      )
    }
  } catch (err) {
    if (err instanceof Error && 'status' in err) throw err
    console.error('[admin/blog/[id]] Failed to load:', err)
    error(500, 'Failed to load post')
  }
}

export const actions: Actions = {
  update: async ({ request, locals, params }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const id = Number(params.id)
    if (!id) return fail(400, { error: 'Invalid post ID' })

    const form = await superValidate(request, zod4(postUpdateSchema))
    if (!form.valid) return fail(400, { form })

    const {
      title,
      slug,
      description,
      content,
      status,
      tagIds,
      coverR2Key: newCoverKey,
      coverR2KeyFull: newCoverKeyFull,
      existingCoverR2Key: oldCoverKey,
      existingCoverR2KeyFull: oldCoverKeyFull
    } = form.data

    try {
      const prisma = getPrisma()

      const existing = await prisma.post.findFirst({
        where: { slug, NOT: { id } }
      })
      if (existing) {
        form.errors.slug = ['A post with this slug already exists']
        return fail(400, { form })
      }

      const currentPost = await prisma.post.findUnique({
        where: { id },
        select: { publishedAt: true, status: true }
      })
      if (!currentPost) return fail(404, { form })

      // Clean up old cover R2 objects if cover was replaced
      if (oldCoverKey && oldCoverKey !== newCoverKey) {
        const oldKeys = [oldCoverKey, oldCoverKeyFull].filter(
          (k): k is string => !!k
        )
        if (oldKeys.length > 0) {
          await deleteFromR2(oldKeys).catch((err) => {
            console.error('[admin/blog/[id]] Old cover R2 cleanup failed:', err)
          })
        }
      }

      const readingTime = calculateReadingTime(content)
      const publishedAt =
        status === 'published'
          ? (currentPost.publishedAt ?? new Date())
          : currentPost.publishedAt

      await prisma.$transaction(async (tx) => {
        await tx.postTag.deleteMany({ where: { postId: id } })
        await tx.post.update({
          where: { id },
          data: {
            title,
            slug,
            description: description || null,
            content,
            editorMode: 'markdown',
            status,
            readingTime,
            coverR2Key: newCoverKey ?? null,
            coverR2KeyFull: newCoverKeyFull ?? null,
            publishedAt:
              status === 'published'
                ? (publishedAt ?? new Date())
                : publishedAt,
            tags: {
              create: tagIds.map((tagId) => ({ tagId }))
            }
          }
        })
      })

      return { form }
    } catch (err) {
      console.error('[admin/blog/[id]] update failed:', err)
      return fail(500, { form })
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
    } catch (err) {
      console.error('[admin/blog/[id]] delete failed:', err)
      return fail(500, { error: 'Failed to delete post' })
    }

    redirect(303, '/admin/blog')
  }
}
