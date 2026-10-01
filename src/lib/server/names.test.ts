import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNameVariantService, csvNameVariantStore, parseNameVariantsCsv } from './names';
import { csvSchoolStore, DEFAULT_SCHOOLS_CSV } from './schools';

function setup(csv: string) {
	const path = join(mkdtempSync(join(tmpdir(), 'names-')), 'name-variants.csv');
	writeFileSync(path, csv);
	return createNameVariantService(csvSchoolStore(DEFAULT_SCHOOLS_CSV), csvNameVariantStore(path));
}

describe('name variants lookup', () => {
	it('returns the variant used in each source, and exactly the spec fields', async () => {
		const service = setup(
			'SchoolNumber,Source,NameVariant\n' +
				'3808,reneeNotes,Masterman\n' +
				'3808,grantAgreement,Julia R. Masterman\n' +
				'3808,quickBooks,"Masterman, Julia R."\n'
		);
		const record = await service.nameVariants('3808');
		expect(record).toStrictEqual({
			officialName: 'MASTERMAN JULIA R SEC SCH',
			reneeNotes: 'Masterman',
			grantAgreement: 'Julia R. Masterman',
			quickBooks: 'Masterman, Julia R.'
		});
	});

	it('says "no record" for sources that have none', async () => {
		const service = setup('SchoolNumber,Source,NameVariant\n3808,quickBooks,MASTERMAN HS\n');
		expect(await service.nameVariants('3808')).toStrictEqual({
			officialName: 'MASTERMAN JULIA R SEC SCH',
			reneeNotes: 'no record',
			grantAgreement: 'no record',
			quickBooks: 'MASTERMAN HS'
		});
		expect((await service.nameVariants('7825'))?.reneeNotes).toBe('no record');
	});

	it('returns undefined for a school not in the official list', async () => {
		expect(await setup('SchoolNumber,Source,NameVariant\n').nameVariants('nope')).toBeUndefined();
	});

	it('treats a missing mapping file as no records', async () => {
		const service = createNameVariantService(
			csvSchoolStore(DEFAULT_SCHOOLS_CSV),
			csvNameVariantStore(join(tmpdir(), 'does-not-exist.csv'))
		);
		expect((await service.nameVariants('3808'))?.grantAgreement).toBe('no record');
	});
});

describe('name variants CSV', () => {
	it('reads columns by header name and handles quotes and a BOM', () => {
		expect(parseNameVariantsCsv('﻿NameVariant,SchoolNumber,Source\r\n"A ""B"", C",42,quickBooks\r\n')).toEqual([
			{ schoolNumber: '42', source: 'quickBooks', variant: 'A "B", C' }
		]);
	});

	it('rejects an unknown source', () => {
		expect(() => parseNameVariantsCsv('SchoolNumber,Source,NameVariant\n42,email,X\n')).toThrow(/Source/);
	});

	it('rejects two variants for the same school and source', () => {
		expect(() =>
			parseNameVariantsCsv('SchoolNumber,Source,NameVariant\n42,reneeNotes,A\n42,reneeNotes,B\n')
		).toThrow(/duplicate/);
	});
});
