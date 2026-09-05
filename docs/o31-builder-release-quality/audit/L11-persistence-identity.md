# L11 — Ідентичність сутності ≠ ідентичність надання

Мітка: `L11-persistence-identity`. Дата: 2026-09-04. База доказів: `spells_test`
(запити через `work/L11-persistence-identity/q.mjs`), код репозиторію, `bun run` проби модулів.
Нічого в репозиторії не змінено.

---

## L11-persistence-identity-01 — зняття повторюваної риси стирає **всі** її взяття (Р37)

**Серйозність:** P1 · **Редакція:** both · **Клас:** bug · **Зусилля:** S

**Правило-оракул.** [Р37](../../../../docs/DECISIONS.md) (рішення власника 2026-09-03):
«Сховище: другий рядок, не лічильник. `pers_feat` втрачає унікальність `(feat_id, pers_id)`…
Кожне взяття — свій рядок зі своїми виборами».

**Доказ (код).** `src/server/db/feat-actions.ts:87-94`

```ts
export async function removePersFeat(persId: number, featId: number) {
  return prisma.persFeat.deleteMany({ where: { persId, featId } });
}
```

`deleteMany` по `(persId, featId)` знімає **всі** рядки цієї риси. Виклик іде так:

- `src/lib/components/characterSheet/feats/AcquiredFeatsTab.tsx:110` —
  `onClick={() => onRemoveFeat(pf.featId, translatedName)}` (рядок малюється по `pf.persFeatId`,
  а видаляється по `pf.featId`);
- `src/lib/components/characterSheet/FeatsSheetManagerModal.tsx:96` —
  `await removeFeatFromPers({ persId, featId })`;
- `src/lib/actions/feat-actions.ts:64` — `await removePersFeat(persId, featId)`.

Каталог рис **дозволяє** друге взяття повторюваної риси:
`src/lib/components/characterSheet/feats/FeatCatalogTab.tsx:139` —
`isAcquired && !feat.isRepeatable ? «Набуто» : <кнопка Додати>`. Тобто два рядки `Magic Initiate`
або `Skilled` на листі створити можна, а зняти один із них — ні.

Поруч у тому самому файлі лежить готовий правильний виклик, який ніхто не використовує:
`removePersFeatById(persFeatId, persId)` (`src/server/db/feat-actions.ts:96`) і серверна дія
`removePersFeatAction` (`src/lib/actions/feat-actions.ts:76`) — **жодного виклику в `src/`**
(`grep -rn "removePersFeatAction" src/ tests/` дає лише саме визначення).

**Очікувано.** Хрестик на другому `Skilled` знімає друге взяття; перше зі своїми трьома
навичками лишається.
**Фактично.** Зникають обидва рядки разом з усіма `pers_feat_choice` (каскад по `pers_feat_id`).

**Відтворення.** Лист персонажа 2024 → «Керування рисами» → Каталог → додати `Skilled` двічі
(кнопка не блокується, бо `isRepeatable`) → вкладка «Набуті» показує два рядки → зняти один →
`router.refresh()` → обидва зникли.

**Де лагодити.** Провести `persFeatId` крізь `AcquiredFeatsTab.onRemoveFeat` →
`FeatsSheetManagerModal` → уже наявну `removePersFeatAction`; `removeFeatFromPers(persId, featId)`
лишити тільки там, де справді треба зняти рису цілком (або прибрати).

---

## L11-persistence-identity-02 — Бард 2024 не отримує «Майстра на всі руки»: пошук по `engName` не збігається

**Серйозність:** P1 · **Редакція:** 2024 · **Клас:** bug · **Зусилля:** S

**Правило-оракул.** `data/2024/srd/classes.md`, Бард 2-го рівня — Jack of All Trades: половина
бонусу майстерності (заокруглена вниз) до перевірок характеристик, у яких немає володіння.

**Доказ (код).** `src/lib/logic/bonus-calculator.ts:199-208`

```ts
function hasFeatureByEngName(pers, engName) {
  const features = collectActiveFeatures(pers);
  return features.some((f) => String(f.engName ?? "").trim() === engName);
}
function hasJackOfAllTrades(pers) {
  // Hardcode by engName to avoid locale/name collisions.
  return hasFeatureByEngName(pers, "Jack of All Trades");
}
```

Використання — `bonus-calculator.ts:326`:
`calculateSkillProficiencyBonus(proficiency, pb, proficiency === "NONE" && hasJackOfAllTrades(pers))`.

**Доказ (база).**

```sql
select feature_id, eng_name, ruleset from feature where eng_name ilike '%jack of all%';
```
```
17913 | "Jack of All Trades"             | RULES_2014
48872 | "Bard: Jack of all Trades (2024)"| RULES_2024
```
```sql
select cf.*, c.eng_name from class_feature cf join class c using(class_id)
where cf.feature_id in (48872,17913);
```
```
968  | class_id 68  | feature 17913 | level_granted 2 | BARD_2014
1058 | class_id 340 | feature 48872 | level_granted 2 | BARD_2024
```

Рядок `"Bard: Jack of all Trades (2024)"` не дорівнює `"Jack of All Trades"` — ні префіксом, ні
регістром («all» проти «All»).

**Очікувано.** Бард 2024, рівень 2, PB 2 → +1 до кожної перевірки без володіння.
**Фактично.** +0. Жодного іншого місця, яке дає цей бонус, у `src/` немає
(`grep -rni "jack of all" src/` → лише `bonus-calculator.ts`).

**Де лагодити.** Корінь — L11-persistence-identity-07 (`Feature.engName` унікальний глобально,
тому імпорт 2024 мусив вписати редакцію в саму ідентичність). Точковий фікс: шукати фічу за
`(engName, ruleset)` або за стабільним ключем, а не за рядком показу.

---

## L11-persistence-identity-03 — жодна фіча 2024 не має обмежених використань і жодна не має пулу

**Серйозність:** P1 · **Редакція:** 2024 · **Клас:** data · **Зусилля:** L

**Доказ (база).**

```sql
select count(*) total, count(uses_count) with_uses, count(limited_uses_per) with_rest,
       count(uses_pool_key) with_pool, count(uses_count_special) with_special,
       sum(case when uses_count_depends_on_proficiency_bonus then 1 else 0 end) pb
from feature where ruleset='RULES_2024';
```
```
total 547 | with_uses 3 | with_rest 3 | with_pool 0 | with_special 0 | pb 0
```

Ті три — рівно фічі KR27.5:

```
49277 Magic Initiate: Cleric list (2024) | 1 | LONG_REST
49278 Magic Initiate: Druid list (2024)  | 1 | LONG_REST
49279 Magic Initiate: Wizard list (2024) | 1 | LONG_REST
```

Пули по редакціях:

```sql
select uses_pool_key, ruleset, count(*) from feature where uses_pool_key is not null group by 1,2;
```
```
ARCANE_SHOT 2014 9 · BARDIC_INSPIRATION 2014 8 · CHANNEL_DIVINITY 2014 39 · KI 2014 42 ·
PSIONIC_ENERGY 2014 13 · SORCERY_POINTS 2014 32 · SUPERIORITY_DICE 2014 24 · WILD_SHAPE 2014 6
```
— **жодного рядка 2024**. Метаданих у звʼязці теж немає:
`select count(*) total, count(mechanic_metadata) meta from class_feature where ruleset='RULES_2024'`
→ `187 / 0`.

Тобто в 2024 порожні: `Fighter: Second Wind (2024)` (48906), `Cleric: Channel Divinity (2024)`
(48883), `Paladin: Channel Divinity (2024)` (48947), `Bard: Bardic Inspiration (2024)` (48869),
`Druid: Wild Shape (2024)` (48895), `Monk: Monk’s Focus (2024)` (48922),
`Battle Master: Combat Superiority (2024)` (48639), `Sorcerer: Innate Sorcery (2024)` (48995),
`War Domain: War Priest (2024)` (48616), `Life Domain: Preserve Life (2024)` (48601) — усі з
`uses_count = null`.

**Очікувано** (`data/2024/srd/classes.md`): Second Wind — 2 використання на 1-му рівні,
відновлення за коротким відпочинком; Channel Divinity — 2 на 2-му рівні кліриком; Bardic
Inspiration — за модифікатором Харизми; Wild Shape — 2, потім 3, 4; Focus Points = рівень ченця.

**Фактично.** `PersFeature.usesRemaining` нема з чого ініціалізувати, `PersResourcePool` для
персонажа 2024 не заводиться взагалі (`findPoolProviderForPers`,
`src/server/db/resource-pool-provider.ts:26`, фільтрує по `usesPoolKey` — кандидатів нуль),
відпочинок нічого не відновлює, лічильники на слайді Рис не малюються.

**Наслідок для моєї лінзи.** Пункт «ресурс-пул з двох провайдерів» у 2024 неперевірний: провайдерів
нема. Уся машинерія `resource-pools.ts` / `feature-resources.ts` / `feature-uses.ts` для 2024
мертва.

**Де лагодити.** `data/2024/normalized/classes.json` + `subclasses.json` → поля
`usesCount` / `limitedUsesPer` / `usesCountSpecial` / `usesPoolKey`, і перелив сідом
([Р33](../../../../docs/DECISIONS.md#р33) — правити файл, не базу).

---

## L11-persistence-identity-04 — ціна Дикої форми 2024 не знаходить свою фічу (той самий `engName`)

**Серйозність:** P2 · **Редакція:** 2024 · **Клас:** bug · **Зусилля:** S

**Доказ (код).** `src/rules/wildshape-uses.ts:24-37`

```ts
const FORM_FEATURE_BY_CREATURE_TYPE = [
  { creatureType: "звір", engName: "Wild Shape" },
  { creatureType: "елементаль", engName: "Elemental Wild Shape" },
];
…
return features.find((feature) => feature.engName === engName) ?? null;
```

**Доказ (база).** Друїдська фіча 2024 зветься `Druid: Wild Shape (2024)` (feature_id 48895),
`uses_pool_key` = `null`. Рядка `Wild Shape` у `ruleset='RULES_2024'` немає.

**Очікувано.** Перевтілення друїда 2024 списує використання Дикої форми (2 на 2-му рівні за
`data/2024/srd/classes.md`), а на нулі показує попередження
`describeUseShortfall`.
**Фактично.** `findFormFeature` повертає `null` → `findFormPrice(null)` = 1, платити нема з чого
(пулу немає, див. -03) → перевтілення безкоштовне й безлічильникове.

**Де лагодити.** Разом із -03 і -07: звʼязок «тип істоти → фіча» тримати ключем, який не залежить
від редакції, або мати пару записів на редакцію.

---

## L11-persistence-identity-05 — «Додати рису» з листа пише голий рядок: без гейта, без ASI, без навичок, без виборів

**Серйозність:** P2 · **Редакція:** both · **Клас:** bug · **Зусилля:** M

**Доказ (код).** `src/lib/actions/feat-actions.ts:28-51` викликає лише
`addPersFeat(persId, featId, choiceOptionIds)`; `src/server/db/feat-actions.ts:56-84`:

```ts
const existing = feat.isRepeatable ? null : await prisma.persFeat.findFirst({ where: { persId, featId } });
const persFeat = existing ?? (await prisma.persFeat.create({ data: { persId, featId } }));
```

Чого тут немає порівняно зі шляхом конструктора/підвищення:

1. **Гейта.** `findFeatPackageProblem` (`src/server/db/feat-gates.ts:28`) — правило категорій і
   повторів [Р37] — з цього шляху не викликається взагалі.
2. **Виборів.** `FeatsSheetManagerModal.tsx:78` шле `addFeatToPers({ persId, featId })` **без**
   `choiceOptionIds`. Тому `Skilled` з листа не дає жодної навички, а два `Magic Initiate`
   лягають без списків і нічим не відрізняються один від одного — саме те, чого Р37 вимагає
   уникати.
3. **ASI.** Характеристики від риси пишуться в `pers.str…cha` у транзакції створення/підвищення
   (`levelup-persistence.ts:373-400`); `bonus-calculator.ts` риси для ASI не читає
   (`grep -n "asi" src/lib/logic/bonus-calculator.ts` — порожньо). Риса, додана з листа, ASI
   не дає ніде.
4. **Навичок/володінь/рядків `pers_feature`.** `addPersFeat` не створює ні `pers_skill`, ні
   `pers_feature`.
5. **Тиші при повторі.** Неповторювана риса, яка вже є, повертає існуючий рядок → дія віддає
   `{ success: true }` і тост «Рису «X» додано!» (`FeatsSheetManagerModal.tsx:82`), хоча в базі
   не змінилося нічого.

Часткова компенсація, яку варто знати: `bonus-calculator.ts:191-193` збирає фічі **через
відношення** `pf.feat.grantsFeature`, тому пасивні бонуси фічі риси (КЗ, атака) на листі
рахуються навіть без рядка `pers_feature`.

**Де лагодити.** `addFeatToPers` має проходити той самий гейт і той самий блок наслідків, що й
`saveFeatWithChoices` (`src/server/db/character-creation.ts:325`), або модалка має вести на крок
із виборами.

---

## L11-persistence-identity-06 — «не рахувати в підготовлених» вирішується підрядком у бейджі

**Серйозність:** P2 · **Редакція:** both · **Клас:** bug · **Зусилля:** S

**Доказ (код).** `src/lib/logic/spell-prepared-exclusions.ts:49-63`

```ts
const AUTO_EXCLUDE_BADGE_STATIC_TOKENS = ["архетип", "підклас", "раса", "підраса"];
…
if (normalized.includes(staticToken) || staticToken.includes(normalized)) return true;
…
if (normalized.includes(matcher) || matcher.includes(normalized)) return true;
```

Порівняння **двобічне**: не лише «бейдж містить токен», а й «токен містить бейдж».

**Доказ (прогін).** `work/L11-persistence-identity/badge-probe.ts`, `badge-probe2.ts`
(`bun run <файл>`):

```
badge "Клас"   -> true      // бо "підклас".includes("клас")
badge "Рас"    -> true      // бо "раса".includes("рас")
badge "Клірик" -> false
matchers(ELF_2014 / ELF_WOOD_2014) = [ "elf_2014", "ельф", "elf_wood_2014", "лісовий ельф" ]
badge "Ліс"     -> true
badge "Ельф"    -> true
badge "Лісовий" -> true
```

**Очікувано.** З ліміту підготовлених випадають заклинання, які дав підклас/вид, — і тільки вони.
**Фактично.** Випадає будь-яке заклинання, чий бейдж є підрядком назви виду/підвиду персонажа або
підрядком слова «підклас»/«раса». Гравець-ельф, що підписав заклинання «Ліс», тихо отримує на одне
підготовлене більше; гравець, що підписав «Клас», — так само.

**Де лагодити.** Джерело надання вже є в рядку — `pers_spell.origin` (`SpellOrigin`) і
`source_id`/`source_name`. Рішення має ухвалюватися по них, а не по вільному тексту бейджа;
двобічне `includes` прибрати в будь-якому разі.

---

## L11-persistence-identity-07 — `Feature.engName` і `ChoiceOption.optionNameEng` унікальні глобально, тому редакція вписана в саму ідентичність

**Серйозність:** P1 · **Редакція:** both · **Клас:** bug · **Зусилля:** L (потрібен DDL)

**Доказ (схема).** `prisma/schema.prisma:408` — `engName String @unique @map("eng_name")` на
`Feature` (при тому, що поруч, рядок 441, є `ruleset Ruleset @default(RULES_2014)`);
`prisma/schema.prisma:73` — `optionNameEng String @unique` на `ChoiceOption` (ruleset — рядок 79).
Для порівняння, там, де межу редакції провели правильно: `Spell` — `@@unique([engName, ruleset])`
(рядок 542), `Race` — `@@unique([engName, ruleset])` (1114).

**Доказ (наслідок у даних).** Імпорт 2024 не міг повторити англійську назву й дописав редакцію
всередину ключа:

```
Feature:      "Second Wind"        (2014)  ↔ "Fighter: Second Wind (2024)"
              "Unarmored Defense"  (2014)  ↔ "Barbarian: Unarmored Defense (2024)", "Monk: … (2024)"
              "Channel Divinity"   (2014)  ↔ "Cleric: Channel Divinity (2024)", "Paladin: … (2024)"
              "Jack of All Trades" (2014)  ↔ "Bard: Jack of all Trades (2024)"
ChoiceOption: "Defense"            (2014)  ↔ "Fighting Style 2024 (Defense)"
              "Pact of the Blade"  (2014)  ↔ "Pact of the Blade (2024)"
```

**Чому це знахідка, а не косметика.** `engName` — це те, чим код упізнає фічу. Кожне таке місце
міняє поведінку між редакціями мовчки: `hasJackOfAllTrades`
(`bonus-calculator.ts:207`, знахідка -02), `findFormFeature` (`wildshape-uses.ts:37`, знахідка
-04). Друга половина — розбір `optionNameEng` регуляркою в
`levelup-persistence.ts:373-410` і `src/lib/logic/characterUtils.ts:78`
(`nameEng.match(/\(([^)]+)\)\s*$/)`): корисне навантаження там читається з дужок у кінці рядка, а
дизамбігуатор редакції теж пишеться в дужках у кінці рядка. Зараз ці два не стикнулися лише
випадково — усі 210 опцій 2024 з дужковим хвостом мають заповнений `effect_kind` і йдуть
метаданими, а не фолбеком (перевірено:
`select … from choice_option where ruleset='RULES_2024' and effect_kind is null and option_name_eng ~ '\(([A-Z]){3}\)\s*$'`
→ 0 рядків). Наступна опція 2024 без `effect_kind` увімкне фолбек.

**Де лагодити.** `db/changes/…sql`: `Feature` — замінити `UNIQUE(eng_name)` на
`UNIQUE(eng_name, ruleset)`, те саме для `choice_option.option_name_eng`; далі почистити
дизамбігуатори в назвах 2024 (партії `data/2024/normalized/*.json`) і перевести пошук по
`engName` на пару `(engName, ruleset)`. До того — знахідки -02 і -04 лагодяться точково.

---

# Перевірено й правильно

- **Спільний пул Божественного каналу в мультикласі 2014 — за книгою.**
  Оракул: `data/2014/srd/03_Characterization/Multiclassing.md:73` — «getting the feature again
  doesn't give you an additional use of it… if you are a cleric 6/paladin 4, you can use Channel
  Divinity twice». Код робить саме це: `PersResourcePool @@unique([persId, poolKey])`
  (`schema.prisma:845`) — один пул на ключ, а `findPoolProviderForPers`
  (`resource-pool-provider.ts:26`) звужує кандидатів до фіч, які персонаж справді має, і
  `findPoolProvider` (`src/rules/resource-pools.ts:31`) віддає перевагу класовій фічі зі
  **шкальованим** максимумом. Для Клірика 6 / Паладина 3 у базі це фіча 17922
  (`uses_count_special = [{lvl:2,uses:1},{lvl:6,uses:2},{lvl:18,uses:3}]`), а не паладинська 2373
  (`uses_count = 1`) → 2 використання. Збігається з прикладом із SRD дослівно.
- **Передумови викликів Чорнокнижника 2024 звірені з новими назвами.** `prerequisites.pact` у
  рядках 2024 містить `"Pact of the Blade (2024)"`, `"Pact of the Tome (2024)"`,
  `"Pact of the Chain (2024)"` — тобто ті самі рядки, що й `option_name_eng` опцій-пактів 2024
  (3595–3597). `checkInvocationPrerequisite` (`src/rules/warlock-invocations.ts:22`) звіряє
  членство в множині — збігається. Дизамбігуатор редакції тут не зламав нічого, бо його вписали
  по обидва боки.
- **Ємність майстерності зброї в мультикласі 2024 — максимум, не сума.**
  `findWeaponMasteryCapacity` (`src/rules/weapon-mastery.ts:48`) — `reduce(Math.max)`; пул опцій —
  обʼєднання зброї всіх класів (`findWeaponMasteryOptionsForClasses`). `@@unique([pers_id,
  weapon_id])` на `pers_weapon_mastery` (`schema.prisma:1234`) робить одну зброю з двох класів
  одним рядком — правильно; запис завжди повний перезапис
  (`replacePersWeaponMastery`, `weapon-mastery.ts:78`), тож «зайвий» рядок не залишається.
- **Дубль навички з двох джерел у конструкторі не марнує вибір.** `SkillsForm.tsx:281`
  (`lockedSkillsInUI`) і `:283` (`alwaysLockedGrantedSkills` з `existingSkillsSet`) блокують уже
  надані навички в списку класу, тож гравець витрачає всі свої вибори на нові навички. Запис —
  `createMany({ skipDuplicates: true })` (`character-creation.ts:889`) поверх
  `@@unique([persId, name])` — один рядок на навичку, як і має бути.
- **Експертиза поверх володіння з іншого джерела не створює другого рядка й не втрачає
  володіння.** `character-creation.ts:906-921` — `upsert` по `persId_name` з
  `update: { proficiencyType: EXPERTISE }`; `SkillProficiencyType` — одне поле, а не два прапорці,
  тому «експертиза» поглинає «володіння» без конфлікту.
- **Одне заклинання з кількох джерел — один рядок (Р38).**
  `PersSpell @@unique([persId, spellId])` (`schema.prisma:893`); запис видових заклинань —
  `createMany({ skipDuplicates: true })` (`character-creation.ts:365`, `saveGrantedSpells`) і так
  само на 3/5 рівнях (`levelup-persistence.ts`, гілка `speciesGrants.spells`). Тобто друге
  джерело не дублює й **не переписує** перший рядок — рівно те, що Р38 називає свідомою ціною.
- **Повторна риса в конструкторі й на підвищенні пишеться другим рядком.**
  `saveFeatWithChoices` (`character-creation.ts:332`) — `persFeat.create` (не `upsert`), вибори —
  `persFeatChoice.createMany` по `persFeatId`. Гейт повтору — `findFeatPackageProblem`
  (`feat-gates.ts:28`) з текстом причини. Тобто Р37 у **цих** шляхах виконано; ламається лише
  шлях листа (знахідки -01 і -05).
- **Фіча з тією ж назвою від класу й підкласу.** У 2024 жодна фіча не висить на двох класах
  одночасно (`select feature_id … group by having count(distinct class_id) > 1` → 0 рядків), тож
  `PersFeature @@unique([persId, featureId])` колізії не дає; додавання на підвищенні —
  `createMany({ skipDuplicates: true })` (`levelup-persistence.ts:1348`), тобто повторне надання
  не падає й не обнуляє `usesRemaining`.
- **`PersMulticlass @@unique([persId, classId])`** не дає взяти той самий клас двічі — правильно.
- **`PersWildshape @@unique([persId, creatureKey, ruleset])`** несе `ruleset` у ключі: та сама
  істота з двох редакцій — два різні рядки. Це приклад того, як мали б виглядати `Feature` і
  `ChoiceOption` (знахідка -07).

# Не перевірено (лишаю наступному проходу)

- Чи блокує `FeatChoiceOptionsForm` вибір навички, яку персонаж уже має (аналог `SkillsForm`) —
  для `Skilled` / `Skill Expert`.
- `customProficiencies` — вільний текст (`schema.prisma:619`), який збирається злиттям рядків
  (`character-creation.ts:713`, `mergeUniqueLines` у `levelup-persistence.ts:1191`). Дедуплікація
  там порядкова, а не потермінна: два джерела, що дають перекривні набори інструментів, дадуть
  два рядки з частковим перетином. Доказу впливу на механіку не маю — володіння інструментом
  ніде не рахується числом.
- Провенанс `_ChoiceOptionToPers` (немає ані рівня, ані джерела): заміну інвокації на підвищенні
  подивився лише по коду (`levelup-persistence.ts:864-930`), персонажа під заміну не збирав.
- Шлях зняття заклинання (чи не гине джерело) — `src/server/db/spell-actions.ts` і
  `pers-actions.ts` у роботі паралельної сесії, не чіпав.
