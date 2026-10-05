import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import type { PhotoWithSizes } from '$lib/server/gallery'

type GalleryRow = PhotoWithSizes['photo'] & { category: { slug: string } }
const publicUrl = 'https://pub-371d85115c2944799b7b432c262540fb.r2.dev'
const findPosts = mock(() => Promise.resolve([] as object[]))
const findPhotos = mock(() => Promise.resolve([] as GalleryRow[]))

mock.module('$env/dynamic/private', () => ({ env: { R2_PUBLIC_URL: publicUrl } }))
mock.module('$lib/server/db', () => ({
  getPrisma: () => ({ post: { findMany: findPosts }, photo: { findMany: findPhotos } })
}))

const { load } = await import('../../src/routes/(public)/+page.server')
const event = {} as Parameters<typeof load>[0]

function photoRow(id: number, category: string): GalleryRow {
  return {
    id,
    categoryId: 1,
    category: { slug: category },
    originalName: `photo-${id}.jpg`,
    metadata: null,
    uploadedAt: new Date('2026-10-05T12:00:00Z'),
    sizes: [
      { id: id * 10, photoId: id, size: 'medium', r2Key: `gallery/${category}/${id}-medium.webp`, width: 800, height: 600, byteSize: 100 },
      { id: id * 10 + 1, photoId: id, size: 'full', r2Key: `gallery/${category}/${id}-full.webp`, width: 1600, height: 1200, byteSize: 200 }
    ]
  }
}

describe('Home gallery loading', () => {
  beforeEach(() => {
    findPosts.mockReset().mockImplementation(() => Promise.resolve([]))
    findPhotos.mockReset().mockImplementation(() => Promise.resolve([]))
    spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => mock.restore())

  test('loads the latest gallery and Charlie photos with a stable order and existing URL mapping', async () => {
    findPhotos.mockResolvedValueOnce([photoRow(20, 'nature')]).mockResolvedValueOnce([photoRow(19, 'charlie')])

    const result = await load(event)

    expect(findPhotos).toHaveBeenNthCalledWith(1, {
      where: { sizes: { some: {} } },
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      take: 2,
      include: { sizes: true, category: { select: { slug: true } } }
    })
    expect(findPhotos).toHaveBeenNthCalledWith(2, {
      where: { sizes: { some: {} }, category: { slug: 'charlie' } },
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      take: 1,
      include: { sizes: true, category: { select: { slug: true } } }
    })
    expect(result).toMatchObject({
      galleryPhoto: { id: '20', category: 'nature', mediumUrl: `${publicUrl}/gallery/nature/20-medium.webp` },
      charliePhoto: { id: '19', category: 'charlie', mediumUrl: `${publicUrl}/gallery/charlie/19-medium.webp` },
      galleryError: null
    })
  })

  test('avoids repeating the Charlie portrait when another recent gallery photo exists', async () => {
    const newestCharlie = photoRow(20, 'charlie')
    findPhotos.mockResolvedValueOnce([newestCharlie, photoRow(19, 'charlie')]).mockResolvedValueOnce([newestCharlie])

    expect(await load(event)).toMatchObject({
      galleryPhoto: { id: '19' },
      charliePhoto: { id: '20' },
      galleryError: null
    })
  })

  test('uses the only available photo for both positions when the gallery contains one photo', async () => {
    const onlyPhoto = photoRow(20, 'charlie')
    findPhotos.mockResolvedValueOnce([onlyPhoto]).mockResolvedValueOnce([onlyPhoto])

    expect(await load(event)).toMatchObject({
      galleryPhoto: { id: '20' },
      charliePhoto: { id: '20' },
      galleryError: null
    })
  })

  test('returns an empty gallery without placeholder photos', async () => {
    expect(await load(event)).toEqual({ latestPosts: [], galleryPhoto: null, charliePhoto: null, galleryError: null })
  })

  test('keeps gallery photos when the blog query fails', async () => {
    findPosts.mockRejectedValueOnce(new Error('Test database error'))
    findPhotos.mockResolvedValueOnce([photoRow(20, 'nature')])

    expect(await load(event)).toMatchObject({ latestPosts: [], galleryPhoto: { id: '20' }, galleryError: null })
    expect(console.error).toHaveBeenCalledWith('[home] Failed to load latest posts')
  })

  test('keeps published posts when the gallery query fails', async () => {
    findPosts.mockResolvedValueOnce([{ id: 1, slug: 'test-post', title: 'Test post', description: null, coverR2Key: null, readingTime: 1, publishedAt: new Date('2026-10-04'), tags: [] }])
    findPhotos.mockRejectedValueOnce(new Error('Test database error'))

    expect(await load(event)).toMatchObject({ latestPosts: [{ slug: 'test-post' }], galleryPhoto: null, charliePhoto: null, galleryError: 'The gallery is temporarily unavailable.' })
    expect(console.error).toHaveBeenCalledWith('[home] Failed to load gallery previews')
  })
})
