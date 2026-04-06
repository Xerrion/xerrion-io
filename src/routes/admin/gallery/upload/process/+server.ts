import { error } from '@sveltejs/kit'
import type { Prisma } from '$lib/generated/prisma/client'
import type { RequestHandler } from './$types'
import { getPrisma } from '$lib/server/db'
import { uploadToR2, deleteFromR2 } from '$lib/server/r2'
import { processImage, generateBlobPath, randomSuffix } from '$lib/server/image'
import type { ProcessingStep } from '$lib/server/image'

type StreamStep =
  | ProcessingStep
  | 'uploading:thumb'
  | 'uploading:medium'
  | 'uploading:full'
  | 'saving'
  | 'done'

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized')

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
        const prisma = getPrisma()

        const cat = await prisma.category.findUnique({
          where: { id: categoryIdNum },
          select: { slug: true }
        })

        if (!cat) {
          send('done', { error: 'Invalid category' })
          controller.close()
          return
        }

        const inputBuffer = Buffer.from(await file.arrayBuffer())
        const processed = await processImage(
          inputBuffer,
          (step: ProcessingStep) => send(step)
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
        await uploadToR2(thumbPath, processed.thumb.buffer, 'image/webp')
        uploadedR2Keys.push(thumbPath)

        send('uploading:medium')
        await uploadToR2(mediumPath, processed.medium.buffer, 'image/webp')
        uploadedR2Keys.push(mediumPath)

        send('uploading:full')
        await uploadToR2(fullPath, processed.full.buffer, 'image/webp')
        uploadedR2Keys.push(fullPath)

        send('saving')
        await prisma.$transaction(async (tx) => {
          const newPhoto = await tx.photo.create({
            data: {
              categoryId: categoryIdNum,
              originalName: String(originalName),
              metadata: processed.metadata
                ? (JSON.parse(
                    JSON.stringify(processed.metadata)
                  ) as Prisma.InputJsonObject)
                : undefined
            }
          })

          await tx.photoSize.createMany({
            data: [
              {
                photoId: newPhoto.id,
                size: 'thumb',
                r2Key: thumbPath,
                width: processed.thumb.width,
                height: processed.thumb.height,
                byteSize: processed.thumb.byteLength
              },
              {
                photoId: newPhoto.id,
                size: 'medium',
                r2Key: mediumPath,
                width: processed.medium.width,
                height: processed.medium.height,
                byteSize: processed.medium.byteLength
              },
              {
                photoId: newPhoto.id,
                size: 'full',
                r2Key: fullPath,
                width: processed.full.width,
                height: processed.full.height,
                byteSize: processed.full.byteLength
              }
            ]
          })
        })

        send('done', { success: true, name: String(originalName) })
      } catch (err) {
        if (uploadedR2Keys.length > 0) {
          await deleteFromR2(uploadedR2Keys).catch((cleanupErr) => {
            console.error(
              '[upload/process] R2 cleanup failed, objects may be orphaned:',
              cleanupErr
            )
          })
        }
        const msg = err instanceof Error ? err.message : 'Processing failed'
        send('done', { error: msg })
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
