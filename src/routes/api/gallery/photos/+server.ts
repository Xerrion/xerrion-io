import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getPrisma } from '$lib/server/db'
import { mapRowToPhoto } from '$lib/server/gallery'

export const GET: RequestHandler = async ({ url }) => {
  try {
    const categorySlug = url.searchParams.get('category') ?? undefined
    const rawOffset = Number(url.searchParams.get('offset'))
    const offset = Number.isNaN(rawOffset) ? 0 : Math.max(0, rawOffset)
    let limit = Number(url.searchParams.get('limit'))
    if (Number.isNaN(limit) || limit < 1) limit = 20
    limit = Math.min(limit, 50)

    const prisma = getPrisma()

    const rows = await prisma.photo.findMany({
      where: categorySlug ? { category: { slug: categorySlug } } : undefined,
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        sizes: true,
        category: { select: { slug: true } }
      }
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
