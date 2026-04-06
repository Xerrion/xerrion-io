import { PrismaClient } from '../src/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createClient, type Client } from '@libsql/client'

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

interface BackfillEnv {
  databaseUrl: string
  tursoDatabaseUrl: string
  tursoAuthToken: string
}

function parseEnvironment(): BackfillEnv {
  const required = [
    'DATABASE_URL',
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN'
  ] as const

  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  return {
    databaseUrl: process.env.DATABASE_URL!,
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL!,
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN!
  }
}

// ---------------------------------------------------------------------------
// Turso data types
// ---------------------------------------------------------------------------

interface TursoPhoto {
  originalName: string
  categoryId: number
  metadata: unknown
}

interface TursoCategory {
  id: number
  slug: string
}

// ---------------------------------------------------------------------------
// Turso data fetching
// ---------------------------------------------------------------------------

async function fetchTursoPhotosWithMetadata(
  turso: Client
): Promise<TursoPhoto[]> {
  const result = await turso.execute(
    'SELECT original_name, category_id, metadata FROM photo WHERE metadata IS NOT NULL'
  )

  return result.rows.map((row) => ({
    originalName: row.original_name as string,
    categoryId: Number(row.category_id),
    metadata: JSON.parse(row.metadata as string)
  }))
}

async function fetchTursoCategoryMap(
  turso: Client
): Promise<Map<number, string>> {
  const result = await turso.execute('SELECT id, slug FROM category')

  const categoryMap = new Map<number, string>()
  for (const row of result.rows) {
    categoryMap.set(Number(row.id), row.slug as string)
  }
  return categoryMap
}

// ---------------------------------------------------------------------------
// Name normalization for fuzzy matching
// ---------------------------------------------------------------------------

/**
 * Normalizes a filename for comparison by lowercasing, stripping the file
 * extension, and removing underscores. This bridges the gap between Turso's
 * raw filenames (e.g. "IMG_20230813_112508.jpg") and PG's slugified names
 * (e.g. "img20230813112508-zjy1qt").
 */
function normalizeNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '') // strip file extension
    .replace(/_/g, '') // strip underscores
}

// ---------------------------------------------------------------------------
// PG photo lookup map
// ---------------------------------------------------------------------------

interface PgPhotoEntry {
  id: number
  originalName: string
  metadata: unknown
}

/**
 * Builds a lookup map of PG photos keyed by their normalized base name
 * (with the trailing random suffix stripped). This allows O(1) matching
 * against Turso's normalized filenames.
 */
async function buildPgLookupMap(
  prisma: PrismaClient,
  categorySlug: string
): Promise<Map<string, PgPhotoEntry>> {
  const pgPhotos = await prisma.photo.findMany({
    where: { category: { slug: categorySlug } },
    select: { id: true, originalName: true, metadata: true }
  })

  const lookupMap = new Map<string, PgPhotoEntry>()
  for (const photo of pgPhotos) {
    const baseName = photo.originalName.replace(/-[a-z0-9]{6}$/, '')
    const normalizedBase = normalizeNameForMatching(baseName)
    lookupMap.set(normalizedBase, photo)
  }

  console.log(
    `Built PG lookup map for "${categorySlug}": ${lookupMap.size} entries from ${pgPhotos.length} photos`
  )

  return lookupMap
}

// ---------------------------------------------------------------------------
// Backfill logic
// ---------------------------------------------------------------------------

interface BackfillSummary {
  updated: number
  skippedAlreadyHasMetadata: number
  skippedNoMatch: number
}

async function backfillMetadata(
  prisma: PrismaClient,
  tursoPhotos: TursoPhoto[],
  categoryMap: Map<number, string>
): Promise<BackfillSummary> {
  const summary: BackfillSummary = {
    updated: 0,
    skippedAlreadyHasMetadata: 0,
    skippedNoMatch: 0
  }

  // Collect unique category slugs needed for this backfill
  const categorySlugs = new Set<string>()
  for (const tursoPhoto of tursoPhotos) {
    const slug = categoryMap.get(tursoPhoto.categoryId)
    if (slug) categorySlugs.add(slug)
  }

  // Build a lookup map per category, keyed by normalized base name
  const lookupMaps = new Map<string, Map<string, PgPhotoEntry>>()
  for (const slug of categorySlugs) {
    lookupMaps.set(slug, await buildPgLookupMap(prisma, slug))
  }

  for (const tursoPhoto of tursoPhotos) {
    const categorySlug = categoryMap.get(tursoPhoto.categoryId)
    if (!categorySlug) {
      console.log(
        `[SKIP] No category slug for category_id=${tursoPhoto.categoryId} (${tursoPhoto.originalName})`
      )
      summary.skippedNoMatch++
      continue
    }

    const pgLookup = lookupMaps.get(categorySlug)
    if (!pgLookup) {
      console.log(
        `[SKIP] No PG lookup map for category "${categorySlug}" (${tursoPhoto.originalName})`
      )
      summary.skippedNoMatch++
      continue
    }

    const normalizedTursoName = normalizeNameForMatching(
      tursoPhoto.originalName
    )
    const pgPhoto = pgLookup.get(normalizedTursoName)

    if (!pgPhoto) {
      console.log(
        `[SKIP] No PG match for ${tursoPhoto.originalName} -> "${normalizedTursoName}" (${categorySlug})`
      )
      summary.skippedNoMatch++
      continue
    }

    if (pgPhoto.metadata !== null) {
      console.log(`[SKIP] Already has metadata: ${tursoPhoto.originalName}`)
      summary.skippedAlreadyHasMetadata++
      continue
    }

    await prisma.photo.update({
      where: { id: pgPhoto.id },
      data: { metadata: tursoPhoto.metadata as any }
    })

    console.log(`✓ ${tursoPhoto.originalName} -> ${pgPhoto.originalName}`)
    summary.updated++
  }

  return summary
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const env = parseEnvironment()

  const turso = createClient({
    url: env.tursoDatabaseUrl,
    authToken: env.tursoAuthToken
  })

  const adapter = new PrismaPg({ connectionString: env.databaseUrl })
  const prisma = new PrismaClient({ adapter })

  try {
    console.log('Fetching photos and categories from Turso...')

    const [tursoPhotos, categoryMap] = await Promise.all([
      fetchTursoPhotosWithMetadata(turso),
      fetchTursoCategoryMap(turso)
    ])

    console.log(
      `Found ${tursoPhotos.length} Turso photo(s) with metadata, ${categoryMap.size} categories\n`
    )

    if (tursoPhotos.length === 0) {
      console.log('No photos with metadata in Turso. Nothing to do.')
      return
    }

    const summary = await backfillMetadata(prisma, tursoPhotos, categoryMap)

    console.log(
      `\nUpdated ${summary.updated} / Skipped ${summary.skippedAlreadyHasMetadata} / No match ${summary.skippedNoMatch}`
    )
  } finally {
    turso.close()
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
