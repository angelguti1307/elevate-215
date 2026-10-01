// Generates db/seed.sql from the School Rollup CSV (-> schools),
// data/visits.json (-> visits) and data/name-variants.csv (-> school_name_variants),
// for loading into the schema in db/schema.sql.
// Idempotent: schools and name variants are upserted; visits are skipped if an identical row exists.
//
// Usage: npm run db:seed-sql [-- <schools.csv> <visits.json> <out.sql> <name-variants.csv>]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEFAULT_CSV =
	'data/Elevate215-School-Data - PHL School Performance Model.xlsx - School Rollup (1).csv';
const [
	csvPath = DEFAULT_CSV,
	visitsPath = 'data/visits.json',
	outPath = 'db/seed.sql',
	variantsPath = 'data/name-variants.csv'
] = process.argv.slice(2);

const q = (v: string | undefined) => (v ? `'${v.replace(/'/g, "''")}'` : 'NULL');

const lines = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
const header = lines[0].split(',');
const col = (name: string) => {
	const i = header.indexOf(name);
	if (i < 0) throw new Error(`CSV is missing column ${name}`);
	return i;
};
const idx = {
	number: col('SchoolNumber'),
	name: col('SchoolName'),
	district: col('DistrictName'),
	type: col('SchoolType'),
	aun: col('AUN')
};

const out: string[] = ['BEGIN;', ''];

for (const line of lines.slice(1)) {
	const c = line.split(',').map((s) => s.trim());
	out.push(
		`INSERT INTO schools (school_number, school_name, district_name, school_type, aun) VALUES ` +
			`(${q(c[idx.number])}, ${q(c[idx.name])}, ${q(c[idx.district])}, ${q(c[idx.type])}, ${q(c[idx.aun])}) ` +
			`ON CONFLICT (school_number) DO UPDATE SET school_name = EXCLUDED.school_name, ` +
			`district_name = EXCLUDED.district_name, school_type = EXCLUDED.school_type, aun = EXCLUDED.aun;`
	);
}

type Visit = { schoolNumber: string; visitDate: string; noteText: string; createdAt: string };
const visits: Visit[] = existsSync(visitsPath) ? JSON.parse(readFileSync(visitsPath, 'utf-8')) : [];

out.push('');
for (const v of visits) {
	const vals = `${q(v.schoolNumber)}, ${q(v.visitDate)}::date, ${q(v.noteText)}, ${q(v.createdAt)}::timestamptz`;
	out.push(
		`INSERT INTO visits (school_number, visit_date, note_text, created_at) SELECT ${vals} ` +
			`WHERE NOT EXISTS (SELECT 1 FROM visits WHERE school_number = ${q(v.schoolNumber)} ` +
			`AND visit_date = ${q(v.visitDate)}::date AND note_text = ${q(v.noteText)} ` +
			`AND created_at = ${q(v.createdAt)}::timestamptz);`
	);
}

// Same rules as parseNameVariantsCsv in src/lib/server/names.ts. Duplicated because this
// script runs under --experimental-strip-types and can't import extensionless app modules.
const SOURCES = ['reneeNotes', 'grantAgreement', 'quickBooks'];
function splitQuoted(line: string): string[] {
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
		else if (ch === ',') cols.push(cur.trim()), (cur = '');
		else cur += ch;
	}
	cols.push(cur.trim());
	return cols;
}

const schoolNumbers = new Set(lines.slice(1).map((l) => l.split(',')[idx.number].trim()));
const variantLines = existsSync(variantsPath)
	? readFileSync(variantsPath, 'utf-8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
	: [];
const seenVariants = new Set<string>();
let variantCount = 0;

out.push('');
if (variantLines.length) {
	const vh = splitQuoted(variantLines[0]);
	const [vNum, vSrc, vVar] = ['SchoolNumber', 'Source', 'NameVariant'].map((n) => {
		const i = vh.indexOf(n);
		if (i < 0) throw new Error(`${variantsPath} is missing column ${n}`);
		return i;
	});
	variantLines.slice(1).forEach((line, i) => {
		const c = splitQuoted(line);
		const where = `${variantsPath} row ${i + 2}`;
		if (!schoolNumbers.has(c[vNum])) throw new Error(`${where}: unknown SchoolNumber ${c[vNum]}`);
		if (!SOURCES.includes(c[vSrc])) throw new Error(`${where}: Source must be one of ${SOURCES.join(', ')}`);
		if (!c[vVar]) throw new Error(`${where}: NameVariant is required`);
		const key = `${c[vNum]}|${c[vSrc]}`;
		if (seenVariants.has(key)) throw new Error(`${where}: duplicate ${c[vSrc]} variant for school ${c[vNum]}`);
		seenVariants.add(key);
		out.push(
			`INSERT INTO school_name_variants (school_number, source, variant) VALUES ` +
				`(${q(c[vNum])}, ${q(c[vSrc])}, ${q(c[vVar])}) ` +
				`ON CONFLICT (school_number, source) DO UPDATE SET variant = EXCLUDED.variant;`
		);
		variantCount++;
	});
}

out.push('', 'COMMIT;', '');
writeFileSync(outPath, out.join('\n'));
console.log(
	`Wrote ${outPath}: ${lines.length - 1} schools, ${visits.length} visits, ${variantCount} name variants`
);
