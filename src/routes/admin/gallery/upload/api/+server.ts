import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { put } from '@vercel/blob';
import { processImage, generateBlobPath } from '$lib/server/image';

const MAX_FILE_SIZE_50MB = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const data = await request.formData();
	const categoryId = Number(data.get('categoryId'));
	const file = data.get('file') as File | null;

	if (!categoryId) {
		error(400, 'Missing category');
	}

	if (!file || file.size === 0) {
		error(400, 'Missing file');
	}

	if (file.size > MAX_FILE_SIZE_50MB) {
		error(400, 'File too large (max 50MB)');
	}

	const ext = file.name.toLowerCase().split('.').pop() ?? '';
	if (!ALLOWED_EXTENSIONS.includes(ext)) {
		error(400, 'Unsupported file type');
	}

	const db = getDb();

	const catResult = await db.execute({
		sql: 'SELECT slug FROM category WHERE id = ?',
		args: [categoryId]
	});

	if (catResult.rows.length === 0) {
		error(400, 'Invalid category');
	}

	const categorySlug = catResult.rows[0].slug as string;

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

	return json({ success: true, name: file.name });
};
