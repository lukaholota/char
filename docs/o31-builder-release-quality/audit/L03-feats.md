# L03-feats — риси 2024 (75 шт.) проти книги

Мітка: **L03-feats**. Обсяг: усі 75 рис `RULES_2024` у `src/lib/generated/creator-content-2024.json`
і в базі `spells_test`. Оракули: `data/2024/srd/feats.md` (SRD 5.2.1), сторінки PHB 2024 у
`data/2024/source/raw/feat/*.html`, `data/2024/normalized/feats.json`.

Робочі файли: `scratchpad/audit/work/L03-feats/db.mjs` (запити до `spells_test`).

## Що є в даних

| Категорія | Рис | Мають `grantsFeature` | Дають володіння (обладунок/зброя/інструмент) | Дають навички |
|---|---|---|---|---|
| ORIGIN | 10 | 10 | 0 | 1 (Skilled) |
| GENERAL | 43 | **0** | **0** | 0 |
| FIGHTING_STYLE | 10 | 10 | 0 | 0 |
| EPIC_BOON | 12 | **0** | **0** | 0 |

Запит (той самий скрипт, база `spells_test`):

```sql
select f.category, count(*) feats, count(j."B") with_feature
from feat f left join "_FeatGrantsFeature" j on j."A"=f.feat_id
where f.ruleset='RULES_2024' group by 1;
-- ORIGIN | 10 | 10
-- GENERAL | 43 | 0
-- FIGHTING_STYLE | 10 | 10
-- EPIC_BOON | 12 | 0
```

```sql
select f.eng_name, f.granted_skill_count, f.granted_armor_proficiencies,
       f.granted_weapon_proficiencies, f.granted_tool_proficiencies, f.prerequisite_proficiency
from feat f where f.ruleset='RULES_2024'
 and (f.granted_armor_proficiencies <> '{}' or f.granted_weapon_proficiencies is not null
      or f.granted_tool_proficiencies is not null or f.granted_skill_count > 0
      or f.prerequisite_proficiency is not null);
-- Heavily Armored     | 0 | {} | None | None | {'armor': ['MEDIUM']}
-- Heavy Armor Master  | 0 | {} | None | None | {'armor': ['HEAVY']}
-- Medium Armor Master | 0 | {} | None | None | {'armor': ['MEDIUM']}
-- Moderately Armored  | 0 | {} | None | None | {'armor': ['LIGHT']}
-- Shield Master       | 0 | {} | None | None | {'armor': ['SHIELD']}
-- Skilled             | 3 | {} | None | None | None
```

Тобто **жодна риса 2024 не видає володіння** — ні обладунком, ні зброєю, ні інструментом.
Рушій це вміє: `src/server/db/levelup-persistence.ts:290-294` читає
`feat.grantedArmorProficiencies / grantedToolProficiencies / grantedWeaponProficiencies`.
Порожні саме дані.

---

## Знахідки

### L03-feats-01 — усі 10 рис «Бойовий стиль» 2024 — тільки проза, жодного числа (P1)

**Правило.** `data/2024/srd/feats.md`: «Archery … you gain a **+2 bonus to attack rolls** you make
with Ranged weapons»; «Defense … you gain a **+1 bonus to Armor Class**»; Dueling (PHB 2024) — +2 до
шкоди одноручною. **Доказ (spells_test):**

```
Archery              | RULES_2014 | rng=2 | ac=None | duel=None
Defense              | RULES_2014 | rng=None | ac=1 (requires_armor=True) | duel=None
Dueling              | RULES_2014 | rng=None | ac=None | duel=2
Fighting Style: Archery (2024)  | RULES_2024 | rng=None | ac=None | duel=None
Fighting Style: Defense (2024)  | RULES_2024 | rng=None | ac=None | duel=None
Fighting Style: Dueling (2024)  | RULES_2024 | rng=None | ac=None | duel=None
... (усі 10 фіч 2024 — усі колонки NULL)
```

`src/lib/logic/bonus-calculator.ts:440` і `:471` читають саме ці колонки
(`bonusToRangedAttackRoll`, `bonusToMeleeOneHandedWeaponDamage`), і фічі від рис у пул потрапляють
(`bonus-calculator.ts:184-186`: «Feats can grant features»). Тож механізм є, значень немає.

**Очікувано.** Воїн 2024 із Archery має +2 до дальнього кидка атаки; з Defense — +1 КЗ.
**Фактично.** Лист малює ті самі числа, що й без бойового стилю.
**Fix hint.** Заповнити колонки фіч `Fighting Style: * (2024)` тими самими значеннями, що й у
рядках 2014 (`bonus_to_ranged_attack_roll=2`, `gives_ac=1 + requires_armor_for_ac_bonus=true`,
`bonus_to_melee_one_handed_weapon_damage=2`, `thrown_damage_boost=2`, `unarmed_damage` для Unarmed
Fighting) — правити у файлі-джерелі сіду, не проходом по базі (Р33).

---

### L03-feats-02 — жодна риса 2024 не дає володіння обладунком/зброєю/інструментом (P1)

**Правило (PHB 2024, `data/2024/source/raw/feat/`).**
- Lightly Armored: «Armor Training. You gain training with **Light armor and Shields**.»
- Moderately Armored: «Armor Training. You gain training with **Medium armor**.»
- Heavily Armored: «Armor Training. You gain training with **Heavy armor**.»
- Martial Weapon Training: «Weapon Proficiency. You gain proficiency with **Martial weapons**.»
- Chef: «Cook's Utensils. You gain proficiency with **Cook's Utensils**.»
- Poisoner: «Brew Poison. You gain proficiency with the **Poisoner's Kit**.»
- Crafter: «Tool Proficiency. You gain proficiency with **three different Artisan's Tools of your choice**.»
- Musician: «Instrument Training. You gain proficiency with **three Musical Instruments of your choice**.»
- Tavern Brawler: «Improvised Weaponry. You have **proficiency with improvised weapons**.»

**Доказ.** Запит вище: `granted_armor_proficiencies = '{}'`, `granted_weapon_proficiencies = NULL`,
`granted_tool_proficiencies = NULL` для **всіх 75** рис 2024. У Crafter і Musician до того ж нуль
`featChoiceOptions` — тобто вибрати три інструменти нема де взагалі.

**Очікувано.** Персонаж із Moderately Armored носить середній обладунок без штрафу і має його в
списку володінь; Crafter має три обрані ремісничі набори.
**Фактично.** Ці рядки на листі не змінюються; ЖОДНОГО володіння риса не додає.
**Fix hint.** `feat.granted_armor_proficiencies / granted_weapon_proficiencies /
granted_tool_proficiencies` у сіді 2024 + `featChoiceOptions` для вибору 3 інструментів у
Crafter/Musician. Рушій уже читає ці поля (`levelup-persistence.ts:290-294`).

---

### L03-feats-03 — Skill Expert не дає ні навички, ні експертизи (P1)

**Правило.** `feat/skill-expert.html`: «Skill Proficiency. You gain proficiency in **one skill of
your choice**. Expertise. Choose **one skill** in which you have proficiency but lack Expertise.»

**Доказ.** `creator-content-2024.json`, Skill Expert: `grantedSkillCount=0`, `grantedSkills=null`,
`grantsFeature=[]`, `featChoiceOptions` = 6 штук, усі — вибір характеристики для `grantedASI
{"ANY":1}` (groupName «Характеристика»). Опцій із `effectKind: SKILL_PROFICIENCY` або експертизи
немає. Опис українською (той самий JSON) обидва бенефіти згадує — тобто розходяться саме текст і
механіка.

**Очікувано.** +1 характеристика, +1 володіння навичкою, +1 експертиза.
**Фактично.** Тільки +1 характеристика.
**Fix hint.** Скопіювати схему Skilled: 18 опцій `SKILL_PROFICIENCY` у групі «Володіння» + окрема
група експертизи (`Feature.skillExpertises` вже є в схемі).

---

### L03-feats-04 — прирости швидкості (Speedy +10, Boon of Speed +30) не доїжджають до листа (P1)

**Правило.** `feat/speedy.html`: «Speed Increase. Your Speed increases by **10 feet**».
`feat/boon-of-speed.html`: «Quickness. Your Speed increases by **30 feet**».

**Доказ.** Обидві риси мають `grantsFeature: []` (запит вище: GENERAL і EPIC_BOON — 0 фіч).
`bonus-calculator.ts:396-398`: `calculateFinalSpeed = 30 + getSimpleBonus(pers,"speed")`, а
`speedBonuses` — це ручний JSON-бонус персонажа, не риса.

**Очікувано.** Спритний персонаж має 40 футів.
**Фактично.** 30.
**Fix hint.** Або фіча зі швидкістю (колонки в `feature` немає — треба DDL), або ручний бонус, який
створення/підвищення проставляє в `speedBonuses`.

---

### L03-feats-05 — Alert не додає бонус майстерності до ініціативи (P1)

**Правило.** `data/2024/srd/feats.md`, Alert: «Initiative Proficiency. When you roll Initiative, you
can **add your Proficiency Bonus** to the roll.»

**Доказ.** Фіча `Origin Feat: Alert (2024)` у `spells_test` — усі механічні колонки NULL
(див. таблицю на початку). У `feature` взагалі немає колонки для ініціативи (перелік колонок:
`bonus_to_attack_roll`, `bonus_to_ranged_attack_roll`, `gives_ac`, … — жодної `initiative`).
`bonus-calculator.ts:401-403`: `calculateFinalInitiative = DEX-mod + getSimpleBonus(pers,"initiative")`,
де `initiativeBonuses` — знову ручний JSON персонажа.

**Очікувано.** Персонаж 1-го рівня з Alert має ініціативу DEX+2.
**Фактично.** DEX.
**Fix hint.** Нова колонка `feature.initiative_bonus_is_proficiency` (DDL) або запис у
`pers.initiativeBonuses` при видачі риси.

---

### L03-feats-06 — Lucky не заводить пулу «Очки удачі» (P2)

**Правило.** `feat/lucky.html`: «Luck Points. You have a number of Luck Points **equal to your
Proficiency Bonus** … You regain your expended Luck Points when you finish a **Long Rest**.»

**Доказ.** Фіча `Origin Feat: Lucky (2024)`: `uses_count = NULL`,
`uses_count_depends_on_proficiency_bonus = false`, `limited_uses_per = NULL`, `uses_pool_key = NULL`.
Механізм у проєкті є (`src/rules/resource-pools.ts`, `src/server/db/resource-pool-provider.ts`,
`Feature.usesCountDependsOnProficiencyBonus`), просто не заповнений.

**Очікувано.** На листі — лічильник із БМ зарядів, що відновлюється довгим відпочинком.
**Фактично.** Тільки абзац тексту.
**Fix hint.** `uses_count_depends_on_proficiency_bonus=true`, `limited_uses_per='LONG_REST'` на фічі.

---

### L03-feats-07 — Magic Initiate: характеристику замовляння обирає не гравець, а список (P1)

**Правило.** `data/2024/srd/feats.md`, Magic Initiate: «**Intelligence, Wisdom, or Charisma** is your
spellcasting ability for this feat's spells (**choose when you select this feat**).»

**Доказ.** `creator-content-2024.json`, `Magic Initiate.featChoiceOptions` — рівно 3 опції групи
«Список заклинань», і кожна несе жорстку характеристику:
`Magic Initiate 2024 (Cleric) → effectAbility "WIS"`, `(Druid) → "WIS"`, `(Wizard) → "INT"`.
`src/rules/spell-sources.ts` бере цю `effectAbility` як характеристику джерела риси.

**Очікувано.** Чароді́й (CHA) із Magic Initiate (Cleric) чаклує заклинання риси Харизмою.
**Фактично.** Завжди Мудрістю; вибір гравця недоступний.
**Fix hint.** Друга група опцій «Характеристика замовляння» (INT/WIS/CHA) на цій рисі; джерело
читає її, а не `effectAbility` списку.

---

### L03-feats-08 — Elemental Adept: немає вибору типу шкоди, повтор нічим не обмежений (P2)

**Правило.** «Energy Mastery. Choose one of the following damage types: Acid, Cold, Fire, Lightning,
or Thunder … **Repeatable.** You can take this feat more than once, but you must **choose a different
damage type each time**.»

**Доказ.** `Elemental Adept.featChoiceOptions` = 3 опції, усі — характеристика
(`grantedASI {"INT_OR_WIS_OR_CHA":1}`). Це визнано в коді:
`src/rules/repeatable-feats.ts:24` — «Elemental Adept у даних 2024 типу шкоди як вибору не має, тож
обмежити його повтор нема чим», і `UNIQUE_CHOICE_GROUP_BY_FEAT` містить лише `MAGIC_INITIATE`.

**Очікувано.** Вибір типу шкоди; друга Elemental Adept вимагає інший тип.
**Фактично.** Тип шкоди не фіксується взагалі; ту саму рису можна взяти N разів поспіль.
**Fix hint.** Група опцій «Тип шкоди» (5 опцій) + додати `ELEMENTAL_ADEPT` у
`UNIQUE_CHOICE_GROUP_BY_FEAT`.

---

### L03-feats-09 — Skilled пропонує лише навички, книга дозволяє й інструменти; опис риси втрачено (P2)

**Правило.** `feat/skilled.html`: «You gain proficiency in any combination of **three skills or
tools** of your choice.»

**Доказ.** 18 опцій групи «Володіння», усі `effectKind: SKILL_PROFICIENCY` — від
`Skilled 2024 (ATHLETICS)` до `Skilled 2024 (PERSUASION)`. Жодного інструмента.
Окремо: опис риси, який бачить гравець, — рівно
`"**Повторюваність**\nВи можете обирати цю рису більше одного разу."` Сам бенефіт
(«три навички або інструменти») у тексті відсутній.

**Очікувано.** 18 навичок + перелік інструментів в одному пулі на 3 вибори; опис із бенефітом.
**Фактично.** Тільки навички; опис — сам лише рядок про повторюваність.
**Fix hint.** Додати опції інструментів у ту саму групу «Володіння»; відновити текст бенефіту в
`data/2024/normalized/feats.json` (там `benefitsEng` теж містить лише `Repeatable`).

---

### L03-feats-10 — Fey Touched і Shadow Touched не дають заклинань (P1)

**Правило.** `feat/fey-touched.html`: «You always have that spell and the **Misty Step** spell
prepared. You can cast **each of these spells without expending a spell slot** … once per Long Rest.»
`feat/shadow-touched.html` — те саме з **Invisibility**.

**Доказ.** Обидві риси: `grantsFeature: []`, `featChoiceOptions` = 3 (лише характеристика).
`src/rules/spell-sources.ts:89` (`findGrantedSpells`) видає заклинання **тільки** від виду
(`if (input.ruleset !== "RULES_2024") return []` → далі `findSpeciesSource`) — рис там немає.

**Очікувано.** Misty Step / Invisibility завжди підготовлені + одне обране заклинання 1-го рівня
відповідної школи, безкоштовне застосування раз на довгий відпочинок (Р38 — це фіча).
**Фактично.** Нічого; риса — тільки +1 характеристики й абзац тексту.
**Fix hint.** `Feature.givesSpells` (звʼязок є: `_FeatureToSpell`) на фічі риси + група опцій
«Заклинання 1-го рівня» з фільтром за школою.

---

### L03-feats-11 — Ritual Caster не дає ритуальних заклинань (P2)

**Правило.** `feat/ritual-caster.html`: «Choose a number of level 1 spells **equal to your
Proficiency Bonus** that have the Ritual tag. You always have those spells prepared … Whenever your
Proficiency Bonus increases thereafter, you can add an additional level 1 spell.»

**Доказ.** `Ritual Caster`: `grantsFeature: []`, `featChoiceOptions` = 3 (характеристика).
Заклинань не видає ніде.

**Очікувано.** Вибір БМ (2 на 4-му рівні) ритуальних заклинань 1-го рівня; при зростанні БМ —
ще одне.
**Фактично.** Тільки +1 характеристики.
**Fix hint.** Окрема система «джерело заклинань від риси зі змінною кількістю» — сама по собі
близька до `spell-sources.ts`, але кількість залежить від БМ, тому потрібен окремий KR.

---

### L03-feats-12 — Weapon Master не дає вибору майстерності зброї, хоча система майстерності в проєкті є (P1)

**Правило.** `feat/weapon-master.html`: «Mastery Property. Your training with weapons allows you to
use the **mastery property of one kind of Simple or Martial weapon of your choice**, provided you
have proficiency with it.»

**Доказ.** `Weapon Master`: `grantsFeature: []`, `featChoiceOptions` = 2 (лише STR/DEX для
`grantedASI {"STR_OR_DEX":1}`). При цьому в проєкті є повноцінна система: таблиця
`pers_weapon_mastery`, `src/rules/weapon-mastery.ts`, `src/server/db/weapon-mastery.ts`,
`WeaponMasteryForm.tsx`, крок `weaponMastery` у майстрі підвищення рівня — але риса до неї не
підключена.

**Очікувано.** Взявши Weapon Master, гравець отримує +1 слот майстерності зброї.
**Фактично.** Риса на майстерність не впливає.
**Fix hint.** Розширити `findCreationWeaponMasteryOffer` / `levelup-weapon-mastery.ts` рахунком
слотів від рис.

---

### L03-feats-13 — передумова «володіння» ніде не перевіряється (P1)

**Правило.** «Prerequisite. **To take a feat, you must meet any prerequisite** in its description»
(`data/2024/srd/feats.md`). Moderately Armored потребує Light Armor Training, Heavily Armored —
Medium, Heavy Armor Master — Heavy, Medium Armor Master — Medium, Shield Master — щит.

**Доказ.** Дані передумову несуть (запит вище: `prerequisite_proficiency = {'armor': ['MEDIUM']}`
тощо для 5 рис). Але `checkFeatPrerequisites` у `src/lib/logic/prerequisiteUtils.ts:150-244`
перевіряє **тільки** `prerequisiteLevel`, `prerequisiteAbilityScore`, `prerequisiteSpellcasting`,
`raceRestriction`, `subraceRestriction` — поля `prerequisiteProficiency` там немає. Грепом по всьому
`src/`: `prerequisiteProficiency` трапляється лише всередині `src/lib/generated/feats.json`,
у коді — жодного разу.

**Очікувано.** Чарівник без обладункових тренувань не може взяти Heavy Armor Master.
**Фактично.** Може: картка риси показується як доступна, сервер її приймає.
**Fix hint.** Гілка в `checkFeatPrerequisites` + серверна перевірка у `feat-gates.ts` поруч із
категорією.

---

### L03-feats-14 — риси «Бойовий стиль» доступні з класового ASI будь-кому (P2)

**Правило.** Кожна з 10 рис категорії Fighting Style має в книзі «_Prerequisite: **Fighting Style
Feature**_» (`data/2024/srd/feats.md`). Класовий ASI 2024 каже «another feat of your choice **for
which you qualify**».

**Доказ.** У даних жодна з них передумови не має (`prerequisiteLevel=null`,
`prerequisiteFeat=null`, `prerequisiteSpellcasting=false` — таблиця на початку). Джерело вибору
на підвищенні рівня завжди `CLASS_ASI` (`src/server/db/levelup-persistence.ts:280-282`), а
`ALLOWED_CATEGORIES_BY_SOURCE.CLASS_ASI = "any"` (`src/rules/repeatable-feats.ts:74`). Список у
`FeatsForm` фільтрується лише пошуком і повторюваністю
(`BackgroundFeatsForm.tsx:65-88` — та сама логіка).

**Очікувано.** Чарівник 4-го рівня не бачить Archery/Defense серед доступних рис.
**Фактично.** Бачить і бере (щоправда, ефекту не отримує — див. L03-feats-01).
Це не суперечить Р41: Р41 знімає обмеження **категорії**, а тут порушена **передумова риси**.
**Fix hint.** Внести передумову «є фіча Бойовий стиль» у дані рис і перевіряти її.

---

### L03-feats-15 — менеджер рис на листі не має жодного гейта і не застосовує механіку (P1)

**Доказ.** `src/lib/actions/feat-actions.ts:28-49` (`addFeatToPers`) перевіряє тільки право на
редагування персонажа. `src/server/db/feat-actions.ts:56-84` (`addPersFeat`) перевіряє тільки
`isRepeatable`. Немає: `findFeatPackageProblem` (категорія + Р37), `checkFeatPrerequisites`
(рівень/характеристика/замовляння), звірки `feat.ruleset` із `pers.ruleset`, застосування
`grantedASI`, `grantedSkills`, `grantedLanguages`, володінь.
`FeatsSheetManagerModal.tsx:78` викликає `addFeatToPers({persId, featId})` — **без**
`choiceOptionIds`, тобто вибори всередині риси зробити нема де.

**Очікувано.** Додана з листа риса поводиться так само, як додана в майстрі: гейти + ASI + вибори.
**Фактично.** Персонаж 1-го рівня додає собі `Boon of Truesight`; `Skill Expert` не змінює
характеристики; повторювана риса лягає другим рядком без виборів, тобто в стані, який майстер
створення відхилив би (Р37 говорить саме про «другий рядок **зі своїми виборами**»).
**Fix hint.** Провести `addFeatToPers` через `findFeatPackageProblem` + `checkFeatPrerequisites`
і додати крок виборів у модалці.

---

### L03-feats-16 — риса «Ability Score Improvement» у списку рис не робить нічого (P1)

**Правило.** «Increase one ability score of your choice by 2, or increase two ability scores of your
choice by 1» (`data/2024/srd/feats.md`).

**Доказ.** `creator-content-2024.json`: `ABILITY_SCORE_IMPROVEMENT`, `featId 2987`,
`grantedASI: null`, `featChoiceOptions: []`, `grantsFeature: []`, і опис —
`"**Повторюваний**\nВи можете обирати цей рис більше одного разу."` (та ще й із помилкою
«цей рис»; друга така — Elemental Adept). У майстрі підвищення рівня це окрема картка серед рис:
`LevelUpASIForm.tsx:361` віддає `feats` (усі 75 для редакції, `levelup-content.ts:50`) у `FeatsForm`,
який фільтрує лише за пошуком і повторюваністю.

**Очікувано.** Або риси немає в списку (бо +2/+1+1 уже є окремою гілкою «Характеристики»),
або вона працює.
**Фактично.** Гравець витрачає підвищення 4-го рівня і не отримує нічого.
**Fix hint.** Приховати рису `ABILITY_SCORE_IMPROVEMENT` у `FeatsForm`, коли поруч є гілка ASI
(вона і є цією рисою), або зробити її живою через `featChoiceOptions`.

---

### L03-feats-17 — Епічні дари: стеля характеристики 20 замість 30 (P2)

**Правило.** Усі 12 Epic Boon: «Increase one ability score of your choice by 1, **to a maximum of
30**» (`data/2024/srd/feats.md`).

**Доказ.** Стеля 20 зашита в усіх шляхах: `src/rules/character-creation.ts:204`
(`Math.min(20, score)`), `src/rules/levelup.ts:82-87`, `src/rules/abilities.ts:157`,
`src/rules/strategies/rules2024.ts:72-76`, `src/server/db/levelup-persistence.ts:234`.

**Очікувано.** Персонаж 19-го рівня з 20 Силою і Boon of Combat Prowess (Сила) отримує 21.
**Фактично.** Лишається 20.
**Fix hint.** Стеля має бути параметром (20 звичайно, 30 для `EPIC_BOON`), а не константою.

---

### L03-feats-18 — Boon of Spell Recall втратив передумову «здатність замовляти» (P3, дані)

**Правило.** `data/2024/srd/feats.md`: «_Epic Boon Feat (Prerequisite: **Level 19+, Spellcasting
Feature**)_».

**Доказ.** `creator-content-2024.json`: `Boon Of Spell Recall` → `prerequisiteSpellcasting: false`
(для порівняння, у Elemental Adept / Spell Sniper / War Caster прапорець стоїть `true`).
`data/2024/normalized/feats.json` теж має `prerequisite: "19+ рівень"` без згадки замовляння.
**Очікувано.** Варвар 19-го рівня рису не бачить.
**Фактично.** Бачить і бере.
**Fix hint.** `prerequisite_spellcasting = true` у сіді.

---

### L03-feats-19 — Epic Boon: небойова механіка не існує ніде (P2)

**Правило (`data/2024/source/raw/feat/`).** Boon of Fortitude: «Your Hit Point maximum **increases by
40**». Boon of Skill: «You gain **proficiency in all skills**» + експертиза в одній.
Boon of Energy Resistance: «Resistance to **two** of the following damage types **of your choice**».
Boon of Truesight: «Truesight 60 feet».

**Доказ.** Усі 12 EPIC_BOON мають 0 фіч (`_FeatGrantsFeature`), а `featChoiceOptions` = 6 (для
`ANY:1`), 3 (для `INT_OR_WIS_OR_CHA`) або 2 (для `STR_OR_DEX`) — тобто **виключно** вибір
характеристики. Ні +40 HP, ні володіння всіма навичками, ні вибору двох типів шкоди немає.
**Fix hint.** Найближче реалізовне: `Boon of Skill` через `grantedSkills` (усі 18) +
група експертизи; `Boon of Fortitude` через фічу з фіксованим бонусом HP (колонки «плоский бонус
HP» у `feature` немає — тільки `bonus_hit_points_per_level`, тож потрібен DDL).

---

## Перевірено й правильно

- **Категорії й хто де бере рису.** `src/rules/repeatable-feats.ts:74-84` +
  `src/server/db/feat-gates.ts:29-35`: походження і Універсальність Людини — тільки `ORIGIN`,
  крок бойового стилю — тільки `FIGHTING_STYLE`, класовий ASI — будь-яка (Р41). Сервер відхиляє
  з людською причиною («Рису «…» не можна взяти на цьому кроці»). Це відповідає Р41.
- **Повторюваність (Р37).** `findFeatRepeatProblemInBatch` звіряє кандидатів і між собою в межах
  одного пакета створення, і з уже взятими. `addPersFeat` кладе повторювану другим рядком
  `pers_feat`, а не мерджить у наявний — саме як у Р37. Magic Initiate удруге з тим самим
  списком відхиляється (`UNIQUE_CHOICE_GROUP_BY_FEAT.MAGIC_INITIATE`).
- **Передумови рівня / характеристики / замовляння** працюють:
  `checkFeatPrerequisites` (`prerequisiteUtils.ts:150-244`) закриває 12 Epic Boon рівнем 19,
  43 General — рівнем 4, `{"or":true,"STR":13,"DEX":13}` розбирається правильно
  (`parseAbilityRequirements`), `prerequisiteSpellcasting` закриває Elemental Adept, Spell Sniper,
  War Caster.
- **Вибіркові ASI.** Усі 43 GENERAL мають `grantedASI` рівно за книгою; звірив поштучно з
  html-сторінками: Heavily Armored `STR_OR_CON` («Constitution or Strength»), Chef `CON_OR_WIS`,
  Mounted Combatant `STR_OR_DEX_OR_WIS`, Observant `INT_OR_WIS`, Poisoner `DEX_OR_INT`,
  Speedy `DEX_OR_CON`, Shield Master `STR`, Elemental Adept `INT_OR_WIS_OR_CHA`,
  Boon of Irresistible Offense `STR_OR_DEX`, решта Epic Boon `ANY`. Розходжень **не знайдено**.
- **Resilient.** Попри те, що риса не має фічі, володіння ряткидком реалізовано в коді за іменем:
  `character-creation.ts:126` (`resilient: feat.name === Feats.RESILIENT`), застосування —
  `src/rules/character-creation.ts:185` (`resilientSavingThrow`) і `:81`
  (додається в `savingThrows`); на підвищенні рівня — `levelup-persistence.ts:285`. Працює
  в обох потоках.
- **Tough.** Теж за іменем: `character-creation.ts:227` (`hasTough`) → `getInitialHitPoints`
  (+2 на 1-му рівні), `levelup-persistence.ts:441-442` + `src/rules/levelup.ts:49`
  (`takesTough ? 2 * nextLevel : hasTough ? 2 : 0`) — точно формула 2024 («twice your character
  level when you gain this feat, +2 thereafter»).
- **Skilled — навички.** 18 опцій `effectKind: SKILL_PROFICIENCY` у групі «Володіння» +
  `grantedSkillCount = 3`: три навички обираються й зберігаються. Єдина риса 2024, у якої механіка
  вибору справді є (бракує лише інструментів — L03-feats-09).
- **Риси-фічі доїжджають до листа принципово.** `bonus-calculator.ts:183-186` додає
  `pf.feat.grantsFeature` у `collectActiveFeatures`, тому як тільки колонки фіч заповнять,
  числа зʼявляться без змін у коді листа.
- **Ізоляція редакцій у каталозі рис на листі.** `FeatsSheetManagerModal.tsx:21-23,57-58`
  вантажить `getAllFeats(ruleset)` — 2014-персонажу 2024-ті риси не показуються
  (сервер, щоправда, не перевіряє — див. L03-feats-15).
- **Магічний ініціат як джерело заклинань** існує: `src/rules/spell-sources.ts:52-58,167+`
  робить із риси окреме джерело з власною характеристикою. Проблема лише в тому, **яка** це
  характеристика (L03-feats-07).

## Не перевірено

- Друк / PDF, копія персонажа, шеринг — чи переживають `pers_feat_choice` (браузером не ходив,
  часу не лишилося).
- Чи показує слайд «Риси» листа риси категорій GENERAL/EPIC_BOON узагалі (у них 0 фіч, а слайд
  малює `pers_feature`; імовірно, вони видно тільки в модалці менеджера рис — не доведено).
- Точна поведінка кроку `speciesFeatChoices` для Людини 2024 у браузері.
