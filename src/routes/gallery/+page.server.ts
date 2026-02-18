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

export const load: PageServerLoad = async () => {
	const photosByCategory: Record<string, Photo[]> = {};
	const categories: PhotoCategory[] = [];
	let totalPhotos = 0;

	try {
		// Discover category folders dynamically
		const root = await list({ prefix: GALLERY_PREFIX, mode: 'folded' });

		for (const folder of root.folders) {
			// folder looks like "gallery/charlie/"
			const slug = folder.replace(GALLERY_PREFIX, '').replace(/\/$/, '');
			if (!slug) continue;

			// Fetch all blobs in this category (includes config + images)
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

			// Parse category config if found, otherwise use defaults
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

		// Sort categories by order
		categories.sort((a, b) => a.order - b.order);
	} catch (error) {
		console.error('Error fetching gallery:', error);
	}

	return {
		categories,
		photosByCategory,
		totalPhotos
	};
};
