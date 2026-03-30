import type { PageServerLoad } from './$types'

import { getDb } from '$lib/server/db'
import { category } from '$lib/server/schema'
import { asc } from 'drizzle-orm'

export const load: PageServerLoad = async () => {
  const db = getDb()

  const rows = await db
    .select({
      id: category.id,
      slug: category.slug,
      name: category.name
    })
    .from(category)
    .orderBy(asc(category.sortOrder))

  return { categories: rows }
}
