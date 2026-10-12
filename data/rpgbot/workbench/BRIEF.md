# Brief: translate one RPGbot guide page into Ukrainian (KR49.3)

You translate ONE page (your `<slug>`, e.g. `wizard-enchantment-2014`) of an English D&D 5e optimization guide
(rpgbot.net) into Ukrainian. The text goes into a private worksheet; a compiler turns it into a draft JSON.
Nothing is published, committed or deployed. You work in parallel with other agents on other pages.

Paths (use absolute paths; your shell's cwd may reset):
- REPO = /Users/luka/Documents/code/spells.holota.family  (run `cd $REPO` before repo commands)
- S = /Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench

## Hard limits
- Touch ONLY: `$S/tr_<slug>.py`, `$S/terms_<slug>.md`, `$S/notes_<slug>.md`, `$REPO/data/rpgbot/authoring/<slug>.md`,
  `$REPO/data/rpgbot/authoring/<slug>.decisions.json`, `$REPO/data/rpgbot/uk/rpgbot-<slug>.json`,
  `$REPO/data/rpgbot/reviews/<its revision>.json` and backup copies under `$S/backup/`.
- No git commands except read-only `git status`/`git diff`. No commit, push, checkout, restore, stash, reset, clean.
- Do not edit `src/`, `docs/`, `tests/`, other pages' files, the coverage ledger or indices (the coordinator regenerates them).
- Do not use the codebase-memory MCP in this repo; use `rg` and direct reads. No SQL, no dev server.
- Never add `as any`, comments about AI, or `Co-Authored-By` lines. (Relevant only if you write code — you normally don't.)

## Inputs
- `cd $REPO && python3 $S/w.py show <slug>` — the still-empty fragments: `## English heading | sectionId [=> preset Ukrainian heading]`,
  then lines `<fragment-suffix> <rating-tag> English text`. Full fragment key = `block-<sectionId>-<fragment-suffix>`
  (e.g. section `section-introduction`, suffix `1` → `block-section-introduction-1`; suffix `1/item/0`, `8/header/1`, `8/row/3/0`, `levels-1/row/4/2`…).
  `$S/src_<slug>.txt` is the same dump saved earlier. Fragments already filled (reused from other pages) are not shown — skip them.
- `$S/gloss_<slug>.txt` — English term = approved Ukrainian [source catalog] for terms found in the page. Use it. For anything else:
  `python3 $S/lookup.py "Exact English name" "Another"` (exact lookup in the project's generated catalogs and dictionary).
- Binding terminology: `$REPO/docs/o49-rpgbot-analysis/kr49.3-working-terms.md` (section "Погоджено" and the per-class tables are all
  owner-approved; the section "Робочі…" and the Wizard table are working terms in use) — `rg -n "term" <file>`.
- Consistency with already finished sibling pages: `rg -n "{{Term}}" $S/tr_wizard-*.py` shows how a term/feature was rendered elsewhere;
  reuse the same rendering. Finished models to read FIRST: `$S/tr_wizard-conjuration-2014.py` (subclass guide skeleton),
  `$S/tr_wizard-chronurgy-magic-2014.py`, `$S/tr_wizard-divination-2014.py`; for spell-list guides `$S/tr_rogue-arcane-trickster-spells-2014.py`
  and `$S/tr_fighter-eldritch-knight-spells-2014.py`.
- Skill rules: `$REPO/.claude/skills/dnd-ua-translation/SKILL.md` (read it once).

## Output file `$S/tr_<slug>.py`
Same shape as the models: `import re, sys`, `sys.path.insert(0, S)`, `import refs`; `TITLE`, `TOPICS` (copy style from the sibling:
«<Назва> — гайд підкласу Чарівника (2014)»; only if the model has them), `HEADINGS` (sectionId → Ukrainian heading, only sections shown without `=>`),
`FRAGMENTS` dict (key → Ukrainian), the `LEVEL_FEATURES` / `LEVEL_NOTES` loops for the level table (row index 0..19 = levels 1..20),
and the closing line `FRAGMENTS = refs.expand_all(FRAGMENTS)` — nothing else. Do NOT define a local `pair_label_marker` and do not call it in the tr file:
list-item labels (`Назва{{English}}:` whose word count differs) are paired into `{{Назва|English}}` when the sheet is filled (`fill_sheet.fill_lines`),
and only if the English line of that fragment starts with exactly that label. Anything else that needs a paired marker you write by hand.
Long file? Write it in a few steps (Write, then Edit/insert) — it is plain Python.

## Translation rules
1. Translate faithfully (not a retelling), keep the author's informal conversational voice, address the reader «ви»; the author's «we/our» stays «ми/наш»
   where the model does so. Plain modern Ukrainian, official WotC-style game terms, no calques that read badly.
2. Markup in a fragment: `[[n|text]]` link — keep every link exactly once, wrapping the translated words, same n; `**bold**`, `*italic*`,
   `^^sup^^` — keep every one exactly once; a literal asterisk is `\\*` in a Python string. Paragraphs `\n\n`, line breaks `\n` (Python escapes).
   Spell-list items: `Acid Splash ^^(^^[[1|PHB]]^^)^^: …` → `<<Acid Splash>> ^^(^^[[1|PHB]]^^)^^: …` (see the spell models).
3. Apostrophe inside Ukrainian words is only `ʼ` (U+02BC): «памʼятайте», «імʼя». Never `'` or `’` in Ukrainian words.
4. Reference tokens (expanded from the catalogs by `refs.py`, an unresolved token aborts the check):
   `<<Spell Name>>` → `Назва [Spell Name]` (catalog form, for prose/list items); `<<Spell Name|Назві>>` → declined Ukrainian part with the
   same `[English]` tail; `<<c:Spell Name>>` → plain Ukrainian spell name (for table cells, no brackets);
   `<<m:Hat of Wizardry>>` → item/feat/feature marker form; `<<q:Metamagic Adept>>` → `«Адепт метамагії»{{Metamagic Adept}}`.
   Prefer tokens for every spell, magic item, feat, class and subclass name so spelling comes from the catalog, not from memory.
5. Glossary markers (Р20): a term that was a translator's choice carries the English original right after it, no space: `Дрібна матеріалізація{{Minor Conjuration}}`.
   A simple marker covers as many preceding Ukrainian words as the English original has words. If the counts differ use the paired form
   `{{Українська назва|English Name}}`. After a closing quote `»` the marker covers the whole quoted name: `«Адепт метамагії»{{Metamagic Adept}}`.
   Put it on the first mention inside each fragment (as the models do). A marker may follow a `[[n|link]]`.
   NO markers on: conditions, damage types, ability names, spell names (they use `[English]` via tokens), the role words below, plain table labels.
   Names of feats, features, subclasses, races, backgrounds, items, class names: marker unless they are rendered by `<<m:>>`/`<<q:>>` (which add it).
6. Role words, no markers: танк, атакер, сапорт, нюкер, контролер, розвідник, «обличчя» (the Face role).
   Save-or-suck → «пройди ряткидок або страждай»{{save-or-suck}}. Saving throw = ряткидок. Keep `DPR`, `MAD`, `AC`→`КБ`, `HP`→`ХП` as the models do;
   look at the models for rating labels, Point Buy/Standard Array, ability table rows and other recurring pieces — match them exactly.
7. New terms: if a term is not in the catalogs, the working-terms doc or sibling pages, pick the plainest natural Ukrainian rendering, put the
   English marker on it, and append a line `EN → UA | fragment key | why` to `$S/terms_<slug>.md`. Do not stall and do not ask the owner.
   If the source states something that contradicts the actual rules/other pages (wrong number, wrong feature), translate as written and note it in `$S/notes_<slug>.md`.
8. No leftover English words in the Ukrainian text except inside `{{…}}` markers, `[English]` spell tails, link text that is a book code (PHB, XGtE, TCoE…) and
   standard abbreviations (DPR, MAD, XP… as the models keep them). `<red|orange|green|blue>` tags only describe source colour spans — do not write those words in the translation.

## Procedure
1. Read the models, `w.py show`, the gloss. Write `$S/tr_<slug>.py`.
2. Static checks (from `$REPO`):
   `python3 $S/fix_apos.py $S/tr_<slug>.py` (normalises apostrophes) ·
   `python3 $S/mixscan.py $S/tr_<slug>.py` (finds Latin/Cyrillic mixed words — fix real ones) ·
   `python3 $S/check_tr.py <slug>` (marker lint; must end with `flagged: 0`; also surfaces unresolved `<<…>>` tokens) ·
   `python3 $S/missing_keys.py <slug>` (must show `still missing: 0` and `keys without fragment: 0`).
3. Build: `cd $REPO && SKIP_FILLED=1 python3 $S/w.py finish <slug>`.
   It fills the worksheet, auto-decides trivial compile issues, compiles to `data/rpgbot/uk/rpgbot-<slug>.json` and prints a quality scan.
   - `Unresolved rating signals: N … blue` / `NEEDS MANUAL DECISION: N: …` → create or extend `data/rpgbot/authoring/<slug>.decisions.json`:
     `{"114": {"disposition": "excluded-noncontent", "evidence": "Color word inside prose ('…to blue'), not an option rating"}}`
     (N is the issue index; evidence = one factual sentence), then rerun with `--recompile` appended. After the sheet is filled, reruns must use `--recompile`.
     A final "An output already exists" error on a repeated run is harmless.
   - Any other failure: read the message, fix the cause in `tr_<slug>.py` (the sheet already filled → patch it with step 4 instead).
4. Fixing after a successful build: `python3 $S/patch_sheet.py <slug> "<exact old text>" "<new text>"` (exactly one match in the sheet; rebuilds the draft;
   keep `tr_<slug>.py` in sync by hand). Re-run the quality scan with `python3 -c` is not needed; `w.py finish <slug> --recompile` on a deleted draft also works.
5. Finish: last step is a clean `quality flags: 0` (or every flag explained — e.g. the English proper names inside markers are fine).

## Final report (max 150 words)
slug · number of fragments translated · build result (compiled? flags?) · path of terms/notes files if any · decisions you had to take that the owner may want to veto.
