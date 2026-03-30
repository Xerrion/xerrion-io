import type { PageServerLoad, Actions } from './$types'
import { error, fail } from '@sveltejs/kit'
import { getPrisma } from '$lib/server/db'
import { deleteFromR2 } from '$lib/server/r2'
import { extractSizes } from '$lib/server/gallery'
import type { ImageMetadata } from '$lib/server/image'

export const load: PageServerLoad = async () => {
  try {
    const prisma = getPrisma()

    const [photoRows, categoryRows] = await Promise.all([
      prisma.photo.findMany({
        orderBy: { uploadedAt: 'desc' },
        include: {
          sizes: true,
          category: { select: { slug: true, name: true } }
        }
      }),
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })
    ])

    return {
      photos: photoRows.map((row) => {
        const { thumb, medium, full } = extractSizes(row.sizes)
        return {
          id: row.id,
          categoryId: row.categoryId,
          categoryName: row.category.name,
          categorySlug: row.category.slug,
          originalName: row.originalName,
          thumbUrl: thumb?.url ?? null,
          mediumUrl: medium?.url ?? null,
          fullUrl: full?.url ?? null,
          width: full?.width ?? null,
          height: full?.height ?? null,
          thumbSize: thumb?.byteSize ?? null,
          mediumSize: medium?.byteSize ?? null,
          fullSize: full?.byteSize ?? null,
          metadata: row.metadata as ImageMetadata | null,
          uploadedAt: row.uploadedAt.toISOString()
        }
      }),
      categories: categoryRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        sortOrder: row.sortOrder
      }))
    }
  } catch (err) {
    console.error('[admin/gallery] Failed to load gallery data:', err)
    error(500, 'Failed to load gallery data')
  }
}

export const actions: Actions = {
  delete: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const data = await request.formData()
    const photoId = data.get('photoId')?.toString()
    const photoIdNum = Number(photoId)

    if (!photoId || !Number.isInteger(photoIdNum) || photoIdNum <= 0) {
      return fail(400, { error: 'Photo ID is required' })
    }

    try {
      const prisma = getPrisma()

      const sizeRows = await prisma.photoSize.findMany({
        where: { photoId: photoIdNum },
        select: { r2Key: true }
      })

      if (sizeRows.length === 0) {
        return fail(404, { error: 'Photo not found' })
      }

      const keysToDelete = sizeRows.map((r) => r.r2Key)

      await prisma.photo.delete({ where: { id: photoIdNum } })

      await deleteFromR2(keysToDelete).catch((err) => {
        console.error(
          '[admin/gallery] R2 delete failed, objects may be orphaned:',
          err
        )
      })

      return { success: true }
    } catch (err) {
      console.error('[admin/gallery] delete failed:', err)
      return fail(500, { error: 'Failed to delete photo' })
    }
  },

  deleteMany: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' })

    const data = await request.formData()
    const idsRaw = data.get('photoIds')?.toString()

    if (!idsRaw) return fail(400, { error: 'No photos selected' })

    const ids = idsRaw
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id) && id > 0)
    if (ids.length === 0)
      return fail(400, { error: 'No valid photo IDs provided' })

    try {
      const prisma = getPrisma()

      const sizeRows = await prisma.photoSize.findMany({
        where: { photoId: { in: ids } },
        select: { r2Key: true, photoId: true }
      })

      if (sizeRows.length === 0) return fail(404, { error: 'No photos found' })

      const allR2Keys = sizeRows.map((r) => r.r2Key)
      const foundIds = [...new Set(sizeRows.map((r) => r.photoId))]
      const missingIds = ids.filter((id) => !foundIds.includes(id))

      if (missingIds.length > 0) {
        console.warn(
          `[admin/gallery] deleteMany: ${missingIds.length} ID(s) had no size rows: [${missingIds.join(', ')}]`
        )
      }

      await prisma.photo.deleteMany({ where: { id: { in: foundIds } } })

      await deleteFromR2(allR2Keys).catch((err) => {
        console.error(
          '[admin/gallery] R2 bulk delete failed, objects may be orphaned:',
          err
        )
      })

      return { success: true, deletedCount: foundIds.length }
    } catch (err) {
      console.error('[admin/gallery] deleteMany failed:', err)
      return fail(500, { error: 'Failed to delete photos' })
    }
  }
}
