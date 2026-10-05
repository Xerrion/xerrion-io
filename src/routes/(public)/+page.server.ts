import type { PageServerLoad } from './$types'

import type { Photo } from '$lib/gallery'
import type { BlogPostCard } from '$lib/types/blog'
import { getPrisma } from '$lib/server/db'
import { mapRowToPhoto } from '$lib/server/gallery'
import { getR2Url } from '$lib/server/r2'

interface GalleryPreviews {
  galleryPhoto: Photo | null
  charliePhoto: Photo | null
  galleryError: string | null
}

async function loadLatestPosts(): Promise<BlogPostCard[]> {
  try {
    const prisma = getPrisma()
    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      include: { tags: { include: { tag: true } } }
    })

    const latestPosts: BlogPostCard[] = posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      coverUrl: post.coverR2Key ? getR2Url(post.coverR2Key) : null,
      readingTime: post.readingTime,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      tags: post.tags.map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug
      }))
    }))

    return latestPosts
  } catch {
    console.error('[home] Failed to load latest posts')
    return []
  }
}

async function loadGalleryPreviews(): Promise<GalleryPreviews> {
  try {
    const prisma = getPrisma()
    const query = {
      orderBy: [{ uploadedAt: 'desc' as const }, { id: 'desc' as const }],
      include: { sizes: true as const, category: { select: { slug: true as const } } }
    }
    const hasImage = { sizes: { some: {} } }
    const [galleryRows, charlieRows] = await Promise.all([
      prisma.photo.findMany({ ...query, take: 2, where: hasImage }),
      prisma.photo.findMany({ ...query, take: 1, where: { ...hasImage, category: { slug: 'charlie' } } })
    ])
    const charlieRow = charlieRows[0]
    const galleryRow = galleryRows.find((row) => row.id !== charlieRow?.id) ?? galleryRows[0]
    return {
      galleryPhoto: galleryRow ? mapRowToPhoto({ photo: galleryRow, category: galleryRow.category }) : null,
      charliePhoto: charlieRow ? mapRowToPhoto({ photo: charlieRow, category: charlieRow.category }) : null,
      galleryError: null
    }
  } catch {
    console.error('[home] Failed to load gallery previews')
    return { galleryPhoto: null, charliePhoto: null, galleryError: 'The gallery is temporarily unavailable.' }
  }
}

export const load: PageServerLoad = async () => {
  const [latestPosts, gallery] = await Promise.all([loadLatestPosts(), loadGalleryPreviews()])
  return { latestPosts, ...gallery }
}
