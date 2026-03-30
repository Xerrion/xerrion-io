import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3'
import { env } from '$env/dynamic/private'

let _s3: S3Client | null = null

function getS3(): S3Client {
  if (_s3) return _s3

  const accountId = env.R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not set'
    )
  }

  _s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  })

  return _s3
}

/**
 * Derive the public URL for an R2 object from its key.
 */
export function getR2Url(key: string): string {
  const publicUrl = env.R2_PUBLIC_URL
  if (!publicUrl) throw new Error('R2_PUBLIC_URL is not set')
  return `${publicUrl.replace(/\/$/, '')}/${key}`
}

/**
 * Upload a buffer to R2 at the given object key.
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  const bucket = env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME is not set')

  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  )
}

/**
 * Delete one or more objects from R2 by their object keys.
 * Silently ignores keys that don't exist but logs per-object errors.
 */
export async function deleteFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return

  const bucket = env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME is not set')

  const result = await getS3().send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((Key) => ({ Key }))
      }
    })
  )

  if (result.Errors && result.Errors.length > 0) {
    for (const err of result.Errors) {
      console.error(
        `[r2] Failed to delete key="${err.Key}": ${err.Code} - ${err.Message}`
      )
    }
    throw new Error(
      `R2 DeleteObjects failed for ${result.Errors.length} key(s)`
    )
  }
}
