import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { superValidate, setError, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { categoryCreateSchema, categoryUpdateSchema } from '$lib/schemas/admin';

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
		})),
		createForm: await superValidate(zod4(categoryCreateSchema)),
		updateForm: await superValidate(zod4(categoryUpdateSchema))
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
		const form = await superValidate(request, zod4(categoryCreateSchema));

		if (!form.valid) {
			return fail(400, { createForm: form });
		}

		const { name, description, sortOrder } = form.data;

		const slug = toSlug(name);
		if (!slug) {
			return setError(form, 'name', 'Name must contain at least one letter or number');
		}

		const db = getDb();

		const existing = await db.execute({
			sql: 'SELECT id FROM category WHERE slug = ?',
			args: [slug]
		});

		if (existing.rows.length > 0) {
			return setError(form, 'name', `Category "${slug}" already exists`);
		}

		await db.execute({
			sql: 'INSERT INTO category (slug, name, description, sort_order) VALUES (?, ?, ?, ?)',
			args: [slug, name, description || null, sortOrder]
		});

		return message(form, 'Category created successfully');
	},

	update: async ({ request }) => {
		const form = await superValidate(request, zod4(categoryUpdateSchema));

		if (!form.valid) {
			return fail(400, { updateForm: form });
		}

		const { id, name, description, sortOrder } = form.data;

		const db = getDb();
		await db.execute({
			sql: 'UPDATE category SET name = ?, description = ?, sort_order = ? WHERE id = ?',
			args: [name, description || null, sortOrder, id]
		});

		return message(form, 'Category updated successfully');
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
