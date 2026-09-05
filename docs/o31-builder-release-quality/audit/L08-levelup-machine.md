# L08 — Підвищення рівня як автомат станів (обидві редакції)

Оракул: `data/2024/srd/character-creation.md` §Level Advancement (рядки 649–830) і §Multiclassing
(885–1211), `data/2024/srd/classes.md` (таблиці рівнів, Metamagic 7688–7690, Epic Boon 341–343),
`data/2024/srd/feats.md` (109–177, категорії й передумови).

Емпірика: три персонажі зібрані програмно через справжні серверні дії
(`createCharacter` + `levelUpCharacter`) на `spells_test`.
Файли прогону: `scratchpad/audit/work/L08-levelup-machine/fixture-probe.test.ts`,
конфіг `vitest.probe.mjs`, результат `out3.txt`.
Запуск: `bunx vitest run --config <абсолютний шлях>/vitest.probe.mjs` **з кореня репозиторію**
(інакше `tests/setup.ts` не бачить `.env.test`).

Сирий результат прогону (`out3.txt`):

```
fighter: persId=2 creationError=null levelUpErrors=[]
[F lvl5] lvl=5 sub=CHAMPION hp=44/44 scores=19/14/14/8/10/12 pact=0 feats=[DEFENSE|SAVAGE_ATTACKER]
         choices=[Fighting Style 2024 (Defense)] mastery=[GREATSWORD,LONGSWORD,RAPIER,LONGBOW]
  → рівень 6: {"success":true}
[F lvl6] lvl=6 hp=58/58 scores=19/14/16/8/10/12  (18 фіч, дублікатів нема)
знімки воїна: [1,2,3,4,5] — усі isActive:false
warlock: persId=8 … [W lvl5] lvl=5 sub=FIEND_PATRON hp=38/38 pact=2 spells=4 (усі від виду)
         choices=[Agonizing Blast|Devil's Sight|Eldritch Smite|Fiendish Vigor|Pact of the Blade]
skip:    після 3-го без підкласу: {"level":3,"subclassId":null}
         рівень 4: {"success":true} → {"level":4,"subclassId":null}; getLevelUpInfo.needsSubclass=true
ASI-пакет: до={"level":5,"str":19,"dex":14,"con":14} → після={"str":20,"dex":16,"con":16}
```

---

## Знахідки

### L08-levelup-machine-01 — 19-й рівень не дає ні рису, ні епічний дар (P1, 2024)

**Правило.** `classes.md:341` «#### Level 19: Epic Boon — You gain an Epic Boon feat (see "Feats")
or another feat of your choice for which you qualify.» Так у всіх 12 класів.

**Що в коді.** `src/rules/strategies/rules2024.ts:20-30` — предикат є:
```ts
isAbilityScoreIncreaseLevel(progression, level) {
  const epicBoonLevel = progression.epicBoonLevel ?? 19;
  if (level === epicBoonLevel) return false;      // 19 навмисно вилучено з ASI
  …
}
isEpicBoonLevel(progression, level) { return level === (progression.epicBoonLevel ?? 19); }
```
`grep -rn "isEpicBoonLevel" src/` → **три збіги, усі три — визначення** (`rules2024.ts`,
`rules2014.ts`, `strategies/types.ts`). **Жодного виклику.**

Сервер бере не стратегію, а голий предикат:
`src/server/db/levelup-persistence.ts:88` `const isASILevel = isAbilityScoreIncreaseLevel(currentClass ?? {}, mainClassLevelAfter);`
Майстер — свій:
`src/lib/components/levelUp/LevelUpWizard.tsx:579-583` `(selectedClass.abilityScoreUpLevels || []).includes(classLevelAfter)`.

**Дані.** У `spells_test` усі 13 класів 2024 мають `epic_boon_level = 19`, а
`ability_score_up_levels` — без 19 (напр. FIGHTER_2024 `[4,6,8,12,14,16]`, SORCERER_2024 `[4,8,12,16]`).

**Наслідок.** На 19-му рівні майстер не показує ані кроку «Покращення», ані кроку епічного дару.
Персонаж отримує лише хіти й фічу-опис `… : Epic Boon (2024)` (вона є в `class_feature`,
`level_granted = 19`), але **жодної риси**. Це мінус одна риса в кожного персонажа 20-го рівня.

**Виправити.** Додати гілку `isEpicBoonLevel` у `steps` майстра й у `getLevelUpInfo`, з джерелом
вибору `EPIC_BOON` (воно вже описане в `src/rules/repeatable-feats.ts:76`). Книга дозволяє й
«будь-яку рису, для якої ти кваліфікований» — рішення власника, чи звужувати до категорії.

---

### L08-levelup-machine-02 — персонаж може лишитися без підкласу назавжди (P1, both)

**Правило.** SRD 2024, «Tier 1»: «They learn their starting class features and choose a subclass»;
таблиці всіх класів дають підклас на 3-му рівні класу.

**Доказ (емпірика).** Воїн 2024 підвищений 1→2→3→4 **без** `subclassId` у формі:
```
після 3-го без підкласу: {"level":3,"subclassId":null}
рівень 4: {"success":true} → {"level":4,"subclassId":null}
```
Сервер жодного разу не заперечив: у `executeLevelUp` немає перевірки «потрібен підклас».

**Чому це незворотно.** Крок «Підклас» у майстрі зʼявляється лише за **строгої рівності**:
`LevelUpWizard.tsx:567-577`
```ts
const needsSubclass = useMemo(() => {
  const hasSubclassAlready = Boolean(currentSubclassIdForSelectedClass);
  if (hasSubclassAlready) return false;
  return selectedClass.subclassLevel === classLevelAfter;   // 3 === 5 → false
```
Сервер тим часом вважає інакше — той самий персонаж на 4-му рівні:
`getLevelUpInfo.needsSubclass = true` (бо `rules2024Strategy.needsSubclassSelection` — це
`level >= 3`). Тобто **сервер знає, що підклас потрібен, а форма його вже ніколи не запропонує.**
Іншого місця, де можна виставити підклас, немає: `updateCharacterAction`
(`src/lib/actions/update-character.ts:10-29`) редагує лише вільні текстові поля й монети.

**Виправити.** (а) `needsSubclass` у майстрі — `>=`, як на сервері; (б) `executeLevelUp` має
відмовляти, якщо підклас потрібен і не надійшов.

---

### L08-levelup-machine-03 — метамагія чародія 2024 ніде не обирається (P1, 2024, data)

**Правило.** `classes.md:7690`: «#### Level 2: Metamagic … you gain **two Metamagic options** of
your choice»; таблиця класу дає ще по одній на 10-му (`7418`) і 17-му (`7537`).

**Доказ.**
```sql
select count(*) from class_choice_option cco join class c using(class_id)
 where c.eng_name='SORCERER_2024';   -- 0
```
Усі варіанти вибору класу 2024, які взагалі є:
`FIGHTER_2024/Бойовий стиль(10)`, `PALADIN_2024/Бойовий стиль(10)`,
`RANGER_2024/Бойовий стиль(10)`, `WARLOCK_2024/Потойбічні виклики(31)`. Більше нічого.
Фіча `Sorcerer: Metamagic (2024)` у `class_feature` на 2-му рівні є — вибору за нею немає.

**Наслідок.** Чародій 2024 на 2-му рівні проходить майстер без жодного кроку вибору; лист
показує «Метамагія» описом, а які саме дві опції взято — ніде.

---

### L08-levelup-machine-04 — у 2024 немає жодного вибору всередині підкласу (P1, 2024, data)

**Доказ.**
```
prisma.subclassChoiceOption.findMany({ where: { subclass: { class: { ruleset: "RULES_2024" } } } })
→ 0
```
(та сама відповідь SQL-запитом через `subclass_choice_option`).

**Наслідок.** Крок `subclass-choices` майстра (`LevelUpWizard.tsx:844-851`) для 2024 не
зʼявиться ніколи. Разом із ним зникають маневри Майстра бою, вибори кола друїда, домену тощо —
усе, що книга дає «обери N із списку» на рівнях підкласу.

---

### L08-levelup-machine-05 — не реалізовано «мінімум 1 хіт за рівень» (P2, both)

**Правило.** `character-creation.md:775`: «Roll that die, add your Constitution modifier to the
roll, and add the total **(minimum of 1)** to your Hit Point maximum.»

**Код.** `src/rules/levelup.ts:52`
```ts
const hitPointDelta = Math.max(0, toInteger(choices.hitDieIncrease)) + abilityModifier(scores.CON)
  + toughBonus + traitBonus + conModifierDelta * before.level;
```
Клампиться лише сам кидок (`Math.max(0, hitDieIncrease)`), а не сума з модифікатором Статури.
Те саме в UI: `LevelUpHPStep.tsx:172`
`const totalIncrease = hpIncrease + newConMod + toughBonus + retroactiveConHp;`

**Наслідок.** Чарівник/чародій (d6) із Статурою 8 (мод −1) і кидком 1 отримує **+0** замість +1;
із Статурою 6 (−2) максимум хітів **зменшується**. Приріст «мінімум 1» книга гарантує завжди.

---

### L08-levelup-machine-06 — сервер не обмежує пакет ASI: одне підвищення дало +6 (P1, both)

**Правило.** Книга: «you can increase one ability score by 2, or two ability scores by 1 each»
(риса Ability Score Improvement, `classes.md`, кожен клас).

**Доказ (емпірика).** Воїн 5-го рівня, один виклик `levelUpCharacter` з
`customAsi:[{STR,2},{DEX,2},{CON,2}]`:
```
до ={"level":5,"str":19,"dex":14,"con":14}
res={"success":true}
після={"level":6,"str":20,"dex":16,"con":16}
```
Шість очок замість двох (STR обрізано лише стелею 20).

**Код.** `src/server/db/levelup-persistence.ts:240-247` — цикл по масиву без жодної перевірки
сумарного бюджету:
```ts
for (const asi of data.customAsi) {
  …
  if (!Number.isFinite(delta) || (delta !== 1 && delta !== 2)) continue;
  newStats[key] += delta;
}
```
Форма це обмежує, сервер — ні; серверна дія викликається клієнтом напряму.

---

### L08-levelup-machine-07 — сервер не перевіряє передумови риси (P2, both)

`findFeatPackageProblem` (`src/server/db/feat-gates.ts:29-34`) перевіряє **тільки** категорію
(`isFeatCategoryAllowed`) і повторюваність. Рівень, характеристики, наявність заклинальності —
не перевіряються ніде на сервері: `checkFeatPrerequisites`
(`src/lib/logic/prerequisiteUtils.ts:156-175`, там **є** перевірка `prerequisiteLevel`)
викликається лише з `BackgroundFeatsForm.tsx` і `FeatsForm.tsx` — клієнтських форм.

Дані для перевірки в базі є: у 2024 `GENERAL` — 43 риси з `prerequisite_level = 4`,
`EPIC_BOON` — 12 із `prerequisite_level = 19`. Джерело `CLASS_ASI` у
`src/rules/repeatable-feats.ts:73` описане як `"any"`, тож навіть категорійний гейт епічний дар
на 4-му рівні не спинить.

---

### L08-levelup-machine-08 — підвищення рівня не оновлює лічильники використань (P2, both)

Слоти заклинань при підвищенні рівня доростають (`applySpellSlotMaximumDelta` у
`src/rules/levelup.ts:64`), а `pers_feature.uses_remaining` і `pers_resource_pool.uses_remaining`
не чіпаються: у `levelup-persistence.ts` слова `usesRemaining` немає взагалі
(`grep -n usesRemaining src/server/db/levelup-persistence.ts` → порожньо).

**Наслідок.** Воїн, який витратив обидва Second Wind, на 4-му рівні дістає третє використання
лише після відпочинку; варвар із витраченими люттями так само. Поведінка розходиться зі слотами
й з тим, що робить D&D Beyond.

---

### L08-levelup-machine-09 — відкотити рівень або виправити вибір неможливо (P2, both, missing-system)

- Знімок робиться перед кожним підвищенням: прогін дав `[{snapshotLevel:1},{2},{3},{4},{5}]`
  для воїна 6-го рівня, усі `isActive:false`.
- Серверна дія відновлення **існує, але мертва**: `grep -rn "activateSnapshot" src/` → лише
  визначення в `src/lib/actions/snapshot-actions.ts:35`. Жодного виклику.
- Сама дія й так не є відкотом: `activatePersSnapshot` (`src/server/db/snapshots.ts:246`) робить
  `pers.update({ data: { isActive: true } })` — вмикає **копію**, не повертає стан у оригінал.
- Єдине, що є в UI, — кнопка «Скопіювати» в `SnapshotHistoryModal.tsx:72-84`
  (`duplicatePers(snapshotId)`), яка створює **нового** персонажа з новим `persId`. Шеринг,
  тека, бастіон, посилання на лист лишаються на старому, помилково піднятому персонажі.
- Виправити помилковий вибір (не той підклас, риса, виклик, бойовий стиль) теж нічим:
  `updateCharacterAction` редагує лише текстові поля.

---

### L08-levelup-machine-10 — знімок пишеться поза транзакцією підвищення (P2, both)

`levelup-persistence.ts` — усередині `prisma.$transaction(async (tx) => { … })` першим рядком
стоїть `await createCharacterSnapshot(persId);`, а `createPersSnapshot`
(`src/server/db/snapshots.ts:18-40`) працює **глобальним** клієнтом і відкриває **власну**
`prisma.$transaction`. Тобто знімок не атомарний із підвищенням: якщо зовнішня транзакція
відкотиться, у списку історії лишиться зайвий знімок; плюс вкладена транзакція під час
утримання блокувань зовнішньої — джерело затримок і потенційних таймаутів.

---

### L08-levelup-machine-11 — рівень не пропонує ні замовлянь, ні заклинань, ні заміни (P2, both, missing-system)

Кроків майстра шістнадцять (`LevelUpWizard.tsx:797-960`) — жодного про заклинання.
`grep -rn "replaceSpell\|spellReplacement\|заміна заклинан" src/` → порожньо.

Правило 2024, яке нічим не покрите: `classes.md:882` (бард) «_Changing Your Prepared Spells._
Whenever you gain a Bard level, you can replace one spell on your list with another Bard spell…» —
так само чародій, чорнокнижник, чарівник. Для клірика/друїда/паладина/слідопита заміна привʼязана
до тривалого відпочинку, а не до рівня.

**Доказ наслідку.** Чорнокнижник 2024, проведений майстром 1→5, має `spells=4`, і всі чотири —
від виду (`Chill Touch`, `Thaumaturgy`, `False Life`, `Ray of Enfeeblement`). Класових замовлянь і
підготовлених заклинань — нуль. Гравець мусить додавати їх руками на листі.

Дотичне до KR27.7 (`src/rules/spell-preparation-2024.ts`, `AddSpellDialog.tsx`), над яким працює
паралельна сесія, — сам крок майстра до тих файлів не належить.

---

### L08-levelup-machine-12 — у репозиторії другий, паралельний майстер рівнів (P2, both)

`src/server/db/legacy-levelup-actions.ts` (348 рядків, `'use server'`, з
`const ACTIVE_RULESET: Ruleset = "RULES_2014"` захардкодженим на рядку 7) реекспортований як
серверні дії у `src/app/actions/level-up.ts` і споживається `src/components/level-up/*`
(`LevelUpWizard.tsx`, `LevelUpWizardMulticlass.tsx`, `StepRenderer.tsx`, `useLevelUpManager.ts`)
та `src/store/character-store.ts`. Жоден маршрут ці компоненти не рендерить
(`grep -rn "components/level-up" src/` дає лише внутрішні імпорти), тож зараз шлях мертвий — але
це другий запис у ті самі таблиці з іншими правилами, який будь-хто може випадково під'єднати.

---

### L08-levelup-machine-13 — `getLevelUpInfo` рахує кроки за чужим рівнем (P3, both)

`levelup-persistence.ts:86-91`:
```ts
const mainClassLevelAfter = findMainClassLevel(pers) + 1;
const needsSubclass = rulesStrategy.needsSubclassSelection(currentClass ?? {}, Boolean(pers.subclassId), mainClassLevelAfter);
const isASILevel = isAbilityScoreIncreaseLevel(currentClass ?? {}, mainClassLevelAfter);
const newClassFeatures = (currentClass?.features ?? []).filter((f) => f.levelGranted === nextLevel);
```
Три різні лінійки в чотирьох рядках: `needsSubclass`/`isASILevel` — за рівнем **основного**
класу (навіть коли гравець підвищує побічний), `newClassFeatures` — за рівнем **персонажа**
(а фічі класу відкриває рівень класу, як правильно робить `executeLevelUp:711-720`).
Майстер сьогодні перелічує все сам, тож користувач цього не бачить; поля лишаються пасткою для
наступного споживача (їх повертає публічна серверна дія `src/lib/actions/levelup.ts:7`).

---

## Перевірено й правильно

- **Хіти на рівень і ретроактивна Статура.** Воїн-драконороджений (d10, CON 14) на 5-му має
  `maxHp = 44` = 10+2 + 4×(6+2) ✓. Підвищення 5→6 з ASI CON +2 (14→16): `44 → 58`, тобто
  6+2 за новий рівень плюс 1×5 ретроактивно = точно приклад SRD «character reaches level 8 …
  Hit Point maximum then increases by 8, in addition to the Hit Points gained for reaching
  level 8» (`character-creation.md:809`). `currentHp` рухається разом із `maxHp`.
- **Стеля 20-го рівня.** `nextLevel > 20 → "Max level reached"` двічі: у `getLevelUpInfo:76` і на
  вході `executeLevelUp:167`.
- **Фічі класу — за рівнем КЛАСУ, риси виду — за рівнем ПЕРСОНАЖА.** `executeLevelUp:711-731`
  (`cf.levelGranted === classLevelAfter`) проти `readMissingSpeciesGrants(pers, nextLevel)`.
  У прогоні це видно: `Dragonborn: Draconic Flight (2024)` зʼявився саме на 5-му.
- **Дублікатів немає.** За шість рівнів жодна фіча не задвоїлася (перевірка `DUP` у знімку
  порожня; захист — `featureIdsToCreate` фільтрує наявні + `@@unique([persId, featureId])`).
  Риси теж по одному рядку: `feats=[DEFENSE|SAVAGE_ATTACKER]` на 5-му й на 6-му.
- **Старі вибори переживають наступні рівні.** Чорнокнижник на 5-му має всі пʼять виборів
  (`Pact of the Blade` з 1-го, два з 2-го, два з 5-го) — рівно стільки, скільки дає таблиця
  класу 2024 (1 / 3 / 5 виклики на рівнях 1 / 2 / 5).
- **Пактові слоти.** Чорнокнижник 5-го рівня: `pact=2`, звичайні слоти `[0,…]` ✓.
- **Майстерність зброї.** Ємність 3 на 1–3 рівнях, 4 з 4-го (`weapon_mastery_progression`
  FIGHTER_2024 `[3,3,3,4,…]`); після 4-го в базі рівно чотири рядки
  `mastery=[GREATSWORD,LONGSWORD,RAPIER,LONGBOW]`, набір заміщується цілком
  (`replacePersWeaponMastery` у транзакції, після запису рівня).
- **Extra Attack на 5-му** — `Fighter: Extra Attack (2024)` у списку фіч після 5-го рівня.
- **Валідація виборів на сервері серйозна.** `validateChoiceSelections` перевіряє: опція
  доступна на цьому рівні класу, ще не належить персонажу, кількість у групі точно дорівнює
  правилу пулу, у групі немає повторів, опція з тієї самої групи; для викликів 2024 —
  рівень і передумову-виклик через `findFirstUnmetInvocationPrerequisite`.
- **Заміни (invocation / fighting style / maneuver)** перевіряють, що те, що знімають, справді
  належить персонажу, що обидві опції з однієї групи й що нова ще не взята; фічі старої опції
  видаляються, нової — додаються в тій же транзакції.
- **Мультикласовий вхід 2024 двосторонній.** `findMulticlassEntryProblem`
  (`src/rules/multiclass-entry.ts:39-50`) перевіряє 13+ і в новому класі, і в усіх наявних —
  рівно `character-creation.md:891`; для 2014 звужено навмисно, з поясненням у шапці файлу.
  Форма викликає **ту саму** функцію (`LevelUpWizard.tsx:686-694`), тож форма й сервер не
  розійдуться.
- **Скорочений пакет володінь при вході в новий клас** — `findMulticlassProficiencies`
  застосовується лише коли `levelUpPath === "MULTICLASS"` (`levelup-persistence.ts:1136-1140`),
  що відповідає `character-creation.md:909`.
- **Ретроактивна Статура поза підвищенням рівня** (модалка характеристики на листі) рахується
  правильно: `findConstitutionHitPointUpdate` → `findRetroactiveConstitutionHitPoints(…, level)`
  у `src/server/db/bonus-actions.ts:456-473`.
- **Знімок перед кожним підвищенням справді створюється** (5 знімків у персонажа 6-го рівня).

## Не перевірено

- Рівні 7–20 наживо (кожне підвищення пише повну копію персонажа; 19 підвищень × 3 персонажі —
  задорого для цієї сесії). Висновки про 19-й і 20-й рівні зроблено з коду й даних, не з прогону.
- Мультикласові переходи наживо — їх міряє окрема лінза й
  `tests/rules-2024/multiclass-fifteen.test.ts` (файл у роботі паралельної сесії).
- Поведінка майстра в браузері (кроки, блокування «Далі») — усе вище доведено кодом і
  серверними діями; візуальна перевірка на :3100 не робилася.
