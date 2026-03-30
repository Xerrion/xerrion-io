import type { PageServerLoad } from './$types'

import { getDb } from '$lib/server/db'
import { category, photo } from '$lib/server/schema'
import { eq, asc, count } from 'drizzle-orm'
import type { PhotoCategory } from '$lib/gallery'
import { mapRowToPhoto } from '$lib/server/gallery'

export const load: PageServerLoad = async () => {
  try {
    const db = getDb()

    const [categories, totalResult, countRows, photoRows] = await Promise.all([
      db
        .select({
          slug: category.slug,
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder
        })
        .from(category)
        .orderBy(asc(category.sortOrder)),

      db.select({ count: count() }).from(photo),

      db
        .select({
          slug: category.slug,
          count: count(photo.id)
        })
        .from(category)
        .leftJoin(photo, eq(category.id, photo.categoryId))
        .groupBy(category.id, category.slug),

      db.query.photo.findMany({
        with: {
          sizes: true,
          category: { columns: { slug: true } }
        },
        orderBy: (p, { desc }) => [desc(p.uploadedAt)],
        limit: 20
      })
    ])

    const mappedCategories: PhotoCategory[] = categories.map((row) => ({
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      order: row.sortOrder
    }))

    const totalPhotos = totalResult[0]?.count ?? 0

    const photoCounts: Record<string, number> = {}
    for (const row of countRows) {
      photoCounts[row.slug] = row.count
    }

    const initialPhotos = photoRows.map((row) =>
      mapRowToPhoto({ photo: row, category: row.category })
    )

    return {
      categories: mappedCategories,
      photoCounts,
      totalPhotos,
      initialPhotos,
      error: null
    }
  } catch (err) {
    console.error('[gallery] Failed to load from database:', err)
    return {
      categories: [],
      photoCounts: {},
      totalPhotos: 0,
      initialPhotos: [],
      error: 'Failed to load gallery'
    }
  }
}
