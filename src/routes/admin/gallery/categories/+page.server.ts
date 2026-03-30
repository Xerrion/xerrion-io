import type { PageServerLoad, Actions } from './$types'

import { getDb } from '$lib/server/db'
import { category, photo } from '$lib/server/schema'
import { eq, asc, count } from 'drizzle-orm'
import { fail } from '@sveltejs/kit'
import { superValidate, setError, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { categoryCreateSchema, categoryUpdateSchema } from '$lib/schemas/admin'

export const load: PageServerLoad = async () => {
  const db = getDb()

  const rows = await db.select().from(category).orderBy(asc(category.sortOrder))

  return {
    categories: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt
    })),
    createForm: await superValidate(zod4(categoryCreateSchema)),
    updateForm: await superValidate(zod4(categoryUpdateSchema))
  }
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
}

export const actions: Actions = {
  create: async ({ request }) => {
    const form = await superValidate(request, zod4(categoryCreateSchema))

    if (!form.valid) {
      return fail(400, { createForm: form })
    }

    const { name, description, sortOrder } = form.data

    const slug = toSlug(name)
    if (!slug) {
      return setError(
        form,
        'name',
        'Name must contain at least one letter or number'
      )
    }

    const db = getDb()

    const existing = await db
      .select({ id: category.id })
      .from(category)
      .where(eq(category.slug, slug))

    if (existing.length > 0) {
      return setError(form, 'name', `Category "${slug}" already exists`)
    }

    await db.insert(category).values({
      slug,
      name,
      description: description || null,
      sortOrder
    })

    return message(form, 'Category created successfully')
  },

  update: async ({ request }) => {
    const form = await superValidate(request, zod4(categoryUpdateSchema))

    if (!form.valid) {
      return fail(400, { updateForm: form })
    }

    const { id, name, description, sortOrder } = form.data

    const db = getDb()

    await db
      .update(category)
      .set({
        name,
        description: description || null,
        sortOrder
      })
      .where(eq(category.id, id))

    return message(form, 'Category updated successfully')
  },

  delete: async ({ request }) => {
    const data = await request.formData()
    const id = Number(data.get('id'))

    if (!id) {
      return fail(400, { error: 'Category ID is required' })
    }

    const db = getDb()

    const photoCountResult = await db
      .select({ count: count() })
      .from(photo)
      .where(eq(photo.categoryId, id))

    const photoCount = photoCountResult[0]?.count ?? 0
    if (photoCount > 0) {
      return fail(409, {
        error: `Cannot delete: category has ${photoCount} photo(s). Delete photos first.`
      })
    }

    await db.delete(category).where(eq(category.id, id))

    return { success: true }
  }
}
