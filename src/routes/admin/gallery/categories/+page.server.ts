import type { PageServerLoad, Actions } from './$types'
import { error, fail } from '@sveltejs/kit'
import { superValidate, setError, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { categoryCreateSchema, categoryUpdateSchema } from '$lib/schemas/admin'
import { getPrisma } from '$lib/server/db'
import { toSlug } from '$lib/utils/slug'

export const load: PageServerLoad = async () => {
  try {
    const prisma = getPrisma()
    const rows = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' }
    })

    return {
      categories: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt.toISOString()
      })),
      createForm: await superValidate(zod4(categoryCreateSchema)),
      updateForm: await superValidate(zod4(categoryUpdateSchema))
    }
  } catch (err) {
    console.error('[admin/categories] Failed to load categories:', err)
    error(500, 'Failed to load categories')
  }
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const form = await superValidate(request, zod4(categoryCreateSchema))
    if (!form.valid) return fail(400, { createForm: form })

    const { name, description, sortOrder } = form.data
    const slug = toSlug(name)
    if (!slug)
      return setError(
        form,
        'name',
        'Name must contain at least one letter or number'
      )

    const prisma = getPrisma()
    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing)
      return setError(form, 'name', `Category "${slug}" already exists`)

    await prisma.category.create({
      data: { slug, name, description: description || null, sortOrder }
    })

    return message(form, 'Category created successfully')
  },

  update: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const form = await superValidate(request, zod4(categoryUpdateSchema))
    if (!form.valid) return fail(400, { updateForm: form })

    const { id, name, description, sortOrder } = form.data
    const prisma = getPrisma()

    await prisma.category.update({
      where: { id },
      data: { name, description: description || null, sortOrder }
    })

    return message(form, 'Category updated successfully')
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const data = await request.formData()
    const id = Number(data.get('id'))
    if (!id) return fail(400, { error: 'Category ID is required' })

    const prisma = getPrisma()
    // The DB schema has ON DELETE CASCADE on photo->category, but we guard here
    // at the application level to prevent accidental bulk photo deletion.
    // Admins must remove photos manually first, which also triggers R2 cleanup.
    // If we let the cascade run, R2 objects would be orphaned (no cleanup hook).
    const photoCount = await prisma.photo.count({ where: { categoryId: id } })

    if (photoCount > 0) {
      return fail(409, {
        error: `Cannot delete: category has ${photoCount} photo(s). Delete photos first.`
      })
    }

    await prisma.category.delete({ where: { id } })
    return { success: true }
  }
}
