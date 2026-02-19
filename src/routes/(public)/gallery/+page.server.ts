import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import type { PhotoCategory, Photo } from '$lib/gallery';

export const load: PageServerLoad = async () => {
	try {
		const db = getDb();

		const catResult = await db.execute(
			'SELECT id, slug, name, description, sort_order FROM category ORDER BY sort_order ASC'
		);

		const categories: PhotoCategory[] = catResult.rows.map((row) => ({
			name: row.name as string,
			slug: row.slug as string,
			description: (row.description as string) || undefined,
			order: row.sort_order as number
		}));

		const photoResult = await db.execute(
			`SELECT p.id, p.original_name, p.thumb_url, p.medium_url, p.full_url,
					p.width, p.height, p.uploaded_at, c.slug as category_slug
			 FROM photo p
			 JOIN category c ON p.category_id = c.id
			 ORDER BY p.uploaded_at DESC`
		);

		const photosByCategory: Record<string, Photo[]> = {};
		for (const cat of categories) {
			photosByCategory[cat.slug] = [];
		}

		for (const row of photoResult.rows) {
			const slug = row.category_slug as string;
			if (!photosByCategory[slug]) photosByCategory[slug] = [];

			photosByCategory[slug].push({
				id: String(row.id),
				name: row.original_name as string,
				url: row.full_url as string,
				thumbUrl: row.thumb_url as string,
				mediumUrl: row.medium_url as string,
				fullUrl: row.full_url as string,
				width: row.width as number | undefined,
				height: row.height as number | undefined,
				category: slug,
				createdAt: new Date(row.uploaded_at as string)
			});
		}

		const totalPhotos = photoResult.rows.length;
		return { categories, photosByCategory, totalPhotos, error: null };
	} catch (err) {
		console.error('[gallery] Failed to load from Turso:', err);
		return { categories: [], photosByCategory: {}, totalPhotos: 0, error: 'Failed to load gallery' };
	}
};
