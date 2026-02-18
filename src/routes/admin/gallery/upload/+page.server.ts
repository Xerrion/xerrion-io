import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';

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
