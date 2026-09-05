# L16 — Ізоляція редакцій і регресія 2014

Мітка: `L16-ruleset-isolation`. База доказів: `spells_test` (запити через
`work/L16-ruleset-isolation/q.mjs`), код репозиторію, оракули в `data/2014/srd/` і
`data/2024/srd/`, прогін `bun run test:db tests/golden/creation.test.ts`.

Нічого не правив у репозиторії.

---

## Знахідки

### L16-ruleset-isolation-01 — персонаж 2014 (монах/варвар) отримує рядок обладунку **редакції 2024**

**severity:** P1 · **edition:** both · **classification:** bug · **effort:** S

**Де:** `src/server/db/character-creation.ts:988-1000`

```ts
if (cls.name === "MONK_2014") seededArmorNames.add("UNARMORED_DEFENSE_MONK");
if (cls.name === "BARBARIAN_2014") seededArmorNames.add("UNARMORED_DEFENSE_BARBARIAN");

const rows = await tx.armor.findMany({
  where: { name: { in: Array.from(seededArmorNames)... } },   // ← фільтра за ruleset немає
  select: { armorId: true, name: true, abilityBonuses: true, abilityBonusType: true },
});

const byName = new Map<string, {...}>(
  rows.map((r) => [String(r.name), { armorId: r.armorId, ... }])  // ← ключ лише назва
);
```

**Доказ (запит до `spells_test`):**

```sql
select armor_id, name, ruleset, base_ac, ability_bonuses
from armor where name in ('UNARMORED_DEFENSE_MONK','UNARMORED_DEFENSE_BARBARIAN');
```
```
301 UNARMORED_DEFENSE_MONK        RULES_2014  10 {DEX,WIS}
302 UNARMORED_DEFENSE_BARBARIAN   RULES_2014  10 {DEX,CON}
374 UNARMORED_DEFENSE_MONK        RULES_2024  10 {DEX,WIS}
375 UNARMORED_DEFENSE_BARBARIAN   RULES_2024  10 {DEX,CON}
```

Назва в обох редакціях однакова (`@@unique([name, ruleset])` це дозволяє), запит без
`ruleset` повертає **чотири** рядки, а `new Map` із ключем-назвою лишає **останній** — у
фізичному порядку таблиці це 374/375, тобто рядки **RULES_2024**. Персонаж `RULES_2014`
дістає `pers_armor.armor_id = 374`.

**Має бути:** запит фільтрує `ruleset: cls.ruleset` (або `data.ruleset`), а ключ мапи —
пара «назва + редакція».

**Є:** пошук по назві на всю таблицю; яку редакцію отримає персонаж, вирішує порядок рядків
у Postgres.

**Наслідок сьогодні:** числа однакові (10 + СПР + МДР), тож КЗ не змінюється — але рядок
персонажа 2014 показує на контент 2024. Це ламає будь-яку звірку «персонаж ↔ його редакція»,
і воно **обовʼязково** перетвориться на числову помилку, коли KR27.8 додасть до цієї ж
таблиці 2024-формули (`DRACONIC_RESILIENCE` уже в `src/rules/armor-class-formulas.ts`).
Той самий `byName` тоді роздаватиме персонажам 2024 їхні формули з тим самим збігом назв.

**Чому golden цього не ловить:** `tests/helpers/normalize-golden.ts:82` серіалізує обладунок
**лише назвою**:

```ts
armors: sortBy(pers.armors, (a) => a.armor.name).map((a) => `${a.armor.name}${a.equipped ? "*" : ""}`),
```

тому `tests/golden/creation/monk-unarmored-defense.json` містить `["UNARMORED_DEFENSE_MONK*"]`
і лишається зеленим незалежно від того, рядок якої редакції прикріпили. Прогін
`bun run test:db tests/golden/creation.test.ts` — 35/35 зелених.

**Відтворення:** створити монаха 2014 → `select armor_id from pers_armor where pers_id=<id>`
→ буде 374, не 301. Без створення персонажа те саме доводить запит вище + читання коду.

**Fix hint:** додати `ruleset` у `where` і в ключ мапи; у `normalize-golden.ts` додати
редакцію обладунку до серіалізації, інакше гейта не буде і після правки.

---

### L16-ruleset-isolation-02 — монах і варвар **2024** не отримують рядка «Захист без обладунків» узагалі

**severity:** P1 · **edition:** 2024 · **classification:** in-flight · **effort:** M

**Де:** `src/server/db/character-creation.ts:988-989` (умова `cls.name === "MONK_2014"` /
`"BARBARIAN_2014"`), `src/rules/armor-class-formulas.ts`.

**Правило (оракул):** `data/2024/srd/classes.md` — Monk: Unarmored Defense, Barbarian:
Unarmored Defense; той самий модуль цитує `data/2024/srd/character-creation.md`
(Multiclassing → Armor Class).

**Доказ:** рядки 374/375 у таблиці `armor` існують і мають `ruleset = RULES_2024`, але жодна
гілка створення їх не додає — умови жорстко звірені з назвами класів **2014**.
`findAlternativeArmorClassFormulas` (`src/rules/armor-class-formulas.ts`) написаний під це,
але **не має жодного виклику**:

```
grep -rn "armor-class-formulas" src | grep -v "armor-class-formulas"  →  порожньо
```

**Наслідок:** монах 2024 без обладунку рахується як 10 + СПР, без МДР.

**Класифікація `in-flight`:** заголовок файла — «KR27.8», у ньому рішення власника від
2026-09-04, тобто робота йде просто зараз. Фіксую як стан на момент аудиту, не як регресію.

---

### L16-ruleset-isolation-03 — лист персонажа 2024 додає зброю й обладунок **тільки з каталогу 2014**, і майстерність зброї через це не звʼязується

**severity:** P1 · **edition:** 2024 · **classification:** missing-system · **effort:** M

**Де:**
- `src/server/db/equipment-actions.ts:10` — `const ACTIVE_RULESET: Ruleset = "RULES_2014";`
- `src/server/db/equipment-actions.ts:373-385` — `getBaseEquipment()` фільтрує
  `where: { ruleset: ACTIVE_RULESET }` для `weapon` і `armor`
- `src/lib/components/characterSheet/AddWeaponDialog.tsx:33`, `AddArmorDialog.tsx:34` —
  `getBaseEquipment()` викликається без жодного параметра редакції
- `WeaponsCard.tsx:128` рендерить `AddWeaponDialog` для **будь-якого** персонажа;
  окремого листа для 2024 немає (`/2024/char/` містить лише `home/` і `page.tsx`,
  список веде на `/char/<id>`)

**Доказ (запит):**

```
weapon  RULES_2014  48 рядків, з mastery: 0
weapon  RULES_2024  38 рядків, з mastery: 38
armor   RULES_2014  20 · armor RULES_2024 16
```
```
DAGGER     id2014=2   id2024=2200  mastery2024=NICK
GREATAXE   id2014=19  id2024=2216  mastery2024=CLEAVE
LONGSWORD  id2014=23  id2024=2220  mastery2024=SAP
SHORTSWORD id2014=29  id2024=2226  mastery2024=VEX
```

**Ланцюжок наслідків.** Вибір майстерності робиться правильно — `src/server/db/weapon-mastery.ts:123-125`
фільтрує `where: { ruleset, mastery: { not: null } }` за `pers.ruleset`, тобто гравець
обирає **2024-й** Довгий меч (`weapon_id = 2220`). Але зброю в інвентар він додає з діалогу,
який дає **2014-й** Довгий меч (`weapon_id = 23`). А лист звіряє їх по id:

```ts
// WeaponsCard.tsx:70-72
const masteryByWeaponId = useMemo(
  () => new Map((pers.pers_weapon_mastery ?? []).map((entry) => [entry.weapon_id, entry.weapon.mastery])),
  [pers.pers_weapon_mastery],
);
// :149
{pw.weaponId && masteryByWeaponId.has(pw.weaponId) && (…)}
```

`23 !== 2220` → значок майстерності на зброї в інвентарі не зʼявиться **ніколи**. Класика
«ідентичність сутності ≠ ідентичність надання», але поперек редакцій.

**Має бути:** `getBaseEquipment(ruleset)` за `pers.ruleset`; діалог передає редакцію
персонажа.

**Увага при правці:** поточну поведінку **пінить наявний тест** —
`tests/content/ruleset-server-filter.test.ts` («KR6.3 — getBaseEquipment: зброя з RULES_2024
не потрапляє у список»). Його треба переписати разом із фіксом, інакше правка стане червоною.

---

### L16-ruleset-isolation-04 — «Додати магічний предмет» на листі завжди відкриває каталог 2014

**severity:** P1 · **edition:** 2024 · **classification:** bug · **effort:** S

**Де:** `src/lib/components/characterSheet/AddMagicItemDialog.tsx:56` —

```tsx
<iframe src={`/magic-items?${queryParams.toString()}`} … />
```

компонент приймає лише `{ persId, persName }` і не знає редакції; викликається з
`CombatSlide.tsx:509` для будь-якого персонажа.

**Доказ:** `/magic-items/page.tsx:20` — `getAllMagicItems()` без аргументів (2014);
`/2024/magic-items/page.tsx:19` — `getAllMagicItems("RULES_2024")`. У базі:
`magic_item RULES_2014 = 621`, `RULES_2024 = 445`.

**Наслідок:** персонажу 2024 недоступні 445 предметів його редакції, натомість
пропонуються 621 предмет чужої.

**Контраст, який доводить, що це недогляд, а не рішення:** сусідній `AddSpellDialog.tsx:353`
робить рівно правильно —
`return \`${is2024 ? "/2024/spells" : "/spells"}?${params.toString()}\`` (`is2024` з
`pers.ruleset`, рядок 242).

**Fix hint:** передати `ruleset` у `AddMagicItemDialog` і вибрати маршрут так само, як це
робить `AddSpellDialog`. Вбудований режим на маршруті 2024 уже працює —
`magic-items-client.tsx:256` (`origin=character` + `persId`), а `/2024/magic-items/page.tsx`
прокидає `initialSearchParams`.

---

### L16-ruleset-isolation-05 — каталог предметів дозволяє причепити предмет однієї редакції персонажу іншої

**severity:** P1 · **edition:** both · **classification:** bug · **effort:** S

**Де:**
- `src/server/db/pers-actions.ts:1243-1276` — `getUserPersesMagicItemIndex()` віддає **всіх**
  персонажів користувача: `where: { userId: user.id, isSnapshot: false, isActive: true }`,
  без `ruleset`
- `src/app/magic-items/magic-items-client.tsx:193-200` — випадайка «Додати до персонажа»
  малює цей список як є і кличе `toggleMagicItemForPers({ persId: p.persId, magicItemId })`
- `src/lib/actions/magic-item-actions.ts:71-93` — `toggleMagicItemForPers` перевіряє **лише
  власність** (`assertOwnsPers`), редакцію не звіряє
- `src/server/db/magic-items.ts:41-45` — `addMagicItemLink` пише звʼязок без жодної перевірки

**Наслідок:** на `/2024/magic-items` у списку «Додати до персонажа» стоять і персонажі 2014;
два кліки — і предмет `RULES_2024` висить на персонажі `RULES_2014`. Симетрично на
`/magic-items` для персонажів 2024.

**Чому це не покривається рішенням «сервер довіряє UI» (BUG-001/002, `docs/KNOWN-BUGS.md`):**
там йшлося про вибір, який оболонка не пропонує, а сервер прийняв би. Тут **сама оболонка
пропонує** недозволений вибір у нормальному потоці.

**Fix hint:** повертати `ruleset` у `getUserPersesMagicItemIndex`, фільтрувати список за
редакцією предмета, і додати звірку в `toggleMagicItemForPers`.

**Примітка:** `src/server/db/pers-actions.ts` є в переліку файлів паралельної сесії — правку
координувати.

---

### L16-ruleset-isolation-06 — BUG-013 живий: тривалий відпочинок повертає **всі** кубики здоровʼя і персонажу 2014

**severity:** P1 · **edition:** 2014 · **classification:** bug · **effort:** S

**Де:** `src/server/db/rest-actions.ts:296-298`

```ts
const restoredHitDice = serializeHitDicePools(
  collectHitDicePools(pers).map((pool) => ({ ...pool, current: pool.max })),
);
```

Гілки за `pers.ruleset` немає; `grep -n "ruleset" src/server/db/rest-actions.ts` у функції
`longRest` не дає нічого.

**Оракул 2014** — `data/2014/srd/06_Gameplay/Adventuring.md:174`:
«The character also regains spent Hit Dice, up to a number of dice equal to **half** of the
character's total number of them (minimum of one die). For example, if a character has eight
Hit Dice, he or she can regain four spent Hit Dice upon finishing a long rest.»

**Оракул 2024** — `data/2024/srd/rules-glossary.md` (Long Rest → Benefits of the Rest):
«**Regain All HP.** You regain all lost Hit Points and **all** spent Hit Point Dice.»

**Має бути:** для `RULES_2014` — `min(max, current + max(1, floor(max / 2)))`; для
`RULES_2024` — `max`.

**Є:** `current = max` в обох редакціях.

**Статус у `docs/KNOWN-BUGS.md`:** «відкрито», з поміткою, що зміна поведінки для наявних
персонажів 2014 потребує окремого рішення власника. Підтверджую: досі відкрито, код не
змінено.

---

### L16-ruleset-isolation-07 — `POST /api/character/level-up` підвищує рівень **будь-якому** персонажу без автентифікації

**severity:** P0 · **edition:** both · **classification:** bug · **effort:** S

**Де:** `src/app/api/character/level-up/route.ts:24-50` → `src/lib/actions/character-transaction.ts:24`
→ `src/server/db/legacy-levelup.ts:12-14`

```ts
// route.ts — жодного auth()/assertOwnsPers
const { persId, choices, isMulticlass } = body;
const newLevel = 2; // Placeholder! Logic needs to be robust
result = await confirmLevelUp({ persId, choices, newLevel });
```
```ts
// legacy-levelup.ts
export async function updatePersLevel(persId: number, level: number): Promise<void> {
  await prisma.pers.update({ where: { persId }, data: { level } });
}
```

`confirmLevelUp` не має ні `auth()`, ні `assertOwnsPers` — на відміну від решти дій, які
починаються з `assertOwnsPers(persId)`. `GET` тим самим маршрутом віддає кроки підвищення
чужого персонажа.

**Наслідок:** будь-хто, знаючи `persId` (а це послідовний int), може перезаписати рівень
чужого персонажа на 2 і додати йому заклинання (`learnClassSpells`). У продакшні 9 394
персонажі.

**Звʼязок із моєю лінзою:** цей же маршрут — єдиний живий вхід у legacy-гілку, яка жорстко
2014-на (`src/server/db/legacy-levelup-actions.ts:7` `ACTIVE_RULESET = "RULES_2014"`,
рядок 95 фільтрує `choiceOption` цією константою). Тобто персонажу 2024 вона віддала б
вибори 2014. UI цієї гілки мертвий (`src/components/level-up/LevelUpWizard.tsx` ніде не
монтується — `grep` по `@/components/level-up` поза самою текою порожній), маршрут — ні.

**Fix hint:** або видалити маршрут разом із мертвим legacy-UI, або додати `auth()` +
`assertOwnsPers` і прибрати `newLevel = 2`.

---

### L16-ruleset-isolation-08 — 48 рис мають однакове `Feats`-імʼя у двох редакціях; логіка рис звіряється по імені

**severity:** P3 · **edition:** both · **classification:** data · **effort:** M

**Доказ:**

```sql
select count(*) from (select name from feat where ruleset='RULES_2014'
                      intersect select name from feat where ruleset='RULES_2024') x;  -- 48
-- ACTOR, ALERT, ATHLETE, CHARGER, CHEF, CROSSBOW_EXPERT, CRUSHER, …
```

`prisma/schema.prisma`, модель `Feat`: `@@unique([name, ruleset])` — колізія дозволена
навмисно.

`src/server/db/feat-gates.ts:37-42` (`toFeatInstance`) і `src/rules/repeatable-feats.ts`
ідентифікують рису **рядком `featName`**. Сьогодні це безпечно, бо персонаж однієї редакції
й усі його риси однієї редакції. Небезпечним воно стане в першій же точці, де рису шукають
по імені поза персонажем — наприклад `feat.prerequisiteFeat` (рядок із назвою) сьогодні
лише відображається (`src/lib/featsData.ts:61`), але щойно він стане перевіркою, вона
шукатиме «якусь» рису з цим іменем.

Фіксую як латентний ризик, не як поточну помилку.

---

### L16-ruleset-isolation-09 — мертвий 2014-хардкод: `getSpellsList` і `loadFightingStyleOptions`

**severity:** P3 · **edition:** both · **classification:** bug · **effort:** S

- `src/server/db/spell-actions.ts:543-545` — `getSpellsList()` із `where: { ruleset: ACTIVE_RULESET }`
  (`ACTIVE_RULESET = "RULES_2014"`, рядок 12). Викликів немає:
  `grep -rn "getSpellsList" src | grep -v spell-actions.ts` → порожньо. (Файл у переліку
  паралельної сесії — тільки читав.)
- `src/server/db/progression-content.ts:62-66` — `loadFightingStyleOptions()` із тим самим
  хардкодом; єдиний виклик — `src/lib/logic/progression-resolver.ts:132`, а він живе на
  мертвій legacy-гілці зі знахідки 07. До того ж таблиця порожня:
  `select count(*) from fighting_style` → **0 рядків в обох редакціях**, тобто крок «Бойовий
  стиль» на цій гілці показав би нуль опцій.

---

## Перевірено й правильно

**1. Референційна цілісність контенту між редакціями — чиста.** 28 звʼязків по всіх
таблицях зі стовпцем `ruleset`, усі дали **0** розбіжностей:

```
subclass→class, class_feature→class, class_feature→feature,
subclass_feature→subclass, subclass_feature→feature, race_trait→race,
race_trait→feature, subrace→race, race_variant→race,
class_choice_option→choice_option, subclass_choice_option→choice_option,
feat_choice_option→feat, feat_choice_option→choice_option,
choice_option_feature→feature, choice_option_feature→choice_option,
spell_classes→spell, spell_classes→class, spell_races→spell,
race_choice_option→race, race_choice_option_spell→spell,
race_choice_option_trait→feature, cseo→class, cseo→weapon, cseo→armor,
cseo→pack, subrace_trait→subrace, race_variant_trait→variant,
class_optional_feature→class
```

Тобто жодна риса/вибір/спорядження 2024 не висить на батькові 2014 і навпаки. Це найважливіше,
і воно в порядку.

**2. `creator-content-2014.json` / `-2024.json` не змішані.**
- у 2014-файлі 4 923 обʼєкти з полем `ruleset`, усі `RULES_2014`; у 2024-файлі 2 017, усі
  `RULES_2024`;
- перетин ідентифікаторів між файлами по всіх шести колекціях (`races`, `classes`,
  `backgrounds`, `weapons`, `feats`, `infusions`) — **0**;
- жодна назва з суфіксом `_2024` не потрапила у 2014-файл; усі 10 видів і 13 класів у
  2024-файлі мають суфікс `_2024`;
- `infusions` у 2024-файлі порожні (артифісера в PHB 2024 немає) — і це стверджує наявний
  тест `tests/content/ruleset-server-filter.test.ts`.

**3. Golden 2014 зелений.** `bun run test:db tests/golden/creation.test.ts` — **35/35**
(39 с). Регресії створення 2014 від роботи над 2024 немає. (Застереження до цього — знахідка
01: golden не бачить редакції обладунку.)

**4. `it.fails` у `tests/golden` немає жодного.** Прийняті баги позначені інакше:

| Маркер | Файл | Баг |
|---|---|---|
| `KNOWN_BUGS: ["BUG-001"]` | `tests/golden/creation/druid-early-subclass-BUG.json` | підклас на недозволеному рівні — **прийнято** |
| `KNOWN_BUGS: ["BUG-002"]` | `tests/golden/creation/fighter-optional-feature-early-BUG.json` | опційна фіча раніше рівня — **прийнято** |
| `KNOWN_BUGS: ["BUG-003"]` | `tests/golden/creation/background-feat-mismatch-BUG.json` | — |
| `KNOWN_BUGS: ["BUG-004"]` | `tests/golden/creation/athlete-feat-BUG.json` | — |
| `KNOWN_BUG: "BUG-010"` ×4 | `tests/golden/derived-state/rest-and-slots.{json,test.ts}` | довгий відпочинок дає слоти за загальним рівнем — **відкрито** |

BUG-011 (пули ресурсів) у golden уже замінений на справжню перевірку
(`docs/KNOWN-BUGS.md:304`), і код це підтверджує — див. п. 8 нижче.

**5. Крок «Риса походження» / ASI походження не показується персонажу 2014 — подвійний
захист.** `src/rules/background-asi.ts:32` — `if (ruleset !== "RULES_2024") return null;`
І дані згодні: усі 75 походжень 2014 мають `ability_options = '{}'` і `origin_feat_id IS NULL`;
усі 16 походжень 2024 — заповнені обидва поля.

**6. Крок «Майстерність зброї» не показується персонажу 2014.**
`creation-step-resolver.ts:67` вмикає крок від `hasWeaponMastery`, який рахується з
`class.weapon_mastery_progression` (`MultiStepForm.tsx:566`). У базі: усі 13 класів 2014
мають `NULL`; у 2024 масив непорожній, але для не-майстерних класів це `{0,0,…,0}` —
тобто крок отримують рівно BARBARIAN (2/3/4), FIGHTER (3/4/5/6), PALADIN, RANGER, ROGUE (2),
що збігається з `data/2024/srd/classes.md`. У левелапі те саме
(`levelup-weapon-mastery.ts` → `findWeaponMasteryCapacity`), а пул зброї береться з
`weapon-mastery.ts:123-125` із фільтром `where: { ruleset, mastery: { not: null } }` за
`pers.ruleset`.

**7. Підрас, варіантів і расових ASI у 2024 немає.** `subrace`: 17 рядків, усі 2014;
`race_variant`: 26, усі 2014. Крок «Підраса чи Варіант» вибирається за наявністю рядків
(`resolveRaceDetailsName`), тож у 2024 не зʼявляється.

**8. Прогресія 2014 не зачеплена.** `epic_boon_level` у всіх 13 класів 2014 — `NULL`
(у 2024 — 19). `ability_score_up_levels`: FIGHTER_2014 `{4,6,8,12,14,16,19}`,
ROGUE_2014 `{4,8,10,12,16,19}`, решта `{4,8,12,16,19}`; `subclass_level`: CLERIC/SORCERER/
WARLOCK 1, DRUID/WIZARD 2, решта 3 — усе за PHB 2014.

**9. Левелап їде за `pers.ruleset`, не за глобальною константою.**
`src/server/db/levelup-content.ts:49-50` — `const ruleset = pers?.ruleset ?? DEFAULT_RULESET;`
далі `findCharacterCreatorOptions(ruleset)`. Константа `DEFAULT_RULESET` спрацьовує лише
коли персонажа немає.

**10. Пули ресурсів не течуть між редакціями.**
`src/server/db/resource-pool-provider.ts` звужує кандидатів фільтром
`buildOwnedFeatureFilter(persId)` — по `classId`/`subclassId` самого персонажа, а ті
розділені за редакціями. Те саме для `wildshape-uses.ts:68`. Фікс BUG-011 тримається й
поперек редакцій.

**11. Розрахунок рівня заклинача отримав редакцію явним аргументом — і 2014-шлях не
зіпсовано.** `src/rules/spellcasting.ts` тепер бере `ruleset`; половинні заклиначі
округлюються вниз у 2014 і вгору у 2024, третинні — вниз в обох. Артифісер 2014 не
постраждав від рефакторингу: у базі `ARTIFICER_2014.spellcasting_type = HALF`, а
`roundsHalfCasterUp` явно повертає `true` для будь-якого `ARTIFICER*`. Перевірив усі
місця виклику — редакція скрізь реальна:
- `rest-actions.ts:162-176, 371-385` — `include:` (усі скалярні поля, серед них `ruleset`);
- `spell-slots.ts` → `findSpellcastingSlotState` (`src/server/db/spell-slots.ts:45`) — `ruleset: true` у `select`;
- PDF (`generateCharacterPdf.ts:760`) — `pers.ruleset` використовується поруч, на рядку 224;
- `MagicSlide.tsx:216`, `AddSpellDialog.tsx:46` — `PersWithRelations`, поле є;
- `src/rules/levelup.ts:52-55` — `before.ruleset`.

**12. `bonus-calculator.ts` за останні коміти змінено лише додаванням.** `git diff HEAD`
показує один новий експорт `calculateFinalAbilityScores` (KR27.2); жодна наявна функція не
чіпана, тобто похідні числа листа 2014 не могли зʼїхати.

**13. `AddSpellDialog` правильно розводить редакції** — `/2024/spells` проти `/spells` за
`pers.ruleset` (`AddSpellDialog.tsx:242, 353`). Саме тому знахідка 04 (предмети) читається
як недогляд.

**14. Хардкод `RULES_2014` у пошуку `HOMEBREW`-обладунку** (`equipment-actions.ts:189-200`)
— свідомий і задокументований: категорії `HOMEBREW` у книзі 2024 немає, у таблиці 2024 її
теж немає. Не знахідка.

**15. Наявні гейти ізоляції.** `tests/content/ruleset-server-filter.test.ts` і
`tests/content/ruleset-2024-isolation.test.ts` уже перевіряють, що рядки 2024 не течуть у
конструктор, левелап, `getBaseEquipment`, `loadFightingStyleOptions`, `getSpellsList` і
список заклинань. Жоден із них не перевіряє **зворотний** напрям (чи бачить персонаж 2024
свій контент) — саме там і сидять знахідки 03 і 04.

---

## Не перевірено

- **Браузером нічого не підтверджував.** Знахідки 03, 04, 05 доведені кодом і запитами;
  візуального доказу на :3100 не знімав через ліміт часу.
- **Робочу базу не читав** (заборонено). Усі числа — зі `spells_test`; там 20 персонажів
  (16 × 2014, 4 × 2024), тож перевірити продакшн-персонажів на змішані `armor_id`
  неможливо. Варто прогнати на проді:
  `select p.pers_id, p.ruleset, a.armor_id, a.ruleset from pers p join pers_armor pa on … join armor a on … where a.ruleset <> p.ruleset;`
- `tests/golden/levelup/**` і `tests/golden/derived-state/**` окремо не ганяв — прогнав
  тільки `creation.test.ts` (замок на базу тримала паралельна сесія ~5 хв).
- Дублікацію персонажа, шеринг і друк на предмет змішування редакцій не перевіряв.
