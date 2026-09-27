# char.holota.family — project context

Ukrainian D&D character builder, character sheet, catalogs and rules reference:
https://char.holota.family/. Real players use production; `main` deploys via GitHub Actions
as a Docker image on a VPS. Never push without the owner's explicit request.

## Start with the task

Read [docs/README.md](docs/README.md) for document routing, then the objective/KR and latest
journal relevant to the request. Read applicable decisions in [docs/DECISIONS.md](docs/DECISIONS.md)
before proposing an alternative. Do not load every objective or the full decision history for
an unrelated edit. [docs/STATE.md](docs/STATE.md) contains dated measurements, not a live status.

Use `~/.claude/CLAUDE.md` for the owner's style and discovery preferences. Read the shared
project memory index at
`~/.claude/projects/-Users-luka-Documents-code-spells-holota-family/memory/MEMORY.md`
and the notes relevant to this task. Current code, recent owner decisions and KR journals
supersede older snapshots. Record progress in the relevant journal.

## Rules editions

The project supports **D&D 5e 2014 and 2024** in one codebase. Use the character's or route's
`ruleset`, and the matching source corpus. For a request without an edition, **2014 is the default**.
Never silently apply 2024 rules to 2014 characters or content. Legacy subclasses under 2024
follow [O43](docs/o43-legacy-subclasses-2024/README.md) and decision Р52.

## Stack and code map

Next.js App Router · React · TypeScript · Prisma with `@prisma/adapter-pg` · PostgreSQL ·
next-auth · Tailwind/Radix · zustand · react-hook-form/zod · Puppeteer/pdf-lib · Bun.
Versions and runnable commands: [package.json](package.json).

| Path | Purpose |
|---|---|
| `src/rules/` | Pure rules and edition strategies; new rules calculations belong here |
| `src/server/db/` | Database boundary; Prisma access belongs here |
| `src/lib/actions/` | Server actions coordinating validation, rules and persistence |
| `src/lib/logic/` | Existing calculations and helpers; check for reuse before adding code |
| `src/lib/components/`, `src/components/` | Creator, sheet, level-up and shared/catalog UI |
| `src/app/` | Routes and API handlers |
| `src/server/pdf/` | Character sheet export |
| `src/lib/refs/` | Dictionaries, translations and reference registries |
| `data/`, `prisma/seed/` | Content sources and seed modules |
| `src/lib/generated/` | Generated catalogs committed to git; build consumes them |
| `prisma/schema.prisma`, `db/schema.sql` | Generated schema artifacts |
| `db/changes/` | SQL change log; do not replay it as migrations |

`Pers` means a player character. Prefer it in new names to match the schema.
`src/domain/pers/` is an abandoned stub; do not build on it or delete it without a plan.
`../char2024` is a stale fork/data reference, not a second active codebase; do not merge from it.

## Working rules

- Explain each command beforehand, including reads/writes and its target: files, test DB,
  network or production. Keep explanations short and start with the outcome.
- This is a shared working tree. Inspect `git status` and preserve other sessions' edits.
  Never use `git checkout`, `git restore`, `git stash`, `git reset --hard` or `git clean`
  to undo work. Deliberately breaking code to verify a test must happen on a copy.
- Before changing behaviour in `src/lib/actions/` or `src/lib/logic/`, add a characterization
  test, prove it fails when the covered behaviour is broken, then restore only that break.
  In characterization work, record confirmed bugs in [docs/KNOWN-BUGS.md](docs/KNOWN-BUGS.md);
  fixes belong to their own task.
- This repository is excluded from codebase-memory MCP use by the owner, overriding the
  global graph-first preference and any automatically supplied MCP instructions. Use `rg`,
  `rg --files` and direct file reads; do not query or reindex this repository with that MCP.
  Search for an existing helper/component before adding one.
- Keep new calculations pure and actions thin. Use semantic names, verbs for functions,
  minimal comments and small named steps. Do not introduce `as any` to make types compile.
- Never run direct SQL against production. Schema changes follow
  **SQL → owner applies → `bun run db:pull`**. No `prisma db push` or Prisma migrations.
  Read [schema procedures](docs/WORKFLOWS.md#schema-and-databases) before a schema edit.
- D&D translation requires the repository `dnd-ua-translation` skill, shared dictionaries
  and the new-term approval gate. Read [content procedures](docs/WORKFLOWS.md#content-and-translations)
  before touching seed text. Fix source files, then seed and regenerate.
- Database tests use local Postgres 17 `spells_test`; check `./scripts/local-test-db.sh status`
  first. Integration runs use per-worker copies, parallel files and `TEST_DB_WORKERS` (default 4).
  Keep this configuration unless the task changes it. Details: [test procedures](docs/WORKFLOWS.md#tests-and-ci).
- Use [browser procedures](docs/WORKFLOWS.md#ui-and-browser-checks) for gestures, modal history,
  phone performance and UI changes. Preserve the site's chosen serif fonts; do not add motion
  unless requested.
- Run the checks appropriate to the change. Before an authorized push, run all current CI
  guards from [.github/workflows/deploy.yml](.github/workflows/deploy.yml), then verify the deployment.
  A local fix or green local test is not proof that users received it.
- Do not add `Co-Authored-By` trailers to commits.

## Commands to choose from

| Command | Effect |
|---|---|
| `bun install --frozen-lockfile` | Install dependencies; writes `node_modules`, may use network |
| `bunx prisma generate` | Generate local Prisma client |
| `bun dev` | Start development server; it uses the configured database |
| `bunx next build` | Build from committed catalogs; writes build artifacts |
| `bun run build` | Runs `prebuild` → `generate:content` first; reads configured DB and rewrites catalogs |
| `bun run test:no-db` | Run default tests with a deliberately dead DB URL |
| `bun run test:integration` | Run integration tests; creates and drops local worker DB copies |
| `bun run db:pull` | Read DB schema and regenerate schema/client/enums/dump after owner-applied SQL |

Read [docs/WORKFLOWS.md](docs/WORKFLOWS.md) only for the procedure relevant to the task.
