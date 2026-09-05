# L19 — Паритет із зрілими білдерами

Лінза: не «чи правильно порахований персонаж», а «чи є можливість, яку гравець уже має
в D&D Beyond / Roll20 Charactermancer / Foundry dnd5e / Dungeon Master's Vault».
Дата: 2026-09-04. Сервер :3100, база `spells_test`.

## Як перевірялося

1. Інвентар можливостей конкурентів зібрано WebSearch по D&D Beyond (Character Builder + sheet,
   2024), Foundry VTT `dnd5e` + модуль **Character Builder (DnD 5e — 2024)**, Roll20 Homebrew
   Character Builder, Dungeon Master's Vault / Pathbuilder.
2. Для кожного рядка — перевірка в цьому продукті: `grep` по `src/`, `prisma/schema.prisma`,
   запит до `spells_test`, і живий лист персонажа в браузері.
3. Персонажі зібрані програмно через `tests/helpers/build-2024-character.ts` із фікстур
   `tests/fixtures/2024-acceptance` (власний vitest-конфіг у
   `work/L19-parity-competitors/vitest.audit.config.mts`, у репозиторій нічого не писалося).
   Створено `pers_id=3` (High Elf Wizard, RULES_2024) і `pers_id=4` (Red Dragonborn Fighter,
   RULES_2024) під користувачем `l19-parity-competitors@holota.family`.
   Обидва лишилися на рівні 1: підвищення рівня в моєму прогоні падало на
   `Invariant: static generation store missing in revalidatePath` — це артефакт мого конфігу
   (мок `next/cache` не підхопився для файлу поза `tests/`), **не** дефект продукту.
4. Лист відкрито в браузері (`work/L19-parity-competitors/sheet.mjs`), текст збережено в
   `work/L19-parity-competitors/sheet-text.txt`, скріншот `shots/L19-1-sheet-main.png`.
   `pageerror` і `console.error` — порожні.

## Матриця можливостей

| Можливість (є в DDB/Foundry/Roll20/DMV) | Тут | Де в коді |
|---|---|---|
| Покроковий конструктор із поясненням передумов | **yes** | `creation-step-resolver.ts`; `FeatPicker.tsx:87`, `ClassChoiceOptionGroups.tsx:148` показують причину невиконаної передумови |
| Обидва набори правил (2014 / 2024) | **yes** | `Pers.ruleset`, маршрути `/char/create` і `/2024/char` |
| Фільтр джерел/книг для персонажа | **no** | джерело лише як бейдж (`SourceBadge.tsx`), фільтра немає ніде |
| Homebrew: власні заклинання/риси/предмети/фічі | **no** | у `Spell`, `Feat`, `MagicItem`, `Race`, `Class` немає `user_id` |
| Homebrew: вільний текст | partial | `Pers.customFeatures / customEquipment / customProficiencies / raceCustom / classCustom / customBackground` |
| Override будь-якого числа | **yes** | `ModifyStatModal.tsx` + `Pers.statBonuses/acbonuses/…/override_base_ac`, `updateMaxHp` |
| Видиме джерело кожної **фічі** | **yes** | лист малює бейдж КЛАС / РАСА / РИСА (`sheet-text.txt`, слайд «Головна») |
| Видиме джерело кожного **числа** («звідки +2») | **no** | `bonus-calculator.ts` повертає скаляри; `pers.str` зберігає вже згорнуте значення |
| Заклинання: підготувати/зняти, слоти, ритуал | **yes** | `MagicSlide.tsx`, `spell-slots.ts`, мітка «Ритуал» у `SpellListGroup.tsx:290` |
| Каст вищим слотом (upcast) | **no** | слот витрачається окремим кліком по «комірці» (`MagicSlide.tsx:756`), звʼязку зі заклинанням немає |
| Концентрація | **no** | у `src/` немає жодного трекера; `hasConcentration` існує лише як прапорець каталогу |
| Економіка дій: групування фіч по дії/бонусній/реакції | **yes** | `FeaturesSlide.tsx:312-313`, лист показує «ОСНОВНА ДІЯ / БОНУСНА ДІЯ / РЕАКЦІЯ / ПАСИВНІ» |
| Економіка дій: базові дії (Ривок, Ухилення, Відхід, Допомога, Захват…) | **no** | у лічильнику лише фічі персонажа; у чарівника 1 рівня «ОСНОВНА ДІЯ [0]» |
| Ресурси з відновленням | **yes** | `PersResourcePool`, `feature-uses.ts`, `rest-actions.ts`, `ShortRestDialog.tsx` |
| Хіт-дайси | **yes** | `HitDiceDialog.tsx`, `Pers.currenthitdice/usedhitdice` |
| Ряткидки смерті | **yes** | `Pers.death_save_successes/failures`, `MainStatsSlide.tsx:750`, скидаються відпочинком (`RestButton.tsx:73`) |
| Стани (14 станів) / Виснаження | **no** | ніде в `src/` |
| Натхнення (Heroic Inspiration) | **no** | ніде в `src/`; збіг «bardic_inspiration_die» — інша сутність |
| Інвентар: предмети з кількістю, вагою, контейнерами | **no** | `Pers.custom_equipment` — один текстовий рядок; у схемі взагалі немає стовпця `weight` |
| Навантаження / вантажопідйомність | **no** | немає ваги — рахувати нема з чого |
| Монети (мп/зп/ем/ср/мідь) | **yes** | `Pers.cp/sp/ep/gp/pp`, редагуються на листі (`MainStatsSlide.tsx:283-287`) |
| Магічні предмети: налаштування (attunement) | partial | `PersMagicItem.is_attuned` є, ліміт «не більше трьох» **не перевіряється** |
| Зброя з властивостями й майстерністю | **yes** | `PersWeapon`, `pers_weapon_mastery`, `WeaponMasteryCard.tsx`, `WeaponCustomizeModal.tsx` |
| Кидки кубиків 3D | partial | `@3d-dice/dice-box` змонтований глобально (`layout.tsx:109`), але кидати можна лише зі зброї (`WeaponsCard.tsx:61`) і з загальної шухляди (`Navigation.tsx:222`) |
| Дика форма | **yes** | `PersWildshape`, `WildshapeCard.tsx`, `beast-form.ts` |
| Компаньйони / фамільяри / звір слідопита / примари | **no** | у `src/` немає жодної згадки |
| Мультиклас | **yes** (з поясненням — partial) | `LevelUpWizard.tsx:2063` — недоступні класи **ховаються**, а не показуються з причиною |
| Респек / зниження рівня / зміна підкласу | **no** | `activateSnapshot` існує, але з UI не викликається жодного разу |
| Історія змін (снапшоти) | partial | знімок робиться автоматично перед кожним підвищенням (`levelup-persistence.ts:1095`), але з `SnapshotHistoryModal.tsx` доступні лише «Переглянути» і «Копіювати» |
| Створення персонажа одразу N рівня | **no** | у `persCreateSchema` немає поля рівня; завжди 1 |
| Генерація характеристик: point buy / масив / ручний ввід | **yes** | `asi-fields.ts` — `POINT_BUY`, `SIMPLE`, `CUSTOM` |
| Генерація характеристик: кидок 4к6 | **no** | немає |
| XP → рівень | **no** | `Pers.xp` є, таблиці XP і підказки «час підвищитися» немає |
| Друк / PDF | **yes** | `PrintCharacterDialog.tsx`, `src/server/pdf/generateCharacterPdf.ts` |
| Експорт/імпорт JSON | **no** | немає ні дії, ні маршруту |
| Теки, спільний доступ із правами | **yes** | `PersFolder`, `PersFolderMember.can_edit`, `PersShareToken.can_edit`, `PersAdditionalUser` |
| Нотатки / біографія / ідеали / звʼязки / вади | **yes** | `Pers.notes/backstory/personality_traits/ideals/bonds/flaws` |
| Портрет персонажа | **no** | у `Pers` немає стовпця зображення |
| Офлайн | partial | `/offline` + `pers_offline_operation`; офлайн правляться лише 16 текстових полів (`src/lib/offline/operations.ts:1`) |
| Мобільний лист | **yes** | слайдова карусель `CharacterCarousel.tsx` |

## Знахідки

### L19-parity-competitors-01 — вибір при підвищенні рівня неможливо переграти
`activateSnapshot` (`src/lib/actions/snapshot-actions.ts:34`) відновлює персонажа зі знімка, і
знімок робиться автоматично перед кожним підвищенням
(`src/server/db/levelup-persistence.ts:1094-1095`). Але виклику цієї дії в UI **немає**:
`grep -rn "activateSnapshot" src/ --include=*.tsx` порожній, а `SnapshotHistoryModal.tsx` (162
рядки) пропонує тільки «Переглянути» (`:135`) і `handleCopy` (`:144`). Respec, зниження рівня і
зміна підкласу теж відсутні (`grep -rni "respec\|changeSubclass\|levelDown" src/` — нічого).
DDB має «Manage → Remove Level» і повний respec; Foundry дає видалити клас-айтем; DMV
перебудовує будь-який рівень.
**Наслідок:** помилковий вибір ASI/риси/підкласу лікується лише створенням персонажа з нуля —
із втратою посилань шеринга і `pers_id`.

### L19-parity-competitors-02 — персонажа не можна створити одразу потрібним рівнем
`src/lib/zod/schemas/persCreateSchema.ts` не має поля рівня для створення (є лише
`levelUp*`-поля, `:301-306`); `Pers.level` має `@default(1)`. Обидва зібрані мною персонажі —
рівня 1. Гравець, що приєднується до кампанії 5 рівня, мусить пройти майстра підвищення чотири
рази. DDB, Roll20 Charactermancer, Foundry Character Builder і DMV дають ввести цільовий рівень
одразу.

### L19-parity-competitors-03 — станів і виснаження на листі немає
`data/2024/srd/rules-glossary.md:774-784`: «_D20 Tests Affected._ When you make a D20 Test, the
roll is reduced by 2 times your Exhaustion level. _Speed Reduced._ … 5 times your Exhaustion
level.» У `src/` немає ані сховища, ані UI: `grep -rni "виснаж\|exhaustion" src/` дає лише
довідковий текст `rulesData.ts` і `refs/weapon-mastery.ts`. Так само немає жодного з 14 станів.
Персонаж на листі не може бути отруєним, приголомшеним чи виснаженим — усі похідні числа завжди
рахуються «як здоровий».

### L19-parity-competitors-04 — Натхнення (Heroic Inspiration) ніде не існує
`data/2024/srd/rules-glossary.md:865-869`: «If you (a player character) have Heroic Inspiration,
you can expend it to reroll any die». У 2024 це базовий і частий ресурс. `grep -rni
"натхнен\|inspiration" src/` поза довідкою знаходить лише `bardic_inspiration_die` у
`ClassInfoModal.tsx:65` — це кістка барда, не Натхнення. Стовпця в `Pers` немає.
DDB і Foundry мають перемикач Inspiration на листі.

### L19-parity-competitors-05 — концентрації немає
`hasConcentration` існує тільки як прапорець каталогу (`src/app/spells/spells-client.tsx:81`).
На листі персонажа немає ні позначки «зараз концентруюсь на …», ні нагадування, що друге
заклинання з концентрацією скасовує перше. DDB показує активну концентрацію в рядку заклинання;
Foundry вішає ефект.

### L19-parity-competitors-06 — інвентар це текстове поле, ваги немає в схемі взагалі
Стартове спорядження записується рядками у `Pers.custom_equipment`
(`src/server/db/character-creation.ts:539-547,800`). Виміряно на `pers_id=3`:
`"Посох x1\nКаліграфічний набір x1\n…\nМантія x1\n…\nМантія x1\n…"` — 17 рядків тексту,
з дублями. `grep -n "weight" prisma/schema.prisma` — **жодного збігу**: ваги немає ні в
`Weapon`, ні в `Armor`, ні в `MagicItem`. Отже неможливі: кількість як число, продати/викинути
предмет, контейнери (рюкзак/сумка вимірів), «споряджено/у рюкзаку», і навантаження
(`data/2024/srd/rules-glossary.md:381-385` — Carrying Capacity). DDB має повний інвентар з
контейнерами й вагою, Foundry — теж, DMV — теж.

### L19-parity-competitors-07 — ліміт налаштувань (3 предмети) не перевіряється
`data/2024/srd/equipment.md:2161`: «You can be attuned to no more than three magic items at a
time. Any attempt to attune to a fourth item fails». `PersMagicItem.is_attuned` перемикається
в `CombatSlide.tsx:83` без жодної перевірки кількості; `grep` по `src/lib/actions`,
`src/server/db`, `src/rules` не знаходить підрахунку налаштованих. Персонажа можна налаштувати
на десять предметів. Правило ще й рухоме — `data/2024/srd/classes.md:7161` (Rogue 13, Use Magic
Device) піднімає межу до чотирьох, тобто потрібне не константне «3», а число з фіч.

### L19-parity-competitors-08 — власного контенту (homebrew) немає
Жодна контентна таблиця не має власника: `grep -n "user_id" prisma/schema.prisma` дає лише
`account`, `user`, `pers*`, `pers_folder*`, `pers_offline_operation`, `problem_report`. Тобто
гравець не може додати ні заклинання, ні рису, ні предмет, ні фічу, ні підклас — тільки вписати
вільний текст у `customFeatures`/`customEquipment`, який не бере участі в жодному обчисленні.
DDB (Homebrew Collection, працює як ще одне джерело в конструкторі), Roll20 Homebrew Character
Builder, Foundry (будь-який Item) і DMV (homebrew class creation) це вміють.

### L19-parity-competitors-09 — немає фільтра джерел/книг
Джерело показується як бейдж (`SourceBadge.tsx`, `RacesForm.tsx:205`, акордеон «Інші джерела»
`RacesForm.tsx:230`), але вибрати «тільки Книга Гравця» або «без Tasha's» не можна — жодного
`sourceFilter`/`allowedSources` у `src/`. Стіл, що грає рівно по PHB, і стіл, що дозволив усе,
бачать той самий список. DDB дає перемикати доступні джерела на персонажі; Foundry — вмикати
компендіуми; Roll20 — вибирати книги в Charactermancer.

### L19-parity-competitors-10 — жодне число на листі не пояснює, звідки воно
Усі функції `src/lib/logic/bonus-calculator.ts` повертають скаляр:
`calculateFinalStat(pers, ability) { return getBaseStat(pers, ability) + getStatBonus(pers,
ability); }` (`:245-247`). Внески за джерелами не зберігаються взагалі: базова характеристика
згорнута в `Pers.str/dex/…` ще на створенні, тож «+2 від походження» вже не існує як факт. У
`ModifyStatModal.tsx` гравець бачить підсумок і може додати свій бонус, але не бачить складників.
Так само КБ, ініціатива, ряткидки, СК заклинань. DDB на кожному числі дає розкладку
(«Base 10 + Dex 3 + Armor …»), Foundry показує список активних ефектів.
**Чому це не косметика:** саме розкладка дозволяє гравцеві знайти помилку самому, замість писати
в підтримку «у мене КБ не такий».

### L19-parity-competitors-11 — кубики кидаються лише зі зброї
`@3d-dice/dice-box` встановлений (`package.json:110`), змонтований глобально
(`src/app/layout.tsx:109`) і має власну шухляду (`DiceSidebar.tsx`, 14 КБ). Але контекстний
кидок є рівно один — атака зброєю: `useDiceUIStore.openWeapon` викликається тільки з
`WeaponsCard.tsx:61`; `DiceMode` має два значення — `"general" | "weapon"`
(`src/lib/stores/diceUIStore.ts:3`). Кидка з навички, ряткидка, перевірки характеристики,
атаки/шкоди заклинанням, хіт-дайса чи ряткидка смерті немає — а це найчастіші кидки за столом.
Інфраструктура вже оплачена, не використана.

### L19-parity-competitors-12 — немає ні експорту, ні імпорту JSON
`grep -rni "exportCharacter\|importCharacter\|export.*json" src/lib/actions src/app/char` —
порожньо. Є тільки PDF (`src/server/pdf/generateCharacterPdf.ts`) і посилання шеринга.
Персонаж — у чужій базі назавжди: перенести його у Foundry/Roll20 або зробити резервну копію
неможливо. Pathbuilder і DMV дають JSON, DDB — принаймні PDF + сторонні експортери.

### L19-parity-competitors-13 — компаньйонів і фамільярів немає
`grep -rni "фамільяр\|familiar\|компаньйон\|companion\|скакун\|steed" src/` — **порожньо**.
Дика форма реалізована окремим шаром (`PersWildshape`, `beast-form.ts`), але другої істоти,
привʼязаної до персонажа, система не знає. Це виключає Find Familiar, Beast Master (Primal
Companion), Find Steed, Ranger's beast, а в 2024 ще й `Summon *` заклинання. DDB має «Extras» —
окремі листи істот під персонажем; Foundry — окремих акторів.

### L19-parity-competitors-14 — «накласти вищим слотом» не існує як дія
Слот витрачається окремим кліком по комірці рівня (`MagicSlide.tsx:756` →
`spendSpellSlot(persId, level)`), незалежно від того, яке заклинання накладається. Тобто гравець
сам мусить памʼятати, що Magic Missile на 3 колі — це три снаряди, і сам обрати правильну
комірку. DDB і Foundry дають «Cast at level N» просто зі заклинання й показують оновлений ефект.

### L19-parity-competitors-15 — недоступні для мультикласу класи ховаються без пояснення
`LevelUpWizard.tsx:2063`: «Показано лише класи, для яких виконані вимоги мультикласу»,
а якщо не підходить жоден — `:2095` «Немає доступних класів для мультикласу (перевірте вимоги
13+)». Гравець не бачить, якої саме характеристики і скільки бракує для конкретного класу.
На кроці рис це вже зроблено правильно (`FeatPicker.tsx:87-89` показує причину), тобто патерн у
кодовій базі є — мультиклас його не використовує.

### L19-parity-competitors-16 — портрета персонажа немає
У `model Pers` немає стовпця зображення (перевірено повним текстом моделі); у
`src/lib/components/characterSheet` немає `portrait|avatar|imageUrl`. DDB, Roll20 і DMV дають
завантажити або вибрати аватар — це найпомітніша річ на чужому листі.

## Перевірено й правильно (паритет тримається)

- **Передумови пояснені.** `FeatPicker.tsx:87-89` і `ClassChoiceOptionGroups.tsx:148-150`
  показують текст причини, чому опція недоступна, а не просто гасять кнопку.
- **Джерело кожної фічі видно на листі.** У слайді «Головна» кожна фіча має бейдж
  КЛАС / РАСА / РИСА (`sheet-text.txt`); фічі згруповані за типом дії
  (`FeaturesSlide.tsx:312-313`): ОСНОВНА ДІЯ / БОНУСНА ДІЯ / РЕАКЦІЯ / ПАСИВНІ.
- **Override будь-якого числа.** `ModifyStatModal.tsx` перекриває характеристику (BONUS/BASE),
  модифікатор, ряткидок, навичку з рівнем володіння, а `updateBaseACOverride` і `updateMaxHp` —
  базовий КБ і максимум хітів. Це ширше, ніж у Roll20 Charactermancer.
- **Три системи розподілу характеристик** — `POINT_BUY`, `SIMPLE`, `CUSTOM`
  (`asi-fields.ts:21-31`), плюс перемикач правил Таші (`ASIForm.tsx:799`).
- **Гроші всіх пʼяти номіналів** редагуються на листі й переживають офлайн
  (`operations.ts:12-16`).
- **Ряткидки смерті** зберігаються в базі й скидаються відпочинком (`RestButton.tsx:73-74`).
- **Ресурси з відновленням, короткий і довгий відпочинок, хіт-дайси** — повний набір
  (`PersResourcePool`, `ShortRestDialog.tsx`, `HitDiceDialog.tsx`, `rest-actions.ts`).
- **Шеринг із правами й теки.** `PersShareToken.can_edit`, `PersFolderMember.can_edit`,
  `PersFolderShareToken.can_edit`, `PersAdditionalUser` — рівень «кампанії/групи» тут насправді
  сильніший, ніж у DMV, і зіставний із DDB Campaigns.
- **Автоматичний знімок перед кожним підвищенням рівня** (`levelup-persistence.ts:1094-1095`) —
  дані для відкату вже збираються; бракує тільки кнопки (див. знахідку 01).
- **Друк/PDF персонажа** працює (`PrintCharacterDialog.tsx`, `src/server/pdf/`).
- **Мобільний лист** зроблено слайдовою каруселлю, а не масштабованою десктопною сіткою.
- **Ритуал позначається** у списку заклинань (`SpellListGroup.tsx:287-290`), і є перемикач
  «не враховувати у кількості підготовлених» (`MagicSlide.tsx:1212`).
- Лист персонажа 2024 відкривається без жодної помилки в консолі (`pageerror` і `console.error`
  порожні на `pers_id=3`).

## Що не перевірено

- Рівні 2–20: мої персонажі лишилися на 1 через артефакт власного конфігу (мок `next/cache`),
  тож підкласові фічі, Epic Boon і поведінка листа на 5+ рівнях у цій лінзі не оглядалися.
- Друкований PDF не відкривався — оцінка «є» зроблена по коду, не по файлу.
- Офлайн-режим не перевірявся в браузері з вимкненою мережею.
