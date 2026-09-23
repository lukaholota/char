# Codex project instructions

Claude is the primary agent for this project. Codex should use Claude's existing project context
and memory instead of building a separate account of the project. Do not change Claude's setup
to accommodate Codex.

## Required reading at the start of work

Before proposing or changing code, read:

- `~/.claude/CLAUDE.md` for the owner's coding style and code-discovery preferences
- `CLAUDE.md`
- `docs/README.md`
- `docs/DECISIONS.md`
- `docs/STATE.md` when the task depends on what is deployed, seeded, or committed
- the active KR document under `docs/o*/`
- `docs/KNOWN-BUGS.md` when working on rules or characterization

Read the applicable session handoff or journal before resuming an unfinished KR.  Treat those
documents as the source of truth; keep this file short rather than duplicating them.

## Shared project memory

At the start of each project task, read Claude's project memory index at
`~/.claude/projects/-Users-luka-Documents-code-spells-holota-family/memory/MEMORY.md`.
Read the linked topic notes relevant to the task before choosing an approach or running a risky
command. This is the same live memory Claude uses; do not create a separate Codex memory copy.
For a durable lesson, update that memory when the environment permits writing to it, and record
task progress in the relevant KR journal or handoff. If the memory path is unavailable, continue
from the repository documents and state that the memory was unavailable. Some notes describe
earlier states of the project: current code, recent decisions, and KR journals take precedence.

For D&D content translation, use the repository skill `dnd-ua-translation`, linked from
Claude's `.claude/skills/dnd-ua-translation`; check the shared dictionaries and apply its
new-term approval gate before translating a batch.

## Non-negotiable project rules

- Treat D&D 5e **2014** as the default; follow the task's explicit ruleset and never silently
  apply 2024 rules to 2014 content.
- `main` deploys directly to production. Never push without the owner's explicit request.
- Do not use `git checkout`, `git restore`, `git stash`, `git reset --hard`, or `git clean` to
  undo work in this shared working tree. See the shared `never-git-checkout-in-this-repo` note.
- Before changing behaviour in `src/lib/actions/` or `src/lib/logic/`, add a characterization test
  and prove it fails when its covered behaviour is deliberately broken, then restore the code.
- During O2, document empirically confirmed bugs in `docs/KNOWN-BUGS.md`; do not fix them as part
  of characterization.
- Never run direct SQL against production. The database is the schema source of truth; follow the
  SQL → owner applies → `bun run db:pull` workflow. Never hand-edit `prisma/schema.prisma`, run
  `prisma db push`, or run Prisma migrations.
- Database tests use the local Postgres 17 `spells_test` managed by
  `./scripts/local-test-db.sh`. Check `status` before a run. Integration tests use per-worker
  database copies and parallel files (`TEST_DB_WORKERS`, default 4); keep the current Vitest
  configuration unless the task explicitly changes it. See `CLAUDE.md` and decision Р45.
- Explain every command beforehand, including whether it only reads files or writes to files, a
  test database, the network, or production.
- Do not add `Co-Authored-By` trailers to commits.
