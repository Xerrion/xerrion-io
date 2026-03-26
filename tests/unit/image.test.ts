import { describe, test, expect } from 'bun:test'

import { generateBlobPath, randomSuffix } from '$lib/server/image'
import type { SizeKey } from '$lib/server/image'

describe('generateBlobPath', () => {
  test('generates correct basic path', () => {
    const result = generateBlobPath('nature', 'photo.jpg', 'thumb', 'abc123')
    expect(result).toBe('gallery/nature/photo-abc123-thumb.webp')
  })

  test('strips file extension from baseName', () => {
    const result = generateBlobPath('urban', 'cityscape.png', 'full', 'xyz')
    expect(result).toBe('gallery/urban/cityscape-xyz-full.webp')
  })

  test('sanitizes special characters to underscores', () => {
    const result = generateBlobPath(
      'nature',
      'my photo (1).jpg',
      'medium',
      'abc'
    )
    expect(result).toBe('gallery/nature/my_photo__1_-abc-medium.webp')
  })

  test('lowercases the baseName', () => {
    const result = generateBlobPath('nature', 'MyPhoto.JPG', 'thumb', 'abc')
    expect(result).toBe('gallery/nature/myphoto-abc-thumb.webp')
  })

  test('handles baseName with multiple dots', () => {
    const result = generateBlobPath(
      'nature',
      'my.photo.file.jpg',
      'full',
      'abc'
    )
    // .replace(/\.[^.]+$/, '') removes the last .extension only
    expect(result).toBe('gallery/nature/my_photo_file-abc-full.webp')
  })

  test('works with all size keys', () => {
    const sizes = ['thumb', 'medium', 'full'] as const
    for (const size of sizes) {
      const result = generateBlobPath('cat', 'test.jpg', size, 'sfx')
      expect(result).toBe(`gallery/cat/test-sfx-${size}.webp`)
    }
  })

  test('category slug passes through as-is', () => {
    const result = generateBlobPath('my-category', 'test.jpg', 'thumb', 'abc')
    expect(result).toBe('gallery/my-category/test-abc-thumb.webp')
  })
})

describe('randomSuffix', () => {
  test('returns a string', () => {
    const result = randomSuffix()
    expect(typeof result).toBe('string')
  })

  test('returns a string of 6 characters', () => {
    const result = randomSuffix()
    expect(result).toHaveLength(6)
  })

  test('contains only alphanumeric characters (base36)', () => {
    const result = randomSuffix()
    expect(result).toMatch(/^[0-9a-z]{6}$/)
  })

  test('multiple calls produce different results', () => {
    const results = new Set(Array.from({ length: 10 }, () => randomSuffix()))
    // With 36^6 possible values, collisions are extremely unlikely
    expect(results.size).toBeGreaterThan(1)
  })
})
