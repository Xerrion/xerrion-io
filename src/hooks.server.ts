import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';

const SESSION_COOKIE = 'session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.sessionId = null;

	const sessionId = event.cookies.get(SESSION_COOKIE);

	if (sessionId) {
		const user = await validateSession(sessionId);
		if (user) {
			event.locals.user = user;
			event.locals.sessionId = sessionId;
		} else {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	const response = await resolve(event);

	if (event.url.pathname.startsWith('/admin')) {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}

	return response;
};
