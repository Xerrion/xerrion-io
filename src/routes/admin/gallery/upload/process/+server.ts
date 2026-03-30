import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDb } from '$lib/server/db'
import { uploadToR2, deleteFromR2 } from '$lib/server/r2'
import { processImage, generateBlobPath, randomSuffix } from '$lib/server/image'
import type { ProcessingStep } from '$lib/server/image'
import {
  photo as photoTable,
  photoSize as photoSizeTable,
  category as categoryTable
} from '$lib/server/schema'
import { eq } from 'drizzle-orm'

type StreamStep =
  | ProcessingStep
  | 'uploading:thumb'
  | 'uploading:medium'
  | 'uploading:full'
  | 'saving'
  | 'done'

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    error(401, 'Unauthorized')
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const originalName = formData.get('originalName')
  const categoryId = formData.get('categoryId')

  if (!(file instanceof File) || !originalName || !categoryId) {
    error(400, 'Missing required fields: file, originalName, categoryId')
  }

  const categoryIdNum = Number(categoryId)
  if (!Number.isInteger(categoryIdNum) || categoryIdNum <= 0) {
    error(400, 'Invalid categoryId')
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(step: StreamStep, data?: Record<string, unknown>) {
        const payload = JSON.stringify({ step, ...data })
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
      }

      const uploadedR2Keys: string[] = []

      try {
        const db = getDb()

        // Validate category exists
        const [cat] = await db
          .select({ slug: categoryTable.slug })
          .from(categoryTable)
          .where(eq(categoryTable.id, categoryIdNum))
          .limit(1)

        if (!cat) {
          send('done', { error: 'Invalid category' })
          controller.close()
          return
        }

        const inputBuffer = Buffer.from(await file.arrayBuffer())

        const processed = await processImage(
          inputBuffer,
          (step: ProcessingStep) => {
            send(step)
          }
        )

        const suffix = randomSuffix()
        const thumbPath = generateBlobPath(
          cat.slug,
          String(originalName),
          'thumb',
          suffix
        )
        const mediumPath = generateBlobPath(
          cat.slug,
          String(originalName),
          'medium',
          suffix
        )
        const fullPath = generateBlobPath(
          cat.slug,
          String(originalName),
          'full',
          suffix
        )

        send('uploading:thumb')
        const thumbUrl = await uploadToR2(
          thumbPath,
          processed.thumb.buffer,
          'image/webp'
        )
        uploadedR2Keys.push(thumbPath)

        send('uploading:medium')
        const mediumUrl = await uploadToR2(
          mediumPath,
          processed.medium.buffer,
          'image/webp'
        )
        uploadedR2Keys.push(mediumPath)

        send('uploading:full')
        const fullUrl = await uploadToR2(
          fullPath,
          processed.full.buffer,
          'image/webp'
        )
        uploadedR2Keys.push(fullPath)

        send('saving')
        await db.transaction(async (tx) => {
          const [inserted] = await tx
            .insert(photoTable)
            .values({
              categoryId: categoryIdNum,
              originalName: String(originalName),
              metadata: processed.metadata
            })
            .returning({ id: photoTable.id })

          const newId = inserted.id

          await tx.insert(photoSizeTable).values([
            {
              photoId: newId,
              size: 'thumb',
              r2Key: thumbPath,
              url: thumbUrl,
              width: processed.thumb.width,
              height: processed.thumb.height,
              byteSize: processed.thumb.byteLength
            },
            {
              photoId: newId,
              size: 'medium',
              r2Key: mediumPath,
              url: mediumUrl,
              width: processed.medium.width,
              height: processed.medium.height,
              byteSize: processed.medium.byteLength
            },
            {
              photoId: newId,
              size: 'full',
              r2Key: fullPath,
              url: fullUrl,
              width: processed.full.width,
              height: processed.full.height,
              byteSize: processed.full.byteLength
            }
          ])
        })

        send('done', { success: true, name: String(originalName) })
      } catch (err) {
        // Best-effort R2 cleanup for uploaded objects on failure
        if (uploadedR2Keys.length > 0) {
          try {
            await deleteFromR2(uploadedR2Keys)
          } catch (cleanupErr) {
            console.error(
              '[upload/process] R2 cleanup failed, objects may be orphaned:',
              cleanupErr
            )
          }
        }

        const message = err instanceof Error ? err.message : 'Processing failed'
        send('done', { error: message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}
