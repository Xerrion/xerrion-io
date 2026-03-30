import type { Photo } from '$lib/gallery'
import type {
  Photo as DbPhoto,
  PhotoSize as DbPhotoSize,
  Category as DbCategory
} from '@prisma/client'

export interface PhotoWithSizes {
  photo: DbPhoto & { sizes: DbPhotoSize[] }
  category: Pick<DbCategory, 'slug'>
}

export interface ExtractedSizes {
  thumb: DbPhotoSize | undefined
  medium: DbPhotoSize | undefined
  full: DbPhotoSize | undefined
}

export function extractSizes(sizes: DbPhotoSize[]): ExtractedSizes {
  return {
    thumb: sizes.find((s) => s.size === 'thumb'),
    medium: sizes.find((s) => s.size === 'medium'),
    full: sizes.find((s) => s.size === 'full')
  }
}

export function mapRowToPhoto(row: PhotoWithSizes): Photo {
  const { thumb, medium, full } = extractSizes(row.photo.sizes)

  if (!full) {
    console.warn(
      `[gallery] Photo id=${row.photo.id} ("${row.photo.originalName}") is missing full-size variant`
    )
  }

  return {
    id: String(row.photo.id),
    name: row.photo.originalName,
    url: full?.url ?? '',
    thumbUrl: thumb?.url,
    mediumUrl: medium?.url,
    fullUrl: full?.url,
    width: full?.width ?? undefined,
    height: full?.height ?? undefined,
    category: row.category.slug,
    createdAt: row.photo.uploadedAt
  }
}
