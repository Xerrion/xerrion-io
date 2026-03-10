import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { mapRowToPhoto } from '$lib/server/gallery';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const category = url.searchParams.get('category');
		let offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
		let limit = Number(url.searchParams.get('limit'));

		if (Number.isNaN(limit) || limit < 1) limit = 20;
		limit = Math.min(limit, 50); // Hard maximum

		const db = getDb();

		let query = `
			SELECT p.id, p.original_name, p.thumb_url, p.medium_url, p.full_url,
					p.width, p.height, p.uploaded_at, c.slug as category_slug
			FROM photo p
			JOIN category c ON p.category_id = c.id
		`;

		const params: (string | number)[] = [];

		if (category) {
			query += ` WHERE c.slug = ?`;
			params.push(category);
		}

		query += ` ORDER BY p.uploaded_at DESC LIMIT ? OFFSET ?`;
		params.push(limit, offset);

		const result = await db.execute({ sql: query, args: params });

		const photos = result.rows.map(mapRowToPhoto);

		return json({ photos });
	} catch (err) {
		console.error('[api/gallery/photos] Failed to fetch photos:', err);
		return json({ error: 'Failed to fetch photos', photos: [] }, { status: 500 });
	}
};
