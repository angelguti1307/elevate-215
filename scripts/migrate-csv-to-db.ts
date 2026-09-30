// Generates db/seed.sql from the School Rollup CSV (-> schools) and
// data/visits.json (-> visits), for loading into the schema in db/schema.sql.
// Idempotent: schools are upserted; visits are skipped if an identical row exists.
//
// Usage: npm run db:seed-sql [-- <schools.csv> <visits.json> <out.sql>]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEFAULT_CSV =
	'data/Elevate215-School-Data - PHL School Performance Model.xlsx - School Rollup (1).csv';
const [csvPath = DEFAULT_CSV, visitsPath = 'data/visits.json', outPath = 'db/seed.sql'] =
	process.argv.slice(2);

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

out.push('', 'COMMIT;', '');
writeFileSync(outPath, out.join('\n'));
console.log(`Wrote ${outPath}: ${lines.length - 1} schools, ${visits.length} visits`);
