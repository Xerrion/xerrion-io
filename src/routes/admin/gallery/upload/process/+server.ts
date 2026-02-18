import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { put, del } from '@vercel/blob';
import { processImage, generateBlobPath } from '$lib/server/image';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const token = env.BLOB_READ_WRITE_TOKEN;
	if (!token) {
		error(500, 'Blob storage not configured');
	}

	const { blobUrl, originalName, categoryId } = await request.json();

	if (!blobUrl || !originalName || !categoryId) {
		error(400, 'Missing required fields');
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

	const rawResponse = await fetch(blobUrl);
	if (!rawResponse.ok) {
		error(500, 'Failed to fetch uploaded file from blob storage');
	}

	const inputBuffer = Buffer.from(await rawResponse.arrayBuffer());
	const processed = await processImage(inputBuffer);

	const thumbPath = generateBlobPath(categorySlug, originalName, 'thumb');
	const mediumPath = generateBlobPath(categorySlug, originalName, 'medium');
	const fullPath = generateBlobPath(categorySlug, originalName, 'full');

	const [thumbBlob, mediumBlob, fullBlob] = await Promise.all([
		put(thumbPath, processed.thumb.buffer, { access: 'public', contentType: 'image/webp', token }),
		put(mediumPath, processed.medium.buffer, { access: 'public', contentType: 'image/webp', token }),
		put(fullPath, processed.full.buffer, { access: 'public', contentType: 'image/webp', token })
	]);

	await db.execute({
		sql: `INSERT INTO photo (category_id, original_name, blob_path, thumb_url, medium_url, full_url, width, height, file_size)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			categoryId,
			originalName,
			fullPath,
			thumbBlob.url,
			mediumBlob.url,
			fullBlob.url,
			processed.originalWidth,
			processed.originalHeight,
			inputBuffer.byteLength
		]
	});

	await del(blobUrl, { token }).catch(() => {});

	return json({ success: true, name: originalName });
};
