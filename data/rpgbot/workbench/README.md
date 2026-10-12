# Робочий стіл перекладу (KR49.3)

Знімок інструментів і перекладів, які раніше лежали в тимчасовій теці сесії. Усі шляхи в скриптах уже вказують
сюди. Повний контекст і стан: [kr49.3-handoff-2026-10-02.md](../../../docs/o49-rpgbot-analysis/kr49.3-handoff-2026-10-02.md).
Усі команди запускати з кореня репозиторію (`cd /Users/luka/Documents/code/spells.holota.family`).

## Склад

| Файли | Для чого |
|---|---|
| `tr_<slug>.py` | переклад сторінки: `TITLE`, `TOPICS`, `HEADINGS` (sectionId → заголовок), `FRAGMENTS` (ключ фрагмента → український текст), для довгих сторінок — `tr_<slug>.partN.py` і зібраний `tr_<slug>.py` |
| `terms_<slug>.md`, `notes_<slug>.md` | нові терміни (`EN → UA │ фрагмент │ чому`) і розбіжності джерела |
| `w.py` | `show`, `gloss`, `prep`, `finish` аркуша; автоматичні рішення для типових питань компіляції |
| `refs.py` | розгортає токени `<<Заклинання>>`, `<<c:…>>`, `<<m:Предмет>>`, `<<q:Риса>>` із каталогів; `pair_label_marker(text, source)` — парний маркер мітки списку, лише коли англійський рядок починається саме з цієї мітки (мітка може мати кому, код книги в дужках чи `[[…]]` без пробілу; викликається в `fill_sheet.fill_lines`) |
| `lookup.py`, `glossary.py` | точний пошук англійського терміна в каталогах і словнику |
| `check_tr.py`, `check_markers.ts`, `fix_apos.py`, `mixscan.py`, `missing_keys.py`, `sync_check.py` | перевірки перекладу |
| `qc_check.py`, `qc_rebuild.py`, `qc_expand_tokens.py`, `qc_sync_tr.py`, `qc_canon.py`, `test_label_pairing.py` | контроль якості готових аркушів (опис — `docs/o49-rpgbot-analysis/kr49.3-qc-pass-2026-10-03.md`): `qc_check.py <slug>` перед кожним `finish` (його лінтер маркерів `check_markers.ts` ловить і маркер без охоплених слів), `qc_rebuild.py` після правки аркуша |
| `plan_parts.py`, `assemble.py` | поділ довгої сторінки на частини й збирання назад |
| `patch_sheet.py`, `bulk_replace.py`, `lower_after_colon.py`, `fix_paren_markers.py`, `refresh_tags.py`, `retrofit_labels.py`, `reuse_all.py` | правки готових аркушів із перезбиранням чернетки; перенесення перекладів з порівняльних сторінок |
| `BRIEF.md`, `BRIEF_PARTS.md`, `BRIEF_ADDENDUM_2026-10-03.md` | інструкція перекладача; додаток має чинний канон термінів і перемагає там, де розходиться з `BRIEF.md` |
| `STATUS.md`, `status.py` | стан; `TERMS-PENDING.md` — терміни на погодження |

## Цикл однієї сторінки

1. `python3 data/rpgbot/workbench/w.py prep <slug> <url-path> "<теми>"` — створити аркуш (якщо ще немає).
2. `python3 data/rpgbot/workbench/reuse_all.py <slug> --apply` — підтягнути однакові фрагменти з уже перекладених сторінок.
3. Написати `tr_<slug>.py` за зразками (`tr_wizard-conjuration-2014.py` — гайд підкласу, `tr_cleric-2014.part1/2.py` — клас,
   `tr_druid-spells-2014.part1/2.py` — заклинання).
4. Перевірки: `fix_apos.py`, `mixscan.py`, `check_tr.py`, `missing_keys.py`.
5. `SKIP_FILLED=1 python3 data/rpgbot/workbench/w.py finish <slug>` (перезапуск після заповнення — з `--recompile`).
6. Виправлення готової сторінки: `patch_sheet.py <slug> "<старе>" "<нове>"` (рівно одне входження в аркуші).

## Застереження

- `data/rpgbot/` не в git; перед масовими правками робіть копію (скрипти кладуть резерви в `backup/`).
- Незавершені `tr_*.py` (`druid-circle-of-spores`, `druid-circle-of-the-shepherd`, `warlock-hexblade`, `paladin-2014.part2`)
  не мають завершального рядка з `refs.expand_all` — додайте, коли файл буде повним.
- `tr_rogue-2014.part*.py` і `tr_monk*.py` — старі уривки з попередніх етапів; чинні лише зібрані `tr_rogue-2014.py` та аркуші.
- Брама апострофів перевіряє й цю теку: у `.md` лише `ʼ`.
