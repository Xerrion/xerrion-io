import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { put } from '@vercel/blob';
import { processImage, generateBlobPath } from '$lib/server/image';

const MAX_FILE_SIZE_50MB = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif'
];

export const load: PageServerLoad = async () => {
	const db = getDb();
	const result = await db.execute('SELECT id, slug, name FROM category ORDER BY sort_order ASC');

	return {
		categories: result.rows.map((row) => ({
			id: row.id as number,
			slug: row.slug as string,
			name: row.name as string
		}))
	};
};

export const actions: Actions = {
	upload: async ({ request }) => {
		const data = await request.formData();
		const categoryId = Number(data.get('categoryId'));
		const files = data.getAll('files') as File[];

		if (!categoryId) {
			return fail(400, { error: 'Please select a category' });
		}

		if (files.length === 0 || (files.length === 1 && files[0].size === 0)) {
			return fail(400, { error: 'Please select at least one file' });
		}

		const db = getDb();

		const catResult = await db.execute({
			sql: 'SELECT slug FROM category WHERE id = ?',
			args: [categoryId]
		});

		if (catResult.rows.length === 0) {
			return fail(400, { error: 'Invalid category' });
		}

		const categorySlug = catResult.rows[0].slug as string;
		const results: { name: string; success: boolean; error?: string }[] = [];

		for (const file of files) {
			try {
				if (file.size > MAX_FILE_SIZE_50MB) {
					results.push({ name: file.name, success: false, error: 'File too large (max 50MB)' });
					continue;
				}

				const isHeicFile = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
				if (!ALLOWED_TYPES.includes(file.type) && !isHeicFile) {
					results.push({ name: file.name, success: false, error: 'Unsupported file type' });
					continue;
				}

				const inputBuffer = Buffer.from(await file.arrayBuffer());
				const processed = await processImage(inputBuffer);

				const thumbPath = generateBlobPath(categorySlug, file.name, 'thumb');
				const mediumPath = generateBlobPath(categorySlug, file.name, 'medium');
				const fullPath = generateBlobPath(categorySlug, file.name, 'full');

				const [thumbBlob, mediumBlob, fullBlob] = await Promise.all([
					put(thumbPath, processed.thumb.buffer, { access: 'public', contentType: 'image/webp' }),
					put(mediumPath, processed.medium.buffer, { access: 'public', contentType: 'image/webp' }),
					put(fullPath, processed.full.buffer, { access: 'public', contentType: 'image/webp' })
				]);

				await db.execute({
					sql: `INSERT INTO photo (category_id, original_name, blob_path, thumb_url, medium_url, full_url, width, height, file_size)
						  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					args: [
						categoryId,
						file.name,
						fullPath,
						thumbBlob.url,
						mediumBlob.url,
						fullBlob.url,
						processed.originalWidth,
						processed.originalHeight,
						file.size
					]
				});

				results.push({ name: file.name, success: true });
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				results.push({ name: file.name, success: false, error: message });
			}
		}

		const successCount = results.filter((r) => r.success).length;
		const failCount = results.filter((r) => !r.success).length;

		return {
			results,
			summary: {
				total: results.length,
				success: successCount,
				failed: failCount
			}
		};
	}
};
