# L07-spellcasting — заклинацтво 2024

Оракул: `data/2024/srd/classes.md` (таблиці класів, розділи Spellcasting, списки заклинань,
підкласи), `data/2024/srd/character-creation.md` §Multiclassing→Spellcasting, `data/2024/srd/feats.md`.
База: `spells_test`. Робочі файли: `scratchpad/audit/work/L07-spellcasting/`.

Що прогнав:
- парсер таблиць SRD (`parse-srd-tables.mjs`, `compare.mjs`, `spelllists.mjs`) — 8 класів,
  колонки Cantrips / Prepared Spells / Spell Slots / Pact;
- запити до `spells_test` (`q.mjs`) — `spell_classes`, `class`, `subclass`, `feature`,
  `_FeatureToSpell`, `class_feature`, `subclass_feature`, `feat_choice_option`;
- програмна збірка чотирьох персонажів 2024 до 5-го рівня через справжні серверні дії
  (`probe.test.ts` + власний `vitest.l07.mts`), фікстури 02 (клірик), 03 (чарівник),
  07 (паладин), 09 (чорнокнижник); результат — `probe-out.json`;
- перевірка чистої функції `calculateCasterLevel` (`caster.ts`).

---

## Знахідки

### L07-spellcasting-01 — P1 · data · 2024
**Підкласові «завжди підготовлені» заклинання 2024 не існують у даних узагалі.**

Правило (`data/2024/srd/classes.md:2970`, Life Domain): «When you reach a Cleric level specified in
the Life Domain Spells table, you thereafter always have the listed spells prepared» — рівень 3:
Aid, Bless, Cure Wounds, Lesser Restoration; рівень 5: Mass Healing Word, Revivify.
Те саме `:6008` (Oath of Devotion — рівень 3 Protection from Evil and Good, Shield of Faith;
рівень 5 Aid, Zone of Truth) і `:9751` (Fiend — рівень 3 Burning Hands, Command, Scorching Ray,
Suggestion; рівень 5 Fireball, Stinking Cloud).

Доказ (база):
```sql
select count(*) from feature f
  join "_FeatureToSpell" fs on fs."A"=f.feature_id
  join subclass_feature sf on sf.feature_id=f.feature_id
  join subclass s on s.subclass_id=sf.subclass_id
 where s.ruleset='RULES_2024';
-- 0
select count(*) from "_SubclassExpandedSpells";  -- 0
```
Фіча-носій у базі є, але порожня:
`Life Domain: Life Domain Spells (2024)` (level_granted 3),
`Oath of Devotion: Oath of Devotion Spells (2024)` (3),
`Circle of the Land: Circle of the Land Spells (2024)` (3) — жодного звʼязку зі заклинанням.

Доказ (зібрані персонажі, `probe-out.json`):
- `02-dwarf-cleric-farmer` — Клірик 5 / LIFE_DOMAIN, `persSpells = []` (очікувано 6 рядків);
- `07-human-paladin-noble` — Паладин 5 / OATH_OF_DEVOTION, `persSpells = []` (очікувано 4);
- `09-chthonic-tiefling-warlock-charlatan` — Чорнокнижник 5 / FIEND_PATRON, у списку лише
  4 заклинання **спадщини тифлінга**, жодного від патрона (очікувано ще 6).

Відтворення: `bunx vitest run --config work/L07-spellcasting/vitest.l07.mts` (з кореня репо).

Очікувано: рядки `pers_spell` з `isPrepared=true`, `excludeFromPreparedCount=true` і бейджем
підкласу (механізм уже є — так робляться заклинання видів, `buildSpeciesPersSpellRows`).
Фактично: нуль рядків, гравець мусить додавати їх руками, і тоді вони зʼїдають ліміт підготовлених.

Куди правити: `data/2024/normalized/subclasses.json` + сід підкласів (звʼязок feature→spell),
далі надання при створенні/підвищенні поруч із `findGrantedSpells`.

---

### L07-spellcasting-02 — P1 · data · 2024
**Класові «завжди підготовлені» заклинання 2024 не надаються.**

Правило:
- `classes.md:6416` (Слідопит, рівень 1, Favored Enemy): «You always have the _Hunter's Mark_
  spell prepared.»
- `classes.md:5659` (Паладин, рівень 2, Paladin's Smite): «You always have the _Divine Smite_
  spell prepared.»
- `classes.md:5692` (Паладин, рівень 5, Faithful Steed): «You always have the _Find Steed_ spell
  prepared.»
- `classes.md:3517` (Друїд, рівень 1, Druidic): «you always have the _Speak with Animals_ spell
  prepared.»

Доказ (база):
```sql
select f.eng_name, cf.level_granted,
       (select count(*) from "_FeatureToSpell" x where x."A"=f.feature_id) as spells
  from class c join class_feature cf on cf.class_id=c.class_id
  join feature f on f.feature_id=cf.feature_id
 where c.ruleset='RULES_2024'
   and f.eng_name in ('Ranger: Favored Enemy (2024)','Paladin: Paladin''s Smite (2024)',
                      'Paladin: Faithful Steed (2024)','Druid: Druidic (2024)');
-- усі чотири: spells = 0
```
Ці заклинання **є** у відповідних списках класу (`Слідопит|Hunter's Mark`, `Паладин|Divine Smite`,
`Паладин|Find Steed`, `Друїд|Speak with Animals` — усі OK у вибірковій звірці), тобто гравець може
додати їх руками, але вони підуть у ліміт підготовлених і не будуть позначені як завжди готові.

---

### L07-spellcasting-03 — P1 · data · 2024
**Безкоштовні застосування класових фіч 2024 не задані — Р38 виконано лише для рис.**

Р38 (`docs/DECISIONS.md:1623`): «безкоштовне застосування раз на довгий відпочинок — це фіча з
обмеженими використаннями (`limitedUsesPer` / `usesCount`)». Для риси це справді так
(`Magic Initiate: Wizard list (2024)` → LONG_REST, 1). Для класових фіч — ні.

Правило: `classes.md:6416` — Слідопит кастує Hunter's Mark **двічі** без слота, і число росте за
колонкою Favored Enemy таблиці Слідопита: `2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6`.
`classes.md:5659` — Паладин кастує Divine Smite один раз без слота на довгий відпочинок.

Доказ (база): у `Ranger: Favored Enemy (2024)`, `Paladin: Paladin's Smite (2024)`,
`Paladin: Faithful Steed (2024)` `limited_uses_per = NULL`, `uses_count = NULL`.
Отже, ані на листі, ані у відпочинку цих використань немає.

---

### L07-spellcasting-04 — P1 · missing-system · 2024
**Риса «Посвячений у магію» 2024 не дає заклинань і не питає, які саме.**

Правило (`data/2024/srd/feats.md:37-39`): «You learn two cantrips of your choice from the Cleric,
Druid, or Wizard spell list… Choose a level 1 spell from the same list… You always have that spell
prepared. You can cast it once without a spell slot…».

Доказ: `feat_choice_option` для `MAGIC_INITIATE` (RULES_2024) містить рівно одну групу —
«Список заклинань» з трьома опціями (Cleric/Druid/Wizard). Кроку вибору замовлянь і заклинання
немає ні в конструкторі (`creation-step-resolver.ts` не має кроку заклинань узагалі), ні в майстрі
підвищення (`LevelUpWizard.tsx`, кроки: path, summary, subclass, class-choices, subclass-choices,
asi, feat-choices, infusions, weapon-mastery, skills, expertise, languages, optional-features,
replacements, hp, confirm).
Зібраний `03-high-elf-wizard-sage` (риса походження MAGIC_INITIATE зі списком Wizard) на 5-му
рівні має **тільки** три заклинання родоводу; від риси — жодного.

Наслідок: гравець додає їх вручну як `MANUAL`, вони не мають `isPrepared`, не мають
`excludeFromPreparedCount`, тобто зʼїдають ліміт підготовлених класу.

---

### L07-spellcasting-05 — P2 · data · 2024
**У «Посвяченого у магію» 2024 характеристика замовляння прибита до списку, а книга дає вибір.**

Правило (`feats.md:37`): «Intelligence, Wisdom, or Charisma is your spellcasting ability for this
feat's spells (**choose when you select this feat**)».

Доказ (база):
```
group_name «Список заклинань»: Magic Initiate 2024 (Cleric) → effect_ability WIS
                                Magic Initiate 2024 (Druid)  → effect_ability WIS
                                Magic Initiate 2024 (Wizard) → effect_ability INT
```
Тобто вибір списку одночасно фіксує характеристику — це правило **2014**, у 2024 вибір вільний
(наприклад, бард із «Посвяченим у магію (Чарівник)» має право чаклувати Харизмою).
`findFeatSources` (`src/rules/spell-sources.ts:172`) бере `effectAbility` як є, тому помилка
доїжджає до джерела заклинань.

---

### L07-spellcasting-06 — P1 · missing-system · 2024
**Характеристика замовляння за джерелом порахована, але ніде не показана: лист має одну КС на все.**

Правило (`character-creation.md:939`): «Each spell you prepare is associated with one of your
classes, and you use the spellcasting ability of that class when you cast the spell».
Референс проєкту (`src/rules/spell-sources.ts:5-11`) описує те саме для 2024.

Доказ:
- `src/lib/components/characterSheet/slides/MagicSlide.tsx:163`
  `const spellcastingAbility = localPers.class?.primaryCastingStat;` — одна характеристика на
  весь лист; з неї рахуються обидві картки «Бонус атаки Заклинаннями» (`:673`) і
  «СК» (`:685`).
- `loadPersSpellSources` (`src/server/db/spell-sources.ts:11`) не має **жодного** споживача в
  `src/` — `grep -rn "loadPersSpellSources" src` дає лише сам файл. Тобто KR18.4 порахував
  джерела, але на лист вони не потрапляють.
- Зібраний `03-high-elf-wizard-sage` має три джерела
  (`WIZARD_2024/INT`, `Ельфійський родовід/INT`, `MAGIC_INITIATE/INT`) — лист покаже одне число.
  Досить обрати родоводу іншу характеристику (крок «Опції раси» це дозволяє), і КС заклинання
  родоводу на листі стане неправильною.
- PDF має ту саму ваду в мʼякшій формі: `src/server/pdf/generateCharacterPdf.ts:748` бере
  `pers.class?.primaryCastingStat`, інакше перший мультиклас із характеристикою.

---

### L07-spellcasting-07 — P1 · bug · both
**Третинний заклинач не має характеристики замовляння на листі: КС = 8, атака = +0.**

`MagicSlide.tsx:163` читає лише `class.primaryCastingStat`. У базі `class.primary_casting_stat`
для `FIGHTER_2014/2024` і `ROGUE_2014/2024` — `NULL`, а INT лежить на підкласі:
```sql
select name, ruleset, spellcasting_type, primary_casting_stat from subclass
 where name in ('ELDRITCH_KNIGHT','ARCANE_TRICKSTER');
-- усі чотири рядки: THIRD / INT
```
`MagicSlide.tsx:166-172` при `!spellcastingAbility` повертає `attack = 0` і `DC = 8` — і ці
значення все одно малюються картками (`:673`, `:685`), без жодного «—».
Те саме джерело: `findClassSources` (`src/rules/spell-sources.ts:125`) фільтрує тільки класи, тож
Лицар-Чаклун 2024 не отримує навіть рядка джерела.

Порівняння: `spellcasting-progression.ts` і `spell-preparation-2024.ts` підклас **враховують**
(рядок лічильників для Лицаря-Чаклуна є), тобто розходяться два шари одного листа.

---

### L07-spellcasting-08 — P1 · bug · both
**У майстрі підвищення рівня риси з передумовою «має чаклунство» недоступні третинному заклиначу.**

`src/lib/components/levelUp/LevelUpWizard.tsx:313-325`:
```ts
const hasSpellcasting = useMemo(() => {
    const main = (pers as any)?.class?.spellcastingType …
    if (main && main !== SpellcastingType.NONE) return true;
    const multi = …multiclasses…map(m => m?.class?.spellcastingType);
    return multi.some(t => t && t !== SpellcastingType.NONE);
```
— підклас не перевіряється. Конструктор те саме місце робить правильно:
`src/lib/components/characterCreator/MultiStepForm.tsx:235-242` перевіряє клас **і** підклас.

Наслідок: Воїн 4 (Лицар-Чаклун, підклас із 3-го рівня) на кроці ASI не може взяти
`WAR_CASTER`, `SPELL_SNIPER`, `ELEMENTAL_ADEPT` — три риси 2024 з
`prerequisite_spellcasting = true` (перевірено запитом до `feat`), хоча за книгою кваліфікується.

---

### L07-spellcasting-09 — P2 · bug · 2024
**Картка класу показує Паладину/Слідопиту 2024 таблицю слотів 2014: на 1-му рівні «слотів немає».**

SRD 2024, таблиця Паладина (розібрано з `classes.md`): рівень 1 → 2 слоти 1-го рівня, 2 підготовлені
заклинання. Слідопит — так само.

`src/lib/components/characterCreator/modals/ClassInfoModal.tsx:195-199` для `spellcastingType === "HALF"`
віддає `SPELL_SLOT_PROGRESSION.HALF`, а `src/lib/refs/static.ts:31` має `1: [0,0,…]`
(правило 2014). Окремий костур є лише для `ARTIFICER_2014` (`ClassInfoModal.tsx:179, 196-198`),
для 2024 його немає; `specialSpellSlotProgression` у `PALADIN_2024` — `null` (перевірено в
`src/lib/generated/creator-content-2024.json` і в базі).

Сам персонаж рахується правильно: `getInitialSpellSlots` іде через `calculateCasterLevel`
(округлення вгору), і `calculateCasterLevel({level:1, PALADIN_2024, HALF}, "RULES_2024")` = 1 →
`FULL[1] = [2,0,…]`. Тобто розходиться саме вітрина, за якою гравець обирає клас.

---

### L07-spellcasting-10 — P2 · missing-system · both
**Немає вибору заклинань — ні при створенні, ні при підвищенні; книга чарівника ніде не рахується.**

`creation-step-resolver.ts` не містить кроку заклинань (жодного `grep` на `spell`);
`LevelUpWizard.tsx` — так само (крок `replacements` стосується опційних класових фіч, не заклинань).
Тобто клірик 5-го рівня виходить із конструктора з нулем заклинань і нулем замовлянь
(підтверджено: `02-dwarf-cleric-farmer`, `persSpells = []`), і мусить набивати їх на листі вручну.

Книга чарівника 2024 (`classes.md:10219–10221`: три замовляння і шість заклинань 1-го рівня на 1-му
рівні, +2 за рівень) окремою величиною не існує: `spellcasting-progression.ts:50` додає лише
текстову примітку `"+ книга заклинань"`, числа немає. Лист показує «Заклинань: N» без стелі,
тому гравець не має орієнтира ні на книгу, ні на її наповнення при підвищенні.

---

### L07-spellcasting-11 — P3 · data · both
**На листі слоти заклинань названі «Комірки» — це прямо заборонений термін.**

`docs/DECISIONS.md:768` і дослівна цитата власника на `:773`: «ніяких чарунок, слоти заклинань —
правильно»; канон — **слот заклинань**.

Носії:
- `MagicSlide.tsx:694` — заголовок блока «Комірки»;
- `MagicSlide.tsx:712, 823, 831` — підказки «керувати комірками», «рівень комірки»,
  «керувати комірками Магії пакту»;
- `src/lib/refs/translation.ts:1674` `spellSlotsRestored: "Комірки заклять відновлено"`;
- `translation.ts:1683` «…комірки заклять та здібності»;
- `src/lib/actions/spell-slots.ts:42, 103` «Некоректний рівень комірки».

Там же `MagicSlide.tsx:684`: «СК (**Складість** Ряткидка)» — друкарська помилка в
«Складність», і сама абревіатура «СК» розходиться з «КС», яку вживає решта проєкту.

---

### L07-spellcasting-12 — P2 · bug · 2024
**Ліміт підготовлених у мультикласі складається в одне число замість окремого за класом.**

Правило (`character-creation.md:937`): «You determine what spells you can prepare for each class
individually, as if you were a single-classed member of that class».

`MagicSlide.tsx:275-289` (`preparedSpellsLimit`) підсумовує значення **всіх** рядків із міткою
«можна підготувати» в одне `total` і малює «Підготовлено: X / total» (`:500-505`).
Для Слідопита 4 / Чародія 3 книга дає «5 заклинань Слідопита» і окремо «6 заклинань Чародія»
(приклад із самого SRD), а лист покаже одну стелю 11 — тобто дозволить готувати 11 заклинань
Чародія. Самі числа рядків (`spellcasting-progression.ts` → `SPELL_PREPARATION_2024`) правильні;
неправильне саме склеювання.

Рядок стелі до того ж лежить у **згорнутому** блоці (`MagicSlide.tsx:483`,
`defaultOpen={false}`), тобто типовий гравець ліміту не бачить взагалі.

---

## Перевірено й правильно

1. **Таблиці підготовлених заклинань 2024 збігаються з SRD побайтово.** Розібрав HTML-таблиці всіх
   восьми заклинацьких класів із `classes.md` і звірив із `SPELL_PREPARATION_2024`
   (`src/rules/spell-preparation-2024.ts`): колонки Cantrips, Prepared Spells і виведений
   maxSpellLevel збігаються для Барда, Клірика, Друїда, Паладина, Слідопита, Чародія,
   Чорнокнижника, Чарівника — усі 20 рівнів кожної. Файл in-flight (KR27.7), тому лише читав.
2. **Слоти за рівнем.** `SPELL_SLOT_PROGRESSION.FULL` = таблиця Чарівника SRD 2024 (усі 20 рядків).
   Таблиця Паладина/Слідопита 2024 **повністю відтворюється** через `calculateCasterLevel` з
   округленням угору: 1→[2], 2→[2], 3→[3], 5→[4,2], 9→[4,3,2], 13→[4,3,3,1], 17→[4,3,3,3,1],
   20→[4,3,3,3,2] — усе збіглося.
3. **Магія пакту.** `SPELL_SLOT_PROGRESSION.PACT` = колонки Spell Slots / Slot Level таблиці
   Чорнокнижника SRD 2024, усі 20 рівнів. Зібраний Чорнокнижник 5 має `currentPactSlots = 2`,
   `casterLevel = 0`, `pactLevel = 5`, стандартні слоти нульові — точно за книгою.
4. **Рівень заклинача мультикласу (Р41).** Перевірив функцією:
   Паладин 5/Чарівник 3 (2024) → 6, той самий у 2014 → 5; Пройдисвіт 4 (Таємний)/Бард 4 (2024) → 5
   (третинні вниз); Паладин 1 (2024) → 1, Паладин 1 (2014) → 0;
   Чорнокнижник 3/Чародій 3 → `casterLevel 3`, `pactLevel 3` окремо. Асиметрія збережена.
5. **Списки заклинань 2024 за класом.** Розібрав усі вісім розділів «`<Class>` Spell List» із SRD
   (Бард 129, Клірик 109, Друїд 124, Паладин 38, Слідопит 48, Чародій 138, Чорнокнижник 72,
   Чарівник 217 записів) і звірив із `spell_classes` (ruleset RULES_2024). **Жодного пропуску**:
   усі SRD-заклинання є в базі; єдині «розбіжності» — назви, які SRD 5.2.1 зачистив від власних
   імен (Tasha's Hideous Laughter → Hideous Laughter, Bigby's Hand → Arcane Hand, Leomund's Tiny
   Hut → Tiny Hut) і регістр «Protection **f/F**rom». База має ще 66 записів понад SRD — це
   PHB-2024 поза SRD (Compelled Duel, Wrathful Smite, Hunger of Hadar, Armor of Agathys, Summon *,
   Toll the Dead, Mind Sliver…), тобто повніше, а не хибно.
6. **Вибіркова звірка 25 заклинань** (те, про що просив бриф): Паладин має Compelled Duel,
   Wrathful Smite, Divine Smite, Find Steed; Слідопит — Hunter's Mark; Бард — Starry Wisp і
   Vicious Mockery; Чародій — Sorcerous Burst; Чарівник — True Strike і Fire Bolt; Друїд —
   Speak with Animals. Fireball і Scorching Ray у списку Чорнокнижника **відсутні** — і це
   правильно, вони приходять лише від патрона Почвари.
7. **Ізоляція редакцій у списках.** `select count(*) from spell_classes sc join spell s … where
   sc.ruleset='RULES_2014' and s.ruleset<>'RULES_2014'` → 0. І навпаки: усі 1 066 рядків 2024
   вказують на заклинання `RULES_2024`. Заклинання 2014 у списки 2024 не течуть.
8. **Заклинання видів 2024 надаються правильно.** `buildSpeciesPersSpellRows`
   (`src/server/db/species-level-grants.ts:80-93`) кладе `isPrepared: true`,
   `excludeFromPreparedCount: true`, `excludeFromKnownCount: true` і бейдж джерела — тобто вони
   поза лімітом, як і має бути. Перевірено на зібраних персонажах: Високий ельф 5 має
   Prestidigitation / Detect Magic / Misty Step (рівні персонажа 1/3/5), Хтонічний тифлінг 5 —
   Thaumaturgy, Chill Touch, False Life, Ray of Enfeeblement. Усі чотири/три рядки з
   `exPrep = true`.
9. **Безкоштовне застосування риси (Р38)** для «Посвяченого у магію» 2024 оформлене саме так, як
   вирішив власник: `Magic Initiate: Cleric/Druid/Wizard list (2024)` мають
   `limited_uses_per = LONG_REST`, `uses_count = 1`, окремого рядка заклинання немає.
10. **Ритуали.** Прапорець `hasRitual` є в даних, показується на листі
    (`shared/SpellListGroup.tsx:202, 287, 378`) і фільтрується в каталозі
    (`spells-client.tsx:398`). Detect Magic родоводу приїхав із `ritual = "так"`.
11. **Числа лічильників для зібраних персонажів** збіглися з SRD до одиниці:
    Клірик 5 — слоти [4,3,2], замовлянь 4, підготовлених 9; Чарівник 5 — [4,3,2], 4, 9;
    Паладин 5 — [4,2], 0, 6; Чорнокнижник 5 — пакт 2 слоти 3-го рівня, замовлянь 3,
    підготовлених 6.
12. **Третинні заклиначі в лічильниках** (`THIRD_CASTER_PREPARATION_2024`) ключуються по підкласу
    `ELDRITCH_KNIGHT` / `ARCANE_TRICKSTER` без суфікса редакції — і це збігається з базою:
    ці підкласи справді існують у двох рядках із тим самим `name` і різним `ruleset`.

## Не перевірено

- Браузерна перевірка листа (`:3100`) — персонажі мого прогону були витерті чужим
  інтеграційним прогоном (`TRUNCATE` на старті файлу), а перезбирати заради скріншота не
  вистачило бюджету. Усі числа взято з бази й із серверних дій, не з екрана.
- Друк/PDF заклинань далі рядка 748 `generateCharacterPdf.ts`.
- `AddSpellDialog.tsx` (in-flight, KR27.7) — читав лише імпорти, поведінку не міряв.
- Заклинальні інвокації Чорнокнижника 2024 (Pact of the Tome, Armor of Shadows) — суміжна лінза.
