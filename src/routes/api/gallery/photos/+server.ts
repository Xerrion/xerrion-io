import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import { getDb } from '$lib/server/db'
import { category, photo } from '$lib/server/schema'
import { eq, inArray } from 'drizzle-orm'
import { mapRowToPhoto } from '$lib/server/gallery'

export const GET: RequestHandler = async ({ url }) => {
  try {
    const categorySlug = url.searchParams.get('category')
    const rawOffset = Number(url.searchParams.get('offset'))
    const offset = Number.isNaN(rawOffset) ? 0 : Math.max(0, rawOffset)
    let limit = Number(url.searchParams.get('limit'))

    if (Number.isNaN(limit) || limit < 1) limit = 20
    limit = Math.min(limit, 50)

    const db = getDb()

    // Use a subquery to resolve category slug to id in a single round-trip
    const categoryFilter = categorySlug
      ? inArray(
          photo.categoryId,
          db
            .select({ id: category.id })
            .from(category)
            .where(eq(category.slug, categorySlug))
        )
      : undefined

    const rows = await db.query.photo.findMany({
      with: {
        sizes: true,
        category: { columns: { slug: true } }
      },
      where: categoryFilter ? () => categoryFilter : undefined,
      orderBy: (p, { desc }) => [desc(p.uploadedAt)],
      limit,
      offset
    })

    const photos = rows.map((row) =>
      mapRowToPhoto({ photo: row, category: row.category })
    )

    return json({ photos })
  } catch (err) {
    console.error('[api/gallery/photos] Failed to fetch photos:', err)
    return json(
      { error: 'Failed to fetch photos', photos: [] },
      { status: 500 }
    )
  }
}
