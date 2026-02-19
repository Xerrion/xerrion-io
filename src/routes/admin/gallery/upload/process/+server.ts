import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { put, del } from '@vercel/blob';
import { processImage, generateBlobPath } from '$lib/server/image';
import type { ProcessingStep } from '$lib/server/image';
import { env } from '$env/dynamic/private';

type StreamStep =
	| ProcessingStep
	| 'fetching'
	| 'uploading:thumb'
	| 'uploading:medium'
	| 'uploading:full'
	| 'saving'
	| 'cleanup'
	| 'done';

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

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			function send(step: StreamStep, data?: Record<string, unknown>) {
				const payload = JSON.stringify({ step, ...data });
				controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
			}

			try {
				const db = getDb();

				const catResult = await db.execute({
					sql: 'SELECT slug FROM category WHERE id = ?',
					args: [categoryId]
				});

				if (catResult.rows.length === 0) {
					send('done', { error: 'Invalid category' });
					controller.close();
					return;
				}

				const categorySlug = catResult.rows[0].slug as string;

				send('fetching');
				const rawResponse = await fetch(blobUrl);
				if (!rawResponse.ok) {
					send('done', { error: 'Failed to fetch uploaded file' });
					controller.close();
					return;
				}

				const inputBuffer = Buffer.from(await rawResponse.arrayBuffer());

				const processed = await processImage(inputBuffer, (step: ProcessingStep) => {
					send(step);
				});

				const thumbPath = generateBlobPath(categorySlug, originalName, 'thumb');
				const mediumPath = generateBlobPath(categorySlug, originalName, 'medium');
				const fullPath = generateBlobPath(categorySlug, originalName, 'full');

				send('uploading:thumb');
				const thumbBlob = await put(thumbPath, processed.thumb.buffer, {
					access: 'public',
					contentType: 'image/webp',
					token
				});

				send('uploading:medium');
				const mediumBlob = await put(mediumPath, processed.medium.buffer, {
					access: 'public',
					contentType: 'image/webp',
					token
				});

				send('uploading:full');
				const fullBlob = await put(fullPath, processed.full.buffer, {
					access: 'public',
					contentType: 'image/webp',
					token
				});

				send('saving');
				await db.execute({
					sql: `INSERT INTO photo (category_id, original_name, blob_path, thumb_url, medium_url, full_url, width, height, thumb_size, medium_size, full_size, metadata)
						  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					args: [
						categoryId,
						originalName,
						fullPath,
						thumbBlob.url,
						mediumBlob.url,
						fullBlob.url,
						processed.originalWidth,
						processed.originalHeight,
						processed.thumb.byteLength,
						processed.medium.byteLength,
						processed.full.byteLength,
						JSON.stringify(processed.metadata)
					]
				});

				send('cleanup');
				await del(blobUrl, { token }).catch(() => {});

				send('done', { success: true, name: originalName });
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Processing failed';
				send('done', { error: message });
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
