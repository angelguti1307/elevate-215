import { error, json } from '@sveltejs/kit';
import { nameVariantService } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const record = await nameVariantService.nameVariants(params.schoolNumber);
	if (!record) error(404, 'Unknown school');
	return json(record);
};
