# Task-specific workflows

Operational rules moved from the startup context on 2026-09-27. Read the section relevant to
this task. Owner decisions and the current request take precedence; commands and configuration
live in [package.json](../package.json) and the linked scripts.

## Schema and databases

Production schema changes follow **SQL in `db/changes/` → owner applies → `bun run db:pull`**.
Never execute direct SQL against production yourself. No `prisma db push`, Prisma migrations
or shadow database. `db/changes/` is a change log, not a replayable migration sequence.

`prisma/schema.prisma` and `db/schema.sql` are generated. The only manual schema exceptions
in [Р2](DECISIONS.md#р2-бд--джерело-істини-міграцій-немає) are `///` documentation comments and
model/field renames with `@map`/`@@map` that introspection preserves. Columns, types and
constraints always come from the database. `bun run db:pull` refreshes the schema, client,
Prisma enum artifact and schema dump; inspect its diff.

The owner applies production DDL; the agent syncs test DDL with
`./scripts/apply-db-change.sh <file.sql>`. It uses `.env.test` and rejects targets without a
`_test`/`_staging`/`_dev`/`_scratch` suffix. A clean generated-schema diff does not prove that
the test DB has the change. Verify the target DB.

Database tests use **local Postgres 17 on `127.0.0.1:5433/spells_test`**, managed by
`./scripts/local-test-db.sh`. Check `status` before a run. `clone` reads production content
without player data and writes the local clone; `start`/`stop` manage the process.
A fresh checkout needs a gitignored `.env.test` with `DATABASE_URL` for this local test DB;
see [local-test-db.sh](../scripts/local-test-db.sh) for connection setup.
Double-quote values in `.env*`; URLs can contain shell metacharacters.

Seeds with `:test` use the same `.env.test`. Re-cloning replaces test content; changes seeded
only on a server clone are invisible locally. The older server clone is reachable through
`TEST_DATABASE_URL` when explicitly needed; it is not the default test environment.
`./scripts/db-clone.sh <target> [content|full|schema]` is the separate server-clone tool.

Integration runs create a separate copy per worker from `spells_test` and drop those copies
on teardown. Preserve parallel files and `TEST_DB_WORKERS` (default 4). Do not add a global
machine lock or disable isolation to shorten a run. Tests truncate user tables on their
copies; never point them at production. Seeds modify the template; copies made earlier do
not see a new seed, so restart the run after seeding.

Template copies require no active connections to `spells_test`. A dev server for browser
checks should use a separate clone, e.g. `scripts/local-test-db.sh clone spells_browser_test`.
The integration setup waits for template connections to close; do not stop another session's
server to bypass that wait. See [Р45](DECISIONS.md#р45).

## Tests and CI

- `bun run test:no-db` is the default CI test suite with a deliberately dead DB URL.
  `bun run test` uses the same Vitest config; do not read it as a DB integration run.
- `bun run test:integration` uses `vitest.integration.config.mts`, worker DB copies and
  the file-duration guard. DB files must also be excluded from the default suite through
  `vitest.db-integration-files.mts`. Do not add DB queries to default-suite files.
- `bun run test:corpus`, `bun run test:quarantine` and `bun run test:e2e` are separate suites;
  choose them when the touched behavior requires them. Do not claim default-suite success
  covers a suite it excludes.
- Before a behaviour change in `src/lib/actions/` or `src/lib/logic/`, characterize current
  output and prove the assertion fails under a deliberate break. Do that on a copy of the
  shared working tree; restore only the deliberate break. Do not weaken assertions to bless
  a confirmed bug. During characterization, record it in [KNOWN-BUGS.md](KNOWN-BUGS.md).
- Keep integration files around 30 seconds locally; the guard rejects excessive duration
  (configuration: `TEST_FILE_LIMIT_SECONDS`). Build shared read-only fixtures once in
  `beforeAll`; reset user tables per test only when that test writes. Shard expensive matrices
  by fixtures, with a check that each fixture is covered once.
- Never move the DB reset into `tests/setup.ts`; it would pull pure tests into Postgres.
  Do not name test helpers `useSomething`: the hooks lint treats them as React hooks.
- Avoid running the full suite beside lint or a heavy build. If a test fails under load,
  reproduce it alone before attributing it to the change. A refreshed clone can also lose
  seeds; inspect fixture/content state before diagnosing a regression.

Before an authorized push, run all current checks in
[deploy.yml](../.github/workflows/deploy.yml): UI decomposition, DB boundary, TypeScript, lint,
default tests without DB, and rules coverage. Keep logic added to large legacy components in
neighboring modules rather than raising size limits. Push is never implied by finishing a fix.

## Content and translations

Invoke the repository [dnd-ua-translation skill](../.agents/skills/dnd-ua-translation/SKILL.md)
for D&D seed names or descriptions, dictionary changes and translation review. Its new-term
approval gate applies before a batch. Check the repo source corpus before relying on recalled
rules or terms; database state does not establish a D&D rule.

[src/lib/refs/dictionary.json](../src/lib/refs/dictionary.json) holds `DND_DICTIONARY`, `SPELLS`
and `CONTENT_TRANSLATIONS`. The latter mirrors
[src/lib/refs/translation.ts](../src/lib/refs/translation.ts), which remains the UI translation
source. Search both before deciding a term is absent. `npx tsx scripts/sync-dictionary-from-translation.ts`
regenerates the mirror; if `translation.ts` was damaged, recover it before syncing, because a
sync overwrites the mirror. Existing corpus usage is not approval for an unratified term.

Fix **source files**, then seed and regenerate ([Р33](DECISIONS.md#р33)). Do not patch DB prose
on top of a seed when a source file exists. Magic-item batches are generated from
`data/aidedd/magic-items-2014.json`; a change only in `prisma/seed/magic-items/batch-*.json`
will be lost. Remove obsolete corrective-file entries in the same change that fixes the source.
Do not mechanically replace Ukrainian words without reading their sentences and inflections.

- Use **`ʼ` (U+02BC)** inside Ukrainian words. The apostrophe content gate covers sources and
  generated catalogs. Old DB text can reappear on regeneration; correct the delivery source,
  not the assertion. `seed:apostrophe:test|prod` has a preview mode and writes with `--apply`.
- English-original markers use `термін{{English}}` or the paired form
  `{{Український термін|English term}}`. Reuse `src/lib/refs/glossary-marker.ts`; do not invent
  another parser. Use them in prose, not plain mechanical fields. Feature/action names retain
  their marker on first mention even when ratified; conditions and damage types do not need it.
  Marker width and heading behavior are governed by the glossary-marker gate and [Р20](DECISIONS.md#р20).
- Markers show the original with superscript “en”; they do not open rule modals ([Р50](DECISIONS.md#р50)).
  Conditions, actions and rules open through links from `src/lib/refs/rule-term-links.json`.
  Word forms are reviewed in `data/rule-term-links/forms.json`. Use
  `bunx tsx scripts/link-rule-term-mentions.ts --list` to inspect and `--write` to update sources.
  Fix a false link in the form rules rather than fighting the linker in individual text.
- Spell names must match `SPELLS`; a spell link replaces an English-original marker on its
  name ([Р49](DECISIONS.md#р49)). Use the existing spell linker for delivery and its gate.
- 2014 spells have a source file, `data/2014/spells.json`, delivered by
  `seed:spells-2014:test|prod` (preview without `--apply`, updates only).
  For link delivery into existing 2014 feature text, use `seed:rule-term-anchors:test|prod`;
  do not run the full 2014 seeders against production.

Verify a content seed on the clone first. Safe content seeds follow the shared-memory
`agent-runs-safe-seeds-on-prod` agreement within the authorized task; changes to player data
need their own explicit scope. Production SQL/DDL remains owner-applied.

## UI and browser checks

Preserve the chosen serif fonts and do not add motion by default. Use existing edition accents
from `src/styles/edition-accent.ts`, shared catalog widgets and existing helpers. Lightweight
spell-link helpers belong in `spell-link.ts`; importing `spellsData` into client code can pull
catalogs into the bundle. Read catalog data through the existing GET flow, not a new server
action: filter URL changes can discard an in-flight action's result.

For touch, Swiper and real browser history, jsdom is insufficient. Use Playwright with a phone
profile (e.g. iPhone 13); include the actual navigation into the sheet. Test a fix against the
old behavior as well. Inspect smoothness in WebKit for iPhone issues and measure performance
on comparable production builds, not a dev server.

1. No `swiper-no-swiping` or `stopPropagation` on `pointerdown`/`touchstart` inside sheet slides.
   Radix DropdownMenu triggers should open by click as the existing `CastSpellMenu` does.
2. One history entry per open modal. A modal managing its own URL must disable Dialog's
   extra entry through `enableBackButtonClose={false}`. Preserve existing `history.state`
   (including Next's `__NA`); never replace it with `{}`.
3. Closing one dialog and opening another in the same click must go through
   `src/lib/history-back.ts`, since browser `back`/`go` is asynchronous.
4. No live SVG turbulence or backdrop filter on a full-screen fixed layer; reuse the raster
   grain texture. Chromium on a Mac can hide the frame stalls seen in iPhone WebKit.

Keep browser-check build artifacts separate from another session's dev server. Use a tree
copy with its own Next output directory when necessary. Shared-memory browser notes describe
the test-session recipe and isolated local database setup.

The owner can run `bun dev:owner` at `http://localhost:3000`, with output in `.next-owner`.
Agents must use another port and a session-specific output directory, for example
`NEXT_DEV_DIST_DIR=.next-browser-check bun dev --port 3200`, plus their own isolated browser
context/profile. Cookies for `localhost` are shared across ports, so a different port alone
does not isolate login. To recover from an unwanted local login, use a separate browser profile
or clear cookies for `localhost` and sign in again. These servers still read the same source
files and configured database; use a tree copy and a local database clone when those also need
isolation. Next may update shared `next-env.d.ts` and TypeScript includes on startup; use a
tree copy when verification must preserve those files too.

## Catalog generation and deployment

Generated catalogs are committed in `src/lib/generated/`; CI builds from git with no DB.
`bun run build` runs `prebuild` → `generate:content`, which can read the configured database
and rewrite catalogs. `bunx next build` skips that regeneration, as the Docker build does.
Before a temporary regeneration, copy the affected generated files; test-clone output is not
a replacement for production catalog IDs. Return only your generated changes, preserving
other sessions' work. Never use a git undo command to do that.

The deploy workflow builds a SHA-tagged image, waits for checks, releases it with
[scripts/deploy-container.sh](../scripts/deploy-container.sh), smoke-checks, and either rolls
back or retires the previous container. There is no systemd `char` unit in this deployment.
Runtime variables come from the container env file; `NEXT_PUBLIC_*` values are baked in at build.

After an authorized push, verify the deployment result and relevant user flow. Report separate
facts for code, catalog generation, content seeding and player-data repair. A doc checkbox is
not evidence of the currently running version.
