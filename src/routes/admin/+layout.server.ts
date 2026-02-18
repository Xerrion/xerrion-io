import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isLoginPage = url.pathname === '/admin/login';

	if (!locals.user && !isLoginPage) {
		redirect(302, '/admin/login');
	}

	if (locals.user && isLoginPage) {
		redirect(302, '/admin');
	}

	return {
		user: locals.user
	};
};
