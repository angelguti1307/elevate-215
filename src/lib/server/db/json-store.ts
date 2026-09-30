import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Visit, VisitStore } from './types';
import { pickLatest } from '../visits';

/**
 * v1 VisitStore: all visits in one JSON array on disk.
 * Replace with a SQL-backed store (see db/schema.sql) without touching callers.
 */
export function jsonVisitStore(path: string): VisitStore {
	const read = (): Visit[] => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : []);

	// Serialize writes so concurrent requests don't clobber each other.
	let queue: Promise<void> = Promise.resolve();

	return {
		add(visit) {
			const write = queue.then(() => {
				const visits = read();
				visits.push(visit);
				mkdirSync(dirname(path), { recursive: true });
				writeFileSync(`${path}.tmp`, JSON.stringify(visits, null, 2));
				renameSync(`${path}.tmp`, path);
			});
			// A failed write must not poison later ones.
			queue = write.catch(() => {});
			return write;
		},
		async latestFor(schoolNumber) {
			await queue;
			return pickLatest(read().filter((v) => v.schoolNumber === schoolNumber));
		}
	};
}
