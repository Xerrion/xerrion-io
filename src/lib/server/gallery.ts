import type { Photo } from '$lib/gallery';

/**
 * Maps a database row to a Photo object.
 * Used consistently across gallery endpoints to ensure data shape matches the Photo interface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRowToPhoto(row: any): Photo {
	return {
		id: String(row.id),
		name: row.original_name as string,
		url: row.full_url as string,
		thumbUrl: row.thumb_url as string | undefined,
		mediumUrl: row.medium_url as string | undefined,
		fullUrl: row.full_url as string,
		width: row.width as number | undefined,
		height: row.height as number | undefined,
		category: row.category_slug as string,
		createdAt: new Date(row.uploaded_at as string)
	};
}
