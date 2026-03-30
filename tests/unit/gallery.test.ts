import { describe, test, expect, mock } from 'bun:test'
import type { PhotoWithSizes } from '$lib/server/gallery'

// Mock R2_PUBLIC_URL for getR2Url derivation
const R2_PUBLIC_URL = 'https://pub-371d85115c2944799b7b432c262540fb.r2.dev'

mock.module('$env/dynamic/private', () => ({
  env: { R2_PUBLIC_URL }
}))

const { mapRowToPhoto } = await import('$lib/server/gallery')

describe('mapRowToPhoto', () => {
  const fullRow: PhotoWithSizes = {
    photo: {
      id: 42,
      categoryId: 1,
      originalName: 'sunset.jpg',
      metadata: null,
      uploadedAt: new Date('2024-06-15T12:00:00Z'),
      sizes: [
        {
          id: 1,
          photoId: 42,
          size: 'thumb',
          r2Key: 'gallery/nature/sunset-abc-thumb.webp',
          width: 400,
          height: 225,
          byteSize: 12000
        },
        {
          id: 2,
          photoId: 42,
          size: 'medium',
          r2Key: 'gallery/nature/sunset-abc-medium.webp',
          width: 1200,
          height: 675,
          byteSize: 85000
        },
        {
          id: 3,
          photoId: 42,
          size: 'full',
          r2Key: 'gallery/nature/sunset-abc-full.webp',
          width: 1920,
          height: 1080,
          byteSize: 250000
        }
      ]
    },
    category: { slug: 'nature' }
  }

  test('maps all fields correctly from Prisma row', () => {
    const photo = mapRowToPhoto(fullRow)

    expect(photo.id).toBe('42')
    expect(photo.name).toBe('sunset.jpg')
    expect(photo.thumbUrl).toBe(
      `${R2_PUBLIC_URL}/gallery/nature/sunset-abc-thumb.webp`
    )
    expect(photo.mediumUrl).toBe(
      `${R2_PUBLIC_URL}/gallery/nature/sunset-abc-medium.webp`
    )
    expect(photo.fullUrl).toBe(
      `${R2_PUBLIC_URL}/gallery/nature/sunset-abc-full.webp`
    )
    expect(photo.width).toBe(1920)
    expect(photo.height).toBe(1080)
    expect(photo.category).toBe('nature')
  })

  test('converts id to string', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(typeof photo.id).toBe('string')
    expect(photo.id).toBe('42')
  })

  test('converts uploadedAt to Date', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(photo.createdAt).toBeInstanceOf(Date)
    expect(photo.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z')
  })

  test('fullUrl derives from full-size r2Key', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(photo.fullUrl).toBe(
      `${R2_PUBLIC_URL}/gallery/nature/sunset-abc-full.webp`
    )
  })

  test('width and height come from full size', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(photo.width).toBe(1920)
    expect(photo.height).toBe(1080)
  })

  test('optional fields are undefined when sizes are missing', () => {
    const minimalRow: PhotoWithSizes = {
      photo: {
        id: 1,
        categoryId: 2,
        originalName: 'test.jpg',
        metadata: null,
        uploadedAt: new Date('2024-01-01T00:00:00Z'),
        sizes: []
      },
      category: { slug: 'misc' }
    }

    const photo = mapRowToPhoto(minimalRow)
    expect(photo.thumbUrl).toBeUndefined()
    expect(photo.mediumUrl).toBeUndefined()
    expect(photo.fullUrl).toBeUndefined()
    expect(photo.width).toBeUndefined()
    expect(photo.height).toBeUndefined()
  })

  test('optional size fields derive URLs when present', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(photo.thumbUrl).toBe(
      `${R2_PUBLIC_URL}/gallery/nature/sunset-abc-thumb.webp`
    )
    expect(photo.mediumUrl).toBe(
      `${R2_PUBLIC_URL}/gallery/nature/sunset-abc-medium.webp`
    )
    expect(photo.width).toBe(1920)
    expect(photo.height).toBe(1080)
  })
})
