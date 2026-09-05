# L02-backgrounds — походження 2024 і ASI походження

Дата: 2026-09-04. База: `spells_test`. Браузер: http://127.0.0.1:3100.
Робочі файли: `scratchpad/audit/work/L02-backgrounds/` (скрипти запитів, зонди vitest, playwright).
Скріншоти: `scratchpad/audit/shots/L02-*.png`.

## Що каже оракул

`data/2024/srd/character-origins.md` §«Parts of a Background»:

> **Ability Scores.** A background lists three of your character's ability scores. Increase one by 2
> and another one by 1, or increase all three by 1. None of these increases can raise a score above 20.
> **Feat.** A background gives your character a specified Origin feat.
> **Skill Proficiencies.** …proficiency in two specified skills.
> **Tool Proficiency.** …one tool—either a specific tool or one chosen from the Artisan's Tools category.
> **Equipment.** Each background offers a choice between a package of equipment and 50 GP.

`character-origins.md:36` (Acolyte): `**Feat:** Magic Initiate (Cleric) (see "Feats")` — список
заклинань риси **зафіксований походженням**, а не вибирається гравцем.
`character-creation.md:202`: `Your character knows at least three languages: Common plus two…` —
мови в 2024 дає Origin, а не конкретне походження.

---

## Знахідки

### L02-backgrounds-01 (P1) — конструктор 2024 ніколи не показує крок «Опції риси походження»; риса походження з виборами створюється порожньою

**Де:** `src/lib/components/characterCreator/MultiStepForm.tsx:275-277`

```tsx
const hasBackgroundFeatChoice = useMemo(() => (bg?.gainsFeats?.length ?? 0) > 0, [bg]);
const backgroundFeat = useMemo(() => feats.find(f => f.featId === formData.backgroundFeatId), [feats, formData.backgroundFeatId]);
const hasBackgroundFeatChoices = useMemo(() => (backgroundFeat?.featChoiceOptions?.length ?? 0) > 0, [backgroundFeat]);
```

У 2024 риса походження **фіксована** й приходить полем `Background.originFeatId`, а не списком
`gainsFeats`. Перевірено: усі 16 походжень 2024 у `src/lib/generated/creator-content-2024.json`
мають `"gainsFeats": []` і непорожній `originFeatId`. Отже `formData.backgroundFeatId` ніколи не
проставляється → `backgroundFeat === undefined` → `hasBackgroundFeatChoices === false` → крок
`backgroundFeatChoices` не потрапляє в `resolveCreationSteps`.

**Доказ у браузері** (`work/L02-backgrounds/steps-check.mjs`, чернетка в `localStorage`
`dnd-2024-pers-form`, дворф + воїн 2024):

```
ACOLYTE (Magic Initiate) → ["race","class","classChoices","weaponMastery","background","asi","skills","languages","equipment","name"]
NOBLE_2024 (Skilled)     → ["race","class","classChoices","weaponMastery","background","asi","skills","languages","equipment","name"]
SOLDIER_2024 (Savage Attacker) → ["race","class","classChoices","weaponMastery","background","asi","skills","languages","equipment","name"]
```

Ані `backgroundFeat`, ані `backgroundFeatChoices` немає в жодному випадку.

**Доказ на персонажі** (`work/L02-backgrounds/acolyte.test.ts`, справжня серверна дія
`createCharacter`, форма без `backgroundFeatChoiceSelections` — саме те, що шле UI):

Служитель (Acolyte, дворф-воїн, backgroundId 4536):
```
feats: [{ featId: 3029, name: "MAGIC_INITIATE" }]
persSpells: []      spells: []      FEAT CHOICES: []
skills: [INSIGHT/PROFICIENT, RELIGION/PROFICIENT]
```
Шляхтич (Noble, риса Skilled):
```
feats: [{ engName: "Skilled" }]
skills: [HISTORY/PROFICIENT, PERSUASION/PROFICIENT]   // жодної з трьох на вибір
```

**Правило:** `data/2024/srd/feats.md:37-39` — «You learn two cantrips… Choose a level 1 spell…
Intelligence, Wisdom, or Charisma is your spellcasting ability»; `feats.md:55` — «You gain
proficiency in any combination of three skills or tools of your choice».

**Кого зачіпає:** 6 із 16 походжень —
Magic Initiate: `ACOLYTE`, `SAGE_2024`, `GUIDE_2024` (втрачено 2 замовляння + 1 закл. 1 рівня +
характеристика замовляння);
Skilled: `CHARLATAN_2024`, `NOBLE_2024`, `SCRIBE_2024` (втрачено 3 володіння).

**Чому тести цього не ловлять:** приймальний набір подає вибори повз UI —
`tests/helpers/build-2024-character.ts:105` `backgroundFeatChoiceSelections: await
buildFeatChoiceSelections(originFeat.featId, input.originFeatChoices)`. Тобто шлях
«форма → сервер» перевірено, а «UI → форма» — ні.

**Виправити пізніше не можна:** `updateCharacterAction` таких полів не має (див. 05),
`FeatsSheetManagerModal.tsx` жодного `ChoiceOption` не згадує, а `PersFeatChoice` пишеться лише в
`character-creation.ts:339`, `levelup-persistence.ts:1128`, `snapshots.ts:166`,
`share-actions.ts:805`.

**Підказка:** у `MultiStepForm.tsx:276` брати рису як
`feats.find(f => f.featId === (formData.backgroundFeatId ?? bg?.originFeatId))` — сервер уже
приймає `backgroundFeatChoiceSelections` і сам підставляє `background.originFeatId`
(`character-creation.ts:853`).

---

### L02-backgrounds-02 (P1) — походження не фіксує список заклинань «Посвяченого у магію»

**Правило:** `character-origins.md:36,54,` — Acolyte: `Magic Initiate (Cleric)`; Sage:
`Magic Initiate (Wizard)`; Guide (PHB 2024, `data/2024/normalized/backgrounds.json`):
`Magic Initiate (Druid)`.

**Є:** у базі всі три походження вказують на **одну** рису `MAGIC_INITIATE` (`feat_id=3029`), а
список — вільний вибір із трьох `choice_option` (3379 Клірик, 3380 Друїд, 3381 Чарівник),
нічим не привʼязаний до походження:

```
select b.name, f.name from background b join feat f on f.feat_id=b.origin_feat_id
 where b.ruleset='RULES_2024' and f.name='MAGIC_INITIATE';
 ACOLYTE | MAGIC_INITIATE ; SAGE_2024 | MAGIC_INITIATE ; GUIDE_2024 | MAGIC_INITIATE
```

Каталог при цьому обіцяє конкретику: сторінка `/2024/backgrounds` показує
«Риса походження: Посвячений у магію (Клірик) [Magic Initiate (Cleric)]»
(скріншот `L02-7-catalog-2024.png`) — тобто дані `originFeat.engName` з
`data/2024/normalized/backgrounds.json` знають про «(Cleric)», а база й конструктор — ні.

**Наслідок:** навіть коли крок із 01 зʼявиться, Мудрець зможе взяти список клірика.
**Підказка:** або окремі рядки `feat` під кожен список, або поле-обмежувач на `background`
(наприклад `origin_feat_choice_option_id`), яке конструктор проставляє замість запитання.

---

### L02-backgrounds-03 (P2) — зброя й спорядження походження лягають вільним текстом, а не в інвентар

**Де:** `src/server/db/character-creation.ts:544-551` — `takeStartingItems` кладе все, що не
монета, у `customEquipmentLines` → `Pers.customEquipment`. Гілки `weaponId`/`armorId` є тільки для
**класового** спорядження (`:557-566`).

**Доказ** (`work/L02-backgrounds/soldier.test.ts`):
```
SOLDIER: customEquipment = "Спис x1\nКороткий лук x1\nСтріли x20\nНабір для гри (на вибір) x1\n…"
         weapons: []   armors: []   gp: "14"
CRIMINAL: customEquipment = "Кинджал x2\nІнструменти злодія x1\n…"   weapons: []   gp: "16"
```
**Має бути:** спис, короткий лук і кинджали — зброя, якою персонаж бʼється; у зрілому білдері
вони зʼявляються в інвентарі з атакою. Тут гравець мусить додати їх руками через «Додати зброю».

---

### L02-backgrounds-04 (P2) — конкретний інструмент/набір ніколи не обирається

**Правило:** `character-origins.md:60` (Soldier) — `**Tool Proficiency:** _Choose one kind of_
Gaming Set`; так само Guard, Noble (Gaming Set), Entertainer (Musical Instrument), Artisan
(Artisan's Tools).

**Є:** база тримає лише категорію (`background.tool_proficiencies = {GAMING_SET}`), а в майні
лишається нерозвʼязаний рядок. Створений Солдат:
```
customProficiencies: "…\nІгровий набір\n…"
customEquipment:     "…Набір для гри (на вибір) x1…"
```
Гравець ніде не каже, що це кості чи карти, і на листі лишається «(на вибір)».

---

### L02-backgrounds-05 (P2) — походження й будь-який його вибір не можна змінити після створення

**Де:** `src/lib/actions/update-character.ts:11-30` — уся редагована частина персонажа:
`customProficiencies, customLanguagesKnown, customEquipment, personalityTraits, ideals, bonds,
flaws, backstory, notes, alignment, xp, cp, ep, sp, gp, pp`. Ні `backgroundId`, ні розподілу ASI
походження, ні вибору «пакунок / 50 зм», ні виборів риси походження там немає, і жодна інша
серверна дія їх не пише.

**Наслідок:** помилився з походженням, з розподілом +2/+1 або взяв пакунок замість золота —
персонажа треба створювати заново. Часткова компенсація одна: базові характеристики можна
переписати руками через `ModifyStatModal.tsx:168-187`.

---

### L02-backgrounds-06 (P2) — розподіл ASI походження ніде не зберігається

`prisma/schema.prisma`, модель `Pers`: колонок під `backgroundAsiChoice` немає; бонус запікається
в `str/dex/con/int/wis/cha` у `src/rules/character-creation.ts:91-95`. Наслідок: лист не може
показати «+2 Мудрість від походження», підвищення рівня не може перерахувати, а майбутній екран
редагування походження не матиме з чого відняти старий бонус.

---

### L02-backgrounds-07 (P2) — те саме походження має дві різні українські назви в каталозі й у конструкторі

Каталог `/2024/backgrounds` бере назву з `data/2024/normalized/backgrounds.json`
(`src/lib/backgroundsData.ts:118` `name: b.name`), конструктор — з
`src/lib/refs/translation.ts` (`backgroundTranslations`).

| enum | каталог (скрін `L02-7`) | конструктор (скрін `L02-5`) |
|---|---|---|
| `ACOLYTE` | СЛУЖИТЕЛЬ | Послушник |
| `CHARLATAN_2024` | ШАХРАЙ | Шарлатан 2024 |
| `GUARD_2024` | Вартовий | Охоронець 2024 |
| `SAGE_2024` | Мудрець | Мудрець 2024 |

Плюс усередині конструктора 2024 назви несуть суфікс «2024» («Солдат 2024»), хоча інших редакцій
на тому екрані немає. Це рівно той клас дефекту, від якого застерігає CLAUDE.md: два незалежні
джерела для одного терміна.

---

### L02-backgrounds-08 (P3) — модалка деталей походження в конструкторі не показує того, за чим у 2024 обирають походження

`src/lib/components/characterCreator/modals/BackgroundInfoModal.tsx:57-73` малює: джерело,
навички, інструменти, **«Мови»** (для всіх 16 — «—», бо `languagesToChooseCount = 0`),
**«Особливість»** (поняття 2014, для всіх 16 — «-») і список майна. Немає ні трьох дозволених
характеристик, ні риси походження, ні альтернативи «50 зм». Каталог усе це показує — конструктор,
де рішення й ухвалюється, ні.

---

### L02-backgrounds-09 (P2, дані) — Фермер: володіння «інструментами тесляра» змодельоване як уся категорія ремісничих

`data/2024/normalized/backgrounds.json`, Farmer:
```json
"toolProficiency": {"engText":"Carpenter's Tools","toolCategory":"ARTISAN_TOOLS","isChoice":false,
 "nameUa":"Інструменти тесляра","note":"2014-специфічний enum CARPENTERS_TOOLS відсутній; ARTISAN_TOOLS — найближче наявне значення"}
```
`enum ToolCategory` у `prisma/schema.prisma` справді не має `CARPENTERS_TOOLS`. Наслідок подвійний:
персонаж дістає ширше володіння, ніж дає книга, і на листі побачить «Ремісничі інструменти», тоді
як каталог тому самому Фермеру пише «Інструменти тесляра».

---

### L02-backgrounds-10 (P3) — спорядження походження в каталозі 2024 лише англійською

`src/lib/backgroundsData.ts:135` для 2024 жорстко ставить `equipmentItems: []` і показує
`equipmentEngText`, хоча український `equipmentPackage` лежить у тому самому файлі й уже залитий
у `background.items`. На сторінці це виглядає як розділ «СПОРЯДЖЕННЯ (МОВОЮ ОРИГІНАЛУ) — Choose A
or B: (A) Calligrapher's Supplies, Book (prayers)…» (скрін `L02-7-catalog-2024.png`).

---

### L02-backgrounds-11 (P2) — змішування редакцій на сервері: неперехоплений виняток або мовчазна втрата ASI

Сервер ніде не звіряє `background.ruleset` з `ruleset` персонажа
(`src/server/db/creation-content.ts:14` — `findUnique({ where: { backgroundId } })` без фільтра).

*а)* Походження 2014 + `ruleset: "RULES_2024"` + коректний `backgroundAsiChoice` →
`Error: Invalid Background ASI choice for 2024 rules` (`src/rules/strategies/rules2024.ts:66`)
летить **назовні**: `createCharacter` (`character-creation.ts:66-81`) не має `try/catch`, тож це
500, а не `{ error }` (зонд `soldier.test.ts`, кейс «2014-походження в конструкторі 2024»).

*б)* Те саме без `backgroundAsiChoice` проходить тихо: `findBackgroundAsiStep`
(`src/rules/background-asi.ts:34-36`) повертає `null`, коли `abilityOptions` порожній, тож
`findBackgroundAsiProblem` не бачить проблеми, а `character-creation.ts:93` просто пропускає
бонус — персонаж 2024 створюється без ASI походження взагалі.

Це та сама лінія, що й прийняті BUG-001/002/003 («сервер довіряє UI»), але тут наслідок —
падіння, а не зайвий вибір.

---

## Перевірено й правильно

- **Повнота даних.** Усі 16 походжень 2024 є в базі й у `creator-content-2024.json`; у кожного
  рівно 3 `abilityOptions`, рівно 2 навички, рівно 1 інструмент, `grantsGoldInstead = 50`,
  непорожній `originFeatId`. Звірка проти `data/2024/normalized/backgrounds.json` — збіг по всіх
  полях; чотири походження SRD (Acolyte, Criminal, Sage, Soldier) збігаються з
  `character-origins.md` рядок у рядок (характеристики, навички, інструмент, риса, пакунок, монети).
- **Обидва режими ASI.** `+2/+1` і `+1/+1/+1` реалізовані й у формі
  (`BackgroundAsiForm.tsx`), і в чистому правилі (`src/rules/background-asi.ts`), і в стратегії
  (`rules2024.ts:37-81`). Режим «+1 кожній» одразу проставляє всі три (бо їх рівно три) —
  зайвого кроку немає.
- **Серверна валідація ASI кусається.** Спроба покласти +2 на CHA для Солдата (STR/DEX/CON)
  повертає `{"error":"Розподіл бонусів не відповідає характеристикам обраного походження."}`
  — не мовчазне обрізання. Так само відсутність вибору для 2024 дає «Оберіть бонуси характеристик
  від походження.»
- **Стеля 20.** CUSTOM 19 STR / 20 CON + `+2 STR / +1 CON` дає `{"str":20,"con":20}`
  (`clampAbilityScores`, `character-creation.ts:203-205`, і додатково `Math.min(20, …)` у
  `rules2024.ts:72-77`).
- **2014 кроку ASI походження не має.** `findBackgroundAsiStep` повертає `null` для
  `RULES_2014`; жодне з 75 походжень 2014 не має `abilityOptions`, `grantsGoldInstead` чи
  `originFeatId` — редакції в даних не змішані.
- **Ізоляція редакцій у контенті конструктора.** `creator-content-2014.json` — 75 походжень,
  усі `RULES_2014`; `creator-content-2024.json` — 16, усі `RULES_2024`. У 2024-конструкторі
  2014-походжень не видно, і навпаки.
- **Спорядження A/B.** Вибір «пакунок» дає предмети + монети пакунка (Солдат: `gp = 14`,
  `customEquipment` зі списом і набором цілителя); вибір «50 зм» дає `gp = 50` і **порожній**
  `customEquipment` (Шляхтич). Без вибору за замовчуванням лишається пакунок. Розбір монет —
  `src/rules/starting-money.ts` (`зм/см/мм/ем/пм` → гаманець), решта — у майно.
- **Навички походження.** Лягають рядками `PersSkill` з `PROFICIENT` (Служитель: INSIGHT,
  RELIGION; Шляхтич: HISTORY, PERSUASION). Дублювання з класовими не буває: `SkillsForm.tsx:363-376`
  тримає фіксовані навички походження як уже вибрані й заблоковані, тож класовий список їх не
  пропонує.
- **Інструмент походження** доїжджає до листа текстом у `customProficiencies`
  (`character-creation.ts:652-656`) — «Каліграфічний набір» у Служителя, «Ігровий набір» у Солдата.
- **Риса походження прикріплюється навіть без участі клієнта:** `character-creation.ts:853`
  `validData.backgroundFeatId ?? background.originFeatId` — рядок `pers_feat` є завжди
  (перевірено на Служителі й Шляхтичі). Проблема лише у виборах усередині неї (знахідка 01).
- **Мови 2024.** `src/rules/languages.ts:25-31`: для `RULES_2024` завжди рівно 2 на вибір
  незалежно від лічильників джерел, плюс Загальна — збігається з `character-creation.md:202`.
  Крок «Мови» у конструкторі 2024 присутній (видно в переліку кроків).

## Не перевірено

- Відображення походження, його ASI й риси походження на **листі персонажа** та у **друку**
  (дивився лише запис у базу й код конструктора).
- Чи переживають вибори риси походження **копію персонажа й шеринг** (`share-actions.ts:805`
  копіює `PersFeatChoice`, але порожній набір копіювати нічого).
- Чи можна добрати списки Magic Initiate / Skilled на **підвищенні рівня** — код
  `LevelUpWizard` крок `feat-choices` читав побіжно, доказу немає.
