# Elevate215 School Visits

A simple tool for keeping track of school visits.

After you visit a school, write down what happened. Later, anyone on the team can pick that school and see the most recent visit right away, without digging through notes or guessing how someone spelled the school's name.

## What you can do

**Record a visit**

1. Pick the school from the list.
2. Enter the date of the visit.
3. Type your notes.
4. Click **Save visit**.

**Look up a school's latest visit**

1. Pick the school from the list.
2. Click **Look up**.

You'll see four things:

| What you see | Example       |
| ------------ | ------------- |
| School name  | AD PRIMA CS   |
| Visit date   | 2026-09-25    |
| Note         | Met principal |
| Age (days)   | 5             |

"Age (days)" tells you how long ago the visit was, so you can tell at a glance whether the notes are fresh or out of date.

**See how each source spells a school's name**

1. Under **Name in each source**, pick the school's official name from the list.
2. Click **Look up**.

You'll see the spelling used in each of the three places, or "no record" if that place doesn't have the school:

| What you see    | Example                   |
| --------------- | ------------------------- |
| Official name   | MASTERMAN JULIA R SEC SCH |
| Renée's notes   | Masterman                 |
| Grant agreement | no record                 |
| QuickBooks      | Masterman, Julia R.       |

The spellings come from `data/name-variants.csv`, which someone fills in by hand. Each row is one school, one source, and the exact spelling that source uses:

```csv
SchoolNumber,Source,NameVariant
3808,reneeNotes,Masterman
3808,quickBooks,"Masterman, Julia R."
```

- `SchoolNumber` is the number from the school list.
- `Source` must be exactly `reneeNotes`, `grantAgreement`, or `quickBooks`.
- Put quotes around a spelling that contains a comma.
- A school can have only one spelling per source. Leave a source out to show "no record".
- Restart the app after editing the file.

## Good to know

- **The school list is fixed.** It has all 301 Philadelphia schools from the Elevate215 School Performance Model. You choose from the list instead of typing a name, so everyone is always talking about the same school.
- **You'll always see the newest visit.** If a school has several visits, the one with the latest date is shown. If two visits happened on the same day, the one saved last is shown.
- **Some entries aren't allowed.** A visit can't be dated in the future, and the note can't be left blank.
- **"Today" means today in Philadelphia**, no matter where the computer running the app is located.

## Where the information is kept

For now, visit notes are saved in a file on the computer running the app (`data/visits.json`), not in a shared database. That means:

- Everyone needs to use the same running copy of the app to see each other's notes.
- Back up that file if the notes matter.

Moving the notes into a proper database is planned, and the groundwork is already done (see "Moving to a database" below).

---

## For developers

Built with [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5 and TypeScript) and tested with [Vitest](https://vitest.dev/).

### Run it on your computer

Use a **bash** terminal for all commands in this README: **Git Bash** on Windows (installed with [Git for Windows](https://git-scm.com/download/win)), or the regular terminal on Linux or macOS. On Windows, avoid Windows PowerShell for creating or editing files. Its `>` and `>>` save files as UTF-16, which makes text files like this README unreadable. Bash saves them as UTF-8.

You'll also need [Node.js](https://nodejs.org/) version 22.6 or newer and [Git](https://git-scm.com/).

```bash
# Check your versions
node --version   # v22.6.0 or newer
git --version

# Get the code and install
git clone https://github.com/angelguti1307/elevate-215.git
cd elevate-215
npm install

# Start the app
npm run dev
```

Then open the web address it shows you, usually http://localhost:5173.

To make sure a text file is saved correctly, run `file README.md`. It should say `ASCII text` or `UTF-8 text`, not `UTF-16`.

### Commands

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Runs the app while you work on it                        |
| `npm run build`       | Packages the app so it can run on a server               |
| `npm run preview`     | Runs the packaged version, to check it before going live |
| `npm run check`       | Checks the code for mistakes                             |
| `npm test`            | Runs the automated tests                                 |
| `npm run db:seed-sql` | Prepares the school list and saved visits for a database |

To run a single test by name:

```bash
npx vitest run -t "breaks same-date ties"
```

### Getting data from another program

Other tools can ask for a school's latest visit at this address:

`GET /api/schools/{schoolNumber}/latest-visit`

```bash
curl http://localhost:5173/api/schools/7825/latest-visit
```

```json
{ "schoolName": "AD PRIMA CS", "visitDate": "2026-09-25", "noteText": "Met principal", "ageDays": 5 }
```

`{schoolNumber}` is the school's number from the school list (for example, `7825`). If the school isn't on the list, or has no visits yet, you'll get a "not found" (404) response.

They can also ask how each source spells a school's name:

`GET /api/schools/{schoolNumber}/name-variants`

```json
{ "officialName": "MASTERMAN JULIA R SEC SCH", "reneeNotes": "Masterman", "grantAgreement": "no record", "quickBooks": "Masterman, Julia R." }
```

If the school isn't on the list, you'll get a 404.

### Settings

| Setting       | What it controls                      | Default                          |
| ------------- | ------------------------------------- | -------------------------------- |
| `SCHOOLS_CSV` | Which file the school list comes from | The School Rollup CSV in `data/` |
| `VISITS_JSON` | Where visit notes are saved           | `data/visits.json`               |
| `NAME_VARIANTS_CSV` | Which file the name spellings come from | `data/name-variants.csv` |

Set them in front of the command in bash:

```bash
VISITS_JSON=/path/to/visits.json npm run dev
```

### Moving to a database

The app is built so that switching to a database means changing just one file: `src/lib/server/db/index.ts`.

```bash
# Point at your PostgreSQL database
export DATABASE_URL="postgres://user:password@localhost:5432/elevate215"

# 1. Create the tables
psql "$DATABASE_URL" -f db/schema.sql

# 2. Turn the school list, saved visits, and name spellings into database commands
npm run db:seed-sql

# 3. Load them
psql "$DATABASE_URL" -f db/seed.sql
```

Then write database versions of `SchoolStore`, `VisitStore`, and `NameVariantStore` (the queries are in `db/schema.sql`), and use them in `src/lib/server/db/index.ts`.

Step 3 is safe to repeat. Schools and name spellings are updated instead of duplicated, and visits that were already loaded are skipped. Step 2 stops with an error if `data/name-variants.csv` has a school number that isn't on the list, an unknown source, or two spellings for the same school and source. Removing a row from the CSV does not delete it from the database.

### Saving your changes with Git

```bash
git status                      # see what changed
git add README.md src/          # choose what to save
git commit -m "Describe the change"
git push                        # send it to GitHub
```

### Where things are

```
data/            The school list (CSV), saved visits, and name spellings
db/schema.sql    The planned database layout
scripts/         Tool that prepares data for the database
src/lib/server/  School list, visit rules, and saving
src/routes/      The web page and the data address for other programs
spec.md          The requirements for visit notes
spec v2.md       The requirements for name spellings
CLAUDE.md        Notes for Claude Code when working in this repo
```
