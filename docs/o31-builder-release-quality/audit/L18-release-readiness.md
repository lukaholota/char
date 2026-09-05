# L18 — Готовність до релізу

Мітка: `L18-release-readiness`. Знято 2026-09-04, 22:20–23:00.
Робочі файли: `scratchpad/audit/work/L18-release-readiness/` (`lint.txt`, `tsc.txt`,
`dbboundary.txt`, `uidecomp.txt`, `testnodb.txt`, `rulescov.txt`, `drift.mjs`, `anon2024.mjs`).
Скріншоти: `scratchpad/audit/shots/L18-01-home-anon.png`, `L18-02-2024char-anon.png`.

## Короткий підсумок

Конвеєр `.github/workflows/deploy.yml` **не дійде навіть до другої джоби**. Перша джоба
(`rules-coverage`) складається з двох кроків, і **обидва зараз червоні**. Навіть якби вони
позеленіли, джоба `image` впала б на власному сторожі Dockerfile, бо 18 із 20 генерованих
каталогів немає в git. Це три незалежні блокери, кожен окремо зупиняє деплой.

| Гейт | Джоба CI | Результат локально | Код виходу |
|---|---|---|---|
| `bun run check:ui-decomposition` | `rules-coverage` крок 1 | **11 порушень** | 1 |
| `bun run test:rules:coverage` | `rules-coverage` крок 2 | **45,2 % проти планки 80 %** | 1 |
| `bunx prisma generate` | `checks` | — | — |
| `bunx tsc --noEmit` | `checks` | 0 помилок ✅ | 0 |
| `bun run check:db-boundary` | `checks` | 709 модулів, 0 порушень ✅ | 0 |
| `bun run lint` | `checks` | 0 errors, 171 warnings ✅ | 0 |
| `bun run test:no-db` | `checks` | **1 червоний** (2 146 / 2 147) | 1 |
| сторож `src/lib/generated/*.json` | `image` | **впаде на чистому клоні** | 1 |

Чотирьох червоних KR27.7, про які попереджав контекст, **більше немає** — паралельна сесія їх
закрила. Натомість зʼявився один інший червоний, теж у її зоні.

---

## L18-release-readiness-01 — P0 — 18 генерованих каталогів немає в git; збірка з чистого клону впаде

**Доказ.**

```
$ git ls-tree -r HEAD --name-only src/lib/generated/
src/lib/generated/.gitkeep
src/lib/generated/creatures.json
src/lib/generated/creatures2024.json
```

На диску їх 20. Untracked (`git status --porcelain src/lib/generated/`): `armor.json`,
`backgrounds.json`, `bastions.json`, `classes.json`, `creator-content-2014.json`,
`creator-content-2024.json`, `feats.json`, `infusions.json`, `invocations.json`,
`magicItems.json`, `objects.json`, `races.json`, `rules-2014.json`, `rules-2024.json`,
`rules-beyond-srd.json`, `spells.json`, `traps-hazards.json`, `weapons.json` — **18 файлів**.

Це не `.gitignore`: він явно каже протилежне («Похідні з бази каталоги більше НЕ ігноруються…
Рішення власника 2026-08-28»). Їх просто ніколи не додавали командою `git add`.

Кожен із них імпортується кодом:

```
src/lib/content/creator-content.ts:12  import creatorContent2014 from "@/lib/generated/creator-content-2014.json";
src/lib/content/creator-content.ts:13  import creatorContent2024 from "@/lib/generated/creator-content-2024.json";
src/lib/spellsData.ts:7               import spellsJson from '@/lib/generated/spells.json';
src/lib/classesData.ts:10             import classesJson from "@/lib/generated/classes.json";
src/lib/racesData.ts:10               import racesJson from "@/lib/generated/races.json";
…  (усі 20 імпортів у 19 файлах `src/lib/*Data.ts` + `src/lib/content/creator-content.ts`)
```

**Що станеться в CI.** Джоба `checks` робить `actions/checkout@v4`, тобто отримує рівно вміст
HEAD. Крок `bunx tsc --noEmit` впаде з TS2307 на 18 імпортах. Якби він якимось чином пройшов —
джоба `image` має власного сторожа в `Dockerfile`:

```dockerfile
RUN for f in spells magicItems feats backgrounds armor weapons infusions invocations \
             classes races rules-2024 bastions creatures creatures2024 \
             creator-content-2014 creator-content-2024; do \
      test -s "src/lib/generated/$f.json" \
        || { echo "ВІДМОВА: немає src/lib/generated/$f.json — він має лежати в git"; exit 1; }; \
```

14 із 16 імен у цьому списку в HEAD відсутні. Сторож спрацює на першому ж (`spells`).

**Це вже записано як прийнятий стан — але прийнятий саме «до релізу».**
`docs/STATE.md` (розділ «Незакомічене — свідомо прийнято до релізу»):

> **CI зараз зеленіє на коді, якого в репозиторії немає.** Гейт з O1 перевіряє не те, що
> задеплоїться. **До релізу це терпимо, на релізі — ні.**

Робота зібрана в `docs/o1-safety-net/kr1.6-untracked-work.md`. Загальний масштаб — 544 untracked
+ 508 змінених + 5 видалених файлів у дереві (`git status --porcelain | awk '{print $1}' | sort |
uniq -c`).

**Виправлення.** `git add src/lib/generated/*.json` разом із рештою KR1.6. Дві поруч розташовані
пастки: `prisma/schema.prisma` і `db/schema.sql` теж лежать зміненими (` M`) — вони описують
робочу базу після KR18.5/KR27.4/KR27.8, і без них схема в HEAD не відповідає проду.

---

## L18-release-readiness-02 — P0 — `test:rules:coverage` червоний: 45,2 % проти планки 80 %

**Доказ** (`work/L18-release-readiness/rulescov.txt`, хвіст):

```
Statements   : 44.97% ( 488/1085 )
Branches     : 50.48% ( 417/826 )
Functions    : 40% ( 140/350 )
Lines        : 45.2% ( 405/896 )
ERROR: Coverage for lines (45.2%) does not meet global threshold (80%)
error: script "test:rules:coverage" exited with code 1
```

Самі тести зелені — `Test Files 10 passed (10) / Tests 92 passed (92)`. Червона саме планка.

`vitest.rules.config.mts` рахує `include: ["src/rules/**/*.ts"]`, а ганяє
`include: ["tests/rules/coverage/**/*.test.ts"]` — 10 файлів. У `src/rules/` тим часом
**38 файлів**. З нулем покриття, серед іншого: `wildshape.ts` (рядки 21–465), `bastions.ts`
(14–226), `spell-sources.ts` (76–210), `spell-preparation-2024.ts` (17–113),
`multiclass-proficiencies.ts`, `repeatable-feats.ts`, `species-grants.ts`, `languages.ts`,
`resource-pools.ts`, `starting-money.ts`, `character-level.ts`, `creature-speed.ts`,
`wildshape-uses.ts`, `background-equipment.ts`.

**Окремий дешевий внесок у ту саму червону цифру.** Чотири **тестові** файли лежать усередині
`src/rules/`:

```
src/rules/armor-class-formulas.test.ts
src/rules/attacks-per-action.test.ts
src/rules/multiclass-entry.test.ts
src/rules/warlock-invocations.test.ts
```

`include: ["src/rules/**/*.ts"]` рахує їх як **продуктовий код із 0 % покриття**, а
`include: ["tests/rules/coverage/**"]` їх **не запускає** — тому й модулі, які вони насправді
покривають (`armor-class-formulas.ts`, `attacks-per-action.ts`, `multiclass-entry.ts`,
`warlock-invocations.ts`), у звіті теж нулі. Тобто частина «дірки» — це не відсутні тести, а
конфіг, який про співрозташовані тести не знає.

**Виправлення.** Або `coverage.exclude: ["**/*.test.ts"]` + додати `src/rules/**/*.test.ts` у
`include` прогону (знімає штучну частину), або опустити планку до виміряного рівня з датою й
KR на підняття. Що саме — рішення власника, бо це planка гейта.

---

## L18-release-readiness-03 — P0 — `check:ui-decomposition` червоний: 11 порушень

**Доказ** (`work/L18-release-readiness/uidecomp.txt`, блок `violations`):

| Файл | Рядків | Легасі-межа | Стан |
|---|---:|---:|---|
| `src/app/char/home/CharHomeClient.tsx` | 2 598 | 2 263 | blocked |
| `src/lib/components/characterSheet/slides/MagicSlide.tsx` | 1 338 | 1 296 | blocked |
| `src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx` | 1 223 | 1 211 | blocked |
| `src/lib/components/characterCreator/MultiStepForm.tsx` | 1 095 | 1 093 | blocked |
| `src/lib/components/characterSheet/ModifyStatModal.tsx` | 758 | 699 | blocked |
| `src/app/char/[id]/bastion/BastionPageClient.tsx` | 752 | **немає** | blocked |
| `src/lib/components/characterCreator/SkillsForm.tsx` | 713 | 690 | blocked |
| `src/components/rules/RulesCategoryClient.tsx` | 584 | **немає** | blocked |
| `src/lib/components/characterSheet/AddSpellDialog.tsx` | 525 | 487 | blocked |
| `src/lib/components/characterSheet/SpellInfoModal.tsx` | 484 | 469 | blocked |
| `src/components/bestiary/BestiaryClient.tsx` | 456 | **немає** | blocked |

Три файли (`BastionPageClient`, `RulesCategoryClient`, `BestiaryClient`) — **нові**, легасі-межі
не мають узагалі, тобто просто перевищують ліміт 400 рядків. Решта — легасі-файли, які **виросли
понад власну зафіксовану межу**, тобто гейт спрацював саме так, як задумано.

Два з одинадцяти (`MagicSlide`, `SpellInfoModal`, `AddSpellDialog`) — у зоні паралельної сесії
(KR30.3), решта вісім — ні.

---

## L18-release-readiness-04 — P1, in-flight — `test:no-db` червоний одним тестом (зона паралельної сесії)

**Доказ** (`work/L18-release-readiness/testnodb.txt`):

```
 FAIL  tests/components/spell-add-to-pers-2024.test.tsx > KR25.2 — заклинання 2024 додається
       до персонажа > кнопка є, і вона шле посилання зі слагом, а не номер каталогу
Error: Test timed out in 5000ms.
Not implemented: navigation to another Document
 Test Files  1 failed | 178 passed (179)
      Tests  1 failed | 2146 passed (2147)
```

**Чотирьох червоних KR27.7 більше немає** — `tests/rules/spell-preparation-2024.test.ts` і
`tests/logic/spellcasting-progression-2024.test.ts` зелені.

Тест рендерить `SpellInfoModal` і кличе `openSpellLink` із `src/lib/spell-link.ts`. Обидва —
зона KR30.3. Часи модифікації на момент прогону (22:44) проти `now 2026-09-04 22:50`:

```
2026-09-04 21:57:46  src/lib/spell-link.ts
2026-09-04 21:14:14  src/lib/components/characterSheet/SpellInfoModal.tsx
2026-09-04 21:10:06  tests/components/spell-add-to-pers-2024.test.tsx
```

Класифікація — `in-flight`. Не чіпав. Але для релізу це червоний крок `Tests` у джобі `checks`.

---

## L18-release-readiness-05 — P2 — половина 2024 не потрапляє в sitemap і не має жодного посилання, яке пройде краулер

**Доказ 1 — sitemap.** Запит до аудиторського сервера (`work/.../anon2024.mjs`):

```json
"sitemap": { "len": 382781, "urls": 3336,
  "has2024Spells": true,  "has2024Classes": false, "has2024Races": false,
  "has2024Feats": false,  "has2024Backgrounds": false, "has2024Bestiary": false,
  "has2024MagicItems": false, "has2024Char": false }
```

`src/app/sitemap.ts` (118 рядків) містить із редакції 2024 рівно три групи: заклинання
(рядки 39–43), бастіони (62, 93–96) і довідник (99–112). Каталоги 2014 при цьому перелічені всі
поіменно, аж до кожної істоти й кожного предмета.

**Доказ 2 — сторінки існують.** `curl` по аудиторському серверу:

```
/2024/bestiary -> 200   /2024/feats -> 200   /2024/races -> 200
/2024/backgrounds -> 200 /2024/magic-items -> 200 /2024/weapons -> 200
/2024/armor -> 200      /2024/invocations -> 200 /2024 -> 200
```

Кожна з них навіть виставляє власний canonical
(`src/app/2024/bestiary/[slug]/page.tsx:34`, `…/2024/armor/[slug]/page.tsx:34`, і так усі вісім).

**Доказ 3 — краулер до них не дійде й посиланням.** Перемикач редакції — це `<button>` з
`router.push`, а не `<a href>`:

```tsx
// src/components/ui/EditionSwitcher.tsx:31-33
const handleSwitch = (targetEdition: "2014" | "2024") => {
  if (targetEdition === currentEdition) return;
  const targetPath = getTargetEditionPath(pathname, targetEdition);
  router.push(buildHref(targetPath));
```

На головній сторінці анонімного користувача **жодного** `<a href>` зі згадкою «2024» немає:

```json
"homeLinks2024": [],
"homeNavText": "D&D 5E · РЕДАКЦІЯ 2014"
```

(скріншот `shots/L18-01-home-anon.png`).

**Наслідок.** Сайт живе органічним пошуком (≈ 200 000 переглядів). Реліз 2024 виходить у
стан, коли ані sitemap, ані посилання не ведуть пошуковика в жоден каталог 2024, крім заклинань,
бастіонів і довідника. Виправлення дешеве: додати відсутні групи в `src/app/sitemap.ts` поруч
із наявними та дати перемикачу редакції справжній `href` (кнопка може лишитися, `<a>` потрібен
краулеру).

---

## L18-release-readiness-06 — P2 — смоук після деплою не перевіряє жодного маршруту 2024

**Доказ** (`scripts/smoke.sh`):

```bash
ROUTES=(/ /api/health /spells /magic-items)
```

Коментар у самому файлі пояснює, що сторінкові маршрути базу не перевіряють і саме тому доданий
`/api/health`. Але весь набір — редакція 2014 плюс здоровʼя. Джоба `deploy` вважає реліз
успішним і **знімає можливість відкату** (`Retire previous container`) на підставі чотирьох
маршрутів, серед яких немає ані `/2024`, ані `/2024/char`, ані `/2024/spells`. Повністю
зламана половина 2024 задеплоїться «зелено».

**Виправлення.** Додати `/2024`, `/2024/char`, `/2024/spells` у `ROUTES`. Ціна — три запити.

---

## L18-release-readiness-07 — P3 — мертвий composite action і коментарі в `deploy.yml`, які описують знятий механізм

**Доказ.**

```
$ ls .github/actions/db-tunnel/        → action.yml
$ git status --porcelain .github/      →  M .github/actions/db-tunnel/action.yml
$ grep -rn "db-tunnel" .github/workflows/   → NONE
```

Composite action лишився в дереві (ще й змінений), але жоден воркфлоу його не викликає.

Поруч у `deploy.yml` (джоба `image`) стоять три коментарі, які описують уже знятий механізм і
суперечать сусідньому ж коментарю в тому самому кроці:

- `network=host обовʼязковий: … 127.0.0.1:5454 там вказував би на сам build-контейнер, а не на
  тунель до бази, піднятий на раннері`;
- `next build пререндерить /char, який читає базу, тож збірці потрібен живий Postgres`;
- `Беремо spells_ci_test: контент той самий, у прод заради збірки ходити не треба`.

Усі три хибні: `Dockerfile` доводить протилежне («Збірці база НЕ потрібна… 2026-08-28 next build
із завідомо мертвою адресою пройшов до кінця — 4032 сторінки, код виходу 0»), `secrets:
database_url` із кроку вже прибрано, а `spells_ci_test` за Р32 більше не існує як робочий
інструмент. `driver-opts: network=host` лишився заради тунелю, якого немає.

Це не ламає збірку сьогодні. Але наступна сесія, яка читатиме `deploy.yml` як джерело правди,
отримає інструкцію повернути базу в збірку — тобто рівно те, що рішення власника 2026-08-28
знімало.

---

## L18-release-readiness-08 — P1, data — перелік дій власника над робочою базою, які реліз чекає

Схемної роботи не лишилось: **усі DDL уже в проді**, це видно з артефактів робочої бази
(`prisma/schema.prisma` і `db/schema.sql` генеруються з неї `bun run db:pull`):

| Зміна | Артефакт | Стан |
|---|---|---|
| KR18.5 `race_trait.level`, `race_choice_option_spell` | `db/schema.sql:3191`, `prisma/schema.prisma:1008` | у проді |
| KR18.6 `class.weapon_mastery_progression` | `db/schema.sql:1569` | у проді |
| KR27.4 знято `pers_feat_feat_id_pers_id_key`, додано `pers_feat_pers_id_feat_id_idx` | `db/schema.sql:5097`, `prisma/schema.prisma:719` | у проді |
| KR27.8 `ArmorCategory.DRACONIC_RESILIENCE` | `prisma/schema.prisma:1320` | у проді |
| KR19.2 `pers_bastion*` | `db/schema.sql`, 55 згадок | у проді |

Лишаються **дані** — сіди й один UPDATE. Джерело кожного рядка — журнал відповідного KR:

| Дія | Джерело | Що дає |
|---|---|---|
| `bun run seed:2024:prod` | `docs/o25-spell-links/kr25.4-content-2024.md:221` | класи, підкласи, види, риси, заклинання 2024 з новими якорями заклинань + KR18.6 (володіння зброєю Шахрая й Монаха) |
| `bun run seed:magic-items-2024:prod` | там само, :222 | магічні предмети 2024 |
| `bun run seed:invocations-2024:prod` | там само, :223 | виклики 2024 |
| `bun run seed:species-choices-2024:prod` | там само, :224 | `speciesChoices2024.ts` |
| `bun run seed:species-levels-2024:prod` | `db/changes/2026-08-29-kr18.5-…sql:127` | рівні рис видів 2024 + рівневі заклинання |
| `bun run seed:armor-2024:prod` | `docs/o27-multiclass-2024/kr27.8-…md:166` | рядок `armor` Драконячої живучості (енум уже є) |
| `bun run seed:class-feature-text:prod --apply` | `docs/o24-wildshape-second-layer/kr24.2-eligibility.md:72` | таблиця Звіриних форм в описі Дикої форми |
| `bun run seed:apostrophe:prod` | `docs/README.md:42`, `CLAUDE.md` | апостроф `ʼ` у контентних таблицях |
| `db/changes/2026-09-04-kr27.5-magic-initiate-free-cast.sql` | `docs/o27-multiclass-2024/kr27.8-…md:168` — «теж не підтверджено застосованим до робочої бази» | безкоштовне застосування Magic Initiate |
| далі `bun run generate:content` і **коміт** каталогів | `kr25.4:226-229` | без цього сіди не доїжджають до сторінок (Р13: сторінка читає файл, не базу) |

**Що я зміг перевірити доказово.** `spells_test` **має все**, що піддається перевірці запитом
(`work/L18-release-readiness/drift.mjs`):

```json
"draconicEnum": [{ "ok": 1 }],
"draconicArmorRow": [{ "armor_id": 376, "name": "DRACONIC_RESILIENCE", "ruleset": "RULES_2024", "base_ac": 10 }],
"persFeatIdx": ["pers_feat_pers_id_feat_id_idx", "pers_feat_pkey"],
"magicInitiate": [ …три рядки, кожен LONG_REST / 1 ],
"asi2024": [ FIGHTER_2024 [4,6,8,12,14,16], ROGUE_2024 [4,8,10,12,16], решта [4,8,12,16] ],
"thirdCasters": [ ELDRITCH_KNIGHT THIRD/INT, ARCANE_TRICKSTER THIRD/INT ]
```

Робочу базу читати не можна (правило контексту), тому стан цих **даних** у проді лишається
недоведеним — і саме тому цей перелік має бути чеклістом власника, а не припущенням.

**Порядок критичний і зворотний до звичного** (`kr27.8:158-166`): SQL і сіди — **до** деплою.
Причина названа в самому KR: без рядка `armor` і без значення енума `WHERE name IN (…)` дає
`invalid input value for enum`, і підвищення чародія з Драконячою магією до 3-го рівня падає.

---

## L18-release-readiness-09 — P1 — видалення `src/app/char/page.tsx` безпечне, але тримається на одному рядку middleware

Не знахідка про поломку — знахідка про крихкість, яку варто знати перед релізом.

`git status` показує 5 видалених і 2 перейменовані файли:

```
D  public/images/categories/actions.webp
RM public/images/categories/heroes_war_table.webp -> public/images/categories/classes.webp
RM public/images/categories/ancestral_species_hall.webp -> public/images/categories/races.webp
 D src/app/char/page.tsx
 D src/components/home/HomeBackdrop.tsx
 D src/components/home/HomeDescriptionSection.tsx
 D src/components/home/OrnateFrame.tsx
```

Три компоненти переїхали в `src/components/ui/` (KR15.1) — `PlatformBackdrop.tsx:3` прямо каже
«Was `HomeBackdrop`», `OrnateFrame` живе в `src/components/ui/OrnateFrame.tsx` і має трьох
споживачів. Висячих імпортів немає (перевірено грепом по `src/` і `tests/`).

`/char` — публічна адреса з історією. Її тримає **лише** middleware:

```ts
// src/middleware.ts:32
matcher: ["/no-ai", "/no-ai/:path*", "/char"],
// src/rules/route-helpers.ts:7
const LEGACY_CREATOR_PATH = "/char";
```

Перевірено в браузері: `http://127.0.0.1:3100/char` → 308 → `/char/create`, заголовок
«Створення персонажа — ДнД українською». Працює. Але прибрати `/char` із `matcher` — і сторінки
не стане зовсім, без жодної помилки компіляції. Тесту, який ловить цю пару, я не знайшов.

---

## Перевірено й правильно

**Гейти, що зелені.**

- `bunx tsc --noEmit` — **0 помилок** (підтверджено, `work/.../tsc.txt`, `EXIT=0`).
- `bun run lint` — **0 errors, 171 warnings**, `EXIT=0`. Рівень попереджень збігається з тим,
  що записав KR25.4 («0 errors, 171 warnings (базовий рівень)») — тобто нового шуму немає.
- `bun run check:db-boundary` — `✔ no dependency violations found (709 modules, 2786
  dependencies cruised)`, `EXIT=0`. Межа Prisma тримається.
- `bun run test:no-db` — 2 146 із 2 147 зелених; єдиний червоний у зоні паралельної сесії.
- Чотири червоні KR27.7, названі в контексті аудиту, **закриті** — обидва файли зелені.

**Механіка деплою.**

- `next.config.ts:7` — `output: "standalone"`, тобто `COPY --from=builder /app/.next/standalone`
  у `Dockerfile` має що копіювати.
- `Dockerfile` збирає `bunx next build`, а **не** `bun run build`, тобто `prebuild` →
  `generate:content` у контейнері не запускається й каталоги з git не перезаписуються з бази.
  Це рівно те, чого вимагає рішення 2026-08-28.
- Чотири `NEXT_PUBLIC_*` мають сторожа на порожнє значення (`RUN test -n …`), кожен із
  поясненням, чому мовчазна поломка гірша за падіння збірки. `NEXT_PUBLIC_SITE_URL` build-arg
  не має, але всі 19 його читачів мають однаковий фолбек `"https://char.holota.family"` —
  тобто збірка без нього дає правильні canonical і sitemap, а не порожні.
- `scripts/smoke.sh` перевіряє `/api/health`, який справді ходить у базу
  (`src/app/api/health/route.ts` з `export const dynamic = "force-dynamic"` і коментарем,
  що без цього роут статикувався б і брехав 200).
- Відкат прив'язаний саме до кроку смоуку (`if: failure() && steps.smoke.outcome == 'failure'`),
  а образ прибитий до SHA, не до `:latest`.
- Sentry налаштований у всіх трьох середовищах — `src/instrumentation.ts`,
  `src/instrumentation-client.ts`, `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`,
  плюс `withSentryConfig` у `next.config.ts:37`. Source maps вимкнені **свідомо** з написаною
  причиною. Діагностична сторінка `/sentry-check` закрита токеном
  (`isSentryCheckAllowed(token)` → `notFound()`), тобто в проді не світиться.
- `src/app/robots.ts` — `allow: "/"` + посилання на sitemap; `/no-ai/…` дублікати позначені
  `x-robots-tag: noindex, follow` у middleware. Індексація не зламана.

**Гейт 2024 знято, і 2024 справді живе.**

`src/rules/access.ts` повертає `true` без умов, із написаною причиною («Передрелізний гейт знято
2026-08-28 — реформа виходить назагал»). Перевірено анонімним браузером на :3100:
`/2024/char` віддає 200, конструктор 2024 малює всі 10 видів PHB 2024 (Аазимар, Дракононароджений,
Дворф, Ельф, Гном, Голіаф, Напіврослик, Людина, Орк, Тифлінг) і сім кроків, кнопка «Далі →» на
місці, у нижній навігації є перемикач «2014 / 2024»
(`shots/L18-02-2024char-anon.png`). Помилок сторінки — жодної; у консолі лише шум Google One Tap
(«Not signed in with the identity provider»), який очікуваний для анонімного локального прогону.

**Дрейфу генерованих каталогів проти бази немає.** Кількості у файлах на диску збігаються з
`spells_test` до одиниці (`work/L18-release-readiness/drift.mjs`):

| Сутність | Файл | `spells_test` 2014 | `spells_test` 2024 |
|---|---|---:|---:|
| заклинання | `spells.json` 525 (2014) | 525 | 391 |
| класи | `creator-content-*.json` 13 / 13 | 13 | 13 |
| види | 66 / 10 | 66 | 10 |
| риси (feats) | 92 / 75 | 92 | 75 |
| походження | 75 / 16 | 75 | 16 |
| підкласи | — | 118 | 48 |

`classes.json` — 26 записів (13 + 13), `races.json` — 76 (66 + 10), `feats.json` — 92 (2014).
`cc2024.infusions = 0` — правильно: Артифіцера в PHB 2024 немає.

---

## Чекліст блокерів релізу — конкретні команди

```bash
# 1. Закомітити те, що їде в образ (KR1.6). Без цього CI не пройде взагалі.
git add src/lib/generated/*.json prisma/schema.prisma db/schema.sql \
        data/ prisma/seed/ src/ tests/ docs/
git status --porcelain | grep -c "^??"          # має стати 0 поза .gitignore
git ls-tree -r HEAD --name-only src/lib/generated/ | wc -l   # має стати 20

# 2. Полагодити перший крок першої джоби.
bun run check:ui-decomposition                   # зараз exit 1, 11 порушень

# 3. Полагодити другий крок першої джоби (або опустити планку рішенням власника).
bun run test:rules:coverage                      # зараз exit 1, 45,2 % проти 80 %

# 4. Дочекатися KR30.3 паралельної сесії.
bun run test:no-db                               # зараз 1 червоний

# 5. Решта гейтів — уже зелені, перевірити після п.1 (важливо: після коміту).
bunx tsc --noEmit && bun run check:db-boundary && bun run lint

# 6. Робоча база — ДО деплою, у цьому порядку (Р33: файл → сід → генерація → коміт).
./scripts/apply-db-change.sh db/changes/2026-09-04-kr27.5-magic-initiate-free-cast.sql  # spells_test
#   … робочу базу — власник, файлом із db/changes/
bun run seed:2024:prod
bun run seed:magic-items-2024:prod
bun run seed:invocations-2024:prod
bun run seed:species-choices-2024:prod
bun run seed:species-levels-2024:prod
bun run seed:armor-2024:prod
bun run seed:class-feature-text:prod --apply
bun run seed:apostrophe:prod --apply
bun run generate:content
git add src/lib/generated/*.json && git commit

# 7. Перевірити збірку саме тим шляхом, яким її робить CI (не `bun run build`!).
bunx next build

# 8. Перед натисканням: розширити смоук, інакше зламана половина 2024 задеплоїться зелено.
#    scripts/smoke.sh → ROUTES=(/ /api/health /spells /magic-items /2024 /2024/char /2024/spells)
```

## Питання власнику

1. Планка `test:rules:coverage` — 80 % на всю теку `src/rules/`, яка виросла з ~10 до 38 файлів.
   Дописувати тести на 22 непокриті модулі (це L, кілька днів) чи зафіксувати планку на
   виміряному рівні з датою й окремим KR на підняття?
2. `check:ui-decomposition` — 8 із 11 порушень поза зоною паралельної сесії, з них 3 нові файли
   без легасі-межі. Розбивати їх зараз чи вписати поточні розміри як легасі-межі й розбивати
   після релізу?
3. Sitemap 2024 — додати відсутні вісім каталогів зараз (S, один файл) чи це свідомо відкладено?
4. Перемикач редакції не має `href`. Дати йому справжнє посилання (щоб краулер знайшов 2024)
   чи покластися лише на sitemap?
