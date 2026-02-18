import type { PageServerLoad } from './$types';
import { list } from '@vercel/blob';
import {
	GALLERY_PREFIX,
	isDisplayableImage,
	getFileName,
	slugToName,
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

			categories.push({ name: slugToName(slug), slug });

			// Fetch all photos in this category
			let photos: Photo[] = [];
			let cursor: string | undefined;
			let hasMore = true;

			while (hasMore) {
				const result = await list({ prefix: folder, cursor, limit: 1000 });

				const batch = result.blobs
					.filter((blob) => blob.size > 0 && isDisplayableImage(blob.pathname))
					.map((blob) => ({
						id: blob.pathname,
						name: getFileName(blob.pathname),
						url: blob.url,
						category: slug,
						createdAt: blob.uploadedAt
					}));

				photos.push(...batch);
				hasMore = result.hasMore;
				cursor = result.cursor;
			}

			photos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			photosByCategory[slug] = photos;
			totalPhotos += photos.length;
		}
	} catch (error) {
		console.error('Error fetching gallery:', error);
	}

	return {
		categories,
		photosByCategory,
		totalPhotos
	};
};
