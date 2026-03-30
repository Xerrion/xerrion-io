import type { PageServerLoad, Actions } from './$types'

import { getDb } from '$lib/server/db'
import { photo, photoSize } from '$lib/server/schema'
import { eq, inArray } from 'drizzle-orm'
import { error, fail } from '@sveltejs/kit'
import { deleteFromR2 } from '$lib/server/r2'
import { extractSizes } from '$lib/server/gallery'

export const load: PageServerLoad = async () => {
  try {
    const db = getDb()

    const [photoRows, categoryRows] = await Promise.all([
      db.query.photo.findMany({
        with: {
          sizes: true,
          category: { columns: { slug: true, name: true } }
        },
        orderBy: (p, { desc: d }) => [d(p.uploadedAt)]
      }),
      db.query.category.findMany({
        orderBy: (c, { asc: a }) => [a(c.sortOrder)]
      })
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
          metadata: row.metadata ?? null,
          uploadedAt: row.uploadedAt
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
  delete: async ({ request }) => {
    const data = await request.formData()
    const photoId = data.get('photoId')?.toString()
    const photoIdNum = Number(photoId)

    if (!photoId || !Number.isInteger(photoIdNum) || photoIdNum <= 0) {
      return fail(400, { error: 'Photo ID is required' })
    }

    try {
      const db = getDb()

      const sizeRows = await db
        .select({ r2Key: photoSize.r2Key })
        .from(photoSize)
        .where(eq(photoSize.photoId, photoIdNum))

      if (sizeRows.length === 0) {
        return fail(404, { error: 'Photo not found' })
      }

      const keysToDelete = sizeRows.map((row) => row.r2Key)

      // Delete from DB first (cascade removes photo_size rows)
      await db.delete(photo).where(eq(photo.id, photoIdNum))

      // Then clean up R2 objects (best-effort)
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

  deleteMany: async ({ request }) => {
    const data = await request.formData()
    const idsRaw = data.get('photoIds')?.toString()

    if (!idsRaw) {
      return fail(400, { error: 'No photos selected' })
    }

    const ids = idsRaw
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id) && id > 0)

    if (ids.length === 0) {
      return fail(400, { error: 'No valid photo IDs provided' })
    }

    try {
      const db = getDb()

      const sizeRows = await db
        .select({ r2Key: photoSize.r2Key, photoId: photoSize.photoId })
        .from(photoSize)
        .where(inArray(photoSize.photoId, ids))

      if (sizeRows.length === 0) {
        return fail(404, { error: 'No photos found' })
      }

      const allR2Keys = sizeRows.map((row) => row.r2Key)
      const foundIds = [...new Set(sizeRows.map((row) => row.photoId))]

      const missingIds = ids.filter((id) => !foundIds.includes(id))
      if (missingIds.length > 0) {
        console.warn(
          `[admin/gallery] deleteMany: ${missingIds.length} requested ID(s) had no size rows: [${missingIds.join(', ')}]`
        )
      }

      // Delete from DB first (cascade removes photo_size rows)
      await db.delete(photo).where(inArray(photo.id, foundIds))

      // Then clean up R2 objects (best-effort)
      await deleteFromR2(allR2Keys).catch((err) => {
        console.error(
          '[admin/gallery] R2 bulk delete failed, objects may be orphaned:',
          err
        )
      })

      return { success: true, deletedCount: foundIds.length }
    } catch (err) {
      console.error('[admin/gallery] deleteMany failed:', err)
      return fail(500, { error: 'Failed to delete photo' })
    }
  }
}
