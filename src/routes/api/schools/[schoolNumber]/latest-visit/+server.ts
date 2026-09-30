import { error, json } from '@sveltejs/kit';
import { visitService } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const record = await visitService.latestVisit(params.schoolNumber);
	if (record === undefined) error(404, 'Unknown school');
	if (record === null) error(404, 'No visits recorded for this school');
	return json(record);
};
