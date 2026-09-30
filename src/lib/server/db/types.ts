// Storage contracts. Any backend (JSON file today, SQL later) implements these;
// the rest of the app only talks to these interfaces via `$lib/server/db`.

export interface School {
	/** Stable key from the CSV `SchoolNumber` column. Names are display-only. */
	schoolNumber: string;
	schoolName: string;
}

export interface Visit {
	schoolNumber: string;
	/** Calendar date, YYYY-MM-DD. */
	visitDate: string;
	noteText: string;
	/** ISO timestamp; breaks ties between visits on the same date. */
	createdAt: string;
}

export interface SchoolStore {
	list(): Promise<School[]>;
	get(schoolNumber: string): Promise<School | undefined>;
}

export interface VisitStore {
	add(visit: Visit): Promise<void>;
	/** Most recent visit by visitDate, then createdAt. */
	latestFor(schoolNumber: string): Promise<Visit | undefined>;
}
