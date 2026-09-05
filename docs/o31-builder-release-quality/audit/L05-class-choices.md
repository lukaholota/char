# L05 — Вибори класів і підкласів 2024

Оракул: `data/2024/srd/classes.md` (SRD 5.2.1), `data/2024/srd/feats.md`.
Джерела сідів: `data/2024/normalized/classes.json`, `data/2024/normalized/invocations.json`.
База: `spells_test` (читання через `work/L05-class-choices/q.mjs`).
Браузер: http://127.0.0.1:3100, сесія `l05-class-choices@holota.family`.
Скрипти й скріншоти: `scratchpad/audit/work/L05-class-choices/`, `scratchpad/audit/shots/L05-*.png`.

## Базовий вимір

```sql
select c.eng_name, co.group_name, count(*)
from class_choice_option cco
join class c on c.class_id = cco.class_id
join choice_option co on co.option_id = cco.choice_option_id
where cco.ruleset = 'RULES_2024' group by 1,2;
```
→ рівно **чотири** класи мають хоч один вибір:
FIGHTER_2024 «Бойовий стиль» ×10 (рівні [1]), PALADIN_2024 ×10 ([2]), RANGER_2024 ×10 ([2]),
WARLOCK_2024 «Потойбічні виклики» ×31 ([1,2,5,7,9,12,15,18]).

```sql
select count(*) from subclass_choice_option where ruleset='RULES_2024';  -- 0
select count(*) from class_optional_feature where ruleset='RULES_2024';  -- 0 (усі 19 рядків — RULES_2014)
```

Жодна риса 2024 не несе механіки вибору:
```sql
select … from class_feature cf join feature f using(feature_id)
where cf.ruleset='RULES_2024'
  and (f.skill_expertises is not null or f.skill_proficiencies is not null
       or f.invocations_count is not null or f.gives_maneuvres = true
       or f.superiority_dice_count is not null);
```
→ **0 рядків** (для порівняння, RULES_2014 має `Expertise` / `Expertise 2` / `Expertise (Bard)` /
`Expertise (Bard) 2` з `{"count":2,"chooseFromCurrentProficiencies":true}`).

Ті самі числа в файлі, з якого читає конструктор (`src/lib/generated/creator-content-2024.json`):
`classChoiceOptions` непорожній лише у Воїна(10), Паладина(10), Слідопита(10), Чорнокнижника(31);
`subclassChoiceOptions` = 0 в усіх 48 підкласів 2024.

Браузерна перевірка кроків конструктора (`work/L05-class-choices/steps.mjs`, вивід збережено):

| клас | кроки після вибору класу |
|---|---|
| CLERIC_2024 | class → **background** (жодних опцій) |
| DRUID_2024 | class → **background** |
| SORCERER_2024 | class → **background** |
| BARD_2024 / WIZARD_2024 / MONK_2024 | class → **background** |
| ROGUE_2024 | class → weaponMastery → background (**без «Експертиза»**) |
| BARBARIAN_2024 / PALADIN_2024 / RANGER_2024 | class → weaponMastery → background |
| FIGHTER_2024 | class → **classChoices** → weaponMastery → background |
| WARLOCK_2024 | class → **classChoices** → background |

Скріншоти: `shots/L05-CLERIC_2024-afterclass.png` (одразу «Оберіть передісторію»),
`shots/L05-ROGUE_2024-afterclass.png` («Майстерність зброї»),
`shots/L05-WARLOCK_2024-afterclass.png` («Опції класу»).

---

## Знахідки

### L05-class-choices-01 — Клірик 2024 ніколи не обирає Divine Order (рівень 1)
**severity P1 · class-features · 2024 · missing-system**

Оракул `data/2024/srd/classes.md:2205–2211`:
> #### Level 1: Divine Order
> You have dedicated yourself to one of the following sacred roles of your choice.
> _Protector._ Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor.
> _Thaumaturge._ You know one extra cantrip from the Cleric spell list. In addition, … bonus to your Intelligence (Arcana or Religion) checks … equals your Wisdom modifier (minimum of +1).

Доказ: `class_choice_option` не має жодного рядка для CLERIC_2024 (запит вище). Риса існує лише як
текст: `class_feature` → `Cleric: Divine Order (2024)`, `level_granted = 1`, у `feature` всі
механічні поля (`skill_expertises`, `weapon_proficiencies`, `armor_proficiencies`) порожні.
Ланцюг у коді: `MultiStepForm.tsx:244` `hasLevelOneChoices = cls?.classChoiceOptions?.some(...)` →
`creation-step-resolver.ts:65` `if (conditions.hasLevelOneChoices) steps.push({id:"classChoices"…})`.
Браузер: після вибору CLERIC_2024 наступний крок — «Оберіть передісторію».

Очікувано: крок вибору між Захисником і Дивотворцем; Захисник додає володіння бойовою зброєю та
важкі обладунки, Дивотворець — додаткове замовляння і бонус до перевірок.
Фактично: вибору немає, клірик назавжди без бойової зброї/важких обладунків і без додаткового замовляння.
Fix: сід `choice_option` + `class_choice_option` (`levels_granted = {1}`) з ефектами на володіння
(як зроблено для 2014 Ranger «Налаштування Слідопита»).
Effort **M**.

### L05-class-choices-02 — Друїд 2024 ніколи не обирає Primal Order (рівень 1)
**severity P1 · class-features · 2024 · missing-system**

Оракул `classes.md:3521–3527`: Magician (додаткове замовляння + бонус до Інтелекту) або
Warden (бойова зброя + середні обладунки).
Доказ: `class_choice_option` порожній для DRUID_2024; риса `Druid: Primal Order (2024)` є лише текстом;
у браузері після DRUID_2024 одразу «Оберіть передісторію».
Effort **M**.

### L05-class-choices-03 — Друїд 2024 отримує середні обладунки безумовно
**severity P1 · data-content · 2024 · data**

Оракул, Core Druid Traits, `classes.md:3045`: `Armor Training` → **Light armor and Shields**
(підтверджено `classes.md:3063`: мультиклас дає «training with Light armor and Shields»).
Середні обладунки книга дає **тільки** через Primal Order → Warden (`classes.md:3527`).

```sql
select eng_name, armor_proficiencies from class where eng_name='DRUID_2024';
-- DRUID_2024 | {LIGHT,MEDIUM,SHIELD}
```
Очікувано `{LIGHT,SHIELD}` у класі + `MEDIUM` від опції Warden.
Фактично кожен друїд 2024 (і кожен мультиклас у друїда) вміє носити середні обладунки — завищений КЗ.
Fix: `prisma/seed` класів 2024 + `db/changes/`; разом із L05-class-choices-02.
Effort **S**.

### L05-class-choices-04 — Чародій 2024 не має Метамагії взагалі
**severity P1 · class-features · 2024 · missing-system**

Оракул `classes.md:7688–7694`:
> you gain two Metamagic options of your choice … Whenever you gain a Sorcerer level, you can replace one of your Metamagic options with one you don't know. You gain two more options at Sorcerer level 10 and two more at Sorcerer level 17.

Доказ: `class_choice_option` для SORCERER_2024 — 0 рядків; `choice_option` з `group_name='Метамагія'`
і `ruleset='RULES_2024'` — 0 рядків (усі 10 метамагій у базі є лише під RULES_2014, прив'язані до
SORCERER_2014 з `levels_granted={3,10,17}`). У `src/lib/logic/choicePoolRules.ts:78` є правило лише
для `SORCERER_2014`; для `SORCERER_2024` правила немає, тож навіть якби опції з'явилися, крок дав би
1 вибір замість 2.
Наслідок: очки чаклунства (Font of Magic) нікуди витрачати — 2024-чародій механічно порожній з 2-го рівня.
Fix: сід 8 метамагій 2024 + `class_choice_option levels_granted={2,10,17}` + правило
`{scope:"class", className:"SORCERER_2024", picksAtLevel: mapPicks({2:2,10:2,17:2})}`.
Effort **M**.

### L05-class-choices-05 — Експертиза 2024 не працює в жодного класу
**severity P1 · class-features · 2024 · data**

Оракул: Пройдисвіт `classes.md:7033–7037` (2 навички на 1-му, ще 2 на 6-му);
Бард `classes.md:888–892` (2 на 2-му, ще 2 на 9-му); Слідопит `classes.md:6457–6459` (2 на 9-му);
Чарівник Scholar `classes.md:10247–10249` (експертиза в одній із Arcana/History/Investigation/
Medicine/Nature/Religion).

Доказ:
```sql
select f.eng_name, f.skill_expertises from class_feature cf join feature f using(feature_id)
where cf.ruleset='RULES_2024' and f.eng_name ilike '%expertise%' or f.eng_name ilike '%scholar%';
-- Rogue: Expertise (2024) | null      (level_granted = 1)
-- Bard: Expertise (2024)  | null      (level_granted = 2)
-- Ranger: Expertise (2024)| null      (level_granted = 9)
-- Wizard: Scholar (2024)  | null      (level_granted = 2)
```
Для порівняння RULES_2014: `Expertise` / `Expertise 2` / `Expertise (Bard)` / `Expertise (Bard) 2`
несуть `{"count":2,"chooseFromCurrentProficiencies":true}`.

Код читає рівно це поле: конструктор `MultiStepForm.tsx:521–545` (`hasExpertiseChoice` →
`f.skillExpertises`), підвищення рівня `LevelUpWizard.tsx:506–530` (`needsExpertise` → те саме поле)
→ `creation-step-resolver.ts:77` / `LevelUpWizard.tsx:890`.
Браузер: ROGUE_2024 1-го рівня — кроки `class → weaponMastery → background`, кроку «Експертиза» немає.

Додатково: **другого надання немає навіть як рядка** — у 2014 це окремі фічі `Expertise 2` (6) і
`Expertise (Bard) 2` (10); у 2024 є лише один `Rogue: Expertise (2024)` на 1-му та один
`Bard: Expertise (2024)` на 2-му, тож рівні 6 і 9 не дадуть нічого, навіть коли поле заповнять.
Fix: заповнити `skill_expertises` у чотирьох рисах + додати рядки другого надання
(Rogue @6, Bard @9); для Scholar — `{"count":1,"options":[ARCANA,HISTORY,INVESTIGATION,MEDICINE,NATURE,RELIGION]}`.
Effort **M**.

### L05-class-choices-06 — Клірик Blessed Strikes (7) не пропонує вибору
**severity P1 · class-features · 2024 · missing-system**

Оракул `classes.md:2239–2245`: «You gain one of the following options of your choice» —
_Divine Strike_ (1d8 некротичної або променевої) чи _Potent Spellcasting_ (модифікатор Мудрості до
шкоди замовлянь). Те саме на 14-му (`Improved Blessed Strikes`, `classes.md:2251`).
Доказ: рис у базі дві (`Cleric: Blessed Strikes (2024)` @7, `Cleric: Improved Blessed Strikes (2024)` @14),
`class_choice_option` для CLERIC_2024 — 0. У LevelUpWizard крок `class-choices` виникає лише коли
`Object.keys(classChoiceGroups).length > 0` (`LevelUpWizard.tsx:834`), тож на 7-му рівні кроку не буде.
Effort **M**.

### L05-class-choices-07 — Варвар Primal Knowledge (3) не дає додаткової навички
**severity P1 · class-features · 2024 · data**

Оракул `classes.md:280–282`: «You gain proficiency in another skill of your choice from the skill list
available to Barbarians at level 1».
Доказ: `feature.skill_proficiencies` у `Barbarian: Primal Knowledge (2024)` = `null` (запит по
`class_feature` з ruleset RULES_2024 — жодна риса не має цього поля). Крок «Навички» на підвищенні
з'являється лише коли риса несе `skillProficiencies.choiceCount > 0` (`LevelUpWizard.tsx:487–503`).
Effort **S**.

### L05-class-choices-08 — Жоден підклас 2024 не має вибору (48 підкласів, 0 опцій)
**severity P1 · subclass-features · 2024 · missing-system**

```sql
select count(*) from subclass_choice_option where ruleset='RULES_2024';  -- 0
```
Підкласи в базі є всі 48 (BATTLE_MASTER, CHAMPION, ELDRITCH_KNIGHT, PSI_WARRIOR, CIRCLE_OF_THE_LAND,
HUNTER, THIEF, ARCANE_TRICKSTER, ASSASSIN, SOULKNIFE, WARRIOR_OF_THE_ELEMENTS …), але жоден нічого
не питає.

Приклади з оракула:
- Hunter, `classes.md:6817–6823` — Hunter's Prey: Colossus Slayer **або** Horde Breaker (вибір на 3-му,
  міняється на відпочинку); `classes.md:6825–6831` — Defensive Tactics на 7-му (Escape the Horde /
  Multiattack Defense).
- Champion, `classes.md:4876–4878` — Level 7 Additional Fighting Style: «You gain another Fighting Style
  feat of your choice» (для нього опції вже є в базі — це найдешевший з усіх).
- Battle Master (поза SRD, PHB 2024) — 3 маневри на 3-му, +2 на 7/10/15 і кубики переваги; у базі
  жодна риса 2024 не має ні `gives_maneuvres`, ні `superiority_dice_count`
  (запит вище дав 0 рядків), тоді як `choicePoolRules.ts:88` уже містить правило `BATTLE_MASTER`
  (воно спрацює тільки для 2014-підкласу з тим самим ім'ям).
Effort **L** (окрема ціль на підкласові вибори 2024).

### L05-class-choices-09 — Паладин без Blessed Warrior, Слідопит без Druidic Warrior
**severity P1 · class-features · 2024 · data**

Оракул, Паладин `classes.md:5651–5655`:
> You gain a Fighting Style feat of your choice … Instead of choosing one of those feats, you can choose the option below.
> **Blessed Warrior.** You learn two Cleric cantrips of your choice … Charisma is your spellcasting ability for them.

Слідопит `classes.md:6435–6439`: те саме з **Druidic Warrior** (два замовляння друїда, Мудрість).

Доказ: обидва класи отримують рівно ті самі 10 опцій, що й Воїн:
Archery, Blind Fighting, Defense, Dueling, Great Weapon Fighting, Interception, Protection,
Thrown Weapon Fighting, Two Weapon Fighting, Unarmed Fighting — і жодної одинадцятої.
```sql
select c.eng_name, co.option_name_eng from class_choice_option cco … where cco.ruleset='RULES_2024';
-- PALADIN_2024: 10 рядків «Fighting Style 2024 (…)», Blessed Warrior відсутній
-- RANGER_2024 : 10 рядків, Druidic Warrior відсутній
```
Наслідок: Паладин/Слідопит, що обирає магічний варіант бойового стилю (популярний білд), не може
його зібрати взагалі.
Effort **M** (опція має ще й видати два замовляння з чужого списку — тягне за собою джерело замовляння).

### L05-class-choices-10 — Виклик Thirsting Blade відсутній, хоча Devouring Blade його вимагає
**severity P1 · class-features · 2024 · data**

Оракул `classes.md:9211–9213`:
> #### Thirsting Blade
> _Prerequisite: Level 5+ Warlock, Pact of the Blade Invocation_

Доказ: у базі 31 виклик 2024, Thirsting Blade серед них немає; джерело
`data/2024/normalized/invocations.json` теж має 31 запис без нього. При цьому Devouring Blade у
джерелі несе передумову «Рівень 12+, Дар: Pact of the Blade, **Thirsting Blade**».
Наслідок: чорнокнижник-клинок не отримує Extra Attack — головну бойову рису білда Pact of the Blade.
Fix: додати запис у `data/2024/normalized/invocations.json` і перелити сід (правити базу проходом не
можна — [Р33]).
Effort **S**.

### L05-class-choices-11 — Передумови викликів 2024 перенесені частково
**severity P2 · class-features · 2024 · data**

Оракул vs база (`choice_option.prerequisites`):

| виклик | книга | база |
|---|---|---|
| Agonizing Blast | Level 2+, cantrip that deals damage (`classes.md:9040`) | `{}` |
| Devil's Sight | Level 2+ (`:9058`) | `{}` |
| Eldritch Spear | Level 2+, damaging cantrip (`:9081`) | `{}` |
| Fiendish Vigor | Level 2+ (`:9089`) | `{}` |
| Mask of Many Faces | Level 2+ (`:9151`) | `{}` |
| Misty Visions | Level 2+ (`:9163`) | `{}` |
| Repelling Blast | Level 2+, damaging cantrip via attack roll (`:9205`) | `{}` |
| Investment of the Chain Master | Level 5+, Pact of the Chain (`:9121`) | `{"pact":"Pact of the Chain (2024)"}` — без рівня |
| Devouring Blade | Level 12+, **Thirsting Blade** (`:9064`) | `{"pact":"Pact of the Blade (2024)","level":12}` — вимога виклика втрачена |

(Lessons of the First Ones і Otherworldly Leap рівень 2 мають — тобто перенос непослідовний.)
Наслідок: чорнокнижник 1-го рівня, який має рівно один виклик, вільно бере Agonizing Blast /
Repelling Blast / Devil's Sight — книга це забороняє. Ті виклики, де рівень все ж записаний, теж не
блокують: `ClassChoiceOptionsForm.tsx:180–193` при невиконаній передумові лише показує діалог
підтвердження і дозволяє взяти («Прийняти»).
Effort **S** (дані) + рішення власника про жорсткість гейта.

### L05-class-choices-12 — Немає механізму заміни вибору при підвищенні рівня в 2024
**severity P2 · levelup · 2024 · missing-system**

Оракул: заміна є в кожному з цих місць —
Warlock `classes.md:8968` («Whenever you gain a Warlock level, you can replace one of your invocations»),
Sorcerer `classes.md:7694` («you can replace one of your Metamagic options»),
Fighter `classes.md:4792` («you can replace the feat you chose with a different Fighting Style feat»),
Paladin `classes.md:5655` / Ranger `classes.md:6439` (заміна замовляння Blessed/Druidic Warrior).

Доказ: єдиний шлях до заміни в коді — крок `replacements`, який будується з
`class_optional_feature` (`LevelUpWizard.tsx:906–931` → `findVisibleOptionalFeatures`), а форма
заміни `ChoiceReplacementForm` викликається лише зсередини `OptionalFeaturesForm.tsx:297`, коли
опційна риса має прапорець `replacesInvocation` / `replacesFightingStyle` / `replacesManeuver`.
```sql
select ruleset, count(*) from class_optional_feature group by 1;  -- лише RULES_2014: 19
```
Тобто для персонажа 2024 крок `replacements` не з'явиться ніколи. Механізм TCoE-«опційних рис»
(2014) не збігається з правилом 2024 «на кожному рівні можна поміняти один вибір».
Effort **L**.

### L05-class-choices-13 — Bard Magical Secrets (10) не реалізовано
**severity P2 · spellcasting · 2024 · missing-system**

Оракул `classes.md:918–920`: з 10-го рівня нові підготовлені заклинання барда можна брати зі
списків барда, клірика, друїда й чарівника, і вони рахуються бардівськими.
Доказ: риса в базі є (`Bard: Magical Secrets (2024)`, level 10), але рядок `grep -rn "Magical Secrets"
src/ --exclude-dir=generated` не дає жодного влучення — механіки немає ніде.
(Перетинається з лінзою заклинань; тут фіксую лише як пропущений вибір класу.)
Effort **M**.

---

## Перевірено й правильно

- **Чорнокнижник 2024, кількість викликів за рівнями.** Таблиця SRD (`classes.md`, Warlock Features,
  колонка Eldritch Invocations) дає накопичено 1/3/3/3/5/5/6/6/7/7/7/8/8/8/9/9/9/10/10/10, тобто
  прирости на рівнях 1,2,5,7,9,12,15,18. У базі `class_choice_option.levels_granted =
  {1,2,5,7,9,12,15,18}`, у `src/lib/logic/choicePoolRules.ts:70–76` правило
  `WARLOCK_2024 → mapPicks({1:1, 2:2, 5:2, 7:1, 9:1, 12:1, 15:1, 18:1})` — збігається з книгою до рівня.
  Перший виклик саме на 1-му рівні (відмінність від 2014) враховано.
- **Pact Boon у 2024 — це виклики, а не окрема група.** Pact of the Blade/Chain/Tome лежать у групі
  «Потойбічні виклики» (на відміну від 2014, де є окрема група «Дар пакту» на 3-му рівні). Це
  відповідає `classes.md:8962` («You gain one invocation of your choice, such as Pact of the Tome»).
  Перевірка передумови «Дар: …» вміє читати ключі з суфіксом `(2024)`
  (`src/lib/logic/prerequisiteUtils.ts:84–87`).
- **Рівні бойового стилю.** Воїн — 1-й (`classes.md:4788`), Паладин — 2-й (`:5651`), Слідопит — 2-й
  (`:6435`); у базі `levels_granted` = `{1}`, `{2}`, `{2}` відповідно. Конструктор не питає бойовий
  стиль у паладина/слідопита на 1-му рівні — і правильно робить.
- **Список бойових стилів 2024** — рівно 10 (Archery, Blind Fighting, Defense, Dueling, Great Weapon
  Fighting, Interception, Protection, Thrown Weapon Fighting, Two-Weapon Fighting, Unarmed Fighting),
  збігається з переліком рис-стилів PHB 2024 (SRD `feats.md` містить лише свою четвірку).
- **Майстерність зброї — кількості за рівнями точні.** Витяг колонки Weapon Mastery з таблиць SRD:
  Варвар `2,2,2,3×6,4×10`, Воїн `3,3,3,4×6,5×6,6×5`; Паладин/Слідопит/Пройдисвіт — фіксовані 2
  (колонки в таблиці немає, число з тексту `classes.md:5647 / :6422 / :7051`). У базі
  `class.weapon_mastery_progression` збігається символ у символ. Монах, бард, клірик, друїд, чародій,
  чорнокнижник, чарівник — нулі, і це правильно (жоден із них не має Weapon Mastery в 2024).
- **Крок «Майстерність зброї» справді з'являється** у конструкторі 2024 для варвара, воїна, паладина,
  слідопита й пройдисвіта і не з'являється в решти (браузерна перевірка вище).
- **Клірик 2024, базові володіння** — Light/Medium/Shield + проста зброя, збігається з Core Cleric
  Traits (`classes.md:1750–1770`).
- **Підклас із 3-го рівня.** `class.subclass_level` = 3 в усіх класах 2024 (крім тих, де книга каже
  інакше — таких у 2024 немає); конструктор не показує крок «Підклас» на 1-му рівні для 2024.
- **Крок «Опції класу» працює там, де дані є.** Воїн і чорнокнижник отримують крок `classChoices`
  на 1-му рівні (скріншот `shots/L05-WARLOCK_2024-afterclass.png`), консольних помилок немає.

## Не перевірено

- Збереження вибору 2024 у `_ChoiceOptionToPers` і показ на листі — не дійшов до створеного
  персонажа: автоматичний прохід конструктора спіткнувся на кроці «Характеристики»
  (`work/L05-class-choices/create.mjs`), а ручне доведення до кінця не вклалося в бюджет.
  Для Воїна/Чорнокнижника 2024 крок вибору існує, тож імовірно шлях той самий, що й у 2014.
- Підвищення рівня 2024 у браузері (Чародій→2, Пройдисвіт→6, Воїн-Champion→7) — доведено читанням
  коду й порожніми таблицями, але не клікнуто.
- Мультикласові вибори 2024 (наприклад, чорнокнижник як другий клас) — поза цією лінзою.
