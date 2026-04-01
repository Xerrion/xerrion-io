import type { PageServerLoad, Actions } from './$types'
import { error, fail } from '@sveltejs/kit'
import { superValidate, setError, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { tagCreateSchema, tagUpdateSchema } from '$lib/schemas/blog'
import { getPrisma } from '$lib/server/db'
import { toSlug } from '$lib/utils/slug'

export const load: PageServerLoad = async () => {
  try {
    const prisma = getPrisma()
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } }
    })

    return {
      tags: tags.map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        createdAt: tag.createdAt.toISOString(),
        postCount: tag._count.posts
      })),
      createForm: await superValidate(zod4(tagCreateSchema)),
      updateForm: await superValidate(zod4(tagUpdateSchema))
    }
  } catch (err) {
    console.error('[admin/blog/tags] Failed to load tags:', err)
    error(500, 'Failed to load tags')
  }
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const form = await superValidate(request, zod4(tagCreateSchema))
    if (!form.valid) return fail(400, { createForm: form })

    const slug = toSlug(form.data.name)
    if (!slug)
      return setError(
        form,
        'name',
        'Name must contain at least one letter or number'
      )

    try {
      const prisma = getPrisma()
      const existing = await prisma.tag.findUnique({ where: { slug } })
      if (existing)
        return setError(form, 'name', `Tag "${slug}" already exists`)

      await prisma.tag.create({ data: { slug, name: form.data.name } })
      return message(form, 'Tag created successfully')
    } catch (err) {
      console.error('[admin/blog/tags] create failed:', err)
      return fail(500, { error: 'Failed to create tag' })
    }
  },

  update: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const form = await superValidate(request, zod4(tagUpdateSchema))
    if (!form.valid) return fail(400, { updateForm: form })

    try {
      const prisma = getPrisma()
      await prisma.tag.update({
        where: { id: form.data.id },
        data: { name: form.data.name }
      })
      return message(form, 'Tag updated successfully')
    } catch (err) {
      console.error('[admin/blog/tags] update failed:', err)
      return fail(500, { error: 'Failed to update tag' })
    }
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const data = await request.formData()
    const id = Number(data.get('id'))
    if (!id) return fail(400, { error: 'Tag ID is required' })

    try {
      const prisma = getPrisma()
      // Guard: prevent deleting tags still attached to posts
      const postCount = await prisma.postTag.count({ where: { tagId: id } })
      if (postCount > 0) {
        return fail(409, {
          error: `Cannot delete: tag is used by ${postCount} post${postCount !== 1 ? 's' : ''}. Remove from posts first.`
        })
      }

      await prisma.tag.delete({ where: { id } })
      return { success: true }
    } catch (err) {
      console.error('[admin/blog/tags] delete failed:', err)
      return fail(500, { error: 'Failed to delete tag' })
    }
  }
}
