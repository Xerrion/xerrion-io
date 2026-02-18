import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const db = getDb();
	const result = await db.execute('SELECT * FROM category ORDER BY sort_order ASC');

	return {
		categories: result.rows.map((row) => ({
			id: row.id as number,
			slug: row.slug as string,
			name: row.name as string,
			description: row.description as string | null,
			sortOrder: row.sort_order as number,
			createdAt: row.created_at as string
		}))
	};
};

function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const sortOrder = Number(data.get('sortOrder') ?? 0);

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		const slug = toSlug(name);
		if (!slug) {
			return fail(400, { error: 'Name must contain at least one letter or number' });
		}

		const db = getDb();

		const existing = await db.execute({
			sql: 'SELECT id FROM category WHERE slug = ?',
			args: [slug]
		});

		if (existing.rows.length > 0) {
			return fail(409, { error: `Category "${slug}" already exists` });
		}

		await db.execute({
			sql: 'INSERT INTO category (slug, name, description, sort_order) VALUES (?, ?, ?, ?)',
			args: [slug, name, description, sortOrder]
		});

		return { success: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const name = data.get('name')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const sortOrder = Number(data.get('sortOrder') ?? 0);

		if (!id || !name) {
			return fail(400, { error: 'ID and name are required' });
		}

		const db = getDb();
		await db.execute({
			sql: 'UPDATE category SET name = ?, description = ?, sort_order = ? WHERE id = ?',
			args: [name, description, sortOrder, id]
		});

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));

		if (!id) {
			return fail(400, { error: 'Category ID is required' });
		}

		const db = getDb();

		const photos = await db.execute({
			sql: 'SELECT COUNT(*) as count FROM photo WHERE category_id = ?',
			args: [id]
		});

		const count = photos.rows[0].count as number;
		if (count > 0) {
			return fail(409, { error: `Cannot delete: category has ${count} photo(s). Delete photos first.` });
		}

		await db.execute({ sql: 'DELETE FROM category WHERE id = ?', args: [id] });

		return { success: true };
	}
};
