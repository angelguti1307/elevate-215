# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A SvelteKit (Svelte 5, TypeScript, adapter-node) app for Elevate215 staff to record school visit notes and look up a school's latest visit. The requirements live in `spec.md`. Match its output shape exactly and add nothing extra. The latest-visit record is exactly `{ schoolName, visitDate, noteText, ageDays }`.

## Commands

- `npm run dev`: start the dev server
- `npm run build` / `npm run preview`: make a production build / preview it
- `npm run check`: run svelte-kit sync and svelte-check (type checking; there is no linter)
- `npm test`: run all Vitest tests (`src/**/*.test.ts`)
- `npx vitest run -t "breaks same-date ties"`: run a single test by name
- `npm run db:seed-sql`: generate `db/seed.sql` from the CSV and `data/visits.json`. Uses Node's `--experimental-strip-types`, so there is no build step.

## Architecture

- **There is no database yet, only a storage seam.** All storage goes through the `SchoolStore` / `VisitStore` interfaces in `src/lib/server/db/types.ts`. `src/lib/server/db/index.ts` is the only place the concrete stores are chosen and the `visitService` is wired up. Routes import only from `$lib/server/db`. To move to a database, implement these interfaces with SQL and swap the exports in `index.ts`; nothing else should change.
- **Schools** come from the read-only fixed list in `data/Elevate215-School-Data - PHL School Performance Model.xlsx - School Rollup (1).csv`, which has 301 rows (override the path with `SCHOOLS_CSV`). `src/lib/server/schools.ts` parses it with a plain comma split, because the export has no quoted fields; revisit this if the CSV format changes. Columns are found by header name.
- **Identity:** `SchoolNumber` is the key everywhere. School names are display-only. Staff spell names differently, and this is the problem the spec is solving.
- **Visits** are stored as one JSON array in `data/visits.json` (git-ignored; override with `VISITS_JSON`). `src/lib/server/db/json-store.ts` serializes writes through a promise queue and writes to a temp file, then renames it.
- **Business rules** live in `src/lib/server/visits.ts`, in `createVisitService(schools, visits, now)`:
  - Validation: the school must be in the list, the date must be a valid `YYYY-MM-DD` and not in the future, and the note must not be empty.
  - Latest visit: the highest `visitDate` wins; on a tie, the latest `createdAt` wins.
  - `ageDays`: whole days between calendar dates, where "today" is the date in `America/New_York`.
  - `latestVisit` returns `undefined` for an unknown school and `null` for a known school with no visits.
  - `now` is injectable, which makes tests deterministic.
- **Name variants (spec v2, `spec v2.md`)** live in `src/lib/server/names.ts`, in `createNameVariantService(schools, variants)`. The record is exactly `{ officialName, reneeNotes, grantAgreement, quickBooks }`. Each source field holds that source's spelling or the literal `"no record"`. The function returns `undefined` for an unknown school. Variants come from a hand-maintained mapping, `data/name-variants.csv` (`SchoolNumber,Source,NameVariant`; override with `NAME_VARIANTS_CSV`), and are never fuzzy-matched. The parser supports quoted fields, rejects unknown sources, and rejects duplicate (school, source) pairs. `scripts/migrate-csv-to-db.ts` has its own copy of these rules, because strip-types can't import the app modules.
- **Entry points:**
  - `src/routes/+page.server.ts`: the `add` form action, plus a `?school=` lookup in `load`
  - `src/routes/api/schools/[schoolNumber]/latest-visit/+server.ts`: returns the JSON record, or a 404
  - `src/routes/+page.server.ts` `?names=<schoolNumber>` and `src/routes/api/schools/[schoolNumber]/name-variants/+server.ts`: return the name-variants record, or a 404
- **Planned DB migration:** `db/schema.sql` is the PostgreSQL schema, and its header lists the migration steps. `scripts/migrate-csv-to-db.ts` generates idempotent seed SQL: schools are upserted and visits are de-duplicated.

## Gotchas

- Keep text files UTF-8 without a BOM. `README.md` was twice saved as UTF-16 (from PowerShell output or VS Code's encoding picker). When that happens, git treats the file as binary and VS Code shows it as CJK characters. Check with `file README.md`.
- To call form actions with curl against the dev server, send an `Origin: http://localhost:<port>` header, or SvelteKit's CSRF check rejects the POST. Example: `curl -H "Origin: http://localhost:5173" -X POST "http://localhost:5173/?/add" --data-urlencode schoolNumber=7825 ...`
- `npm run db:seed-sql` needs Node 22.6 or newer for `--experimental-strip-types`.
