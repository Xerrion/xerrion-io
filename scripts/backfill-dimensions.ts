import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

interface BackfillEnv {
  databaseUrl: string
  r2PublicUrl: string
}

function parseEnvironment(): BackfillEnv {
  const required = ['DATABASE_URL', 'R2_PUBLIC_URL'] as const

  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  return {
    databaseUrl: process.env.DATABASE_URL!,
    r2PublicUrl: process.env.R2_PUBLIC_URL!.replace(/\/$/, '')
  }
}

// ---------------------------------------------------------------------------
// Image dimension fetching
// ---------------------------------------------------------------------------

interface ImageDimensions {
  width: number
  height: number
}

const FETCH_TIMEOUT_MS = 30_000

async function fetchImageDimensions(
  imageUrl: string
): Promise<ImageDimensions> {
  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const meta = await sharp(buffer).rotate().metadata()

  if (!meta.width || !meta.height) {
    throw new Error(`sharp returned no dimensions for ${imageUrl}`)
  }

  return { width: meta.width, height: meta.height }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const env = parseEnvironment()

  const prisma = new PrismaClient({
    datasources: { db: { url: env.databaseUrl } }
  })

  try {
    const photosToFix = await prisma.photo.findMany({
      where: { sizes: { some: { width: null } } },
      include: { sizes: true }
    })

    if (photosToFix.length === 0) {
      console.log('No photos with missing dimensions found.')
      return
    }

    console.log(`Found ${photosToFix.length} photo(s) with missing dimensions`)

    let updatedPhotos = 0
    let updatedSizeRows = 0

    for (const photo of photosToFix) {
      const sizesWithMissingDimensions = photo.sizes.filter(
        (s) => s.width === null || s.height === null
      )

      if (sizesWithMissingDimensions.length === 0) {
        continue
      }

      const hasFullSize = photo.sizes.some((s) => s.size === 'full')
      if (!hasFullSize) {
        console.log(`[SKIP] photoId=${photo.id} — no "full" size row exists`)
        continue
      }

      let hasError = false

      for (const sizeRow of sizesWithMissingDimensions) {
        const imageUrl = `${env.r2PublicUrl}/${sizeRow.r2Key}`

        try {
          const dimensions = await fetchImageDimensions(imageUrl)

          await prisma.photoSize.update({
            where: { id: sizeRow.id },
            data: { width: dimensions.width, height: dimensions.height }
          })

          console.log(
            `  ✓ photoId=${photo.id} size=${sizeRow.size} ${dimensions.width}x${dimensions.height}`
          )
          updatedSizeRows++
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(
            `  ✗ photoId=${photo.id} size=${sizeRow.size} — ${message}`
          )
          hasError = true
        }
      }

      if (!hasError) {
        updatedPhotos++
      }
    }

    console.log(
      `\nDone. Updated ${updatedPhotos} photo(s) (${updatedSizeRows} size rows)`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
