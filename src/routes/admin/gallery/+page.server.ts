import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { del } from '@vercel/blob';

export const load: PageServerLoad = async () => {
	const db = getDb();

	const [photosResult, categoriesResult] = await Promise.all([
		db.execute(`
			SELECT p.*, c.name as category_name, c.slug as category_slug
			FROM photo p
			JOIN category c ON p.category_id = c.id
			ORDER BY p.uploaded_at DESC
		`),
		db.execute('SELECT * FROM category ORDER BY sort_order ASC')
	]);

	return {
		photos: photosResult.rows.map((row) => ({
			id: row.id as number,
			categoryId: row.category_id as number,
			categoryName: row.category_name as string,
			categorySlug: row.category_slug as string,
			originalName: row.original_name as string,
			thumbUrl: row.thumb_url as string,
			mediumUrl: row.medium_url as string,
			fullUrl: row.full_url as string,
			width: row.width as number | null,
			height: row.height as number | null,
			fileSize: row.file_size as number | null,
			uploadedAt: row.uploaded_at as string
		})),
		categories: categoriesResult.rows.map((row) => ({
			id: row.id as number,
			slug: row.slug as string,
			name: row.name as string,
			description: row.description as string | null,
			sortOrder: row.sort_order as number
		}))
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const photoId = data.get('photoId')?.toString();

		if (!photoId) {
			return fail(400, { error: 'Photo ID is required' });
		}

		const db = getDb();

		const result = await db.execute({
			sql: 'SELECT blob_path, thumb_url, medium_url, full_url FROM photo WHERE id = ?',
			args: [Number(photoId)]
		});

		if (result.rows.length === 0) {
			return fail(404, { error: 'Photo not found' });
		}

		const photo = result.rows[0];
		const urlsToDelete = [
			photo.thumb_url as string,
			photo.medium_url as string,
			photo.full_url as string
		].filter(Boolean);

		await Promise.all([
			del(urlsToDelete),
			db.execute({ sql: 'DELETE FROM photo WHERE id = ?', args: [Number(photoId)] })
		]);

		return { success: true };
	}
};
