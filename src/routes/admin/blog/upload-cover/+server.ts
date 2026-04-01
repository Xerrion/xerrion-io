import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import sharp from 'sharp'
import { uploadToR2, deleteFromR2, getR2Url } from '$lib/server/r2'
import { generateCoverR2Keys } from '$lib/server/blog'

const COVER_QUALITY = 82

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized')

  const formData = await request.formData()
  const file = formData.get('file')
  const postSlug = formData.get('postSlug')?.toString()

  if (!(file instanceof File)) {
    error(400, 'Missing required field: file')
  }

  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
  const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    error(400, 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, AVIF')
  }
  if (file.size > MAX_FILE_SIZE) {
    error(400, 'File too large. Maximum size is 20 MB')
  }
  if (!postSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(postSlug)) {
    error(400, 'Invalid postSlug format')
  }

  const uploadedKeys: string[] = []

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer())
    const { medium: mediumKey, full: fullKey } = generateCoverR2Keys(postSlug)

    const [mediumBuffer, fullBuffer] = await Promise.all([
      sharp(inputBuffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: COVER_QUALITY })
        .toBuffer(),
      sharp(inputBuffer)
        .resize({ width: 2400, withoutEnlargement: true })
        .webp({ quality: COVER_QUALITY })
        .toBuffer()
    ])

    await uploadToR2(mediumKey, mediumBuffer, 'image/webp')
    uploadedKeys.push(mediumKey)

    await uploadToR2(fullKey, fullBuffer, 'image/webp')
    uploadedKeys.push(fullKey)

    return json({
      mediumKey,
      fullKey,
      mediumUrl: getR2Url(mediumKey),
      fullUrl: getR2Url(fullKey)
    })
  } catch (err) {
    if (uploadedKeys.length > 0) {
      await deleteFromR2(uploadedKeys).catch((cleanupErr) => {
        console.error(
          '[upload-cover] R2 cleanup failed, objects may be orphaned:',
          cleanupErr
        )
      })
    }
    const msg = err instanceof Error ? err.message : 'Cover upload failed'
    console.error('[upload-cover] Failed:', err)
    error(500, msg)
  }
}
