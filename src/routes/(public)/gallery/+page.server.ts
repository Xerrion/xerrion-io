import type { PageServerLoad } from './$types'
import type { PhotoCategory } from '$lib/gallery'
import { getPrisma } from '$lib/server/db'
import { mapRowToPhoto } from '$lib/server/gallery'

export const load: PageServerLoad = async () => {
  try {
    const prisma = getPrisma()

    const [categories, totalPhotos, photoCounts, photoRows] = await Promise.all(
      [
        prisma.category.findMany({
          orderBy: { sortOrder: 'asc' },
          select: { slug: true, name: true, description: true, sortOrder: true }
        }),
        prisma.photo.count(),
        prisma.category.findMany({
          orderBy: { sortOrder: 'asc' },
          select: {
            slug: true,
            _count: { select: { photos: true } }
          }
        }),
        prisma.photo.findMany({
          orderBy: { uploadedAt: 'desc' },
          take: 20,
          include: {
            sizes: true,
            category: { select: { slug: true } }
          }
        })
      ]
    )

    const mappedCategories: PhotoCategory[] = categories.map((row) => ({
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      order: row.sortOrder
    }))

    const photoCountMap: Record<string, number> = {}
    for (const row of photoCounts) {
      photoCountMap[row.slug] = row._count.photos
    }

    const initialPhotos = photoRows.map((row) =>
      mapRowToPhoto({ photo: row, category: row.category })
    )

    return {
      categories: mappedCategories,
      photoCounts: photoCountMap,
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
