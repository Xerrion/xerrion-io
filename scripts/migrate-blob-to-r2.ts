import { PrismaClient, PhotoSizeKey } from '../src/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

interface MigrationEnv {
  databaseUrl: string
  blobToken: string
  r2AccountId: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2BucketName: string
  r2PublicUrl: string
}

function parseEnvironment(): MigrationEnv {
  const required = [
    'DATABASE_URL',
    'BLOB_READ_WRITE_TOKEN',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL'
  ] as const

  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  return {
    databaseUrl: process.env.DATABASE_URL!,
    blobToken: process.env.BLOB_READ_WRITE_TOKEN!,
    r2AccountId: process.env.R2_ACCOUNT_ID!,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID!,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    r2BucketName: process.env.R2_BUCKET_NAME!,
    r2PublicUrl: process.env.R2_PUBLIC_URL!.replace(/\/$/, '')
  }
}

// ---------------------------------------------------------------------------
// Vercel Blob list API
// ---------------------------------------------------------------------------

interface VercelBlob {
  url: string
  pathname: string
  size: number
}

interface VercelBlobListResponse {
  blobs: VercelBlob[]
  cursor?: string
  hasMore: boolean
}

async function listVercelBlobs(
  token: string,
  prefix: string
): Promise<VercelBlob[]> {
  const allBlobs: VercelBlob[] = []
  let cursor: string | undefined

  do {
    const params = new URLSearchParams({ prefix })
    if (cursor) params.set('cursor', cursor)

    const response = await fetch(
      `https://blob.vercel-storage.com?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      throw new Error(
        `Vercel Blob list failed: HTTP ${response.status} - ${await response.text()}`
      )
    }

    const data = (await response.json()) as VercelBlobListResponse
    allBlobs.push(...data.blobs)
    cursor = data.hasMore ? data.cursor : undefined
  } while (cursor)

  return allBlobs
}

// ---------------------------------------------------------------------------
// R2 upload (standalone - avoids $env/dynamic/private from r2.ts)
// ---------------------------------------------------------------------------

function createR2Client(env: MigrationEnv): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey
    }
  })
}

async function uploadToR2(
  s3: S3Client,
  bucket: string,
  publicUrl: string,
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  )

  return `${publicUrl}/${key}`
}

async function deleteKeysFromR2(
  s3: S3Client,
  bucket: string,
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return

  const result = await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })) }
    })
  )

  if (result.Errors && result.Errors.length > 0) {
    for (const err of result.Errors) {
      console.error(
        `  [R2] Failed to delete key="${err.Key}": ${err.Code} - ${err.Message}`
      )
    }
    throw new Error(
      `R2 DeleteObjects failed for ${result.Errors.length} key(s)`
    )
  }
}

async function listR2Objects(
  s3: S3Client,
  bucket: string,
  prefix?: string
): Promise<{ key: string; size: number }[]> {
  const results: { key: string; size: number }[] = []
  let continuationToken: string | undefined

  do {
    const resp = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    )
    for (const obj of resp.Contents ?? []) {
      if (obj.Key) results.push({ key: obj.Key, size: obj.Size ?? 0 })
    }
    continuationToken = resp.IsTruncated
      ? resp.NextContinuationToken
      : undefined
  } while (continuationToken)

  return results
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchImageBuffer(
  url: string,
  timeoutMs = 30_000
): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`)
    }
    return Buffer.from(await response.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Blob path parsing
// ---------------------------------------------------------------------------

const VALID_SIZES = new Set<string>(['thumb', 'medium', 'full'])

interface ParsedBlob {
  categorySlug: string
  baseName: string
  size: PhotoSizeKey
  blob: VercelBlob
}

function parseBlobPathname(blob: VercelBlob): ParsedBlob | null {
  // Expected: gallery/{categorySlug}/{baseName}-{size}.webp
  const parts = blob.pathname.split('/')
  if (parts.length !== 3 || parts[0] !== 'gallery') return null

  const categorySlug = parts[1]
  const filename = parts[2]

  if (!filename.endsWith('.webp')) return null

  const nameWithoutExt = filename.slice(0, -5) // strip .webp
  const lastDash = nameWithoutExt.lastIndexOf('-')
  if (lastDash === -1) return null

  const size = nameWithoutExt.slice(lastDash + 1)
  if (!VALID_SIZES.has(size)) return null

  const baseName = nameWithoutExt.slice(0, lastDash)

  return {
    categorySlug,
    baseName,
    size: size as PhotoSizeKey,
    blob
  }
}

/** Group parsed blobs by category+baseName into photo groups. */
function groupByPhoto(
  parsed: ParsedBlob[]
): Map<string, Map<PhotoSizeKey, ParsedBlob>> {
  const groups = new Map<string, Map<PhotoSizeKey, ParsedBlob>>()

  for (const entry of parsed) {
    const key = `${entry.categorySlug}/${entry.baseName}`
    let sizeMap = groups.get(key)
    if (!sizeMap) {
      sizeMap = new Map()
      groups.set(key, sizeMap)
    }
    sizeMap.set(entry.size, entry)
  }

  return groups
}

// ---------------------------------------------------------------------------
// Main migration / seed
// ---------------------------------------------------------------------------

async function main() {
  const env = parseEnvironment()

  const adapter = new PrismaPg({ connectionString: env.databaseUrl })
  const prisma = new PrismaClient({ adapter })

  try {
    // Verify DB connection before proceeding
    await prisma.$queryRaw`SELECT 1`
    console.log('Database connection verified.')

    const s3 = createR2Client(env)

    // --- R2 pre-flight check ---
    console.log('\nChecking R2 bucket connectivity...')
    console.log(`  Bucket: ${env.r2BucketName}`)
    console.log(
      `  Endpoint: https://${env.r2AccountId}.r2.cloudflarestorage.com`
    )
    try {
      const existingObjects = await listR2Objects(
        s3,
        env.r2BucketName,
        'gallery/'
      )
      console.log(
        `  Objects in bucket (gallery/ prefix): ${existingObjects.length}`
      )
      if (existingObjects.length > 0) {
        console.log('  First 5 keys:')
        existingObjects
          .slice(0, 5)
          .forEach((o) => console.log(`    ${o.key} (${o.size} bytes)`))
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`  [R2] Pre-flight check FAILED: ${reason}`)
      throw new Error(
        'R2 bucket connectivity check failed - aborting migration'
      )
    }
    console.log('  R2 connectivity OK\n')

    // 1. List all blobs under gallery/
    console.log('Listing blobs from Vercel Blob...')
    const blobs = await listVercelBlobs(env.blobToken, 'gallery/')
    console.log(`Found ${blobs.length} blob(s) under gallery/\n`)

    if (blobs.length === 0) {
      console.log('No blobs to migrate. Done.')
      return
    }

    // 2. Parse and group
    const parsed: ParsedBlob[] = []
    let skippedBlobs = 0
    for (const blob of blobs) {
      const result = parseBlobPathname(blob)
      if (result) {
        parsed.push(result)
      } else {
        console.log(`  [SKIP] Unparseable blob path: ${blob.pathname}`)
        skippedBlobs++
      }
    }

    const photoGroups = groupByPhoto(parsed)
    const uniqueSlugs = new Set(parsed.map((p) => p.categorySlug))

    console.log(
      `Parsed ${parsed.length} blob(s) into ${photoGroups.size} photo group(s) across ${uniqueSlugs.size} categor${uniqueSlugs.size === 1 ? 'y' : 'ies'}.`
    )
    if (skippedBlobs > 0) {
      console.log(`Skipped ${skippedBlobs} unparseable blob(s).\n`)
    }

    // 3. Ensure category rows exist
    console.log('\nEnsuring categories...')
    const categoryIdMap = new Map<string, number>()

    for (const slug of uniqueSlugs) {
      const existing = await prisma.category.findUnique({
        where: { slug },
        select: { id: true }
      })

      if (existing) {
        categoryIdMap.set(slug, existing.id)
        console.log(`  Category "${slug}" exists (id=${existing.id})`)
      } else {
        const inserted = await prisma.category.create({
          data: { slug, name: slug },
          select: { id: true }
        })
        categoryIdMap.set(slug, inserted.id)
        console.log(`  Created category "${slug}" (id=${inserted.id})`)
      }
    }

    // 4. Process each photo group
    console.log(`\nMigrating ${photoGroups.size} photo(s)...\n`)

    let migratedCount = 0
    let failedCount = 0
    let skippedCount = 0
    let photoIndex = 0
    const totalPhotos = photoGroups.size

    for (const [groupKey, sizeMap] of photoGroups) {
      photoIndex++
      const progress = `[${photoIndex}/${totalPhotos}]`
      // Use explicit indexOf to avoid re-joining path segments.
      // parseBlobPathname already enforces parts.length === 3, so baseName is guaranteed slash-free.
      const slashIdx = groupKey.indexOf('/')
      const categorySlug = groupKey.slice(0, slashIdx)
      const baseName = groupKey.slice(slashIdx + 1)

      const categoryId = categoryIdMap.get(categorySlug)
      if (!categoryId) {
        console.log(
          `${progress} [FAIL] No category id for "${categorySlug}" - skipping`
        )
        failedCount++
        continue
      }

      // We need at least a full-size image
      const hasFull = sizeMap.has('full')
      if (!hasFull) {
        console.log(
          `${progress} [SKIP] Photo "${groupKey}" has no full-size variant - skipping`
        )
        failedCount++
        continue
      }

      console.log(`${progress} Migrating "${groupKey}"...`)

      // Idempotency: skip if a photo with this categoryId + originalName already exists
      const existingPhoto = await prisma.photo.findFirst({
        where: { categoryId, originalName: baseName },
        select: { id: true }
      })

      if (existingPhoto) {
        console.log(`  [SKIP] Already exists (id=${existingPhoto.id})`)
        skippedCount++
        continue
      }

      const uploadedKeys: string[] = []
      const sizeInserts: Array<{
        size: PhotoSizeKey
        r2Key: string
        width: number | null
        height: number | null
        byteSize: number
      }> = []
      let hasUploadFailure = false

      for (const size of ['thumb', 'medium', 'full'] as const) {
        const entry = sizeMap.get(size)
        if (!entry) continue

        try {
          const buffer = await fetchImageBuffer(entry.blob.url)

          // R2 key mirrors the original Vercel Blob pathname (no random suffix)
          // intentionally, to preserve the original path structure during migration
          const r2Key = `gallery/${categorySlug}/${baseName}-${size}.webp`
          await uploadToR2(
            s3,
            env.r2BucketName,
            env.r2PublicUrl,
            r2Key,
            buffer,
            'image/webp'
          )

          uploadedKeys.push(r2Key)
          // width/height are null for migrated photos - blobs are reused as-is
          // without re-decoding. Dimensions would require re-processing each image.
          sizeInserts.push({
            size,
            r2Key,
            width: null,
            height: null,
            byteSize: buffer.byteLength
          })
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err)
          console.log(`  \u2717 [WARN] Failed to upload ${size}: ${reason}`)

          // Clean up partial uploads
          try {
            await deleteKeysFromR2(s3, env.r2BucketName, uploadedKeys)
          } catch (cleanupErr) {
            const cleanupReason =
              cleanupErr instanceof Error
                ? cleanupErr.message
                : String(cleanupErr)
            console.log(
              `  \u2717 [WARN] R2 cleanup failed (orphans may exist): ${cleanupReason}`
            )
          }
          hasUploadFailure = true
          break
        }
      }

      if (hasUploadFailure) {
        failedCount++
        continue
      }

      // Insert photo + photo_size rows in a transaction
      try {
        await prisma.$transaction(async (tx) => {
          const inserted = await tx.photo.create({
            data: {
              categoryId,
              originalName: baseName
            },
            select: { id: true }
          })

          await tx.photoSize.createMany({
            data: sizeInserts.map((s) => ({
              photoId: inserted.id,
              size: s.size,
              r2Key: s.r2Key,
              width: s.width,
              height: s.height,
              byteSize: s.byteSize
            }))
          })
        })

        const sizeSummary = sizeInserts.map((s) => s.size).join(' | ')
        console.log(`  \u2713 ${sizeSummary}`)
        migratedCount++
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err) {
          const pgErr = err as {
            code: string
            message: string
            detail?: string
            hint?: string
          }
          console.log(
            `  \u2717 [WARN] DB insert failed: [${pgErr.code}] ${pgErr.message}${pgErr.detail ? ' - ' + pgErr.detail : ''}${pgErr.hint ? ' (hint: ' + pgErr.hint + ')' : ''}`
          )
        } else {
          const reason = err instanceof Error ? err.message : String(err)
          console.log(`  \u2717 [WARN] DB insert failed: ${reason}`)
        }

        // Best-effort cleanup of orphaned R2 objects
        try {
          await deleteKeysFromR2(s3, env.r2BucketName, uploadedKeys)
        } catch (cleanupErr) {
          const cleanupReason =
            cleanupErr instanceof Error
              ? cleanupErr.message
              : String(cleanupErr)
          console.log(
            `  \u2717 [WARN] R2 cleanup failed (orphans may exist): ${cleanupReason}`
          )
        }
        failedCount++
      }
    }

    // Summary
    console.log('\n--- Migration Summary ---')
    console.log(`  Migrated: ${migratedCount}`)
    console.log(`  Skipped:  ${skippedCount}`)
    console.log(`  Failed:   ${failedCount}`)
    console.log(`  Total:    ${totalPhotos}`)
  } finally {
    await prisma.$disconnect()
  }
}

try {
  await main()
} catch (err) {
  if (err && typeof err === 'object' && 'code' in err) {
    const pgErr = err as {
      code: string
      message: string
      detail?: string
      hint?: string
    }
    console.error(
      `Migration failed: [${pgErr.code}] ${pgErr.message}${pgErr.detail ? ' - ' + pgErr.detail : ''}${pgErr.hint ? ' (hint: ' + pgErr.hint + ')' : ''}`
    )
  } else {
    console.error('Migration failed:', err instanceof Error ? err.message : err)
  }
  process.exit(1)
}
