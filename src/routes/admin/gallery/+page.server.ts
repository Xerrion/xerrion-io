import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { del } from '@vercel/blob';
import { env } from '$env/dynamic/private';

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
			del(urlsToDelete, { token: env.BLOB_READ_WRITE_TOKEN }),
			db.execute({ sql: 'DELETE FROM photo WHERE id = ?', args: [Number(photoId)] })
		]);

		return { success: true };
	},

	deleteMany: async ({ request }) => {
		const data = await request.formData();
		const idsRaw = data.get('photoIds')?.toString();

		if (!idsRaw) {
			return fail(400, { error: 'No photos selected' });
		}

		const ids = idsRaw
			.split(',')
			.map((id) => Number(id.trim()))
			.filter((id) => !isNaN(id) && id > 0);

		if (ids.length === 0) {
			return fail(400, { error: 'No valid photo IDs provided' });
		}

		const db = getDb();
		const token = env.BLOB_READ_WRITE_TOKEN;

		const placeholders = ids.map(() => '?').join(',');
		const result = await db.execute({
			sql: `SELECT id, thumb_url, medium_url, full_url FROM photo WHERE id IN (${placeholders})`,
			args: ids
		});

		if (result.rows.length === 0) {
			return fail(404, { error: 'No photos found' });
		}

		const allBlobUrls = result.rows.flatMap((row) =>
			[row.thumb_url as string, row.medium_url as string, row.full_url as string].filter(Boolean)
		);

		const foundIds = result.rows.map((row) => row.id as number);
		const deletePlaceholders = foundIds.map(() => '?').join(',');

		await Promise.all([
			del(allBlobUrls, { token }),
			db.execute({
				sql: `DELETE FROM photo WHERE id IN (${deletePlaceholders})`,
				args: foundIds
			})
		]);

		return { success: true, deletedCount: foundIds.length };
	}
};
