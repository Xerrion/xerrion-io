import { randomSuffix } from '$lib/server/image'

/**
 * Calculate estimated reading time in minutes.
 * Uses 200 words per minute average. Minimum 1 minute.
 */
export function calculateReadingTime(content: string): number {
  const trimmed = content.trim()
  if (!trimmed) return 1
  return Math.max(1, Math.round(trimmed.split(/\s+/).length / 200))
}

/**
 * Generate R2 object keys for a blog post cover image.
 * Returns keys for medium (1200px) and full (2400px) variants.
 */
export function generateCoverR2Keys(slug: string): {
  medium: string
  full: string
} {
  const suffix = randomSuffix()
  return {
    medium: `blog/${slug}-${suffix}-medium.webp`,
    full: `blog/${slug}-${suffix}-full.webp`
  }
}
