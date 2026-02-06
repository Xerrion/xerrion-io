import type { PageServerLoad } from './$types';
import { supabase, photoCategories, type Photo } from '$lib/supabase';

const BUCKET_NAME = 'gallery'; // Change this to your actual bucket name

export const load: PageServerLoad = async () => {
	const photosByCategory: Record<string, Photo[]> = {};
	let totalPhotos = 0;

	for (const category of photoCategories) {
		const { data, error } = await supabase.storage
			.from(BUCKET_NAME)
			.list(category.slug, {
				limit: 100,
				sortBy: { column: 'created_at', order: 'desc' }
			});

		if (error) {
			console.error(`Error fetching ${category.slug}:`, error);
			photosByCategory[category.slug] = [];
			continue;
		}

		const photos = (data || [])
			.filter((file) => {
				// Filter out folders and placeholder files
				const isFolder = file.id === null || file.name.endsWith('/');
				const isPlaceholder = file.name === '.emptyFolderPlaceholder';
				const isImage = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file.name);
				return !isFolder && !isPlaceholder && isImage;
			})
			.map((file) => {
				const { data: urlData } = supabase.storage
					.from(BUCKET_NAME)
					.getPublicUrl(`${category.slug}/${file.name}`);

				return {
					id: file.id || file.name,
					name: file.name,
					url: urlData.publicUrl,
					category: category.slug,
					createdAt: new Date(file.created_at || Date.now())
				};
			});

		photosByCategory[category.slug] = photos;
		totalPhotos += photos.length;
	}

	return {
		categories: photoCategories,
		photosByCategory,
		totalPhotos
	};
};
