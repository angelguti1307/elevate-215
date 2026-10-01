import { existsSync, readFileSync } from 'node:fs';
import { NAME_SOURCES, type NameSource, type NameVariant, type NameVariantStore, type SchoolStore } from './db/types';

export const DEFAULT_NAME_VARIANTS_CSV = 'data/name-variants.csv';

/** The spec's output shape — exactly these four fields. */
export interface NameVariantsRecord {
	officialName: string;
	reneeNotes: string;
	grantAgreement: string;
	quickBooks: string;
}

export const NO_RECORD = 'no record';

/** Split one CSV line, honoring "quoted, fields" and "" escapes (names can contain commas). */
function splitCsvLine(line: string): string[] {
	const cols: string[] = [];
	let cur = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quoted) {
			if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++;
			else if (ch === '"') quoted = false;
			else cur += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === ',') cols.push(cur), (cur = '');
		else cur += ch;
	}
	cols.push(cur);
	return cols;
}

/**
 * Parse the hand-maintained mapping: SchoolNumber,Source,NameVariant.
 * Source must be one of NAME_SOURCES; each school may have one variant per source.
 */
export function parseNameVariantsCsv(text: string): NameVariant[] {
	const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
	if (lines.length === 0) return [];
	const header = splitCsvLine(lines[0]).map((h) => h.trim());
	const numIdx = header.indexOf('SchoolNumber');
	const srcIdx = header.indexOf('Source');
	const varIdx = header.indexOf('NameVariant');
	if (numIdx < 0 || srcIdx < 0 || varIdx < 0) {
		throw new Error('Name variants CSV must have SchoolNumber, Source and NameVariant columns');
	}

	const seen = new Set<string>();
	return lines.slice(1).map((line, i) => {
		const cols = splitCsvLine(line).map((c) => c.trim());
		const row = i + 2;
		const schoolNumber = cols[numIdx] ?? '';
		const source = cols[srcIdx] ?? '';
		const variant = cols[varIdx] ?? '';
		if (!NAME_SOURCES.includes(source as NameSource)) {
			throw new Error(`Name variants CSV row ${row}: Source must be one of ${NAME_SOURCES.join(', ')}`);
		}
		if (!schoolNumber || !variant) {
			throw new Error(`Name variants CSV row ${row}: SchoolNumber and NameVariant are required`);
		}
		const key = `${schoolNumber}|${source}`;
		if (seen.has(key)) {
			throw new Error(`Name variants CSV row ${row}: duplicate ${source} variant for school ${schoolNumber}`);
		}
		seen.add(key);
		return { schoolNumber, source: source as NameSource, variant };
	});
}

/** NameVariantStore backed by the CSV file; loaded once and cached. A missing file means no variants. */
export function csvNameVariantStore(path: string): NameVariantStore {
	let byNumber: Map<string, NameVariant[]> | undefined;
	const load = () => {
		if (!byNumber) {
			byNumber = new Map();
			const rows = existsSync(path) ? parseNameVariantsCsv(readFileSync(path, 'utf-8')) : [];
			for (const v of rows) byNumber.set(v.schoolNumber, [...(byNumber.get(v.schoolNumber) ?? []), v]);
		}
		return byNumber;
	};
	return {
		async variantsFor(schoolNumber) {
			return load().get(schoolNumber) ?? [];
		}
	};
}

export function createNameVariantService(schools: SchoolStore, variants: NameVariantStore) {
	return {
		/** undefined = school is not in the official list. */
		async nameVariants(schoolNumber: string): Promise<NameVariantsRecord | undefined> {
			const school = await schools.get(schoolNumber);
			if (!school) return undefined;
			const found = new Map((await variants.variantsFor(schoolNumber)).map((v) => [v.source, v.variant]));
			return {
				officialName: school.schoolName,
				reneeNotes: found.get('reneeNotes') ?? NO_RECORD,
				grantAgreement: found.get('grantAgreement') ?? NO_RECORD,
				quickBooks: found.get('quickBooks') ?? NO_RECORD
			};
		}
	};
}
