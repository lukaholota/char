# L09-sheet-derived — похідний стан листа персонажа проти книги (2024)

Лінза: КЗ, ініціатива, швидкість, ряткидки, навички, володіння, атаки, HP, ресурси, риси,
стани — усе, що лист **обчислює**, а не зберігає. Фікстури-мішені: 01 воїн, 03 чарівник,
07 паладин, 10 монах (`tests/fixtures/2024-acceptance`).

## Як перевірялося

1. Оракул — `data/2024/srd/classes.md`, `character-origins.md`, `feats.md` (цитати в кожній знахідці).
2. Код — `src/lib/logic/bonus-calculator.ts`, `src/rules/armor.ts`, `proficiency.ts`,
   `hit-points.ts`, `resource-pools.ts`, слайди `characterSheet/slides/*`, `WeaponsCard.tsx`,
   `src/server/db/pers-actions.ts` (`getCharacterFeaturesGrouped`).
3. Дані — прямі SQL-запити до `spells_test`
   (`scratchpad/audit/work/L09-sheet-derived/db.mjs`, читання, без записів).
4. Програмна збірка всіх чотирьох фікстур крізь справжні серверні дії
   (`work/L09-sheet-derived/derived.test.ts` + власний `vitest.l09.mts`, який підставляє
   аліаси-заглушки на `next/cache` і `@/lib/auth` замість `vi.mock` — файл поза `root` не
   проходить hoisting). Персонажі зібрані `createCharacter` + чотирма `levelUpCharacter`,
   зчитані `getPersById` і прогнані крізь `bonus-calculator`. Знімок —
   `work/L09-sheet-derived/dump.json`.

---

## L09-sheet-derived-01 · Жодна фіча 2024 не має ліміту використань — на листі немає ресурсів класу

**P1 · 2024 · data**

**Правило.** `data/2024/srd/classes.md`:
- Fighter Features table, рівень 5: колонка **Second Wind = 3**.
- §Level 2: Action Surge — «one use».
- §Level 1: Lay On Hands: «you can restore a total number of Hit Points equal to **five times your
  Paladin level**» (пул 25 хітів на 5-му рівні).
- §Level 3: Channel Divinity (Paladin): «You can use this class's Channel Divinity **twice**».
- Monk Features table, рівень 5: колонка **Focus Points = 5**; §Level 2 Monk's Focus.
- `character-origins.md` рядок 154: Dragonborn Breath Weapon — «You can use this Breath Weapon a
  number of times equal to your **Proficiency Bonus**, and you regain all expended uses when you
  finish a Long Rest» (на 5-му рівні — 3).

**Доказ (SQL, `spells_test`).**

```sql
select ruleset, count(*) total,
       count(*) filter (where uses_count is not null
                        or uses_count_special is not null
                        or uses_pool_key is not null) as with_uses
from feature group by ruleset;
-- RULES_2024: total 547, with_uses 3
-- RULES_2014: total 1281, with_uses 338
```

Ті три — `Magic Initiate: Cleric/Druid/Wizard list (2024)`. Жодна класова, підкласова чи видова
фіча 2024 ліміту не має:

```
FIGHTER_2024 1 | Fighter: Second Wind (2024)   | uses=null | pb=false | special=null | pool=null
FIGHTER_2024 2 | Fighter: Action Surge (2024)  | uses=null | pb=false | special=null | pool=null
PALADIN_2024 1 | Paladin: Lay On Hands (2024)  | uses=null | pb=false | special=null | pool=null
PALADIN_2024 3 | Paladin: Channel Divinity (2024) | uses=null | pb=false | special=null | pool=null
MONK_2024    2 | Monk: Monk’s Focus (2024)     | uses=null | pb=false | special=null | pool=null
WIZARD_2024  1 | Wizard: Arcane Recovery (2024)| uses=null | pb=false | special=null | pool=null
DRAGONBORN_2024 1 | Dragonborn: Breath Weapon (2024) | uses=null | pb=false | special=null | pool=null
AASIMAR_2024 1 | Aasimar: Healing Hands (2024) | uses=null | pb=false | special=null | pool=null
```

Для контрасту, ті самі фічі 2014 несуть числа:

```
FIGHTER_2014 1 | Second Wind    | uses=1
FIGHTER_2014 2 | Action Surge   | special=[{"lvl":2,"uses":1},{"lvl":17,"uses":2}]
MONK_2014    2 | Ki             | special={"equalsToClassLevel":true} | pool=KI
PALADIN_2014 1 | Lay on Hands   | special={"type":"FORMULA","group":"LEVEL_BASED","operation":"MULTIPLY","multiplier":5}
PALADIN_2014 3 | Channel Divinity | uses=1 | pool=CHANNEL_DIVINITY
```

**Очікувано.** У воїна 5 на листі — Другий вітер 3/3 і Сплеск дій 1/1; у паладина 5 — пул
Накладання рук 25 і Божественний канал 2/2; у монаха 5 — 5 очок фокусу; у драконороджених —
Зброя дихання 3/3.
**Фактично.** Секція «Ресурси класу» порожня для будь-якого персонажа 2024:
`FeaturesSlide.tsx:258–262` бере лише фічі з `usesPer`/`usesRemaining`, а
`pers-actions.ts:988–989, 1029–1036` рахує максимум рівно з трьох порожніх стовпців.
**Доказ (програмна збірка).** `resourcePools: []` у **всіх чотирьох** зібраних персонажах
(01 воїн, 03 чарівник, 07 паладин, 10 монах) на 5-му рівні.

**Виправлення.** Заповнити `uses_count` / `uses_count_depends_on_proficiency_bonus` /
`uses_count_special` / `uses_pool_key` / `limited_uses_per` у джерелах сіду 2024
(`data/2024/normalized/classes.json`, `species.json`) і перелити — двигун уже вміє все це
рахувати ([Р33](docs/DECISIONS.md#р33): правити файл, не базу).
**Обсяг:** L.

---

## L09-sheet-derived-02 · Усі 547 фіч 2024 позначені PASSIVE — на листі немає дій, бонусних дій і реакцій

**P1 · 2024 · data**

**Доказ (SQL).**

```sql
select unnest(display_type)::text dt, count(*) from feature where ruleset='RULES_2024' group by 1;
-- PASSIVE 547   (і більше нічого)

select unnest(display_type)::text dt, count(*) from feature where ruleset='RULES_2014' group by 1;
-- PASSIVE 921, ACTION 166, BONUSACTION 130, REACTION 78, CLASS_RESOURCE 13, FREE 4, HIDDEN 1
```

**Правило.** `classes.md`: Second Wind — «as a Bonus Action»; Lay On Hands — «As a Bonus Action»;
Channel Divinity (Paladin, Divine Sense) — «As a Magic action»; Flurry of Blows — «as a Bonus
Action»; Deflect Attacks — Reaction; `character-origins.md`: Draconic Flight — «As a Bonus Action».

**Очікувано.** Слайд «Риси» групує їх у «Дії / Бонусні дії / Реакції / Ресурси класу».
**Фактично.** Усе падає в «Пасивні здібності»; секцій «Ресурси класу» (`FeaturesSlide.tsx:306`)
і решти категорій для 2024 не виникає взагалі, бо `CLASS_RESOURCE` не проставлено жодного разу.
**Виправлення.** Проставити `display_type` у нормалізованих джерелах 2024 (той самий прохід, що
й 01). **Обсяг:** M.

---

## L09-sheet-derived-03 · Швидкість на листі захардкоджена 30 — вид, родовід і Рух без обладунків ігноруються

**P1 · both · bug**

**Код.** `src/lib/logic/bonus-calculator.ts:393–397`:

```ts
/** Calculate final speed (base 30 + bonuses) */
export function calculateFinalSpeed(pers: PersWithRelations): number {
  // TODO: Get from race when race has speed field
  return 30 + getSimpleBonus(pers, "speed");
}
```

Поле давно є — `prisma/schema.prisma:928 speed Int @default(30)` у моделі `Race`. Його читає лише
каталог видів (`src/components/races/RaceDetailCard.tsx:71`, `RacesClient.tsx:115,127,316`); на
листі — ніде. `MainStatsSlide.tsx:565` малює саме `calculateFinalSpeed(pers)`.

**Доказ (SQL) — де це вже неправда:**

```
DWARF_2014 25 · GNOME_2014 25 · HALFLING_2014 25 · LEONIN_MOOT 35 · DHAMPIR_VRGTR 35
CENTAUR_MPMM 40 · SATYR_MPMM 35 · GRUNG_OGA 25 · GOLIATH_2024 35
```

Плюс родовід лісового ельфа: `race_choice_option.modifies_speed = 35` для
`ELF_2024 / Ельфійський родовід / Лісовий ельф` — рядок є в базі, але `modifiesSpeed` у `src/`
не читає ніхто (лише сіди `prisma/seed/speciesChoices2024.ts`).

Плюс `classes.md` §Level 2: Unarmored Movement — «Your speed increases by 10 feet while you aren't
wearing armor or wielding a Shield»; Monk Features table рівень 5 → **+10 ft**.

**Очікувано.** Монах-аасімар 5 (фікстура 10) без обладунку — **40 футів**; голіат 2024 — 35;
дворф 2014 — 25.
**Доказ (програмна збірка фікстури 10).** Монах-аасімар 5 без обладунку:
`speed 30 | armors [{"name":"UNARMORED_DEFENSE_MONK","equipped":true}]` — має бути 40.

**Фактично.** 30 для всіх; жодне джерело швидкості не пише `speedBonuses` (грепом
`speedBonuses` у `src/` пишуть тільки `bonus-actions.ts` — ручний бонус користувача,
`share-actions.ts`/`snapshots.ts` — копіювання, і `beast-form.ts` — дика форма).
**Виправлення.** `calculateFinalSpeed` мусить брати базу з `pers.race.speed`
(+ `raceVariant.overridesRaceSpeed`, + `subrace.speedModifier`, + `raceChoiceOption.modifiesSpeed`),
а Рух без обладунків потребує поля на `Feature` (як `givesAC`) або окремого правила в `src/rules/`.
**Обсяг:** M (без Руху без обладунків — S).

---

## L09-sheet-derived-04 · Ініціатива не знає ні риси Пильність 2024, ні жодного джерела, крім ручного бонусу

**P1 · 2024 · missing-system**

**Правило.** `data/2024/srd/feats.md:27` — Alert, _Initiative Proficiency_: «When you roll
Initiative, you can add your **Proficiency Bonus** to the roll». Це Origin-риса, тобто її бере
персонаж 1-го рівня.

**Код.** `bonus-calculator.ts:400–404`:

```ts
export function calculateFinalInitiative(pers: PersWithRelations): number {
  const dexMod = calculateFinalModifier(pers, Ability.DEX);
  return dexMod + getSimpleBonus(pers, "initiative");
}
```

`getSimpleBonus(pers,"initiative")` читає `pers.initiativebonuses` — це поле править лише
користувач руками через `ModifyStatModal`. У таблиці `feature` немає жодного стовпця про
ініціативу (перевірено: `bonus_hit_points_per_level`, `bonus_to_attack_roll`,
`bonus_to_melee_damage`, `bonus_to_melee_one_handed_weapon_damage`, `bonus_to_ranged_attack_roll`,
`bonus_to_ranged_damage`, `bonus_to_saving_throws`, `gives_ac`, `modifies_ac`,
`no_armor_or_shield_for_ac_bonus`, `requires_armor_for_ac_bonus`,
`uses_count_depends_on_proficiency_bonus`), і в `feat` теж.

**Очікувано.** Персонаж 5-го рівня з Alert має ініціативу СПР+3.
**Фактично.** СПР. Те саме стосується Jack of All Trades барда 2024 (у 2024 він явно поширюється
на ініціативу) і Швидких рефлексів.
**Виправлення.** Поле `bonusToInitiative` на `Feature` + читання його в `calculateFinalInitiative`
через `collectActiveFeatures` (механізм уже є для КЗ і шкоди). **Обсяг:** M (DDL + дані + код).

---

## L09-sheet-derived-05 · Лист рахує одну КС заклинань — із `class.primaryCastingStat`, а не з джерела

**P1 · 2024 · bug**

**Правило / цільова картина.** Критерій К16 приймального набору: «кожне джерело заклинань несе
власну характеристику замовляння»; фікстура 03 має три джерела (`WIZARD_2024`, `MAGIC_INITIATE`,
`Elf: Elven Lineage (2024)`).

**Код.** `MagicSlide.tsx:163–173`:

```ts
const spellcastingAbility = localPers.class?.primaryCastingStat;
...
if (!spellcastingAbility) return 0;    // атака заклинань
if (!spellcastingAbility) return 8;    // КС заклинань
```

`loadPersSpellSources` / `spellSources` не імпортує **жоден** файл у
`src/lib/components/characterSheet/` і `src/app/char/[id]/` (перевірено грепом).

**Очікувано.** Заклинання від Magic Initiate (Wizard list, ІНТ) у клірика показує КС від ІНТ;
воїн із Magic Initiate має КС і бонус атаки взагалі.
**Фактично.** Одне число з основного класу; для класу без `primary_casting_stat`
(`FIGHTER_2024`, `MONK_2024` — перевірено запитом, там `null`) лист показує КС 8 і атаку +0.
**Виправлення.** Передати `loadPersSpellSources` у лист і малювати КС/атаку по джерелах
(рядок на джерело), як уже зроблено на сервері. **Обсяг:** M.

---

## L09-sheet-derived-06 · Монах 2024: беззбройного удару не існує, а посох рахується від Сили

**P1 · 2024 · bug + data**

**Правило.** `classes.md:5143` — Martial Arts, _Dexterous Attacks_: «You can use your **Dexterity**
modifier instead of your Strength modifier for the attack and damage rolls of your **Unarmed
Strikes and Monk weapons**». `classes.md:5141` — Martial Arts Die: 1d6, на 5-му рівні 1d8.

**Доказ (SQL).**

```sql
select weapon_id, name::text, ruleset::text, damage from weapon
where name::text in ('UNARMED_STRIKE','QUARTERSTAFF');
-- 11   UNARMED_STRIKE RULES_2014 "1"
-- 8    QUARTERSTAFF   RULES_2014 "1к6"
-- 2206 QUARTERSTAFF   RULES_2024 "1d6"   (mastery TOPPLE)
-- рядка UNARMED_STRIKE для RULES_2024 немає
```

**Код.** `bonus-calculator.ts:494–507` (`getWeaponAbility`) бере СПР лише коли зброя дальня або має
властивість `FINESSE`; посох (`VERSATILE`) → СИЛА. Автоматичного джерела `customDamageAbility` не
існує: його пише тільки `WeaponCustomizeModal` руками
(`src/server/db/equipment-actions.ts:75,121` — виклик із модалки).

**Очікувано.** Монах-аасімар 5 (СИЛ 12 = +1, СПР 16 = +3, БМ +3): посох +6 / шкода 1d8+3
(кістка бойових мистецтв), беззбройний удар як окремий рядок атаки.
**Доказ (програмна збірка фікстури 10).** `weapons: []` — у монаха 5-го рівня на листі
**жодної атаки**: класове спорядження варіанта «b» — це 50 зм, а беззбройного удару в 2024 не існує
як рядка зброї.

**Фактично.** Посох рахувався б +4 / шкода 1d6+1; беззбройного удару на листі немає взагалі.
**Виправлення.** (а) додати `UNARMED_STRIKE` у зброю 2024; (б) правило «зброя монаха/беззбройний
удар бере кращий із СИЛ/СПР» у `getWeaponAbility` (за фічею `Monk: Martial Arts (2024)`),
плюс кістка бойових мистецтв замість базової шкоди. **Обсяг:** M.

---

## L09-sheet-derived-07 · Драконяча живучість 2024 не додає хітів

**P1 · 2024 · data**

**Правило.** `classes.md:8635` — «Your **Hit Point maximum increases by 3**, and it increases by 1
whenever you gain another Sorcerer level».

**Доказ (SQL).**

```sql
select feature_id, eng_name, bonus_hit_points_per_level from feature
where eng_name like '%Draconic Resilience%';
-- 48754 Draconic Sorcery: Draconic Resilience (2024) | null
-- 8603  Draconic Resilience                          | null

select feature_id, eng_name, ruleset, bonus_hit_points_per_level
from feature where bonus_hit_points_per_level is not null;
-- лише Dwarf: Dwarven Toughness (2024) = 1 і Dwarven Toughness (Hill Dwarf Subrace) = 1
```

Половина риси при цьому змодельована: рядок обладунку `DRACONIC_RESILIENCE` (armor_id 376,
base_ac 10, `{DEX,CHA}`, RULES_2024) є, і `src/rules/armor-class-formulas.ts` його видає. Тобто
КЗ працює, а хіти — ні.
**Очікувано.** Чародій-дракон 5: +3 на 3-му рівні, +1 на 4-му, +1 на 5-му = +5 до максимуму хітів.
**Фактично.** +0.
**Виправлення.** Механізм `bonusHitPointsPerLevel` рахує від 1-го рівня персонажа, а тут потрібно
«від рівня класу, з якого відкрилася фіча»; або нове поле, або окреме правило в `src/rules/hit-points.ts`.
**Обсяг:** M.

---

## L09-sheet-derived-08 · Пасивних Сприйняття й Аналізу на листі немає

**P2 · both · missing-system**

`10 + calculateFinalSkill(pers, Skills.PERCEPTION).total` рахується лише у PDF
(`src/server/pdf/generateCharacterPdf.ts:1090`). У `src/lib/components/characterSheet/` слова
«Пасивн» немає ніде, крім заголовка секції «Пасивні здібності» у `FeaturesSlide.tsx:314` (це про
риси, не про перевірки). Зрілий білдер (D&D Beyond, Foundry) показує пасивні Сприйняття, Аналіз і
Проникливість на першому екрані — майстер питає їх щосесії.
**Виправлення.** Три числа в `SkillsSlide`. **Обсяг:** S.

---

## L09-sheet-derived-09 · Станів, виснаження й концентрації лист не веде

**P2 · both · missing-system**

У таблиці `pers` немає стовпців для станів, виснаження чи концентрації (повний перелік стовпців
знято запитом: є `temp_hp`, `death_save_failures`, `death_save_successes`, `currenthitdice`,
`usedhitdice` — і більше нічого з бойового стану). У `src/lib/components/characterSheet/` немає
жодного входження «Виснаж», «Концентрац», «exhaust», «concentrat».

Правило 2024, `data/2024/srd/rules-glossary.md` §Exhaustion — кожен рівень виснаження дає −2 до
всіх перевірок d20 і −5 футів швидкості; тобто це **похідне** число, а не нотатка. Концентрація —
ряткидок Статури DC 10 або половина шкоди.
**Виправлення.** DDL + UI; окрема ціль. **Обсяг:** L.

---

## L09-sheet-derived-10 · Володіння (броня/зброя/інструменти) — вільний текст, знятий один раз при створенні

**P2 · both · missing-system**

`MainStatsSlide.tsx:911` — `textarea` з `pers.customProficiencies`. Текст збирається один раз у
`character-creation.ts:660–713` і потім лише дозливається рядками при підвищенні рівня
(`levelup-persistence.ts:1191`). Тобто це знімок, а не похідна величина: мультиклас, риса чи
предмет, що дає володіння, до нього не доїде, а помилку в ньому можна виправити лише руками.
Те саме з мовами (`custom_languages_known`).
**Виправлення.** Рахувати володіння як похідне з тих самих джерел, що й навички. **Обсяг:** L.

---

## L09-sheet-derived-11 · Кубики шкоди зброї 2024 записані латинкою — лист показує «1d6» поруч із «1к6» решти застосунку

**P3 · 2024 · data**

```sql
select ruleset, count(*) total,
       count(*) filter (where damage like '%к%') cyr,
       count(*) filter (where damage like '%d%') lat
from weapon group by ruleset;
-- RULES_2024: 38 / cyr 0 / lat 37
-- RULES_2014: 48 / cyr 45 / lat 0
```

`WeaponsCard.tsx:160` друкує `pw.customDamageDice || pw.weapon?.damage` дослівно.
**Виправлення.** Звести запис у джерелі 2024 (`data/2024/normalized/weapons.json`) до «к», як у
2014 — правити файл, не базу ([Р33](docs/DECISIONS.md#р33)). **Обсяг:** S.

---

## Перевірено й правильно

- **Бонус майстерності.** `calculateProficiencyBonus = ceil(level/4)+1` (`src/rules/proficiency.ts:8`)
  збігається з таблицями всіх класів SRD 2024; на 5-му рівні +3.
- **Навички й компетентність.** `calculateSkillProficiencyBonus` (`src/rules/proficiency.ts:11–19`):
  EXPERTISE = 2×БМ, PROFICIENT = БМ, HALF/Jack of All Trades = ⌊БМ/2⌋, NONE = 0 — за книгою.
  Jack of All Trades знаходиться за `engName`, а не за локалізованою назвою
  (`bonus-calculator.ts:205–208`) — правильна обережність.
- **Ряткидки.** `calculateFinalSave` бере проф із `pers.additionalSaveProficiencies`, який
  заповнює створення з `class.saving_throws` (`character-creation.ts:787`). Класові ряткидки 2024
  у базі правильні: FIGHTER_2024 {STR,CON}, MONK_2024 {STR,DEX}, PALADIN_2024 {WIS,CHA},
  WIZARD_2024 {INT,WIS} — збігається з SRD.
- **Кубики хітів і КЗ-джерела класів.** `hit_die`: воїн 10, паладин 10, монах 8, чарівник 6 —
  за книгою. `subclass_level = 3` у всіх чотирьох — правило 2024 «підклас на 3-му» дотримано.
- **Захист без обладунків монаха 2024** змодельований коректно: рядок `armor`
  `UNARMORED_DEFENSE_MONK` (base_ac 10, `{DEX,WIS}`, FULL) видається персонажу
  `armor-class-formulas.ts` за назвою фічі, а `calculateArmorClass` бере рівно вдягнений рядок і
  ніколи не складає дві формули (`src/rules/armor.ts:16–24`) — це відповідає SRD 2024
  «you can benefit from only one at a time».
- **Стиль Захист** працює через `Feature.requiresArmorForACBonus` + `givesAC`
  (`bonus-calculator.ts:210–232`) — тобто +1 лише в обладунку, як у книзі.
- **Щит** — `+2 + additionalShieldBonus` (`armor.ts:5`), середній обладунок обмежує СПР
  через `MAX2` (`armor.ts:44`).
- **Тонка зброя** — `getWeaponAbility` бере кращий із СИЛ/СПР (`bonus-calculator.ts:500–505`),
  за книгою.
- **Ємність майстерності зброї 2024** у базі: FIGHTER_2024 [3,3,3,4,4,…], PALADIN_2024 [2,…],
  MONK_2024/WIZARD_2024 нулі — збігається з таблицями SRD і з очікуванням фікстур.
- **Ряткидки смерті й тимчасові хіти** на листі є (`MainStatsSlide.tsx:87–90,146`), відпочинок
  їх скидає (`RestButton.tsx:73–74`).
- **BUG-011 (хто задає максимум спільного пулу)** закрито правильно:
  `src/rules/resource-pools.ts` сортує претендентів (класова перед підкласовою, масштабована
  перед пласкою, менший `featureId`) — детермінований результат. Для 2024 це поки безпредметно
  через знахідку 01.

## L09-sheet-derived-12 · Бойові стилі 2024 не мають механіки: Оборона не дає +1 КЗ

**P1 · 2024 · data**

**Правило.** `data/2024/srd/feats.md:95` — Defense: «While you're wearing Light, Medium, or Heavy
armor, you gain a **+1 bonus to Armor Class**». Те саме в
`data/2024/normalized/feats.json`: Archery — «+2 bonus to attack rolls … with Ranged weapons»,
Dueling — «+2 bonus to damage rolls».

**Доказ (SQL).**

```sql
select eng_name, gives_ac, requires_armor_for_ac_bonus,
       bonus_to_melee_one_handed_weapon_damage, bonus_to_ranged_attack_roll from feature
where eng_name ilike '%Fighting Style%' or eng_name in ('Defense','Dueling','Archery');
-- RULES_2024 Fighting Style: Defense (2024) | null | null | null | null
-- RULES_2024 Fighting Style: Dueling (2024) | null | null | null | null
-- RULES_2024 Fighting Style: Archery (2024) | null | null | null | null
-- RULES_2014 Defense                        | 1    | true | null | null
-- RULES_2014 Dueling                        | null | null | 2    | null
-- RULES_2014 Archery                        | null | null | null | 2
```

**Доказ (програмна збірка фікстури 01, `work/L09-sheet-derived/derived.test.ts`).** Драконороджений
воїн-Чемпіон 5 зі стилем Defense і клепаним шкіряним обладунком (СПР 14):

```
AC 14 | armors [{"name":"STUDDED_LEATHER","baseAC":12,"equipped":true}] | shield false
```

**Очікувано.** 12 (обладунок) + 2 (СПР) + 1 (Оборона) = **15**.
**Фактично.** 14. Двигун готовий — `bonus-calculator.ts:210–232` уже читає `givesAC` і
`requiresArmorForACBonus`, і саме так працює 2014.
**Виправлення.** Проставити поля у джерелі сіду бойових стилів 2024 і перелити.
**Обсяг:** S.

---

## Знімок зібраних персонажів (5-й рівень)

| | 01 воїн | 03 чарівник | 07 паладин | 10 монах |
|---|---|---|---|---|
| характеристики | 19/14/14/8/10/12 | 8/12/14/19/14/10 | 18/10/13/8/12/16 | 12/16/14/10/16/8 |
| макс. хіти | 44 ✓ | 32 ✓ | 49 ✓ | 38 ✓ |
| КЗ | **14** (має бути 15) | 11 ✓ | 10 ✓ (варіант «b» = 150 зм, без обладунку) | 16 ✓ |
| ініціатива | +2 ✓ | +1 ✓ | +0 ✓ | +3 ✓ |
| швидкість | 30 ✓ | 30 ✓ | 30 ✓ | **30** (має бути 40) |
| БМ | +3 ✓ | +3 ✓ | +3 ✓ | +3 ✓ |
| ряткидки з профом | СИЛ/СТА ✓ | ІНТ/МДР ✓ | МДР/ХАР ✓ | СИЛ/СПР ✓ |
| ресурси | **[]** | **[]** | **[]** | **[]** |
| атаки | 3 ✓ | 2 ✓ | 0 ✓ | **0** |
| мови | Загальна+2 ✓ | Загальна+2 ✓ | Загальна+2 ✓ | Загальна+2 ✓ |

Помилок серверних дій не було в жодного (`levelUpErrors: []`).

**Застереження про склад навичок.** Хелпер `build2024Character` не обирає класових навичок
(фікстури їх не називають), тому в знімку видно лише навички походження й рис. Це артефакт
приймального набору, а не дефект застосунку — окремою знахідкою не виноситься.
