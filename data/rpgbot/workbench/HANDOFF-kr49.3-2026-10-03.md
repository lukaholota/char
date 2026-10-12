# KR49.3 handoff — 2026-10-03

## Project constraints

- Continue translating RPGbot optimization articles into Ukrainian, unpublished drafts only; 2014 pages first, then 2024.
- Follow `AGENTS.md`, `CLAUDE.md`, `.claude/skills/dnd-ua-translation/SKILL.md`, `docs/o49-rpgbot-analysis/kr49.3-handoff-2026-10-02.md`, `data/rpgbot/workbench/{README,BRIEF,STATUS}.md`, `docs/o49-rpgbot-analysis/kr49.3-working-terms.md`, and `data/rpgbot/workbench/TERMS-PENDING.md`.
- No commit/push/deploy, destructive git commands, direct SQL, or `as any`. Keep drafts private. Do not add new terms to dictionary; document new choices in `terms_<slug>.md` and source discrepancies in `notes_<slug>.md`.
- Per article: `w.py show` → one `tr_<slug>.py` → `fix_apos.py`, `mixscan.py`, `check_tr.py` flagged 0, `missing_keys.py` still missing 0 → `SKIP_FILLED=1 python3 w.py finish <slug>`; after each whole group run coverage, indices, tests, and update journal/STATUS.

## Completed this turn

- `bard-eloquence-2014` is compiled to `data/rpgbot/uk/rpgbot-bard-eloquence-2014.json`. Verified `article.slug=bard-eloquence-2014`, `status=unpublished`, `ruleset=RULES_2014`; `check_tr` flagged 0 and `missing_keys` still missing 0. Translation source, terms and notes are in `data/rpgbot/workbench/tr_bard-eloquence-2014.py`, `terms_bard-eloquence-2014.md`, `notes_bard-eloquence-2014.md`.
- Started next ordered guide `bard-glamour-2014`; source worksheet is `data/rpgbot/authoring/bard-glamour-2014.md`, URL `/dnd5/characters/classes/bard/subclasses/glamour/`.
- Combined agent work is safely merged into `data/rpgbot/workbench/tr_bard-glamour-2014.py` (114 fragments), with `refs.expand_all(FRAGMENTS)` as final row. Terms and notes are in `terms_bard-glamour-2014.md` and `notes_bard-glamour-2014.md`.
- Supporting original fragments/notes remain in `/private/tmp/glamour_{features,options,build}.pyfrag` and matching `_notes.md` files.

## Immediate work remaining for bard-glamour-2014

1. Translate the two missing fragments currently reported by `missing_keys.py bard-glamour-2014`:
   - `block-section-race-1`
   - `block-section-background-1`
2. Resolve the one current `check_tr.py bard-glamour-2014` flag: `block-section-levels-1/row/3/1`, `Колегія гламуру` marker coverage reports 2/3. Also change the build's `Проникливість` for `Insight` to canonical `Аналіз Поведінки` in that row and prose.
3. Re-run `fix_apos.py`, `mixscan.py`, `check_tr.py`, `missing_keys.py` until apostrophe scan is stable, unresolved refs are 0, flagged is 0, and still missing is 0. Current full spell reference for source shorthand `Psychic Lance` is `<<Raulothim's Psychic Lance>>`; this has resolved in `mixscan` after fixing an accidental literal backslash.
4. Compile with `SKIP_FILLED=1 python3 w.py finish bard-glamour-2014`. If the sheet was filled before a preview failure, use `--recompile` after correcting authoring markdown.
5. Verify JSON metadata is `unpublished`/`RULES_2014` and review the source discrepancy notes. Do not run group-level coverage/test updates until all Bard subclass guides are complete.

Audited adjustments already merged: point buy `За очками`; Insight in the recommendation section `Аналіз Поведінки`; feature names match `tr_bard-subclasses-2014.py`; ability-score arrays were checked; feature phrase `За Харизми 20` was corrected; source typos `Font of Inspriation`, `Tinker Tools`, and numeric/type discrepancies are noted. No status/journal/coverage/tests were changed because the Bard guide group is incomplete.

## Next after glamour

Continue remaining Bard subclass guides in the requested order using URLs from `STATUS.md` and `data/rpgbot/translation.coverage.json`; only after the full Bard guide group, apply coverage, regenerate indices, add slugs to `tests/components/optimization-article-reader.test.tsx`, run the specified no-DB test suite, and update KR journal plus `STATUS.md`. Then continue Sorcerer guides (run `reuse_all.py --apply` first), Ranger, Artificer, remaining 2014, and then 2024.
