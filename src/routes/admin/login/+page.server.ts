import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { verifyPassword, createSession, deleteSession } from '$lib/server/auth';

const SESSION_COOKIE = 'session';

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required', username });
		}

		const db = getDb();
		const result = await db.execute({
			sql: 'SELECT id, username, password_hash FROM admin_user WHERE username = ?',
			args: [username]
		});

		if (result.rows.length === 0) {
			return fail(401, { error: 'Invalid credentials', username });
		}

		const user = result.rows[0];
		const valid = await verifyPassword(user.password_hash as string, password);

		if (!valid) {
			return fail(401, { error: 'Invalid credentials', username });
		}

		const sessionId = await createSession(user.id as number);

		cookies.set(SESSION_COOKIE, sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60
		});

		redirect(302, '/admin');
	},

	logout: async ({ cookies, locals }) => {
		const sessionId = locals.sessionId;
		if (sessionId) {
			await deleteSession(sessionId);
		}

		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(302, '/admin/login');
	}
};
