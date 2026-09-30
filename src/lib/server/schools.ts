import { readFileSync } from 'node:fs';
import type { School, SchoolStore } from './db/types';

export const DEFAULT_SCHOOLS_CSV =
	'data/Elevate215-School-Data - PHL School Performance Model.xlsx - School Rollup (1).csv';

/**
 * Parse the fixed school list from the School Rollup CSV.
 * The export has no quoted fields, so a plain comma split is sufficient.
 */
export function parseSchoolsCsv(text: string): School[] {
	const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
	const header = lines[0].split(',');
	const numIdx = header.indexOf('SchoolNumber');
	const nameIdx = header.indexOf('SchoolName');
	if (numIdx < 0 || nameIdx < 0) {
		throw new Error('Schools CSV must have SchoolNumber and SchoolName columns');
	}
	return lines.slice(1).map((line) => {
		const cols = line.split(',');
		return { schoolNumber: cols[numIdx].trim(), schoolName: cols[nameIdx].trim() };
	});
}

/** SchoolStore backed by the CSV file; loaded once and cached. */
export function csvSchoolStore(path: string): SchoolStore {
	let cache: { list: School[]; byNumber: Map<string, School> } | undefined;
	const load = () => {
		if (!cache) {
			const list = parseSchoolsCsv(readFileSync(path, 'utf-8')).sort((a, b) =>
				a.schoolName.localeCompare(b.schoolName)
			);
			cache = { list, byNumber: new Map(list.map((s) => [s.schoolNumber, s])) };
		}
		return cache;
	};
	return {
		async list() {
			return load().list;
		},
		async get(schoolNumber) {
			return load().byNumber.get(schoolNumber);
		}
	};
}
