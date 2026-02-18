import type { PageServerLoad } from './$types';
import { list } from '@vercel/blob';
import {
	GALLERY_PREFIX,
	CATEGORY_CONFIG_FILE,
	isDisplayableImage,
	getFileName,
	slugToName,
	parseCategoryConfig,
	type PhotoCategory,
	type Photo
} from '$lib/gallery';

async function loadFromTurso(): Promise<{
	categories: PhotoCategory[];
	photosByCategory: Record<string, Photo[]>;
	totalPhotos: number;
} | null> {
	try {
		const { getDb } = await import('$lib/server/db');
		const db = getDb();

		const catResult = await db.execute(
			'SELECT id, slug, name, description, sort_order FROM category ORDER BY sort_order ASC'
		);

		if (catResult.rows.length === 0) return null;

		const categories: PhotoCategory[] = catResult.rows.map((row) => ({
			name: row.name as string,
			slug: row.slug as string,
			description: (row.description as string) || undefined,
			order: row.sort_order as number
		}));

		const photoResult = await db.execute(
			`SELECT p.id, p.original_name, p.thumb_url, p.medium_url, p.full_url,
					p.uploaded_at, c.slug as category_slug
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
				category: slug,
				createdAt: new Date(row.uploaded_at as string)
			});
		}

		const totalPhotos = photoResult.rows.length;
		return { categories, photosByCategory, totalPhotos };
	} catch {
		return null;
	}
}

async function loadFromBlob(): Promise<{
	categories: PhotoCategory[];
	photosByCategory: Record<string, Photo[]>;
	totalPhotos: number;
}> {
	const photosByCategory: Record<string, Photo[]> = {};
	const categories: PhotoCategory[] = [];
	let totalPhotos = 0;

	try {
		const root = await list({ prefix: GALLERY_PREFIX, mode: 'folded' });

		for (const folder of root.folders) {
			const slug = folder.replace(GALLERY_PREFIX, '').replace(/\/$/, '');
			if (!slug) continue;

			let photos: Photo[] = [];
			let configUrl: string | undefined;
			let cursor: string | undefined;
			let hasMore = true;

			while (hasMore) {
				const result = await list({ prefix: folder, cursor, limit: 1000 });

				for (const blob of result.blobs) {
					if (blob.size === 0) continue;

					if (getFileName(blob.pathname) === CATEGORY_CONFIG_FILE) {
						configUrl = blob.url;
						continue;
					}

					if (isDisplayableImage(blob.pathname)) {
						photos.push({
							id: blob.pathname,
							name: getFileName(blob.pathname),
							url: blob.url,
							category: slug,
							createdAt: blob.uploadedAt
						});
					}
				}

				hasMore = result.hasMore;
				cursor = result.cursor;
			}

			let name = slugToName(slug);
			let description: string | undefined;
			let order = categories.length;

			if (configUrl) {
				try {
					const response = await fetch(configUrl);
					const content = await response.text();
					const config = parseCategoryConfig(content);

					if (config.name) name = config.name;
					if (config.description) description = config.description;
					if (config.order !== undefined) order = config.order;
				} catch (error) {
					console.error(`Error reading config for ${slug}:`, error);
				}
			}

			categories.push({ name, slug, description, order });

			photos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			photosByCategory[slug] = photos;
			totalPhotos += photos.length;
		}

		categories.sort((a, b) => a.order - b.order);
	} catch (error) {
		console.error('Error fetching gallery from blob:', error);
	}

	return { categories, photosByCategory, totalPhotos };
}

export const load: PageServerLoad = async () => {
	const tursoData = await loadFromTurso();
	if (tursoData && tursoData.totalPhotos > 0) {
		return tursoData;
	}

	return loadFromBlob();
};
