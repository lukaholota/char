# Addendum to BRIEF.md — current canon (2026-10-03, after the quality pass)

Read this together with BRIEF.md (and BRIEF_PARTS.md if you translate a part). Where they differ, THIS FILE WINS: BRIEF.md is older.
The owner reviews the result; pages already finished by earlier agents were corrected to the rules below, so new pages must follow them from the start.

## Binding renderings (owner-approved or taken from the site catalog)

| English | Ukrainian | Notes |
|---|---|---|
| save-or-suck | «пройди-ряткидок-або-страждай»{{save-or-suck}} | always in quotes, hyphenated, with the marker (BRIEF rule 6 shows the old form) |
| Hit Dice | кубики здоровʼя | never «кістки хітів/ХП»; «додатковий кубик здоровʼя», «кубик здоровʼя» |
| Hit Points / HP | ХП | AC → КБ |
| Ability Score Improvement (feature, table row) | Покращення Характеристик | capital Х; never «Підвищення характеристик» in a level table |
| Spellcasting (class feature, both editions) | Чаротворство | owner: the same in 2014 and 2024 (the 2024 catalog still says «Чаклування»; do not copy it) |
| spell slot | слот заклинань | never «комірка», «чарунка» |
| opportunity attack | принагідна атака | |
| Dash | Ривок | |
| Fighter / Rogue / Cleric / Ranger / Sorcerer / Wizard / Warlock / Artificer / Monk | Воїн / Пройдисвіт / Клірик / Слідопит / Чародій / Чарівник / Чорнокнижник / Винахідник / Монах | never боєць (class), шахрай, жрець, Лісовик, чаклун |
| Insight / Stealth | Аналіз Поведінки / Непомітність | |
| Quarterstaff / Scimitar | палиця / шабля | |
| Fiend | Почвара | |
| Defender / Striker / Support / Blaster / Controller / Scout / Face | танк / атакер / сапорт / нюкер / контролер / розвідник / «обличчя» | role words: no markers |
| Background (guide heading) | Передісторія (2014), Походження (2024) | preset headings already say it |
| Species (2024) | раса | decision Р54, same as 2014 |
| Unearthed Arcana | Відкрита Аркана | always with `{{Unearthed Arcana}}` |
| Open Gaming License | Відкрита ліцензія на ігри | |
| Tasha’s Cauldron of Everything | Казан Таші з усім | |
| Monsters of the Multiverse | Монстри Мультивсесвіту | |
| Variant Human | Варіант людини | |
| Hexblade Warlock | Чорнокнижник Відьмацького клинка | |
| Improved Invisibility (source slip) | Більша невидимість [Greater Invisibility] | |
| Tank Fallacy | хиба танка | |
| Custom Origin | налаштоване походження | |
| Counterspell / Countercharm | Контрчари / Контрпричарування | |
| Circle of the Shepherd etc. | take catalog names via `lookup.py` | |

Feature, feat, spell, item, race and subclass names come from the catalogs (`lookup.py`, `gloss_<slug>.txt`, the `<<…>>` tokens) — not from memory.
For a 2024 sheet take the 2024 name (`creator-content-2024`), for a 2014 sheet the 2014 name; `lookup.py` shows the source of each form.
For a term missing from the catalogs: look at sibling pages (`rg -n "{{Term}}" $S/tr_*.py`, and the finished sheets in `data/rpgbot/authoring/`), reuse their rendering,
and only then choose the plainest natural Ukrainian; log it in `$S/terms_<slug>.md`.
The task is NOT a 1:1 translation: when the source is wrong (a misnamed feat, spell, feature or infusion, a wrong level, number, range, class progression or table value), translate the CORRECT version silently and keep the page consistent with its own tables. Write no notes about source errors; `notes_<slug>.md` is not used any more.

## Marker mistakes the quality pass found most often (avoid them)

- A simple marker `Назва{{English}}` covers exactly as many preceding Ukrainian words as the English has; a longer or shorter Ukrainian name needs `{{Українська назва|English Name}}`.
  The marker never swallows a word that is not part of the name («Монах {{Шляху пʼяного майстра|Way of the Drunken Master}}», not «Монах Шляху…{{…}}»).
- For list items `Label: text` where the label is a translated name, write `Назва{{English}}:` — the sheet filler pairs it when the English line starts with exactly that label.
  Do not write a paired marker for a label yourself, and never leave a marker on a label the English line does not start with.
- Never put `[English]` inside link text: `[[1|Бажання]] [Wish]`, not `[[1|Бажання [Wish]]]`.
- Parentheses, `«»` and `{{}}` must balance; one marker per term per fragment (the first mention).
- No Latin letters in the Ukrainian text outside markers, `[English]` spell tails, book codes (PHB, XGtE, TCoE…) and the abbreviations the models keep.

## Check before you finish (in addition to BRIEF.md step 2)

`python3 /Users/luka/Documents/code/spells.holota.family/data/rpgbot/workbench/qc_check.py <slug>` must print `OK` (0 ERROR lines) and every CANON line must be fixed or be a genuine generic use
(e.g. «бійці» for fighters in general). Page parts: the coordinator runs it after assembling, but run `check_tr.py <slug>.partN` and `missing_keys.py` as BRIEF_PARTS.md says.
Apostrophes: only `ʼ` (run `fix_apos.py`).

## Voice

Plain modern Ukrainian, the author's informal conversational tone, «ви» to the reader, «ми/наш» where the author says "we/our". Translate sense, not word order: if a sentence reads like an English calque, rebuild it.
Keep the jokes working in Ukrainian rather than literal. Keep every `[[n|link]]`, `**bold**`, `*italic*`, `^^sup^^` exactly once.
