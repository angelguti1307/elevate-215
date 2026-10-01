import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Visit, VisitStore } from './types';
import { pickLatest } from '../visits';


// A function that manages visits stored at a specific file location //
export function jsonVisitStore(path: string): VisitStore {
// Checks if the file exists. If it does, it opens and reads all the saved visits.//
	const read = (): Visit[] => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : []);

	let queue: Promise<void> = Promise.resolve();
// Ensures guests stand in line so two people don't try to write on the exact same page at the exact same time //
	return {
		add(visit) {
			const write = queue.then(() => {
				const visits = read();
				visits.push(visit);
				mkdirSync(dirname(path), { recursive: true });
				writeFileSync(`${path}.tmp`, JSON.stringify(visits, null, 2));
				renameSync(`${path}.tmp`, path);
			});
			// A failed write must not poison later ones.//
			queue = write.catch(() => {});
			return write;
		},
	//This function waits for all current writes to finish, then reads through the stored logs to find and return the most recent visit for a specific school.//
		async latestFor(schoolNumber) {
			await queue;
			return pickLatest(read().filter((v) => v.schoolNumber === schoolNumber));
		}
	};
}
