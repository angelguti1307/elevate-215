import { fail } from '@sveltejs/kit';
import { nameVariantService, schoolStore, visitService } from '$lib/server/db';
import { todayLocal, ValidationError } from '$lib/server/visits';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const school = url.searchParams.get('school') ?? '';
	const names = url.searchParams.get('names') ?? '';
	return {
		schools: await schoolStore.list(),
		today: todayLocal(),
		selected: school,
		latest: school ? ((await visitService.latestVisit(school)) ?? null) : null,
		namesSelected: names,
		variants: names ? ((await nameVariantService.nameVariants(names)) ?? null) : null
	};
};

export const actions: Actions = {
	add: async ({ request }) => {
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
