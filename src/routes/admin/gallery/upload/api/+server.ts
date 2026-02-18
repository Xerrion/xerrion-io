import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const body = (await request.json()) as HandleUploadBody;

	const jsonResponse = await handleUpload({
		body,
		request,
		onBeforeGenerateToken: async () => {
			return {
				allowedContentTypes: [
					'image/jpeg',
					'image/png',
					'image/webp',
					'image/heic',
					'image/heif'
				],
				addRandomSuffix: true,
				tokenPayload: JSON.stringify({ userId: locals.user!.id })
			};
		},
		onUploadCompleted: async () => {}
	});

	return json(jsonResponse);
};
