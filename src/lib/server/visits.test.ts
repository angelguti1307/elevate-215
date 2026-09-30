import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createVisitService, daysBetween, isValidDate, ValidationError } from './visits';
import { csvSchoolStore, DEFAULT_SCHOOLS_CSV, parseSchoolsCsv } from './schools';
import { jsonVisitStore } from './db/json-store';

const NOW = new Date('2026-09-30T16:00:00Z'); // 2026-09-30 in Philadelphia

function setup() {
	const dir = mkdtempSync(join(tmpdir(), 'visits-'));
	let clock = NOW.getTime();
	// Advance 1ms per call so createdAt is strictly increasing.
	const now = () => new Date(clock++);
	return createVisitService(
		csvSchoolStore(DEFAULT_SCHOOLS_CSV),
		jsonVisitStore(join(dir, 'visits.json')),
		now
	);
}

describe('school list', () => {
	it('loads all 301 schools from the CSV with unique numbers', async () => {
		const list = await csvSchoolStore(DEFAULT_SCHOOLS_CSV).list();
		expect(list).toHaveLength(301);
		expect(new Set(list.map((s) => s.schoolNumber)).size).toBe(301);
	});

	it('reads columns by header name', () => {
		expect(parseSchoolsCsv('﻿SchoolName,X,SchoolNumber\r\nFOO SCH,1,42\r\n')).toEqual([
			{ schoolNumber: '42', schoolName: 'FOO SCH' }
		]);
	});
});

describe('dates', () => {
	it('validates YYYY-MM-DD calendar dates', () => {
		expect(isValidDate('2026-02-28')).toBe(true);
		expect(isValidDate('2026-02-30')).toBe(false);
		expect(isValidDate('9/30/2026')).toBe(false);
	});

	it('counts whole days', () => {
		expect(daysBetween('2026-09-30', '2026-09-30')).toBe(0);
		expect(daysBetween('2026-09-01', '2026-09-30')).toBe(29);
		expect(daysBetween('2026-03-01', '2026-03-10')).toBe(9); // across DST
	});
});

describe('latest visit', () => {
	it('returns exactly the spec output shape for the most recent visit', async () => {
		const svc = setup();
		await svc.addVisit({ schoolNumber: '7825', visitDate: '2026-09-20', noteText: 'newer' });
		await svc.addVisit({ schoolNumber: '7825', visitDate: '2026-09-01', noteText: 'older, entered later' });
		await svc.addVisit({ schoolNumber: '7543', visitDate: '2026-09-29', noteText: 'other school' });

		expect(await svc.latestVisit('7825')).toStrictEqual({
			schoolName: 'AD PRIMA CS',
			visitDate: '2026-09-20',
			noteText: 'newer',
			ageDays: 10
		});
	});

	it('breaks same-date ties by most recently entered', async () => {
		const svc = setup();
		await svc.addVisit({ schoolNumber: '7825', visitDate: '2026-09-30', noteText: 'first' });
		await svc.addVisit({ schoolNumber: '7825', visitDate: '2026-09-30', noteText: 'second' });
		expect((await svc.latestVisit('7825'))?.noteText).toBe('second');
	});

	it('distinguishes unknown school from school with no visits', async () => {
		const svc = setup();
		expect(await svc.latestVisit('nope')).toBeUndefined();
		expect(await svc.latestVisit('7825')).toBeNull();
	});

	it('rejects bad input', async () => {
		const svc = setup();
		const ok = { schoolNumber: '7825', visitDate: '2026-09-30', noteText: 'x' };
		await expect(svc.addVisit({ ...ok, schoolNumber: 'AD PRIMA' })).rejects.toThrow(ValidationError);
		await expect(svc.addVisit({ ...ok, visitDate: '2026-13-01' })).rejects.toThrow(ValidationError);
		await expect(svc.addVisit({ ...ok, visitDate: '2026-10-01' })).rejects.toThrow(ValidationError);
		await expect(svc.addVisit({ ...ok, noteText: '   ' })).rejects.toThrow(ValidationError);
	});
});
