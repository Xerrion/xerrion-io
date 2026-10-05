import type { PageServerLoad } from './$types'

import type { PhotoCategory } from '$lib/gallery'
import { getPrisma } from '$lib/server/db'
import { mapRowToPhoto } from '$lib/server/gallery'

const PAGE_SIZE = 20

export const load: PageServerLoad = async ({ url }) => {
  const selectedCategory = url.searchParams.get('category')?.trim() || null
  const rawPage = Number(url.searchParams.get('page') ?? '1')
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  try {
    const prisma = getPrisma()
    const [categoryRows, totalPhotos] = await Promise.all([
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, name: true, description: true, sortOrder: true, _count: { select: { photos: true } } }
      }),
      prisma.photo.count()
    ])
    const categories: PhotoCategory[] = categoryRows.map((row) => ({ name: row.name, slug: row.slug, description: row.description ?? undefined, order: row.sortOrder }))
    const photoCounts: Record<string, number> = Object.create(null)
    for (const row of categoryRows) photoCounts[row.slug] = row._count.photos
    const selectedTotal = selectedCategory ? photoCounts[selectedCategory] ?? 0 : totalPhotos
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(selectedTotal / PAGE_SIZE)))
    const rows = selectedTotal === 0 ? [] : await prisma.photo.findMany({
      where: selectedCategory ? { category: { slug: selectedCategory } } : undefined,
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      take: Math.min(page * PAGE_SIZE, selectedTotal),
      include: { sizes: true, category: { select: { slug: true } } }
    })
    const initialPhotos = rows.map((row) => mapRowToPhoto({ photo: row, category: row.category }))
    return { categories, photoCounts, totalPhotos, initialPhotos, selectedCategory, selectedTotal, page, hasMore: initialPhotos.length < selectedTotal, error: null }
  } catch {
    console.error('[gallery] Failed to load photos from the database')
    return { categories: [], photoCounts: {}, totalPhotos: 0, initialPhotos: [], selectedCategory, selectedTotal: 0, page: 1, hasMore: false, error: 'The gallery is temporarily unavailable.' }
  }
}
