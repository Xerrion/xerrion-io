import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';

const supabaseUrl = 'https://jgwqiaaobhyrdlajhmms.supabase.co';
const supabaseAnonKey = 'sb_publishable_uD-Htm1Jg9t2HiQaZI2s-A_99TbD6Je';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Photo category */
export interface PhotoCategory {
	name: string;
	slug: string;
	description?: string;
}

/** Photo item from Supabase Storage */
export interface Photo {
	id: string;
	name: string;
	url: string;
	category: string;
	createdAt: Date;
}

/** Default categories - folders in your Supabase Storage bucket */
export const photoCategories: PhotoCategory[] = [
	{ name: 'Charlie', slug: 'charlie', description: 'The goodest boy' },
	{ name: 'Life', slug: 'life', description: 'Random moments' },
	{ name: 'Food', slug: 'food', description: 'Things I ate' },
	{ name: 'Places', slug: 'places', description: 'Where I wandered' }
];

/** Get public URL for a file in storage */
export function getPublicUrl(bucket: string, path: string): string {
	const { data } = supabase.storage.from(bucket).getPublicUrl(path);
	return data.publicUrl;
}

/** List all photos from a category folder */
export async function getPhotosByCategory(
	bucket: string,
	category: string
): Promise<Photo[]> {
	const { data, error } = await supabase.storage.from(bucket).list(category, {
		limit: 100,
		sortBy: { column: 'created_at', order: 'desc' }
	});

	if (error) {
		console.error('Error fetching photos:', error);
		return [];
	}

	return (data || [])
		.filter((file) => !file.id.endsWith('/') && file.name !== '.emptyFolderPlaceholder')
		.map((file) => ({
			id: file.id,
			name: file.name,
			url: getPublicUrl(bucket, `${category}/${file.name}`),
			category,
			createdAt: new Date(file.created_at)
		}));
}

/** Get all photos from all categories */
export async function getAllPhotos(bucket: string): Promise<Photo[]> {
	const allPhotos: Photo[] = [];

	for (const category of photoCategories) {
		const photos = await getPhotosByCategory(bucket, category.slug);
		allPhotos.push(...photos);
	}

	return allPhotos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
