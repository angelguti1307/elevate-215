-- Planned database schema (PostgreSQL). Not used by v1, which stores visits
-- in data/visits.json and reads schools from the School Rollup CSV.
--
-- Migration path:
--   1. Create these tables:            psql "$DATABASE_URL" -f db/schema.sql
--   2. Generate seed SQL from files:   npm run db:seed-sql   (writes db/seed.sql)
--   3. Load it:                        psql "$DATABASE_URL" -f db/seed.sql
--   4. Implement SchoolStore/VisitStore with SQL (queries below) and export
--      them from src/lib/server/db/index.ts. No other app code changes.

CREATE TABLE IF NOT EXISTS schools (
	school_number  TEXT PRIMARY KEY,          -- CSV SchoolNumber (stable key)
	school_name    TEXT NOT NULL,             -- CSV SchoolName (display only)
	district_name  TEXT,
	school_type    TEXT,
	aun            TEXT
);

CREATE TABLE IF NOT EXISTS visits (
	id             BIGSERIAL PRIMARY KEY,
	school_number  TEXT NOT NULL REFERENCES schools (school_number),
	visit_date     DATE NOT NULL,
	note_text      TEXT NOT NULL CHECK (length(trim(note_text)) > 0),
	created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visits_latest_idx
	ON visits (school_number, visit_date DESC, created_at DESC);

-- VisitStore.latestFor:
--   SELECT school_number, visit_date, note_text, created_at
--   FROM visits WHERE school_number = $1
--   ORDER BY visit_date DESC, created_at DESC LIMIT 1;
