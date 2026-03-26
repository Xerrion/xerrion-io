import { describe, test, expect } from 'bun:test'

import { mapRowToPhoto } from '$lib/server/gallery'

describe('mapRowToPhoto', () => {
  const fullRow = {
    id: 42,
    original_name: 'sunset.jpg',
    full_url: 'https://blob.example.com/gallery/nature/sunset-abc-full.webp',
    thumb_url: 'https://blob.example.com/gallery/nature/sunset-abc-thumb.webp',
    medium_url:
      'https://blob.example.com/gallery/nature/sunset-abc-medium.webp',
    width: 1920,
    height: 1080,
    category_slug: 'nature',
    uploaded_at: '2024-06-15T12:00:00Z'
  }

  test('maps all fields correctly from DB row', () => {
    const photo = mapRowToPhoto(fullRow)

    expect(photo.id).toBe('42')
    expect(photo.name).toBe('sunset.jpg')
    expect(photo.url).toBe(fullRow.full_url)
    expect(photo.thumbUrl).toBe(fullRow.thumb_url)
    expect(photo.mediumUrl).toBe(fullRow.medium_url)
    expect(photo.fullUrl).toBe(fullRow.full_url)
    expect(photo.width).toBe(1920)
    expect(photo.height).toBe(1080)
    expect(photo.category).toBe('nature')
  })

  test('converts id to string', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(typeof photo.id).toBe('string')
    expect(photo.id).toBe('42')
  })

  test('converts uploaded_at to Date', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(photo.createdAt).toBeInstanceOf(Date)
    expect(photo.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z')
  })

  test('url and fullUrl both map to row.full_url', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(photo.url).toBe(photo.fullUrl as string)
    expect(photo.url).toBe(fullRow.full_url)
  })

  test('optional fields can be undefined', () => {
    const minimalRow = {
      id: 1,
      original_name: 'test.jpg',
      full_url: 'https://example.com/test.webp',
      thumb_url: undefined,
      medium_url: undefined,
      width: undefined,
      height: undefined,
      category_slug: 'misc',
      uploaded_at: '2024-01-01T00:00:00Z'
    }

    const photo = mapRowToPhoto(minimalRow)
    expect(photo.thumbUrl).toBeUndefined()
    expect(photo.mediumUrl).toBeUndefined()
    expect(photo.width).toBeUndefined()
    expect(photo.height).toBeUndefined()
  })

  test('optional fields pass through when present', () => {
    const photo = mapRowToPhoto(fullRow)
    expect(photo.thumbUrl).toBe(fullRow.thumb_url)
    expect(photo.mediumUrl).toBe(fullRow.medium_url)
    expect(photo.width).toBe(1920)
    expect(photo.height).toBe(1080)
  })
})
