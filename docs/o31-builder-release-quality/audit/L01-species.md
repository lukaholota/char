# L01-species — види 2024 від правила до листа

Оракул: `data/2024/srd/character-origins.md` (§ "Character Species", рядки 65–374),
`data/2024/normalized/species.json` (аасімар — поза SRD).
База: `spells_test`. Персонажі зібрані програмно через справжні `createCharacter` +
`levelUpCharacter` (10 фікстур `tests/fixtures/2024-acceptance/`), лог —
`scratchpad/audit/work/L01-species/probe-out.txt`, тест —
`scratchpad/audit/work/L01-species/species-probe.test.ts`, конфіг — `vitest.probe.mts`.
Запити до бази — `scratchpad/audit/work/L01-species/q.mjs`.

---

## L01-species-01 — P1 — Швидкість на листі й у друці жорстко 30: голіаф (35) показує 30

**Правило.** `character-origins.md:255` — «#### Goliath … **Speed:** 35 feet».
`:180-186` — лісовий ельф «Your Speed increases to 35 feet».
(2014 те саме питання: дворф/напврослик/гном — 25 футів.)

**Доказ.** `src/lib/logic/bonus-calculator.ts:394-398`:

```ts
/** Calculate final speed (base 30 + bonuses) */
export function calculateFinalSpeed(pers: PersWithRelations): number {
  // TODO: Get from race when race has speed field
  return 30 + getSimpleBonus(pers, "speed");
}
```

`race.speed` існує (`prisma/schema.prisma:928 speed Int @default(30)`) і в базі правильний:
`select name, speed from race where ruleset='RULES_2024'` → `GOLIATH_2024 = 35`, решта 30.
Функцію читають лише три місця, і всі показують число гравцю:
`src/lib/components/characterSheet/slides/MainStatsSlide.tsx:565` (плитка «Швидкість»),
`src/server/pdf/generateCharacterPdf.ts:1056` і `:1196` (поле Speed у PDF).

Персонаж `05-stone-goliath-barbarian-guard` (probe-out.txt): `race.speed=35`,
`speedBonuses=null` → на листі й у друці 30.

**Очікувано.** 35 у голіафа. **Фактично.** 30. **Правка.** `calculateFinalSpeed` має брати
`pers.race.speed` (і `subrace.speedModifier` для 2014). Ефорт S, але треба golden на 2014.

---

## L01-species-02 — P1 — Швидкість 35 лісового ельфа не застосовується: `modifies_speed` не читає ніхто

**Правило.** `character-origins.md:186` — «Wood Elf … Your Speed increases to 35 feet.»

**Доказ.** У базі значення є:
`select option_name_eng, modifies_speed from race_choice_option where option_name_eng='Wood Elf'`
→ `Wood Elf | 35`.
Але `grep -rn "modifiesSpeed" src/ --include="*.ts" --include="*.tsx" | grep -v generated` —
**порожньо**. Поле є у схемі (`prisma/schema.prisma:969`), потрапляє в
`creator-content-2024.json`, і жоден рядок коду його не читає.

**Очікувано.** Лісовий ельф — 35. **Фактично.** 30 (див. також L01-species-01).
**Правка.** `src/server/db/character-creation.ts` мав би класти різницю в `speedBonuses`, або
`calculateFinalSpeed` — читати обрані `raceChoiceOptions`. Ефорт M.

---

## L01-species-03 — P1 — Жодна риса виду 2024 не має обмежених використань: дев'ять рис із лічильником стали PASSIVE-текстом

**Правило** (`character-origins.md`):
- Подих дракононародженого — «You can use this Breath Weapon a number of times equal to your
  Proficiency Bonus, and you regain all expended uses when you finish a Long Rest» (:144);
- Драконячий політ — «Once you use this trait, you can't use it again until you finish a Long Rest» (:150);
- Каменярство дворфа — «a number of times equal to your Proficiency Bonus … Long Rest» (:172-174);
- Велетенське походження голіафа — «you can use the chosen benefit a number of times equal to your
  Proficiency Bonus … Long Rest» (:261);
- Велика форма — «Once you use this trait, you can't use it again until you finish a Long Rest» (:273);
- Викид адреналіну орка — «a number of times equal to your Proficiency Bonus … Short or Long Rest» (:315-317);
- Невгамовна витривалість — «Once you use this trait … Long Rest» (:321);
- Цілющі руки аасімара — «Once you use this trait, you can't use it again until you finish a Long Rest»
  (`data/2024/normalized/species.json`, Aasimar → Healing Hands);
- Небесне одкровення — «Once you transform, you can't do so again until you finish a Long Rest» (там само).

**Доказ.** Усі 39 рядків `race_trait` редакції 2024 мають
`display_type='{PASSIVE}'`, `limited_uses_per=NULL`, `uses_count=NULL`,
`uses_count_depends_on_proficiency_bonus=false` (повний дамп — probe-out.txt, блок
«SPECIES FEATURES» для всіх десяти персонажів: `[uses=-/- pb=false]`).
`resourcePools` у всіх десяти — `[]`.

Причина в сіді: `prisma/seed/raceSeed2024.ts:73-90` створює **кожну** рису виду з
`displayType: [FeatureDisplayType.PASSIVE]` і жодного разу не задає `limitedUsesPer`,
`usesCount`, `usesCountDependsOnProficiencyBonus` — бо `data/2024/normalized/species.json`
таких полів не має взагалі (тільки `engName/name/description`).

**Парність із 2014 — там це працює.** Той самий орк:
`ORC_MPMM | Adrenaline Rush | {BONUSACTION} | uses None / LONG_REST pb True`,
`ORC_MPMM | Relentless Endurance | {PASSIVE} | uses 1 / LONG_REST pb False`
(`prisma/seed/raceFeatureSeed.ts:354-365`). Тобто гравець 2014 має лічильник, а гравець 2024 —
ні.

**Наслідок.** Подих, Каменярство, Викид адреналіну, Стійкість каменю тощо не мають ані кнопки
використання, ані відновлення на відпочинку; риси не показуються як Бонусна дія / Реакція.
Суперечить [Р38](docs/DECISIONS.md#р38): «безкоштовне застосування … це фіча з обмеженими
використаннями (`limitedUsesPer` / `usesCount`), яка трекається з боку фіч».

**Ефорт.** M — поля треба донести в `data/2024/normalized/species.json` (або таблицю в сіді) і
перелити; DDL не потрібен.

---

## L01-species-04 — P1 — Аасімар не отримує замовляння «Світло» від «Світлоносця»

**Правило.** `data/2024/normalized/species.json`, Aasimar → Light Bearer: «You know the Light
cantrip. **Charisma is your spellcasting ability for it.**»

**Доказ.** Персонаж `10-aasimar-monk-hermit`, рівень 5 (probe-out.txt):
`SPECIES FEATURES: … Aasimar: Light Bearer (2024) …`, але `RACE SPELLS:` **порожньо**,
`ALL SPELLS:` порожньо.
Запит: `select f.eng_name, count(fs."B") from feature f left join "_FeatureToSpell" fs on
fs."A"=f.feature_id where f.eng_name like 'Aasimar:%' group by 1` → у всіх восьми рис `0`.
Для порівняння, у решти видів звʼязки є: `Elven Lineage: High Elf (2024) -> Prestidigitation`,
`Fiendish Legacy: Infernal (2024) -> Fire Bolt`, `Tiefling: Otherworldly Presence (2024) ->
Thaumaturgy`, `Gnome: Forest Gnome (2024) -> Minor Illusion, Speak with Animals`.
Саме заклинання в базі є: `spell_id=1564 Light, level 0, RULES_2024`.

**Друга половина дефекту.** Навіть якщо звʼязок додати, характеристики не буде: аасімар — єдиний
вид 2024 без жодного `race_choice_option` (probe-out.txt: `OPTIONS:` порожньо), а
`findSpeciesSource` бере характеристику тільки з опції, яка має `spellcastingAbility` +
`traitFeature` (`src/rules/spell-sources.ts:145-157`). Книга ж фіксує Харизму.

**Правка.** `prisma/seed/speciesChoices2024.ts` — `TRAIT_SPELLS` для
`Aasimar: Light Bearer (2024)` → `["Light"]`; характеристика — або жорстко CHA в
`findSpeciesSource`, або `race_choice_option` з єдиною опцією. Ефорт S/M.

---

## L01-species-05 — P1 — Людська «Вправність» (володіння однією навичкою на вибір) не реалізована

**Правило.** `character-origins.md:305` — «_Skillful._ You gain proficiency in one skill of your
choice.»

**Доказ.** `grep -rn "Skillful" src/ --include="*.ts" --include="*.tsx" | grep -v generated` —
**порожньо**; термін є лише в `data/2024/normalized/species.json:340` як опис риси.
`race.skill_proficiencies` для `HUMAN_2024` = `NULL`, жодного `race_choice_option` групи
«Вправність» немає (повний список опцій людини — тільки «Риса походження», 10 варіантів).

Персонаж `07-human-paladin-noble` рівня 5 (probe-out.txt):
`SKILLS: HISTORY, PERSUASION` (походження Noble) `+ ARCANA, INSIGHT, RELIGION` (риса Skilled) —
рівно 5, **жодної** від «Вправності». Риса `Human: Skillful (2024)` при цьому в списку рис є.

**Очікувано.** Людина має +1 навичку на вибір понад походження/клас.
**Фактично.** Риса є текстом, механіки немає. **Правка.** `race.skillProficiencies =
{options: [усі 18], choiceCount: 1}` у `prisma/seed/raceSeed2024.ts` — `SkillsForm` уже вміє
такий формат (`src/lib/components/characterCreator/SkillsForm.tsx:120-135`). Ефорт S.

---

## L01-species-06 — P2 — Вибору розміру Small/Medium немає ніде (Людина, Тифлінг, Аасімар)

**Правило.** `character-origins.md:297` — Human: «**Size:** Medium (about 4–7 feet tall) **or
Small** (about 2–4 feet tall), **chosen when you select this species**»; :327 — те саме для
тифлінга; аасімар — `species.json` `size: ["MEDIUM","SMALL"]`.

**Доказ.** `race.size` у базі коректний (`HUMAN_2024/TIEFLING_2024/AASIMAR_2024 =
{MEDIUM,SMALL}`), але:
- жодного `race_choice_option` групи «Розмір» для 2024 немає (повний дамп опцій — вище);
- у `model Pers` (`prisma/schema.prisma:437-540`) **немає стовпця розміру**;
- `grep -rn "\"SMALL\"" src/` поза `src/lib/generated/` — порожньо; єдина згадка розміру в UI —
  коментар `src/lib/components/characterCreator/infoUtils.ts:180`.

Механізм існує в 2014: у `CUSTOM_LINEAGE_TCE` є група `«Розмір» → «Середній»/«Малий»`
(`src/lib/generated/creator-content-2014.json`, optionId 113/114) — але вона теж нікуди не
записується, бо поля в `pers` немає.

**Наслідок.** Малий напівросликоподібний тифлінг неможливий; розмір не видно ні на листі, ні в
друці; правила «Могутня статура», «Спритність напівросликів», «Природна непомітність» спираються
на розмір, якого система не знає. **Ефорт L** (потрібен DDL на `pers`).

---

## L01-species-07 — P2 — Немає системи опору до шкоди: опір видів існує лише як текст

**Правило.** `character-origins.md:146` (Dragonborn Damage Resistance), :168 (Dwarven Resilience —
Poison), :341-355 (тифлінг: Poison/Necrotic/Fire за спадщиною), Aasimar Celestial Resistance —
Necrotic + Radiant.

**Доказ.** `grep -rni "resistan|опір" src/lib/components/characterSheet/ src/lib/logic/ src/rules/`
— **порожньо**. У `model Pers` немає поля опорів; у `Feature` — теж (є `savingThrows`,
`bonusToSavingThrows`, `modifiesAC`, але не опір до типу шкоди).

**Наслідок.** Гравець бачить «Ви маєте опір до шкоди вогнем» у тексті риси й мусить памʼятати сам;
зрілий білдер (D&D Beyond) виводить окремий блок Resistances. **Ефорт L**, both editions.

---

## L01-species-08 — P2 — Темнозір і відчуття ніде не зведені; дальність 60/120 губиться

**Правило.** `character-origins.md` — Dwarf і Orc 120 футів (:166, :319), решта 60; дроу підвищує
свій до 120 (:184).

**Доказ.** `grep -rni "darkvision|темнозір" src/` поза `src/lib/generated/` дає лише каталог
рас (`src/components/races/RacesClient.tsx:59,83`) і довідник правил — **на листі персонажа
жодної згадки**. `MainStatsSlide.tsx` не має блока відчуттів (шукав «Швидкість» — є, розміру й
відчуттів немає).

Через це у дроу на листі одночасно лежать дві риси з різними числами:
`Elf: Darkvision (2024)` = «60 футів» і `Elven Lineage: Drow (2024)` = «зростає до 120 футів»,
і система не каже, яке з них чинне. **Ефорт M** (виведене поле, DDL не потрібен).

---

## L01-species-09 — P2 — Безкоштовні застосування заклинань родоводу не трекаються

**Правило.** `character-origins.md:182` (ельф) і :335 (тифлінг): «You always have that spell
prepared. **You can cast it once without a spell slot**, and you regain the ability to cast it in
that way when you finish a Long Rest.» Лісовий гном: «You can cast it [Speak with Animals] without
a spell slot **a number of times equal to your Proficiency Bonus**» (:249).

**Доказ.** Заклинання лягають правильно — `03-high-elf-wizard-sage`:
`RACE SPELLS: Prestidigitation(l0) | Detect Magic(l1) | Misty Step(l2)`,
`origin=RACE`, `src=Elf: Elven Lineage (2024)` — але лічильника немає ніде:
`POOLS: []` у всіх десяти персонажів, а риси-джерела (`Elf: Elven Lineage (2024)`,
`Gnome: Forest Gnome (2024)`) мають `uses_count=NULL`, `limited_uses_per=NULL`.

Це рівно те, що [Р38](docs/DECISIONS.md#р38) описує як спосіб трекання
(«безкоштовне застосування … фіча з обмеженими використаннями»), — механізм обрано, але дані під
нього не заповнені. Спільний корінь із L01-species-03.

---

## L01-species-10 — P2 — Серверна дія не вимагає вибору в кожній групі опцій виду

**Доказ.** UI гейт є: `RaceChoiceOptionsForm.tsx:70-80` вимикає «Далі», доки
`groupedOptions.some(({groupName}) => selections[groupName] === undefined)`.
Сервер такої перевірки не робить: `src/server/db/creation-content.ts:76` просто бере
`uniquePositiveIds(Object.values(data.raceChoiceSelections ?? {}))`.
Фікстура `03-high-elf-wizard-sage` подає лише дві групи з трьох (немає «Гострі чуття») —
персонаж створився без помилки й лишився **без володіння** Аналізом/Уважністю/Виживанням
(probe-out.txt: `SKILLS: ARCANA:PROFICIENT, HISTORY:PROFICIENT` — обидві від походження Sage).

**Наслідок.** Будь-який шлях повз браузер (офлайн-операції, імпорт, майбутній API) дає персонажа
без обовʼязкової риси виду й без сигналу про це.

---

## L01-species-11 — P3 — Володіння від «Гострих чуттів» лежить у форматі, який серверний парсер мовчки викидає

**Доказ.** `race_choice_option.skill_proficiencies` для «Гострих чуттів» —
`{"options":["INSIGHT"],"choiceCount":1}` (обʼєкт), а
`src/server/db/character-creation.ts:615-617` читає його через
`parseStringArray(opt.skillProficiencies)`, який приймає **масив рядків**
(`src/server/db/json.ts:17-20`, `stringArraySchema.safeParse` → при невдачі `[]`).
Тобто гілка сервера завжди дає порожньо; навичка доїжджає лише тому, що
`SkillsForm.tsx:171` окремо кладе вибір у плаский `skills`. Тиха гілка, яка виглядає робочою.

---

# Перевірено й правильно

- **Склад видів.** У `race` рівно 10 записів `RULES_2024`: Aasimar, Dragonborn, Dwarf, Elf, Gnome,
  Goliath, Halfling, Human, Orc, Tiefling.
- **Немає ASI від виду** — `race.asi = {}` у всіх десяти (правило 2024: характеристики дає
  походження, не вид).
- **Розміри в даних** збігаються з книгою: Gnome/Halfling `{SMALL}`, Human/Tiefling/Aasimar
  `{MEDIUM,SMALL}`, решта `{MEDIUM}`.
- **Швидкості в даних**: Goliath 35, решта 30 — правильно (проблема лише в шарі відображення, див.
  L01-species-01).
- **Повний склад рис** кожного виду збігається зі SRD/PHB — 39 `race_trait` без жодної зайвої чи
  пропущеної (звірено рядок у рядок із `character-origins.md:97-374`).
- **Рівні рис персонажа.** `race_trait.level` правильний: `Dragonborn: Draconic Flight = 5`,
  `Goliath: Large Form = 5`, `Aasimar: Celestial Revelation = 3` (і три його варіанти теж 3),
  решта 1. Гейт іде рівнем **персонажа**, не класу (`src/rules/species-grants.ts`,
  `hasCharacterLevelAtLeast`), і на рівні 5 усі троє реально зʼявились у `pers_feature`
  (probe-out.txt, персонажі 01, 05, 10).
- **Аасімарське Небесне одкровення — усі три варіанти одразу — це правильно**, а не
  пропущений вибір: `species.json` цитує «choose the option **each time you transform**».
- **Вибори видів існують і зберігаються** — `Драконяче походження` (10 кольорів),
  `Ельфійський родовід` (3), `Гномський родовід` (2), `Велетенське походження` (6),
  `Демонічна спадщина` (3), `Риса походження` людини (10 Origin-рис — рівно список PHB 2024),
  `Базова характеристика заклинань` (INT/WIS/CHA) для ельфа, гнома, тифлінга. Усі лягають у
  `_PersToRaceChoiceOption` (probe-out.txt, рядки `OPTIONS:`).
- **Заклинання родоводів 3-го і 5-го рівня** — правильні пари й правильні рівні персонажа:
  Drow → Faerie Fire@3, Darkness@5; High Elf → Detect Magic@3, Misty Step@5; Wood Elf →
  Longstrider@3, Pass without Trace@5; Abyssal → Ray of Sickness@3, Hold Person@5; Chthonic →
  False Life@3, Ray of Enfeeblement@5; Infernal → Hellish Rebuke@3, Darkness@5. Збігається з
  таблицями `character-origins.md:190-232` і `:341-378`.
- **Замовляння 1-го рівня родоводів** на місці: Dancing Lights (дроу), Prestidigitation (високий
  ельф), Druidcraft (лісовий), Poison Spray / Chill Touch / Fire Bolt (спадщини),
  Minor Illusion + Speak with Animals (лісовий гном), Mending + Prestidigitation (скельний гном),
  Thaumaturgy (Потойбічна присутність тифлінга).
- **Характеристика замовляння виду** береться з вибору гравця й одна на весь вид: у
  `09-chthonic-tiefling` Thaumaturgy і Chill Touch мають те саме джерело
  `Tiefling: Fiendish Legacy (2024)` з CHA — саме як вимагає «Otherworldly Presence … uses the
  same spellcasting ability you use for your Fiendish Legacy trait» (`:380`).
- **Заклинання виду не зʼїдають ліміти класу**: `excludeFromPreparedCount` /
  `excludeFromKnownCount` виставлені в `buildSpeciesPersSpellRows`
  (`src/server/db/species-level-grants.ts:82-95`), `origin=RACE`.
- **Мови**: `Common + 2 на вибір` (`character-creation.md:202`) — персонаж отримав
  «Загальна / Дворфська / Ельфійська»; `race.languages = {COMMON}`,
  `race.languages_to_choose_count = 0`, дві решти дає крок Origin. Правило дотримано (мови
  зберігаються вільним текстом `pers.custom_languages_known` — це наявний дизайн, не дефект виду).
- **Людська «Універсальність»** дає **справжню** рису: `07-human-paladin-noble` має
  `pers_feat` TOUGH і +10 HP від нього (фікстура очікує 49 HP, розклад «d10 5 рівнів із CON +1 =
  39, Здоровань від вибору виду +10»). Тобто механіка Origin-риси не губиться, попри те що поруч
  створюється й описова фіча `Origin Feat: Tough (2024)`.
- **Підвищення рівня добирає риси виду**: `src/server/db/levelup-persistence.ts:740-741,1364-1366`
  через `findMissingSpeciesGrants`; ретроактивний ремонт передбачено
  (`scripts/repair-2024-species-level-grants.ts`).

# Не перевірено

- Візуальний вигляд рис виду у `FeaturesSlide` і заклинань у `MagicSlide` на :3100 — база
  `spells_test` була двічі очищена паралельними прогонами (мої персонажі 1–46 зникли, замість них
  зʼявились чужі «L04 …»), тож браузерну перевірку не проходив; усі висновки зроблені з коду й
  запитів.
- Чи дублюється вибір «Гострі чуття» між кроком «Опції раси» і кроком «Навички» в браузері
  (з коду виглядає, що так — `SkillsForm.tsx:189-215` будує групу з одного варіанта, — але без
  скріншота це не знахідка).
- HP дворфа з «Дворфською витривалістю» (+1 за рівень) числом не звіряв: фікстура
  `02-dwarf-cleric-farmer` очікує 53 з розкладом «… Dwarven Toughness +5», і приймальний набір
  цей критерій має, але мій прогін значення HP не друкував.
