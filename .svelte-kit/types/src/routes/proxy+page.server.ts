// @ts-nocheck
import { fail } from '@sveltejs/kit';
import { schoolStore, visitService } from '$lib/server/db';
import { todayLocal, ValidationError } from '$lib/server/visits';
import type { Actions, PageServerLoad } from './$types';

export const load = async ({ url }: Parameters<PageServerLoad>[0]) => {
	const school = url.searchParams.get('school') ?? '';
	return {
		schools: await schoolStore.list(),
		today: todayLocal(),
		selected: school,
		latest: school ? ((await visitService.latestVisit(school)) ?? null) : null
	};
};

export const actions = {
	add: async ({ request }: import('./$types').RequestEvent) => {
		const form = await request.formData();
		const input = {
			schoolNumber: String(form.get('schoolNumber') ?? ''),
			visitDate: String(form.get('visitDate') ?? ''),
			noteText: String(form.get('noteText') ?? '')
		};
		try {
			await visitService.addVisit(input);
		} catch (e) {
			if (e instanceof ValidationError) return fail(400, { error: e.message, ...input });
			throw e;
		}
		return { saved: true };
	}
};
;null as any as Actions;