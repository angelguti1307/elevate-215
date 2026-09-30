import type { SchoolStore, Visit, VisitStore } from './db/types';

/** The spec's output shape — exactly these four fields. */
export interface LatestVisitRecord {
	schoolName: string;
	visitDate: string;
	noteText: string;
	ageDays: number;
}

export interface VisitInput {
	schoolNumber: string;
	visitDate: string;
	noteText: string;
}

const TIME_ZONE = 'America/New_York';

/** Today's calendar date (YYYY-MM-DD) in Philadelphia. */
export function todayLocal(now = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}

export function isValidDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const d = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
	const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
	return Math.round(ms / 86_400_000);
}

export function pickLatest(visits: Visit[]): Visit | undefined {
	let latest: Visit | undefined;
	for (const v of visits) {
		if (
			!latest ||
			v.visitDate > latest.visitDate ||
			(v.visitDate === latest.visitDate && v.createdAt > latest.createdAt)
		) {
			latest = v;
		}
	}
	return latest;
}

export class ValidationError extends Error {}

export function createVisitService(
	schools: SchoolStore,
	visits: VisitStore,
	now: () => Date = () => new Date()
) {
	return {
		async addVisit(input: VisitInput): Promise<void> {
			const schoolNumber = input.schoolNumber?.trim() ?? '';
			const visitDate = input.visitDate?.trim() ?? '';
			const noteText = input.noteText?.trim() ?? '';

			if (!(await schools.get(schoolNumber))) throw new ValidationError('Choose a school from the list.');
			if (!isValidDate(visitDate)) throw new ValidationError('Visit date must be a valid date.');
			if (visitDate > todayLocal(now())) throw new ValidationError('Visit date cannot be in the future.');
			if (!noteText) throw new ValidationError('Note text is required.');

			await visits.add({ schoolNumber, visitDate, noteText, createdAt: now().toISOString() });
		},

		/** undefined = unknown school; null = known school with no visits yet. */
		async latestVisit(schoolNumber: string): Promise<LatestVisitRecord | null | undefined> {
			const school = await schools.get(schoolNumber);
			if (!school) return undefined;
			const visit = await visits.latestFor(schoolNumber);
			if (!visit) return null;
			return {
				schoolName: school.schoolName,
				visitDate: visit.visitDate,
				noteText: visit.noteText,
				ageDays: daysBetween(visit.visitDate, todayLocal(now()))
			};
		}
	};
}
