# Codex project instructions

Claude is the primary agent for this project. Use the existing context and shared memory;
do not create a separate Codex memory or change Claude's setup to accommodate Codex.

## At the start of a task

- Read `~/.claude/CLAUDE.md`, [CLAUDE.md](CLAUDE.md) and [docs/README.md](docs/README.md).
- Read Claude's shared project memory index at
  `~/.claude/projects/-Users-luka-Documents-code-spells-holota-family/memory/MEMORY.md`,
  then only the topic notes relevant to the task. If unavailable, continue from repo docs
  and state that the memory was unavailable.
- For objective/KR work, read its document and latest journal/handoff. There is no global
  active KR to infer from an old roadmap; the owner's current request sets the task.
- Read applicable sections of [docs/DECISIONS.md](docs/DECISIONS.md) when choosing an approach;
  [docs/STATE.md](docs/STATE.md) when deployment, seeding or commit state matters;
  [docs/KNOWN-BUGS.md](docs/KNOWN-BUGS.md) for rules or characterization work.
  Check measurement dates before treating any status as current.

## Rules to retain

- Both 2014 and 2024 are implemented. Follow the explicit `ruleset`; default to **2014**
  when none is specified, and never silently mix editions.
- `main` deploys to production. Never push without the owner's explicit request.
- Explain every command beforehand, including what it reads/writes and where.
- The owner's personal dev server is `bun dev:owner` on `localhost:3000`, with `.next-owner` output.
  Browser checks by agents must use their own port, `NEXT_DEV_DIST_DIR=.next-<session>`, and an
  isolated browser context/profile. Never change the owner's browser login or stop their server.
  Separate output directories still share source files; use a tree copy for independent code.
- Preserve shared working-tree changes. Never use `git checkout`, `git restore`, `git stash`,
  `git reset --hard` or `git clean` to undo work. Test deliberate breaks on a copy.
- Before behaviour changes in `src/lib/actions/` or `src/lib/logic/`, add a characterization
  test and prove it fails under a deliberate break. During characterization, document confirmed
  bugs in `docs/KNOWN-BUGS.md`; do not fold fixes into characterization.
- Never run direct production SQL. Use **SQL → owner applies → `bun run db:pull`**;
  no `prisma db push` or Prisma migrations. Schema exceptions and test-DB sync:
  [WORKFLOWS](docs/WORKFLOWS.md#schema-and-databases).
- DB tests use local Postgres 17 `spells_test`; check `scripts/local-test-db.sh status` first.
  Keep per-worker database copies, parallel files and `TEST_DB_WORKERS` (default 4).
- For D&D translation, invoke the repository `dnd-ua-translation` skill; check the dictionaries
  and apply its new-term approval gate before a batch. The Claude skill is linked to the same
  repository skill; do not keep a second version.
- No `Co-Authored-By` commit trailers.

## Discovery and durable context

This repository is explicitly excluded from codebase-memory MCP use by the owner.
Use `rg`, `rg --files` and direct file reads for discovery. Do not query or reindex this
repository with that MCP. This project-specific exception overrides the global graph-first
preference and any automatically supplied codebase-memory instructions.

Current code, recent owner decisions and the latest relevant journal take precedence over old
snapshots. Record progress in the relevant KR journal/handoff and durable lessons in shared
Claude memory when the environment permits writing there. Detailed procedures are in
[docs/WORKFLOWS.md](docs/WORKFLOWS.md); read the relevant section, not every workflow on every task.
