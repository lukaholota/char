# L14-bastions — аудит бастіонів (O19, DMG 2024)

Дата: 2026-09-04. Гілка: main, робоче дерево як є. Нічого не правив, у репозиторій не писав.

## Оракули, з яких виписані вимоги

- `data/5etools/raw/book/book-xdmg.json` → розділ 8 «Bastions» (дзеркало DMG 2024, KR16.1).
  Ключові цитати нижче — дослівно з нього.
- `data/5etools/raw/bastions.json` — 61 приміщення (55 special + 6 basic).
- `data/2024/normalized/bastion-facilities.json` — нормалізований каталог, 61 запис.
- `docs/DECISIONS.md` → Р26 (бастіон — трекер, правила підказують, не забороняють).
- `docs/o19-bastions/README.md`, `docs/o18-2024-character-parity/reference-2024.md` §11–13
  (north star власника).

Цитати з книги, на які спираються знахідки:

> **Basic Facilities.** «A character's Bastion starts with two free basic facilities, which the
> character's player chooses from the Basic Facilities list below. One of the chosen facilities is
> Cramped, and the other is Roomy.» + таблиці «Adding Basic Facilities» (Cramped 500 GP / 20 днів,
> Roomy 1 000 GP / 45 днів, Vast 3 000 GP / 125 днів) і «Enlarging Basic Facilities»
> (Cramped→Roomy 500 GP / 25 днів, Roomy→Vast 2 000 GP / 80 днів).

> **Special Facilities.** «A character's Bastion initially has two special facilities of the
> character's choice for which they qualify. Each special facility can be chosen only once unless
> its description says otherwise. … At level 9, a character gains two additional special facilities
> …; they gain one additional facility at level 13 and another at level 17. … **Each time a
> character gains a level, that character can replace one of their Bastion's special facilities
> with another for which the character qualifies.**» Таблиця: 5 → 2, 9 → 4, 13 → 5, 17 → 6.

> **Orders.** «The Maintain order is unusual; it is issued to the whole Bastion rather than to one
> or more special facilities. … Issuing this order prohibits other orders from being issued to the
> Bastion on the current Bastion turn.»

> **Gaining a Bastion / Bastion Turns.** «characters acquire their Bastions when they reach
> level 5»; «By default, a Bastion turn occurs every 7 days of in-game time».

Референс власника, `docs/o18-2024-character-parity/reference-2024.md:571` та §13:
«Під час level-up ти також можеш замінювати Special Facilities»; стан бастіону перелічений як
`Basic Facilities / Special Facilities / Hirelings / Defenders / Current Orders / Bastion Turns`.

---

## Знахідки

### L14-bastions-01 · Базових приміщень немає як поняття: два безкоштовні (тісне + просторе) не видаються й не підказуються — P2

**Правило.** «A character's Bastion starts with two free basic facilities … One of the chosen
facilities is Cramped, and the other is Roomy» (book-xdmg.json, розділ 8, «Basic Facilities»).

**Що є.** `createBastion` (`src/server/db/bastions.ts:99-115`) створює рядок `pers_bastion` і
повертає `{ ...toBastionRecord(row), facilities: [], turns: [] }` — порожній бастіон. У чистих
правилах `src/rules/bastions.ts` є лише `SPECIAL_FACILITY_LIMITS`; жодної функції, константи чи
підказки про базові приміщення в модулі немає (`grep -n "basic" src/rules/bastions.ts` — нуль
збігів поза `facilityType === "special"`). Лічильник на сторінці рахує тільки спеціальні:
`BastionPageClient.tsx:316` — `Спеціальних: {usage.used} / {usage.limit}`.

**Що бачить гравець.** Створив бастіон → «Приміщень ще немає — додайте перше з каталогу»
(`BastionPageClient.tsx:328`). Каталог у режимі пікера пропонує всі 6 базових приміщень з трьома
розмірами на вибір і кнопкою «Додати» без будь-якої різниці з платними — ані «два безкоштовні»,
ані «одне тісне, одне просторе», ані вартості 500/1 000/3 000 зм і 20/45/125 днів.
Скріншот каталогу: `scratchpad/audit/shots/L14-bastions-0-catalog.png` (вкладка «Базові», 6
приміщень, у кожного «Тісне / Просторе / Розлоге»).

**Чому це не «Р26 — підказка, а не замок».** Р26 знімає *заборони*, а не *підказки*: у модулі
вже є підказка про ліміт спеціальних, про непройдену передумову, про наказ поза каталогом і про
очікувану кількість найманців. Тут немає навіть підказки — правило просто відсутнє.

**Файли.** `src/rules/bastions.ts`, `src/server/db/bastions.ts`,
`src/app/char/[id]/bastion/BastionPageClient.tsx`, `src/components/bastions/BastionsClient.tsx`.

---

### L14-bastions-02 · Розмір приміщення не змінюється після додавання; «збільшення» = видалити й додати заново, з утратою наказу, захисників, найманців і нотаток — P2

**Правило.** «Enlarging Basic Facilities … increase the space of a basic facility … by one
category» (Cramped→Roomy 500 GP / 25 днів, Roomy→Vast 2 000 GP / 80 днів) і, для спеціальних,
«A special facility can be enlarged to grant additional benefits if its description says so».

**Що є.** `space` пишеться один раз у `addBastionFacility`
(`src/server/db/bastions.ts:342-354`) і більше ніде не оновлюється:
`updateBastionFacilityState` приймає рівно `{ facilityId, currentOrder, defenders, hirelings,
notes }` (`src/server/db/bastions.ts:300-322`), серверна дія `saveFacilityState`
(`src/lib/actions/bastion-actions.ts:150-186`) — те саме. У формі стану
(`BastionPageClient.tsx:392-500`) поля розміру немає взагалі; розмір тільки читається
(`{bastionSpaceTranslations[view.space]}`, рядок 371).

**Наслідок.** 13 приміщень каталогу мають більше одного розміру
(перевірено скриптом по `src/lib/generated/bastions.json`: 6 базових + barrack, workshop, garden,
stable, archive, museum, pub). Обравши не той розмір або збільшивши приміщення за столом, гравець
мусить `removeFacility` → `addFacility`, а `removeBastionFacility` робить `delete` рядка
(`src/server/db/bastions.ts:356-358`) — разом із наказом, кількістю захисників, іменами найманців
і нотатками, які KR19.4 навмисно завів.

---

### L14-bastions-03 · Підвищення рівня нічого не знає про бастіон: ані «на 9-му ти дістав ще два спеціальні», ані права замінити одне приміщення — P2

**Правило.** «Each new special facility immediately becomes part of the character's Bastion when
the character reaches the level» і «**Each time a character gains a level, that character can
replace one of their Bastion's special facilities** with another for which the character
qualifies». Референс власника, §11: «Під час level-up ти також можеш замінювати Special
Facilities».

**Що є.** `grep -rli "bastion" src/lib/components/levelUp/` — **порожньо**. Майстер підвищення
рівня (кроки path, summary, subclass, class-choices, subclass-choices, asi, feat-choices,
infusions, weapon-mastery, skills, expertise, languages, optional-features, replacements, hp,
confirm) бастіону не згадує. Крок `replacements` існує — але для класових виборів, не для
приміщень.

**Наслідок.** Персонаж, що дійшов до 9-го рівня, ніде не дізнається, що ліміт виріс з 2 до 4
(лічильник на сторінці бастіону просто мовчки стане `2 / 4`), а право замінити приміщення
не реалізоване й не підказане ніде — заміна фізично можлива лише як видалення (див.
L14-bastions-02, з тією ж утратою стану).

---

### L14-bastions-04 · Копія персонажа (і «зберегти собі» з шеринга, і копія теки) втрачає бастіон повністю — P2

**Що є.** `PERS_DUPLICATION_INCLUDE` (`src/lib/logic/pers-duplication.ts:3-26`) перелічує 21
звʼязок — skills, persSpells, features, feats, weapons, pers_weapon_mastery, armors, multiclasses,
magicItems, persInfusions, race, class, subclass, background, raceVariants, raceChoiceOptions,
choiceOptions, classOptionalFeatures, spells. **`bastion` серед них немає**, і
`clonePersWithRelations` (там само, рядок 33) бастіон не створює: `grep -n "astion"
src/lib/logic/pers-duplication.ts` — нуль збігів.

Цей самий `include` живить три шляхи:
`duplicatePers` (`src/server/db/pers-actions.ts:217-233`), копію теки
(`src/server/db/pers-actions.ts:415-436`) і «зберегти собі» з поширеної теки
(`src/server/db/share-actions.ts:610-622`).

**Наслідок.** Гравець, що робить копію персонажа, щоб спробувати іншу гілку розвитку, дістає
персонажа без бастіону — без назви, антуражу, приміщень, наказів, найманців, нотаток і всього
журналу ходів. Повідомлення про це немає.

---

### L14-bastions-05 · Дубль спеціального приміщення додається без жодної підказки, хоча пікер уже має список уже доданих — P3

**Правило.** «Each special facility can be chosen only once unless its description says
otherwise.»

**Що є.** `addFacility` (`src/lib/actions/bastion-actions.ts:106-129`) перевіряє лише наявність
слаґа в каталозі й дозволеність розміру. У клієнті пікера
(`src/components/bastions/BastionsClient.tsx:262-266`) кнопка `BastionAddFacility` малюється для
кожного приміщення без перевірки, чи воно вже додане, — при тому що `picker.facilityViews`
(перелік уже доданих із слаґами) **уже приїхав у клієнт** і використовується лише в
`BastionPageClient`. Тобто дані для підказки на місці, підказки немає.

За Р26 блокувати не треба — але тут навіть напису «вже є в бастіоні» немає, і гравець без
підказки дублює приміщення, після чого лічильник «Спеціальних: 3 / 2» звинувачує його в
перевищенні ліміту, не пояснюючи причини.

---

### L14-bastions-06 · Правил бастіону в застосунку немає взагалі: розділ 8 DMG 2024 не входить у корпус правил — P2

**Що є.** `grep -c "астіон" src/lib/generated/rules-2024.json` → **0**;
`src/lib/generated/rules-2014.json` → **0**; `src/lib/generated/rules-beyond-srd.json` → **5**, і
всі пʼять — побіжні згадки з інших розділів («У розділі 8 є правила, які дозволяють персонажам
гравців будувати…», «Якщо мертві персонажі мають Бастіони (див. розділ 8)…», абзац про укріплення).
Самого розділу — «Gaining a Bastion», «Bastion Turns» (раз на 7 ігрових днів), «Bastion Map» і
«Facility Space» (4/16/36 клітин), «Basic Facilities» з двома таблицями вартості, «Special
Facilities» з таблицею 5/9/13/17 і правилом заміни, описи семи наказів, «Bastion Events» — у
корпусі немає.

**Наслідок.** Каталог `/2024/bastions` пояснює окремі приміщення, але **систему** не пояснює
ніде. Гравець, який відкрив сторінку бастіону вперше, не має в застосунку жодного тексту про те,
коли бастіон здобувається, як часто буває хід, що таке наказ і скільки коштує базове приміщення.
Черга O23 («до релізу») покриває глави 1–3 DMG 2024 — розділ 8 не належить жодній черзі.

---

### L14-bastions-07 · Бастіон невидимий у поширеному листі, у знімку й у друці — P3

**Що є.** `src/lib/components/characterSheet/slides/FeaturesSlide.tsx:159-161`:

```
setBastionEntry(null);
if (isReadOnly || pers.ruleset !== "RULES_2024") return;
```

`grep -rli "bastion" src/server/pdf/ src/server/db/print-content.ts src/server/db/snapshots.ts
src/server/db/share-actions.ts src/lib/actions/snapshot-actions.ts` — **порожньо**.

**Наслідок.** Партія, якій гравець кинув посилання на персонажа, і майстер, який дивиться на лист
у режимі перегляду, бастіону не бачать — хоча саме «одне місце, де видно бастіон» є формулюванням
мети O19. Для PDF це рішення записане в README O19 («у карусель листа шостим слайдом не йде»), для
шерингу — лише коментарем у коді, рішення власника немає.

---

### L14-bastions-08 · Наказ «Утримання» за книгою віддається всьому бастіону, а в застосунку — окремому приміщенню; бастіон-рівневого наказу немає — P3

**Правило.** «The Maintain order is unusual; it is issued to the whole Bastion rather than to one
or more special facilities. … Issuing this order prohibits other orders from being issued to the
Bastion on the current Bastion turn.»

**Що є.** `findAllowedOrderCodes` (`src/lib/bastion-facility.ts:29-34`) додає `MAINTAIN` до
дозволених наказів **кожного** приміщення, включно з базовими; `pers_bastion` колонки наказу не
має взагалі (перевірено в `spells_test`: `pers_bastion` = `pers_bastion_id, pers_id, name,
description, notes, created_at, updated_at`). Тобто «цього ходу весь бастіон на Утриманні»
записується або сімома однаковими наказами, або вільним текстом у журналі.

Коментар у коді формулює це як свідоме («MAINTAIN не належить жодному приміщенню в корпусі
5etools — це загальне “нічого особливого цей хід”»), але книга каже інше: це наказ бастіону, і він
забороняє решту наказів на цей хід.

---

### L14-bastions-09 · Персонаж 4-го рівня бастіон «створює з попередженням», але дійти до сторінки може лише вгадавши URL — P3

**Що є.** `findBastionAccess` (`src/rules/bastions.ts:24-38`):
`isEntryCardShown: isOffered && (input.hasBastion || !input.isBelowStandardLevel)`. Картка входу
на слайді фіч зʼявляється лише з 5-го рівня (тест `tests/rules/bastion-access.test.ts:26` це
фіксує як бажану поведінку). Сторінка `/char/[id]/bastion` для 4-го рівня відкривається й дає
попередження — але потрапити на неї з інтерфейсу нічим.

Це не суперечність із Р26 (там ідеться про валідацію, не про вхід), але робить прописану в Р26
можливість недосяжною для того, хто не набирає URL руками. Питання власника, а не баг.

---

### L14-bastions-10 · Рядок приміщення на сторінці бастіону не каже, базове воно чи спеціальне — P3

`BastionFacilityView` несе `match.isSpecial` (`src/server/db/bastions.ts:214`,
`src/rules/bastions.ts:141`), але `BastionFacilityRow`
(`src/app/char/[id]/bastion/BastionPageClient.tsx:350-390`) малює лише назву, розмір і значок
відповідності. Гравець із 2 спеціальними й 2 базовими бачить чотири однакові рядки й лічильник
«Спеціальних: 2 / 2», який очима не звіряється.

---

## Перевірено й правильно

- **Гейт 5-го рівня — за рівнем персонажа, не класу.** `findBastionStanding` бере `pers.level`
  (`src/server/db/bastions.ts:127-131`), а `pers.level` у цій схемі — сумарний рівень персонажа
  (мультиклас віднімається `findMainClassLevel`). Це те, чого вимагає референс §11 («Bastion теж
  повинен реагувати саме на character level»).
- **Ліміти 2/4/5/6 на 5/9/13/17** — `SPECIAL_FACILITY_LIMITS` у `src/rules/bastions.ts:43-48`
  збігається з таблицею «Special Facility Acquisition» книги дослівно. Базові в ліміт не входять
  (`countSpecialFacilities` фільтрує `facilityType === "special"`).
- **Каталог: 61 приміщення, кількість і назви збігаються з книгою.** Звірка скриптом:
  `data/5etools/raw/bastions.json` = 61 (55 special + 6 basic); нормалізований і згенерований
  каталоги — теж 61, жодної назви не загублено й не додано. Ядро DMG 2024 — 35 записів
  (29 спеціальних + 6 базових); перелік із 29 назв секції «Special Facility Descriptions» книги
  збігається з каталогом **точно** (`in book not in catalog: []`, `in catalog not in book: []`).
  Базові — рівно шість із книги: Bedroom, Courtyard, Dining Room, Kitchen, Parlor, Storage.
- **Передумови збережені виразом і нічого не втратили.** 25 приміщень мають передумову і в
  дзеркалі, і в нормалізованому файлі; 33 вимоги розкладені як
  membership 8 / spellcastingFocus 17 / renown 4 / expertise 1 / skillProficiency 1 / feature 2 —
  саме ті 33, про які говорить Р26. Форми `allOf`(груп)→`or`(вимог) відповідають сирим
  `{"spellcastingFocus":["arcane","tool"]}`, `{"expertise":[{"skill":true}]}`,
  `{"proficiency":[{"skill":["medicine"]}]}`, `otherSummary` → `feature`.
- **Третій стан «залежить від кампанії» реалізований** (`findRequirementStatus`, membership і
  renown → `campaign`), і провалена перевірна вимога важить більше за незнану
  (`findPrerequisiteStatus`: `unmet` > `campaign`).
- **Профіль передумов збирається з усіх класів мультикласу.** `findBastionCharacterProfile`
  (`src/server/db/bastions.ts:158-206`) читає `class`, `subclass` і **всі** `multiclasses`, бере
  фічі за `levelGranted <= classLevel` окремо для кожного класу і зводить фокуси в множину.
  Ключі збігаються з базою: перевірено в `spells_test`, що 2024-класи звуться `BARD_2024`…
  `ARTIFICER_2024` (як у `CLASS_FOCUSES`), навички — enum `Skills` з `MEDICINE` (як дає
  `toBastionSkillKey("medicine")`), а фічі Штабної кімнати існують саме як
  `Fighter: Fighting Style (2024)`, `Paladin: Fighting Style (2024)`,
  `Ranger: Fighting Style (2024)`, `Barbarian: Unarmored Defense (2024)`,
  `Monk: Unarmored Defense (2024)` — усі пʼять зводяться `toBastionFeatureKey` правильно.
- **Сім наказів** — `BastionOrder` в базі має рівно CRAFT, EMPOWER, HARVEST, MAINTAIN, RECRUIT,
  RESEARCH, TRADE, і `bastionOrderTranslations` перекладає всі сім. Розміри — CRAMPED/ROOMY/VAST.
- **Схема й каскади.** `pers_bastion.pers_id` має унікальний індекс (`pers_bastion_pers_id_key`),
  FK на `pers` з `ON DELETE CASCADE`; приміщення й ходи каскадять від бастіону; CHECK
  `defenders >= 0` і `turn_number >= 1` є, і серверні дії ловлять їх людською помилкою до бази
  (`readFacilityDefenders`, `readTurnInput`).
- **Ізоляція за редакцією.** `findBastionAccess` дає `isOffered` лише для `RULES_2024`; сторінка
  `src/app/char/[id]/bastion/page.tsx:16` робить `notFound()`, якщо не запропоновано;
  `createBastionForPers` і `loadBastionPicker` відмовляють словами «Бастіони — механіка правил
  2024»; картка на слайді фіч не малюється для 2014. Каталог `/2024/bastions` живе тільки в
  розділі 2024 (гейт `tests/content/bastions-catalog.test.ts`).
- **Доступ.** Усі дії проходять `findAccessibleStanding` → `auth()` → `canEditPers`; кожна дія над
  приміщенням/записом журналу окремо перевіряє належність бастіону персонажа.
- **Каталог у браузері живий.** `http://127.0.0.1:3100/2024/bastions` рендериться без жодної
  помилки в консолі; вкладки «Усі / Базові / 5 / 9 / 13 / 17 рівень», картка деталей.
  Скріншот: `scratchpad/audit/shots/L14-bastions-0-catalog.png`.
- **Журнал ходів** відповідає Р26: номер — підказка (`findNextTurnNumber` = max + 1, а не
  кількість), редагується, прогалини й повтори приймаються, порожній запис — ні.

## Що не перевірено

- **Браузерний прохід по самій сторінці `/char/[id]/bastion`** (створити бастіон → додати
  приміщення → зробити хід) — не зроблено. Причина не в модулі: `spells_test` весь час аудиту
  тримала паралельна сесія інтеграційних тестів (замок `TMPDIR/spells-test-db.lock`,
  pid 20905 → 20291 → 31028). Три прогони програмного зборщика персонажа
  (`scratchpad/audit/work/L14-bastions/bastion.probe.ts` — фікстура
  `03-high-elf-wizard-sage` до 5-го рівня, далі `createBastionForPers` → `addFacility` ×6 →
  `saveFacilityState` → `addTurn` → `duplicatePers`) простояли в черзі 6, 10 і 5+ хвилин;
  перший ще й упав на не заданому `DATABASE_URL`, другий — на тому, що `vi.mock("next/cache")`
  з файлу поза коренем репозиторію не перехоплює `revalidatePath` у
  `src/server/db/character-creation.ts:1088` (обійдено аліасами в
  `work/L14-bastions/vitest.bastion.mts`, але прогін так і не дочекався бази).
  **Усі знахідки вище доведені кодом, файлами оракула або запитом до `spells_test`** — браузер тут
  був би підтвердженням, а не джерелом. Готовий скрипт браузерної перевірки лежить у
  `work/L14-bastions/browse.mjs` і працює одразу, щойно база звільниться.
- **Каталог у браузері перевірено** (`work/L14-bastions/catalog.mjs`,
  `shots/L14-bastions-0-catalog.png`) — сторінка `/2024/bastions` рендериться без помилок.
- **Bastion Events** (таблиця подій розділу 8) — свідомо поза O19 («свідомо не робимо»), не
  перевірялося як дефект.
