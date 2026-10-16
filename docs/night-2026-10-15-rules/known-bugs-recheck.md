# known-bugs-recheck — переперевірка KNOWN-BUGS, частина 2014

Нічний потік «правила», 2026-10-16. Лише читання проду (`BEGIN READ ONLY`), без користувачів 5 і 967.
Записи 2024 не перевіряв. `docs/KNOWN-BUGS.md` не змінював: рядки статусу нижче застосовує крок інтеграції.

## Головне

- Чотири записи виправлено цієї ночі в коді: BUG-036, DIVINE-SOUL, SUBCLASS-SKILL-CHOICE-CREATION,
  SUBCLASS-SKILL-DATA (коміти 8afaff24, 6f9c6057, 831cc61f).
- Лічильники BUG-023/030/034 і звʼязки заклинань геназі BUG-019 виправлено в сіді й каталозі (85e749be).
  Для проду є SQL власнику.
- Текст рис (BUG-016/017/018) у проді досі старий. Його доставляє вузький `seed:feat-text:prod`:
  попередній перегляд показує 37 рис.
- Текст рис рас і підрас (BUG-015, 019, 021, 022, 024–028, 030–032) у проді теж старий: 94 з 277 рядків сіду
  відрізняються. **Вузького скрипта для нього немає.** `seed:race-traits:prod` торкається лише трьох рас і
  показує 0 змін. Потрібен новий вузький скрипт, це кандидат на раунд 2. Повні сідери 2014 запускати не можна.
  Зачеплено 321 персонажа (184 користувачі, 73 активні за 30 днів).
- Розділ «Відкриті» у KNOWN-BUGS (~рядок 281) каже «порожньо станом на 2026-09-18», хоча вище є відкриті записи
  O49/QA і BUG-015…037. Заголовок варто виправити.

## Таблиця

| Запис | Статус | Доказ | Дія власника |
|---|---|---|---|
| BUG-036 підкласові заклинання мультикласу на рівень пізніше | виправлено | `collectClassesAfterLevelUp` (`src/rules/classes-at-level.ts`); `tests/db/multiclass-entry-granted-spells.test.ts` | деплой |
| O49-DIVINE-SOUL-SPELL-LIST | виправлено | `findExpandedSpellList2014`; `tests/rules/class-spell-choices-2014.test.ts`, `tests/db/divine-soul-cleric-list-2014.test.ts` | деплой |
| O49-SUBCLASS-SKILL-CHOICE-CREATION | виправлено (ручний конструктор 2014) | група «Навички за підклас»; `tests/components/subclass-skill-choice-2014.test.tsx`, `tests/actions/background-and-subclass-skills-2014.test.ts` | деплой; ~24 наявні персонажі лишаються як є |
| O49-SUBCLASS-SKILL-DATA | виправлено | прод: 8447 `["ARCANA"]`, 8495 — вибір 1 з 3; тепер і в сіді | — |
| BUG-023 Stone's Endurance | виправлено в сіді й каталозі | прод: 1612 `SHORT_REST`, 31 персонаж | SQL `known-bugs-recheck-race-limits-owner-applies.sql` |
| BUG-030 Shifting MPMM (лічильник) | виправлено в сіді й каталозі | прод `SHORT_REST`, 18 персонажів; текст — див. рядок про текст рас | той самий SQL |
| BUG-034 Metallic Breath Weapon | виправлено в сіді й каталозі | прод: 5828 `SHORT_REST` без кількості, 6 персонажів | той самий SQL |
| BUG-019 геназі MPMM, заклинання | звʼязки виправлено в сіді; текст відкритий | у проді `_FeatureToSpell` тримає Shape Water, Water Breathing, Flaming Sphere. Хибних `pers_spell` у 11 персонажів немає, бо видача йде з `race-granted-spells.json` | SQL `known-bugs-recheck-genasi-owner-repair.sql`; текст — новий скрипт |
| BUG-016 Strixhaven Initiate | відкрито в проді | `seed:feat-text:prod` у попередньому перегляді: 5 рис Strixhaven; 6 персонажів | `seed:feat-text:prod --apply` |
| BUG-017 Ritual Caster / Skill Expert / Prodigy / Skulker / Spell Sniper | відкрито в проді | той самий перегляд; 64 персонажі | `seed:feat-text:prod --apply` |
| BUG-018 Aberrant Dragonmark | відкрито в проді | той самий перегляд; 5 персонажів | `seed:feat-text:prod --apply` |
| BUG-015, 021, 022, 024–028, 031, 032 (текст рас) | відкрито в проді | 94 з 277 рядків сіду рас і підрас відрізняються; Trance (морський ельф, еладрін, шадар-кай), Fey Ancestry MPMM і Hold Breath черепахи — у проді старі спільні рядки | новий вузький скрипт або SQL (раунд 2) |
| BUG-035 Mammon | відкрито | 8 персонажів варіанта; потрібні окремі лічильники, рядок 5731 має один `LONG_REST` на все | рішення про модель лічильників |
| BUG-037 Mark of Passage | відкрито | 6 персонажів; рисами 5790–5792 не володіє жоден, Courier's Speed немає | окрема задача |
| O49-HALF-ELF-DROW-MAGIC | код виправлено; персонажі не відремонтовані | 23 персонажі з «Магією дроу», у 13 немає Dancing Lights | рішення: ремонт SQL чи чекати підвищення |
| O49-GENERATED-SPELLS-DUNAMANCY-LISTS | відкрито | у проді 15 заклинань дунамантії без класів | звірити `data/2014/spells.json`, потім `seed:spells-2014:prod` (перегляд) |
| O49-METAMAGIC-ADEPT | виправлено в проді | 10 опцій | — |
| O49-EVER-LIVING-LEVEL | виправлено в проді | Gift of the Ever-Living Ones `{pact: Chain}`, One with Shadows `{level: 5}` | — |
| O49-GIANT-FEATS-ABILITIES | виправлено в проді | Soul: Сила/Мудрість/Харизма; Guile: Сила/Статура/Харизма | — |
| O49-WIZARD-EQUIPMENT | дані виправлено в проді | 0 рядків кинджала в групі 4 | — |
| QA-SHIELD-AS-BASE-AC | у проді 0 щитів, вдягнених як обладунок | лише дані; код цієї ночі не перевіряв | перевірити код окремо |
| O49-BACKGROUND-TOOLS-DERIVED | відкрито | колонки перевизначення інструментів у проді немає | SQL-пропозиція з O49 |
| O49-FUZZ, QA-LIGHT-CLERIC, RACIAL-CHOICES, BACKGROUND-CATALOG-CHOICES, MONK-DISCIPLINE-REPLACEMENT, LEVELS-FEATURE-SPELLS-NO-OPEN-PICK | відкрито, не перевіряв | лише код, цієї ночі не торкався | — |
| BUG-020, 029, 033 (UI й гідрація) | не перевіряв | лише код | — |

## Рядки статусу для KNOWN-BUGS

- BUG-036 — виправлено 2026-10-16 (8afaff24): клас, узятий мультикласом, дає заклинання підкласу й класу
  на рівні входу. Характеризаційний тест переведено на правильне значення.
- BUG-O49-DIVINE-SOUL-SPELL-LIST — виправлено 2026-10-16 (6f9c6057): вибори Чародія з Божественною душею 2014
  беруть і список клірика.
- BUG-O49-SUBCLASS-SKILL-CHOICE-CREATION — виправлено 2026-10-16 (831cc61f) у ручному конструкторі 2014.
  Наявні персонажі лишаються як є.
- BUG-O49-SUBCLASS-SKILL-DATA — виправлено: прод уже мав дані, сід вирівняно 2026-10-16.
- BUG-023, BUG-030 (лічильник), BUG-034 — виправлено в сіді й каталозі 2026-10-16 (85e749be). Прод — після SQL
  власника `docs/night-2026-10-15-rules/known-bugs-recheck-race-limits-owner-applies.sql`.
- BUG-019 — звʼязки заклинань виправлено в сіді (85e749be). Прод — SQL
  `known-bugs-recheck-genasi-owner-repair.sql`. Текст у проді старий, бо немає вузького скрипта.
- BUG-016, 017, 018 — сід правильний, прод — після `seed:feat-text:prod --apply`.
- BUG-015, 021, 022, 024–028, 031, 032 — сід правильний, у проді старий текст; вузького скрипта доставки немає.
- «Відкриті»: замінити «порожньо станом на 2026-09-18» на перелік відкритих записів або посилання на них.

## План для власника (по порядку)

Кожен скрипт без `--apply` лише показує зміни. Повні сідери 2014 (`prisma/seed.ts`) не запускати.

1. Задеплоїти гілку з комітами 8afaff24, 6f9c6057, 831cc61f, 85e749be.
2. `bun run seed:feat-text:prod`. Перегляд має показати 37 рис. Потім `bun run seed:feat-text:prod --apply`.
3. `bun run seed:swept-term-text:prod`. Перегляд має показати 14 полів. Потім `bun run seed:swept-term-text:prod --apply`.
4. Застосувати `docs/night-2026-10-15-rules/known-bugs-recheck-race-limits-owner-applies.sql`
   (очікувано `UPDATE 1`, `UPDATE 1`, `UPDATE 5`; контрольний SELECT у кінці файлу). DDL немає, `db:pull` не потрібен.
5. Застосувати `docs/night-2026-10-15-rules/known-bugs-recheck-genasi-owner-repair.sql`.
6. Лише після кроків 2–5: `bun run generate:creator-content` (скрипт уже має `--target prod`). Знімок 2014 має
   збігтися з комітом 85e749be: зміняться лише поля лічильників.
7. Якщо цієї ж ночі запускаєте `seed:2024:prod`, одразу після нього — `bun run seed:remove-asi-feat-2024:prod --apply`.
8. `seed:spells-2014:prod` — лише перегляд, поки не звірено дунамантію.

Текст рас і підрас цей план не доставляє: потрібен новий вузький скрипт (раунд 2).

## Перевірки

- `tests/content/race-trait-mechanics-2014.test.ts` — 12/12; `creator-content-parity` — 6/6.
- Локальні бази (`spells_test` і клон) прочитано назад після SQL: 1612, 1642, 5763–5766 — `LONG_REST` з PB, 5828 —
  `LONG_REST`, 1 використання. Звʼязки геназі в локальних базах SQL лише проганяли в `ROLLBACK`.
- Прод-логи: scratchpad `rules/known-bugs-recheck/` (`prod-recheck.log`, `prod-affected.log`, `prod-seeder-preview.log`).
