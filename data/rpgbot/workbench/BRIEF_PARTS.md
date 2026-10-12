# Addendum to BRIEF.md — page split into parts (several agents, one page)

Some long pages are translated by several agents at once, each taking a set of sections ("part N"). Follow BRIEF.md with these changes:

- Output goes to `$S/tr_<slug>.partN.py` — a STANDALONE module in the usual shape: `import re, sys`, `sys.path.insert(0, S)`, `import refs`,
  `HEADINGS = {...}` (only YOUR sections that show no preset `=>` heading), `FRAGMENTS = {...}` (keys of your sections only), the
  closing line `FRAGMENTS = refs.expand_all(FRAGMENTS)` (no `pair_label_marker` here: label pairing happens when the sheet is filled).
  No TITLE/TOPICS (the coordinator writes them). If your part contains a Levels table, its `LEVEL_FEATURES` / `LEVEL_NOTES` loops go into your part before the closing line.
- Checks for your part (cwd = $REPO):
  `python3 $S/fix_apos.py $S/tr_<slug>.partN.py` · `python3 $S/mixscan.py $S/tr_<slug>.partN.py` ·
  `python3 $S/check_tr.py <slug>.partN` (must end with `flagged: 0`) ·
  `python3 $S/missing_keys.py <slug> .partN <your section ids…>` (must show `still missing: 0`; the `keys without fragment` count is not computed when section ids are given).
- Do NOT run `w.py finish` and do not touch the worksheet, decisions or draft: the coordinator assembles the parts and builds. Your only outputs are the part file
  and, if needed, `$S/terms_<slug>-partN.md` / `$S/notes_<slug>-partN.md`.
- Other agents translate the other sections of the same page at the same time. For terms that appear in several parts (feature names, feats, book names) use the
  catalog/gloss rendering so the parts agree; do not wait for them.
- Report (max 120 words): part file path, number of fragments, check results, terms/notes files, owner-veto candidates.
