import type { PageServerLoad, Actions } from './$types'
import { error, fail, redirect } from '@sveltejs/kit'
import { superValidate } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { postCreateSchema } from '$lib/schemas/blog'
import { getPrisma } from '$lib/server/db'
import { calculateReadingTime } from '$lib/server/blog'

export const load: PageServerLoad = async () => {
  try {
    const prisma = getPrisma()
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })

    return {
      tags: tags.map((t) => ({ id: t.id, slug: t.slug, name: t.name })),
      form: await superValidate(zod4(postCreateSchema))
    }
  } catch (err) {
    console.error('[admin/blog/new] Failed to load:', err)
    error(500, 'Failed to load')
  }
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const form = await superValidate(request, zod4(postCreateSchema))
    if (!form.valid) return fail(400, { form })

    const { title, slug, description, content, editorMode, status, tagIds } =
      form.data

    try {
      const prisma = getPrisma()
      const existing = await prisma.post.findUnique({ where: { slug } })
      if (existing) {
        form.errors.slug = ['A post with this slug already exists']
        return fail(400, { form })
      }

      const readingTime = calculateReadingTime(content)
      const publishedAt = status === 'published' ? new Date() : null

      const post = await prisma.post.create({
        data: {
          title,
          slug,
          description: description || null,
          content,
          editorMode,
          status,
          readingTime,
          publishedAt,
          tags: {
            create: tagIds.map((tagId) => ({ tagId }))
          }
        }
      })

      redirect(303, `/admin/blog/${post.id}`)
    } catch (err) {
      if (err instanceof Error && 'status' in err) throw err
      console.error('[admin/blog/new] create failed:', err)
      return fail(500, { error: 'Failed to create post' })
    }
  }
}
