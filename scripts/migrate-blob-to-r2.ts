import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3'

import { photo, category } from '../src/lib/server/schema'
import { generateBlobPath, type SizeKey } from '../src/lib/server/image'

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

interface MigrationEnv {
  databaseUrl: string
  r2AccountId: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2BucketName: string
  r2PublicUrl: string
}

function parseEnvironment(): MigrationEnv {
  const required = [
    'DATABASE_URL',
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
    r2AccountId: process.env.R2_ACCOUNT_ID!,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID!,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    r2BucketName: process.env.R2_BUCKET_NAME!,
    r2PublicUrl: process.env.R2_PUBLIC_URL!.replace(/\/$/, '')
  }
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

// ---------------------------------------------------------------------------
// R2 cleanup (for rollback on partial failure)
// ---------------------------------------------------------------------------

async function deleteKeysFromR2(
  s3: S3Client,
  bucket: string,
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true }
    })
  )
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
// Size mapping
// ---------------------------------------------------------------------------

const SIZE_FIELDS = {
  thumb: 'thumbUrl',
  medium: 'mediumUrl',
  full: 'fullUrl'
} as const satisfies Record<SizeKey, keyof typeof photo.$inferSelect>

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main() {
  const env = parseEnvironment()

  const sql = postgres(env.databaseUrl, { max: 1 })
  const db = drizzle(sql, { casing: 'snake_case' })

  const s3 = createR2Client(env)

  // Fetch all photos with their category slug
  const rows = await db
    .select({
      id: photo.id,
      originalName: photo.originalName,
      blobPath: photo.blobPath,
      thumbUrl: photo.thumbUrl,
      mediumUrl: photo.mediumUrl,
      fullUrl: photo.fullUrl,
      categorySlug: category.slug
    })
    .from(photo)
    .innerJoin(category, eq(photo.categoryId, category.id))

  const totalPhotos = rows.length
  console.log(`Found ${totalPhotos} photo(s) to process.\n`)

  let migratedCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const progress = `[${i + 1}/${totalPhotos}]`

    // Skip already-migrated rows - all three URLs must point to R2
    const isAlreadyMigrated =
      row.thumbUrl.startsWith(env.r2PublicUrl) &&
      row.mediumUrl.startsWith(env.r2PublicUrl) &&
      row.fullUrl.startsWith(env.r2PublicUrl)
    if (isAlreadyMigrated) {
      console.log(
        `${progress} [SKIP] Photo ID=${row.id} "${row.originalName}" - already migrated`
      )
      skippedCount++
      continue
    }

    console.log(
      `${progress} Migrating photo ID=${row.id} "${row.originalName}"...`
    )

    // Deterministic suffix so retries overwrite the same keys (no orphans)
    const suffix = row.id.toString().padStart(8, '0')
    const newUrls: Record<SizeKey, string> = { thumb: '', medium: '', full: '' }
    const newKeys: Record<SizeKey, string> = { thumb: '', medium: '', full: '' }
    const uploadedKeys: string[] = []
    let hasUploadFailure = false

    for (const size of ['thumb', 'medium', 'full'] as const) {
      const fieldName = SIZE_FIELDS[size]
      const sourceUrl = row[fieldName]

      try {
        const buffer = await fetchImageBuffer(sourceUrl)
        const key = generateBlobPath(
          row.categorySlug,
          row.originalName,
          size,
          suffix
        )
        const r2Url = await uploadToR2(
          s3,
          env.r2BucketName,
          env.r2PublicUrl,
          key,
          buffer,
          'image/webp'
        )

        uploadedKeys.push(key)
        newUrls[size] = r2Url
        newKeys[size] = key
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        console.log(`  \u2717 [WARN] Failed to migrate ${size}: ${reason}`)

        // Clean up any R2 objects already uploaded for this photo
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

    // Update the database row - use the full-size key as canonical blob_path
    try {
      await db
        .update(photo)
        .set({
          thumbUrl: newUrls.thumb,
          mediumUrl: newUrls.medium,
          fullUrl: newUrls.full,
          blobPath: newKeys.full
        })
        .where(eq(photo.id, row.id))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.log(`  \u2717 [WARN] DB update failed: ${reason}`)

      // Best-effort cleanup of R2 objects that are now untracked
      try {
        await deleteKeysFromR2(s3, env.r2BucketName, uploadedKeys)
      } catch (cleanupErr) {
        const cleanupReason =
          cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
        console.log(
          `  \u2717 [WARN] R2 cleanup failed (orphans may exist): ${cleanupReason}`
        )
      }
      failedCount++
      continue
    }

    console.log(`  \u2713 thumb | medium | full`)
    migratedCount++
  }

  // Summary
  console.log('\n--- Migration Summary ---')
  console.log(`  Migrated: ${migratedCount}`)
  console.log(`  Skipped:  ${skippedCount}`)
  console.log(`  Failed:   ${failedCount}`)
  console.log(`  Total:    ${totalPhotos}`)

  await sql.end()
  process.exit(0)
}

try {
  await main()
} catch (err) {
  console.error('Migration failed:', err)
  process.exit(1)
}
