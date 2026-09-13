# Реєстр знахідок аудиту O31

Згенеровано з `audit/raw-findings.json` — сирої видачі 26 агентів аудиту 2026-09-04.

Позначка вердикту: `✓` скептик підтвердив, `↓` понизив серйозність, `✗` спростував, `·` не встиг перевірити (аудит зупинено на ліміті).

Повний доказ кожної знахідки — у звіті лінзи або персони в `audit/<мітка>.md`.

Статус роботи над знахідкою стоїть у її розділі окремим рядком під «Рівень»: `✅` — закрито, `🔴` — свідомо не закрито з названою причиною. Знахідка без такого рядка ще не бралася в роботу.

**2026-09-06, [KR31.12](kr31.12-2014-regressions.md):** пройдено 17 знахідок редакції 2014 — **15 закрито**, 2 лишено відкритими за рішенням власника (`L17-known-registries-07` і `-08`: повна правка дубльованих ASI-груп винесена в окрему ціль після релізу 2024). Дві з них змінили формулювання після перевірки: `L13-wildshape-03` (оракул автора — НІП-статблок, а не PHB; власник обрав повний RAW, а не вужчий варіант автора) і `L17-known-registries-07` (рецепт автора знищив би робочу групу Resilient). `P4-regression-2014-07` більше не `accepted`.

**Усього 287 знахідок:** P0 — 10, P1 — 116, P2 — 105, P3 — 56. Перевірено скептиком 77: підтверджено 56, понижено 20, спростовано 1.


## Класові риси (36)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P0 | 2024 | bug | `L04-class-features-08` | ARTIFICER_2024 має 0 підкласів, але доступний у каталозі й конструкторі: персонаж проходить 3-й рівень із subclassId = null без жодної помилки і назавжди лишається без підкласу | src/lib/classesData.ts, src/lib/content/creator-content.ts |
| ✓ | P1 | 2024 | data | `L04-class-features-01` | Жодна класова риса 2024 не несе чисел — усі 187 рядків class_feature пасивні без метаданих, тож ресурсів класу (Лють, Другий подих, Божественний канал, Очки фокусу/чаклунства, кубики Підступної атаки й Бойових мистецтв) у редакції 2024 не існує взагалі | data/2024/normalized/classes.json, src/lib/logic/feature-resources.ts |
| ✓ | P1 | 2024 | data | `L04-class-features-02` | Експертизи в 2024 немає взагалі: другий грант (розбійник 6, бард 9) відсутній у базі, а сама риса не несе вибору навичок, тож крок «Експертиза» ніколи не показується | data/2024/normalized/classes.json, src/lib/components/levelUp/LevelUpWizard.tsx |
| ✓ | P1 | 2024 | data | `L04-class-features-03` | Метамагія чародія 2024: рядок риси лише на 2-му рівні (немає на 10 і 17), а опцій метамагії для RULES_2024 у базі немає жодної — вибору гравець не робить ніколи | data/2024/normalized/classes.json, prisma/seed |
| · | P1 | 2024 | data | `L04-class-features-04` | Warlock: Містичний Арканум є тільки на 11-му рівні — заклинання 7, 8 і 9 кола (рівні 13, 15, 17) не видаються | data/2024/normalized/classes.json |
| · | P1 | 2024 | data | `L04-class-features-05` | Fighter: на 13-му рівні немає Indomitable (two uses), а на 17-му воїн не отримує жодної класової риси замість Action Surge (two uses) + Indomitable (three uses) | data/2024/normalized/classes.json, prisma/schema.prisma |
| ✓ | P1 | 2024 | data | `L04-class-features-06` | Divine Order (клірик 1) і Primal Order (друїд 1) подані однією пасивною рисою без вибору — гравець не обирає роль і не отримує важкий/середній обладунок та військову зброю, що вона дає | data/2024/normalized/classes.json, prisma/seed |
| ✓ | P1 | 2024 | data | `L04-class-features-07` | Barbarian Primal Knowledge (3-й рівень) не дає навички і не пропонує вибору | data/2024/normalized/classes.json, src/lib/components/levelUp/LevelUpWizard.tsx |
| ✓ | P1 | 2024 | missing-system | `L05-class-choices-01` | Клірик 2024 ніколи не обирає Divine Order (Захисник / Дивотворець) — крок вибору не існує ні в конструкторі, ні деінде | data/2024/normalized/classes.json, prisma/seed/ |
| ✓ | P1 | 2024 | missing-system | `L05-class-choices-02` | Друїд 2024 ніколи не обирає Primal Order (Magician / Warden) | data/2024/normalized/classes.json, prisma/seed/ |
| ✓ | P1 | 2024 | missing-system | `L05-class-choices-04` | Чародій 2024 не має Метамагії взагалі — ні опцій у базі, ні правила кількості виборів | src/lib/logic/choicePoolRules.ts, prisma/seed/ |
| ✓ | P1 | 2024 | data | `L05-class-choices-05` | Експертиза 2024 не працює в жодного класу: skill_expertises порожнє в Rogue/Bard/Ranger/Wizard, а других надань (Rogue 6, Bard 9) немає навіть як рядків | prisma/seed/, src/lib/components/characterCreator/MultiStepForm.tsx |
| ✓ | P1 | 2024 | missing-system | `L05-class-choices-06` | Клірик Blessed Strikes (7) і Improved Blessed Strikes (14) не пропонують вибору Divine Strike / Potent Spellcasting | prisma/seed/, src/lib/components/levelUp/LevelUpWizard.tsx |
| ✓ | P1 | 2024 | data | `L05-class-choices-07` | Варвар Primal Knowledge (3) не дає обрати додаткову навичку | prisma/seed/, src/lib/components/levelUp/LevelUpWizard.tsx |
| ✓ | P1 | 2024 | data | `L05-class-choices-09` | Паладин 2024 без опції Blessed Warrior, Слідопит 2024 без Druidic Warrior у бойовому стилі | prisma/seed/, data/2024/normalized/classes.json |
| ✓ | P1 | 2024 | data | `L05-class-choices-10` | Виклик Thirsting Blade відсутній серед 31 виклику 2024, хоча Devouring Blade у тих самих даних вимагає його як передумову | data/2024/normalized/invocations.json, prisma/seed/ |
| ✓ | P1 | 2024 | data | `L07-spellcasting-02` | Класові «завжди підготовлені» заклинання 2024 не надаються: Hunter's Mark, Divine Smite, Find Steed, Speak with Animals | data/2024/normalized/classes.json, src/server/db/character-creation.ts |
| · | P1 | 2024 | data | `L07-spellcasting-03` | Безкоштовні застосування заклинань від класових фіч 2024 не задані — Р38 виконано лише для рис | data/2024/normalized/classes.json, src/lib/logic/feature-resources.ts |
| ✓ | P1 | 2024 | data | `L08-levelup-machine-03` | Метамагія чародія 2024 не існує як вибір: жодного class_choice_option для SORCERER_2024 | prisma/seed/, data/2024/normalized/classes.json |
| · | P1 | 2024 | data | `L09-sheet-derived-01` | Жодна класова, підкласова чи видова фіча 2024 не має ліміту використань — секція «Ресурси класу» на листі порожня у всіх чотирьох зібраних персонажів | data/2024/normalized/classes.json, data/2024/normalized/species.json |
| · | P1 | 2024 | data | `L09-sheet-derived-02` | Усі 547 фіч 2024 позначені display_type = {PASSIVE} — лист не показує ні дій, ні бонусних дій, ні реакцій, ні ресурсів класу | data/2024/normalized/classes.json, data/2024/normalized/subclasses.json |
| · | P1 | 2024 | bug | `L09-sheet-derived-06` | Монах 2024: беззбройного удару не існує як зброї, а Спритні атаки не діють — посох рахується від Сили | src/lib/logic/bonus-calculator.ts, data/2024/normalized/weapons.json |
| · | P1 | 2024 | data | `L09-sheet-derived-12` | Бойові стилі 2024 не мають механіки: Оборона не дає +1 КЗ, Дуель +2 шкоди, Стрільба +2 атаки | data/2024/normalized/feats.json, prisma/seed |
| · | P1 | 2024 | data | `L11-persistence-identity-03` | Жодна фіча 2024 не має обмежених використань і жодна не має `uses_pool_key` — ресурсів класу 2024 не існує ні як пулів, ні як лічильників | data/2024/normalized/classes.json, data/2024/normalized/subclasses.json |
| ✓ | P1 | 2014 | bug | `L17-known-registries-04` | BUG-007 живий: вливання артифайсера обираються лише на 2 рівні класу, тож 50 із 66 рядків infusion недосяжні жодним шляхом | src/server/db/levelup-persistence.ts, src/lib/components/levelUp/LevelUpWizard.tsx |
| · | P1 | 2024 | bug | `P1-human-fighter-04` | Обрані на кроці конструктора 3 види майстерності зброї не зберігаються — на листі «Обрано 0 з 3» | src/server/db/character-creation.ts, src/server/db/weapon-mastery.ts |
| · | P1 | 2024 | data | `P1-human-fighter-09` | «Друге дихання» не має лічильника застосувань — feature.uses_count = null, ресурс на листі не відстежується | data/2024/normalized/classes.json, prisma/seed/ |
| · | P1 | 2014 | data | `P4-regression-2014-01` | Клірик 2014 ніколи не отримує «Вигнання нежиті» (Turn Undead) — риса є в базі, але не привʼязана до жодного класу | prisma/seed/classFeatureSeed.ts, src/server/db/progression-content.ts |
| ✓ | P1 | 2024 | data | `P5-druid-secondary-flows-07` | Первісне призначення (Primal Order) друїда 2024 не має вибору Warden / Magician — жодного class_choice_option у класі | prisma/seed/, data/2024/normalized/classes.json |
| · | P1 | 2024 | data | `P6-class-sweep-level1-04` | Усі 187 класових фіч 2024 записані як чистий текст: немає ні кількості застосувань, ні пулів ресурсів, ні експертизи, ні кількості інвокацій | prisma/seed/, data/2024/normalized/classes.json |
| ✓ | P1 | 2024 | missing-system | `P6-class-sweep-level1-05` | Божественний орден (Клірик) і Первісний орден (Друїд) не пропонують вибору і не дають нічого | data/2024/normalized/classes.json, prisma/seed/ |
| ✓ | P1 | 2024 | data | `P6-class-sweep-level1-06` | Пройдисвіт 2024 не отримує Експертизи на 1-му рівні — крок «Експертиза» не зʼявляється в жодного класу | prisma/seed/, data/2024/normalized/classes.json |
| · | P2 | 2024 | data | `L05-class-choices-11` | Передумови викликів 2024 перенесені частково: сім викликів «Level 2+» мають порожні prerequisites, а вимога Thirsting Blade у Devouring Blade втрачена | data/2024/normalized/invocations.json, src/lib/logic/prerequisiteUtils.ts |
| · | P2 | 2014 | data | `P4-regression-2014-02` | Кліріку 2014 на 2 рівні видається паладинська риса «Канал божественності» (текст про клятву й СК паладина) поверх власної | prisma/seed/classFeatureSeed.ts |
| ✓ | P2 | both | bug | `P7-mobile-ux-03` | У кроці «Опції класу» назва потойбічного виклику не показана взагалі: заголовок картки і її опис — той самий короткий опис | src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx, data/2024/normalized/invocations.json |
| · | P3 | 2014 | data | `P4-regression-2014-03` | Чарівник 2014 має на 1 рівні дві риси чаклування — «Чаротворство (Чарівник)» і порожню дублікатну «Заклинання» | prisma/seed/classFeatureSeed.ts |

### L04-class-features-08 — ARTIFICER_2024 має 0 підкласів, але доступний у каталозі й конструкторі: персонаж проходить 3-й рівень із subclassId = null без жодної помилки і назавжди лишається без підкласу

**Рівень:** P0 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/normalized/classes.json — Artificer: isPhbCore=false, source="EBERRON_FORGE_OF_THE_ARTIFICER_2024_UNOFFICIAL", note=«Клас не входить у core PHB 2024 — усі його підкласи на вікі тегуються 'Source: Eberron - Forge of the Artificer'… 2024-оновлення Артифайсера ще не випущене окремою книгою.» Загальне правило 2024 (data/2024/srd/classes.md): підклас обирається на 3-му рівні кожним класом.

**Має бути:** Або клас недоступний, поки немає підкласів, або levelUpCharacter не пропускає 3-й рівень без обраного підкласу. Плюс Винахідник має обирати навички та інструменти.

**Є:** Винахідника 2024 можна створити і підняти щонайменше до 4-го рівня без підкласу; жодної помилки. Обрати підклас неможливо (їх 0), тож персонаж назавжди без підкласових рис. Навичок і інструментів клас теж не дає (skill_proficiencies=null, tool_proficiencies={}).

**Доказ:** SQL: `select c.class_id, c.eng_name, c.subclass_level, (select count(*) from class_feature cf where cf.class_id=c.class_id), (select count(*) from subclass s where s.class_id=c.class_id) from class c where c.ruleset='RULES_2024'` → 351 | ARTIFICER_2024 | subclass_level=3 | feats=13 | subs=0 (усі інші 12 класів мають по 4 підкласи). Клас не фільтрується: src/lib/generated/creator-content-2024.json містить ARTIFICER_2024 (subclasses=0, features=13, choiceOpts=0), а src/lib/content/creator-content.ts:39–60 (findCharacterCreationOptions) класів не фільтрує взагалі; каталог теж його показує — src/lib/classesData.ts:57–62 має для нього гілку findClassSource → "EFA". Програмний репро крізь справжні серверні дії (scratchpad/audit/work/L04-class-features/artificer.test.ts → artificer.out.json): created persId=1 error=null; L2 error=null subclassId=null; L3 error=null level=3 subclassId=null (отримав «Artificer: Artificer Subclass (2024)» як звичайну пасивну фічу); L4 error=null subclassId=null. Той самий вивід показує classInfo: skillProficiencies=null, toolProficiencies=[].

**Відтворення:** node_modules/.bin/vitest run --root /Users/luka/Documents/code/spells.holota.family --config /private/tmp/claude-502/-Users-luka-Documents-code-spells-holota-family/0141b135-eeb1-42c1-a811-e88f5d9dced7/scratchpad/audit/work/L04-class-features/vitest.l04.mts --disable-console-intercept (файл artificer.test.ts), далі читати artificer.out.json

**Куди дивитись:** Прибрати ARTIFICER_2024 з getAllClasses('RULES_2024') / creator-content до появи підкласів (або лишити тільки як сторінку каталогу з поміткою), і паралельно змусити src/server/db/levelup-persistence.ts відхиляти рівень підкласу з subclassId=null, коли rulesStrategy.needsSubclassSelection повернув true.

**Файли:** `src/lib/classesData.ts`, `src/lib/content/creator-content.ts`, `src/server/db/levelup-persistence.ts`, `data/2024/normalized/classes.json`

**Скептик:** Ядро знахідки підтвердив власними доказами, але три її частини хибні, і серйозність занижена.

(1) ПРАВИЛО — вірне. `data/2024/normalized/classes.json`: усі 13 записів мають `subclassLevel: 3`; Artificer — `isPhbCore: false`, `source: EBERRON_FORGE_OF_THE_ARTIFICER_2024_UNOFFICIAL`. Мій SQL по `spells_test`: ARTIFICER_2024 (class_id 351) — `subclass_level=3`, 13 класових фіч, серед них «Artificer: Artificer Subclass (2024)» на 3-му рівні, і **0 підкласів**; решта 12 класів мають по 4 (усього 48). `data/2024/normalized/subclasses.json` — 48 записів, 12 класів × 4, жодного для Винахідника. Причина розриву: `docs/o6-rules-2024-import/kr6.2-extraction-translation.md:203-206` — усі 6 підкласів Артифайсера на вікі не-PHB, тож KR13.1 завіз лише 48 PHB-их, тоді як сам клас власник вирішив завезти (O13, питання 2, 2026-08-21).

(2) КОД — фільтра ніде немає, підтвердив і в браузері. `getAllClasses("RULES_2024")` віддає всі 13, `matchesSourceSelection` пропускає «EFA» (ховається лише HOMEBREW), `findCharacterCreationOptions` і `ClassesForm` не фільтрують нічого.

(3) СЕРЙОЗНІСТЬ — автор описав не той шлях, і через це занизив оцінку. Його репро йде **повз майстра**, прямим викликом `levelUpCharacter`. У справжньому UI гравець не «мовчки лишається без підкласу» — його **жорстко блокує на 3-му рівні**: `LevelUpWizard.tsx:568-571` `needsSubclass` не має перевірки кількості підкласів (тоді як конструктор її має — `MultiStepForm.tsx:435-439`, `&& (cls.subclasses?.length ?? 0) > 0`), тож крок «Підклас» додається на :837-842 з `initialDisabled: true`; `SubclassForm` мапить порожній масив, `chosenSubclassId` лишається falsy і `onNextDisabledChange(true)` тримається назавжди (`SubclassForm.tsx:48-54`); «Далі» — `disabled={nextDisabled}` (:1375), а бічний степер уперед не пускає (`disabled={i > safeCurrentStep}`, :1331). Клас 2024 віддається майстрові з того самого файла (`levelup-content.ts:49` → `findCharacterCreatorOptions`). Отже Винахідника 2024 не можна підняти вище 2-го рівня — це P0 за шкалою CONTEXT. Застереження: обхід є — на 3-му рівні взяти мультиклас іншим класом, тоді персонаж росте, але Винахідник назавжди застрягає на 2. Хто читає P0 буквально («персонаж стоїть цілком»), може лишити P1.

(4) РІШЕННЯ ВЛАСНИКА — половина `expected` суперечить прийнятому. `docs/KNOWN-BUGS.md:41-47`, «Прийнято (не буде виправлено)», рішення власника 2026-08-13: «UI — джерело істини… сервер довіряє UI», і BUG-001 — це рівно «subclassId не перевіряється проти рівня». Тож вимогу «levelUpCharacter не пропускає 3-й рівень без обраного підкласу» треба з фіксу викинути: серверна перевірка свідомо не потрібна. Гейт редакції вже знято (`src/rules/access.ts` — «Передрелізний гейт знято 2026-08-28»), тож це видно живим гравцям.

(5) «ДОДАТКОВО» ПРО НАВИЧКИ Й ІНСТРУМЕНТИ — хибно приписано Винахіднику. `skill_proficiencies = null` і `tool_proficiencies = '{}'` мають **усі 13** класів 2024 (мій SQL), і `src/lib/generated/classes.json` дає `skillChoices {count:0, options:[]}` кожному з них. Це окрема корпусна прогалина 2024, а не дефект Винахідника; як доказ у цій знахідці вона не працює.

(6) IN-FLIGHT / ВІДКРИТИЙ KR — ні. Жоден із файлів не в переліку паралельної сесії. Окремого KR немає, але видимість класу — **відкрите питання до власника**: `docs/o18-2024-character-parity/README.md:238-240`, пункт 1 «Artificer у 2024… Лишаємо як домашній порт (і тоді треба сказати це в UI) чи ховаємо з 2024?» — не закреслений, на відміну від пункту 3. Паралельно O26 (рішення власника 2026-09-01, `docs/o26-starting-equipment-2024/questions.md#1`) навмисне засіяв стартове спорядження Винахідника 2024 з його книги — «класів у сіді 13, не 12». Тобто клас присутній свідомо, а підкласи просто не завезені.

Класифікацію ставлю `data`, а не `bug`: корінь — жодного нормалізованого підкласу Винахідника 2024 у репо. Але поруч є справжній кодовий дефект — асиметрія охорони: конструктор перевіряє кількість підкласів, майстер підвищення — ні, і це вдарить по будь-якому класу з 0 підкласів.


### L04-class-features-01 — Жодна класова риса 2024 не несе чисел — усі 187 рядків class_feature пасивні без метаданих, тож ресурсів класу (Лють, Другий подих, Божественний канал, Очки фокусу/чаклунства, кубики Підступної атаки й Бойових мистецтв) у редакції 2024 не існує взагалі

**Статус:** ✅ закрито 2026-09-06 (KR31.3). 28 класових фіч 2024 отримали числа з `data/2024/srd/classes.md` — файл, сід і база; решта 146 лишилися без лічильника, і гейт ловить хибне додавання. Кубики Підступної атаки й Бойових мистецтв свідомо поза цим: це розмір кубика шкоди, а не ресурс, і колонки для них у `feature` немає.

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md — числові колонки таблиць рівнів: Barbarian «Rages 2/3/4/5/6», Fighter «Second Wind 2/3/4», Cleric «Channel Divinity —/2/3/4», Monk «Martial Arts 1d6→1d12», «Focus Points 2…20», «Unarmored Movement +10…+30 ft.», Rogue «Sneak Attack 1d6→10d6», Bard «Bardic Die D6→D12», Sorcerer «Sorcery Points 2…20», Druid «Wild Shape 2/3/4», Ranger «Favored Enemy 2…6», Warlock «Eldritch Invocations 1…10»

**Має бути:** Воїн 1-го рівня має 2 використання Другого подиху (3 з 4-го), клірик 2-го — 2 Божественні канали, варвар 1-го — 2 Люті, монах 2-го — 2 очки фокусу й кубик 1d6, розбійник 1-го — 1d6 Підступної атаки; усе це видно й трекається на листі, як у 2014.

**Є:** Усі 187 класових рис 2024 — pasивний текст. pers_resource_pool порожній, usesRemaining=null, кубиків немає. Механізм (feature-resources.ts → calculateMaxUsesForFeature, resource-pools.ts → findPoolProvider, PersResourcePool) працює, але для 2024 йому нічим годуватися.

**Доказ:** SQL на spells_test: `select c.ruleset, cf.mechanic_type, count(*), count(cf.mechanic_metadata) from class_feature cf join class c on c.class_id=cf.class_id group by 1,2` → RULES_2024 | PASSIVE | 187 | 0 (RULES_2014 має CHOICE_ASI 11, CHOICE_SUBCLASS 6, CHOICE_SPECIFIC 3, CHOICE_SPELLS 1 і 3 PASSIVE з метаданими). Другий запит: `select f.eng_name from feature f join class_feature cf … join class c … where c.ruleset='RULES_2024' and (f.uses_count is not null or f.uses_count_special is not null or f.uses_pool_key is not null or f.unarmed_damage is not null or f.invocations_count is not null or f.skill_expertises is not null)` → 0 рядків. Той самий запит для RULES_2014 → 31 рядок із заповненими числами, напр. Rage → [{"lvl":1,"uses":2},…,{"lvl":20,"uses":"UNLIMITED"}], Ki → {"equalsToClassLevel":true} pool KI, Lay on Hands → {"type":"FORMULA","group":"LEVEL_BASED","operation":"MULTIPLY","multiplier":5}. Програмна збірка (scratchpad/audit/work/L04-class-features/build-to-six.out.json): Воїн, Клірик і Чарівник 2024, знімок після кожного з рівнів 1–6 — pers_resource_pool порожній на КОЖНОМУ рівні; «Fighter: Second Wind (2024)» має usesCount=null, limitedUsesPer=null. Джерело даних теж порожнє: у data/2024/normalized/classes.json у кожної риси лише {level, name, descriptionEng, displayOrder}.

**Відтворення:** node scratchpad/audit/work/L04-class-features/q.mjs "<SQL вище>"; та прогін scratchpad/audit/work/L04-class-features/build-to-six.test.ts через node_modules/.bin/vitest run --root <репо> --config .../vitest.l04.mts

**Куди дивитись:** За Р33 правити файл-джерело: додати у data/2024/normalized/classes.json поля на кшталт usesByLevel / poolKey / dieByLevel і перелити сідом у feature.uses_count_special, uses_pool_key, limited_uses_per, unarmed_damage. Кубики (Sneak Attack, Martial Arts, Bardic Die) чинна схема не тримає — потрібна колонка або class_feature.mechanic_metadata.

**Файли:** `data/2024/normalized/classes.json`, `src/lib/logic/feature-resources.ts`, `src/rules/resource-pools.ts`, `prisma/schema.prisma`

**Скептик:** ПРАВИЛО — підтверджено власним читанням оракула. `data/2024/srd/classes.md` справді має числові колонки таблиць рівнів: `<th>Bardic Die</th>` (439), `<th>Channel Divinity</th>` (1808, 5353), `<th>Wild Shape</th>` (3078), `<th>Martial Arts</th>`/`<th>Focus Points</th>` (4961-4962), `<th>Sneak Attack</th>` (6906), `<th>Sorcery Points</th>` (7232), `<th>Rages</th>` (65), `<th>Second Wind</th>` (4640), плюс прозовий текст «You can enter your Rage the number of times shown … in the Rages column» (238) і «you gain more uses of this feature, as shown in the Second Wind column» (4800). Правило саме для 2024.

ДАНІ — переміряв сам, не з чужого дампу. Свій скрипт `q.mjs` (окрема тека `verify-L04-01`, читає `.env.test`, відмовляє не-_test базі): `select ruleset, count(*), count(uses_count), count(uses_count_special), count(uses_pool_key), count(limited_uses_per), count(unarmed_damage), count(invocations_count), count(skill_expertises) from feature group by 1` → RULES_2024: 547 / 3 / 0 / 0 / 3 / 0 / 0 / 0; RULES_2014: 1281 / 172 / 20 / 173 / 278 / 1 / 0 / 6. `class_feature` × `class`: RULES_2024 — PASSIVE 187, `mechanic_metadata` 0. `display_type` по редакціях: RULES_2024 — рівно один рядок `{PASSIVE}` 547; RULES_2014 — 16 різних комбінацій, зокрема `{CLASS_RESOURCE}` 10, `{BONUSACTION,CLASS_RESOURCE}` 2. Поіменно: `Barbarian: Rage (2024)`, `Fighter: Second Wind (2024)`, `Cleric: Channel Divinity (2024)`, `Sorcerer: Innate Sorcery (2024)` — усі `uses_count=null, uses_count_special=null, uses_pool_key=null, limited_uses_per=null, {PASSIVE}`. Контраст 2014: Rage — масив 1/2…20/UNLIMITED + LONG_REST + `{BONUSACTION,CLASS_RESOURCE}`; Ki — `{equalsToClassLevel:true}` + пул KI; Channel Divinity — uses 1 + пул + `{ACTION,BONUSACTION}`; Indomitable — 9/13/17.

ДЖЕРЕЛО — підтверджено: у `data/2024/normalized/classes.json` кожна з 187 рис має рівно ключі `level, name, description` (числових полів немає взагалі), а `prisma/seed/classSeed2024.ts:339` жорстко ставить `displayType: [FeatureDisplayType.PASSIVE]` і не задає жодного поля використань.

КОД — іншого місця обробки немає. `calculateMaxUsesForFeature` (`src/lib/logic/feature-resources.ts:95-150`) читає виключно `usesCountSpecial` / `usesCountDependsOnProficiencyBonus` / `usesCount`; при всіх null повертає null. Захардкоджених 2024-таблиць ресурсів у `src/rules/` немає (грепнув SECOND_WIND / SNEAK_ATTACK / MARTIAL_ARTS / FOCUS_POINTS / RAGE — жодного). Наслідок видно у двох незалежних споживачах: `FeaturesSlide.tsx:258-262` формує секцію «Ресурси класу» лише з `displayTypes.includes(CLASS_RESOURCE)` + числовий `usesPer` — для 2024 порожньо, і всі 547 рис падають у «Пасивні здібності» (секцій Дія / Бонусна дія / Реакція в 2024 не буде взагалі); `rest-actions.ts:186,305` відновлює рівно за `limitedUsesPer`, тож короткий і довгий відпочинок 2024 не відновлює нічого. Знайшов і третього споживача, якого автор не назвав: `ClassInfoModal.tsx:329-352` будує ресурсні колонки «Таблиці класу» з того самого `CLASS_RESOURCE` — отже в каталозі 2024 таблиця теж без колонок Rages / Sneak Attack.

РІШЕННЯ ВЛАСНИКА — прийнятою поведінкою це не є. `docs/o13-2024-completeness/kr13.2-class-features.md`, «Поза межами»: «Механіка: жодна фіча не отримує `mechanicType` складніший за `PASSIVE`, **поки не буде окремого рішення**». Окремого рішення в `docs/DECISIONS.md` немає — Р1–Р39 його не містять, найближче Р24 (знято передрелізний гейт 2024, тобто редакція вже публічна). Тобто це відкладення в межах одного KR, а не прийняття. Р26 («трекер, не рушій») стосується бастіонів і сюди не тягнеться.

ВЖЕ ВІДКРИТО — частково задокументовано, але **жодний KR цього не володіє**. `docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md:222-227` прямо пише: «Виміряно в `spells_test` 2026-09-01: фіча `Druid: Wild Shape (2024)` має `usesPoolKey: null`, як і **всі** фічі 2024 … Підключення пулу — це сід контенту 2024, а не план KR24.6», і те саме речення продубльоване в `docs/README.md` (рядок O24). O18 закрито 8/8 і ресурсів не містить; відкриті KR у O13 — це KR13.5 (лендинг) і KR13.7 (головна), не механіка. Отже знахідка справедлива й безхазяйна.

IN-FLIGHT — ні. Паралельна сесія тримає spell-preparation / spellcasting-progression / spell-actions / pers-actions / AddSpellDialog / каталоги заклинань; жоден із цих файлів у знахідці не фігурує.

ДВІ ПОПРАВКИ ДО ФОРМУЛЮВАННЯ (тому не «downgraded», а confirmed із звуженим обсягом):
1. **Кубики — не 2024-регресія.** Автор пише «кубик Підступної атаки і кубик Бойових мистецтв ніде не число». Переміряв: у RULES_2014 `Sneak Attack` (2382) і `Martial Arts` (2092) теж `{PASSIVE}`, `uses_count=null`, `uses_count_special=null`, `unarmed_damage=null` — єдиний носій `unarmed_damage` у всій базі це `Unarmed Fighting` (2070, «1к6 / 1к8»). Тобто масштабовані кубики не реалізовані **в жодній редакції**; це давня прогалина можливості (P2-класу), а не діра паритету 2024. Те саме з `Arcane Recovery`: у 2014 воно так само PASSIVE без використань, хоч автор перелічив його серед втраченого.
2. **«Усі 547» — насправді 544.** Три риси (`Magic Initiate: Cleric/Druid/Wizard list (2024)`) мають `uses_count` і `limited_uses_per=LONG_REST`. `display_type={PASSIVE}` — там таки всі 547.

СЕРЙОЗНІСТЬ — лишаю P1. Шкала дає P1 за «відсутню рису/вибір/слот/володіння» і за число не за книгою; використання класового ресурсу — прямий аналог комірки заклинання (варвар 1 рівня за книгою має 2 Люті, воїн — 2 Другі подихи, клірик 2 рівня — 2 Божественні канали), і жодного з цих чисел у персонажі 2024 не існує, ані на листі, ані в друці, ані у відпочинку, ані в таблиці класу каталогу. Це не одна риса, а весь клас ресурсів для редакції, яку вже відкрито користувачам (Р24). Класифікація `data` правильна для основної маси: механізм (`feature-resources.ts`, `resource-pools.ts`, `PersResourcePool`, `rest-actions.ts`) робочий і редакційно-незалежний — бракує саме колонок у `data/2024/normalized/classes.json` і сіді. Частина про кубики — `missing-system`, але вона вужча за знахідку і не є 2024-специфічною.


### L04-class-features-02 — Експертизи в 2024 немає взагалі: другий грант (розбійник 6, бард 9) відсутній у базі, а сама риса не несе вибору навичок, тож крок «Експертиза» ніколи не показується

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md:7033–7037 (Rogue) «You gain Expertise in two of your skill proficiencies of your choice… At Rogue level 6, you gain Expertise in two more of your skill proficiencies of your choice.»; :888–892 (Bard) «…At Bard level 9, you gain Expertise in two more…»; :6427–6431 (Ranger Deft Explorer) «_Expertise._ Choose one of your skill proficiencies with which you lack Expertise»; :6457–6459 (Ranger L9) «Choose two of your skill proficiencies…». Таблиця Rogue має «Expertise» у рядку 6, таблиця Bard — у рядку 9.

**Має бути:** Розбійник обирає 2 експертизи на 1-му рівні і ще 2 на 6-му; бард — 2 на 2-му і 2 на 9-му; мисливець — 1 на 2-му (Deft Explorer) і 2 на 9-му.

**Є:** Жодного кроку «Експертиза» ні при створенні, ні при підвищенні; на 6-му (розбійник) і 9-му (бард) немає навіть рядка риси. Бонус майстерності на цих навичках ніколи не подвоюється.

**Доказ:** SQL: `select c.ruleset, f.eng_name, f.skill_expertises from feature f join class_feature cf on cf.feature_id=f.feature_id join class c on c.class_id=cf.class_id where f.eng_name ilike '%expertise%' or f.eng_name ilike '%deft explorer%'` → RULES_2014: Expertise / Expertise 2 / Expertise (Bard) / Expertise (Bard) 2 усі з {"count":2,"chooseFromCurrentProficiencies":true}; RULES_2024: «Bard: Expertise (2024)», «Ranger: Deft Explorer (2024)», «Ranger: Expertise (2024)», «Rogue: Expertise (2024)» — усі skill_expertises = null. Рівні (дамп class_feature у cf-2024.json): «Rogue: Expertise (2024)» тільки level_granted=1, «Bard: Expertise (2024)» тільки level_granted=2; рядків на 6 (розбійник) і 9 (бард) немає. Крок вмикається саме з цього поля: src/lib/components/levelUp/LevelUpWizard.tsx:506–530 — `const se = f.skillExpertises; return (se?.count || 0) > 0 || se?.chooseFromCurrentProficiencies || se?.options?.length > 0`.

**Відтворення:** node scratchpad/audit/work/L04-class-features/q.mjs "select c.ruleset::text, f.eng_name, f.skill_expertises::text from feature f join class_feature cf on cf.feature_id=f.feature_id join class c on c.class_id=cf.class_id where f.eng_name ilike '%expertise%'"

**Куди дивитись:** Заповнити feature.skill_expertises для чотирьох 2024-рис ({"count":2,"chooseFromCurrentProficiencies":true}; для Deft Explorer count=1) і додати другі class_feature-рядки на рівнях 6 (Rogue) і 9 (Bard) окремими фічами — як уже зроблено з «Barbarian: Improved Brutal Strike L13/L17 (2024)», бо ClassFeature має @@unique([classId, featureId]).

**Файли:** `data/2024/normalized/classes.json`, `src/lib/components/levelUp/LevelUpWizard.tsx`, `prisma/schema.prisma`

**Скептик:** **1) Правило — підтверджено дослівно.** `data/2024/srd/classes.md`: Rogue «#### Level 1: Expertise … At Rogue level 6, you gain Expertise in two more of your skill proficiencies of your choice»; Bard «#### Level 2: Expertise … At Bard level 9, you gain Expertise in two more»; Ranger «#### Level 2: Deft Explorer — _Expertise._ Choose one of your skill proficiencies with which you lack Expertise» і «#### Level 9: Expertise — Choose two…». Це саме редакція 2014→2024-незалежні гранти класу, оракул 2024, редакцію названо правильно.

**2) Дані — переміряв сам, збіглося.** Власний запит до `spells_test` (не копія автора): RULES_2024 — `Rogue: Expertise (2024)` level_granted=1, `Bard: Expertise (2024)` level=2, `Ranger: Deft Explorer (2024)` level=2, `Ranger: Expertise (2024)` level=9 — **у всіх чотирьох `skill_expertises = null`, mechanic_type=PASSIVE**. Для контрасту RULES_2014: `Expertise` L1 і `Expertise 2` L6, `Expertise (Bard)` L3 і `Expertise (Bard) 2` L10 — усі з `{"count":2,"chooseFromCurrentProficiencies":true}`. Рядків для Розбійника L6 і Барда L9 у 2024 немає (Ranger L9 рядок **є**, лише поле порожнє — дрібне уточнення до формулювання автора, суті не міняє). Джерело сіду теж порожнє: у `data/2024/normalized/classes.json` риса має рівно ключі `{level, name, description(Eng), displayOrder}`, і записів Rogue L6 / Bard L9 у ньому немає.

**3) Другого шляху в коді немає — перевірив окремо від автора.** Крок вмикають рівно два механізми: `feature.skillExpertises` і `choiceOption.effectKind === "SKILL_EXPERTISE"` (`MultiStepForm.tsx:521–539` → `creation-step-resolver.ts:77`; `LevelUpWizard.tsx:508–531` → крок `expertise` на 902/1124). Запит по `choice_option.effect_kind`: RULES_2014 має **22** рядки `SKILL_EXPERTISE`, RULES_2024 — **0** (у 2024 є лише ASI 148 і SKILL_PROFICIENCY 18). Отже жоден із двох шляхів у 2024 не спрацьовує. Маршрут `/2024/char` використовує той самий `MultiStepForm`, тобто окремого конструктора з іншою логікою немає.

**4) Найсильніший незалежний доказ, якого в звіті немає — на рівні того файлу, який читає конструктор.** Конструктор бере не базу, а `src/lib/generated/creator-content-*.json`. Рекурсивний обхід: у **2014** — 6 непорожніх `skillExpertises` (Expertise, Expertise 2, Expertise (Bard) ×2, Blessings of Knowledge, Deft Explorer - Canny), у **2024** — **0 непорожніх і 0 входжень `SKILL_EXPERTISE`**. Тобто крок «Експертиза» в 2024 не може зʼявитися в принципі, без жодного браузера.

**5) Рішення власника — немає, навпаки.** У `DECISIONS.md` слова «експертиза» немає взагалі. `KNOWN-BUGS.md` згадує експертизу лише в контексті рис 2014. `docs/o18-2024-character-parity/reference-2024.md:824,1152,1232,1242` прямо ставить Expertise у перелік виборів, які персонаж 2024 має робити (і §15 сценарії розбійника й барда). «Поза межами» O18 (рядки 229–236) експертизи не містить. Єдине дотичне — `docs/o13-2024-completeness/kr13.2-class-features.md:89–92`: «Механіка: жодна фіча не отримує `mechanicType` складніший за `PASSIVE`, поки не буде окремого рішення» — це **обсяг того KR про сід тексту**, а не рішення власника, що персонаж 2024 живе без експертизи; наступна ціль O18 явно ставить «персонаж 2024 рахується за правилами 2024».

**6) Відкритого KR на це немає.** Пройшов усі 2024-цілі: O13 (13.1–13.7), O18 (18.1–18.8, «8/8, 0 червоних»), O26, O27 — жоден KR не про механіку класових виборів (експертиза/метамагія/ресурси). Тобто це не «вже відкрито», а справжня діра між закритими цілями.

**7) In-flight — ні.** Задіяні файли (`classes.json`, `MultiStepForm.tsx`, `LevelUpWizard.tsx`, сіди) не належать до списку паралельної сесії KR27.7/KR30.3.

**Серйозність.** P1 за шкалою CONTEXT: «відсутня риса/вибір» + число не за книгою — кожен Розбійник/Бард/Слідопит 2024 недобирає подвоєний бонус майстерності на 2–4 навичках (на 5-му рівні це −3 до кидка, на 17-му −6). Не P0: персонаж створюється й росте. Класифікація `data` правильна — правити треба файл-джерело (Р33), а прийом «другий грант окремою фічею» вже вжито в базі для Варвара (`Improved Brutal Strike L13/L17`), тож схема (`ClassFeature @@unique(classId, featureId)`) змін не потребує.


### L04-class-features-03 — Метамагія чародія 2024: рядок риси лише на 2-му рівні (немає на 10 і 17), а опцій метамагії для RULES_2024 у базі немає жодної — вибору гравець не робить ніколи

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md — таблиця Sorcerer ставить «Metamagic» у рядки 2, 10 і 17; розділ «### Metamagic Options» (:7722) перелічує 10 опцій: Careful, Distant, Empowered, Extended, Heightened, Quickened, Seeking, Subtle, Transmuted, Twinned Spell.

**Має бути:** На 2-му рівні чародій обирає 2 опції метамагії з 10, на 10-му і 17-му — ще по 2 (усього 6).

**Є:** На 2-му рівні дається пасивний текст «Метамагія» без вибору; на 10-му і 17-му не дається нічого. Обрати метамагію в 2024 неможливо в принципі.

**Доказ:** Дамп class_feature (cf-2024.json): «Sorcerer: Metamagic (2024)» існує рівно один раз, level_granted=2; на 10 і 17 у SORCERER_2024 рядків немає взагалі. SQL: `select ruleset, count(*) from choice_option where group_name ilike '%метамаг%' or option_name ilike '%метамаг%' group by 1` → тільки RULES_2014 | 10. Повний перелік class_choice_option для RULES_2024: FIGHTER_2024 {1} 10 «Бойовий стиль», PALADIN_2024 {2} 10, RANGER_2024 {2} 10, WARLOCK_2024 {1,2,5,7,9,12,15,18} 31 «Потойбічні виклики» — жодної групи метамагії. class_optional_feature для RULES_2024 — 0 рядків (для RULES_2014 — 19).

**Відтворення:** node scratchpad/audit/work/L04-class-features/q.mjs "select c.eng_name::text, co.group_name, cco.levels_granted::text, count(*) from class_choice_option cco join choice_option co on co.option_id=cco.choice_option_id join class c on c.class_id=cco.class_id where c.ruleset='RULES_2024' group by 1,2,3"

**Куди дивитись:** Засіяти 10 choice_option з ruleset=RULES_2024 і class_choice_option для SORCERER_2024 з levels_granted={2,10,17}; додати class_feature-рядки на 10 і 17 як окремі фічі (модель «Improved Brutal Strike L13/L17»).

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed`

**Скептик:** Перевірив усі шість пунктів; знахідка підтверджується власними доказами, спростувати не вдалося.

(1) ПРАВИЛО — оракул сходиться дослівно. `data/2024/srd/classes.md`: таблиця Sorcerer має «Metamagic» у рядках 2 (:7282), 10 (:7418) і 17 (:7537); текст :7690 «you gain two Metamagic options of your choice», :7694 «You gain two more options at Sorcerer level 10 and two more at Sorcerer level 17»; розділ «### Metamagic Options» (:7722) має рівно 10 підзаголовків (Careful, Distant, Empowered, Extended, Heightened, Quickened, Seeking, Subtle, Transmuted, Twinned). Тобто «6 опцій із 10» у полі expected — правильно, і це саме 2024 (у 2014 інша прогресія 2/+1/+1, і вона в базі є).

(2) КОД І ДАНІ — обробки в іншому місці немає, перевірив чотири шари незалежно.
• Джерело: `data/2024/normalized/classes.json` — у Sorcerer рівно 10 фіч, «Метамагія» лише на рівні 2, кожна фіча несе тільки `{level, name, description}`; переліку опцій немає в самому файлі-джерелі.
• Сід: `prisma/seed/choiceOptionSeed.ts:202` («METAMAGIC OPTIONS (SORCERER)») і `prisma/seed/classChoiceOptionSeed.ts:519` («SORCERER METAMAGIC», `levelsGranted: [3,10,17]`) звʼязані лише з `Classes.SORCERER_2014`. Ґреп усього репо по `SORCERER_2024` дає тільки translation.ts, classesBaseASI.ts, bastions.ts, spell-preparation-2024.ts, multiclass-proficiencies.ts — жодного сіду.
• База `spells_test`, мої власні запити: SORCERER_2024 має 10 рядків `class_feature`, `Sorcerer: Metamagic (2024)` рівно один, `level_granted=2`, `PASSIVE`, `mechanic_metadata=null`; `choice_option` для RULES_2024 — 5 груп (Характеристика 148, Потойбічні виклики 31, Володіння 18, Бойовий стиль 10, Список заклинань 3), групи метамагії немає; `class_choice_option` для RULES_2024 — тільки FIGHTER/PALADIN/RANGER (Бойовий стиль) і WARLOCK (виклики); `class_optional_feature` для RULES_2024 — 0 рядків.
• Каталог, який реально читає конструктор: `src/lib/generated/creator-content-2024.json`, SORCERER_2024 → `classChoiceOptions: []`, `classOptionalFeatures: []`.
• Логіка: `src/lib/logic/choicePoolRules.ts` має правило лише для SORCERER_2014 (`mapPicks({3:2,10:1,17:1})`); правило для WARLOCK_2024 там є — тобто механізм edition-agnostic і вже застосований у KR18.8, просто чародія оминули. UI: `LevelUpWizard.tsx:844` (автор писав 834 — дрібний дрейф) додає крок `class-choices` лише коли `Object.keys(classChoiceGroups).length > 0`.

(3) РІШЕННЯ ВЛАСНИКА — немає. У `docs/DECISIONS.md` жодного пункту про це; у `docs/KNOWN-BUGS.md` розділ «Прийнято» містить тільки BUG-001…003 (валідація на сервері). Найближче — `docs/o13-2024-completeness/kr13.2-class-features.md:89-92`: «Поза межами — Механіка: жодна фіча не отримує mechanicType складніший за PASSIVE, **поки не буде окремого рішення**». Це відкладення в межах закритого KR, а не прийнята поведінка: окремого рішення так і не ухвалено, а аналогічний випадок (виклики чорнокнижника 2024) закрито KR18.8 як дефект. O18 «Створення персонажа 2024» закрита 8/8, і класових виборів у її переліку розбіжностей немає взагалі. Р24 зняв передрелізний гейт 2024 — наступний деплой віддає це живим користувачам.

(4) IN-FLIGHT — ні. Жоден із задіяних файлів (`choicePoolRules.ts`, `prisma/seed/*`, `data/2024/normalized/classes.json`, `LevelUpWizard.tsx`, генерований каталог) не входить у список паралельної сесії KR27.7/KR30.3.

(5) ВЖЕ ВІДКРИТО — ні. Серед цілей O1–O30 немає KR про класові вибори чи механіку класів 2024. Побічне підтвердження, що діра ширша за чародія: `docs/o26-starting-equipment-2024/kr26.2-class-equipment-seed.md:142` фіксує, що в Монаха 2024 `classChoiceOptions` і `toolProficiencies` порожні.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою CONTEXT правильна: вибір гравця не губиться при збереженні, він не існує взагалі (відсутній вибір/риса). Не P0 — створення й підвищення чародія 2024 не падають.

Дві поправки до формулювання автора, які не змінюють вердикту:
• Друга половина заголовка («рядка риси немає на 10 і 17») — менший, окремий симптом: у 2014 повторні вибори їдуть через `class_choice_option.levels_granted = {3,10,17}`, а не через додаткові рядки `class_feature`, і `ClassFeature @@unique([classId, featureId])` (`prisma/schema.prisma:170`) другий рядок тієї самої фічі заборонив би. Відсутність рядків на 10/17 бʼє по таблиці класу в каталозі, а не по механіці вибору.
• `classification: data` приймаю як домінанту (рядків немає жодних), але полагодити самим сідом не вийде: без правила в `choicePoolRules.ts` `picksAtLevelForGroup` повертає дефолтну 1 (`if (!rule) return 1;`), тож засіяні опції дали б 1 вибір замість 2/2/2. Потрібен один рядок коду разом із даними.


### L04-class-features-04 — Warlock: Містичний Арканум є тільки на 11-му рівні — заклинання 7, 8 і 9 кола (рівні 13, 15, 17) не видаються

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — таблиця Warlock: L11 «Mystic Arcanum (level 6 spell)», L13 «Mystic Arcanum (level 7 spell)», L15 «(level 8 spell)», L17 «(level 9 spell)».

**Має бути:** Чорнокнижник отримує по одному заклинанню 6/7/8/9 кола на рівнях 11/13/15/17, кожне — раз на довгий відпочинок.

**Є:** Тільки один Містичний Арканум на 11-му, без числа використань; заклинання 7, 8 і 9 кола не з'являються ніколи.

**Доказ:** Дамп class_feature (cf-2024.json), WARLOCK_2024: єдиний рядок «Warlock: Mystic Arcanum (2024)», level_granted=11. На 13, 15, 17 у чорнокнижника 2024 немає жодного class_feature. Для порівняння, у RULES_2014 це зроблено чотирма окремими фічами — Mystic Arcanum (6th level)…(9th level), кожна з uses_count=1, limited_uses_per=LONG_REST (SQL-вивід у звіті).

**Відтворення:** node scratchpad/audit/work/L04-class-features/q.mjs "select cf.level_granted, f.eng_name from class_feature cf join class c on c.class_id=cf.class_id join feature f on f.feature_id=cf.feature_id where c.eng_name='WARLOCK_2024' order by 1"

**Куди дивитись:** Три додаткові фічі «Warlock: Mystic Arcanum L13/L15/L17 (2024)» у data/2024/normalized/classes.json + uses_count=1, limited_uses_per=LONG_REST (перетинається зі знахідкою -01).

**Файли:** `data/2024/normalized/classes.json`


### L04-class-features-05 — Fighter: на 13-му рівні немає Indomitable (two uses), а на 17-му воїн не отримує жодної класової риси замість Action Surge (two uses) + Indomitable (three uses)

**Статус:** 🔴 числа закрито, рядки — ні (KR31.3, 2026-09-06). `Fighter: Indomitable (2024)` тепер несе `[{9,1},{13,2},{17,3}]`, `Action Surge` — `[{2,1},{17,2}]`, тож максимум на 13-му й 17-му правильний. Самих рядків риси на цих рівнях у `class_feature` як не було, так і немає — це прогалина контенту, а не чисел.

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — таблиця Fighter: L2 «Action Surge (one use), Tactical Mind»; L9 «Indomitable (one use), Tactical Master»; L13 «Indomitable (two uses), Studied Attacks»; L17 «Action Surge (two uses), Indomitable (three uses)».

**Має бути:** На 13-му воїн отримує другий заряд Незламності, на 17-му — другий заряд Пориву дій і третій Незламності.

**Є:** 13-й рівень додає лише Studied Attacks; 17-й рівень не додає нічого, крім підкласової риси. Кількість використань ніде не зростає (див. -01).

**Доказ:** Дамп class_feature (cf-2024.json), FIGHTER_2024: «Fighter: Action Surge (2024)» тільки level_granted=2, «Fighter: Indomitable (2024)» тільки level_granted=9. На L13 у базі лише «Fighter: Studied Attacks (2024)»; на L17 — жодного рядка. Причина структурна: prisma/schema.prisma:170 `ClassFeature @@unique([classId, featureId])` не дає видати ту саму фічу двічі; у варвара цей самий випадок обійшли двома записами — «Barbarian: Improved Brutal Strike L13 (2024)» і «… L17 (2024)» (обидва є в базі), для воїна прийом не застосували.

**Відтворення:** node scratchpad/audit/work/L04-class-features/q.mjs "select cf.level_granted, f.eng_name from class_feature cf join class c on c.class_id=cf.class_id join feature f on f.feature_id=cf.feature_id where c.eng_name='FIGHTER_2024' order by 1"

**Куди дивитись:** Або окремі фічі з суфіксом рівня (як у варвара), або, краще, реальні числа використань у uses_count_special ([{lvl:2,uses:1},{lvl:17,uses:2}] для Action Surge; [{lvl:9,uses:1},{lvl:13,uses:2},{lvl:17,uses:3}] для Indomitable — рівно так, як у RULES_2014), що зніме потребу в повторному гранті.

**Файли:** `data/2024/normalized/classes.json`, `prisma/schema.prisma`


### L04-class-features-06 — Divine Order (клірик 1) і Primal Order (друїд 1) подані однією пасивною рисою без вибору — гравець не обирає роль і не отримує важкий/середній обладунок та військову зброю, що вона дає

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md:2205–2211 «#### Level 1: Divine Order — You have dedicated yourself to one of the following sacred roles of your choice. _Protector._ Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor. _Thaumaturge._ You know one extra cantrip from the Cleric spell list. In addition… bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1).»; :3521–3527 «#### Level 1: Primal Order … _Magician._ You know one extra cantrip from the Druid spell list… _Warden._ Trained for battle, you gain proficiency with Martial weapons and training with Medium armor.»

**Має бути:** На 1-му рівні клірик обирає Protector (військова зброя + важкий обладунок) або Thaumaturge (додатковий замовляння + бонус до Arcana/Religion, рівний модифікатору WIS); друїд — Magician або Warden (військова зброя + середній обладунок).

**Є:** Вибору немає; жодне з володінь не видається. Клірик-Protector не отримує важкого обладунку, тож похідні КЗ і атаки на листі неправильні.

**Доказ:** class_choice_option для CLERIC_2024 і DRUID_2024 — 0 рядків (повний перелік 2024-груп: тільки Бойовий стиль у воїна/паладина/мисливця і Потойбічні виклики у чорнокнижника). SQL по фічах: «Cleric: Divine Order (2024)» і «Druid: Primal Order (2024)» — mechanic_type=PASSIVE, mechanic_metadata=null, armor_proficiencies='{}', weapon_proficiencies=null, skill_proficiencies=null. Програмна збірка (build-to-six.out.json, 02-dwarf-cleric-farmer): клірик 1-го рівня має рівно «Cleric: Divine Order (2024)», жодної гілки Protector/Thaumaturge, кроку вибору в конструкторі не було.

**Відтворення:** node scratchpad/audit/work/L04-class-features/q.mjs "select f.eng_name, f.armor_proficiencies::text, f.weapon_proficiencies::text, cf.mechanic_type::text from feature f join class_feature cf on cf.feature_id=f.feature_id where f.eng_name ilike '%divine order%' or f.eng_name ilike '%primal order%'"

**Куди дивитись:** Додати дві групи choice_option (RULES_2024) з class_choice_option levels_granted={1} для CLERIC_2024 і DRUID_2024, кожна опція — окрема фіча з armor_proficiencies/weapon_proficiencies (Protector/Warden) або з додатковим замовлянням (Thaumaturge/Magician).

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed`

**Скептик:** Спростувати не вдалося — усі чотири ланки підтвердились незалежно.

(1) ПРАВИЛО. `data/2024/srd/classes.md` (розділ Cleric, «#### Level 1: Divine Order»): «You have dedicated yourself to one of the following sacred roles **of your choice**. _Protector._ …you gain proficiency with Martial weapons and training with **Heavy armor**. _Thaumaturge._ You know one extra cantrip… bonus to your Intelligence (Arcana or Religion) checks… equals your Wisdom modifier (minimum of +1)». Друїд, «#### Level 1: Primal Order»: _Magician_ / _Warden_ («Martial weapons and training with **Medium armor**»). Це саме 2024; у 2014 таких рис не існує взагалі. Цитата автора точна.

(2) КОД. Іншого місця обробки немає. Пошук по всьому дереву (`src/`, `prisma/`, `scripts/`, `tests/`, `docs/`) за `divine order|primal order|Божественний орден|Первісн… орден|DIVINE_ORDER|PRIMAL_ORDER` дає рівно три немеханічні збіги: `src/lib/refs/dictionary.json:885` (термін) і два описи в `data/2024/normalized/classes.json` — жодного рядка логіки. Крок вибору в конструкторі вмикають лише два прапорці: `MultiStepForm.tsx:244–250` (`classChoiceOptions` з `levelsGranted∋1`, `classOptionalFeatures` з `grantedOnLevels∋1`) → `creation-step-resolver.ts:65–66`. Обидва масиви порожні: у `src/lib/generated/creator-content-2024.json` (файл генерується з **робочої** бази, тобто це стан прода, не лише клона) CLERIC_2024 і DRUID_2024 — `choiceOpts=0, optFeats=0`.

(3) ДАНІ. Власний запит до `spells_test`: `Cleric: Divine Order (2024)` (feature_id 48882) і `Druid: Primal Order (2024)` (48894) — `level_granted=1`, `mechanic_type=PASSIVE`, `mechanic_metadata=null`, `armor_proficiencies='{}'`, `weapon_proficiencies=null`, `skill_proficiencies=null`, `uses_count=null`. Групи вибору немає ніде: повний перелік `choice_option` для `RULES_2024` — рівно пʼять груп (Характеристика 148, Володіння 18, Бойовий стиль 10, Потойбічні виклики 31, Список заклинань 3); `class_choice_option`/`class_optional_feature` для class_id 341 і 342 — по 0. Джерело сіду теж порожнє: у `data/2024/normalized/classes.json` риса має лише `{level, name, descriptionEng, displayOrder}`, а класовий обʼєкт узагалі не має полів володінь.

(4) РІШЕННЯ ВЛАСНИКА — не знайдено такого, що робило б це прийнятим. Найближче — `docs/o13-2024-completeness/kr13.2-class-features.md:89–92` «Поза межами: Механіка: жодна фіча не отримує `mechanicType` складніший за `PASSIVE`, **поки не буде окремого рішення**». Це відкладення обсягу одного KR, а не рішення, що персонаж може рахуватися не за книгою; окремого рішення в `DECISIONS.md` немає, у «Прийнято» `KNOWN-BUGS.md` (BUG-001…003) цього немає, у «Поза межами» O18 теж.

(5) ВЖЕ ВІДКРИТО — ні. O18 «Створення персонажа 2024» закрито 8/8 із «0 червоних із 27 критеріїв», і Divine/Primal Order у ті 27 критеріїв не входить — дірка пережила ціль паритету. Тобто відкритого KR, який це тримає, немає; найближчий родич (відсутність ресурсів 2024) зафіксований як вимір у журналі O24 («жодна фіча 2024 не підключена до пулів ресурсів — це сід контенту, не цей KR»), теж без власного KR.

(6) IN-FLIGHT — ні: жоден із файлів паралельної сесії (spell-preparation-2024, spellcasting-progression, spell-actions, pers-actions, AddSpellDialog…) до цього не дотичний.

(7) СЕРЙОЗНІСТЬ. P1 правильна за шкалою CONTEXT з двох підстав одразу: вибір гравця, який книга називає «of your choice», у застосунку не існує; і володіння втрачається — клірик-Protector не отримує ані військової зброї, ані важкого обладунку, тож КЗ і атаки на листі рахуються не за книгою.

Класифікація `data` — правильна, з однією поправкою на хвіст. Примітиви для цього вже є й доведено edition-agnostic (Бойовий стиль 2024 і 31 виклик чорнокнижника їдуть саме через `ClassChoiceOption` + `ChoiceOptionFeature` → `Feature.armorProficiencies/weaponProficiencies`), тож гілки Protector/Warden — чистий сід. А ось бонус «+модифікатор МУД до перевірок Інт (Arcana/Religion)» схема `Feature` не тримає взагалі (у моделі є `bonusToAttackRoll`, `bonusToSavingThrows`, `givesAC`, але поля бонусу до перевірок навички за модифікатором характеристики немає — `prisma/schema.prisma:398–443`), як і додаткове замовляння понад ліміт. Тобто ~80 % знахідки — data, решта — missing-system.


### L04-class-features-07 — Barbarian Primal Knowledge (3-й рівень) не дає навички і не пропонує вибору

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md:280–282 «#### Level 3: Primal Knowledge — You gain proficiency in another skill of your choice from the skill list available to Barbarians at level 1.»

**Має бути:** Варвар на 3-му рівні обирає ще одну навичку зі свого списку 1-го рівня (Animal Handling, Athletics, Intimidation, Nature, Perception, Survival).

**Є:** Отримує пасивний текст; навичка не додається, вибір не пропонується.

**Доказ:** SQL: «Barbarian: Primal Knowledge (2024)» — skill_proficiencies=null, mechanic_type=PASSIVE, mechanic_metadata=null; class_choice_option для BARBARIAN_2024 — 0 рядків (повний перелік 2024-груп у знахідці -03).

**Відтворення:** node scratchpad/audit/work/L04-class-features/q.mjs "select f.eng_name, f.skill_proficiencies::text from feature f where f.eng_name ilike '%primal knowledge%'"

**Куди дивитись:** Або feature.skill_proficiencies з {choiceCount:1, options:[…]} (шлях, яким уже йде needsSkillProficiencies у LevelUpWizard.tsx:~490), або class_choice_option levels_granted={3} з effect_kind=SKILL_PROFICIENCY.

**Файли:** `data/2024/normalized/classes.json`, `src/lib/components/levelUp/LevelUpWizard.tsx`

**Скептик:** (1) ПРАВИЛО — цитата точна. `data/2024/srd/classes.md:280–282`: «#### Level 3: Primal Knowledge — You gain proficiency in another skill of your choice from the skill list available to Barbarians at level 1.» Список 1-го рівня там же (`classes.md:21–23`): «Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival» — «expected» автора збігається. Це саме 2024: у 2014 «Primal Knowledge» — необовʼязкова риса TCoE (рівні 3 і 10), у 2024 вона базова.

(2) КОД — обробки в іншому місці немає, і я довів це не запитом, а збіркою. Власний прогін через справжні `createCharacter`/`levelUpCharacter` (варвар-людина 2024, походження Мудрець, до 3-го рівня): набір навичок на рівнях 1, 2 і 3 **байт у байт однаковий** — ARCANA, ATHLETICS, HISTORY, SURVIVAL; на 3-му додалася риса `Barbarian: Primal Knowledge (2024)` і жодної навички. Сильніше: я **навмисно** передав серверу `levelUpSkillSelections: { "48855": ["NATURE"] }` — сервер мовчки проковтнув і нічого не записав, бо `src/server/db/levelup-persistence.ts:976` робить `normalizeSkillProficiencies(f.skillProficiencies, …)`, а поле `null` → гілки ні «fixed», ні «choice» не спрацьовують. Тобто дефект не в клієнті: навіть якби майстер показав крок, зберегти вибір нічим. Клієнтський гейт автора теж підтвердився (`LevelUpWizard.tsx:493–505`, `needsSkillProficiencies` вимагає `choiceCount > 0`), і це єдиний майстер підвищення — маршрут один, `src/app/char/[id]/levelup/wizard-data.tsx:2`.

(3) РІШЕННЯ ВЛАСНИКА — немає. У `docs/DECISIONS.md` нічого про це; у `docs/KNOWN-BUGS.md` розділ «Прийнято» тримає лише BUG-001…003; у «Поза межами» O18 і O27 цього теж немає. Найближче — `docs/o13-2024-completeness/kr13.2-class-features.md:89–92`: «Механіка: жодна фіча не отримує mechanicType складніший за PASSIVE, **поки не буде окремого рішення**. Мета цього KR — щоб фічі були видимі й правильні текстом, а не щоб рушій їх рахував.» Це свідома **відкладка в межах одного KR**, а не рішення власника, що так і має лишитися; сам текст прямо каже «поки не буде окремого рішення». Тому `accepted` не ставлю.

(4) IN-FLIGHT — ні. Жоден із файлів (`data/2024/normalized/classes.json`, `prisma/seed/**`, `LevelUpWizard.tsx`, `levelup-persistence.ts`) не в переліку паралельної сесії (KR27.7/KR30.3 — заклинання й мультиклас).

(5) ВЖЕ ВІДКРИТО — ні. O13 закрив KR13.1–13.4 і 13.6 (13.5 і 13.7 чекають на рішення власника, не на код), O18 закрив види/риси/майстерність зброї/виклики, O27 — мультиклас. Жоден відкритий KR не несе механіку класових рис 2024.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою CONTEXT («відсутня риса/вибір/слот/володіння» + «вибір гравця губиться»): володіння навичкою не додається (втрачений подвоєний… ні, звичайний бонус майстерності на перевірках), і вибір, який книга називає «of your choice», не існує ніде в потоці.

Класифікація `data` правильна: механізм у коді працює й донині обслуговує 2014 (`prisma/seed/classFeatureSeed.ts:291` — та сама риса з `skillProficiencies.options`), порожні саме дані.


### L05-class-choices-01 — Клірик 2024 ніколи не обирає Divine Order (Захисник / Дивотворець) — крок вибору не існує ні в конструкторі, ні деінде

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:2205–2211 — «#### Level 1: Divine Order … You have dedicated yourself to one of the following sacred roles of your choice. _Protector._ Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor. _Thaumaturge._ You know one extra cantrip from the Cleric spell list…»

**Має бути:** Крок вибору між Protector (володіння бойовою зброєю + важкі обладунки) і Thaumaturge (додаткове замовляння клірика + бонус до перевірок Інтелекту, рівний модифікатору Мудрості).

**Є:** Вибору немає взагалі. Кожен клірик 2024 назавжди без бойової зброї, без важких обладунків і без додаткового замовляння.

**Доказ:** SQL по spells_test: `select c.eng_name, count(*) from class_choice_option cco join class c using(class_id) where cco.ruleset='RULES_2024' group by 1` → рівно 4 класи: FIGHTER_2024, PALADIN_2024, RANGER_2024, WARLOCK_2024. Для CLERIC_2024 — 0 рядків. Риса існує лише як текст: class_feature → `Cleric: Divine Order (2024)`, level_granted=1, у feature всі механічні поля порожні. Ланцюг у коді: MultiStepForm.tsx:244 `hasLevelOneChoices = cls?.classChoiceOptions?.some(opt => opt.levelsGranted.includes(1))` → creation-step-resolver.ts:65 `if (conditions.hasLevelOneChoices) steps.push({id:"classChoices"})`. Браузер http://127.0.0.1:3100/2024/char: після кліку на клас CLERIC_2024 наступний крок — «Оберіть передісторію» (скріншот scratchpad/audit/shots/L05-CLERIC_2024-afterclass.png; повний список кроків: race, class, background, asi, skills, languages, equipment, name).

**Відтворення:** 1. http://127.0.0.1:3100/2024/char 2. обрати будь-який вид → «Далі» 3. обрати клас «Клірик» 4. «Далі» → одразу «Оберіть передісторію».

**Куди дивитись:** Засіяти choice_option (2 опції, ruleset RULES_2024) + class_choice_option для CLERIC_2024 з levels_granted={1}; ефект Protector — володіння через choice_option_feature/feature.weaponProficiencies+armorProficiencies (зразок — 2014 «Налаштування Слідопита»).

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed/`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/lib/components/characterCreator/creation-step-resolver.ts`


### L05-class-choices-02 — Друїд 2024 ніколи не обирає Primal Order (Magician / Warden)

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:3521–3527 — «#### Level 1: Primal Order … _Magician._ You know one extra cantrip from the Druid spell list… _Warden._ Trained for battle, you gain proficiency with Martial weapons and training with Medium armor.»

**Має бути:** Крок вибору Magician (додаткове замовляння друїда + бонус до Інтелекту) або Warden (бойова зброя + середні обладунки).

**Є:** Вибору немає; жоден друїд 2024 не може взяти ні додаткове замовляння, ні бойову зброю.

**Доказ:** class_choice_option для DRUID_2024 — 0 рядків (той самий запит, що в -01). Риса `Druid: Primal Order (2024)` існує в class_feature на рівні 1 лише як текст. Браузер: після вибору класу «Друїд» на /2024/char кроки — race, class, background, asi, skills, languages, equipment, name; кроку «Опції класу» немає.

**Відтворення:** 1. http://127.0.0.1:3100/2024/char 2. вид → «Далі» 3. клас «Друїд» 4. «Далі» → «Оберіть передісторію».

**Куди дивитись:** Як у -01: choice_option + class_choice_option (levels_granted={1}) для DRUID_2024; Warden видає MARTIAL_WEAPON і MEDIUM.

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed/`, `src/lib/components/characterCreator/creation-step-resolver.ts`


### L05-class-choices-04 — Чародій 2024 не має Метамагії взагалі — ні опцій у базі, ні правила кількості виборів

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:7688–7694 — «#### Level 2: Metamagic … you gain two Metamagic options of your choice … Whenever you gain a Sorcerer level, you can replace one of your Metamagic options … You gain two more options at Sorcerer level 10 and two more at Sorcerer level 17.»

**Має бути:** На 2-му рівні — вибір 2 метамагій із 8, на 10-му ще 2, на 17-му ще 2; заміна однієї при кожному підвищенні.

**Є:** Метамагії не існує; очки чаклунства (Font of Magic) нікуди витрачати — чародій 2024 механічно порожній із 2-го рівня.

**Доказ:** SQL: `select group_name, count(*) from choice_option where ruleset='RULES_2024' group by 1` → лише «Характеристика» 148, «Потойбічні виклики» 31, «Володіння» 18, «Бойовий стиль» 10, «Список заклинань» 3. Групи «Метамагія» під RULES_2024 не існує; class_choice_option для SORCERER_2024 — 0 рядків. У src/lib/logic/choicePoolRules.ts:78 правило picksAtLevel є лише для SORCERER_2014 (mapPicks({3:2,10:1,17:1})); для SORCERER_2024 правила немає, тож picksAtLevelForGroup поверне дефолтну 1 навіть після засіву опцій. Браузер: SORCERER_2024 на 1-му рівні кроку «Опції класу» не має (правильно — метамагія з 2-го), але й на підвищенні крок не з'явиться: LevelUpWizard.tsx:834 додає крок class-choices лише коли Object.keys(classChoiceGroups).length > 0.

**Відтворення:** node q.mjs "select * from class_choice_option cco join class c using(class_id) where c.eng_name='SORCERER_2024'" → 0 рядків.

**Куди дивитись:** Засіяти 8 метамагій 2024 як choice_option + class_choice_option levels_granted={2,10,17}; додати до CHOICE_POOL_RULES правило {scope:'class', className:'SORCERER_2024', groupName: CHOICE_GROUPS.SORCERER_METAMAGIC, picksAtLevel: mapPicks({2:2,10:2,17:2})}.

**Файли:** `src/lib/logic/choicePoolRules.ts`, `prisma/seed/`, `data/2024/normalized/classes.json`


### L05-class-choices-05 — Експертиза 2024 не працює в жодного класу: skill_expertises порожнє в Rogue/Bard/Ranger/Wizard, а других надань (Rogue 6, Bard 9) немає навіть як рядків

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:7033–7037 (Rogue: 2 на 1-му, ще 2 на 6-му); :888–892 (Bard: 2 на 2-му, ще 2 на 9-му); :6457–6459 (Ranger: 2 на 9-му); :10247–10249 (Wizard Scholar: експертиза в одній з Arcana/History/Investigation/Medicine/Nature/Religion).

**Має бути:** Пройдисвіт на 1-му і 6-му, бард на 2-му і 9-му обирають по 2 експертизи; слідопит 2 на 9-му; чарівник 1 на 2-му з шести названих навичок.

**Є:** Експертизи не існує в жодного класу 2024. Крім порожнього поля, у 2024 немає й окремих рис другого надання (Rogue @6, Bard @9), тож ці рівні не дадуть нічого навіть після заповнення поля.

**Доказ:** SQL по spells_test: жодна риса 2024 не має механіки вибору — `select … from class_feature cf join feature f using(feature_id) where cf.ruleset='RULES_2024' and (f.skill_expertises is not null or f.skill_proficiencies is not null or f.invocations_count is not null or f.gives_maneuvres=true or f.superiority_dice_count is not null)` → 0 рядків. Конкретно: `Rogue: Expertise (2024)` (level 1), `Bard: Expertise (2024)` (level 2), `Ranger: Expertise (2024)` (level 9), `Wizard: Scholar (2024)` (level 2) — у всіх skill_expertises = null. Для порівняння RULES_2014: `Expertise` {"count":2,"chooseFromCurrentProficiencies":true} (level 1), `Expertise 2` (level 6), `Expertise (Bard)` (level 3), `Expertise (Bard) 2` (level 10). Код читає рівно це поле: MultiStepForm.tsx:521–545 (hasExpertiseChoice) і LevelUpWizard.tsx:506–530 (needsExpertise). Браузер: ROGUE_2024 1-го рівня — кроки race, class, weaponMastery, background, asi, skills, languages, equipment, name; кроку «Експертиза» немає (shots/L05-ROGUE_2024-afterclass.png).

**Відтворення:** 1. http://127.0.0.1:3100/2024/char 2. вид → «Далі» 3. клас «Пройдисвіт» → кроки не містять «Експертиза». 4. SQL вище на spells_test.

**Куди дивитись:** Заповнити feature.skill_expertises у чотирьох рисах ({"count":2,"chooseFromCurrentProficiencies":true}; Scholar — {"count":1,"options":[…6 навичок]}) і додати рядки class_feature другого надання для Rogue @6 і Bard @9 (окремі feature, як у 2014).

**Файли:** `prisma/seed/`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/lib/components/levelUp/LevelUpWizard.tsx`


### L05-class-choices-06 — Клірик Blessed Strikes (7) і Improved Blessed Strikes (14) не пропонують вибору Divine Strike / Potent Spellcasting

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:2239–2245 — «#### Level 7: Blessed Strikes … You gain one of the following options of your choice … _Divine Strike._ … extra 1d8 Necrotic or Radiant damage … _Potent Spellcasting._ Add your Wisdom modifier to the damage you deal with any Cleric cantrip.»

**Має бути:** На 7-му рівні клірик обирає Divine Strike або Potent Spellcasting; вибір впливає на шкоду.

**Є:** Вибору немає; риса лишається описовим текстом без механіки.

**Доказ:** У базі є обидві риси (class_feature: `Cleric: Blessed Strikes (2024)` level 7, `Cleric: Improved Blessed Strikes (2024)` level 14), але class_choice_option для CLERIC_2024 — 0 рядків. Крок class-choices у майстрі підвищення з'являється лише коли Object.keys(classChoiceGroups).length > 0 (src/lib/components/levelUp/LevelUpWizard.tsx:834), а classChoiceGroups будується фільтром (selectedClass.classChoiceOptions || []).filter(opt => opt.levelsGranted.includes(classLevelAfter)) (LevelUpWizard.tsx:596).

**Відтворення:** node q.mjs "select * from class_choice_option cco join class c using(class_id) where c.eng_name='CLERIC_2024'" → 0 рядків; у LevelUpWizard крок class-choices неможливий.

**Куди дивитись:** Засіяти дві опції з levels_granted={7} (і окремі для 14) + прив'язати ефект до шкоди (choice_option_feature).

**Файли:** `prisma/seed/`, `src/lib/components/levelUp/LevelUpWizard.tsx`


### L05-class-choices-07 — Варвар Primal Knowledge (3) не дає обрати додаткову навичку

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:280–282 — «#### Level 3: Primal Knowledge — You gain proficiency in another skill of your choice from the skill list available to Barbarians at level 1.»

**Має бути:** На 3-му рівні варвар обирає ще одну навичку з класового списку.

**Є:** Навичка не надається і не питається.

**Доказ:** feature.skill_proficiencies у `Barbarian: Primal Knowledge (2024)` = null (запит по class_feature з ruleset='RULES_2024' на поля механіки повернув 0 рядків — див. -05). Крок «Навички» на підвищенні виникає лише коли риса рівня несе skillProficiencies з choiceCount > 0 (src/lib/components/levelUp/LevelUpWizard.tsx:487–503).

**Відтворення:** node q.mjs "select f.eng_name, f.skill_proficiencies from class_feature cf join feature f using(feature_id) where f.eng_name='Barbarian: Primal Knowledge (2024)'" → skill_proficiencies null.

**Куди дивитись:** Дописати feature.skill_proficiencies = {"choiceCount":1,"options":[…класовий список варвара]}.

**Файли:** `prisma/seed/`, `src/lib/components/levelUp/LevelUpWizard.tsx`


### L05-class-choices-09 — Паладин 2024 без опції Blessed Warrior, Слідопит 2024 без Druidic Warrior у бойовому стилі

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:5651–5655 — «#### Level 2: Fighting Style … Instead of choosing one of those feats, you can choose the option below. **Blessed Warrior.** You learn two Cleric cantrips of your choice … Charisma is your spellcasting ability for them.»; data/2024/srd/classes.md:6435–6439 — те саме з «_Druidic Warrior._ You learn two Druid cantrips of your choice … Wisdom is your spellcasting ability for them.»

**Має бути:** У паладина на 2-му рівні 11 опцій (10 стилів + Blessed Warrior), у слідопита 11 (10 + Druidic Warrior).

**Є:** По 10; магічний варіант бойового стилю зібрати неможливо.

**Доказ:** SQL: PALADIN_2024 і RANGER_2024 мають рівно ті самі 10 опцій, що й Воїн — Fighting Style 2024 (Archery, Blind Fighting, Defense, Dueling, Great Weapon Fighting, Interception, Protection, Thrown Weapon Fighting, Two Weapon Fighting, Unarmed Fighting), і жодної одинадцятої. Записів «Blessed Warrior» / «Druidic Warrior» у choice_option під RULES_2024 немає взагалі.

**Відтворення:** node q.mjs "select c.eng_name, co.option_name_eng from class_choice_option cco join class c using(class_id) join choice_option co on co.option_id=cco.choice_option_id where cco.ruleset='RULES_2024' and c.eng_name in ('PALADIN_2024','RANGER_2024') order by 1,2".

**Куди дивитись:** Додати дві опції; вони мають ще й видати по два замовляння з чужого списку (клірика/друїда) як заклинання свого класу з відповідною характеристикою — тягне за собою джерело замовляння (див. Р38).

**Файли:** `prisma/seed/`, `data/2024/normalized/classes.json`


### L05-class-choices-10 — Виклик Thirsting Blade відсутній серед 31 виклику 2024, хоча Devouring Blade у тих самих даних вимагає його як передумову

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:9211–9213 — «#### Thirsting Blade — _Prerequisite: Level 5+ Warlock, Pact of the Blade Invocation_»

**Має бути:** 32 виклики, серед них Thirsting Blade (додаткова атака зброєю пакту з 5-го рівня).

**Є:** Виклика немає; чорнокнижник-клинок не отримує Extra Attack — центральну рису білда Pact of the Blade. Передумова Devouring Blade посилається на неіснуючий запис.

**Доказ:** У базі 31 виклик під RULES_2024 (група «Потойбічні виклики»), Thirsting Blade серед них немає. Джерело сіду data/2024/normalized/invocations.json теж має рівно 31 запис без нього, при цьому запис «Пожиральний клинок [Devouring Blade]» несе передумову «Рівень 12+, Дар: Pact of the Blade, Thirsting Blade».

**Відтворення:** node q.mjs "select option_name_eng from choice_option where ruleset='RULES_2024' and group_name='Потойбічні виклики' order by 1" → 31 назва, Thirsting Blade відсутній.

**Куди дивитись:** Додати запис у data/2024/normalized/invocations.json і перелити сід (Р33 — правити файл-джерело, не проходом по базі).

**Файли:** `data/2024/normalized/invocations.json`, `prisma/seed/`


### L07-spellcasting-02 — Класові «завжди підготовлені» заклинання 2024 не надаються: Hunter's Mark, Divine Smite, Find Steed, Speak with Animals

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-09 (KR31.5). Шість класових фіч 2024 із SRD дістали звʼязок
«фіча → заклинання»: Hunter's Mark (слідопит 1), Speak with Animals (друїд 1), Divine Smite
(паладин 2), Find Steed (паладин 5), Contact Other Plane (чорнокнижник 9), Power Word Heal і
Power Word Kill (бард 20). Перші два видаються вже в конструкторі, решта — на своєму рівні.

**Правило:** data/2024/srd/classes.md:6416 «You always have the _Hunter's Mark_ spell prepared»; :5659 «You always have the _Divine Smite_ spell prepared»; :5692 «You always have the _Find Steed_ spell prepared»; :3517 «you always have the _Speak with Animals_ spell prepared».

**Має бути:** Слідопит 1 отримує Hunter's Mark завжди підготовленим; Паладин 2 — Divine Smite; Паладин 5 — Find Steed; Друїд 1 — Speak with Animals, усі поза лімітом підготовлених.

**Є:** Жодного рядка pers_spell. Заклинання є у списках класу, тож гравець може додати їх руками — але вони підуть у ліміт і не будуть позначені як завжди готові.

**Доказ:** Запит до spells_test: `select f.eng_name, cf.level_granted, (select count(*) from "_FeatureToSpell" x where x."A"=f.feature_id) as spells from class c join class_feature cf on cf.class_id=c.class_id join feature f on f.feature_id=cf.feature_id where c.ruleset='RULES_2024'` → «Ranger: Favored Enemy (2024)» lvl 1 spells=0; «Paladin's Smite (2024)» lvl 2 spells=0; «Paladin: Faithful Steed (2024)» lvl 5 spells=0; «Druid: Druidic (2024)» lvl 1 spells=0. Загальний перелік фіч 2024 зі заклинаннями містить ЛИШЕ родоводи видів (Elven Lineage ×3, Fiendish Legacy ×3, Gnome ×2, Otherworldly Presence).

**Відтворення:** Запит вище до spells_test; або зібрати фікстуру 08-orc-ranger-guide й подивитися persSpells.

**Куди дивитись:** Довести звʼязок feature→spell у сідах класів 2024 (data/2024/normalized/classes.json) і надавати ці рядки при створенні/підвищенні тим самим шляхом, що заклинання видів.

**Файли:** `data/2024/normalized/classes.json`, `src/server/db/character-creation.ts`, `src/server/db/levelup-persistence.ts`

**Скептик:** Спростувати не вдалося — знахідка підтверджена трьома незалежними доказами.

1) ПРАВИЛО. Усі чотири цитати дослівні й саме 2024: `data/2024/srd/classes.md:6416` (Ranger Level 1: Favored Enemy — «You always have the _Hunter's Mark_ spell prepared»), `:5659` (Paladin Level 2: Paladin's Smite — Divine Smite), `:5692` (Paladin Level 5: Faithful Steed — Find Steed), `:3517` (Druid Level 1: Druidic — Speak with Animals).

2) ДАНІ (мій запит до spells_test, не автора). Уся вибірка фіч 2024 зі звʼязком `_FeatureToSpell` — рівно 9 рядків, і всі видові (Elven Lineage ×3, Fiendish Legacy ×3, Gnome ×2, Otherworldly Presence). Цільові фічі існують і мають правильний український опис («Ви завжди маєте підготовленим…»), але з нулем звʼязків і NULL використань: `Ranger: Favored Enemy (2024)` id 48960, `Paladin's Smite (2024)` 48946, `Faithful Steed (2024)` 48951, `Druid: Druidic (2024)` 48893. Самі заклинання в базі є (spell_id 1636/1615/1683/1655) і присутні у списках відповідних класів 2024.

3) КОД — перевірив, чи не робиться це деінде. Ні: `findGrantedSpells` (`src/rules/spell-sources.ts:89`) при будь-якому вході повертає лише видове джерело; `saveGrantedSpells` (`src/server/db/character-creation.ts:350-369`) передає туди тільки `raceTraitFeatures` і `raceChoiceOptions`; левелап пише виключно `buildSpeciesPersSpellRows` (`src/server/db/levelup-persistence.ts:1375-1378`). `feature.givesSpells` у `src/` читають лише видові шляхи, `spell-sources.ts` і магічні предмети. Автокомпенсації на листі теж немає: `spell-prepared-exclusions.ts` знімає ліміт лише за бейджем підкласу/раси.

4) ВЛАСНИЙ ПРОГІН. Зібрав фікстури `08-orc-ranger-guide` і `07-human-paladin-noble` до 5-го рівня справжніми серверними діями (`build2024Character`): обидва мають потрібні фічі в `pers_feature` (`Ranger: Favored Enemy (2024)`; `Paladin's Smite (2024)` + `Faithful Steed (2024)`) і `persSpells = []`. Тобто заклинання не зʼявляються ні на створенні, ні на жодному з чотирьох підвищень.

5) РІШЕННЯ ВЛАСНИКА — не покриває. Р38 (`docs/DECISIONS.md:1623`) стосується лише випадку, коли клас **уже дав** заклинання і друге джерело його не дублює; тут клас не дає нічого. «Поза межами» O18 і O27 цього не виключають, у «Прийнято» `KNOWN-BUGS.md` лише BUG-001…003. Навпаки, намір проєкту записаний у критерії К17 acceptance-набору: «завжди підготовані й даровані заклинання приходять не від гравця, а від правила».

6) IN-FLIGHT / ВІДКРИТИЙ KR — ні те, ні те. Жоден із файлів знахідки не в списку паралельної сесії; у docs немає KR про класові «завжди підготовлені». Єдина дотична згадка — `kr27.5-spell-provenance.md:74` — відкладає позначку «завжди підготоване» для заклинання **риси**, а не класові надання.

7) СЕРЙОЗНІСТЬ P1 підтверджую. `pers_spell` за замовчуванням має `is_prepared=false`, `exclude_from_prepared_count=false`, тож доданий руками Hunter's Mark їсть ліміт: Слідопит 5 за книгою готує 5 заклинань, тут одне з пʼяти витрачається на те, що книга дає безкоштовно. Це «персонаж порахований не за книгою», не UX.

Єдина правка до формулювання автора — класифікація. `data` неточна: додати рядки `_FeatureToSpell` замало, бо `findGrantedSpells` фільтрує лише видове джерело, а в самому джерелі даних `data/2024/normalized/classes.json` фіча має тільки поля `level`/`name`/`description` — поля для заклинань там немає взагалі. Потрібні і дані, і плюмбінг → `missing-system` (effort M, не S).


### L07-spellcasting-03 — Безкоштовні застосування заклинань від класових фіч 2024 не задані — Р38 виконано лише для рис

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:6416 «You can cast it twice without expending a spell slot… regain all expended uses… Long Rest», число росте за колонкою Favored Enemy таблиці Слідопита (2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6); :5659 Паладин кастує Divine Smite раз без слота на довгий відпочинок. docs/DECISIONS.md:1623 (Р38): «безкоштовне застосування… це фіча з обмеженими використаннями (limitedUsesPer / usesCount)».

**Має бути:** Favored Enemy — 2 використання на довгий відпочинок зі зростанням за рівнем; Paladin's Smite і Faithful Steed — по 1 на довгий відпочинок; усі видимі на листі й відновлювані відпочинком.

**Є:** limitedUsesPer/usesCount порожні, тож feature-resources не бачить пулу — ані на листі, ані у відпочинку цих використань немає.

**Доказ:** Запит до spells_test по class_feature+feature для RULES_2024: «Ranger: Favored Enemy (2024)», «Paladin: Paladin's Smite (2024)», «Paladin: Faithful Steed (2024)» — усі мають limited_uses_per = NULL і uses_count = NULL. Для порівняння, риса зроблена правильно: «Magic Initiate: Wizard list (2024)» → limited_uses_per = LONG_REST, uses_count = 1.

**Відтворення:** select f.eng_name, f.limited_uses_per, f.uses_count from class c join class_feature cf on cf.class_id=c.class_id join feature f on f.feature_id=cf.feature_id where c.ruleset='RULES_2024' and f.eng_name like 'Ranger: Favored Enemy%';

**Куди дивитись:** Заповнити limited_uses_per/uses_count (і uses_count_special для прогресії 2/3/4/5/6) у сідах класів 2024; перевірити, що feature-resources.ts підхоплює.

**Файли:** `data/2024/normalized/classes.json`, `src/lib/logic/feature-resources.ts`, `src/rules/resource-pools.ts`


### L08-levelup-machine-03 — Метамагія чародія 2024 не існує як вибір: жодного class_choice_option для SORCERER_2024

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:7688-7690 — «#### Level 2: Metamagic … you gain two Metamagic options of your choice from "Metamagic Options"»; ще по одній на 10-му (рядок 7418) і 17-му (7537)

**Має бути:** На 2-му рівні чародія майстер дає крок «Опції класу» з вибором двох метамагій, обране лежить у _ChoiceOptionToPers і видно на листі.

**Є:** Кроку немає: класових виборів у чародія 2024 нуль. Метамагія лишається описовою фічею без жодного вибору гравця.

**Доказ:** SQL на spells_test: `select c.eng_name, co.group_name, count(*) from class_choice_option cco join choice_option co on co.option_id=cco.choice_option_id join class c on c.class_id=cco.class_id where c.ruleset='RULES_2024' group by 1,2` → лише FIGHTER_2024/Бойовий стиль(10), PALADIN_2024/Бойовий стиль(10), RANGER_2024/Бойовий стиль(10), WARLOCK_2024/Потойбічні виклики(31). Для SORCERER_2024 — 0. Фіча `Sorcerer: Metamagic (2024)` у class_feature на level_granted=2 присутня.

**Відтворення:** Створити чародія 2024 → підвищити до 2-го рівня: у майстрі немає кроку «Опції класу»; _ChoiceOptionToPers порожній.

**Куди дивитись:** Завести choice_option-групу «Метамагія» з 2024-опціями (data/2024/normalized/) і class_choice_option з levelsGranted [2,10,17]; правило пулу для кількості — src/lib/logic/choicePoolRules.ts.

**Файли:** `prisma/seed/`, `data/2024/normalized/classes.json`, `src/lib/logic/choicePoolRules.ts`


### L09-sheet-derived-01 — Жодна класова, підкласова чи видова фіча 2024 не має ліміту використань — секція «Ресурси класу» на листі порожня у всіх чотирьох зібраних персонажів

**Статус:** ✅ закрито 2026-09-08 ([KR31.3](kr31.3-feature-resources-2024.md)): класові 2026-09-06, підкласові 2026-09-07, видові 2026-09-08. Секція «Ресурси класу» показує всі три.

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Fighter Features table рівень 5: «Second Wind 3»; §Level 2 Action Surge «one use»; §Level 1 Lay On Hands «restore a total number of Hit Points equal to five times your Paladin level»; §Level 3 Channel Divinity «You can use this class's Channel Divinity twice»; Monk Features table рівень 5: «Focus Points 5». data/2024/srd/character-origins.md:154 — «You can use this Breath Weapon a number of times equal to your Proficiency Bonus».

**Має бути:** Воїн 5: Другий вітер 3/3, Сплеск дій 1/1. Паладин 5: пул Накладання рук 25 хітів, Божественний канал 2/2. Монах 5: 5 очок фокусу. Драконороджений 5: Зброя дихання 3/3 (БМ).

**Є:** На листі персонажа 2024 немає жодного ресурсу; PersResourcePool порожній; секція «Ресурси класу» не малюється взагалі.

**Доказ:** SQL на spells_test: `select ruleset, count(*) total, count(*) filter (where uses_count is not null or uses_count_special is not null or uses_pool_key is not null) from feature group by ruleset` → RULES_2024: 547 / 3, RULES_2014: 1281 / 338. Ті 3 — Magic Initiate: Cleric/Druid/Wizard list (2024). Перелік по класах: Fighter: Second Wind (2024), Fighter: Action Surge (2024), Paladin: Lay On Hands (2024), Paladin: Channel Divinity (2024), Monk: Monk’s Focus (2024), Wizard: Arcane Recovery (2024), Dragonborn: Breath Weapon (2024), Aasimar: Healing Hands (2024) — усі з uses_count=null, uses_count_special=null, uses_pool_key=null. Для контрасту RULES_2014: Second Wind uses=1; Action Surge special=[{lvl:2,uses:1},{lvl:17,uses:2}]; Ki special={equalsToClassLevel:true} pool=KI; Lay on Hands special={type:FORMULA,group:LEVEL_BASED,operation:MULTIPLY,multiplier:5}; Channel Divinity uses=1 pool=CHANNEL_DIVINITY. Програмна збірка (work/L09-sheet-derived/dump.json): resourcePools: [] у всіх чотирьох персонажів 5-го рівня.

**Відтворення:** Зібрати фікстуру 01/07/10 через build2024Character до 5-го рівня, відкрити лист → слайд «Риси». Або SQL-запит вище.

**Куди дивитись:** Заповнити uses_count / uses_count_depends_on_proficiency_bonus / uses_count_special / uses_pool_key / limited_uses_per у джерелах сіду 2024 (data/2024/normalized/classes.json, species.json) і перелити — двигун (pers-actions.ts:988–1036, rules/resource-pools.ts) уже вміє це рахувати. Правити файл, не базу (Р33).

**Файли:** `data/2024/normalized/classes.json`, `data/2024/normalized/species.json`, `src/server/db/pers-actions.ts`, `src/lib/components/characterSheet/slides/FeaturesSlide.tsx`


### L09-sheet-derived-02 — Усі 547 фіч 2024 позначені display_type = {PASSIVE} — лист не показує ні дій, ні бонусних дій, ні реакцій, ні ресурсів класу

**Статус:** ✅ закрито 2026-09-08 ([KR31.3](kr31.3-feature-resources-2024.md)): не пасивні 37 класових фіч із 174, 157 підкласових із 400, 12 видових рис із 43 і всі вісім носіїв ресурсів рис персонажа.

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md: Second Wind — «as a Bonus Action»; Lay On Hands — «As a Bonus Action»; Channel Divinity (Divine Sense) — «As a Magic action»; Flurry of Blows — «as a Bonus Action»; Deflect Attacks — Reaction. data/2024/srd/character-origins.md:160 Draconic Flight — «As a Bonus Action».

**Має бути:** Риси 2024 групуються на листі в «Дії / Бонусні дії / Реакції / Ресурси класу», як це працює для 2014.

**Є:** Усе падає в «Пасивні здібності»; секцій дій/реакцій/ресурсів для персонажа 2024 не існує.

**Доказ:** SQL: `select unnest(display_type)::text dt, count(*) from feature where ruleset='RULES_2024' group by 1` → PASSIVE 547 (і нічого більше). Той самий запит для RULES_2014 → PASSIVE 921, ACTION 166, BONUSACTION 130, REACTION 78, CLASS_RESOURCE 13, FREE 4, HIDDEN 1. Слайд читає саме ці категорії: FeaturesSlide.tsx:258–262 (resourceItems фільтрує displayTypes.includes(CLASS_RESOURCE)), :306–314 (секції «Ресурси класу» / «Пасивні здібності»).

**Відтворення:** Відкрити лист будь-якого персонажа RULES_2024 → слайд «Риси»: одна секція «Пасивні здібності».

**Куди дивитись:** Проставити display_type у нормалізованих джерелах 2024 (той самий прохід сіду, що й для лімітів використань).

**Файли:** `data/2024/normalized/classes.json`, `data/2024/normalized/subclasses.json`, `data/2024/normalized/species.json`, `src/lib/components/characterSheet/slides/FeaturesSlide.tsx`


### L09-sheet-derived-06 — Монах 2024: беззбройного удару не існує як зброї, а Спритні атаки не діють — посох рахується від Сили

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-13 (KR31.6). `src/rules/martial-arts.ts`: зброя монаха за редакцією (2014 — короткий меч і проста рукопашна без «дворучна»/«важка»; 2024 — проста рукопашна й бойова рукопашна «легка»), перевага діє з Бойовими мистецтвами без обладунку й щита; формули КЗ (`UNARMORED_DEFENSE_*`, `NATURAL_ARMOR_*`, `DRACONIC_RESILIENCE`) обладунком не вважаються. `getWeaponAbility` бере кращу з СИЛ/СПР. `tests/db/monk-dexterous-attacks.test.ts`: посох монаха 5 обох редакцій — +6/+3, у шкіряному — +4. Рядок `UNARMED_STRIKE` 2024 сідиться поруч із книжковою зброєю (`seedUnarmedStrike2024`), `calculateWeaponDamageDice` підставляє кубик Бойових мистецтв (2014 к4→к10, 2024 к6→к12), коли він більший за кубик зброї; лист і PDF читають його звідти. Сам рядок персонажу автоматично не додається — його додають зі списку зброї, як у 2014.

**Правило:** data/2024/srd/classes.md:5143 — Martial Arts, Dexterous Attacks: «You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Unarmed Strikes and Monk weapons»; :5141 — Martial Arts Die 1d6, на 5-му рівні 1d8.

**Має бути:** Монах-аасімар 5 (СИЛ 12 = +1, СПР 16 = +3, БМ +3): беззбройний удар як рядок атаки з кісткою бойових мистецтв 1d8+3; посох +6 / 1d8+3.

**Є:** Атак нема взагалі (варіант спорядження «b» — 50 зм); якби посох був, він рахувався б від СИЛИ: +4 / 1d6+1.

**Доказ:** SQL: `select weapon_id, name::text, ruleset::text, damage from weapon where name::text in ('UNARMED_STRIKE','QUARTERSTAFF')` → 11 UNARMED_STRIKE RULES_2014 «1»; 8 QUARTERSTAFF RULES_2014 «1к6»; 2206 QUARTERSTAFF RULES_2024 «1d6» — рядка UNARMED_STRIKE для RULES_2024 немає. src/lib/logic/bonus-calculator.ts:494–507 (getWeaponAbility) бере СПР лише для дальньої зброї або властивості FINESSE; посох (VERSATILE) → СИЛА. Автоматичного джерела customDamageAbility не існує — його пише лише WeaponCustomizeModal через equipment-actions.ts:75,121. Програмна збірка фікстури 10: `weapons: []` — у монаха 5-го рівня на листі жодної атаки.

**Відтворення:** Зібрати фікстуру 10 до 5-го рівня → лист → картка зброї порожня. Додати посох через AddWeaponDialog → атака +4 замість +6.

**Куди дивитись:** (а) додати UNARMED_STRIKE у зброю 2024; (б) правило «зброя монаха / беззбройний удар бере кращий із СИЛ/СПР» у getWeaponAbility за фічею Monk: Martial Arts (2024); (в) кістка бойових мистецтв замість базової шкоди.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `data/2024/normalized/weapons.json`, `src/lib/components/characterSheet/WeaponsCard.tsx`


### L09-sheet-derived-12 — Бойові стилі 2024 не мають механіки: Оборона не дає +1 КЗ, Дуель +2 шкоди, Стрільба +2 атаки

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md:95 — Defense: «While you're wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class». data/2024/normalized/feats.json — Archery: «You gain a +2 bonus to attack rolls you make with Ranged weapons»; Dueling: «you gain a +2 bonus to damage rolls with that weapon».

**Має бути:** 12 (клепаний шкіряний) + 2 (СПР) + 1 (Оборона) = 15.

**Є:** 14. Двигун готовий — bonus-calculator.ts:210–232 уже читає givesAC і requiresArmorForACBonus, і саме так працює 2014.

**Доказ:** SQL: `select eng_name, gives_ac, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, bonus_to_ranged_attack_roll from feature where eng_name ilike '%Fighting Style%' or eng_name in ('Defense','Dueling','Archery')` → RULES_2024 «Fighting Style: Defense (2024)» / «Dueling (2024)» / «Archery (2024)» — усі чотири поля null; RULES_2014 «Defense» gives_ac=1 requires_armor=true, «Dueling» bonus_to_melee_one_handed_weapon_damage=2, «Archery» bonus_to_ranged_attack_roll=2. Програмна збірка фікстури 01 (драконороджений воїн-Чемпіон 5 зі стилем Defense): AC 14, armors [{STUDDED_LEATHER, baseAC 12, equipped}], shield false, DEX +2.

**Відтворення:** Зібрати фікстуру 01 (tests/fixtures/2024-acceptance/01-dragonborn-fighter-soldier.json, classChoices → Бойовий стиль: Defense) до 5-го рівня і прочитати calculateFinalAC.

**Куди дивитись:** Проставити gives_ac/requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, bonus_to_ranged_attack_roll у джерелі сіду бойових стилів 2024 і перелити (Р33 — правити файл, не базу).

**Файли:** `data/2024/normalized/feats.json`, `prisma/seed`, `src/lib/logic/bonus-calculator.ts`


### L11-persistence-identity-03 — Жодна фіча 2024 не має обмежених використань і жодна не має `uses_pool_key` — ресурсів класу 2024 не існує ні як пулів, ні як лічильників

**Статус:** ✅ закрито 2026-09-08 ([KR31.3](kr31.3-feature-resources-2024.md)). Пулів 2024 вісім власників і 40 рядків із ключем; лічильник мають 136 фіч, включно з видовими. Риси видів і рис персонажа ключа пулу не несуть навмисно — їхній ресурс не ділиться між фічами (BUG-011).

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Second Wind 2 використання на 1-му рівні (Short Rest), Channel Divinity 2 на 2-му рівні клірика, Bardic Inspiration за модифікатором Харизми, Wild Shape 2→3→4, Focus Points = рівень ченця

**Має бути:** Персонаж 2024 має лічильники використань класових фіч, спільні пули між класовою фічею та опціями підкласу, і відпочинок їх відновлює.

**Є:** `PersFeature.usesRemaining` нема з чого ініціалізувати; `findPoolProviderForPers` (src/server/db/resource-pool-provider.ts:26) фільтрує по `usesPoolKey` і для 2024 повертає `null` завжди, тож `PersResourcePool` для персонажа 2024 не заводиться; відпочинок нічого не відновлює. Уся машинерія `src/rules/resource-pools.ts` / `src/lib/logic/feature-resources.ts` / `src/server/db/feature-uses.ts` для 2024 мертва.

**Доказ:** Запит до spells_test: `select count(*) total, count(uses_count) with_uses, count(limited_uses_per) with_rest, count(uses_pool_key) with_pool, count(uses_count_special) with_special, sum(case when uses_count_depends_on_proficiency_bonus then 1 else 0 end) pb from feature where ruleset='RULES_2024'` → `total 547 | with_uses 3 | with_rest 3 | with_pool 0 | with_special 0 | pb 0`. Ті три — рівно `Magic Initiate: Cleric/Druid/Wizard list (2024)` (49277-49279, 1/LONG_REST), тобто SQL із KR27.5. Пули: `select uses_pool_key, ruleset, count(*) from feature where uses_pool_key is not null group by 1,2` → вісім ключів, УСІ RULES_2014 (CHANNEL_DIVINITY 39, KI 42, SORCERY_POINTS 32, SUPERIORITY_DICE 24, BARDIC_INSPIRATION 8, ARCANE_SHOT 9, PSIONIC_ENERGY 13, WILD_SHAPE 6), жодного 2024. Метаданих у звʼязці теж немає: `select count(*) total, count(mechanic_metadata) meta from class_feature where ruleset='RULES_2024'` → `187 / 0`. Порожні: 48906 Fighter: Second Wind (2024), 48883 Cleric: Channel Divinity (2024), 48947 Paladin: Channel Divinity (2024), 48869 Bard: Bardic Inspiration (2024), 48895 Druid: Wild Shape (2024), 48922 Monk’s Focus (2024), 48639 Combat Superiority (2024), 48995 Innate Sorcery (2024), 48616 War Priest (2024), 48601 Preserve Life (2024).

**Відтворення:** `select … from feature where ruleset='RULES_2024'` (див. evidence); або зібрати клірика 2024 рівня 2 і подивитися слайд Рис — лічильника Божественного каналу немає.

**Куди дивитись:** Заповнити `usesCount` / `limitedUsesPer` / `usesCountSpecial` / `usesPoolKey` у `data/2024/normalized/classes.json` і `subclasses.json` і перелити сідом (Р33 — правити файл, не проходом по базі).

**Файли:** `data/2024/normalized/classes.json`, `data/2024/normalized/subclasses.json`, `src/server/db/resource-pool-provider.ts`, `src/rules/resource-pools.ts`


### L17-known-registries-04 — BUG-007 живий: вливання артифайсера обираються лише на 2 рівні класу, тож 50 із 66 рядків infusion недосяжні жодним шляхом

**Рівень:** P1 · **Редакція:** 2014 · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

✅ **Закрито в KR31.12, 2026-09-06.** Таблиця «Infusions Known» винесена в чисту `src/rules/artificer-infusions.ts` (4 на 2 рівні, по 2 на 6/10/14/18); вікно класу тепер читає її, а не тримає другу копію — саме ту, на яку вказав скептик. Сервер і майстер питають правило, а не константи 2 і 4. Тест `src/rules/artificer-infusions.test.ts`, доведений червоним. Заміни вже відомого вливання не додано: правила про неї в репозиторії немає.

**Правило:** Точної таблиці «Infusions Known» (TCoE) у репо немає (grep по data/, prisma/seed/, src/ порожній). Оракул — дані самого проєкту: infusion.min_artificer_level має значення 2/6/10/14.

**Має бути:** На рівнях класу 6/10/14/18 артифайсер може обрати додаткові вливання, persInfusion зростає.

**Є:** Запис вливань відбувається рівно один раз, на 2 рівні, і рівно 4 штуки; 50 вливань із min_artificer_level 6/10/14 недосяжні (їх ще й відфільтрує серверна перевірка minArtificerLevel <= 2).

**Доказ:** Сервер: src/server/db/levelup-persistence.ts:1283 — `if (selectedClass?.name === "ARTIFICER_2014" && classLevelAfter === 2)`, далі `if (infusionIds.length !== 4) throw new Error("Оберіть рівно 4 вливання")`. UI: src/lib/components/levelUp/LevelUpWizard.tsx:584-588 — needsInfusions повертає false, якщо classLevelAfter !== 2; крок «Вливання» додається лише під цією умовою (рядок 866). Дані spells_test: select min_artificer_level, count(*) from infusion where ruleset='RULES_2014' group by 1 → 2:16, 6:13, 10:23, 14:14 (усього 66). Реєстр указував src/lib/actions/levelup.ts:1357-1399 — цей файл нині 16 рядків (реекспорт), рядки переїхали.

**Відтворення:** grep -n infusion src/server/db/levelup-persistence.ts; sed -n '584,588p' src/lib/components/levelUp/LevelUpWizard.tsx; SQL вище до spells_test.

**Куди дивитись:** Винести кількість відомих вливань у чисту функцію (src/rules/), керовану рівнем класу; needsInfusions і серверна гілка мають питати її, а не константи 2 і 4. Еквівалента 2024 немає: таблиця infusion містить лише RULES_2014, а артифайсера в SRD 2024 немає.

**Файли:** `src/server/db/levelup-persistence.ts`, `src/lib/components/levelUp/LevelUpWizard.tsx`

**Скептик:** ПІДТВЕРДЖУЮ, і знахідка сильніша, ніж у звіті.

(1) ПРАВИЛО. Автор написав, що таблиці «Infusions Known» у репо немає — це хибно, він грепав лише англійську фразу й `infusionsKnown`. Таблиця лежить у самому продукті: `src/lib/components/characterCreator/modals/ClassInfoModal.tsx:92-104`, `ARTIFICER_2014` → key `infusions_known`, «Знані вливання», `values: {2:4, 6:6, 10:8, 14:10, 18:12}`, `mode: "STEP"`. Це точна таблиця TCoE, і застосунок сам показує її гравцеві у вікні класу. Тобто продукт обіцяє 12 знаних вливань на 18 рівні й видає 4 — внутрішня суперечність, доводити правило памʼяттю не треба.

(2) КОД — іншого шляху немає. Сервер: `src/server/db/levelup-persistence.ts:1287-1330` — `if (selectedClass?.name === "ARTIFICER_2014" && classLevelAfter === 2)`, далі `if (infusionIds.length !== 4) throw`, і фільтр `minArtificerLevel: { lte: classLevelAfter }`. UI: `LevelUpWizard.tsx:593-597` (`needsInfusions`) і `:876` — рядки зʼїхали на +9 проти звіту (584-588/866), суть та сама. `persInfusion` пишеться рівно у двох місцях на весь `src/`: `levelup-persistence.ts:1322` і `pers-duplication.ts:274` — жодного `delete`/`update`/`upsert`. Конструктор шлях не дає навмисно: `MultiStepForm.tsx:97-108` витирає чернетку, якщо в ній є `infusionSelections` («levelUp-only keys»). Альтернативного моделювання в базі теж немає: `select * from class_optional_feature where class_id=13` → 0 рядків. Листа персонажа з діалогом вливань не існує (`pers-actions.ts:1174-1186` лише читає).

(3) ДАНІ — відтворив сам на `spells_test`: `select min_artificer_level, count(*) from infusion where ruleset='RULES_2014' group by 1` → 2:16, 6:13, 10:23, 14:14; `group by ruleset` → 66/66 `RULES_2014`. Цифри автора точні.

(4) НЕЗАЛЕЖНИЙ ДОКАЗ ПОВЕДІНКИ, якого в звіті не використано як власний: golden-фікстура `tests/golden/levelup/artificer-1-to-18.json` (знята прогоном справжніх серверних дій) — рівні 2…18 несуть рівно 4 вливання, і саме ті чотири, що доступні з 2 рівня: Enhanced Arcane Focus, Enhanced Defense, Enhanced Weapon, Returning Weapon.

(5) РІШЕННЯ ВЛАСНИКА — немає. `docs/KNOWN-BUGS.md:178-193` тримає BUG-007 у розділі «Відкриті» зі статусом «відкрито»; у «Прийнято (не буде виправлено)» лише BUG-001…003. У `docs/DECISIONS.md` вливань не стосується жодне рішення (Р31 — про майстерність зброї, не про це). Відкритого KR теж немає: згадки лише історичні (`docs/o2-characterization/kr2.3-golden-levelup.md:102-103,158-159`).

(6) IN-FLIGHT — ні. `levelup-persistence.ts` і `LevelUpWizard.tsx` не в списку файлів паралельної сесії (там spell-*, pers-actions, AddSpellDialog, app/spells, тести).

(7) СЕРЙОЗНІСТЬ — P1 за шкалою CONTEXT: у персонажа з 6 рівня класу відсутні риси/вибори, які дає книга, і вибір гравця не просто відсутній, а незворотний — заміни вливання (TCoE: «whenever you gain a level in this class, you can replace one artificer infusion») теж немає жодної, бо `persInfusion` ніколи не видаляється. Не P0 (підвищення рівня працює, дані не гинуть), не P2 (це не «немає можливості зрілого білдера», а пряме розходження з книгою).

Єдина поправка до звіту, крім оракула: твердження «2024 еквівалента немає, артифайсера в SRD 2024 немає» неточне — `class` має `ARTIFICER_2024` (class_id 351, `RULES_2024`), і він **пропонується** в конструкторі 2024 (`src/lib/generated/creator-content-2024.json` містить його серед 13 класів). Але вливань 2024 у базі нуль, а гейт зашитий на рядок `"ARTIFICER_2014"`, тож артифайсер 2024 не отримує вливань узагалі — це окремий дефект контенту/паритету, не частина цієї знахідки.


### P1-human-fighter-04 — Обрані на кроці конструктора 3 види майстерності зброї не зберігаються — на листі «Обрано 0 з 3»

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Fighter Features, рівень 1: «Weapon Mastery … 3»; «Your training with weapons allows you to use the mastery properties of three kinds of Simple or Martial weapons of your choice»

**Має бути:** 3 рядки pers_weapon_mastery; на листі три види зброї з властивостями Черкання/Виснаження/Знервування

**Є:** 0 рядків; блок майстерності порожній

**Доказ:** Чернетка форми після вибору: weaponMasteryWeaponIds: [2217, 2214, 2209] (Дворучний меч, Бойовий ціп, Дротик). Після створення: select * from pers_weapon_mastery where pers_id=16 → []. Лист: «МАЙСТЕРНІСТЬ ЗБРОЇ — Обрано 0 з 3. Види зброї ще не обрані» (shots/P1-human-fighter-19b-sheet-lvl1.png); атаки не несуть Graze/Sap/Vex. Порівняння: select count(*) from pers_weapon_mastery where pers_id=6 → 3.

**Відтворення:** Ті самі кроки, що в 01; на кроці «Майстерність зброї» обрати Дворучний меч, Бойовий ціп, Дротик → створити → відкрити лист, блок «МАЙСТЕРНІСТЬ ЗБРОЇ»

**Куди дивитись:** Наслідок P1-human-fighter-01: findCreationWeaponMasteryOffer(tx, { classId, ruleset }) у src/server/db/character-creation.ts:937 не знаходить пропозиції для RULES_2014

**Файли:** `src/server/db/character-creation.ts`, `src/server/db/weapon-mastery.ts`


### P1-human-fighter-09 — «Друге дихання» не має лічильника застосувань — feature.uses_count = null, ресурс на листі не відстежується

**Статус:** ✅ закрито 2026-09-06 (KR31.3). `Fighter: Second Wind (2024)` несе `uses_count_special = [{1,2},{4,3},{10,4}]` і `SHORT_REST`; наскрізний тест `tests/db/short-rest-2024-resources.test.ts` витрачає обидва використання й повертає одне.

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — таблиця Fighter Features, колонка Second Wind = 2 на рівнях 1–3; «You can use this feature twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.»

**Має бути:** 2 застосування, що відновлюються 1 за короткий і всі за довгий відпочинок; на листі лічильник

**Є:** Жодного лічильника — гравець не має де відзначити використання

**Доказ:** select feature_id, eng_name, uses_count, uses_count_special, uses_count_depends_on_proficiency_bonus, limited_uses_per from feature where feature_id=48906 → «Fighter: Second Wind (2024)»: uses_count null, uses_count_special null, limited_uses_per null. pers_feature 102 uses_remaining = null. select * from pers_resource_pool where pers_id=16 → порожньо. На листі картка «Друге дихання» без «2 з 2» і без кнопки витрати (shots/P1-human-fighter-19-sheet-lvl1.png).

**Відтворення:** Створити Воїна 2024 → лист → вкладка «Фічі» / картка «Друге дихання»

**Куди дивитись:** Заповнити uses_count/limited_uses_per (і прогресію 2→3 на 4-му, 4 на 10-му рівні) у джерелі фіч 2024 та завести pers_resource_pool при створенні

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed/`, `src/lib/logic/feature-resources.ts`, `src/server/db/resource-pool-provider.ts`


### P4-regression-2014-01 — Клірик 2014 ніколи не отримує «Вигнання нежиті» (Turn Undead) — риса є в базі, але не привʼязана до жодного класу

**Рівень:** P1 · **Редакція:** 2014 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06.** Звʼязок `CLERIC_2014 ← Turn Undead` (рівень 2) додано і в `prisma/seed/classSeed.ts`, і в сід корекцій `prisma/seed/classFeatureLinks2014.ts`. Прогнано на `spells_test`; звірку «файл → база» тримає `tests/db/class-feature-links-2014-seeded.test.ts`, доведений червоним. **Прогін у прод — за власником.**

**Правило:** prisma/seed/classFeatureSeed.ts:2514-2523 — «Вигнання нежиті / Turn Undead … Починаючи з 2 рівня, ви можете дією використати Канал божественності, щоб вигнати нежить», usesPoolKey CHANNEL_DIVINITY; що це ядро класу, а не опція домену, підтверджує data/2024/srd/classes.md:2215 «You start with two such effects: Divine Spark and Turn Undead»

**Має бути:** На 2 рівні клірик отримує Channel Divinity: Turn Undead (class_feature CLERIC_2014, level_granted=2) — дія на листі, що витрачає пул CHANNEL_DIVINITY; на 5 рівні Destroy Undead її покращує.

**Є:** Клірик 2 рівня отримує лише дві риси «Канал божественності» (одна з них паладинська, див. -02) і опцію домену. Turn Undead не існує для жодного персонажа; Destroy Undead на 5 рівні описує покращення риси, якої немає.

**Доказ:** Запит до spells_test: `select cf.level_granted, f.eng_name from class_feature cf join feature f on f.feature_id=cf.feature_id where cf.class_id=69 /*CLERIC_2014*/ and cf.level_granted<=5` → L1 Spellcasting (Cleric), L1 Divine Domain, L2 Channel Divinity (Cleric), L2 Channel Divinity, L4 Ability Score Improvement, L5 Destroy Undead. Риса Turn Undead існує окремо: feature_id 17923, ruleset RULES_2014, але `select cf.class_id, cf.level_granted from class_feature where feature_id=17923` не дає жодного рядка. Створений у браузері клірик 2 рівня (pers 25) у pers_feature має 14 рис, Turn Undead серед них немає (лог scratchpad/audit/work/P4-regression-2014/cl-lvl2.log, знімок shots/P4-cl-up2-sheet.png).

**Відтворення:** /char/create → Дворф → Пагорбовий дворф → Клірик → Домен життя → пройти до кінця, створити; /char/<id>/levelup → «Підняти рівень наявного класу» → екран «Огляд» на 2 рівні перелічує «Канал божественності (Клірик)», «Канал божественності», «Божественність: Збереження життя» і нічого більше.

**Куди дивитись:** Додати звʼязок class_feature (CLERIC_2014, feature 17923 Turn Undead, level_granted=2) у сіді класових рис і перелити; перевірити, що пул CHANNEL_DIVINITY після цього має правильного provider за правилами findPoolProvider (KR24.2).

**Файли:** `prisma/seed/classFeatureSeed.ts`, `src/server/db/progression-content.ts`


### P5-druid-secondary-flows-07 — Первісне призначення (Primal Order) друїда 2024 не має вибору Warden / Magician — жодного class_choice_option у класі

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:3521-3527 — «Level 1: Primal Order. You have dedicated yourself to one of the following sacred roles of your choice. _Magician._ You know one extra cantrip from the Druid spell list… bonus to your Intelligence (Arcana or Nature) checks… _Warden._ Trained for battle, you gain proficiency with Martial weapons and training with Medium armor.»

**Має бути:** Крок конструктора «Опції класу» на 1 рівні пропонує Warden або Magician; Warden додає володіння військовою зброєю і середнім обладунком, Magician — додаткове замовляння зі списку друїда та бонус до Магії/Природи.

**Є:** Вибору не існує ні в конструкторі, ні на листі. Друїд-Warden не отримує військової зброї й середнього обладунка (пряме заниження КБ і атак), Magician — додаткового замовляння. Виправити після створення теж неможливо.

**Доказ:** Фіча «Druid: Primal Order (2024)» (feature_id 48894) прикріплена на 1 рівні класу 342 (DRUID_2024), але `prisma.classChoiceOption.findMany({ where: { classId: 342 } })` віддає порожній масив (work/P5-druid-secondary-flows/probe.json → "classChoices": []). Серед усіх 2024-класів існує лише чотири групи виборів: PALADIN_2024::Бойовий стиль, RANGER_2024::Бойовий стиль, WARLOCK_2024::Потойбічні виклики, FIGHTER_2024::Бойовий стиль (probe2.json → allClassChoiceGroupsFor2024Classes). На листі (shots/P5-sheet-original.png) «Первісне призначення» стоїть без позначки вибору, на відміну від «Ельфійський родовід (Лісовий ельф) ВИБІР».

**Відтворення:** /2024/char → Ельф → Друїд: кроку «Опції класу» немає взагалі; на листі 5-рівневого друїда «Первісне призначення» без вибору.

**Куди дивитись:** Сідом додати ChoiceOption групи «Первісне призначення» з опціями Warden / Magician і рядки class_choice_option на рівень 1 класу 342; володіння вішати через weaponProficiencies/armorProficiencies опції, як це зроблено для Бойових стилів.

**Файли:** `prisma/seed/`, `data/2024/normalized/classes.json`, `src/lib/components/characterCreator/ClassChoiceOptionsForm.tsx`


### P6-class-sweep-level1-04 — Усі 187 класових фіч 2024 записані як чистий текст: немає ні кількості застосувань, ні пулів ресурсів, ні експертизи, ні кількості інвокацій

**Статус:** 🔴 лишилася тільки кількість інвокацій чорнокнижника (`invocations_count` потребує рядка фічі на рівень). Числа й пули класових і підкласових фіч закрито.

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md: таблиця Barbarian Features, колонка Rages, рівень 1 = 2; «Second Wind … You have two uses»; Bard «Bardic Inspiration … a number of times equal to your Charisma modifier (minimum once)»; Paladin «Lay on Hands … a pool of healing power … equal to five times your Paladin level»; Sorcerer «Innate Sorcery … twice, and you regain all expended uses when you finish a Long Rest»; Wizard «Arcane Recovery … once per day»

**Має бути:** Лють 2/довгий відпочинок, Друге дихання 2, Натхнення барда = мод. ХАР (мін. 1)/довгий відпочинок, Накладання рук = 5 × рівень, Вроджене чаклунство 2/довгий відпочинок, Відновлення магії 1/день — усі як лічильники на листі персонажа

**Є:** жодного лічильника: усі фічі 2024 — описовий текст, pers_resource_pool порожній

**Доказ:** spells_test: `select count(*) from class_feature where ruleset='RULES_2024'` = 187; `... and mechanic_metadata is not null` = 0 (усі mechanic_type = 'PASSIVE'). У таблиці feature для RULES_2024: Barbarian: Rage, Fighter: Second Wind, Bard: Bardic Inspiration, Paladin: Lay On Hands, Sorcerer: Innate Sorcery, Wizard: Arcane Recovery, Cleric: Channel Divinity — усі мають uses_count=null, limited_uses_per=null, uses_count_special=null, uses_pool_key=null, skill_expertises=null, invocations_count=null. Для порівняння RULES_2014: Bardic Inspiration per=LONG_REST special={base:0,stat:'CHA',type:'FORMULA',group:'STAT_BASED',minimum:1,operation:'ADD'} pool=BARDIC_INSPIRATION; Lay on Hands per=LONG_REST special={type:'FORMULA',group:'LEVEL_BASED',operation:'MULTIPLY',multiplier:5}; Channel Divinity uses=1 per=SHORT_REST pool=CHANNEL_DIVINITY. У створеного клірика 141 pers_resource_pool порожній.

**Відтворення:** Створити будь-якого персонажа 2024 у /2024/char → лист → слайд Риси: жодна риса рівня 1 не має лічильника застосувань. Або запит: select * from pers_resource_pool where pers_id=<id> → 0 рядків.

**Куди дивитись:** Перенести механіку 2014-фіч на їхні 2024-аналоги: заповнити feature.uses_count / limited_uses_per / uses_count_special / uses_pool_key (і class_feature.mechanic_type/mechanic_metadata, якщо це новий канал для 2024) у сіді з data/2024/normalized/classes.json; додати приймальні критерії на лічильники рівня 1.

**Файли:** `prisma/seed/`, `data/2024/normalized/classes.json`, `src/lib/logic/feature-resources.ts`, `src/rules/resource-pools.ts`


### P6-class-sweep-level1-05 — Божественний орден (Клірик) і Первісний орден (Друїд) не пропонують вибору і не дають нічого

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md, Cleric Level 1 «Divine Order»: «you have dedicated yourself to one of the following sacred roles of your choice: Protector (training with Martial weapons and Heavy armor) / Thaumaturge (one extra Cleric cantrip + bonus to Intelligence (Arcana or Religion) checks equal to your Wisdom modifier, minimum +1)»; Druid Level 1 «Primal Order»: Magician / Warden

**Має бути:** На 1-му рівні Клірик обирає Захисника або Дивотворця, Друїд — Магіка або Вартового; вибір дає володіння (бойова зброя + важкі обладунки / бойова зброя + середні обладунки) або додаткове замовляння й бонус до перевірок

**Є:** вибору немає взагалі; персонаж отримує лише текст фічі й нічого з її ефектів

**Доказ:** creator-content-2024.json: у CLERIC_2024 і DRUID_2024 classChoiceOptions = [] і classOptionalFeatures = []; фіча «Cleric: Divine Order (2024)» (featureId 48882) має mechanicType='PASSIVE', mechanicMetadata=null, armorProficiencies=[], weaponProficiencies=null — тільки опис. Пошук по src/ за 'Divine Order|DIVINE_ORDER|Primal Order|Божественний орден|Первісний орден' дає збіги лише в src/lib/generated/classes.json і creator-content-2024.json — жодного рядка коду. У браузері кроку classChoices у Клірика й Друїда немає: race > raceChoices > class > background > asi > skills > languages > equipment > name (scratchpad/audit/shots/P6-CLERIC_2024-02-class.png, P6-DRUID_2024-02-class.png).

**Відтворення:** http://127.0.0.1:3100/2024/char → Людина → Пильний → Клірик (або Друїд) → після кроку «Клас» одразу «Передісторія»; на листі фіча «Божественний орден» — просто абзац тексту.

**Куди дивитись:** Змоделювати як ClassChoiceOption із levelsGranted [1] (як Бойовий стиль воїна), із двома опціями, що несуть armorProficiencies/weaponProficiencies та додаткове замовляння; додати сід у data/2024/normalized/classes.json.

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed/`, `src/lib/components/characterCreator/creation-step-resolver.ts`


### P6-class-sweep-level1-06 — Пройдисвіт 2024 не отримує Експертизи на 1-му рівні — крок «Експертиза» не зʼявляється в жодного класу

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:6913 (Rogue Features, level 1): «Expertise, Sneak Attack, Thieves' Cant, Weapon Mastery»; Expertise на 1-му рівні — дві навички

**Має бути:** Пройдисвіт на 1-му рівні обирає 2 навички з наявних володінь як експертизу

**Є:** кроку немає; жодної експертизи

**Доказ:** spells_test: feature 'Rogue: Expertise (2024)' має skill_expertises = null (як і 'Bard: Expertise (2024)', 'Ranger: Expertise (2024)'), тоді як RULES_2014 'Expertise' має {"count":2,"chooseFromCurrentProficiencies":true}. src/lib/components/characterCreator/MultiStepForm.tsx:521 hasExpertiseChoice читає саме f.skillExpertises, тому крок expertise не додається. Прогін ROGUE_2024 у браузері: race > raceChoices > class > weaponMastery > background > asi > skills > languages > equipment > name (без expertise).

**Відтворення:** http://127.0.0.1:3100/2024/char → Людина → Пильний → Пройдисвіт → пройти до кінця: кроку «Експертиза» немає.

**Куди дивитись:** Заповнити feature.skill_expertises для 'Rogue: Expertise (2024)' ({count:2,chooseFromCurrentProficiencies:true}) і для Bard/Ranger Expertise 2024 у сіді.

**Файли:** `prisma/seed/`, `data/2024/normalized/classes.json`, `src/lib/components/characterCreator/MultiStepForm.tsx`


### L05-class-choices-11 — Передумови викликів 2024 перенесені частково: сім викликів «Level 2+» мають порожні prerequisites, а вимога Thirsting Blade у Devouring Blade втрачена

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:9040 (Agonizing Blast — «Level 2+ Warlock, a Warlock Cantrip That Deals Damage»), :9058 (Devil's Sight — Level 2+), :9081 (Eldritch Spear — Level 2+), :9089 (Fiendish Vigor — Level 2+), :9151 (Mask of Many Faces — Level 2+), :9163 (Misty Visions — Level 2+), :9205 (Repelling Blast — Level 2+), :9121 (Investment of the Chain Master — «Level 5+ Warlock, Pact of the Chain Invocation»), :9064 (Devouring Blade — «Level 12+ Warlock, Thirsting Blade Invocation»).

**Має бути:** Чорнокнижник 1-го рівня, що має рівно один виклик, бачить доступними лише виклики без «Level 2+».

**Є:** На 1-му рівні доступні Agonizing Blast, Repelling Blast, Devil's Sight тощо без жодного попередження.

**Доказ:** SQL по choice_option.prerequisites (RULES_2024): Agonizing Blast {}, Devil's Sight {}, Eldritch Spear {}, Fiendish Vigor {}, Mask of Many Faces {}, Misty Visions {}, Repelling Blast {}; Investment of the Chain Master {"pact":"Pact of the Chain (2024)"} — без level 5; Devouring Blade {"pact":"Pact of the Blade (2024)","level":12} — без вимоги Thirsting Blade. Водночас Lessons of the First Ones і Otherworldly Leap рівень 2 мають, тобто перенос непослідовний. Навіть записана передумова не блокує вибір: src/lib/components/characterCreator/ClassChoiceOptionsForm.tsx:180–193 при невиконаній передумові лише показує PrerequisiteConfirmationDialog і дозволяє підтвердити.

**Відтворення:** http://127.0.0.1:3100/2024/char → вид → клас «Чорнокнижник» → крок «Опції класу» показує всі 31 виклик; SQL вище підтверджує порожні prerequisites.

**Куди дивитись:** Донести level у prerequisites для семи викликів і level 5 для Investment of the Chain Master у data/2024/normalized/invocations.json; додати підтримку передумови-виклика (existingChoiceOptionIds уже приймається в prerequisiteUtils.checkPrerequisite).

**Файли:** `data/2024/normalized/invocations.json`, `src/lib/logic/prerequisiteUtils.ts`, `src/lib/components/characterCreator/ClassChoiceOptionsForm.tsx`


### P4-regression-2014-02 — Кліріку 2014 на 2 рівні видається паладинська риса «Канал божественності» (текст про клятву й СК паладина) поверх власної

**Рівень:** P2 · **Редакція:** 2014 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06.** Рядок `class_feature (CLERIC_2014, 2373)` прибрано сідом `prisma/seed/classFeatureLinks2014.ts` — `seedClasses` видаляти не вміє за побудовою, тому корекція звʼязків їде окремо. Максимум пулу `CHANNEL_DIVINITY` від цього не постраждав: `findPoolProvider` (KR24.2) і так віддавав перевагу власній 17922 зі шкалою за рівнем. **Прогін у прод — за власником.** Наявні клірики зберігають картку, доки не буде окремого рішення про чистку `pers_feature` — лист малює риси з рядків, а не з класових звʼязків.

**Правило:** PHB 2014: у клірика Channel Divinity — класова риса 2 рівня з ефектами домену; у паладина — риса 3 рівня від клятви. Дві різні риси двох різних класів.

**Має бути:** Клірик має рівно одну рису Каналу божественності — власну (17922), з описом про ефекти домену.

**Є:** Клірик має дві: власну і паладинську, з текстом про клятву й СК заклинань паладина; на листі це два лічильники 1/1 для одного ресурсу.

**Доказ:** `select cf.class_id, cf.level_granted from class_feature where feature_id=2373` → [{class_id:12 PALADIN_2014, level_granted:3}, {class_id:69 CLERIC_2014, level_granted:2}]. Опис feature 2373: «Ваша клятва дозволяє вам спрямовувати божественну енергію… СК дорівнює вашому СК ряткидку заклинань паладина». На листі персонажа 25 стоять поруч дві картки: «Канал божественності (Клірик)» (feature 17922, 1/1, розділ РЕСУРСИ КЛАСУ) і «Канал божественності» (feature 2373, 1/1, розділ ОСНОВНА ДІЯ) — shots/P4-cl-up2-sheet.png, лог cl-lvl2.log розділ «SHEET AFTER».

**Відтворення:** Створити клірика будь-якого домену, підняти до 2 рівня, відкрити лист: у «ОСНОВНА ДІЯ» зʼявляється друга картка «Канал божественності» з паладинським текстом.

**Куди дивитись:** Видалити рядок class_feature (class_id 69, feature 2373) із сіду класових рис клірика; лишити 17922 (+ Turn Undead із знахідки 01).

**Файли:** `prisma/seed/classFeatureSeed.ts`


### P7-mobile-ux-03 — У кроці «Опції класу» назва потойбічного виклику не показана взагалі: заголовок картки і її опис — той самий короткий опис

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:9034 «### Eldritch Invocation Options — Eldritch Invocation options appear in alphabetical order» (виклики в книзі мають назви, за якими їх шукають)

**Має бути:** Картка називається «Мучливий вибух [Agonizing Blast]», нижче — короткий опис ефекту.

**Є:** Заголовок = опис = той самий короткий опис; назви виклику немає ніде на екрані, тож гравець не може звірити вибір із книгою і не знає, який виклик узяв. Стосується обох редакцій.

**Доказ:** Код: src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx:130 `<p className="flex-1 break-words text-sm font-semibold text-white">{label}</p>`; :154 `{previewText ? <p className="line-clamp-2 text-sm text-slate-400">{stripMarkdownPreview(previewText)}</p> : null}`; :169-174 `getOptionLabel` повертає `option.choiceOption.optionName`. DOM (s6-probe-classchoices.mjs): `<p class="flex-1 break-words text-sm font-semibold text-white">+модифікатор ХАР до шкоди атаки заклинанням</p>` … `<p class="line-clamp-2 text-sm text-slate-400">+модифікатор ХАР до шкоди атаки заклинанням</p>` — той самий рядок двічі; aria-label кнопки інфо теж «Інформація про +модифікатор ХАР до шкоди атаки заклинанням». База spells_test: `select option_id, option_name, option_name_eng from choice_option where group_name ilike '%иклик%'` → 3572 | «Накладання Mage Armor на себе без витрати чарунок» | «Armor of Shadows (2024)»; 26 | «+ХАР до шкоди кожного променя» | «Agonizing Blast» (2014). Українська назва існує в data/2024/normalized/invocations.json: "name": "Мучливий вибух [Agonizing Blast]", "shortDescription": "+модифікатор ХАР до шкоди атаки заклинанням". Скріншот shots/P7/303-creation_step_classChoices-vp.png.

**Відтворення:** 375×812 → /2024/char → вид Тифлінг → опції раси → клас Чорнокнижник → «Далі» → крок «Опції класу»: 31 картка, кожна з дубльованим текстом.

**Куди дивитись:** getOptionLabel має брати назву (invocations.json.name / option_name_eng), getPreviewText — опис. Потрібен окремий стовпець назви в choice_option або перезаливка option_name назвою з перенесенням опису в нове поле.

**Файли:** `src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx`, `data/2024/normalized/invocations.json`, `prisma/schema.prisma`


✅ **Закрито 2026-09-09.** Назву картка бере зі звʼязаної фічі — `src/lib/logic/choice-option-card-text.ts`,
`findChoiceOptionCardText`. Окремої колонки не знадобилося: `Feature.name` уже їде в графі конструктора
(`CLASS_CREATOR_INCLUDE` тягне `features.feature`), а домовленість «у `optionName` лежить UI-підпис, назва —
у фічі» записана в [Р13](../DECISIONS.md#р13) і лишається чинною.

Пастка, яку довелося обійти: сліпо брати назву з фічі не можна. У групі «Дракон-предок» усі десять опцій
вішають **одну** фічу, тож заголовком стало б те саме слово на всіх картках; те саме в «Модель броні» (2) і
«Бойовий стиль (Swords)» (2). Тому назва з фічі йде в заголовок лише тоді, коли в групі вона одна на опцію —
інакше лишається `optionName`. Перевірено на справжніх артефактах конструктора: «Дракон-предок» тримає свої
десять підписів, «Тотемний дух» і «Коло землі (біом)» отримали назви фіч.

Опис більше не дублює заголовок: `findPreview` пропускає кандидата, що дорівнює заголовку або голій назві.
Той самий модуль вживає й `SubclassChoiceOptionsForm`, де лежала дослівна копія `stripMarkdownPreview` —
копії більше немає.

**Перевірено:** `src/lib/logic/choice-option-card-text.test.ts` (5 випадків, зокрема колізія «Дракон-предок»;
доведено червоним), плюс живий Chromium на :3100 — крок «Опції класу» Чорнокнижника 2024 показує
«Мучливий вибух [Agonizing Blast]» із описом ефекту під ним.

### P4-regression-2014-03 — Чарівник 2014 має на 1 рівні дві риси чаклування — «Чаротворство (Чарівник)» і порожню дублікатну «Заклинання»

**Рівень:** P3 · **Редакція:** 2014 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06.** Рядок `class_feature (WIZARD_2014, 20050)` прибрано тим самим сідом. Перевірено питання автора «чи не привʼязана ця загальна риса до інших кастерів»: ні, 20050 має рівно один звʼязок, і він був у чарівника. **Прогін у прод — за власником.**

**Правило:** PHB 2014, Wizard 1: Spellcasting + Arcane Recovery — дві риси, не три.

**Має бути:** Одна риса чаклування класу (4855) на 1 рівні.

**Є:** Дві: 4855 і загальна 20050 «Заклинання — Ви можете чаклувати», яка нічого не додає.

**Доказ:** `select cf.level_granted, f.feature_id, f.eng_name from class_feature cf join feature f on f.feature_id=cf.feature_id where cf.class_id=15 /*WIZARD_2014*/ and cf.level_granted<=2` → L1 4855 Spellcasting (Wizard), L1 4856 Arcane Recovery, L1 20050 Spellcasting, L2 4857 Arcane Tradition. На листі персонажа 12 у «ПАСИВНІ ЗДІБНОСТІ [7]» поруч стоять «Чаротворство (Чарівник) — Повний кастер з підготовкою заклинань з книги на Інтелекті» і «Заклинання — Ви можете чаклувати» (shots/P4-gw-sheet.png).

**Відтворення:** Створити будь-якого чарівника 2014 і подивитися список пасивних здібностей на листі.

**Куди дивитись:** Прибрати звʼязок class_feature (WIZARD_2014, 20050); перевірити, чи ця загальна риса не привʼязана так само до інших кастерів.

**Файли:** `prisma/seed/classFeatureSeed.ts`


## Створення персонажа 2024 (9)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P0 | 2024 | bug | `P1-human-fighter-01` | Конструктор /2024/char зберігає персонажа з pers.ruleset = RULES_2014, бо zod-схема має .default("RULES_2014"), а форма редакцію не надсилає | src/lib/zod/schemas/persCreateSchema.ts, src/lib/components/characterCreator/MultiStepForm.tsx |
| ✓ | P1 | 2024 | data | `P6-class-sweep-level1-02` | Жоден із 13 класів 2024 не дає володінь навичками — крок «Навички» не пропонує класового вибору | prisma/seed/, data/2024/normalized/classes.json |
| ✓ | P1 | 2024 | data | `P6-class-sweep-level1-03` | Жоден клас 2024 не дає володінь інструментами (Herbalism Kit, Thieves' Tools, 3 інструменти барда, вибір монаха) | prisma/seed/, data/2024/normalized/classes.json |
| · | P2 | both | bug | `L01-species-10` | Серверна дія створення не вимагає вибору в кожній групі опцій виду — персонаж може лишитись без обовʼязкової риси | src/server/db/creation-content.ts, src/rules/character-creation.ts |
| · | P2 | 2024 | bug | `L07-spellcasting-09` | Картка класу показує Паладину й Слідопиту 2024 таблицю слотів 2014: на 1-му рівні «слотів немає» | src/lib/components/characterCreator/modals/ClassInfoModal.tsx, src/lib/refs/static.ts |
| ↓ | P2 | both | missing-system | `L07-spellcasting-10` | Немає вибору заклинань ні при створенні, ні при підвищенні; книга чарівника 2024 (6 + 2 за рівень) ніде не рахується | src/lib/components/characterCreator/creation-step-resolver.ts, src/lib/components/levelUp/LevelUpWizard.tsx |
| · | P2 | both | missing-system | `L19-parity-competitors-02` | Персонажа не можна створити одразу потрібним рівнем — конструктор завжди дає рівень 1 | src/lib/zod/schemas/persCreateSchema.ts, src/lib/components/characterCreator/MultiStepForm.tsx |
| · | P2 | both | missing-system | `L19-parity-competitors-09` | Немає фільтра джерел/книг: стіл, що грає рівно по PHB, бачить той самий список, що й стіл, який дозволив усе | src/lib/components/characterCreator/RacesForm.tsx, src/lib/components/characterCreator/BackgroundsForm.tsx |
| · | P3 | 2024 | bug | `P3-multiclass-wizard-cleric-07` | Підсумок конструктора малює сирі id предметів замість назв («204 • 205 • 206 • 208») | src/lib/components/characterCreator/NameForm.tsx, src/lib/components/characterCreator/equipment-choices.ts |

### P1-human-fighter-01 — Конструктор /2024/char зберігає персонажа з pers.ruleset = RULES_2014, бо zod-схема має .default("RULES_2014"), а форма редакцію не надсилає

**Рівень:** P0 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** n/a (архітектурна вимога: pers.ruleset має відповідати редакції обраного класу; CONTEXT.md — «дві редакції як вимір даних ruleset»)

**Має бути:** Персонаж, створений на /2024/char із класу FIGHTER_2024, має pers.ruleset = RULES_2024

**Є:** pers.ruleset = RULES_2014 при class_id 343 (FIGHTER_2024); з цього ростуть знахідки 02, 03, 04

**Доказ:** 1) Чернетка localStorage `dnd-2024-pers-form` після всіх 12 кроків не містить ключа `ruleset`: {"formData":{"raceId":1875,...,"classId":343,"classChoiceSelections":{"Бойовий стиль":3384},"weaponMasteryWeaponIds":[2217,2214,2209]}}. 2) src/lib/zod/schemas/persCreateSchema.ts:294 — `ruleset: z.enum(["RULES_2014","RULES_2024"]).default("RULES_2014").optional()`; .default() спрацьовує на відсутньому полі. 3) Через це src/server/db/character-creation.ts:180 `const ruleset = (validData.ruleset ?? characterClass.ruleset ?? "RULES_2014")` ніколи не доходить до characterClass.ruleset. 4) src/app/2024/char/page.tsx:41 передає initialRuleset="RULES_2024" лише в UI; MultiStepForm.tsx:90 читає formData.ruleset ?? initialRuleset тільки для показу. 5) Запит до spells_test: select pers_id,name,class_id,ruleset from pers where pers_id=16 → {class_id:343 (FIGHTER_2024), ruleset:"RULES_2014"}. Для порівняння pers_id=6, зібраний хелпером tests/helpers/build-2024-character.ts:103 (`ruleset:"RULES_2024"` явно у формі) → ruleset RULES_2024, str 17, 3 рядки pers_weapon_mastery.

**Відтворення:** /2024/char → Людина → риса Умілець → Воїн → Оборона → 3 майстерності → Солдат 2024 → характеристики (+2 Сила, +1 Статура) → 2 мови → спорядження A → імʼя → «Створити» → select ruleset from pers where pers_id=<новий>

**Куди дивитись:** Прибрати .default("RULES_2014") у persCreateSchema.ts:294 (або зробити поле обовʼязковим) і/або класти initialRuleset у formData при ініціалізації MultiStepForm. Гейт має ганяти payload конструктора, а не payload тестового хелпера — приймальні набори 2024 зелені саме тому, що хелпер підставляє ruleset сам.

**Файли:** `src/lib/zod/schemas/persCreateSchema.ts`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/app/2024/char/page.tsx`, `src/server/db/character-creation.ts`, `tests/helpers/build-2024-character.ts`

**Скептик:** Відтворив незалежно, не покладаючись на дані автора (його рядки в spells_test уже стерті чужим прогоном — pers_id 16 тепер інший персонаж).

1) КОД. Ланцюг підтверджено пофайлово: `src/lib/zod/schemas/persCreateSchema.ts:294` — `ruleset: z.enum([...]).default("RULES_2014").optional()`; емпірично на zod 4.3.6 з репо `parse({})` і `parse({ruleset:undefined})` обидва дають `{"ruleset":"RULES_2014"}`. `src/app/2024/char/page.tsx:41` передає `initialRuleset="RULES_2024"` лише пропом; `MultiStepForm.tsx:90` тримає його в локальній `currentRuleset` (використання: рядки 437, 857, 982 — усе UI), а `handleFinalSubmit` (рядок 150) шле `usePersFormStore.getState().formData` як є. У `src/lib/stores/persFormStore.ts` поля `ruleset` немає; `grep -rn "ruleset:" src/lib/components/characterCreator/` не дає жодного запису у formData. `src/lib/actions/character.ts` — реекспорт, нічого не додає. Отже `validData.ruleset` завжди «RULES_2014», і `character-creation.ts:180` та `:427` (`?? characterClass.ruleset`) справді недосяжні.

2) ВЛАСНИЙ ДОКАЗ ПОВЕДІНКИ. Написав інтеграційний прогін (`scratchpad/audit/work/VERIFY-P1-01/`), який будує ОДНУ Й ТУ САМУ фікстуру `01-dragonborn-fighter-soldier` двічі через справжню `createCharacter`: контроль — форма з `ruleset`, дослід — та сама форма з видаленим ключем (payload браузера). Результат (`result.json`, база spells_test):
- з ruleset: pers 173 → ruleset RULES_2024, str 19, con 14, 4 рядки pers_weapon_mastery, рівень 5, levelUpErrors [];
- без ruleset: pers 178 → **ruleset RULES_2014 при class FIGHTER_2024**, str 15, con 13 (ASI походження не застосовано), **0 рядків pers_weapon_mastery**, рівень 1, і всі чотири підвищення падають «рівень 2..5: Клас не знайдено».
Тобто одним прогоном підтверджені й корінь (01), і наслідки 02 (глухий кут підвищення), 03 (ASI походження), 04 (майстерність зброї).

3) ЗВІДКИ РЕГРЕСІЯ (доказ, якого в звіті немає). `git diff src/lib/components/characterCreator/MultiStepForm.tsx` показує **вилучений** блок `handleRulesetChange`, у якому був єдиний у кодовій базі запис `updateFormData({ ruleset: newRuleset })`. Розділення маршрутів (KR7.2 + робота O5/O6, незакомічена) прибрало внутрішній перемикач редакції разом із цим записом і нічим його не замінило. Це не задум, а недогляд рефакторингу.

4) РІШЕННЯ ВЛАСНИКА — навпаки, підсилює знахідку. `docs/KNOWN-BUGS.md:41-46`: «краще, ніж відмовити у створенні персонажа чи, гірше, **створити його без частини вибраного й змусити гравця перестворювати**» — тут відбувається саме гірший із названих сценаріїв. У «Прийнято» лише BUG-001…003, жодне не про це; «Відкриті» порожні. У `docs/DECISIONS.md` згадки про визначення `pers.ruleset` при створенні немає. `docs/o18-2024-character-parity/README.md:126-134` і `kr18.1` фіксують, що «Клас не знайдено» полагоджено тим, що редакція «їде з pers.ruleset» — тобто фікс спирається на коректний `pers.ruleset`, а не приймає його поламаність.

5) IN-FLIGHT — ні. Жоден із файлів (persCreateSchema.ts, MultiStepForm.tsx, persFormStore.ts, character-creation.ts, 2024/char/page.tsx, levelup-content.ts) не входить у список паралельної сесії (KR27.7/KR30.3) з CONTEXT.md. Незакоміченість тут — норма репо (~200 файлів у дереві).

6) ВЖЕ ВІДКРИТО — ні. У docs немає KR на це; `tests/content/ruleset-2024-creator.test.ts` за визнанням самого o18 «нічого не каже про те, що з цього виходить персонаж», а приймальні набори ходять повз дефект, бо `tests/helpers/build-2024-character.ts:103` кладе `ruleset: "RULES_2024"` у форму явно (перевірив рядок).

7) СЕРЙОЗНІСТЬ. P0 за шкалою CONTEXT: «неможливо підвищити персонажа» — прогін дає чотири поспіль «Клас не знайдено», персонаж замкнений на 1-му рівні назавжди. І це не гіпотетично: `src/rules/access.ts` тепер `isRules2024Allowed(){ return true }` («передрелізний гейт знято 2026-08-28 — реформа виходить назагал»), тож `/2024/char` доступний усім. Прод поки чистий (усі 9 394 pers — RULES_2014), отже даних ще не втрачено — це блокер релізу, а не інцидент.

Єдина неточність автора: цитовані рядки бази (pers 16, 8, 141 тощо) вже не існують — spells_test перезаписано чужими прогонами. Це не послаблює знахідку, бо вона відтворюється з нуля.


### P6-class-sweep-level1-02 — Жоден із 13 класів 2024 не дає володінь навичками — крок «Навички» не пропонує класового вибору

**Стан KR31.2, 2026-09-05: 🟡 частково.** Стартові навички 13 класів заповнені у normalized/classes.json і засіяні в spells_test. Звірки «книга → файл» та «файл → база» зелені й доведені зламом. Production-сід, оновлення каталогу й браузерна перевірка ще не виконані. Докази — у [журналі KR31.2](kr31.2-class-choices-2024.md).

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:23 (Core Barbarian Traits): «Skill Proficiencies — Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, or Survival»; :390 Bard «Choose any 3 skills»; :6862 Rogue «Choose 4»; :6086 Ranger «Choose 3»

**Має бути:** Варвар обирає 2 навички зі свого списку, Бард 3 будь-які, Пройдисвіт 4, Слідопит 3 тощо; крок «Навички» блокує «Далі», доки вибір не зроблено

**Є:** класового вибору немає взагалі; персонаж 1-го рівня має лише 2 навички від походження

**Доказ:** Запит до spells_test по всіх класах: усі 13 рядків RULES_2024 мають skill_proficiencies = null, тоді як кожен клас RULES_2014 має, напр. BARBARIAN_2014 {"options":["ANIMAL_HANDLING","ATHLETICS","INTIMIDATION","NATURE","PERCEPTION","SURVIVAL"],"choiceCount":2}. У браузері крок «Навички» ідентичний для всіх 12 класів: «НАВИЧКИ / Правила Таші / Фіксовані навички / Поводження з тваринами / Природа / Ці навички вже отримані з інших джерел і не змінюються на цьому кроці», і кнопка «Далі» активна ще до вибору (у логах усіх 13 прогонів `skills next:enabled->enabled`). У створеного клірика 141 pers_skill = NATURE, ANIMAL_HANDLING (обидві з походження Фермер). src/lib/components/characterCreator/SkillsForm.tsx:303 `const classCount = getSkillProficienciesCount(selectedClass.skillProficiencies)` → 0. Скріншот scratchpad/audit/shots/P6-BARBARIAN_2024-06-skills.png

**Відтворення:** http://127.0.0.1:3100/2024/char → Людина → Пильний → будь-який клас → Фермер → крок «Навички»: жодного класового блока, «Далі» активна одразу.

**Куди дивитись:** Заповнити class.skill_proficiencies для ruleset='RULES_2024' (SQL у db/changes/ + сід із data/2024/normalized). Нормалізоване джерело data/2024/normalized/classes.json взагалі не містить полів проficiency — його теж треба доповнити з Core Traits кожного класу.

**Файли:** `prisma/seed/`, `data/2024/normalized/classes.json`, `src/lib/components/characterCreator/SkillsForm.tsx`, `src/lib/generated/creator-content-2024.json`


### P6-class-sweep-level1-03 — Жоден клас 2024 не дає володінь інструментами (Herbalism Kit, Thieves' Tools, 3 інструменти барда, вибір монаха)

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md: Druid «Tool Proficiencies: Herbalism Kit»; Rogue «Tool Proficiencies: Thieves' Tools»; Bard «Choose 3 Musical Instruments»; Monk «Choose one type of Artisan's Tools or Musical Instrument»

**Має бути:** Друїд отримує Herbalism Kit, Пройдисвіт — Thieves' Tools, Бард обирає 3 музичні інструменти, Монах — один ремісничий/музичний інструмент (і той самий інструмент потрапляє в стартове спорядження A)

**Є:** нуль інструментів у всіх 13 класів; вибору немає

**Доказ:** spells_test: усі 13 класів RULES_2024 мають tool_proficiencies = '{}' і tool_to_choose_count = null; для порівняння DRUID_2014 '{HERBALISM_KIT}', ROGUE_2014 '{THIEVES_TOOLS}', BARD_2014 toolChoose 3, MONK_2014 toolChoose 1, ARTIFICER_2014 '{THIEVES_TOOLS}' + toolChoose 2. У жодному з 13 браузерних прогонів кроку вибору інструментів немає (повні списки кроків у scratchpad/audit/work/P6-class-sweep-level1/drive-BARD_2024.json). Побічно видно у спорядженні монаха: creator-content-2024.json MONK optionId 157 має рядок-заглушку item: "Інструменти ремісника або Музичний інструмент" замість предмета.

**Відтворення:** http://127.0.0.1:3100/2024/char → Людина → Пильний → Друїд/Пройдисвіт/Бард/Монах → пройти до кінця: кроку інструментів немає, у листі володінь немає.

**Куди дивитись:** Заповнити class.tool_proficiencies і class.tool_to_choose_count для RULES_2024 (як у 2014) і додати крок вибору інструментів у creation-step-resolver.ts, якщо toolToChooseCount > 0.

**Файли:** `prisma/seed/`, `data/2024/normalized/classes.json`, `src/lib/components/characterCreator/creation-step-resolver.ts`

**Скептик:** ПРАВИЛО — підтверджено власним читанням оракула. `data/2024/srd/classes.md`: Bard (рядок ~400) «Tool Proficiencies | Choose 3 Musical Instruments», Druid (~3040) «Herbalism Kit», Monk (~4923) «Choose one type of Artisan's Tools or Musical Instrument», Rogue (~6868) «Thieves' Tools». Уточнення до формулювання автора: у 2024 інструменти дають рівно **4 класи з 12** — решта 9 порожні за книгою, тож «жоден клас не дає» звучить як «13 зламано», хоча дірка на чотирьох.

ДАНІ — підтверджено незалежним запитом до `spells_test`: усі 13 класів `RULES_2024` мають `tool_proficiencies = '{}'`, `tool_to_choose_count = null`; 2014 має `DRUID_2014 {HERBALISM_KIT}`, `ROGUE_2014 {THIEVES_TOOLS}`, `BARD_2014` choose 3, `MONK_2014` choose 1, `ARTIFICER_2014 {THIEVES_TOOLS}` + 2. Дірка не лише в клоні: `src/lib/generated/classes.json` (генерується з **робочої** бази) — усі 13 записів `RULES_2024` мають `toolProficiencies: []`, тоді як `Druid RULES_2014 ['Набір травника']`, `Rogue RULES_2014 ['Інструменти злодія']`. Джерело сіду теж порожнє: `data/2024/normalized/classes.json` не має полів `toolProficiencies`/`toolToChooseCount` взагалі, а `prisma/seed/classSeed2024.ts` (`CLASS_CONFIGS`) не задає жодного інструмента.

КОД — читальний шлях цілий і редакційно-нейтральний, тобто це чисто дані: `src/server/db/creation-content.ts:33-34` вибирає обидва стовпці, `src/server/db/character-creation.ts:651` кладе `formatToolProficiencies(cls.toolProficiencies, cls.toolToChooseCount)` у `customProficiencies`. Доказ, що шлях працює: golden 2014 `tests/golden/creation/druid-no-subclass.json:42` містить «Набір травника», `artificer-baseline.json:42` — «Інструменти злодія • Інструменти на вибір (2)». Тобто варто заповнити сід — і текст зʼявиться без правки коду.

ВЛАСНИЙ ДОКАЗ, СИЛЬНІШИЙ ЗА АВТОРІВ — асиметрія «стартовий клас vs мультиклас» на живих рядках `spells_test`: pers #64 «Пройдисвіт 4 / Бард 4», `ruleset=RULES_2024`, базовий клас ROGUE_2024 → `custom_proficiencies = "Легкі обладунки\nКаліграфічний набір\nПроста зброя • …\nІнструменти на вибір"`. «Інструменти на вибір» прийшло від **мультикласового** Барда (`src/rules/multiclass-proficiencies.ts:51 BARD_2024 toolChoiceCount: 1`), а стартовий Пройдисвіт не дав «Інструменти злодія» взагалі. Дзеркально pers #132 (Чарівник → Воїн → **Пройдисвіт другим**) має «Інструменти злодія» — від `ROGUE_2024: tools:["THIEVES_TOOLS"]` того ж файлу. Тобто той самий Пройдисвіт 2024 отримує злодійські інструменти як мультиклас і не отримує як стартовий клас. pers #140 — одноклассовий MONK_2024 (mc=0): у тексті лише інструменти походження, класового рядка немає.

Побічний, не помічений автором наслідок: каталог класів. `src/components/classes/ClassDetailCard.tsx:123` малює «Інструменти: `toolProficiencies.join(", ") || "—"`», отже `/2024/classes` показує «—» для Пройдисвіта й Друїда 2024 проти книги — це вже не конструктор, а довідник, і гравець виправити не може.

РІШЕННЯ ВЛАСНИКА — немає. У `docs/DECISIONS.md` про класові інструменти 2024 нічого; у «Прийнято»/BUG-* `KNOWN-BUGS.md` теж (BUG-006 — про мультиклас 2014, суміжне, але інше); «Поза межами» O18 (README:229) перелічує бастіони, переклад, 2014 і гейт — інструментів там немає. Навпаки, дірку вже виміряно й записано як проблему: `docs/o26-starting-equipment-2024/kr26.2-class-equipment-seed.md:140-148` — «у Монаха 2024 `classChoiceOptions` і `toolProficiencies` **порожні** — того володіння, на яке книга посилається, застосунок не моделює взагалі», звідки й узявся рядок-заглушка в спорядженні (автор правильно вказав цей симптом).

IN-FLIGHT — ні: зачеплені файли (`classSeed2024.ts`, `data/2024/normalized/classes.json`, таблиця `class`) не входять до списку паралельної сесії (там лише гілка заклинань/мультикласових тестів KR27.7).

ВІДКРИТИЙ KR — ні. O18 закрито 8/8; критерій К22 (`tests/rules-2024/acceptance-ten.test.ts:600`) перевіряє інструменти **тільки походжень**, класи не покриті жодним критерієм, тому дірка й прожила.

СЕРЙОЗНІСТЬ — P1 лишаю: за шкалою CONTEXT «відсутнє володіння» = персонаж не за книгою, і стартовий Пройдисвіт/Друїд 2024 справді без свого володіння, плюс каталог бреше. Дві поправки до формулювання, які не міняють вердикт: (1) уражено 4 класи з 13, не всі; (2) «вибір губиться» — перебільшення: кроку вибору інструментів не існує в жодній редакції цього застосунку, 2014 лише друкує текст «Інструменти на вибір (N)», а поле `customProficiencies` на листі редаговане вручну (`MainStatsSlide.tsx:272`). Тобто фікс — це дані (заповнити сід і `classes.json`), а справжня «система» потрібна тільки під Монаха, де книга привʼязує обраний інструмент до стартового спорядження (це вже описано в KR26.2).


### L01-species-10 — Серверна дія створення не вимагає вибору в кожній групі опцій виду — персонаж може лишитись без обовʼязкової риси

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:93 — «Some traits involve making a choice from a handful of options»; :204 Keen Senses «You have proficiency in the Insight, Perception, or Survival skill»

**Має бути:** createCharacter відхиляє форму, у якій не заповнена кожна група race_choice_option обраного виду.

**Є:** Створюється мовчки; втрата володіння нічим не сигналізується.

**Доказ:** UI гейт є: src/lib/components/characterCreator/RaceChoiceOptionsForm.tsx:70-80 вимикає «Далі», доки `groupedOptions.some(({groupName}) => selections[groupName] === undefined)`. Сервер такої перевірки не робить: src/server/db/creation-content.ts:76 просто бере `uniquePositiveIds(Object.values(data.raceChoiceSelections ?? {}))`. Фікстура 03-high-elf-wizard-sage подає лише дві групи з трьох (немає «Гострі чуття») — createCharacter повернув persId без помилки, а персонаж лишився без володіння: probe-out.txt «SKILLS: ARCANA:PROFICIENT, HISTORY:PROFICIENT» — обидві від походження Sage.

**Відтворення:** Прогін species-probe.test.ts, персонаж 03-high-elf-wizard-sage — жодної навички від Keen Senses, помилок створення немає.

**Куди дивитись:** Перевірка в src/rules/character-creation.ts (чиста функція «усі групи виду закриті») + виклик у createCharacter; UI-гейт лишити як є.

**Файли:** `src/server/db/creation-content.ts`, `src/rules/character-creation.ts`, `src/lib/components/characterCreator/RaceChoiceOptionsForm.tsx`


### L07-spellcasting-09 — Картка класу показує Паладину й Слідопиту 2024 таблицю слотів 2014: на 1-му рівні «слотів немає»

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md, таблиця Paladin Features: рівень 1 → 2 підготовлені заклинання і 2 слоти 1-го рівня (у 2014 паладин отримував чаклунство лише з 2-го). Те саме для Ranger Features.

**Має бути:** У картці Паладина 2024 рівень 1 показує 2 слоти 1-го рівня.

**Є:** Показує «немає слотів» — розходиться з тим, що персонаж реально отримує, саме на екрані, за яким гравець обирає клас.

**Доказ:** src/lib/components/characterCreator/modals/ClassInfoModal.tsx:195-199 для spellcastingType === "HALF" віддає SPELL_SLOT_PROGRESSION.HALF, а src/lib/refs/static.ts:31 має `1: [0,0,0,0,0,0,0,0,0]`. Костур є лише для ARTIFICER_2014 (ClassInfoModal.tsx:179, 196-198); для 2024 нічого. specialSpellSlotProgression у PALADIN_2024 = null (перевірено і в src/lib/generated/creator-content-2024.json, і запитом до class). Сам персонаж рахується правильно: calculateCasterLevel({level:1, PALADIN_2024, HALF}, "RULES_2024") = 1 → FULL[1] = [2,0,…] (перевірено запуском src/rules/spellcasting.ts).

**Відтворення:** http://127.0.0.1:3100/2024/char → крок «Клас» → інфо-модалка Паладина, рядок рівня 1.

**Куди дивитись:** Для RULES_2024 будувати рядок таблиці через calculateCasterLevel + FULL, як це робить getInitialSpellSlots, замість статичної HALF.

**Файли:** `src/lib/components/characterCreator/modals/ClassInfoModal.tsx`, `src/lib/refs/static.ts`


### L07-spellcasting-10 — Немає вибору заклинань ні при створенні, ні при підвищенні; книга чарівника 2024 (6 + 2 за рівень) ніде не рахується

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** downgraded

**Правило:** data/2024/srd/classes.md:10219–10221 (Wizard Spellbook): «It starts with six level 1 Wizard spells of your choice… Whenever you gain a Wizard level after 1, add two Wizard spells of your choice to your spellbook.» :10225 — підготовлені обираються з книги, і їх окреме число.

**Має бути:** Крок вибору замовлянь і заклинань при створенні та при підвищенні; для чарівника окремий лічильник книги (1-й рівень 6, далі +2, на 5-му — 14) поруч із лічильником підготовлених.

**Є:** Персонаж створюється без жодного заклинання; лист показує «Заклинань: N» без стелі; гравець не має орієнтира ні на книгу, ні на її наповнення при підвищенні.

**Доказ:** src/lib/components/characterCreator/creation-step-resolver.ts не має кроку заклинань (жодного збігу на «spell»); src/lib/components/levelUp/LevelUpWizard.tsx теж (крок «replacements» стосується опційних класових фіч, не заклинань). Зібраний 02-dwarf-cleric-farmer (Клірик 5) виходить із persSpells = [] — нуль заклинань і нуль замовлянь. src/lib/logic/spellcasting-progression.ts:50 для WIZARD_2024 додає лише текстову примітку "+ книга заклинань" — числа немає.

**Відтворення:** probe-out.json → 02-dwarf-cleric-farmer → spells = [].

**Куди дивитись:** Новий крок конструктора/майстра, що читає spell_classes за редакцією й обмежує вибір числами SPELL_PREPARATION_2024 і maxSpellLevel; окремий рядок «книга» для WIZARD_2024.

**Файли:** `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/lib/logic/spellcasting-progression.ts`

**Скептик:** Ядро знахідки підтверджую власним доказом, сильнішим за авторський. (1) ПРАВИЛО: data/2024/srd/classes.md, Wizard Spellcasting — «It starts with six level 1 Wizard spells of your choice… Whenever you gain a Wizard level after 1, add two Wizard spells of your choice to your spellbook» і окремо «choose four spells from your spellbook»; цитата точна, редакція 2024. (2) КОД: не просто кроку немає в UI — у вхідних схемах немає полів узагалі: src/lib/zod/schemas/persCreateSchema.ts (322 рядки) і levelUpSchema.ts дають 0 входжень «spell», тож заклинання не можна передати навіть повз оболонку. Єдиний запис у pers_spell на створенні й левелапі — buildSpeciesPersSpellRows (character-creation.ts:365, levelup-persistence.ts:1376), тобто лише заклинання виду. Обидві редакції: /2024/char/page.tsx рендерить той самий MultiStepForm із тим самим creation-step-resolver.ts. Книга чарівника справді без числа: spellcasting-progression.ts:50 дає лише spellsNote «+ книга заклинань». (3) СЕРЙОЗНІСТЬ — головна причина зниження. За шкалою CONTEXT P1 — це «персонаж порахований не за книгою» або «вибір гравця губиться». Тут ні того, ні того: вибір не втрачається (його просто не пропонують у майстрі), а числа правильні — сам автор пунктом 11 «Перевірено й правильно» підтверджує слоти, замовляння й підготовлені до одиниці. Робочий шлях існує і він 2024-обізнаний: AddSpellDialog (MagicSlide.tsx:919) відкриває /2024/spells зі стелею за класом і передає knownTarget/cantripTarget/knownExcluded, а buildSpellCounterLines малює лічильники за джерелом; лист показує «Заклинань · Замовлянь · Підготовлено X / ліміт» (MagicSlide.tsx:500-505). Тому твердження «гравець не має орієнтира» в загальній формі спростовується — орієнтир є для підготовлених і замовлянь, немає лише числа книги. Р29 (DECISIONS.md:1233) прямо називає «додавання й видалення … заклинань» дією листа, і 26 892 рядки pers_spell у проді показують, що потік живий. Це «немає можливості, яку має зрілий білдер» = P2, і саме P2 поставив автор у звіті — P1 виник уже при агрегації. (4) ВЖЕ ВІДОМО, але не прийнято назавжди: docs/o18-2024-character-parity/kr18.4-species-choices.md:115 виміряв цю саму діру дослівно, і поруч «Довозити класові заклинання — це ще два-три KR… власник 2026-08-29 підтвердив, що цього тут не робимо» — це відкладення в межах KR, а не accepted; цільова картина reference-2024.md §14 тримає «Spellcasting choices» у кроці класових виборів. (5) Половина про книгу чарівника ближча до accepted: KR27.7 (закрито 2026-09-04) свідомо зробив книгу приміткою, а не числом — «книга — не другий список, а шар над підготовленим набором, як і в 2014», під слова власника «не створювати 100500 списків заклинань»; і сам spellcasting-progression.ts у списку in-flight. Тобто «expected» автора (окремий лічильник 6/+2/14) частково суперечить уже ухваленому підходу. Класифікація missing-system лишається — системи вибору заклинань у майстрах справді немає.


### L19-parity-competitors-02 — Персонажа не можна створити одразу потрібним рівнем — конструктор завжди дає рівень 1

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** n/a (паритет: DDB, Roll20 Charactermancer, Foundry Character Builder (DnD 5e — 2024), DMV дозволяють задати стартовий рівень)

**Має бути:** Гравець, що приєднується до кампанії 5 рівня, вводить цільовий рівень і проходить вибори один раз.

**Є:** Треба створити персонажа 1 рівня і чотири рази пройти майстер підвищення (LevelUpWizard з 15 кроками кожного разу).

**Доказ:** `src/lib/zod/schemas/persCreateSchema.ts` не має поля рівня для створення — рівень фігурує лише в `levelUp*`-полях (:301-306). `prisma/schema.prisma`, model Pers: `level Int @default(1)`. Виміряно на spells_test: обидва зібрані мною персонажі (`pers_id=3` High Elf Wizard, `pers_id=4` Red Dragonborn Fighter, обидва RULES_2024) мають `level=1`.

**Відтворення:** Пройти /2024/char до кінця — кроку «рівень» немає; створений персонаж завжди 1 рівня.

**Куди дивитись:** Додати вибір стартового рівня в конструктор і прогнати ланцюжок рівнів усередині однієї транзакції створення, повторно використавши гілку levelUpCharacter.

**Файли:** `src/lib/zod/schemas/persCreateSchema.ts`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/server/db/character-creation.ts`


### L19-parity-competitors-09 — Немає фільтра джерел/книг: стіл, що грає рівно по PHB, бачить той самий список, що й стіл, який дозволив усе

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** n/a (паритет: DDB перемикає доступні джерела на персонажі; Roll20 Charactermancer — вибір книг; Foundry — увімкнені компендіуми)

**Має бути:** На старті створення (або в налаштуваннях персонажа/теки) можна обмежити доступний контент набором книг.

**Є:** Показується весь контент редакції; групування «Інші джерела» — це порядок, а не фільтр.

**Доказ:** Джерело показується лише як бейдж: `src/lib/components/characterCreator/SourceBadge.tsx`, `RacesForm.tsx:205` («Джерело»), акордеон «Інші джерела» `RacesForm.tsx:230`, `BackgroundsForm.tsx:178`. `grep -rni "sourceFilter|filterBySource|allowedSources" src/` — жодного збігу. Enum `Source` у prisma/schema.prisma містить 39 книг, але жодного механізму вибору.

**Куди дивитись:** Поле allowedSources (Source[]) на Pers або на PersFolder (кампанія) + фільтр у creator-content і в майстрі рівня.

**Файли:** `src/lib/components/characterCreator/RacesForm.tsx`, `src/lib/components/characterCreator/BackgroundsForm.tsx`, `src/lib/content/creator-content.ts`


### P3-multiclass-wizard-cleric-07 — Підсумок конструктора малює сирі id предметів замість назв («204 • 205 • 206 • 208»)

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** «Кинджал x2 • Містичне фокусування (палиця) • Мантія • Книга заклять • Вчений набір • 5 зм».

**Є:** Частина позицій показана числовими id — гравець не може звірити свій вибір перед створенням.

**Доказ:** Крок «Імʼя», блок СПОРЯДЖЕННЯ (shots/P3-03-name.png): «Опція 1: Кинджал x2 • 204 • 205 • 206 • Вчений набір • 208». Водночас у базу конструктор записав правильні назви: `pers.custom_equipment` = «… Містичне фокусування (палиця) x1 / Мантія x1 / Книга заклять x1 …».

**Відтворення:** /2024/char → Чарівник 2024 → на кроці «Спорядження» обрати Варіант A → перейти на крок «Імʼя», подивитись блок СПОРЯДЖЕННЯ.

**Куди дивитись:** У прев'ю підсумку резолвити id предметів у назви так само, як це вже робить збірка `custom_equipment` на сервері.

**Файли:** `src/lib/components/characterCreator/NameForm.tsx`, `src/lib/components/characterCreator/equipment-choices.ts`


## Підвищення рівня (16)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P0 | 2024 | bug | `P1-human-fighter-02` | Персонаж, створений через браузерний конструктор 2024, не може підняти рівень — майстер повертає «Клас не знайдено» | src/server/db/levelup-content.ts, src/server/db/levelup-persistence.ts |
| · | P0 | 2024 | bug | `P2-elf-wizard-02` | Персонажа з конструктора 2024 неможливо підняти в рівні — майстер віддає «Клас не знайдено», рівень лишається 1 | src/server/db/levelup-content.ts, src/server/db/levelup-persistence.ts |
| · | P1 | 2024 | bug | `L06-subclasses-02` | Персонаж 2024 доходить до 5-го рівня без підкласу: сервер його не вимагає, а майстер більше ніколи не пропонує крок «Підклас» | src/server/db/levelup-persistence.ts, src/lib/components/levelUp/LevelUpWizard.tsx |
| · | P2 | 2024 | missing-system | `L05-class-choices-12` | Правило 2024 «на кожному рівні можна замінити один вибір» (виклик, метамагія, бойовий стиль, замовляння) не реалізовано — крок «Заміни» для персонажа 2024 не з'явиться ніколи | src/lib/components/levelUp/LevelUpWizard.tsx, src/lib/components/levelUp/OptionalFeaturesForm.tsx |
| ↓ | P2 | both | bug | `L08-levelup-machine-02` | Персонаж може пройти рівень підкласу без підкласу, і майстер більше ніколи його не запропонує | src/lib/components/levelUp/LevelUpWizard.tsx, src/server/db/levelup-persistence.ts |
| ↓ | P2 | both | bug | `L08-levelup-machine-05` | Сервер приймає довільний пакет ASI: одне підвищення дало +2/+2/+2 замість двох очок | src/server/db/levelup-persistence.ts, src/rules/abilities.ts |
| · | P2 | both | bug | `L08-levelup-machine-06` | Не реалізовано книжковий мінімум +1 хіт за рівень при відʼємному модифікаторі Статури | src/rules/levelup.ts, src/lib/components/levelUp/LevelUpHPStep.tsx |
| · | P2 | both | bug | `L08-levelup-machine-08` | Підвищення рівня не оновлює лічильники використань фіч і пулів ресурсів, хоча слоти оновлює | src/server/db/levelup-persistence.ts, src/server/db/resource-pool-provider.ts |
| · | P2 | both | bug | `L08-levelup-machine-10` | Знімок пишеться поза транзакцією підвищення рівня — вкладена транзакція глобальним клієнтом | src/server/db/levelup-persistence.ts, src/server/db/snapshots.ts |
| · | P2 | both | bug | `L08-levelup-machine-12` | У репозиторії живе другий, паралельний майстер підвищення рівня з захардкодженою редакцією 2014 | src/server/db/legacy-levelup-actions.ts, src/app/actions/level-up.ts |
| · | P2 | 2024 | bug | `P1-human-fighter-12` | Майстер підвищення рівня показує «КЛАС #343» замість назви класу | src/lib/components/levelUp/LevelUpWizard.tsx, src/server/db/levelup-content.ts |
| · | P3 | both | bug | `L06-subclasses-07` | getLevelUpInfo рахує нові класові й підкласові риси за рівнем ПЕРСОНАЖА замість рівня класу | src/server/db/levelup-persistence.ts |
| ↓ | P3 | both | bug | `L07-spellcasting-08` | У майстрі підвищення рівня риси з передумовою «має чаклунство» недоступні третинному заклиначу — hasSpellcasting не дивиться на підклас | src/lib/components/levelUp/LevelUpWizard.tsx, src/lib/logic/prerequisiteUtils.ts |
| ✗ | P3 | 2024 | bug | `L08-levelup-machine-01` | На 19-му рівні 2024 персонаж не отримує ані ASI, ані епічний дар — предикат isEpicBoonLevel не викликається ніде | src/rules/strategies/rules2024.ts, src/server/db/levelup-persistence.ts |
| ↓ | P3 | both | bug | `P3-multiclass-wizard-cleric-06` | Крок вибору класу в майстрі підвищення показує сирий ідентифікатор «КЛАС #350» замість назви класу | src/lib/components/levelUp/LevelUpWizard.tsx |
| · | P3 | 2014 | bug | `P4-regression-2014-04` | Прев'ю приросту HP у майстрі підвищення не враховує расовий +1 (Дворфська витривалість): показує +8, записує +9 | src/lib/components/levelUp/LevelUpWizard.tsx, src/rules/hit-points.ts |

### P1-human-fighter-02 — Персонаж, створений через браузерний конструктор 2024, не може підняти рівень — майстер повертає «Клас не знайдено»

**Рівень:** P0 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md — таблиця Fighter Features, рівень 2: Action Surge (one use), Tactical Mind

**Має бути:** Майстер веде через кроки рівня 2 (Action Surge, Tactical Mind, HP) і зберігає рівень 2

**Є:** Глухий кут: «Клас не знайдено», персонаж замкнений на 1-му рівні назавжди

**Доказ:** Браузер: /char/16/levelup → «Підняти рівень наявного класу» → картка класу → «Підвищити рівень» → під кнопкою зʼявляється «Клас не знайдено», майстер не рухається (повторні кліки — те саме). Скріншоти scratchpad/audit/shots/P1-human-fighter-lvlup-16-0..13.png. Код: src/server/db/levelup-content.ts:49-50 `const ruleset = pers?.ruleset ?? DEFAULT_RULESET; const { classes, ... } = findCharacterCreatorOptions(ruleset);` → для RULES_2014 у списку немає classId 343; src/server/db/levelup-persistence.ts:186 `const selectedClass = classes.find(...); if (!selectedClass) return { error: "Клас не знайдено" };`

**Відтворення:** Створити Воїна 2024 через /2024/char → відкрити /char/<id>/levelup → «Підняти рівень наявного класу» → клікнути картку класу → «Підвищити рівень»

**Куди дивитись:** Прямий наслідок P1-human-fighter-01; після виправлення ruleset перевірити ще раз. Додатково варто зробити помилку діагностичною (назвати редакцію персонажа й класу), бо «Клас не знайдено» нічого не пояснює гравцеві.

**Файли:** `src/server/db/levelup-content.ts`, `src/server/db/levelup-persistence.ts`

**Скептик:** Спростувати не вдалося — відтворив наскрізно власним прогоном, не покладаючись на браузерні кроки автора.

1) КОД, ланцюг доведено по ланках:
- Стор конструктора ніколи не пише `ruleset` у `formData`: `src/lib/stores/persFormStore.ts` (`createEmptyDraft()` = `{}`, `updateFormData` кличеться лише з кроків), а `MultiStepForm.tsx:90` читає `formData.ruleset ?? initialRuleset` **тільки для показу**; сабміт іде як `createCharacter(usePersFormStore.getState().formData)` (`MultiStepForm.tsx:151-153`). Жодного запису `ruleset` у `src/lib/components/characterCreator/` немає.
- Перевірив підозру, що автор помилився в zod: у zod 3 `.default().optional()` не застосував би default. У репо zod 4.3.6, і `z.enum().default("RULES_2014").optional()` **застосовує** default на відсутньому ключі (перевірив і на іграшковій схемі, і на справжній `fullCharacterSchema` через tsx: payload без `ruleset` з `classId: 343` → `ruleset = "RULES_2014"`). Клаїм автора вірний.
- Тому запобіжник `character-creation.ts:180` `validData.ruleset ?? characterClass.ruleset` ніколи не бачить `RULES_2024`.
- `levelup-content.ts:49-50` бере `pers.ruleset` → `findCharacterCreatorOptions("RULES_2014")`; у `src/lib/generated/creator-content-2014.json` classIds = 2,68,69,70,1,3,12,11,8,14,9,15,13 — 343 там немає (2024: 339-351). `levelup-persistence.ts:191-192` (у звіті вказано 186 — зсув рядків, суть та сама) → `return { error: "Клас не знайдено" }`. Обхідного шляху немає: `getLevelUpInfo:85` теж не знаходить клас, звідси й «КЛАС #343» — фолбек `getClassName` у `LevelUpWizard.tsx:1784-1786`.

2) ВЛАСНИЙ ДОКАЗ (не браузер). Персонажа автора (pers 16) вже витерли чужі інтеграційні прогони, тож зібрав свій: тимчасовий інтеграційний тест `scratchpad/audit/work/verify-P1-02/browser-payload-levelup.test.ts` (запуск власним конфігом у scratchpad, у `tests/` нічого не створював) кличе справжні `createCharacter` і `levelUpCharacter` з формою **без ключа `ruleset`** — тобто рівно тим payload, який шле стор. Результат: `{ persId: 166, classId: 343 (FIGHTER_2024), ruleset: 'RULES_2014', level: 1 }`, далі `levelUpCharacter` → `{"error":"Клас не знайдено"}`, рівень після спроби — 1. До цього тест був червоним (на іншій причині), тобто асерція справді кусає.

3) РІШЕННЯ ВЛАСНИКА: у `docs/DECISIONS.md`, «Прийнято» в `docs/KNOWN-BUGS.md` і «Поза межами» o18/o27 нічого схожого не прийнято. Навпаки, `docs/o18-2024-character-parity/README.md:129-135` фіксує цю саму поломку («Персонаж 2024 не міг підвищити рівень узагалі») як закриту KR18.1 — там полагодили лише вибір контенту за `pers.ruleset`, а те, що конструктор пише в `pers.ruleset` неправду, лишилося. Тобто це регресія по вже закритому пункту, а не свідома поведінка.

4) IN-FLIGHT: файли паралельної сесії (spell-preparation-2024, spellcasting-progression, spell-actions, pers-actions, AddSpellDialog тощо) до цього не дотичні — уражені `persFormStore.ts`, `persCreateSchema.ts`, `character-creation.ts`, `levelup-content.ts`, `levelup-persistence.ts`. Не in-flight.

5) ВЖЕ ВІДКРИТО: відкритого KR немає. Наявний гейт `tests/content/ruleset-2024-creator.test.ts` перевіряє лише завантаження контенту (сам o18 README §7 називає його «тестом, який зеленіє на порожньому»), а приймальні `tests/rules-2024/*` ходять повз дефект, бо хелпер (`tests/helpers/build-2024-character.ts:103`) кладе `ruleset: "RULES_2024"` у форму руками.

6) СЕРЙОЗНІСТЬ: за шкалою CONTEXT це прямо «неможливо підвищити персонажа» → P0, не P1. Персонаж не ламається при створенні, але замкнений на 1-му рівні назавжди, і жодного UI, щоб виправити редакцію, немає. Досяжність — не гіпотетична: `src/rules/access.ts` → `isRules2024Allowed()` повертає `true` («передрелізний гейт знято 2026-08-28»), тож `/2024/char` (і `/char/create?ruleset=RULES_2024`) відкриті всім.

Одне уточнення до звіту автора: знахідка 02 не самостійна — це наслідок 01. Лагодиться однією правкою (класти редакцію у payload / брати її з класу), і разом із нею відпадають 03, 04 та «КЛАС #343» (знахідка 12).


### P2-elf-wizard-02 — Персонажа з конструктора 2024 неможливо підняти в рівні — майстер віддає «Клас не знайдено», рівень лишається 1

**Рівень:** P0 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:9851-9965 — таблиця Чарівника: рівні 2 (Scholar), 3 (підклас), 4 (ASI), 5 (Memorize Spell) — усі недосяжні

**Має бути:** Майстер підвищення показує «Чарівник» і піднімає персонажа до 2-го рівня (Scholar, 5 підготовлених, 3 слоти)

**Є:** Помилка «Клас не знайдено», рівень не змінюється; клас підписаний сирим id «КЛАС #350»

**Доказ:** Скрипт work/P2-elf-wizard/10-levelup.mjs, лог 10b.log, скріншот shots/P2-elf-wizard-10c-final-8.png: на сторінці /char/8/levelup після «Підняти рівень наявного класу» → вибір картки класу → «Підвищити рівень» зʼявляється текст «Клас не знайдено»; після восьми натискань select level from pers where pers_id=8 → 1. Картка класу підписана «КЛАС #350» замість «Чарівник». Причина: src/server/db/levelup-content.ts:49-50 — const ruleset = pers?.ruleset ?? DEFAULT_RULESET; findCharacterCreatorOptions(ruleset) — при RULES_2014 повертає класи 2014 без classId 350; src/server/db/levelup-persistence.ts:185-186 — classes.find(...) → undefined → return { error: "Клас не знайдено" }. Той самий фільтр дає заглушку src/lib/components/levelUp/LevelUpWizard.tsx:1781.

**Відтворення:** 1) Створити персонажа через /2024/char (див. P2-elf-wizard-01) 2) /char/<id>/levelup 3) «Підняти рівень наявного класу» → клікнути картку класу → «Підвищити рівень»

**Куди дивитись:** Корінь — P2-elf-wizard-01. Додатково варто зробити майстер стійким: шукати клас за classId у повному каталозі, а редакцію брати з класу персонажа, а не з pers.ruleset; заглушку «Клас #id» замінити на явну помилку, бо зараз вона маскує розрив редакції.

**Файли:** `src/server/db/levelup-content.ts`, `src/server/db/levelup-persistence.ts`, `src/lib/components/levelUp/LevelUpWizard.tsx`


### L06-subclasses-02 — Персонаж 2024 доходить до 5-го рівня без підкласу: сервер його не вимагає, а майстер більше ніколи не пропонує крок «Підклас»

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — у кожного класу 2024 на 3-му рівні риса «<Клас> Subclass», підклас обов'язковий

**Має бути:** Підвищення до 3-го рівня класу без підкласу відхиляється помилкою; якщо персонаж уже без підкласу — майстер пропонує крок на будь-якому наступному рівні.

**Є:** Підвищення проходить успішно, персонаж 5-го рівня має subclassId=null і жодної підкласової риси, а повернути підклас через UI неможливо взагалі.

**Доказ:** Наскрізна проба (work/L06-subclasses/no-subclass.test.ts): Клірик 2024 піднятий 1→5 чотирма викликами levelUpCharacter без subclassId → `levelup -> 2/3/4/5 {"success":true}`, при цьому getLevelUpInfo щоразу каже `needsSubclass: true`. FINAL level: 5, subclassId: null, FEATURES без жодної підкласової риси. Код: src/server/db/levelup-persistence.ts:449-453 — єдина перевірка `if (subclassIdForSelectedClass) { … if (!belongs) return { error } }`, за відсутності subclassId помилки немає; рядок 86 рахує needsSubclass і повертає його (рядок 115), але споживача немає — майстер має власний src/lib/components/levelUp/LevelUpWizard.tsx:567 `return selectedClass.subclassLevel === classLevelAfter;` (рівність), тоді як серверна стратегія src/rules/strategies/rules2024.ts:16 каже `!hasSubclass && level >= 3`. Інших місць, де пишеться pers.subclassId, немає (src/lib/actions/character-transaction.ts:52 — мертвий стаб SELECT_SUBCLASS без викликів).

**Відтворення:** Створити Клірика 2024 (фікстура 02), викликати levelUpCharacter з minimalLevelUpForm({classId}) для рівнів 2,3,4,5 без subclassId → усі success, subclassId лишається null.

**Куди дивитись:** Додати серверну перевірку в executeLevelUp поруч із `belongs`: якщо rulesStrategy.needsSubclassSelection(...) і subclassIdForSelectedClass відсутній — повернути помилку. У майстрі замінити рівність на ту саму стратегію (або читати needsSubclass із getLevelUpInfo).

**Файли:** `src/server/db/levelup-persistence.ts`, `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/rules/strategies/rules2024.ts`


### L05-class-choices-12 — Правило 2024 «на кожному рівні можна замінити один вибір» (виклик, метамагія, бойовий стиль, замовляння) не реалізовано — крок «Заміни» для персонажа 2024 не з'явиться ніколи

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:8968 («Whenever you gain a Warlock level, you can replace one of your invocations with another one for which you qualify»); :7694 («Whenever you gain a Sorcerer level, you can replace one of your Metamagic options»); :4792 («Whenever you gain a Fighter level, you can replace the feat you chose with a different Fighting Style feat»); :5655 і :6439 (заміна замовляння Blessed Warrior / Druidic Warrior при кожному рівні).

**Має бути:** На кожному підвищенні рівня 2024-персонаж може поміняти один виклик / одну метамагію / рису бойового стилю / замовляння з Blessed чи Druidic Warrior.

**Є:** Механізму немає: наявний шлях — це TCoE-«опційні риси» 2014, які до 2024 не засіяні і концептуально інші.

**Доказ:** Єдиний шлях до заміни в коді: крок replacements будується з class_optional_feature (src/lib/components/levelUp/LevelUpWizard.tsx:906–931, findVisibleOptionalFeatures), а форма ChoiceReplacementForm викликається лише зсередини src/lib/components/levelUp/OptionalFeaturesForm.tsx:297, коли опційна риса має прапорець replacesInvocation / replacesFightingStyle / replacesManeuver. SQL: `select ruleset, count(*) from class_optional_feature group by 1` → лише RULES_2014: 19. Для RULES_2024 — 0 рядків.

**Відтворення:** node q.mjs "select ruleset, count(*) from class_optional_feature group by 1" → тільки RULES_2014.

**Куди дивитись:** Окрема система заміни для 2024, прив'язана до групи вибору й рівня, а не до class_optional_feature; ChoiceReplacementForm уже вміє показувати «старе → нове» і перевіряти передумови.

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/lib/components/levelUp/OptionalFeaturesForm.tsx`, `src/lib/components/levelUp/ChoiceReplacementForm.tsx`, `src/server/db/levelup-persistence.ts`


### L08-levelup-machine-02 — Персонаж може пройти рівень підкласу без підкласу, і майстер більше ніколи його не запропонує

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Правило:** data/2024/srd/character-creation.md:817-819 (Tier 1: «They learn their starting class features and choose a subclass»); таблиці класів у data/2024/srd/classes.md дають підклас на 3-му рівні класу

**Має бути:** Або сервер відмовляє в підвищенні без підкласу на рівні subclassLevel, або майстер пропонує підклас на будь-якому наступному рівні, поки його немає (як і рахує сервер: >=).

**Є:** Сервер приймає підвищення без підкласу, а форма після пропущеного рівня показує крок «Підклас» лише за точного збігу рівня — тобто ніколи. Іншого місця виставити підклас немає: updateCharacterAction (src/lib/actions/update-character.ts:10-29) редагує лише текстові поля й монети.

**Доказ:** Емпірика (scratchpad/audit/work/L08-levelup-machine/out3.txt): воїн 2024 підвищений 1→2→3→4 без subclassId у формі — «після 3-го без підкласу: {"level":3,"subclassId":null}», «рівень 4: {"success":true} → {"level":4,"subclassId":null}». У executeLevelUp немає жодної перевірки «підклас потрібен». Той самий персонаж на 4-му: getLevelUpInfo.needsSubclass=true (сервер, через rules2024Strategy.needsSubclassSelection = `level >= 3`), а майстер рахує строгою рівністю — LevelUpWizard.tsx:567-577 `return selectedClass.subclassLevel === classLevelAfter;` (3 === 5 → false).

**Відтворення:** POST серверної дії levelUpCharacter(persId, {levelUpPath:'EXISTING', classId, …}) без subclassId для воїна 2-го рівня → рівень 3 з subclassId=null; далі жодне підвищення підклас не запропонує.

**Куди дивитись:** needsSubclass у LevelUpWizard.tsx:567-577 замінити на `classLevelAfter >= selectedClass.subclassLevel`; в executeLevelUp додати відмову, коли rulesStrategy.needsSubclassSelection істинний і subclassIdForSelectedClass відсутній.

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/server/db/levelup-persistence.ts`, `src/rules/progression.ts`

**Скептик:** ПРАВИЛО — підтверджено. `data/2024/srd/classes.md` дає підклас на 3-му рівні класу («#### Level 3: Barbarian Subclass», «#### Level 3: Bard Subclass», рядки 276/900; таблиці 90/510), цитата про Tier 1 у `character-creation.md` — доречна. Для 2014 рівень залежить від класу (1/2/3) — у базі `class.subclass_level`: CLERIC/SORCERER/WARLOCK=1, DRUID/WIZARD=2, решта=3; усі 13 класів 2024 = 3.

КОД — обидва фактичні твердження підтверджую власною перевіркою:
• `src/lib/components/levelUp/LevelUpWizard.tsx:569-579` — `return selectedClass.subclassLevel === classLevelAfter;` (строга рівність);
• `src/rules/strategies/rules2024.ts:17-19` — `!hasSubclass && level >= 3`; `src/rules/progression.ts:3-5` (2014) — `level >= (subclassLevel ?? 3)`;
• `src/server/db/levelup-persistence.ts:450-458` — єдина перевірка підкласу це належність класу («Підклас не належить обраному класу»); `grep` по всьому файлу не дає жодної вимоги «підклас потрібен»;
• `src/lib/actions/update-character.ts:10-29` — тільки текстові поля, XP і монети; у `src/lib/components/characterSheet/` `subclassId` лише читається (FeaturesSlide.tsx:226,237). Іншого місця виставити підклас справді немає.

ЧОГО АВТОР НЕ ПЕРЕВІРИВ — досяжності через продукт. Крок «Підклас» у майстрі непрохідний без вибору: `SubclassForm` (`characterCreator/SubclassForm.tsx:24-54`) має схему `z.number().min(1,"Оберіть підклас")` і викликає `onNextDisabledChange(true)`, доки нічого не обрано; кнопка «Далі» — `disabled={nextDisabled || isSubmitting}` (LevelUpWizard.tsx:1375), а по степеру можна стрибати ЛИШЕ назад (`:1329 if (i <= safeCurrentStep) setCurrentStep(i)`). `subclassLevel` присутній у всіх 26 класів у `src/lib/generated/creator-content-*.json` (перевірив: жодного null), тож рівність спрацьовує рівно на потрібному рівні класу; для мультикласу `classLevelBefore` береться з рядка `pers_multiclass` (:377-387), тобто теж влучає в 3. Отже станy «рівень пройдено, підкласу нема» через UI я відтворити не можу — репро автора це прямий виклик серверної дії з рукотворним payload.

РІШЕННЯ ВЛАСНИКА — саме про це. `docs/KNOWN-BUGS.md`, розділ «Прийнято (не буде виправлено)», рішення 2026-08-13: «UI — джерело істини. Якщо оболонка колись пропустить недозволений вибір і сервер його прийме — це краще, ніж відмовити… ». BUG-001 там — буквально «subclassId не перевіряється проти рівня, на якому клас бере підклас», статус «прийнято — сервер довіряє UI». А `docs/o2-characterization/kr2.3-golden-levelup.md:82` фіксує перевірку підкласу саме в підвищенні рівня як «той самий permissive патерн, що character.ts». Тобто рекомендація (б) «сервер має відмовляти» прямо суперечить ухваленому рішенню.

ЩО ЛИШАЄТЬСЯ. Асиметрія `===` (клієнт) проти `>=` (сервер) і повна відсутність шляху відновлення — реальні й рішенням не покриті: якщо стан колись виникне (прямий виклик дії, стара продова строка, майбутній імпорт), персонаж лишиться без підкласу назавжди. Але це «не можна виправити без перестворення» = P2 за шкалою, а не P1: під час нормальної гри персонаж за книгою і жоден вибір гравця не губиться. Не in-flight (файли не з переліку паралельної сесії), окремого відкритого KR під це немає.


### L08-levelup-machine-05 — Сервер приймає довільний пакет ASI: одне підвищення дало +2/+2/+2 замість двох очок

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Правило:** data/2024/srd/classes.md — риса Ability Score Improvement кожного класу: «you can increase one ability score by 2, or two ability scores by 1 each»

**Має бути:** Сервер відкидає пакет, у якому сума приростів більша за 2 або кількість записів більша за дві по +1.

**Є:** Приймається будь-яка кількість записів по +1/+2; персонаж отримав шість очок характеристик за один рівень.

**Доказ:** Емпірика (out3.txt): воїн 5-го рівня, один виклик levelUpCharacter з customAsi [{STR,2},{DEX,2},{CON,2}] → «до={"level":5,"str":19,"dex":14,"con":14} res={"success":true} після={"str":20,"dex":16,"con":16}». Код: src/server/db/levelup-persistence.ts:240-247 — цикл по data.customAsi без будь-якої перевірки сумарного бюджету; відсіюються лише значення, що не дорівнюють 1 або 2, і потім усе клампиться стелею 20 (clampStats).

**Відтворення:** levelUpCharacter(persId, {classId, levelUpPath:'EXISTING', customAsi:[{ability:'STR',value:2},{ability:'DEX',value:2},{ability:'CON',value:2}], …}) на ASI-рівні → success:true, три характеристики зросли.

**Куди дивитись:** Винести перевірку пакета в чисту функцію (src/rules/) — «або один +2, або два по +1» — і викликати її в executeLevelUp перед clampStats; форма вже обмежує, серверу бракує того самого гейта.

**Файли:** `src/server/db/levelup-persistence.ts`, `src/rules/abilities.ts`

**Скептик:** Технічно знахідка підтверджена — і моїм власним, сильнішим доказом, ніж авторський. Але P1 не тримається: жоден шлях у застосунку до цього не веде, тож жоден живий персонаж не порахований не за книгою.

(1) ПРАВИЛО — підтверджено, але не за тією цитатою. Автор посилається на `data/2024/srd/classes.md`; там у всіх 12 класів стоїть лише «You gain the Ability Score Improvement feat … or another feat of your choice» (напр. рядки 288, 906, 2233). Сам бюджет — у `data/2024/srd/feats.md:65`: «Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can't increase an ability score above 20.» Для 2014 тексту класового ASI в репо немає (`data/2014/srd/` не містить розділу класів); найближче — `data/2014/beyond-srd-uk/batch-19.json:99` «підняти одну характеристику на 2 або дві характеристики на 1 кожну». Правило те саме в обох редакціях, `edition: both` коректний.

(2) КОД — гейта немає ніде на сервері. `levelUpInputSchema` (`src/lib/zod/schemas/levelUpSchema.ts:10`) перевіряє лише форму масиву. `src/lib/actions/levelup.ts` — тільки `auth()` + `parseLevelUpInput`. Цикл у `src/server/db/levelup-persistence.ts:243-251` (рядки зсунулися, і тіло вже інше, ніж у звіті: тепер `newStats[key] = raiseAbilityScore(newStats[key], delta, standardCeiling)`, а не `+=`) відсіює лише `delta !== 1 && delta !== 2` — акумулятора бюджету немає. `src/rules/levelup-ability-scores.ts` (`findAbilityScoresAfterLevelUp`) теж не валідує — це калькулятор прев'ю, і його імпортують лише `LevelUpWizard.tsx` і `LevelUpHPStep.tsx`. Єдиний бар'єр — клієнтський: `LevelUpASIForm.tsx:151` `const asiValid = choiceType === "ASI" ? totalAsi === 2 : true` плюс `setAsiValue`, який фізично не дає перевалити за 2. Файл `src/rules/abilities.ts` зі списку автора до цього шляху стосунку не має.

ДОДАТКОВО, чого автор не помітив і що сильніше за його доказ: сервер не перевіряє навіть того, що рівень взагалі ASI-івський. `isASILevel` рахується в `getLevelUpInfo` (`levelup-persistence.ts:94`) і повертається клієнтові (:123), але `executeLevelUp` бере з `info` тільки `{ pers, classes, feats }` і `isASILevel` не читає ніколи (`grep isASILevel src/` → лише :94, :123 і майстер).

(3) РІШЕННЯ ВЛАСНИКА — є суміжне, але воно НЕ покриває цю знахідку. `docs/KNOWN-BUGS.md:41-45`, рішення власника 2026-08-13: «UI — джерело істини… краще, ніж відмовити у створенні персонажа». Ним прийнято BUG-001..003 — усі три про `createCharacter` і про те, *який варіант* дозволений. BUG-008 (`KNOWN-BUGS.md:195-212`) — рівно про цю межу в підвищенні рівня — залишено ВІДКРИТИМ із прямою вказівкою: «та сама категорія, що BUG-001..003, але тут обмеження геймплейне… варте окремого рішення власника, а не автоматичного перенесення в „Прийнято“ за аналогією». Отже автоматично приймати не можна. Понад те, у самому проєкті бюджет ASI на сервері вже перевіряється — для походження 2024: `findBackgroundAsiProblem` викликається з `src/server/db/character-creation.ts:191` і `rules2024Strategy.validateBackgroundASI` (`src/rules/strategies/rules2024.ts:38-58`) відхиляє будь-який розподіл, крім `+2/+1` і `+1/+1/+1`. Тобто одне з двох джерел ASI сервер тримає, друге — ні. `classification: accepted` виключено.

(4) IN-FLIGHT — ні. `src/server/db/levelup-persistence.ts` і `src/lib/zod/schemas/levelUpSchema.ts` у списку паралельної сесії (KR27.7/KR30.3) не значаться.

(5) ВІДКРИТИЙ KR — окремого KR немає (`grep customAsi docs/` дає лише `KNOWN-BUGS.md`), але найближчий родич BUG-008 відкритий і чекає саме рішення власника. Варто оформити тим самим питанням.

(6) СЕРЙОЗНІСТЬ — знижую P1 → P2. Шкала CONTEXT дає P1 лише коли «персонаж рахується не за книгою або вибір губиться». У застосунку до цього дійти неможливо: майстер обнуляє форму на монтуванні (`LevelUpWizard.tsx:250-254 resetForm()`), тримає власний ключ чернетки (`activateLevelUpDraftStorage`), крок ASI малюється лише за `isASILevel || isEpicBoonLevel` (`LevelUpWizard.tsx:860`), а `setAsiValue` не дає зібрати більше двох очок. Значень із конструктора (`customAsi` там — шість сирих балів 8–15) сервер не пропустить через фільтр `delta === 1 || 2`. Тобто це дірка довіри до клієнта, яку відкриває лише зроблений вручну POST на серверну дію: гравець може «начитити» власного персонажа, але жоден персонаж не порахований неправильно сам собою й жоден вибір не губиться. Другий мертвий шлях (`src/server/db/legacy-levelup-actions.ts:191-208`) має ту саму дірку і жодного маршруту не має — це підтверджує знахідку -12 автора, а не додає ризику.

Один зауваг до звіту: він місцями застарів. Знахідка -01 стверджує «grep isEpicBoonLevel → жодного виклику», а зараз виклик є — `LevelUpWizard.tsx:860`. На цю знахідку не впливає, але номери рядків і цитати коду з L08 варто перечитувати з дерева, а не зі звіту.


### L08-levelup-machine-06 — Не реалізовано книжковий мінімум +1 хіт за рівень при відʼємному модифікаторі Статури

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-creation.md:775 — «Roll that die, add your Constitution modifier to the roll, and add the total (minimum of 1) to your Hit Point maximum.»

**Має бути:** Приріст максимуму хітів за рівень ніколи не менший за 1.

**Є:** Чарівник/чародій (d6) зі Статурою 8 (мод −1) і кидком 1 отримує +0; зі Статурою 6 (мод −2) максимум хітів зменшується.

**Доказ:** src/rules/levelup.ts:52 — `const hitPointDelta = Math.max(0, toInteger(choices.hitDieIncrease)) + abilityModifier(scores.CON) + toughBonus + traitBonus + conModifierDelta * before.level;` — клампиться лише кидок, не сума. Те саме в UI: src/lib/components/levelUp/LevelUpHPStep.tsx:172 `const totalIncrease = hpIncrease + newConMod + toughBonus + retroactiveConHp;`.

**Відтворення:** Персонаж d6 із CON 8 → підвищення рівня, режим «Кидок», випав 1 → maxHp не змінився (у книзі +1).

**Куди дивитись:** У applyLevelUp обгорнути частину «кидок + модифікатор Статури» у Math.max(1, …) перед додаванням Здоровані/рис/ретроактивної Статури; те саме показувати в LevelUpHPStep.

**Файли:** `src/rules/levelup.ts`, `src/lib/components/levelUp/LevelUpHPStep.tsx`


### L08-levelup-machine-08 — Підвищення рівня не оновлює лічильники використань фіч і пулів ресурсів, хоча слоти оновлює

**Статус:** ✅ закрито 2026-09-06 (KR31.3), доведено наскрізно на даних 2014 — `tests/db/levelup-uses-growth.test.ts`.

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (узгодженість із власною поведінкою слотів; книга дає нове використання разом із рівнем)

**Має бути:** Коли рівень підвищує максимум використань (Second Wind 2→3 на 4-му рівні воїна, лють варвара 2→3, Action Surge 1→2 на 17-му), залишок доростає так само, як доростають слоти.

**Є:** usesRemaining лишається старим витраченим числом до найближчого відпочинку.

**Доказ:** grep -n "usesRemaining" src/server/db/levelup-persistence.ts → порожньо. Водночас слоти заклинань доростають у src/rules/levelup.ts:64 через applySpellSlotMaximumDelta, а пактові — рядком нижче. Схема: PersFeature.usesRemaining (prisma/schema.prisma:738) і PersResourcePool.usesRemaining (prisma/schema.prisma:842) — обидва рухаються лише у feature-uses.ts, rest-actions.ts і wildshape-uses.ts.

**Відтворення:** Витратити всі Second Wind на 3-му рівні воїна → підвищити до 4-го → pers_feature.uses_remaining лишається 0 при новому максимумі 3.

**Куди дивитись:** У транзакції executeLevelUp, після запису рівня, застосувати ту саму дельту максимуму до PersFeature.usesRemaining і PersResourcePool.usesRemaining (максимум уже вміє рахувати calculateMaxUsesForFeature + findPoolProviderForPers).

**Файли:** `src/server/db/levelup-persistence.ts`, `src/server/db/resource-pool-provider.ts`, `src/server/db/feature-uses.ts`


### L08-levelup-machine-10 — Знімок пишеться поза транзакцією підвищення рівня — вкладена транзакція глобальним клієнтом

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Знімок або в тій самій транзакції, що й підвищення, або перед нею — але не вкладеною транзакцією іншого зʼєднання під утримуваними блокуваннями.

**Є:** Знімок не атомарний із підвищенням: відкат зовнішньої транзакції лишає зайвий знімок в історії; вкладена транзакція під блокуваннями зовнішньої — джерело затримок і P2028.

**Доказ:** У src/server/db/levelup-persistence.ts усередині `await prisma.$transaction(async (tx) => {` першим рядком стоїть `await createCharacterSnapshot(persId);`, а createPersSnapshot (src/server/db/snapshots.ts:18-40) працює глобальним `prisma` і відкриває власну `prisma.$transaction`.

**Відтворення:** Викликати підвищення, яке падає після знімка (наприклад, кидок «Оберіть рівно 4 вливання» для артифікатора) → рівень не змінився, а в історії зʼявився новий знімок.

**Куди дивитись:** Винести createCharacterSnapshot перед prisma.$transaction або передати tx у createPersSnapshot (зробити його приймати клієнта).

**Файли:** `src/server/db/levelup-persistence.ts`, `src/server/db/snapshots.ts`, `src/lib/actions/snapshot-actions.ts`


### L08-levelup-machine-12 — У репозиторії живе другий, паралельний майстер підвищення рівня з захардкодженою редакцією 2014

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Один шлях підвищення рівня.

**Є:** Другий, мертвий, але робочий шлях запису в ті самі таблиці з іншими правилами й фіксованою редакцією 2014; будь-яке випадкове під'єднання компонента робить його живою серверною дією.

**Доказ:** src/server/db/legacy-levelup-actions.ts — 348 рядків, 'use server', рядок 7: `const ACTIVE_RULESET: Ruleset = "RULES_2014";`. Реекспортований як серверні дії у src/app/actions/level-up.ts (commitLevelUp, getLevelUpInfo, saveLevelUpChoices) і споживається src/components/level-up/{LevelUpWizard,LevelUpWizardMulticlass,StepRenderer,useLevelUpManager} та src/store/character-store.ts. grep -rn "components/level-up" src/ показує лише внутрішні імпорти — жоден маршрут ці компоненти не рендерить.

**Відтворення:** grep -rn "legacy-levelup-actions\|app/actions/level-up" src/

**Куди дивитись:** Видалити src/components/level-up/, src/app/actions/level-up.ts і src/server/db/legacy-levelup-actions.ts разом із залежністю в src/store/character-store.ts — або, якщо щось із них ще потрібне, під'єднати до єдиної реалізації.

**Файли:** `src/server/db/legacy-levelup-actions.ts`, `src/app/actions/level-up.ts`, `src/components/level-up/useLevelUpManager.ts`, `src/store/character-store.ts`


### P1-human-fighter-12 — Майстер підвищення рівня показує «КЛАС #343» замість назви класу

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** «Воїн»

**Є:** «КЛАС #343»

**Доказ:** На кроці «Оберіть клас, який отримує +1 рівень» картка підписана «КЛАС #343 / Рівень класу: 1 / ОСНОВНИЙ КЛАС» — сирий classId у інтерфейсі. Скріншот shots/P1-human-fighter-lvlup-16-a.png (і shots/P1-human-fighter-lvl-16-0..5.png)

**Відтворення:** /char/16/levelup → «Підняти рівень наявного класу»

**Куди дивитись:** Ймовірно, той самий корінь, що 01/02: назва береться зі списку класів редакції персонажа, і для RULES_2014 клас 343 не знаходиться, тож малюється запасний підпис. Перевірити після виправлення ruleset; додатково зробити запасний підпис читабельним (назва з pers.class, а не id)

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/server/db/levelup-content.ts`


### L06-subclasses-07 — getLevelUpInfo рахує нові класові й підкласові риси за рівнем ПЕРСОНАЖА замість рівня класу

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (внутрішня узгодженість: реальна видача в тому самому файлі використовує рівень класу)

**Має бути:** getLevelUpInfo повертає риси того рівня КЛАСУ, який підвищується.

**Є:** Для мультикласового персонажа повертає риси за рівнем персонажа — неправильний список. Зараз наслідків для користувача немає, бо майстер рахує власні значення (LevelUpWizard.tsx:660-671, теж classLevelAfter), тобто це пастка для наступного споживача API.

**Доказ:** src/server/db/levelup-persistence.ts:89-90: `const newClassFeatures = (currentClass?.features ?? []).filter((f) => f.levelGranted === nextLevel); const newSubclassFeatures = (currentSubclass?.features ?? []).filter((f) => f.levelGranted === nextLevel);` де `nextLevel = pers.level + 1` (рівень персонажа, рядок 75). Реальна видача на рядку 731 правильно використовує classLevelAfter: `if (sf.levelGranted === classLevelAfter) featuresToAdd.add(sf.featureId)`.

**Відтворення:** Читання коду; мультикласовий 2024 персонаж (наприклад Чарівник 2 / Воїн 3, рівень персонажа 5) — getLevelUpInfo відфільтрує риси за levelGranted === 6.

**Куди дивитись:** Замінити nextLevel на рівень класу (findMainClassLevel(pers) + 1) у рядках 89-90.

**Файли:** `src/server/db/levelup-persistence.ts`


### L07-spellcasting-08 — У майстрі підвищення рівня риси з передумовою «має чаклунство» недоступні третинному заклиначу — hasSpellcasting не дивиться на підклас

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Правило:** PHB 2024, War Caster / Spell Sniper: «Prerequisite: Spellcasting or Pact Magic Feature». Лицар-Чаклун має рису Spellcasting з 3-го рівня (data/2024/srd/classes.md — підкласу в SRD немає, але сам проєкт задає subclass.spellcasting_type = THIRD).

**Має бути:** Воїн 4 (Лицар-Чаклун, підклас із 3-го рівня) на кроці ASI бачить War Caster, Spell Sniper, Elemental Adept як доступні.

**Є:** Усі три відсіяні prerequisiteUtils.ts:213 (`feat.prerequisiteSpellcasting && !charData.hasSpellcasting`) — вибір гравця блокується без причини.

**Доказ:** src/lib/components/levelUp/LevelUpWizard.tsx:313-325 — hasSpellcasting перевіряє pers.class.spellcastingType і spellcastingType кожного мультикласу, підклас не читає. Конструктор те саме місце робить правильно: src/lib/components/characterCreator/MultiStepForm.tsx:235-242 перевіряє клас І підклас. У базі три риси 2024 із prerequisite_spellcasting = true: ELEMENTAL_ADEPT, SPELL_SNIPER, WAR_CASTER (запит до feat).

**Відтворення:** Створити Воїна, підняти до 3-го (ELDRITCH_KNIGHT), потім до 4-го й відкрити крок ASI → риси.

**Куди дивитись:** У LevelUpWizard.tsx:313 додати pers.subclass?.spellcastingType і subclass кожного мультикласу — точно як у MultiStepForm.tsx:235.

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/lib/logic/prerequisiteUtils.ts`

**Скептик:** Код підтверджено, наслідок — ні.

(1) ПРАВИЛО. У SRD 2024 цих рис немає взагалі (`grep -i "War Caster\|Spell Sniper\|Elemental Adept" data/2024/srd/*.md` → нуль), тобто цитата автора «PHB 2024» памʼяттю, не оракулом. Але правило все одно доводиться репозиторієм: `data/2024/normalized/feats.json` — усі три (`War Caster`, `Spell Sniper`, `Elemental Adept`, `source: PHB_2024`) мають `prerequisite: "4+ рівень, особливість «Накладання заклинань» або «Магія пакту»"`. Лицар-Чаклун бере Spellcasting на 3-му рівні класу, ASI — на 4-му, отже кваліфікується. Для 2014 те саме, і рис там **пʼять**, а не три: `prisma/seed/featSeed.ts:159,499,534,810,862` = ELEMENTAL_ADEPT, SPELL_SNIPER, WAR_CASTER, ELDRITCH_ADEPT, METAMAGIC_ADEPT.

(2) КОД — розбіжність реальна. `LevelUpWizard.tsx:315-326` дивиться лише `pers.class.spellcastingType` і `multiclasses[].class.spellcastingType`; `MultiStepForm.tsx:235-242` перевіряє клас І підклас. Дані для виправлення в майстрі вже є: `loadLevelUpBaseContent` тягне `subclass: true` і `multiclasses: { include: { class: true, subclass: true } }` (`src/server/db/levelup-content.ts:13,18`), а `spellcastingType` для ELDRITCH_KNIGHT / ARCANE_TRICKSTER = THIRD/INT в обох редакціях (`src/lib/generated/creator-content-*.json`), тоді як у самих FIGHTER/ROGUE — NONE. Фікс на один `useMemo`.

(3) НАСЛІДОК — тут автор помиляється, і саме через це знижую. Риси **не** відсіюються й вибір **не** блокується: у `FeatsForm.tsx:64-87` фільтр — тільки пошук і повтор; передумова лише фарбує картку (`FeatPicker.tsx:63-95`, `opacity-70` + червоний напис) і відкриває `PrerequisiteConfirmationDialog` (`FeatsForm.tsx:196-209`), у якого є кнопка «Так, додати», що ставить `featId` (`src/lib/components/ui/PrerequisiteConfirmationDialog.tsx:56-64`). Сервер передумов не перевіряє. Тобто твердження «всі три відсіяні», «не може взяти», «вибір гравця блокується» — спростовані; персонаж рахується правильно, вибір не губиться. Це хибне попередження, а не втрата.

(4) РІШЕННЯ ВЛАСНИКА. Це прямо названа політика: Р26 — «Правила — валідація, не блок… хибний блок коштує дорожче за хибний дозвіл», і там же «Позначити незнане як “не відповідаєш” — брехня в UI» (`docs/DECISIONS.md:1109-1116`); Р39 повторює для рис: «передумови рис у цьому проєкті — попередження, а не заборона: FeatsForm показує PrerequisiteConfirmationDialog і пускає далі, а сервер передумов не перевіряє взагалі» (`docs/DECISIONS.md:1667-1672`). Політика не робить знахідку прийнятою — саме за Р26 хибне «не відповідаєш» є дефектом — але вона знімає ознаку P1.

(5) IN-FLIGHT / ВІДКРИТИЙ KR — ні. `LevelUpWizard.tsx` і `prerequisiteUtils.ts` не в списку файлів паралельної сесії; у `docs/` про `hasSpellcasting` нічого немає, у KNOWN-BUGS і o21/defects — теж.

(6) СЕРЙОЗНІСТЬ. За шкалою CONTEXT P1 = «персонаж порахований не за книгою або вибір гравця губиться». Ні того, ні того: нічого не рахується, картка клікабельна, риса додається. Не P2 — можливість є й персонажа перестворювати не треба. Лишається P3: хибна червона позначка з неправдивою причиною на кроці ASI. Класифікація `bug` (не `accepted`) — власник забороняє саме хибну позначку.


### L08-levelup-machine-01 — На 19-му рівні 2024 персонаж не отримує ані ASI, ані епічний дар — предикат isEpicBoonLevel не викликається ніде

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт скептика:** refuted

**Правило:** data/2024/srd/classes.md:341-343 — «#### Level 19: Epic Boon — You gain an Epic Boon feat (see "Feats") or another feat of your choice for which you qualify.» (так у всіх 12 класів)

**Має бути:** На 19-му рівні класу майстер показує крок вибору риси (епічний дар або будь-яка риса, для якої персонаж кваліфікований), і рису записано в pers_feat.

**Є:** Кроку немає взагалі: isASILevel=false (19 не в ability_score_up_levels), кроку епічного дару не існує. Персонаж дістає лише хіти й описову фічу «… : Epic Boon (2024)» з class_feature, риси — жодної.

**Доказ:** grep -rn "isEpicBoonLevel" src/ дає рівно три збіги, і всі три — визначення: src/rules/strategies/rules2024.ts:27, src/rules/strategies/rules2014.ts:10, src/rules/strategies/types.ts:14. Жодного виклику. Водночас rules2024.ts:20-24 навмисно вилучає 19 з ASI-рівнів (`if (level === epicBoonLevel) return false`), а сервер і майстер користуються іншими предикатами: src/server/db/levelup-persistence.ts:88 `isAbilityScoreIncreaseLevel(currentClass ?? {}, mainClassLevelAfter)` і LevelUpWizard.tsx:579-583 `(selectedClass.abilityScoreUpLevels || []).includes(classLevelAfter)`. Запит до spells_test: усі 13 класів RULES_2024 мають epic_boon_level=19, а ability_score_up_levels без 19 (FIGHTER_2024 [4,6,8,12,14,16], SORCERER_2024 [4,8,12,16]).

**Відтворення:** Персонаж 2024 будь-якого класу на 18-му рівні → /char/<id>/levelup → у списку кроків немає ні «Покращення», ні епічного дару; після підтвердження pers_feat не змінюється.

**Куди дивитись:** Додати гілку isEpicBoonLevel у steps майстра (LevelUpWizard.tsx:855-862) і в getLevelUpInfo; джерело вибору EPIC_BOON вже описане в src/rules/repeatable-feats.ts:76. Рішення власника — звужувати до категорії EPIC_BOON чи дозволяти будь-яку рису, як дозволяє книга.

**Файли:** `src/rules/strategies/rules2024.ts`, `src/server/db/levelup-persistence.ts`, `src/lib/components/levelUp/LevelUpWizard.tsx`

**Скептик:** ПРАВИЛО — підтверджено. `data/2024/srd/classes.md:341` дослівно «#### Level 19: Epic Boon … You gain an Epic Boon feat (see "Feats") or another feat of your choice for which you qualify», і заголовок «Level 19: Epic Boon» трапляється в файлі рівно 12 разів (рядки 341, 926, 2259, 3626, 4852, 5250, 5724, 6485, 7119, 7714, 9026, 10279) — тобто в усіх 12 класів. Цитата автора точна.

КОД — ключовий доказ автора спростовано. `grep -rn --include='*.ts' --include='*.tsx' "isEpicBoonLevel" src/` дає **не три збіги, а шість**, і три з них — виклики в майстрі:
- `LevelUpWizard.tsx:588-591` — `const isEpicBoonLevel = useMemo(... getRulesStrategy(pers?.ruleset ?? "RULES_2014").isEpicBoonLevel(selectedClass, classLevelAfter))`;
- `LevelUpWizard.tsx:860-863` — `if (isASILevel || isEpicBoonLevel) result.push({ id: isEpicBoonLevel ? "epic-boon" : "asi", title: isEpicBoonLevel ? "Епічний дар" : "Покращення" })`, і далі той самий блок додає крок «Опції риси»;
- `LevelUpWizard.tsx:1051-1058` — `case "epic-boon": case "asi":` рендерить `LevelUpASIForm` з `allowAbilityScoreIncrease={!isEpicBoonLevel}`.
`LevelUpASIForm.tsx:120-124` на цьому кроці примусово ставить `choiceType = "FEAT"` і чистить `customAsi`, а `:153` не пускає «Далі» без обраної риси. Сервер рису пише беззастережно: `levelup-persistence.ts:1125-1132` `if (featId) await tx.persFeat.create({ data: { featId, persId } })` — жодної залежності від `isASILevel`; гейт `findFeatPackageProblem` кличеться з джерелом `CLASS_ASI`, яке дозволяє категорію `EPIC_BOON` (`tests/rules/repeatable-feats.test.ts:59`). Стеля 30 для дару теж на місці (`findAbilityScoreCeiling`, `levelup-persistence.ts:291-292`). Тобто і крок є, і вибір зберігається — «мінус одна риса в кожного персонажа 20-го рівня» більше не відповідає дереву.

РІШЕННЯ ВЛАСНИКА — знахідка прямо перекрита. `docs/DECISIONS.md:1640` **Р39** (2026-09-04): «`isEpicBoonLevel` уже жив у rules2024.ts і був покритий тестами, але не викликався ніде в `src/`. Тепер його читає майстер: на 19-му рівні класу зʼявляється крок «Епічний дар» — той самий вибір риси, що й на ASI-рівні, але **без** альтернативи «+2 до характеристики»». Р39 також знімає пропозицію автора завести джерело `EPIC_BOON`: «риса будь-яка, а не лише категорії EPIC_BOON… окремого джерела EPIC_BOON у FeatChoiceSource більше немає — воно було б точним синонімом CLASS_ASI». `docs/o27-multiclass-2024/kr27.9-epic-boon-above-twenty.md` — «✅ зроблено 2026-09-04», у «Готово, коли» стоїть `[x]` «Понад план, за рішенням власника (Р39): епічний дар стало можливо взяти — майстер підвищення дістав крок на 19-му рівні класу».

ЧОМУ АВТОР ПОБАЧИВ ІНШЕ — таймінг, а не помилка вимірювання. Звіт `L08-levelup-machine.md` записано 2026-09-04 22:50:18; `DECISIONS.md` — 2026-09-05 00:03:31, `LevelUpWizard.tsx` — 00:07:52, `LevelUpASIForm.tsx` — 00:07:52, `src/rules/ability-score-ceiling.ts` — 00:07:28, KR27.9 — 00:14:17. Тобто ~70 хвилин після звіту паралельна сесія закрила KR27.9 і реалізувала Р39. Зміни ще **не закомічені** (`git status` → ` M` на всіх трьох файлах, HEAD = 7f3f6cb), тож у `main` цього поки немає — це єдиний залишковий ризик, і він організаційний, а не правило.

ПЕРЕВІРКА ВЛАСНИМ ПРОГОНОМ. `bunx vitest run --config vitest.config.mts tests/rules/coverage/rules2024-strategy.test.ts tests/components/levelup-ability-ceiling.test.tsx` → `2 passed, 18 passed`. Фікстура наскрізного шляху існує й зелена за KR27.9: `tests/fixtures/2024-multiclass/24-aasimar-sorcerer19-warlock1.json` («Чародій 19 / Чорнокнижник 1») бере `BOON_OF_SPELL_RECALL` і, за журналом KR27.9, матриця дала `27 passed (27)` — тобто дар проходить справжні серверні дії, а не лише предикат. Регресії 2014 немає: `rules2014.ts:11` `isEpicBoonLevel` повертає `false` завжди (`tests/rules/coverage/rules-strategies.test.ts:39`). Мультиклас порахований правильно — предикат читає `classLevelAfter` (рівень класу), як і каже книга «Level 19» класу.

ЗАЛИШКОВЕ, що знахідка називала правильно, але це не її предмет: `getLevelUpInfo` (`levelup-persistence.ts:94`) досі кличе голий `isAbilityScoreIncreaseLevel` і не повертає жодного прапорця епічного дару — на 19-му рівні воно віддасть `isASILevel:false` і нічого натомість. Користувач цього не бачить (майстер рахує сам), але це рівно та пастка, яку автор описав окремою знахідкою L08-levelup-machine-13; як самостійний дефект вона P3, а не P1.

СЕРЙОЗНІСТЬ. За шкалою CONTEXT P1 — «персонаж порахований не за книгою або вибір гравця губиться». У поточному дереві ні того, ні того немає: крок є, риса пишеться. Лишається P3-ризик «фікс не закомічений» + мертвий прапорець у `getLevelUpInfo`.


### P3-multiclass-wizard-cleric-06 — Крок вибору класу в майстрі підвищення показує сирий ідентифікатор «КЛАС #350» замість назви класу

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Має бути:** «ЧАРІВНИК» (перекладена назва класу), як на кроці вибору класу в конструкторі.

**Є:** «КЛАС #350» — гравець не бачить назви свого класу саме там, де його обирає.

**Доказ:** shots/P3-07-mc-classes.png; текст сторінки: «Оберіть клас, який отримує +1 рівень. / КЛАС #350 / Рівень класу: 1 / ОСНОВНИЙ КЛАС». `350` — це `class_id` Чарівника 2024 (`select class_id, eng_name from class where class_id=350` → WIZARD_2024).

**Відтворення:** /char/<id>/levelup → обрати шлях → крок вибору класу, який отримує рівень.

**Куди дивитись:** У компоненті кроку вибору класу підтягнути назву з завантаженого контенту й перекласти через `classTranslations` (src/lib/refs/translation.ts), а не друкувати id.

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`

**Скептик:** Поведінка реальна — підтвердив і скріншотом, і кодом: `LevelUpWizard.tsx:1786` віддає `Клас #${classId}`, коли класу немає у списку, а список приходить із `findCharacterCreatorOptions(pers.ruleset)` (`levelup-content.ts:47`). Але це **не самостійний дефект майстра**: id-простори редакцій не перетинаються і збігаються з базою, тож фолбек фізично не може спрацювати для персонажа, чия `pers.ruleset` відповідає редакції його класу. Він спрацьовує рівно в стані «RULES_2014 + клас 2024», який створює знахідка 01 (конструктор 2024 не кладе `ruleset` у formData, zod підставляє RULES_2014). Виправлення 01 знімає 06 без жодної правки в `LevelUpWizard.tsx`; окремої правки тут не треба, максимум — прибрати `?? {}`/`?? []` у `getLevelUpInfo`, щоб розбіжність падала голосно, а не мовчки. Тому verdict — downgraded, а не confirmed як окремий баг.

Серйозність за шкалою CONTEXT: P2 — «немає можливості, яку має зрілий білдер, або не можна налаштувати без перестворення»; напис із сирим id під це не підпадає, це «UX, текст, косметика» = P3. Сам автор у тілі звіту помітив картку як `ux`, а в JSON лишив P2 — саме тут розбіжність. Реальна шкода того екрана (порожні риси класу, зниклий крок підкласу, невизначений ASI-рівень через `currentClass === undefined` у `levelup-persistence.ts:85`) — це наслідок 01 і має рахуватися його вагою, а не подвоюватися тут.

Прийнятою поведінкою це не є (KNOWN-BUGS «Відкриті» порожній, «Прийнято» про інше), відкритого KR немає, файли поза списком паралельної сесії. Класифікація лишається `bug` — фолбек справді витікає в інтерфейс, — але як симптом-дублікат P0-знахідки 01, а не як окрема робота.


### P4-regression-2014-04 — Прев'ю приросту HP у майстрі підвищення не враховує расовий +1 (Дворфська витривалість): показує +8, записує +9

**Рівень:** P3 · **Редакція:** 2014 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06.** Обидва превʼю — крок хітів і екран підтвердження — рахують расові хіти за рівень тим самим `sumFeatureHitPointsPerLevel`, що й сервер у `levelup-persistence`. Тест `tests/components/levelup-hp-racial-bonus.test.tsx`: пагорбовий дворф зі СТА 16 показує +9, а не +8. Доведений червоним.

**Правило:** PHB 2014 Hill Dwarf: «Your hit point maximum increases by 1, and it increases by 1 every time you gain a level»; у даних — риса 49340 «Дварфська витривалість», shortDescription «+1 HP на рівень».

**Має бути:** «Разом приріст: +9 (Кістка 5 + СТАТ +3 + раса +1)» — те саме число, що потрапить у max_hp.

**Є:** Показано +8; реальний приріст 9. Прев'ю розходиться з результатом на величину расового бонусу.

**Доказ:** Персонаж 25 (пагорбовий дворф, СТА 16), підвищення 1→2: екран HP — «d8 · Середнє: 5 · Мод. Статури: +3 · Разом приріст: +8», екран підтвердження — «Приріст HP: +8 (Кістка 5 + СТАТ +3)» (shots/P4-cl-up2-0-3.png, shots/P4-cl-up2-0-4.png, лог cl-lvl2.log). Фактично записано +9: `select max_hp from pers where pers_id=25` → 21 при 12 на 1 рівні.

**Відтворення:** Створити пагорбового дворфа будь-якого класу, підняти рівень, звірити «Приріст HP» на екрані підтвердження з max_hp у базі.

**Куди дивитись:** У розрахунку прев'ю HP у LevelUpWizard/HP-кроці брати ті самі доданки, що й src/rules/hit-points.ts на записі (расові per-level бонуси, риса Tough тощо). Той самий клас, що BUG-012.

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/rules/hit-points.ts`


## Ідентичність і збереження (5)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P0 | both | bug | `L16-ruleset-isolation-07` | POST /api/character/level-up підвищує рівень будь-якому персонажу без автентифікації й перевірки власності, а GET віддає чужого персонажа | src/app/api/character/level-up/route.ts, src/lib/actions/character-transaction.ts |
| · | P0 | 2024 | bug | `P2-elf-wizard-01` | Персонаж, створений у конструкторі 2024 (/2024/char), зберігається з pers.ruleset = RULES_2014, бо zod-дефолт перекриває редакцію класу | src/lib/zod/schemas/persCreateSchema.ts, src/lib/components/characterCreator/MultiStepForm.tsx |
| · | P0 | 2024 | bug | `P6-class-sweep-level1-01` | Персонаж, створений у конструкторі 2024, зберігається з pers.ruleset = RULES_2014 і зникає зі списку /2024/char/home | src/server/db/character-creation.ts, src/lib/components/characterCreator/MultiStepForm.tsx |
| ✓ | P1 | both | bug | `L11-persistence-identity-01` | Зняття риси з листа видаляє ВСІ взяття повторюваної риси, бо `removePersFeat` робить `deleteMany` по `(persId, featId)` | src/server/db/feat-actions.ts, src/lib/actions/feat-actions.ts |
| · | P2 | 2024 | missing-system | `L02-backgrounds-06` | Розподіл ASI походження ніде не зберігається — бонус запечений у характеристики й невідновний | prisma/schema.prisma, src/server/db/character-creation.ts |

### L16-ruleset-isolation-07 — POST /api/character/level-up підвищує рівень будь-якому персонажу без автентифікації й перевірки власності, а GET віддає чужого персонажа

**Рівень:** P0 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Маршрут або видалений разом із мертвим legacy-UI, або починається з auth() + assertOwnsPers і не хардкодить newLevel.

**Є:** Будь-хто, знаючи persId (послідовний int), перезаписує рівень чужого персонажа на 2 і додає йому заклинання; GET віддає прогресію чужого персонажа.

**Доказ:** src/app/api/character/level-up/route.ts:24-50 — жодного auth()/assertOwnsPers: `const { persId, choices, isMulticlass } = body; … const newLevel = 2; // Placeholder! Logic needs to be robust; result = await confirmLevelUp({ persId, choices, newLevel });`. src/lib/actions/character-transaction.ts:24 — confirmLevelUp теж без auth, кличе learnClassSpells і updatePersLevel. src/server/db/legacy-levelup.ts:12-14 — `export async function updatePersLevel(persId, level) { await prisma.pers.update({ where: { persId }, data: { level } }); }`. Решта серверних дій починається з assertOwnsPers(persId) — тут його немає. GET на тому ж маршруті віддає getLevelUpSteps(persId) без перевірки.

**Відтворення:** `curl -X POST http://<host>/api/character/level-up -H 'content-type: application/json' -d '{"persId":<чужий>,"choices":[]}'` — без cookie. Далі `select level from pers where pers_id=<чужий>` → 2. (На проді НЕ виконувати.)

**Куди дивитись:** Видалити маршрут разом із мертвим UI (src/components/level-up/* ніде не монтується: `grep -rn "@/components/level-up" src` поза цією текою порожній) або додати auth() + assertOwnsPers і прибрати newLevel = 2. Дотично до моєї лінзи: це єдиний живий вхід у legacy-гілку, жорстко 2014-ну (src/server/db/legacy-levelup-actions.ts:7,95 — ACTIVE_RULESET = RULES_2014 у фільтрі choiceOption).

**Файли:** `src/app/api/character/level-up/route.ts`, `src/lib/actions/character-transaction.ts`, `src/server/db/legacy-levelup.ts`, `src/server/db/legacy-levelup-actions.ts`


### P2-elf-wizard-01 — Персонаж, створений у конструкторі 2024 (/2024/char), зберігається з pers.ruleset = RULES_2014, бо zod-дефолт перекриває редакцію класу

**Рівень:** P0 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (це не правило книги, а розрив редакції: увесь контент персонажа має ruleset RULES_2024)

**Має бути:** pers.ruleset = RULES_2024 для персонажа, зібраного з контенту 2024 у конструкторі 2024

**Є:** pers.ruleset = RULES_2014; редакція визначається дефолтом zod-схеми, а не вибором маршруту чи редакцією класу

**Доказ:** Пройдено /2024/char до кінця у браузері (скрипт work/P2-elf-wizard/07-create.mjs, скріншоти shots/P2-elf-wizard-07a..07f). Запит до spells_test: select * from pers where pers_id=8 → {"class_id":350,"background_id":163,"race_id":1871,"ruleset":"RULES_2014"}; при цьому META: race ELF_2024 = RULES_2024, class WIZARD_2024 = RULES_2024, bg SAGE_2024 = RULES_2024. Ланцюг у коді: src/app/2024/char/page.tsx:42 передає initialRuleset="RULES_2024"; MultiStepForm.tsx:64,90 використовує його лише для UI і ключа чернетки (grep 'ruleset:' у MultiStepForm — жодного присвоєння у formData); MultiStepForm.tsx:153 шле createCharacter(currentData) без поля ruleset; persCreateSchema.ts:294 — ruleset: z.enum([...]).default("RULES_2014").optional() → validData.ruleset === "RULES_2014"; character-creation.ts:180 — const ruleset = (validData.ruleset ?? characterClass.ruleset ?? "RULES_2014") — ?? ніколи не доходить до класу. Тести не ловлять: tests/helpers/build-2024-character.ts:103 передає ruleset: "RULES_2024" явно, тому персонажі 3 і 5 у spells_test мають RULES_2024, а браузерний 8 — RULES_2014.

**Відтворення:** 1) http://127.0.0.1:3100/2024/char 2) Ельф → Високий ельф / Уважність / Інтелект → Чарівник → Мудрець 2024 → +2 ІНТ, +1 СТА → Навички → Мови → Спорядження A + пакунок → Імʼя → Створити 3) select ruleset from pers where pers_id=<новий id>

**Куди дивитись:** Прибрати .default("RULES_2014") з persCreateSchema.ts:294 (лишити .optional()), щоб фолбек на characterClass.ruleset у character-creation.ts:180 запрацював; або/і записувати ruleset у formData з initialRuleset у MultiStepForm. Тест має ганяти той самий payload, що шле форма, — без явного ruleset.

**Файли:** `src/lib/zod/schemas/persCreateSchema.ts`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/server/db/character-creation.ts`, `src/app/2024/char/page.tsx`


### P6-class-sweep-level1-01 — Персонаж, створений у конструкторі 2024, зберігається з pers.ruleset = RULES_2014 і зникає зі списку /2024/char/home

**Рівень:** P0 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (не питання правил — питання ідентичності редакції; наслідки за docs/o18-2024-character-parity/reference-2024.md)

**Має бути:** pers.ruleset = RULES_2024; персонаж видно у /2024/char/home; підвищення рівня, джерела заклинань і PDF ідуть стратегією 2024

**Є:** pers.ruleset = RULES_2014; /2024/char/home редиректить назад у конструктор, персонаж лежить у списку 2014 і рахується за правилами 2014

**Доказ:** Створено клірика через /2024/char (Людина + Фермер + Пильний). Запит до spells_test: `select p.pers_id, p.name, c.eng_name cls, p.ruleset from pers p join class c on c.class_id=p.class_id where p.pers_id=141` → {"pers_id":141,"name":"Евелін Сивохіп","level":1,"cls":"CLERIC_2024","ruleset":"RULES_2014"}. Браузерна перевірка (scratchpad/audit/work/P6-class-sweep-level1/home-check.mjs): `2024 home -> http://127.0.0.1:3100/2024/char` (редирект), `2014 home -> /char/home | has char: 1`. src/app/2024/char/home/page.tsx:11 фільтрує getUserPersHomeData({ ruleset: "RULES_2024" }), рядки 13–15 роблять redirect("/2024/char") на порожньому списку. pers.ruleset читають 33 місця, зокрема src/server/db/levelup-persistence.ts:89 getRulesStrategy((pers.ruleset) ?? "RULES_2014"), src/server/db/spell-sources.ts:44, src/server/pdf/generateCharacterPdf.ts:224, FeaturesSlide.tsx:160. Скріншоти: scratchpad/audit/shots/P6-2024home-redirect.png, P6-2014home-has-2024char.png

**Відтворення:** 1) Відкрити http://127.0.0.1:3100/2024/char, очистити localStorage. 2) Людина → риса походження «Пильний» → клас Клірик → Фермер → характеристики → Далі до кінця → «Створити». 3) Відкрити /2024/char/home — редирект на /2024/char. 4) Відкрити /char/home — персонаж там. 5) У базі: select pers_id, ruleset from pers where pers_id=<id>.

**Куди дивитись:** src/server/db/character-creation.ts:180 і :427 — `validData.ruleset ?? characterClass.ruleset ?? "RULES_2014"`. Форма не кладе ruleset у formData (MultiStepForm.tsx:90 рахує currentRuleset лише для рендера, createCharacter(currentData) на рядку 153 його не додає), а persCreateSchema.ts:294 має `z.enum([...]).default("RULES_2014").optional()`. Треба або передавати ruleset із MultiStepForm у formData, або брати його з класу до zod-парсингу; плюс тест, що створення в /2024/char дає RULES_2024.

**Файли:** `src/server/db/character-creation.ts`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/lib/zod/schemas/persCreateSchema.ts`, `src/app/2024/char/home/page.tsx`


### L11-persistence-identity-01 — Зняття риси з листа видаляє ВСІ взяття повторюваної риси, бо `removePersFeat` робить `deleteMany` по `(persId, featId)`

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** docs/DECISIONS.md, Р37: «Сховище: другий рядок, не лічильник. … Кожне взяття — свій рядок зі своїми виборами: pers_feat_choice уже висить на pers_feat_id»

**Має бути:** Хрестик на другому рядку `Skilled` знімає саме друге взяття; перше з його трьома навичками лишається (Р37).

**Є:** Зникають обидва рядки `pers_feat` разом з усіма `pers_feat_choice` (каскад по `pers_feat_id`). Гравець втрачає взяття, яке не знімав.

**Доказ:** src/server/db/feat-actions.ts:87-94 — `export async function removePersFeat(persId, featId) { return prisma.persFeat.deleteMany({ where: { persId, featId } }); }`. Викликається з src/lib/actions/feat-actions.ts:64 ← FeatsSheetManagerModal.tsx:96 `removeFeatFromPers({ persId, featId })` ← AcquiredFeatsTab.tsx:110 `onClick={() => onRemoveFeat(pf.featId, translatedName)}` (рядок малюється по `pf.persFeatId` на :90, а видаляється по `featId`). Каталог явно дозволяє друге взяття: FeatCatalogTab.tsx:139 `isAcquired && !feat.isRepeatable ? «Набуто» : <кнопка Додати>`. Правильний виклик уже існує й НЕ використовується: `removePersFeatById(persFeatId, persId)` (src/server/db/feat-actions.ts:96) і `removePersFeatAction` (src/lib/actions/feat-actions.ts:76) — `grep -rn "removePersFeatAction" src/ tests/` дає лише саме визначення.

**Відтворення:** Лист персонажа → «Керування рисами» → Каталог → додати `Skilled` (або `Magic Initiate` 2024) двічі — кнопка «Додати» не блокується, бо `isRepeatable` → вкладка «Набуті» показує два рядки → зняти один → обидва зникли.

**Куди дивитись:** Провести `persFeatId` крізь `AcquiredFeatsTab.onRemoveFeat` → `FeatsSheetManagerModal.handleRemoveFeat` → уже наявну `removePersFeatAction`; `removeFeatFromPers(persId, featId)` лишити лише там, де свідомо треба зняти рису цілком.

**Файли:** `src/server/db/feat-actions.ts`, `src/lib/actions/feat-actions.ts`, `src/lib/components/characterSheet/FeatsSheetManagerModal.tsx`, `src/lib/components/characterSheet/feats/AcquiredFeatsTab.tsx`, `src/lib/components/characterSheet/feats/FeatCatalogTab.tsx`

**Скептик:** Спростувати не вдалося — знахідка підтверджується власним прогоном по базі, а не лише читанням коду.

1) ПРАВИЛО. Р37 (docs/DECISIONS.md:1609-1613) цитовано точно: «`pers_feat` втрачає унікальність `(feat_id, pers_id)`… Кожне взяття — свій рядок зі своїми виборами: `pers_feat_choice` уже висить на `pers_feat_id`». DDL справді накладений на клон: у `spells_test` `pg_indexes` по `pers_feat` дає рівно PK + звичайний `pers_feat_pers_id_feat_id_idx` — унікальності немає, другий рядок фізично лягає. FK `pers_feat_choice_pers_feat_id_fkey … ON DELETE CASCADE` (db/schema.sql:5807) — вибори гинуть разом із рядком.

2) КОД. Іншого шляху зняття немає: `grep -rn "removeFeatFromPers|removePersFeatAction|removePersFeatById|removePersFeat" src/ tests/` дає рівно один UI-виклик — FeatsSheetManagerModal.tsx:96 → feat-actions.ts:64 → `deleteMany({ persId, featId })`. `removePersFeatAction`/`removePersFeatById` не викликаються ніде. Модалка малюється з FeaturesSlide.tsx:816 ← CharacterCarousel.tsx:114, тобто однаково для обох редакцій, а `persFeats` приходить із `pers-actions.ts:649` без жодної дедуплікації по `featId` — два взяття дають дві картки (key по `pf.persFeatId`), а хрестик на кожній шле `pf.featId`.

3) РІШЕННЯ ВЛАСНИКА. У «Прийнято» docs/KNOWN-BUGS.md — лише BUG-001…003 про довіру сервера до UI; про зняття рис у docs/ немає жодної згадки (`grep -rn "видалення риси|зняття риси|removePersFeat" docs/` — порожньо). Р37 вимагає протилежного до поточної поведінки.

4) IN-FLIGHT. Жоден із зачеплених файлів не входить до списку паралельної сесії (KR27.7/KR30.3).

5) ВЖЕ ВІДКРИТО. Ні. KR27.4 закритий 2026-09-04; його журнал перелічує «чотири місця, що покладалися на унікальність пари» — character-creation.ts:275, levelup-persistence.ts:1078, feat-actions.ts:47 і :80. `removePersFeat` у той перелік не потрапив, бо він і до KR був `deleteMany`, а не `findUnique(featId_persId)`. Тобто це прогалина, залишена завершеним KR, а не відкритий KR.

6) СЕРЙОЗНІСТЬ. P1 за шкалою («вибір гравця губиться»): разом із другим `Skilled` гинуть три обрані навички першого взяття, а разом із другим `Magic Initiate` — його список заклинань. Прогін показав нуль рядків і нуль виборів після одного кліку.

Уточнення до знахідки (не міняє вердикту): `edition` правильніше «2024», а не «both». `select … from feat where is_repeatable` у `spells_test` дає рівно 4 рядки, усі `RULES_2024` (Ability Score Improvement 2987, Elemental Adept 3015, Magic Initiate 3029, Skilled 3048); у 2014 повторюваних рис немає, каталог блокує друге додавання (`isAcquired && !isRepeatable`), а гейт `findFeatPackageProblem` відхиляє повтор на створенні/підвищенні — тож двох рядків у 2014 не виникає (журнал KR27.4: дублів у робочій базі 0). Дефект коду редакційно-нейтральний, але проявляється лише на 2024. Друге уточнення: репро автора можна спростити — другий рядок створює і сам левелап (ASI-риса `Skilled`/`Magic Initiate` удруге), не тільки каталог на листі, тож втрата не потребує «двічі натиснути Додати в модалці». Третє: на проді DDL ще не накладений (KR27.4: «Робоча база — ще ні: SQL у власника»), тож живих даних сьогодні це не чіпає — це блокер релізу 2024, а не активна втрата даних.


### L02-backgrounds-06 — Розподіл ASI походження ніде не зберігається — бонус запечений у характеристики й невідновний

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md «Increase one by 2 and another one by 1, or increase all three by 1»

**Має бути:** Персонаж памʼятає, що +2 пішло в Мудрість, а +1 в Інтелект від походження — щоб показати це на листі, перерахувати при зміні походження й відрізнити від расових/рисових бонусів.

**Є:** Відомий лише підсумковий рахунок. Лист не може розписати джерела, редагування походження не має що відняти.

**Доказ:** prisma/schema.prisma, модель Pers: немає жодної колонки під backgroundAsiChoice (є лише str/dex/con/int/wis/cha і json-бонуси листа). src/rules/character-creation.ts:91-95 застосовує strategy.applyBackgroundASI до базових значень і далі зберігає лише підсумок.

**Відтворення:** Створити Служителя з {mode:'+2/+1', plusTwo:'WIS', plusOne:'INT'} — у базі лишаються тільки wis=12, int=13; жодного сліду вибору.

**Куди дивитись:** Колонка `background_asi` jsonb на pers (через db/changes/ + db:pull), запис у character-creation.ts, читання на листі й у майбутньому редагуванні Origin.

**Файли:** `prisma/schema.prisma`, `src/server/db/character-creation.ts`, `src/rules/character-creation.ts`


## Готовність до релізу (13)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P0 | both | bug | `L18-release-readiness-01` | 18 із 20 генерованих каталогів (spells, classes, races, creator-content-2014/2024 …) немає в git — чистий клон CI не збереться ані на tsc, ані на сторожі Dockerfile | src/lib/generated/, Dockerfile |
| · | P1 | 2024 | data | `L18-release-readiness-08` | Дев'ять дій над робочою базою лишилися «за власником»; усі DDL уже в проді, чекають саме дані — і KR27.8 вимагає їх ДО деплою, інакше підвищення чародія падає | docs/o25-spell-links/kr25.4-content-2024.md, docs/o27-multiclass-2024/kr27.8-non-stacking-features.md |
| · | P1 | both | in-flight | `P3-multiclass-wizard-cleric-08` | Маршрут /char/<id>/levelup на аудиторському сервері :3100 віддавав 500 через відсутній модуль src/rules/ability-score-ceiling.ts | src/rules/ability-score-ceiling.ts, src/rules/levelup.ts |
| · | P2 | 2024 | missing-system | `L13-wildshape-06` | Дика форма 2024 не покрита жодним тестом, що торкається бази — саме тому відсутній лічильник використань і не помітили | tests/db/wildshape-forms.test.ts, tests/fixtures/2024-acceptance/ |
| ↓ | P2 | both | bug | `L18-release-readiness-02` | `bun run test:rules:coverage` — перший крок першої джоби CI — червоний: 45,2 % покриття проти планки 80 % | vitest.rules.config.mts, .github/workflows/deploy.yml |
| ↓ | P2 | both | bug | `L18-release-readiness-03` | `bun run check:ui-decomposition` — теж перший крок першої джоби CI — червоний: 11 порушень, з них 3 нові файли без легасі-межі | scripts/check-ui-decomposition.ts, src/app/char/home/CharHomeClient.tsx |
| · | P2 | 2024 | bug | `L18-release-readiness-06` | Смоук після деплою не перевіряє жодного маршруту 2024 — зламана половина релізу задеплоїться «зелено» і відкат буде знято | scripts/smoke.sh, .github/workflows/deploy.yml |
| · | P3 | both | missing-system | `L15-print-14` | Конвеєр друку не покритий жодним тестом, а всі сеттери полів мовчазні — перейменування поля в шаблоні не дає ані помилки, ані логу | tests/pdf/, src/server/pdf/generateCharacterPdf.ts |
| · | P3 | both | bug | `L17-known-registries-10` | Запис «Гідратація навбара» застарілий: причини більше немає (гейт 2024 знято), але в EditionSwitcher лишився мертвий useSession() | src/components/ui/EditionSwitcher.tsx, docs/KNOWN-BUGS.md |
| ↓ | P3 | 2024 | in-flight | `L18-release-readiness-04` | `bun run test:no-db` червоний одним тестом — `tests/components/spell-add-to-pers-2024.test.tsx` (зона KR30.3 паралельної сесії); чотирьох червоних KR27.7 уже немає | tests/components/spell-add-to-pers-2024.test.tsx, src/lib/spell-link.ts |
| ↓ | P3 | 2024 | bug | `L18-release-readiness-05` | Половина 2024 не потрапляє в sitemap і не має жодного посилання, яке пройде краулер: вісім каталогів 2024 невидимі для пошуку | src/app/sitemap.ts, src/components/ui/EditionSwitcher.tsx |
| · | P3 | both | bug | `L18-release-readiness-07` | Мертвий composite action `db-tunnel` і три коментарі в `deploy.yml`, які описують знятий 2026-08-28 механізм збірки з живою базою | .github/actions/db-tunnel/action.yml, .github/workflows/deploy.yml |
| · | P3 | both | bug | `L18-release-readiness-09` | Публічна адреса /char після видалення `src/app/char/page.tsx` тримається лише на рядку `matcher` у middleware, і жоден тест цього не ловить | src/middleware.ts, src/rules/route-helpers.ts |

### L18-release-readiness-01 — 18 із 20 генерованих каталогів (spells, classes, races, creator-content-2014/2024 …) немає в git — чистий клон CI не збереться ані на tsc, ані на сторожі Dockerfile

**Рівень:** P0 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

**Має бути:** actions/checkout@v4 у джобах `checks` і `image` дає повний вміст, потрібний для збірки; `bunx tsc --noEmit` і `bunx next build` проходять на чистому клоні.

**Є:** У HEAD немає 18 із 20 каталогів. Джоба `checks` впаде на `bunx tsc --noEmit` із TS2307 на 18 імпортах; джоба `image` — на першому ж рядку сторожа Dockerfile («ВІДМОВА: немає src/lib/generated/spells.json»).

**Доказ:** `git ls-tree -r HEAD --name-only src/lib/generated/` повертає рівно три шляхи: `.gitkeep`, `creatures.json`, `creatures2024.json`. На диску файлів 20; `git status --porcelain src/lib/generated/` показує 18 рядків `??` (armor, backgrounds, bastions, classes, creator-content-2014, creator-content-2024, feats, infusions, invocations, magicItems, objects, races, rules-2014, rules-2024, rules-beyond-srd, spells, traps-hazards, weapons). Це не .gitignore — він явно каже протилежне («Похідні з бази каталоги більше НЕ ігноруються… Рішення власника 2026-08-28»); файли просто ніколи не додавали. Кожен імпортується кодом: src/lib/content/creator-content.ts:12-13, src/lib/spellsData.ts:7, src/lib/classesData.ts:10, src/lib/racesData.ts:10, src/lib/backgroundsData.ts:8, src/lib/featsData.ts:8 і решта 19 файлів `src/lib/*Data.ts`. Dockerfile має власного сторожа: `RUN for f in spells magicItems feats backgrounds armor weapons infusions invocations classes races rules-2024 bastions creatures creatures2024 creator-content-2014 creator-content-2024; do test -s "src/lib/generated/$f.json" || { echo "ВІДМОВА: немає src/lib/generated/$f.json — він має лежати в git"; exit 1; }; done` — 14 із 16 імен у HEAD відсутні. Це вже записано в docs/STATE.md: «CI зараз зеленіє на коді, якого в репозиторії немає… До релізу це терпимо, на релізі — ні». Загальний масштаб дерева: 544 untracked + 508 змінених + 5 видалених.

**Відтворення:** 1) `cd /Users/luka/Documents/code/spells.holota.family`; 2) `git ls-tree -r HEAD --name-only src/lib/generated/` — три шляхи; 3) `git status --porcelain src/lib/generated/ | grep -c '^??'` — 18; 4) `grep -n 'generated' src/lib/content/creator-content.ts` — два імпорти, яких у HEAD немає.

**Куди дивитись:** `git add src/lib/generated/*.json` разом із рештою KR1.6 (docs/o1-safety-net/kr1.6-untracked-work.md). Поруч у тому ж комі́ті мають піти `prisma/schema.prisma` і `db/schema.sql` — обидва ` M` і описують робочу базу після KR18.5/KR27.4/KR27.8, тобто без них схема в HEAD не відповідає проду.

**Файли:** `src/lib/generated/`, `Dockerfile`, `.github/workflows/deploy.yml`, `src/lib/content/creator-content.ts`, `docs/STATE.md`, `docs/o1-safety-net/kr1.6-untracked-work.md`, `.gitignore`

**Скептик:** ПІДТВЕРДЖЕНО власним доказом, сильнішим за авторський.

(1) Факт. `git ls-tree -r HEAD src/lib/generated/` — рівно `.gitkeep`, `creatures.json`, `creatures2024.json`; на диску 20 файлів, `git status --porcelain` дає 18 рядків `??`. Не .gitignore: `git check-ignore` мовчить, а коментар у .gitignore прямо каже, що каталоги в git лежать.

(2) Незалежна перевірка (не читання коду, а прогін). Зробив локальний клон HEAD у scratchpad — це рівно те, що бачить `actions/checkout@v4`:
- сторож Dockerfile прогнаний як є: **14 із 16 імен відсутні**, перший же (`spells`) дає exit 1 — джоба `image` падає;
- `tsc --noEmit` у клоні: **EXIT=2**, серед помилок **10 × TS2307 саме на генерованих каталогах** — `src/lib/{armorData,backgroundsData,featsData,infusionsData,invocationsData,magicItemsData,rules2024Data,spellsData,weaponsData}.ts` + `scripts/aidedd/scan-batch.ts`. Крок `Types` у джобі `checks` червоний.

(3) Рішення власника — не «прийнято», а **навпаки**. Р23 («Каталоги лежать у git. Збірка не ходить у базу», рішення власника 2026-08-28): «усі 14 лежать у git», `generate:content` прибраний з обох джоб CI, тунель і `--mount=type=secret,id=database_url` зняті. Тобто git — єдиний шлях доставки каталогів у збірку, і зараз він порожній. Р13 (не комітити похідні) саме цим рішенням і перекрито.

(4) Вікно терпимості вичерпується релізом. `docs/STATE.md`, «Незакомічене — свідомо прийнято до релізу»: рішення власника 2026-08-21 «до повного релізу за це не переживаємо», але там же — «CI зараз зеленіє на коді, якого в репозиторії немає… До релізу це терпимо, **на релізі — ні**». Оскільки це передрелізний аудит, знахідка чинна, а не accepted.

(5) Уже відкрито: **KR1.6** (`docs/o1-safety-net/kr1.6-untracked-work.md`, статус «⏳ відкладено до релізу», «його треба закрити перед релізом»). Пункт 4 його scope — рівно та перевірка, яку я щойно зробив уперше фактично («Зараз це припущення з читання deploy.yml, а не факт»). Не in-flight: файлів немає в списку паралельної сесії.

(6) Серйозність. P0 лишаю: реліз не виїжджає взагалі — падають і `checks` (tsc), і `image` (сторож). Не P1, бо це не рахунок персонажа; шкала P0 «падіння» тут читається як падіння конвеєра деплою.

Неточності автора (не міняють вердикту, але доказ у нього частково не з HEAD, а з робочого дерева): `src/lib/content/creator-content.ts` у HEAD **не існує** взагалі, як і `classesData.ts`/`racesData.ts` — тож «TS2307 на 18 імпортах» завищено, у HEAD їх 10. І навпаки, автор пропустив найсильніший аргумент — Р23. Ще один наслідок, який з його формулювання не видно: `git add src/lib/generated/*.json` сам по собі HEAD не лікує — 18 JSON приїдуть без своїх споживачів, які теж untracked, тож коміт має бути обсягом усього KR1.6.


### L18-release-readiness-08 — Дев'ять дій над робочою базою лишилися «за власником»; усі DDL уже в проді, чекають саме дані — і KR27.8 вимагає їх ДО деплою, інакше підвищення чародія падає

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** docs/o27-multiclass-2024/kr27.8-non-stacking-features.md:158-166 — «Порядок кроків власника зворотний до звичного: SQL і сід — ДО деплою. Значення DRACONIC_RESILIENCE потрапляє в WHERE name IN (…) лише тоді, коли персонаж справді має Драконячу живучість, — але тоді Postgres без цього значення в переліку відповість invalid input value for enum, і підвищення до 3-го рівня чародія з Драконячою магією впаде.»

**Має бути:** Перед перемиканням трафіку робоча база несе весь контент 2024, на який спирається код, а генеровані каталоги перезібрані з неї й закомічені.

**Є:** Дев'ять дій над робочою базою залишені «за власником» і розкидані по журналах восьми різних KR; консолідованого рунбука релізу в docs/ немає. Стан цих даних у проді недоведений — читати робочу базу правилами аудиту заборонено, тому це чекліст, а не вимір.

**Доказ:** Схемної роботи не лишилось — усі DDL видно в артефактах робочої бази (prisma/schema.prisma і db/schema.sql генеруються з неї через bun run db:pull): KR18.5 — db/schema.sql:3191 `CREATE TABLE public.race_choice_option_spell`, prisma/schema.prisma:1008 `level Int @default(1)` у RaceTrait; KR18.6 — db/schema.sql:1569 `weapon_mastery_progression`; KR27.4 — db/schema.sql:5097 `pers_feat_pers_id_feat_id_idx` і prisma/schema.prisma:719 `@@index([persId, featId])` без старого @@unique; KR27.8 — prisma/schema.prisma:1320 `DRACONIC_RESILIENCE`; KR19.2 — pers_bastion* у дампі (55 згадок). Лишаються дані, кожне з джерелом: seed:2024:prod, seed:magic-items-2024:prod, seed:invocations-2024:prod, seed:species-choices-2024:prod (docs/o25-spell-links/kr25.4-content-2024.md:221-224); seed:species-levels-2024:prod (db/changes/2026-08-29-kr18.5-character-level-traits.sql:127); seed:armor-2024:prod (docs/o27-multiclass-2024/kr27.8-non-stacking-features.md:166); seed:class-feature-text:prod --apply (docs/o24-wildshape-second-layer/kr24.2-eligibility.md:71-72); seed:apostrophe:prod (docs/README.md:42 — «лишається лише прод-крок seed:apostrophe:prod»); db/changes/2026-09-04-kr27.5-magic-initiate-free-cast.sql — kr27.8:168 прямо каже «теж не підтверджено застосованим до робочої бази»; далі bun run generate:content і КОМІТ каталогів (kr25.4:226-229), бо сторінка читає файл, а не базу (Р13). Що я довів запитом: spells_test має ВСЕ, що піддається перевірці (work/L18-release-readiness/drift.mjs) — enum DRACONIC_RESILIENCE є, armor_id 376 DRACONIC_RESILIENCE/RULES_2024/base_ac 10 стоїть, індекси pers_feat = {pers_feat_pers_id_feat_id_idx, pers_feat_pkey} (старого унікального немає), три Magic Initiate list (2024) = LONG_REST/1, FIGHTER_2024 [4,6,8,12,14,16] і ROGUE_2024 [4,8,10,12,16] проти [4,8,12,16] у решти, ELDRITCH_KNIGHT і ARCANE_TRICKSTER = THIRD/INT.

**Відтворення:** 1) `grep -rn 'seed:.*:prod' docs/o25-spell-links/kr25.4-content-2024.md docs/o27-multiclass-2024/kr27.8-non-stacking-features.md docs/o24-wildshape-second-layer/kr24.2-eligibility.md`; 2) `sed -n '125,132p' db/changes/2026-08-29-kr18.5-character-level-traits.sql`; 3) `node scratchpad/audit/work/L18-release-readiness/drift.mjs` — усе перелічене є в spells_test.

**Куди дивитись:** Звести дев'ять кроків в один рунбук (напр. docs/RELEASE-RUNBOOK.md) у порядку Р33: файл → сід → generate:content → коміт каталогів → деплой. KR27.8 і KR27.5 виконати перед деплоєм, а не після.

**Файли:** `docs/o25-spell-links/kr25.4-content-2024.md`, `docs/o27-multiclass-2024/kr27.8-non-stacking-features.md`, `docs/o24-wildshape-second-layer/kr24.2-eligibility.md`, `db/changes/2026-08-29-kr18.5-character-level-traits.sql`, `db/changes/2026-09-04-kr27.5-magic-initiate-free-cast.sql`, `package.json`


### P3-multiclass-wizard-cleric-08 — Маршрут /char/<id>/levelup на аудиторському сервері :3100 віддавав 500 через відсутній модуль src/rules/ability-score-ceiling.ts

**Рівень:** P1 · **Редакція:** both · **Тип:** in-flight · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Маршрут підвищення рівня відкривається.

**Є:** 500 на /char/<id>/levelup для будь-якого персонажа, поки копію не оновлено.

**Доказ:** pageerror у Playwright: «Error: ./src/rules/levelup.ts:2:1 Module not found: Can't resolve './ability-score-ceiling'» і «./src/lib/components/levelUp/LevelUpWizard.tsx:68:1 Module not found: Can't resolve '@/rules/ability-score-ceiling'». У репозиторії файл існує (`ls -la src/rules/ability-score-ceiling.ts` → створений 23:16, статус git `??`), а копія дерева під :3100 (`scratchpad/app`, зроблена о 21:20 жорсткими лінками — процес `node .../scratchpad/app/node_modules/.bin/next dev --turbopack -p 3100`) нового файлу не має, тоді як змінений через лінк `levelup.ts` видно одразу.

**Відтворення:** Відкрити http://127.0.0.1:3100/char/<будь-який id>/levelup до синхронізації копії.

**Куди дивитись:** Артефакт середовища, не дефект продукту: я скопіював відсутній модуль у `scratchpad/app/src/rules/ability-score-ceiling.ts` — маршрут запрацював; у репозиторії нічого не змінював. Копію дерева під :3100 варто пересинхронізувати після завершення KR паралельної сесії.

**Файли:** `src/rules/ability-score-ceiling.ts`, `src/rules/levelup.ts`, `src/lib/components/levelUp/LevelUpWizard.tsx`


### L13-wildshape-06 — Дика форма 2024 не покрита жодним тестом, що торкається бази — саме тому відсутній лічильник використань і не помітили

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Має бути:** Шлях «друїд 2024 → серверна дія → пул використань → відпочинок» має хоч один інтеграційний тест.

**Є:** Такого тесту немає; уся 2024-ва гілка Дикої форми в базі неперевірена.

**Доказ:** tests/fixtures/2024-acceptance/ — десять персонажів, друїда серед них немає (fighter, cleric, wizard, rogue, barbarian, bard, paladin, ranger, warlock, monk). tests/db/wildshape-forms.test.ts створює персонажів лише з `ruleset: "RULES_2014"`; RULES_2024 зустрічається там тричі (рядки 147, 157, 159) і лише як редакція каталогу істот, не персонажа. 2024 перевірено виключно чистими тестами tests/rules/wildshape.test.ts і tests/logic/beast-form.test.ts, які до бази не ходять і фічі в ній не бачать.

**Відтворення:** grep RULES_2024 tests/db/wildshape-forms.test.ts → лише каталог істот; ls tests/fixtures/2024-acceptance/ → друїда немає.

**Куди дивитись:** Додати друїда 2024 (Коло місяця, рівень ≥ 3) до приймальної десятки або окремий файл tests/db/wildshape-2024.test.ts: прикріпити форму, увійти, звірити тимчасові ХП, залишок використань і поведінку короткого/довгого відпочинку.

**Файли:** `tests/db/wildshape-forms.test.ts`, `tests/fixtures/2024-acceptance/`


### L18-release-readiness-02 — `bun run test:rules:coverage` — перший крок першої джоби CI — червоний: 45,2 % покриття проти планки 80 %

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** L · **Вердикт скептика:** downgraded

**Має бути:** Джоба `rules-coverage` у .github/workflows/deploy.yml зелена, і конвеєр іде далі на `checks` → `image` → `deploy`.

**Є:** Крок `Rules coverage` виходить із кодом 1. Джоби `checks`, `image` і `deploy` не запускаються взагалі (`needs: rules-coverage`), тобто деплою не буде незалежно від решти.

**Доказ:** Прогін (work/L18-release-readiness/rulescov.txt): «Statements : 44.97% ( 488/1085 ) / Branches : 50.48% ( 417/826 ) / Functions : 40% ( 140/350 ) / Lines : 45.2% ( 405/896 )», далі чотири рядки «ERROR: Coverage for … does not meet global threshold (80%)» і «error: script "test:rules:coverage" exited with code 1». Самі тести зелені: «Test Files 10 passed (10) / Tests 92 passed (92)» — червона саме планка. `vitest.rules.config.mts` рахує `include: ["src/rules/**/*.ts"]`, а ганяє `include: ["tests/rules/coverage/**/*.test.ts"]` — 10 файлів; у `src/rules/` тим часом 38. Нуль покриття: wildshape.ts (21-465), bastions.ts (14-226), spell-sources.ts (76-210), spell-preparation-2024.ts (17-113), multiclass-entry.ts, multiclass-proficiencies.ts, repeatable-feats.ts, species-grants.ts, languages.ts, resource-pools.ts, starting-money.ts, character-level.ts, creature-speed.ts, wildshape-uses.ts, background-equipment.ts, warlock-invocations.ts, armor-class-formulas.ts, attacks-per-action.ts. Окремо: чотири ТЕСТОВІ файли лежать усередині src/rules/ (armor-class-formulas.test.ts, attacks-per-action.test.ts, multiclass-entry.test.ts, warlock-invocations.test.ts) — `include: ["src/rules/**/*.ts"]` рахує їх як продуктовий код із 0 %, а прогін їх не запускає, тому й модулі, які вони справді покривають, у звіті нулі.

**Відтворення:** `cd /Users/luka/Documents/code/spells.holota.family && bun run test:rules:coverage; echo $?` → 1. Список файлів: `ls src/rules/*.ts | wc -l` → 38, `ls tests/rules/coverage/*.test.ts | wc -l` → 10, `ls src/rules/*.test.ts | wc -l` → 4.

**Куди дивитись:** Дешева частина: `coverage.exclude: ["**/*.test.ts"]` у vitest.rules.config.mts і додати `src/rules/**/*.test.ts` у `test.include` того ж конфіга — це знімає штучні нулі на чотирьох модулях зі співрозташованими тестами. Решта — або тести на 22 непокриті модулі, або зафіксувати планку на виміряному рівні з датою й окремим KR (рішення власника, бо це планка гейта).

**Файли:** `vitest.rules.config.mts`, `.github/workflows/deploy.yml`, `src/rules/`, `tests/rules/coverage/`

**Скептик:** Механізм підтвердив, формулювання й серйозність — ні.

1) ЩО ПІДТВЕРДИЛОСЯ. Незалежний прогін `bun run test:rules:coverage` у робочому дереві: EXIT=1, «Statements 42.43% (499/1176) / Branches 48.61% / Functions 38.03% / Lines 42.34%», чотири ERROR про поріг 80 % (`work/V-L18-02/rulescov.txt`). Тести зелені (10 файлів / 92). Цифри автора (45,2 %) уже застаріли — дерево зросло: у `src/rules/` тепер 42 `*.ts`, з них 6 (не 4) співрозташованих `*.test.ts`, які `coverage.include: ["src/rules/**/*.ts"]` рахує як продуктовий код із 0 %.

2) ЩО СПРОСТОВАНО — «CI зараз червона, деплою не буде». CI бере `actions/checkout@v4`, тобто HEAD, а не робоче дерево. У HEAD `src/rules/` має 15 файлів і `tests/rules/coverage/` — 6. Я розпакував HEAD (`git archive HEAD`) у `work/V-L18-02/head-snap` і прогнав там той самий гейт: **EXIT=0, Statements 95.41 %, Lines 97.73 %, 6 файлів / 37 тестів** — рівно ті числа, що записав KR7.3. Тобто гейт на HEAD зелений. Додатково: origin/main на 8 комітів позаду HEAD, останній прогін CI — 2026-08-16 (`gh run list`), джоба `rules-coverage` жодного разу не ганялася в GitHub. Червоною вона стане тільки в момент, коли KR1.6 закомітить 31 незакомічений модуль `src/rules/` — тобто це наслідок знахідки -01, а не окремий «поточний» блокер.

3) ЩО СПРОСТОВАНО ПО СУТІ ДІАГНОЗУ — «22 непокриті модулі, це L, кілька днів тестів» і питання власнику «опустити планку?». Тести на ці модулі **вже написані**, просто лежать поза `tests/rules/coverage/`: `grep` по `tests/` дає імпорти `rules/bastions` ×8, `rules/wildshape` ×6, `rules/spell-sources`, `rules/species-grants`, `rules/languages`, `rules/resource-pools`, `rules/character-level`, `rules/creature-speed`, `rules/background-equipment`, `rules/starting-money`, `rules/hit-points`, `rules/hit-dice`, `rules/feat-sources`, `rules/weapon-mastery`. Я зміряв прямо: конфіг-зонд `work/V-L18-02/vitest.probe2.mts` (`include: tests/rules/**, src/rules/**/*.test.ts, tests/logic/**`, мінус два відомі DB-файли; `coverage.exclude: ["**/*.test.ts"]`) із **завідомо мертвим DATABASE_URL** дав **64 файли / 548 тестів зелених, Statements 94.77 %, Branches 90.43 %, Functions 93.51 %, Lines 96.53 %** — усі чотири метрики вище 80 %, і бази набір не торкається (тобто придатний для CI за Р32). Проміжний зонд (`probe.txt`, лише співрозташовані тести + виключення `*.test.ts` з покриття) дає 58.66 % — тобто «дешева» частина, названа автором, справді існує, але сама по собі гейт не рятує; рятує розширення `include` прогону.

Отже це не «планка зависока» і не борг у кілька днів, а дрейф однієї строчки: `include: ["tests/rules/coverage/**/*.test.ts"]` не ріс, поки тести правил писали в `tests/rules/`, `tests/logic/` і поруч із модулем. Виправлення — S (конфіг + виключити `tests/rules/class-progression.test.ts` і `tests/logic/multiclass-resolver.test.ts`, які ходять у базу за списком `DB_INTEGRATION_TEST_FILES` у `vitest.config.mts`). Рішення власника про планку не потрібне — питання №1 у звіті автора поставлене на хибних вхідних.

4) РІШЕННЯ ВЛАСНИКА / IN-FLIGHT / ВІДКРИТИЙ KR. Прийнятою поведінкою це не є: KR3.5 (`docs/o3-rules-engine/kr3.5-coverage.md`) прямо ставить «у звіті немає файлів `src/rules/` з покриттям 0%» і «coverage-пороги в CI: `rules-coverage` job блокує `checks` і деплой». У DECISIONS.md і KNOWN-BUGS.md гейта немає, відкритого KR на нього теж (єдині згадки — закриті KR3.5/3.6 і журнали O5–O7). `vitest.rules.config.mts` не входить у список файлів паралельної сесії, тож не in-flight. Дотично це накрито STATE.md («CI зараз зеленіє на коді, якого в репозиторії немає… до релізу терпимо, на релізі — ні»), але сам KR1.6 наслідку для coverage-гейта не називає — це справді нова інформація.

5) СЕРЙОЗНІСТЬ. За шкалою CONTEXT P0 — падіння, втрата даних, неможливо створити/підвищити персонажа; P1 — персонаж рахується не за книгою або губиться вибір. Тут ані того, ані іншого: користувача це не торкається, дані цілі, гейт на HEAD зелений, а після коміту лагодиться конфігом за хвилини. Знижую до P2: реальна перешкода в конвеєрі релізу, але дешева й вторинна до -01.


### L18-release-readiness-03 — `bun run check:ui-decomposition` — теж перший крок першої джоби CI — червоний: 11 порушень, з них 3 нові файли без легасі-межі

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт скептика:** downgraded

**Має бути:** Крок `UI decomposition guard` у джобі `rules-coverage` зелений.

**Є:** Виходить із кодом 1 на 11 порушеннях. Разом із L18-release-readiness-02 це означає, що перша ж джоба конвеєра червона двома кроками з двох.

**Доказ:** work/L18-release-readiness/uidecomp.txt, блок `violations` (11 записів), потім «error: script "check:ui-decomposition" exited with code 1». Поіменно (actual / legacyLimit): src/app/char/home/CharHomeClient.tsx 2598/2263; src/lib/components/characterSheet/slides/MagicSlide.tsx 1338/1296; src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx 1223/1211; src/lib/components/characterCreator/MultiStepForm.tsx 1095/1093; src/lib/components/characterSheet/ModifyStatModal.tsx 758/699; src/app/char/[id]/bastion/BastionPageClient.tsx 752/null; src/lib/components/characterCreator/SkillsForm.tsx 713/690; src/components/rules/RulesCategoryClient.tsx 584/null; src/lib/components/characterSheet/AddSpellDialog.tsx 525/487; src/lib/components/characterSheet/SpellInfoModal.tsx 484/469; src/components/bestiary/BestiaryClient.tsx 456/null. Ліміт розміру — 400 рядків. Три файли (BastionPageClient, RulesCategoryClient, BestiaryClient) легасі-межі не мають узагалі, тобто це нові файли понад ліміт; решта вісім виросли понад власну зафіксовану межу.

**Відтворення:** `cd /Users/luka/Documents/code/spells.holota.family && bun run check:ui-decomposition; echo $?` → 1.

**Куди дивитись:** Три файли без легасі-межі (BastionPageClient 752, RulesCategoryClient 584, BestiaryClient 456) розбити або вписати їхній розмір як легасі-межу в scripts/check-ui-decomposition.ts. Вісім легасі-файлів, що виросли, — або повернути під власну межу, або підняти межі з датою. MagicSlide/SpellInfoModal/AddSpellDialog у зоні KR30.3 — чекати паралельну сесію.

**Файли:** `scripts/check-ui-decomposition.ts`, `src/app/char/home/CharHomeClient.tsx`, `src/app/char/[id]/bastion/BastionPageClient.tsx`, `src/components/rules/RulesCategoryClient.tsx`, `src/components/bestiary/BestiaryClient.tsx`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx`, `src/lib/components/characterCreator/SkillsForm.tsx`, `src/lib/components/characterSheet/ModifyStatModal.tsx`

**Скептик:** Ядро знахідки підтверджую власним прогоном: `bun run check:ui-decomposition` у робочому дереві дає exit 1. Але вже не 11 порушень, а **12** — за ніч додався `src/lib/components/levelUp/LevelUpASIForm.tsx` (406, легасі-межі немає), а `FeatChoiceOptionsForm` виріс 1223 → 1238. Гейт справді стоїть першим кроком першої джоби, і ланцюг джоб послідовний (`rules-coverage` → `checks` → `image` → `deploy`, `.github/workflows/deploy.yml:24,44,84,153`), тож червоний крок блокує весь конвеєр.

Спростовую дві речі в доказі автора.

1. **«Перша ж джоба конвеєра червона» — неправда для CI сьогодні.** `actions/checkout@v4` дає рівно HEAD, а не робоче дерево. Я вигрузив HEAD (`git archive HEAD | tar -x` у скретчпад, симлінк на `node_modules`, той самий незмінений `config/ui-decomposition-guard.json`) і прогнав гейт: **filesScanned 241, violations 0, EXIT=0**. Тобто крок `UI decomposition guard` у CI зараз зелений; червоніє він тільки після коміту KR1.6 — тобто це наслідок того самого блокера L18-release-readiness-01, а не незалежний третій блокер, як каже підсумок звіту.

2. **«Три нові файли без легасі-межі» — неточно.** У HEAD є і `BestiaryClient.tsx` (344 рядки), і `RulesCategoryClient.tsx` (256): вони відстежувані (` M`), просто на момент базлайну були під лімітом 400. Справді новий (untracked) лише `BastionPageClient.tsx`. Решта — приріст поверх зафіксованої межі: CharHomeClient 2255→2598, MagicSlide 1296→1338, MultiStepForm 1055→1095, SkillsForm 690→713, AddSpellDialog 487→525, ModifyStatModal 699→758, SpellInfoModal 461→484, FeatChoiceOptionsForm 1211→1238, LevelUpASIForm 388→406.

Прийнятої поведінки тут немає. `docs/o4-ui-decomposition/kr4.1-ui-baseline.md:17` прямо фіксує механіку: «19 historical paths … мають exact current ceiling, тож збільшення або новий файл падає». KR18.4:162 і KR18.5:157 показують, що сесії свідомо тримали `MagicSlide` на 1296 і `LevelUpWizard` на 2126 саме через ratchet — отже пізніші цілі (O19/O25/O27/O30) правило порушили, а не скасували. У `docs/DECISIONS.md`, «Прийнято» в `KNOWN-BUGS.md` і в `docs/STATE.md` про гейт немає жодного слова; `docs/o1-safety-net/kr1.6-untracked-work.md` (відкритий, «⏳ відкладено до релізу») перелічує в п.4 перевірку чистого клону лише через `tsc`/`test` і про ratchet мовчить — тобто знахідка **не** покрита наявним KR і варта того, щоб її туди дописали.

In-flight — лише 2 з 12, не 3: список паралельної сесії в CONTEXT містить `AddSpellDialog.tsx` і `SpellInfoModal.tsx`; `MagicSlide.tsx` там немає (автор написав «два», а перелічив три). Ще два файли (`FeatChoiceOptionsForm`, `LevelUpASIForm`, mtime 2026-09-05 00:07) хтось правив уночі, але вони поза оголошеною зоною.

Серйозність знижую P0 → P2. Шкала CONTEXT продуктова: P0 — падіння, втрата даних, неможливо створити/підвищити персонажа; жодного впливу на користувача тут немає, персонаж рахується так само. Сьогоднішній CI зелений, а лікується це або редагуванням одного файла (`config/ui-decomposition-guard.json` — переписати межі з датою й окремим KR), або декомпозицією (L). Це реальний, детермінований стопер релізного коміту й регресія проти чинного правила O4 — але похідна від L18-01, а не самостійний P0.


### L18-release-readiness-06 — Смоук після деплою не перевіряє жодного маршруту 2024 — зламана половина релізу задеплоїться «зелено» і відкат буде знято

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Смоук перевіряє те, що виходить у реліз, — хоча б /2024, /2024/char і /2024/spells.

**Є:** Жодного маршруту 2024 у списку. Контейнер, у якому вся редакція 2024 віддає 500, пройде смоук, перемкне трафік і зніме старий контейнер.

**Доказ:** scripts/smoke.sh: `ROUTES=(/ /api/health /spells /magic-items)`. Це редакція 2014 плюс здоровʼя бази. У .github/workflows/deploy.yml крок `Smoke check` (`id: smoke`) — єдина умова для `Rollback on failed smoke` (`if: failure() && steps.smoke.outcome == 'failure'`) і для `Retire previous container`, який гасить старий контейнер, тобто прибирає можливість миттєвого відкату.

**Відтворення:** `sed -n '/^ROUTES=/p' /Users/luka/Documents/code/spells.holota.family/scripts/smoke.sh` → `ROUTES=(/ /api/health /spells /magic-items)`.

**Куди дивитись:** `ROUTES=(/ /api/health /spells /magic-items /2024 /2024/char /2024/spells)` — три додаткові запити, решта скрипта не міняється.

**Файли:** `scripts/smoke.sh`, `.github/workflows/deploy.yml`


### L15-print-14 — Конвеєр друку не покритий жодним тестом, а всі сеттери полів мовчазні — перейменування поля в шаблоні не дає ані помилки, ані логу

**Рівень:** P3 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Має бути:** Інтеграційний тест, що будує персонажа, генерує PDF і звіряє набір заповнених полів із очікуваним

**Є:** Жодного тесту; регресія в друці видима лише руками

**Доказ:** Тека tests/pdf/ порожня. Дотичні тести (tests/logic/equipment-print.test.ts, group-character-features-print.test.ts, print-projection.test.ts, creatures-print.test.ts, tests/routes/bestiary-print.test.ts) не викликають ні generateCharacterPdf, ні generateCharacterPdfFromData і не перевіряють заповнення полів шаблона. Усі сеттери в generateCharacterPdf.ts гасять винятки: setTextIfPresent (618–624), setCheckIfPresent (637–645), trySetFontSize (98–106), tryGetTextField (552–558) — `try { … } catch { return; }`. Саме так знахідка L15-print-04 (Backstory/Notes) прожила непоміченою.

**Відтворення:** `ls tests/pdf` → порожньо; `grep -rn "generateCharacterPdf" tests/` → нічого

**Куди дивитись:** Тест у vitest.integration.config.mts: build2024MulticlassCharacter → generateCharacterPdfFromData({flattenCharacterSheet:false}) → PDFDocument.load → знімок пар «поле: значення». Він же одразу зафіксує L15-print-01…07

**Файли:** `tests/pdf/`, `src/server/pdf/generateCharacterPdf.ts`, `vitest.integration.config.mts`


### L17-known-registries-10 — Запис «Гідратація навбара» застарілий: причини більше немає (гейт 2024 знято), але в EditionSwitcher лишився мертвий useSession()

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Реєстр відображає поточний стан; компонент не тримає непотрібної підписки на контекст сесії.

**Є:** Запис у KNOWN-BUGS.md досі в «Відкриті» разом із «пасткою» про ENABLE_RULES_2024; у коді висить невикористаний виклик useSession().

**Доказ:** src/components/ui/EditionSwitcher.tsx:22-26 — `const canAccess2024 = isRules2024Allowed(); if (!canAccess2024) { return null; }`; src/rules/access.ts — `export function isRules2024Allowed(): boolean { return true; }` (гейт знято 2026-08-28, про що написано в коментарі файла). Розмітка на сервері й клієнті збігається завжди, тож розходження сесії, яке описував реєстр, зникло. При цьому рядок 16 усе ще робить `const { data: session } = useSession();`, і `session` більше ніде у файлі не зустрічається (grep -n session src/components/ui/EditionSwitcher.tsx → одне входження).

**Відтворення:** sed -n '1,30p' src/components/ui/EditionSwitcher.tsx; cat src/rules/access.ts.

**Куди дивитись:** Перенести запис у «Виправлені» з поясненням, що механізм замінено на константу; прибрати рядок useSession() і невикористаний імпорт.

**Файли:** `src/components/ui/EditionSwitcher.tsx`, `docs/KNOWN-BUGS.md`


### L18-release-readiness-04 — `bun run test:no-db` червоний одним тестом — `tests/components/spell-add-to-pers-2024.test.tsx` (зона KR30.3 паралельної сесії); чотирьох червоних KR27.7 уже немає

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** in-flight · **Праці:** S · **Вердикт скептика:** downgraded

**Має бути:** Крок `Tests` у джобі `checks` зелений (`bun run test:no-db`).

**Є:** Один тест падає за таймаутом; крок CI вийде з кодом 1. Не чіпав — файли в списку паралельної сесії.

**Доказ:** work/L18-release-readiness/testnodb.txt: «FAIL tests/components/spell-add-to-pers-2024.test.tsx > KR25.2 — заклинання 2024 додається до персонажа > кнопка є, і вона шле посилання зі слагом, а не номер каталогу — Error: Test timed out in 5000ms», у stderr «Not implemented: navigation to another Document». Підсумок: «Test Files 1 failed | 178 passed (179) / Tests 1 failed | 2146 passed (2147)», exit 1. Чотирьох червоних KR27.7, названих у контексті аудиту, більше немає — tests/rules/spell-preparation-2024.test.ts і tests/logic/spellcasting-progression-2024.test.ts зелені. Тест рендерить SpellInfoModal і кличе openSpellLink із src/lib/spell-link.ts; обидва — файли KR30.3. Часи модифікації на 22:50: src/lib/spell-link.ts 21:57:46, SpellInfoModal.tsx 21:14:14, сам тест 21:10:06 — тобто джерело правили за 52 хвилини до прогону.

**Відтворення:** `cd /Users/luka/Documents/code/spells.holota.family && bun run test:no-db` → 1 failed / 2146 passed.

**Куди дивитись:** Належить KR30.3 (паралельна сесія). Перед релізом лише переконатися, що прогін позеленів; свого нічого не міняти.

**Файли:** `tests/components/spell-add-to-pers-2024.test.tsx`, `src/lib/spell-link.ts`, `src/lib/components/characterSheet/SpellInfoModal.tsx`

**Скептик:** ФАКТ ПІДТВЕРДЖЕНО, ПРИЧИНА СПРОСТОВАНА.

(1) Правило — n/a, це не питання правил D&D, а гейт CI.

(2) Код. Файли, на які автор вказує як на причину, з моменту його прогону НЕ мінялися:
tests/components/spell-add-to-pers-2024.test.tsx 2026-09-04 21:10:06, SpellInfoModal.tsx 21:14:14,
src/lib/spell-link.ts 21:57:46 — усі старіші за прогін автора (22:44). Попри це тест у мене зелений:
ізольовано (`bunx vitest run tests/components/spell-add-to-pers-2024.test.tsx` → 1 passed) і тричі
поспіль у повному `bun run test:no-db` (3/3 зелений). Отже причина — не код KR30.3.

Знайшов справжню причину і відтворив її: тест чутливий до навантаження. Увімкнув 12 фонових
busy-loop процесів і запустив той самий файл — точнісінько та сама поломка:
«× кнопка є, і вона шле посилання зі слагом… 11509ms / Error: Test timed out in 5000ms».
Механіка: увесь бюджет тесту — дефолтні 5000 мс vitest, а всередині SpellInfoModal шлях даних —
динамічний імпорт каталогів (src/lib/spell-catalog-chunk.ts → `await import("@/lib/spellsData")`,
який тягне src/lib/generated/spells.json 1,2 МБ + data/2024/normalized/spells.json). Будь-яка
затримка чи помилка імпорту ковтається `catch` у SpellInfoModal.tsx:347 («Не вдалося завантажити
заклинання»), тож симптом завжди один — таймаут `findByText`. Це підтверджує і stderr автора:
попередження DialogContent там є, тобто модалка відкрилася, а контент не приїхав.

(3) Рішення власника: прямої постанови немає, але клас проблеми вже записаний у самому конфізі —
vitest.config.mts:6 «падають по 5000ms таймауту (флейково, не завжди)»; інтеграційний конфіг
підняв testTimeout до 15000 (vitest.integration.config.mts:49), юніт-конфіг лишив дефолт.

(4) In-flight — ні. Класифікація автора «in-flight, зона KR30.3» хибна: код тих файлів незмінний і
зелений, паралельна сесія тут ні до чого.

(5) Відкритого KR саме на це не знайшов.

(6) Серйозність. За шкалою CONTEXT P1 — це «персонаж рахується не за книгою або вибір губиться».
Тут ні того, ні того: продукт працює, флейкує тест. Понижую до P3 (крихкий гейт, що може
випадково почервонити реліз); класифікація — bug у тесті (тісний бюджет + важкий динамічний
імпорт), лагодиться одним рядком `{ timeout: 15000 }` у it(...) або testTimeout у vitest.config.mts.


### L18-release-readiness-05 — Половина 2024 не потрапляє в sitemap і не має жодного посилання, яке пройде краулер: вісім каталогів 2024 невидимі для пошуку

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Має бути:** Редакція 2024 виходить у реліз так само доступною пошуку, як 2014: кожен каталог у sitemap.xml і хоча б одне посилання <a href>, яким краулер із 2014 переходить у 2024.

**Є:** У sitemap із 2024 є лише заклинання, бастіони й довідник. Класи, види, риси, походження, магічні предмети, зброя, обладунки, виклики й бестіарій 2024 не перелічені ніде, а єдиний перехід між редакціями — JS-кнопка. Сайт живе органічним пошуком (~200 000 переглядів), тобто пів релізу виходить невидимим.

**Доказ:** Запит sitemap.xml до аудиторського сервера (work/L18-release-readiness/anon2024.mjs): 3336 URL, has2024Spells=true, а has2024Classes=false, has2024Races=false, has2024Feats=false, has2024Backgrounds=false, has2024Bestiary=false, has2024MagicItems=false, has2024Char=false. У src/app/sitemap.ts (118 рядків) із редакції 2024 є рівно три групи: заклинання (рядки 39-43), бастіони (62, 93-96) і довідник (99-112); каталоги 2014 перелічені всі поіменно, до кожної істоти й предмета. Сторінки при цьому існують і кожна виставляє власний canonical: curl по :3100 дає 200 на /2024/bestiary, /2024/feats, /2024/races, /2024/backgrounds, /2024/magic-items, /2024/weapons, /2024/armor, /2024/invocations, /2024 (canonical, напр., src/app/2024/bestiary/[slug]/page.tsx:34, src/app/2024/armor/[slug]/page.tsx:34). Посиланням краулер теж не дійде: перемикач редакції — це <button> з router.push, не <a href> (src/components/ui/EditionSwitcher.tsx:31-33: `const handleSwitch = (targetEdition) => { … router.push(buildHref(targetPath)); }`). На головній анонімного користувача жодного <a href> зі згадкою «2024» немає — `homeLinks2024: []`, заголовок «D&D 5E · РЕДАКЦІЯ 2014» (скріншот scratchpad/audit/shots/L18-01-home-anon.png).

**Відтворення:** 1) `curl -s http://127.0.0.1:3100/sitemap.xml | grep -c '/2024/classes'` → 0, те саме для races, feats, backgrounds, bestiary, magic-items; 2) `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/2024/classes` → 200; 3) на головній `document.querySelectorAll('a[href*="2024"]').length` → 0.

**Куди дивитись:** Додати відсутні вісім груп у src/app/sitemap.ts поруч із наявними (дані вже під рукою — getAllCreatures("RULES_2024"), getAllBackgrounds("RULES_2024"), getAllWeapons("RULES_2024") тощо). Перемичку редакції лишити кнопкою, але обгорнути в <a href={targetPath}> з preventDefault, щоб краулер бачив посилання.

**Файли:** `src/app/sitemap.ts`, `src/components/ui/EditionSwitcher.tsx`

**Скептик:** Ядро факту підтверджую, дві з трьох опор знахідки падають.

SITEMAP — правда. `src/app/sitemap.ts` (118 рядків) з 2024 має лише заклинання (39-43), бастіони (62, 94-97) і довідник (99-113); решта викликів жорстко звужена: `getAllWeapons("RULES_2014")`, `getAllArmors("RULES_2014")`, `getAllInvocations("RULES_2014")`, `getAllCreatures("RULES_2014")`, `getAllBackgrounds("RULES_2014")` (22-28). Гейти закріплюють це поіменно: `tests/content/backgrounds-catalog.test.ts:169` — «every **2014** background page in the sitemap», `tests/content/entity-pages-ssg.test.ts:259` — те саме лише для 2014.

«ЖОДНОГО ПОСИЛАННЯ, ЯКЕ ПРОЙДЕ КРАУЛЕР» — спростовано. Автор перевірив головну 2014 і перемикач, але не пройшов ланцюжок від адрес 2024, які в sitemap Є. Анонімний curl: `/2024/spells` віддає в серверному HTML `<a href="/2024">`, `/2024/bestiary`, `/2024/magic-items`, `/2024/rules`, `/2024/char/home` (це `Navigation.tsx`, `buildNavItems` з `root="/2024"`, рендер через `ModeLink`, рядки 63-190 — посилання, не кнопки), а `/2024` віддає всі 14 каталогів включно з classes, races, feats, backgrounds, weapons, armor, invocations. Отже всі вісім каталогів досяжні звичайним обходом за два кроки від адреси в sitemap.

«ПІВ РЕЛІЗУ НЕВИДИМЕ ПОШУКУ» — спростовано рішенням власника Р30 (`docs/DECISIONS.md`, 2026-08-30, «Сайт лишається поза пошуковим індексом, і це записано у файлах»; продубльовано в `docs/README.md`, рядок O22). `src/app/layout.tsx:57` — `robots: { index: false, follow: true }`; віддане HTML і головної 2014, і `/2024` несе `<meta name="robots" content="noindex, follow"/>`. Весь сайт — разом із повністю перерахованими каталогами 2014 — навмисно поза індексом, а `follow: true` стоїть саме щоб краулер ходив внутрішніми посиланнями. Тож наявність у sitemap зараз не дає індексації нічому.

IN-FLIGHT / ВІДКРИТИЙ KR — `sitemap.ts` не у списку файлів паралельної сесії; відкритого KR саме про sitemap 2024 немає (згадки в o13, o19, o20, o25 — усі в закритих KR).

ЩО ЛИШАЄТЬСЯ: асиметрія реальна, але важить вона не для каталогів, а для **сторінок сутностей 2024** (істоти, магічні предмети, походження, зброя, обладунки, виклики): сторінки-каталоги обох редакцій не рендерять посилань на сутності серверно взагалі (0 збігів `href="/bestiary/…"` на `/bestiary` і `/2024/bestiary`), тож 2014 тримається виключно на sitemap, а 2024 не має ні sitemap, ні посилань. За шкалою CONTEXT це P3: персонаж не рахується не за книгою, вибір не губиться, можливості білдера не бракує, а поки діє Р30 — ефекту нуль. Заголовок треба переписати з «жодного посилання і пів релізу невидиме» на «сторінки сутностей 2024 не в sitemap; спливе, коли власник поверне індексацію».


### L18-release-readiness-07 — Мертвий composite action `db-tunnel` і три коментарі в `deploy.yml`, які описують знятий 2026-08-28 механізм збірки з живою базою

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Конфігурація деплою читається як джерело правди: те, чого немає, з неї прибрано; коментарі описують поточний механізм.

**Є:** У дереві живе невикликаний composite action, а коментарі в активній джобі описують збірку з живою базою й spells_ci_test — тобто рівно те, що рішення власника 2026-08-28 і Р32 знімали.

**Доказ:** `ls .github/actions/db-tunnel/` → action.yml; `git status --porcelain .github/` → ` M .github/actions/db-tunnel/action.yml`; `grep -rn 'db-tunnel' .github/workflows/` → нічого. Тобто composite action лишився в дереві (ще й змінений), але жоден воркфлоу його не викликає. Поруч у джобі `image` файлу .github/workflows/deploy.yml стоять три коментарі, що суперечать сусідньому ж рядку: «network=host обовʼязковий: … 127.0.0.1:5454 там вказував би на сам build-контейнер, а не на тунель до бази, піднятий на раннері»; «next build пререндерить /char, який читає базу, тож збірці потрібен живий Postgres»; «Беремо spells_ci_test: контент той самий». Dockerfile каже протилежне: «Збірці база НЕ потрібна… 2026-08-28 next build із завідомо мертвою адресою (порт 1 на localhost) пройшов до кінця — 4032 сторінки, код виходу 0». `secrets: database_url` із кроку вже прибрано (про це там же є коментар), а `spells_ci_test` за Р32 більше не існує як робочий інструмент. `driver-opts: network=host` лишився заради тунелю, якого немає.

**Відтворення:** 1) `grep -rn 'db-tunnel' /Users/luka/Documents/code/spells.holota.family/.github/workflows/` → порожньо; 2) `ls /Users/luka/Documents/code/spells.holota.family/.github/actions/db-tunnel/` → action.yml; 3) порівняти коментар «збірці потрібен живий Postgres» у deploy.yml із першим абзацом Dockerfile.

**Куди дивитись:** Видалити .github/actions/db-tunnel/ (або лишити з явним «не використовується»), прибрати три застарілі коментарі в джобі `image`, і перевірити, чи `driver-opts: network=host` іще потрібен без тунелю.

**Файли:** `.github/actions/db-tunnel/action.yml`, `.github/workflows/deploy.yml`, `Dockerfile`


### L18-release-readiness-09 — Публічна адреса /char після видалення `src/app/char/page.tsx` тримається лише на рядку `matcher` у middleware, і жоден тест цього не ловить

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Публічна адреса з історією або має сторінку, або має редирект, захищений тестом.

**Є:** Редирект працює, але прибрати "/char" із `matcher` — і сторінки не стане зовсім, без жодної помилки компіляції чи тесту. Тесту, що ловить пару matcher ↔ resolveLegacyCreatorRedirect, я не знайшов.

**Доказ:** `git status --porcelain` показує 5 видалених і 2 перейменовані шляхи: `D public/images/categories/actions.webp`, `RM heroes_war_table.webp -> classes.webp`, `RM ancestral_species_hall.webp -> races.webp`, ` D src/app/char/page.tsx`, ` D src/components/home/HomeBackdrop.tsx`, ` D src/components/home/HomeDescriptionSection.tsx`, ` D src/components/home/OrnateFrame.tsx`. Три компоненти безпечні — переїхали в src/components/ui/ (src/components/ui/PlatformBackdrop.tsx:3 «Was `HomeBackdrop`»; src/components/ui/OrnateFrame.tsx має трьох споживачів), висячих імпортів немає (грепом по src/ і tests/). Адресу /char тримає лише middleware: src/middleware.ts:32 `matcher: ["/no-ai", "/no-ai/:path*", "/char"]` + src/rules/route-helpers.ts:7 `const LEGACY_CREATOR_PATH = "/char"`. Перевірено в браузері на :3100: http://127.0.0.1:3100/char → 308 → /char/create, заголовок «Створення персонажа — ДнД українською». Працює.

**Відтворення:** 1) `ls /Users/luka/Documents/code/spells.holota.family/src/app/char/` → [id], create, folder, home, share (page.tsx немає); 2) `curl -sI -L http://127.0.0.1:3100/char | head` → 308 на /char/create.

**Куди дивитись:** Додати тест, який стверджує, що `"/char"` присутній у `config.matcher` і що `resolveLegacyCreatorRedirect("/char")` дає `/char/create` — або e2e-крок у tests/e2e/, який перевіряє 308.

**Файли:** `src/middleware.ts`, `src/rules/route-helpers.ts`, `src/app/char/`


## Ізоляція редакцій (13)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P0 | 2024 | bug | `P3-multiclass-wizard-cleric-01` | Персонаж, створений конструктором 2024 у браузері, зберігається в базу як RULES_2014 — редакція втрачається на сабміті | src/lib/zod/schemas/persCreateSchema.ts, src/lib/components/characterCreator/MultiStepForm.tsx |
| ✓ | P1 | 2024 | data | `L06-subclasses-06` | ARTIFICER_2024 пропонується у конструкторі 2024, але має 0 підкласів при subclass_level = 3 — на 3-му рівні майстер показує порожній крок «Підклас» і блокує «Далі» | src/lib/generated/creator-content-2024.json, src/lib/components/levelUp/LevelUpWizard.tsx |
| · | P1 | both | bug | `L16-ruleset-isolation-01` | Створення персонажа шукає обладунок «Захист без обладунків» по назві без фільтра за редакцією, і монах/варвар RULES_2014 отримує рядок armor редакції RULES_2024 | src/server/db/character-creation.ts, tests/helpers/normalize-golden.ts |
| · | P1 | 2024 | in-flight | `L16-ruleset-isolation-02` | Монах і варвар редакції 2024 не отримують рядка «Захист без обладунків» узагалі — створення звірене з назвами класів 2014 | src/server/db/character-creation.ts, src/rules/armor-class-formulas.ts |
| ✓ | P1 | 2024 | missing-system | `L16-ruleset-isolation-03` | Лист персонажа 2024 додає зброю й обладунок тільки з каталогу 2014, через що майстерність зброї ніколи не звʼязується з предметом в інвентарі | src/server/db/equipment-actions.ts, src/lib/components/characterSheet/AddWeaponDialog.tsx |
| · | P1 | both | bug | `L16-ruleset-isolation-05` | Каталог магічних предметів у два кліки чіпляє предмет однієї редакції персонажу іншої — список персонажів і серверна дія редакцію не звіряють | src/server/db/pers-actions.ts, src/app/magic-items/magic-items-client.tsx |
| · | P1 | 2014 | bug | `L16-ruleset-isolation-06` | BUG-013 живий: тривалий відпочинок повертає всі кубики здоровʼя обом редакціям, хоча 2014 дає половину | src/server/db/rest-actions.ts, src/rules/hit-dice.ts |
| · | P2 | 2024 | bug | `L02-backgrounds-11` | Сервер не звіряє редакцію походження з редакцією персонажа: 2014-походження в запиті 2024 кидає неперехоплений виняток, а без ASI-вибору тихо створює персонажа без бонусів походження | src/server/db/creation-content.ts, src/server/db/character-creation.ts |
| ↓ | P2 | 2024 | bug | `L16-ruleset-isolation-04` | Кнопка «Додати магічний предмет» на листі завжди відкриває каталог 2014, тож 445 предметів 2024 недоступні персонажу 2024 | src/lib/components/characterSheet/AddMagicItemDialog.tsx, src/lib/components/characterSheet/slides/CombatSlide.tsx |
| ↓ | P2 | 2024 | bug | `P2-elf-wizard-05` | Діалог додавання заклинань пропонує чарівникові 2024 список 2014 — 31 замовляння замість 20, зокрема Control Flames (XGtE) | src/server/db/character-creation.ts, src/lib/components/characterSheet/AddSpellDialog.tsx |
| ↓ | P3 | both | bug | `L11-persistence-identity-07` | `Feature.engName` і `ChoiceOption.optionNameEng` унікальні глобально, а не по `(engName, ruleset)` — тому редакцію довелося вписати в саму ідентичність, і кожен пошук по `engName` мовчки міняє значення між редакціями | prisma/schema.prisma, src/lib/logic/bonus-calculator.ts |
| · | P3 | both | data | `L16-ruleset-isolation-08` | 48 рис мають однакове enum-імʼя у двох редакціях, а логіка рис ідентифікує рису рядком імені — латентний ризик змішування | src/server/db/feat-gates.ts, src/rules/repeatable-feats.ts |
| · | P3 | both | bug | `L16-ruleset-isolation-09` | Мертвий 2014-хардкод: getSpellsList без викликів і loadFightingStyleOptions поверх порожньої таблиці fighting_style | src/server/db/spell-actions.ts, src/server/db/progression-content.ts |

### P3-multiclass-wizard-cleric-01 — Персонаж, створений конструктором 2024 у браузері, зберігається в базу як RULES_2014 — редакція втрачається на сабміті

**Рівень:** P0 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (дефект переносу редакції, не правило книги)

**Має бути:** Персонаж, створений на /2024/char, має `pers.ruleset = RULES_2024`, зʼявляється у /2024/char/home і рахується за правилами 2024.

**Є:** `pers.ruleset = RULES_2014` у кожного персонажа, створеного через браузерний конструктор 2024; персонаж не показується в списку 2024, розподіл походження губиться, майстер мультикласу пропонує класи 2014.

**Доказ:** src/lib/zod/schemas/persCreateSchema.ts:294 — `ruleset: z.enum(["RULES_2014","RULES_2024"]).default("RULES_2014").optional()`. У zod 4.3.6 (версія в репо) `.default(x).optional()` для ВІДСУТНЬОГО ключа повертає x: `node -e "const {z}=require('zod'); console.log(JSON.stringify(z.object({ruleset:z.enum(['RULES_2014','RULES_2024']).default('RULES_2014').optional()}).parse({})))"` → `{"ruleset":"RULES_2014"}`. Стор конструктора `src/lib/stores/persFormStore.ts` поля `ruleset` не має взагалі; `MultiStepForm.tsx:90` тримає редакцію лише в локальній змінній `currentRuleset` і не кладе її у formData, яка йде в `createCharacter(currentData)` (`MultiStepForm.tsx:153`). Тому запасний шлях `src/server/db/character-creation.ts:427` `const ruleset = (validData.ruleset ?? cls.ruleset ?? "RULES_2014")` ніколи не доходить до `cls.ruleset`. Запит до spells_test: pers 23 «Аудит Мультиклас» pers.ruleset=RULES_2014 при class=WIZARD_2024 (class.ruleset=RULES_2024); те саме в pers 8 (P2, WIZARD_2024), pers 16 (P1, FIGHTER_2024), pers 14/15/17/18/19/20 (P5, DRUID_2024). Персонажі 3–6, зібрані програмно хелперами, мають правильний RULES_2024 — тому інтеграційні тести цього не ловлять. Скріншот: shots/P3-05-home2024.png — `/2024/char/home` не показує персонажа й віддає порожній стан із конструктором; він натомість у `/char/home` (shots/P3-05-sheet.png).

**Відтворення:** 1) /2024/char → Людина → Риса походження «Посвячений у магію» → список Друїд → Чарівник → Послушник → характеристики 8/10/13/15/14/12 + походження +2 ІНТ/+1 МУД → мови → спорядження A → Імʼя → Створити. 2) `select ruleset, class_id from pers where pers_id=<новий>` у spells_test → RULES_2014. 3) Відкрити /2024/char/home — персонажа немає.

**Куди дивитись:** Прибрати `.default("RULES_2014")` зі `persCreateSchema.ts:294` (лишити `.optional()`), щоб спрацював запасний шлях від `cls.ruleset`; або класти `ruleset: currentRuleset` у formData перед `createCharacter`. Перше лікує і будь-якого іншого клієнта.

**Файли:** `src/lib/zod/schemas/persCreateSchema.ts`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/server/db/character-creation.ts`, `src/lib/stores/persFormStore.ts`


### L06-subclasses-06 — ARTIFICER_2024 пропонується у конструкторі 2024, але має 0 підкласів при subclass_level = 3 — на 3-му рівні майстер показує порожній крок «Підклас» і блокує «Далі»

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** PHB 2024 Артифіцера не містить; data/2024/normalized/subclasses.json містить 48 підкласів для 12 класів, Артифіцера серед них немає

**Має бути:** Або клас не пропонується в редакції 2024, або має чотири підкласи, або крок «Підклас» не показується при порожньому списку.

**Є:** Гравець може створити Артифіцера 2024 і застрягає на підвищенні до 3-го рівня з порожнім кроком «Підклас».

**Доказ:** SQL: `select c.eng_name, c.subclass_level, (select count(*) from class_feature cf where cf.class_id=c.class_id) feats, (select count(*) from subclass s where s.class_id=c.class_id) subs from class c where c.ruleset='RULES_2024' order by c.sort_order` → … WIZARD_2024 3 10 4 | ARTIFICER_2024 3 13 0. src/lib/generated/creator-content-2024.json: `ARTIFICER_2024 subclassLevel=3 subs=0` — клас віддається конструктору 2024, фільтра за джерелом у ClassesForm/MultiStepForm немає. Майстер: LevelUpWizard.tsx:567 `needsSubclass = selectedClass.subclassLevel === classLevelAfter` (true незалежно від наявності підкласів) → крок додається на рядку 827-833 з `initialDisabled: true`, а розблоковується лише вибором у формі (LevelUpWizard.tsx:1224).

**Відтворення:** Створити персонажа на /2024/char з класом ARTIFICER_2024, підняти до 3-го рівня — крок «Підклас» без варіантів.

**Куди дивитись:** Найдешевше — прибрати ARTIFICER_2024 зі списку класів 2024 (або приховати за прапорцем джерела); альтернатива — не додавати крок, коли `(selectedClass.subclasses?.length ?? 0) === 0`; повне рішення — завезти підкласи. Питання до власника: чи Артифіцер узагалі має бути в 2024.

**Файли:** `src/lib/generated/creator-content-2024.json`, `src/lib/components/levelUp/LevelUpWizard.tsx`, `prisma/seed/`


### L16-ruleset-isolation-01 — Створення персонажа шукає обладунок «Захист без обладунків» по назві без фільтра за редакцією, і монах/варвар RULES_2014 отримує рядок armor редакції RULES_2024

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (питання ізоляції даних, не правила книги)

**Має бути:** Запит фільтрує `ruleset` персонажа (cls.ruleset / data.ruleset), а ключ мапи — пара «назва + редакція»; персонаж RULES_2014 дістає armor_id 301/302.

**Є:** Запит бере всі рядки з такою назвою в обох редакціях; яку редакцію отримає персонаж, вирішує порядок рядків у Postgres — фактично 374/375 (RULES_2024).

**Доказ:** src/server/db/character-creation.ts:988-1000: `if (cls.name === "MONK_2014") seededArmorNames.add("UNARMORED_DEFENSE_MONK"); … const rows = await tx.armor.findMany({ where: { name: { in: … } }, … }); const byName = new Map(rows.map((r) => [String(r.name), {…}]))` — ні `ruleset` у where, ні редакції в ключі мапи. Запит до spells_test: `select armor_id, name, ruleset from armor where name in ('UNARMORED_DEFENSE_MONK','UNARMORED_DEFENSE_BARBARIAN')` → 301 MONK RULES_2014, 302 BARBARIAN RULES_2014, 374 MONK RULES_2024, 375 BARBARIAN RULES_2024 (у цьому фізичному порядку). Map із ключем-назвою лишає останній рядок — 374/375, тобто 2024. Golden цього не ловить: tests/helpers/normalize-golden.ts:82 серіалізує обладунок лише назвою (`a.armor.name`), тому tests/golden/creation/monk-unarmored-defense.json містить ["UNARMORED_DEFENSE_MONK*"] і лишається зеленим; прогін `bun run test:db tests/golden/creation.test.ts` дав 35/35.

**Відтворення:** 1) `select armor_id, name, ruleset from armor where name in ('UNARMORED_DEFENSE_MONK','UNARMORED_DEFENSE_BARBARIAN')` — чотири рядки, назви збігаються. 2) Створити монаха 2014 через /char/create. 3) `select armor_id from pers_armor where pers_id = <новий>` — 374 замість 301.

**Куди дивитись:** Додати `ruleset` у where і в ключ Map у src/server/db/character-creation.ts:992-1000; паралельно додати редакцію обладунку в tests/helpers/normalize-golden.ts:82, інакше гейта не буде й після правки.

**Файли:** `src/server/db/character-creation.ts`, `tests/helpers/normalize-golden.ts`, `tests/golden/creation/monk-unarmored-defense.json`, `tests/golden/creation/barbarian-unarmored-defense.json`


### L16-ruleset-isolation-02 — Монах і варвар редакції 2024 не отримують рядка «Захист без обладунків» узагалі — створення звірене з назвами класів 2014

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** in-flight · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Monk: Unarmored Defense («10 plus your Dexterity and Wisdom modifiers»), Barbarian: Unarmored Defense; спосіб вибору формули — data/2024/srd/character-creation.md, Multiclassing → Armor Class («you can benefit from only one at a time»)

**Має бути:** Монах 2024 без обладунку має КЗ 10 + СПР + МДР, варвар — 10 + СПР + СТА; рядок формули має бути прикріплений при створенні.

**Є:** Жодна гілка створення не додає рядки 374/375; монах 2024 рахується як 10 + СПР.

**Доказ:** src/server/db/character-creation.ts:988-989 і 1026,1038 жорстко звіряють `cls.name === "MONK_2014"` / `"BARBARIAN_2024"` немає. У базі рядки 2024 існують: armor_id 374 UNARMORED_DEFENSE_MONK RULES_2024, 375 UNARMORED_DEFENSE_BARBARIAN RULES_2024. Модуль, написаний під це, не має жодного виклику: `grep -rn "armor-class-formulas" src | grep -v "armor-class-formulas"` → порожньо (src/rules/armor-class-formulas.ts, findAlternativeArmorClassFormulas).

**Відтворення:** 1) `grep -n "MONK_2014\|BARBARIAN_2014" src/server/db/character-creation.ts` — лише 2014-гілки. 2) `select armor_id, name, ruleset from armor where ruleset='RULES_2024' and name like 'UNARMORED%'` — рядки є. 3) `grep -rn "armor-class-formulas" src` — модуль без викликів.

**Куди дивитись:** Гілка має вибиратися за pers.ruleset + назвою класу без суфікса, або (як задумано в KR27.8) через findAlternativeArmorClassFormulas за наданими фічами. Це робота, що йде просто зараз — координувати, не переписувати.

**Файли:** `src/server/db/character-creation.ts`, `src/rules/armor-class-formulas.ts`


### L16-ruleset-isolation-03 — Лист персонажа 2024 додає зброю й обладунок тільки з каталогу 2014, через що майстерність зброї ніколи не звʼязується з предметом в інвентарі

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md — Weapon Mastery (властивість зброї, доступна Barbarian/Fighter/Paladin/Ranger/Rogue); зброя 2024 несе властивість mastery, зброя 2014 — ні

**Має бути:** getBaseEquipment приймає редакцію персонажа; персонаж 2024 бачить 38 одиниць зброї й 16 обладунків своєї редакції, і зброя в інвентарі має той самий weapon_id, що й обрана майстерність.

**Є:** Персонаж 2024 бачить 48 одиниць зброї 2014 (mastery = null) і 20 обладунків 2014; доданий Довгий меч має weapon_id 23, а обрана майстерність висить на 2220, тож значок майстерності на зброї не показується ніколи.

**Доказ:** src/server/db/equipment-actions.ts:10 `const ACTIVE_RULESET: Ruleset = "RULES_2014";` і :376-382 `prisma.weapon.findMany({ where: { ruleset: ACTIVE_RULESET } })`, `prisma.armor.findMany({ where: { ruleset: ACTIVE_RULESET } })`. AddWeaponDialog.tsx:33 і AddArmorDialog.tsx:34 кличуть getBaseEquipment() без параметра редакції; WeaponsCard.tsx:128 рендерить діалог для будь-якого персонажа, а окремого листа 2024 немає (src/app/2024/char/ містить лише home/ і page.tsx). Запит: weapon RULES_2014 = 48 рядків, з них із mastery 0; weapon RULES_2024 = 38, із mastery 38; armor 2014 = 20, 2024 = 16. Ідентифікатори різні: LONGSWORD id2014=23 / id2024=2220 (mastery SAP), DAGGER 2/2200 (NICK), GREATAXE 19/2216 (CLEAVE), SHORTSWORD 29/2226 (VEX). Вибір майстерності при цьому правильний — src/server/db/weapon-mastery.ts:123-125 `where: { ruleset, mastery: { not: null } }` за pers.ruleset. Лист звіряє їх по id: WeaponsCard.tsx:70-72 `new Map((pers.pers_weapon_mastery ?? []).map((entry) => [entry.weapon_id, entry.weapon.mastery]))` і :149 `masteryByWeaponId.has(pw.weaponId)`.

**Відтворення:** 1) Створити персонажа 2024 (Fighter) на /2024/char, обрати майстерність (наприклад Longsword). 2) На листі /char/<id> відкрити «Додати зброю» — список складається з 2014-зброї. 3) Додати Longsword; `select weapon_id from pers_weapon where pers_id=<id>` → 23, а `select weapon_id from pers_weapon_mastery where pers_id=<id>` → 2220. 4) Значок майстерності на картці зброї відсутній.

**Куди дивитись:** Зробити getBaseEquipment(ruleset) і передати pers.ruleset із AddWeaponDialog/AddArmorDialog. УВАГА: поточну поведінку пінить tests/content/ruleset-server-filter.test.ts («KR6.3 — getBaseEquipment: зброя з RULES_2024 не потрапляє у список») — тест треба переписати тим самим комітом.

**Файли:** `src/server/db/equipment-actions.ts`, `src/lib/components/characterSheet/AddWeaponDialog.tsx`, `src/lib/components/characterSheet/AddArmorDialog.tsx`, `src/lib/components/characterSheet/WeaponsCard.tsx`, `tests/content/ruleset-server-filter.test.ts`

**Скептик:** Підтверджую власним доказом, з однією поправкою до формулювання автора.

(1) ПРАВИЛО. `data/2024/srd/equipment.md:54,92` — «Each weapon has a mastery property… usable only by a character who has a feature, such as Weapon Mastery»; `data/2024/srd/classes.md:262-266` (Barbarian, аналогічно 4802, 5645, 6420, 7049 — Fighter/Paladin/Ranger/Rogue) — «use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice». Правило саме 2024-е; у 2014 майстерності немає. Оракул цитовано вірно.

(2) КОД. Незалежно відтворив: `src/server/db/equipment-actions.ts:9-10` `const ACTIVE_RULESET: Ruleset = "RULES_2014"`, `:373-383` `getBaseEquipment()` без параметрів фільтрує `weapon`/`armor` цією константою. Грep по всьому репо: єдині виклики — `AddWeaponDialog.tsx:33` і `AddArmorDialog.tsx:34`, обидва без редакції; `WeaponsCard.tsx:128` і `CombatSlide.tsx:328` рендерять діалоги для будь-якого персонажа. Іншого шляху додати зброю/обладунок на листі немає, окремого листа 2024 теж немає (`src/app/2024/char/` = `page.tsx` + `home/`, а `home/page.tsx:45` перевикористовує спільний `CharHomeClient`, тобто лист один — `/char/[id]`). Вибір майстерності справді їде за `pers.ruleset` (`weapon-mastery.ts:123-125`), звірка на листі — по `weapon_id` (`WeaponsCard.tsx:71`, `:149`), FK `pers_weapon_mastery.weapon_id → weapon(weapon_id)` підтверджено в pg_constraint.

Запити до `spells_test` (мої власні, `work/v-L16-03/q*.mjs`) повторили всі числа автора: weapon 2014 = 48 / mastery 0, 2024 = 38 / mastery 38; armor 20 і 16; LONGSWORD 23/2220 (SAP), DAGGER 2/2200 (NICK), GREATAXE 19/2216 (CLEAVE), SHORTSWORD 29/2226 (VEX).

(3) РІШЕННЯ ВЛАСНИКА. У `docs/DECISIONS.md` і в розділі «Прийнято» `docs/KNOWN-BUGS.md` (BUG-001/002/003 — «сервер довіряє UI») цього немає; жодне рішення не дозволяє персонажу 2024 каталог 2014.

(4) IN-FLIGHT — ні. `equipment-actions.ts`, `AddWeaponDialog.tsx`, `AddArmorDialog.tsx`, `WeaponsCard.tsx` не в переліку файлів паралельної сесії. Некомічений diff у `equipment-actions.ts` є, але він стосується лише пошуку `HOMEBREW` (`name_ruleset` + `RULES_2014`) і `getBaseEquipment` не чіпає.

(5) ВІДКРИТИЙ KR — окремого немає, але це шматок давно названої, незакритої роботи: «O6 Крок 5» (`docs/o6-rules-2024-import/kr6.3-implementation.md:81`), про яку прямо сказано «досі не закритий» у `docs/o18-2024-character-parity/kr18.8-invocations-2024.md:278` і `README.md:133-135`, а `docs/o16-5etools-canon/kr16.5-equipment.md:34` називає саме «перемикач редакції в листі персонажа (`ACTIVE_RULESET` у `src/server/db/`)». Тобто це відома незроблена система, а не регресія — classification `missing-system` правильна.

ПОПРАВКА до «actual». Твердження «значок майстерності не показується ніколи» — завелике. Стартове спорядження 2024 після O26 посилається на зброю своєї редакції: `class_starting_equipment_option → weapon` дає 27 звʼязків 2024→2024 і 31 2014→2014, розбіжностей нуль. У базі персонажі 24 і 25 (`RULES_2024`) мають у `pers_weapon` LIGHT_HAMMER `weapon_id = 2204` і той самий 2204 у `pers_weapon_mastery` — значок для стартової зброї працює. Ламається саме те, що додано з листа. Крім того сам вибір майстерності не губиться: `WeaponMasteryCard` малює його з `pers_weapon_mastery` незалежно від інвентарю.

(6) СЕРЙОЗНІСТЬ — P1 лишаю, але з іншою опорою, ніж у автора. Головний доказ «не за книгою» — не значок, а числа: зброя 2014 і 2024 розходиться статами на трьох позиціях, і `addWeapon` копіює `customDamageDice: weapon.damage` у момент додавання, тобто фіксує чуже число в персонажі. TRIDENT 1к6 проти 1d8 (`equipment.md:362`), LANCE 1к12 / REACH,SPECIAL проти 1d10 / Heavy,Reach,Two-Handed (`equipment.md:298`), WAR_PICK без VERSATILE проти Versatile (1d10) (`equipment.md:378`), MUSKET як FIREARMS замість MARTIAL_WEAPON. Персонаж 2024, який додає тризуб, б’є 1к6 замість 1d8 — це рахунок не за його книгою. Плюс до цього — недоступні 38 одиниць зброї своєї редакції й розірваний звʼязок майстерності для всього, що додано після створення (це саме по собі тягне на P2).

Обладункова половина знахідки слабша, ніж написано: стати збігаються повністю (жодної розбіжності по `base_ac`/`armor_type`/`strength_req`/`stealth_disadvantage` між редакціями), 2024-унікальний лише `DRACONIC_RESILIENCE`, а 2014-унікальні — `HOMEBREW` і чотири `NATURAL_ARMOR*`. Тобто для обладунку це гігієна ідентифікаторів, а не помилка чисел.

Застереження автора про тест правильне й підтверджене: `tests/content/ruleset-server-filter.test.ts:67-77` пінить нинішню поведінку («зброя з RULES_2024 не потрапляє у список») і має переписуватись разом із фіксом.


### L16-ruleset-isolation-05 — Каталог магічних предметів у два кліки чіпляє предмет однієї редакції персонажу іншої — список персонажів і серверна дія редакцію не звіряють

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** На /2024/magic-items список «Додати до персонажа» містить лише персонажів RULES_2024 (і навпаки), а toggleMagicItemForPers відхиляє предмет чужої редакції.

**Є:** Список містить персонажів обох редакцій; предмет RULES_2024 записується персонажу RULES_2014 і навпаки, без жодної помилки.

**Доказ:** src/server/db/pers-actions.ts:1243-1276 — getUserPersesMagicItemIndex() віддає всіх персонажів користувача: `where: { userId: user.id, isSnapshot: false, isActive: true }`, без ruleset. src/app/magic-items/magic-items-client.tsx:193-200 малює цей список у випадайці «Додати до персонажа» і кличе `toggleMagicItemForPers({ persId: p.persId, magicItemId })`. src/lib/actions/magic-item-actions.ts:71-93 — toggleMagicItemForPers перевіряє лише власність (assertOwnsPers), редакцію не звіряє. src/server/db/magic-items.ts:41-45 — addMagicItemLink пише `prisma.persMagicItem.create({ data: { persId, magicItemId, … } })` без перевірок. Той самий клієнт обслуговує обидва маршрути (/magic-items і /2024/magic-items).

**Відтворення:** 1) Мати одного персонажа 2014 і одного 2024. 2) Відкрити /2024/magic-items, натиснути іконку «Додати до персонажа» на будь-якому предметі. 3) У списку присутній персонаж 2014; обрати його. 4) `select p.ruleset, mi.ruleset from pers_magic_item pmi join pers p on … join magic_item mi on … where p.pers_id=<2014>` — редакції не збігаються.

**Куди дивитись:** Повертати ruleset у getUserPersesMagicItemIndex, фільтрувати список за редакцією предмета в magic-items-client.tsx і додати звірку редакції в toggleMagicItemForPers. Це НЕ покривається прийнятим рішенням «сервер довіряє UI» (BUG-001/002): тут недозволений вибір пропонує сама оболонка. Примітка: src/server/db/pers-actions.ts у переліку файлів паралельної сесії — координувати.

**Файли:** `src/server/db/pers-actions.ts`, `src/app/magic-items/magic-items-client.tsx`, `src/lib/actions/magic-item-actions.ts`, `src/server/db/magic-items.ts`


### L16-ruleset-isolation-06 — BUG-013 живий: тривалий відпочинок повертає всі кубики здоровʼя обом редакціям, хоча 2014 дає половину

**Рівень:** P1 · **Редакція:** 2014 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06.** `findPoolsAfterLongRest(pools, ruleset)` у `src/rules/hit-dice.ts`: 2014 повертає `max(1, floor(сума_max / 2))` кубиків, 2024 — усі. Половина рахується від суми кубиків усіх класів, а не покласово. Рішення власника: наявним персонажам міграції не робити, нова поведінка діє з наступного відпочинку після деплою. Тест `tests/rules/hit-dice.test.ts`, доведений червоним.

**Правило:** data/2014/srd/06_Gameplay/Adventuring.md:174 — «The character also regains spent Hit Dice, up to a number of dice equal to half of the character's total number of them (minimum of one die). For example, if a character has eight Hit Dice, he or she can regain four spent Hit Dice upon finishing a long rest.» ПРОТИ data/2024/srd/rules-glossary.md (Long Rest → Benefits of the Rest) — «Regain All HP. You regain all lost Hit Points and all spent Hit Point Dice.»

**Має бути:** Для RULES_2014 — `min(max, current + max(1, floor(max / 2)))` через наявний шар src/rules/strategies/; для RULES_2024 — `max`.

**Є:** `current = max` для кожного класу незалежно від редакції.

**Доказ:** src/server/db/rest-actions.ts:296-298 у longRest: `const restoredHitDice = serializeHitDicePools(collectHitDicePools(pers).map((pool) => ({ ...pool, current: pool.max })));` — жодної гілки за pers.ruleset; `grep -n "ruleset" src/server/db/rest-actions.ts` у цій функції нічого не дає. Запис у docs/KNOWN-BUGS.md:345 «BUG-013 … Статус: відкрито» — підтверджую, код не змінено.

**Відтворення:** 1) Персонаж 2014 8 рівня витрачає 6 кубиків здоровʼя. 2) Тривалий відпочинок. 3) `select current_hit_dice from pers where pers_id=<id>` — повний запас (8), очікується 6 (2 + 4).

**Куди дивитись:** Гілка за pers.ruleset у longRest (src/server/db/rest-actions.ts:296) через src/rules/strategies/. Зміна поведінки для наявних персонажів 2014 — окреме рішення власника (так записано в KNOWN-BUGS).

**Файли:** `src/server/db/rest-actions.ts`, `src/rules/hit-dice.ts`, `docs/KNOWN-BUGS.md`


### L02-backgrounds-11 — Сервер не звіряє редакцію походження з редакцією персонажа: 2014-походження в запиті 2024 кидає неперехоплений виняток, а без ASI-вибору тихо створює персонажа без бонусів походження

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Запит із походженням чужої редакції відхиляється зрозумілим повідомленням; персонаж 2024 без ASI походження не створюється.

**Є:** Виняток (500) в одній гілці й мовчазне створення персонажа 2024 без ASI походження в іншій.

**Доказ:** src/server/db/creation-content.ts:14 `prisma.background.findUnique({ where: { backgroundId: data.backgroundId } })` — без фільтра ruleset. Зонд work/L02-backgrounds/soldier.test.ts (кейс «2014-походження в конструкторі 2024»): backgroundId 2014-го SOLDIER + ruleset RULES_2024 + коректний backgroundAsiChoice → тест падає з `Error: Invalid Background ASI choice for 2024 rules` із src/rules/strategies/rules2024.ts:66; createCharacter (character-creation.ts:66-81) не має try/catch, тож назовні летить виняток, а не {error}. Друга гілка: src/rules/background-asi.ts:34-36 повертає null, коли abilityOptions порожній, тож findBackgroundAsiProblem не бачить проблеми, а src/rules/character-creation.ts:93 просто пропускає бонус.

**Відтворення:** Викликати createCharacter із ruleset RULES_2024 і backgroundId походження 2014 — з backgroundAsiChoice і без нього (зонд scratchpad/audit/work/L02-backgrounds/soldier.test.ts).

**Куди дивитись:** У buildCharacter звіряти background.ruleset (а також race/class) із ruleset персонажа й повертати {error}; findBackgroundAsiStep для RULES_2024 має вважати порожній abilityOptions помилкою даних, а не «кроку немає». Це та сама лінія, що прийняті BUG-001/002/003, але тут наслідок — падіння.

**Файли:** `src/server/db/creation-content.ts`, `src/server/db/character-creation.ts`, `src/rules/background-asi.ts`, `src/rules/strategies/rules2024.ts`


### L16-ruleset-isolation-04 — Кнопка «Додати магічний предмет» на листі завжди відкриває каталог 2014, тож 445 предметів 2024 недоступні персонажу 2024

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Має бути:** Для персонажа RULES_2024 діалог відкриває /2024/magic-items — так само, як AddSpellDialog відкриває /2024/spells.

**Є:** Завжди /magic-items: 445 предметів своєї редакції недоступні, натомість пропонуються 621 предмет чужої.

**Доказ:** src/lib/components/characterSheet/AddMagicItemDialog.tsx:56 — `<iframe src={`/magic-items?${queryParams.toString()}`} …>`; компонент приймає лише { persId, persName } і не знає редакції; викликається з slides/CombatSlide.tsx:509 для будь-якого персонажа. src/app/magic-items/page.tsx:20 — `getAllMagicItems()` (2014), src/app/2024/magic-items/page.tsx:19 — `getAllMagicItems("RULES_2024")`. Запит: magic_item RULES_2014 = 621, RULES_2024 = 445. Контраст: сусідній AddSpellDialog.tsx:353 робить правильно — `return `${is2024 ? "/2024/spells" : "/spells"}?…``, де is2024 з pers.ruleset (рядок 242).

**Відтворення:** 1) Відкрити лист персонажа 2024 → вкладка «Бій» → «Додати» біля магічних предметів. 2) У iframe відкривається /magic-items (каталог 2014). 3) `grep -n "iframe" src/lib/components/characterSheet/AddMagicItemDialog.tsx` — маршрут захардкоджений.

**Куди дивитись:** Передати ruleset у AddMagicItemDialog з CombatSlide і вибирати маршрут як в AddSpellDialog.tsx:353. Вбудований режим на маршруті 2024 уже працює: magic-items-client.tsx:256 (origin=character + persId), а /2024/magic-items/page.tsx прокидає initialSearchParams.

**Файли:** `src/lib/components/characterSheet/AddMagicItemDialog.tsx`, `src/lib/components/characterSheet/slides/CombatSlide.tsx`, `src/app/2024/magic-items/page.tsx`

**Скептик:** Код підтверджено власною перевіркою — хардкод справді є, але наслідок автор перебільшив.

(1) ПРАВИЛО: n/a, це не питання книги — маршрутизація UI. Оракул перевіряти нема чого.

(2) КОД — підтверджено повністю. `src/lib/components/characterSheet/AddMagicItemDialog.tsx:9` приймає рівно `{ persId, persName }`, рядок 54 — `<iframe src={`/magic-items?${queryParams.toString()}`}>`. Єдиний виклик — `slides/CombatSlide.tsx:509`, без жодної гілки за редакцією; `CombatSlide` монтується з `CharacterCarousel.tsx:112` для будь-якого персонажа, а окремого листа 2024 немає (`find src/app/2024 -type d` дає лише `char/` і `char/home`, лист один — `/char/[id]`). `/magic-items/page.tsx:20` віддає `getAllMagicItems()`, `/2024/magic-items/page.tsx:48` — `<MagicItemsClient … ruleset="RULES_2024">`. Контраст із `AddSpellDialog.tsx:242,353` (`is2024` з `pers.ruleset`) справджується дослівно. Обробки в іншому місці немає: `MagicItemsClient` бере редакцію з пропа з дефолтом `RULES_2014` (`magic-items-client.tsx:235`), тож у вбудованому режимі з `/magic-items` показує лише 2014.

Числа перевірив незалежно й іншим способом, ніж автор: каталоги читають **файли**, не таблицю (`src/lib/magicItemsData.ts:1-2`) — `src/lib/generated/magicItems.json` = 621 запис, `data/2024/normalized/magic-items.json` = 445. Збігається з його SQL, але доказ надійніший, бо саме ці файли рендерять сторінку.

(3) РІШЕННЯ ВЛАСНИКА: немає. `docs/DECISIONS.md` про предмети говорить тільки про джерело істини даних (Р33 і далі), не про діалог. У `docs/KNOWN-BUGS.md` розділ «Прийнято» містить лише BUG-001/002/003 («сервер довіряє UI») — інша тема. `docs/o7-platform-segregation/kr7.2` перелічує маршрути 2024 як зроблені, але листа персонажа в тому переліку немає.

(4) IN-FLIGHT: ні. `AddMagicItemDialog.tsx` немає ані в переліку файлів паралельної сесії, ані в `git status` (файл не змінений). `CombatSlide.tsx` і `magic-items-client.tsx` змінені, але їхні дифи маршруту не чіпають (`git diff` по CombatSlide дає лише імпорти/`MagicItemRow`).

(5) ВІДКРИТИЙ KR: ні. Згадки `AddMagicItemDialog` у `docs/` — тільки як **зразок патерну** для інших пікерів (`o19-bastions/kr19.3:13`, `o24-wildshape-second-layer/kr24.3:24,67,84`), не як задача.

(6) СЕРЙОЗНІСТЬ — ось де знахідка не тримає P1. Ключове твердження «445 предметів 2024 персонажу 2024 **недосяжні**» хибне: другий шлях існує і працює. На `/2024/magic-items` у не-вбудованому режимі кожен рядок має `InventoryDropdown` (`magic-items-client.tsx:572-596`, гілка `!isEmbedMode`), який кличе `getUserPersesMagicItemIndex()`; той (`src/server/db/pers-actions.ts:1243-1276`) повертає **всіх** персонажів користувача без фільтра за редакцією — тобто персонаж 2024 у списку є, і предмет 2024 на нього чіпляється в два кліки. Це та сама діра, що й у знахідці 05, але тут вона працює на користь гравця. За шкалою CONTEXT P1 — «персонаж рахується не за книгою» або «вибір гравця губиться»; тут не відбувається ні першого, ні другого: жодне похідне число не їде, жоден вибір не зникає, предмет прикріплюється саме той, який гравець натиснув. Це «незручний/хибний дефолт у головному потоці плюс наявний обхід» — P2 за визначенням («немає можливості» тут навіть слабше, ніж класичний P2, бо можливість є, просто не з кнопки на листі).

Класифікацію лишаю `bug` (не `missing-system`): маршрут 2024 уже приймає `initialSearchParams` і вбудований режим (`/2024/magic-items/page.tsx:48`), тобто це один рядок пропущеної гілки, а не відсутня система.


### P2-elf-wizard-05 — Діалог додавання заклинань пропонує чарівникові 2024 список 2014 — 31 замовляння замість 20, зокрема Control Flames (XGtE)

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Правило:** data/2024/srd/classes.md:10291 «Cantrips (Level 0 Wizard Spells)» — список замовлянь чарівника 2024; Control Flames до нього не входить

**Має бути:** Діалог пропонує 20 замовлянь чарівника 2024 і лише рівні заклинань, доступні за таблицею (на 1-му — тільки 1-й рівень)

**Є:** Пропонується список 2014 (31 замовляння), у ньому заклинання, яких у редакції 2024 у чарівника немає

**Доказ:** Скрипт work/P2-elf-wizard/09-magic.mjs, скріншот shots/P2-elf-wizard-09d-add-spell-list-8.png: заголовок групи «Замовляння (31)», перший запис «Влада над вогнем [Control Flames] … Класи: Друїд, Чарівник, Чародій». Запит до spells_test по spell_classes×spell для class_name='Чарівник': RULES_2014 level 0 → 31, RULES_2024 level 0 → 20 (Acid Splash, Blade Ward, Chill Touch, Dancing Lights, Elementalism, Fire Bolt, Friends, Light, Mage Hand, Mending, Message, Mind Sliver, Minor Illusion, Poison Spray, Prestidigitation, Ray of Frost, Shocking Grasp, Thunderclap, Toll the Dead, True Strike). 31 — це рівно список 2014.

**Відтворення:** 1) /char/8 → вкладка «Магія» → «Додати» → «Так, з фільтрами» 2) порахувати «Замовляння (N)» у лівій колонці

**Куди дивитись:** Корінь — P2-elf-wizard-01 (діалог фільтрує за pers.ruleset). Самі файли діалогу (AddSpellDialog.tsx, spell-actions.ts) — у роботі паралельної сесії, правити треба джерело редакції, а не діалог

**Файли:** `src/server/db/character-creation.ts`, `src/lib/components/characterSheet/AddSpellDialog.tsx`

**Скептик:** 1) ПРАВИЛО — підтверджено. `data/2024/srd/classes.md:10291` «Cantrips (Level 0 Wizard Spells)»: Acid Splash, Chill Touch, Dancing Lights, Elementalism, Fire Bolt, Light, Mage Hand, Mending, Message, Minor Illusion, Poison Spray, Prestidigitation, Ray of Frost, Shocking Grasp, True Strike (15 у SRD; 20 у базі — плюс не-SRD Blade Ward, Friends, Mind Sliver, Thunderclap, Toll the Dead з PHB 2024). Control Flames до списку 2024 не входить: у `spells_test` це `spell_id 1409, ruleset RULES_2014, source XGTE`, і всі три рядки `spell_classes` для нього — `RULES_2014`. Числа автора відтворилися точно: замовлянь чарівника 31 (2014) / 20 (2024).

2) СИМПТОМ — відтворив незалежно, навіть без персонажа (мій скрипт `counts.mjs`): `/2024/spells?cls=Чарівник` → заголовок «Замовляння (20)», Control Flames («Влада над вогнем») немає; `/spells?cls=Чарівник` → «Замовляння (31)», Control Flames є. Тобто каталоги розділені правильно.

3) КОД — і саме тут знахідка хибно вказує винного. `AddSpellDialog.tsx:242` `const is2024 = pers.ruleset === "RULES_2024";` і `:353` `return \`${is2024 ? "/2024/spells" : "/spells"}?…\`` — діалог обирає каталог **виключно** за `pers.ruleset`, а `src/app/2024/spells/page.tsx:26` віддає `getAllSpells("RULES_2024")`. Для персонажа з правильним `ruleset` діалог покаже саме 20 замовлянь 2024. Отже це на 100 % наслідок знахідки **P2-elf-wizard-01**, яку я перевірив сам: `src/lib/zod/schemas/persCreateSchema.ts:294` `ruleset: z.enum([...]).default("RULES_2014").optional()` — дефолт спрацьовує раніше, ніж `validData.ruleset ?? characterClass.ruleset` у `src/server/db/character-creation.ts:180`, а `MultiStepForm.tsx:90` `formData.ruleset` лише **читає** (жодного присвоєння `ruleset:` у конструкторі немає; `src/app/2024/char/page.tsx:42` передає `initialRuleset` тільки в UI). Власної правки в `AddSpellDialog.tsx` знахідка не потребує — нуль окремої роботи.

4) РІШЕННЯ ВЛАСНИКА — навпаки, вимагають протилежного: `docs/o27-multiclass-2024/kr27.7-slots-above-spells.md:96-98` «`AddSpellDialog` для персонажа 2024 … відкриває `/2024/spells` замість `/spells`» (KR закрито 2026-09-04), `docs/o18-2024-character-parity/README.md:134` «редакція їде з `pers.ruleset`». Прийнятою поведінкою це не є.

5) IN-FLIGHT — ні. `AddSpellDialog.tsx` і `src/app/2024/spells/**` справді в переліку паралельної сесії, але місце виправлення (`persCreateSchema.ts`, `MultiStepForm.tsx`, `character-creation.ts`) до нього не входить, а частина пікера в KR27.7 уже закрита й працює. Відкритого KR під «конструктор 2024 пише RULES_2014» у `docs/o2*/` немає.

6) СЕРЙОЗНІСТЬ. Наслідок реальний і не косметичний: `setSpellPresenceForPers` (`src/server/db/spell-actions.ts:260-300`) не звіряє ні редакцію заклинання, ні список класу — Control Flames справді запишеться в `pers_spell`. Але як **окрема** знахідка це дублікат симптому P0-01: власного дефекту немає, виправлення 01 знімає її цілком. Тому знижую до P2 і рекомендую злити в P2-elf-wizard-01, а не тримати окремим P1 з власним fix hint. Поле `files` знахідки треба виправити: `AddSpellDialog.tsx` не винен.


### L11-persistence-identity-07 — `Feature.engName` і `ChoiceOption.optionNameEng` унікальні глобально, а не по `(engName, ruleset)` — тому редакцію довелося вписати в саму ідентичність, і кожен пошук по `engName` мовчки міняє значення між редакціями

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** L · **Вердикт скептика:** downgraded

**Правило:** n/a — інваріант схеми; порівняння з сусідами, де межу проведено правильно: `Spell @@unique([engName, ruleset])`, `Race @@unique([engName, ruleset])`

**Має бути:** Ідентичність контенту — пара `(engName, ruleset)`; англійська назва фічі/опції 2024 така сама, як у книзі, і код може шукати по ній.

**Є:** Англійська назва 2024 містить клас і рік («Bard: Jack of all Trades (2024)»); кожен захардкоджений `engName` у правилах працює лише для 2014 (підтверджені наслідки — знахідки -02 і -04), а регулярка дужкового хвоста читає дизамбігуатор як payload, щойно зʼявиться опція 2024 без `effect_kind`.

**Доказ:** prisma/schema.prisma:408 — `engName String @unique @map("eng_name") @db.VarChar(100)` на `Feature`, при тому що поруч є `ruleset Ruleset @default(RULES_2014)`; prisma/schema.prisma:73 — `optionNameEng String @unique @map("option_name_eng")` на `ChoiceOption` (ruleset — рядок 79). Для порівняння: `Spell` — `@@unique([engName, ruleset])` (рядок 542), `Race` — (рядок 1114), `PersWildshape` — `@@unique([persId, creatureKey, ruleset])` (1157). Наслідок у даних (запити до spells_test): Feature «Second Wind» (2014) ↔ «Fighter: Second Wind (2024)» (48906); «Unarmored Defense» ↔ «Barbarian: Unarmored Defense (2024)» (48850) і «Monk: Unarmored Defense (2024)» (48921); «Channel Divinity» ↔ «Cleric: Channel Divinity (2024)» (48883); «Jack of All Trades» ↔ «Bard: Jack of all Trades (2024)» (48872). ChoiceOption: «Defense» (option_id 3) ↔ «Fighting Style 2024 (Defense)» (3384); «Pact of the Blade» (22) ↔ «Pact of the Blade (2024)» (3595). Друга половина ризику — розбір `optionNameEng` регуляркою `nameEng.match(/\(([^)]+)\)\s*$/)` у src/server/db/levelup-persistence.ts:376,403 і src/lib/logic/characterUtils.ts:78: корисне навантаження читається з дужок у кінці рядка — там само, де тепер стоїть дизамбігуатор редакції. Зараз не стикнулося лише випадково: `select … from choice_option where ruleset='RULES_2024' and effect_kind is null and option_name_eng ~ '\([A-Z]{3}\)\s*$'` → 0 рядків (усі такі опції йдуть метаданими `effect_kind`, а не фолбеком).

**Відтворення:** `select eng_name, ruleset from feature where eng_name ilike '%second wind%' or eng_name ilike '%jack of all%'` на spells_test; порівняти з `grep -rn "engName ===" src/rules src/lib/logic`.

**Куди дивитись:** SQL у `db/changes/`: замінити `UNIQUE(feature.eng_name)` на `UNIQUE(eng_name, ruleset)`, те саме для `choice_option.option_name_eng`; далі прибрати дизамбігуатори з назв 2024 у `data/2024/normalized/*.json` і перевести пошук по `engName` на пару з `ruleset`. До того — знахідки -02 і -04 лагодяться точково.

**Файли:** `prisma/schema.prisma`, `src/lib/logic/bonus-calculator.ts`, `src/rules/wildshape-uses.ts`, `src/server/db/levelup-persistence.ts`, `src/lib/logic/characterUtils.ts`, `data/2024/normalized/classes.json`

**Скептик:** ФАКТИ ПІДТВЕРДЖЕНО, АЛЕ КВАЛІФІКАЦІЮ СПРОСТОВАНО.

(1) Схема — усе так, як пише автор. `prisma/schema.prisma:73` `optionNameEng String @unique`, `:408` `engName String @unique`; поруч `ruleset` (:79, :441). Сусіди мають складений ключ: `Spell @@unique([engName, ruleset])` (:542), `MagicItem` (:541-ий блок), `Race` (:1114). У самій базі (`spells_test`, `pg_indexes`) — `feature_eng_name_key ON feature (eng_name)` і `choice_option_option_name_eng_key ON choice_option (option_name_eng)`, тобто глобальні. Колізії теж є: власним запитом (join 2014↔2024 по шаблону `'<Клас>: <назва> (2024)'`) знайшов ≥30 пар — `Bard: Jack of all Trades (2024)`↔`Jack of All Trades`, `Ability Score Improvement` ×13 класів, `Fighting Style` ×3, `Halfling: Brave (2024)`, `Elf: Keen Senses (2024)` тощо. Усі 547 фіч `RULES_2024` мають суфікс `(2024)` (547 із 547).

(2) РІШЕННЯ ВЛАСНИКА — і саме воно ламає знахідку. `docs/o21-user-signals/questions.md`, питання 4, «**закрито 2026-08-28: варіант А**»: варіант **Б — «Зняти `@unique` і зробити ключ складеним»** розглянуто дослівно й **відхилено** («`engName` — це ключ, на якому свідомо стоїть рушій правил… це вже не правка даних, а зміна інваріанта… Б варта окремої розмови, але не під приводом одного баг-репорта»). **«Рішення власника 2026-08-28: А»** — розвести назви, унікальність лишити. Продовження — `docs/o18-2024-character-parity/kr18.8-invocations-2024.md:46-66`, «Рішення схеми: суфікс, не складений ключ»: «Документ спершу пропонував SQL у `db/changes/`, що знімає глобальну унікальність… **Це рішення переглянуто після вимірів, DDL не пишеться**». Те саме в `docs/README.md:156`: «Заплановане DDL на складений ключ `(engName/optionNameEng, ruleset)` **скасовано після виміру** — суфікс `" (2024)"`… розводить 28 колізій без схеми». Тобто fix_hint знахідки («замінити UNIQUE(eng_name) на UNIQUE(eng_name, ruleset) і почистити дизамбігуатори в назвах 2024») — це буквально відхилений варіант Б плюс скасування чинної конвенції іменування.

(3) КОД. Живих місць із захардкодженим `engName` у рушії лишилося рівно два: `src/lib/logic/bonus-calculator.ts:207` (JoAT) і `src/rules/wildshape-uses.ts:25-26,37`. Це знахідки -02 і -04, подані окремо. «~35 місць», якими лякає рішення KR18.8, — застаріла оцінка для `findUnique`/`connect`, вони суфіксом не ламаються; `src/rules/hit-points.ts` уже знято з `engName` на поле даних `bonusHitPointsPerLevel` («рушій нічого не знає про конкретні назви рис»). Тобто -07 не додає жодного власного наслідку понад -02/-04, і рахувати ту саму шкоду P1 втретє не можна. Дані-половина -04 до того ж уже зафіксована як свідомо поза межами: `docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md:220-228` — «Використань Дикої форми в 2024 немає — і це не регресія цього KR… Підключення пулу — це сід контенту 2024».

(4) ДОКАЗ АВТОРА ЧАСТКОВО ХИБНИЙ. Автор пише «Зараз не стикнулося лише випадково… → 0 рядків», але його запит звужений до трилітерних хвостів `\([A-Z]{3}\)\s*$`. Мій ширший запит (`option_name_eng ~ '\([^)]+\)\s*$' and effect_kind is null and ruleset='RULES_2024'`) дає **не 0, а 43+ рядки**: `Magic Initiate 2024 (Cleric/Druid/Wizard)` (3379-3381), усі 10 `Fighting Style 2024 (…)` (3382-3391), усі 31 виклик `… (2024)` (3571-3601). Тобто дужковий парсер уже зустрічає дизамбігуатор — просто без шкоди: у `levelup-persistence.ts:376,403` фолбек діє лише коли хвіст — це абревіатура характеристики або енам `Skills` («2024», «Cleric», «Defense» — ні одне, ні друге), а в конструкторі `extractSkillsFromChoiceOption` закритий гейтом `group.isSkill` (`FeatChoiceOptionsForm.tsx:805,854`). Пастка латентна, персонаж сьогодні від неї не рахується неправильно.

(5) IN-FLIGHT / ВІДКРИТИЙ KR — ні: жодного з файлів паралельної сесії не зачіпає; відкритого KR на складений ключ немає, він скасований.

ПІДСУМОК: явище реальне й описане коректно, але це не баг, а прийнята архітектура з двома записаними рішеннями (D-001 варіант А + KR18.8). P1 не тримається: інваріант сам по собі нічого не рахує не за книгою, вся жива шкода вже подана як -02 (P1) і -04 (P2), а дужкова пастка латентна. Лишається цінним рівно одне зауваження, і його варто передати власнику окремо: премиса KR18.8 «суфікс не чіпає жодного з цих викликів — старий код працює як працював» правдива для `findUnique`/`connect`, але **хибна для предикатів рушія із захардкодженим `engName` 2014** — і саме ця дірка породила -02.


### L16-ruleset-isolation-08 — 48 рис мають однакове enum-імʼя у двох редакціях, а логіка рис ідентифікує рису рядком імені — латентний ризик змішування

**Рівень:** P3 · **Редакція:** both · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Має бути:** Будь-яка ідентифікація риси поза межами одного персонажа має нести редакцію (пара name+ruleset або featId).

**Є:** Ключ — сам рядок імені. Сьогодні безпечно (персонаж однієї редакції), але перша ж перевірка prerequisiteFeat або крос-редакційний пошук візьме «якусь» рису з таким іменем.

**Доказ:** Запит: `select count(*) from (select name from feat where ruleset='RULES_2014' intersect select name from feat where ruleset='RULES_2024') x` → 48 (ACTOR, ALERT, ATHLETE, CHARGER, CHEF, CROSSBOW_EXPERT, CRUSHER, DEFENSIVE_DUELIST, DUAL_WIELDER, DURABLE…). prisma/schema.prisma, модель Feat: `@@unique([name, ruleset])` — колізія дозволена навмисно. src/server/db/feat-gates.ts:37-42 (toFeatInstance) і src/rules/repeatable-feats.ts ідентифікують рису рядком featName. feat.prerequisiteFeat зберігається рядком і сьогодні лише відображається (src/lib/featsData.ts:61).

**Відтворення:** SQL вище + `grep -n "featName" src/rules/repeatable-feats.ts src/server/db/feat-gates.ts`.

**Куди дивитись:** Коли prerequisiteFeat стане перевіркою — резолвити його разом із ruleset. Зараз достатньо тесту, що фіксує намір.

**Файли:** `src/server/db/feat-gates.ts`, `src/rules/repeatable-feats.ts`, `src/lib/featsData.ts`, `prisma/schema.prisma`


### L16-ruleset-isolation-09 — Мертвий 2014-хардкод: getSpellsList без викликів і loadFightingStyleOptions поверх порожньої таблиці fighting_style

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Мертвий код або видалений, або хардкод редакції знятий разом із гілкою.

**Є:** Дві функції з ACTIVE_RULESET = RULES_2014, одна без викликів, друга поверх порожньої таблиці на маршруті без автентифікації.

**Доказ:** src/server/db/spell-actions.ts:543-545 — getSpellsList() із `where: { ruleset: ACTIVE_RULESET }` (ACTIVE_RULESET = "RULES_2014", рядок 12); `grep -rn "getSpellsList" src | grep -v spell-actions.ts` → порожньо. src/server/db/progression-content.ts:5,62-66 — loadFightingStyleOptions() із тим самим хардкодом; єдиний виклик — src/lib/logic/progression-resolver.ts:132, а він живе на мертвій legacy-гілці (знахідка 07). Запит `select ruleset, count(*) from fighting_style group by 1` → жодного рядка, таблиця порожня в обох редакціях, тобто крок «Бойовий стиль» на цій гілці показав би нуль опцій.

**Відтворення:** grep-и вище + `select count(*) from fighting_style`.

**Куди дивитись:** Прибрати разом із legacy-гілкою підвищення рівня (знахідка 07). Файл src/server/db/spell-actions.ts у переліку паралельної сесії — тільки читав.

**Файли:** `src/server/db/spell-actions.ts`, `src/server/db/progression-content.ts`, `src/lib/logic/progression-resolver.ts`


## Вторинні потоки (20)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P0 | 2024 | bug | `P5-druid-secondary-flows-01` | Копія персонажа і знімок не переносять поле ruleset, тож 2024-персонаж мовчки стає RULES_2014 | src/lib/logic/pers-duplication.ts, src/server/db/snapshots.ts |
| ↓ | P1 | 2024 | bug | `L12-secondary-flows-01` | Жоден із трьох шляхів копіювання персонажа не переносить `ruleset` — копія, знімок рівня і копія за посиланням перетворюють персонажа 2024 на персонажа 2014 | src/lib/logic/pers-duplication.ts, src/server/db/snapshots.ts |
| ✓ | P1 | both | bug | `L12-secondary-flows-03` | `PERS_DUPLICATION_INCLUDE` не знає про `PersResourcePool`, `PersWildshape` і `PersBastion` — копія персонажа й копія теки губить ресурси класу, звірині форми й бастіон | src/lib/logic/pers-duplication.ts, src/server/db/pers-actions.ts |
| ✓ | P1 | both | bug | `L12-secondary-flows-04` | `copyPersByToken` — третя незалежна реалізація копії, найбідніша: втрачає майстерність зброї, інфузії, ресурси, дику форму, бастіон і `raceStaticAcBonus` | src/server/db/share-actions.ts, src/lib/logic/pers-duplication.ts |
| · | P1 | 2024 | bug | `L12-secondary-flows-05` | Публічна сторінка шеринга не вантажить `pers_weapon_mastery` і опційні класові фічі — спільний лист 2024 показує менше, ніж власний | src/server/db/share-actions.ts, src/server/db/pers-actions.ts |
| · | P1 | 2024 | data | `L12-secondary-flows-06` | Жодна фіча 2024 не має ані `limited_uses_per`, ані `uses_pool_key` — короткий і довгий відпочинок для персонажа 2024 не відновлюють нічого, і жоден ресурс класу не має лічильника | data/2024/normalized/classes.json, data/2024/normalized/species.json |
| · | P1 | both | bug | `L12-secondary-flows-08` | Довгий відпочинок видає стандартні комірки за ЗАГАЛЬНИМ рівнем персонажа замість рівня заклинача (BUG-010 досі відкритий; у 2024 зачіпає паладина й слідопита з першого рівня) | src/server/db/rest-actions.ts, src/rules/spellcasting.ts |
| ✓ | P1 | 2014 | bug | `L17-known-registries-05` | BUG-013 живий: тривалий відпочинок повертає всі кубики здоровʼя й персонажу 2014, якому книга дає половину | src/server/db/rest-actions.ts, src/rules/hit-dice.ts |
| · | P1 | 2014 | bug | `P4-regression-2014-05` | BUG-013 живий: longRest повертає всі кубики хітів обом редакціям, хоча 2014 дає половину | src/server/db/rest-actions.ts, src/rules/hit-dice.ts |
| · | P1 | both | bug | `P5-druid-secondary-flows-02` | Копія персонажа не переносить дику форму, пули ресурсів і бастіон | src/lib/logic/pers-duplication.ts, src/server/db/pers-actions.ts |
| · | P1 | both | bug | `P5-druid-secondary-flows-03` | Знімок персонажа — окрема друга реалізація копіювання, ще бідніша за першу; активація знімка нічого не відновлює | src/server/db/snapshots.ts, src/lib/actions/snapshot-actions.ts |
| · | P2 | both | missing-system | `L08-levelup-machine-09` | Відкотити рівень або виправити помилковий вибір неможливо: знімки є, відновлення немає | src/lib/actions/snapshot-actions.ts, src/server/db/snapshots.ts |
| ↓ | P2 | both | bug | `L12-secondary-flows-02` | Знімок рівня втрачає майстерність зброї, ресурси класу, дику форму, бастіон, інфузії та всі бойові налаштування зброї й стан магічних предметів | src/server/db/snapshots.ts, src/lib/logic/pers-duplication.ts |
| ↓ | P2 | 2024 | bug | `L12-secondary-flows-07` | Короткий відпочинок відновлює використання до максимуму, а 2024 Rage / Wild Shape / Second Wind повертають рівно одне | src/server/db/rest-actions.ts |
| · | P2 | 2014 | bug | `L12-secondary-flows-09` | Довгий відпочинок повертає всі кубики здоровʼя обом редакціям — правильно для 2024, неправильно для 2014 (BUG-013 досі в коді) | src/server/db/rest-actions.ts, src/rules/hit-dice.ts |
| ✓ | P2 | 2024 | missing-system | `L12-secondary-flows-10` | Героїчного натхнення немає в моделі взагалі — людина 2024 не отримує його після довгого відпочинку, приміщення бастіону теж не дають | prisma/schema.prisma, src/server/db/rest-actions.ts |
| · | P2 | both | bug | `L12-secondary-flows-11` | Співвласник за посиланням на редагування може назавжди видалити персонажа власника; знімки власника лишаються сиротами | src/server/db/pers-actions.ts, src/server/db/share-actions.ts |
| ✓ | P2 | both | missing-system | `L19-parity-competitors-01` | Помилковий вибір при підвищенні рівня неможливо переграти: немає ні respec, ні зниження рівня, ні відкату до знімка — дія activateSnapshot існує, але з UI не викликається | src/lib/components/characterSheet/SnapshotHistoryModal.tsx, src/lib/actions/snapshot-actions.ts |
| · | P2 | both | missing-system | `L19-parity-competitors-12` | Немає ні експорту, ні імпорту JSON — персонажа неможливо ні зберегти собі, ні перенести у VTT | src/lib/logic/pers-duplication.ts, src/lib/components/characterSheet/PrintCharacterDialog.tsx |
| · | P3 | 2024 | bug | `L12-secondary-flows-12` | Сторінка спільної теки не віддає ані редакції, ані мультикласу персонажа | src/server/db/share-actions.ts, src/lib/components/characterFolder/SharedFolderView.tsx |

### P5-druid-secondary-flows-01 — Копія персонажа і знімок не переносять поле ruleset, тож 2024-персонаж мовчки стає RULES_2014

**Рівень:** P0 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (внутрішня цілісність: prisma/schema.prisma — Pers.ruleset @default(RULES_2014))

**Має бути:** Копія і знімок 2024-персонажа лишаються RULES_2024: бастіон доступний, Дика форма рахується за таблицею Beast Shapes 2024, тимчасові ХП і межа відомих форм на місці.

**Є:** Новий рядок pers створюється без ruleset і бере дефолт RULES_2014, при цьому несе classId/subclassId 2024 — виходить гібрид: контент 2024, правила 2014. Бастіон зникає (createBastionForPers віддає «Бастіони — механіка правил 2024»), Дика форма перерахована за 2014.

**Доказ:** src/lib/logic/pers-duplication.ts:44-116 — обʼєкт `data` для `tx.pers.create` не містить `ruleset`; те саме в незалежній реалізації src/server/db/snapshots.ts:40-113. `grep -n "ruleset" src/lib/logic/pers-duplication.ts src/server/db/snapshots.ts` → жодного збігу. Виконано на spells_test (work/P5-druid-secondary-flows/flows.json): оригінал pers 13 `ruleset: RULES_2024`; знімок pers 19 → `{"ruleset":"RULES_2014","classId":342,"subclassId":133}`; копія pers 20 → `{"ruleset":"RULES_2014"}`. Лист копії (shots/P5-copy-sheet.png) не має блоку БАСТІОН, а рядок обмежень Дикої форми — 2014-й («КР до 1 · політ з 8 рівня · плавання дозволено · лазіння без обмежень») проти 2024-го в оригіналі («Відомі форми 0 / 6 … вхід і вихід — бонусна дія · тимчасові ХП +15 · заміна однієї форми за довгий відпочинок», shots/P5-sheet-original.png).

**Відтворення:** 1) Створити 2024-персонажа (у мене pers 13, Друїд 5 Коло місяця). 2) /char/home → «Дублювати» (або викликати duplicatePers). 3) Відкрити копію: блока «Бастіон» немає, картка Дикої форми без межі відомих форм і без тимчасових ХП. 4) Те саме з createCharacterSnapshot(13).

**Куди дивитись:** Додати `ruleset: pers.ruleset` в обидва обʼєкти `data` (pers-duplication.ts і snapshots.ts) + тест «копія і знімок несуть редакцію оригіналу».

**Файли:** `src/lib/logic/pers-duplication.ts`, `src/server/db/snapshots.ts`, `src/server/db/pers-actions.ts`, `src/server/db/share-actions.ts`


### L12-secondary-flows-01 — Жоден із трьох шляхів копіювання персонажа не переносить `ruleset` — копія, знімок рівня і копія за посиланням перетворюють персонажа 2024 на персонажа 2014

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Правило:** n/a (дефект збереження, не правило); наслідок вимірюється правилом `data/2024/srd/character-creation.md:937-942` — половинні заклиначі 2024 округлюються вгору, 2014 вниз

**Має бути:** Копія, знімок і копія за токеном мають ту саму редакцію, що й джерело: `ruleset: pers.ruleset`.

**Є:** Стовпець не задається взагалі, спрацьовує `@default(RULES_2014)`. Копія персонажа 2024 зникає з `/2024/char/home` (фільтр `src/server/db/pers-actions.ts:131`, сторінка `src/app/2024/char/home/page.tsx:11`), а лист починає рахувати за правилами 2014 (`calculateCasterLevel` бере `pers.ruleset` — `src/lib/logic/spell-logic.ts:33`).

**Доказ:** Програмний прогін справжніх серверних дій на фікстурі `07-human-paladin-noble` (5 рівень, `spells_test`): оригінал `ruleset=RULES_2024`; після `duplicatePers` — `RULES_2014`; після `createCharacterSnapshot` — `RULES_2014`; після `copyPersByToken` — `RULES_2014`. Повний JSON: /private/tmp/claude-502/-Users-luka-Documents-code-spells-holota-family/0141b135-eeb1-42c1-a811-e88f5d9dced7/scratchpad/audit/work/L12-secondary-flows/report.json. Код: у жодному з трьох об'єктів `data` немає ключа `ruleset` (`grep -rn ruleset src/lib/logic/pers-duplication.ts src/server/db/snapshots.ts src/server/db/share-actions.ts` не дає жодного влучання в цих функціях), а `prisma/schema.prisma:644` задає `ruleset Ruleset @default(RULES_2014)`. Знімок створюється автоматично при кожному підвищенні рівня — `src/server/db/levelup-persistence.ts:1095`.

**Відтворення:** 1) Створити персонажа на /2024/char, підвищити рівень (створиться знімок). 2) На /char/home натиснути «Копіювати». 3) `select pers_id, name, ruleset from pers order by pers_id desc limit 3` — копія й знімок мають RULES_2014.

**Куди дивитись:** Додати `ruleset: pers.ruleset` у `data` в `clonePersWithRelations` (pers-duplication.ts:44), `createPersSnapshot` (snapshots.ts:39) і `copyPersByToken` (share-actions.ts:682); характеризаційний тест, що порівнює `ruleset` джерела й копії в усіх трьох шляхах.

**Файли:** `src/lib/logic/pers-duplication.ts`, `src/server/db/snapshots.ts`, `src/server/db/share-actions.ts`, `prisma/schema.prisma`

**Скептик:** Дефект справжній, але знахідка застаріла на дві третини, і серйозність завищена.

(1) ПРАВИЛО — підтверджено. `data/2024/srd/character-creation.md` (блок «_Spell Slots_»): «All your levels in the Bard, Cleric, Druid, Sorcerer, and Wizard classes / **Half your levels (round up) in the Paladin and Ranger classes**». Код це реалізує явно: `src/rules/spellcasting.ts:26` — `calculateCasterLevel(character, ruleset)` з коментарем «половинні заклиначі округлюються по-різному у 2014 і 2024», і `getCasterLevelContribution(level, kind, ruleset, className)` з приміткою, що асиметрія навмисна (Р33). Тобто `ruleset` на рядку `pers` справді змінює числа листа — механізм наслідку доведено.

(2) КОД — тут знахідка спростована частково. Два з трьох шляхів **уже полагоджені** в робочому дереві:
- `src/lib/logic/pers-duplication.ts:49` — `ruleset: pers.ruleset`,
- `src/server/db/snapshots.ts:47` — `ruleset: pers.ruleset`.
`git diff HEAD` показує ці два рядки як додані (файли `M`, mtime 2026-09-04 23:27:19 — рівно на годину ПІЗНІШЕ за звіт автора, 22:27:57). Тобто на момент прогону автора доказ був чесний, а потім хтось полагодив. Це закриває `duplicatePers` (`pers-actions.ts:233`), копію теки (`:430`), копію спільної теки (`share-actions.ts:616`) і знімок рівня — усі вони йдуть через `clonePersWithRelations`.

Зʼявився і сторож: `tests/logic/pers-copy-fields.test.ts` (untracked). Він читає стовпці `model Pers` зі `schema.prisma` і вимагає, щоб кожен був у літералі `const data = {`. Прогнав — 4/4 зелених. Перевірив, що він **кусає**: проганяв його логіку по версіях файлів із `HEAD` (копія в скретчпаді, репо не чіпав) — обидва дали `ruleset written? false`, тобто до правки тест був би червоний.

ЩО ЗАЛИШИЛОСЯ: третій шлях, `copyPersByToken` (`src/server/db/share-actions.ts:646`–872, кінець файлу), **досі без `ruleset`**. Незалежно перевірив: `grep "ruleset"` по всьому тілу функції (645–870) — жодного влучання; літерал `data` для `tx.pers.create` (рядки ~678–753) поіменно перелічує ~60 полів, `ruleset` серед них немає. Файл не змінювався з 2026-08-15. Іронія: `clonePersWithRelations` імпортований у цьому ж файлі (`share-actions.ts:7`) і використаний на 30 рядків вище (`:616`), але `copyPersByToken` дублює вставку вручну. Сторож його теж не ловить — `COPY_SOURCES` у тесті містить лише два файли.

Доказ наслідку я добув сам, не покладаючись на автора: запит до `spells_test` через `node + pg` — `information_schema.columns` для `pers.ruleset` дає `column_default = 'RULES_2014'::"Ruleset"`, `is_nullable = NO`. Отже вставка без стовпця гарантовано дає RULES_2014 — на рівні БД, а не лише `@default` у генерованій схемі.

Наслідки для решти шляху підтверджені по коду: `/2024/char/home` фільтрує `where: { ruleset: "RULES_2024" }` (`pers-actions.ts:131`, сторінка `src/app/2024/char/home/page.tsx:11`), тож копія за токеном зникає зі списку 2024; `calculateCasterLevel` бере `pers.ruleset` (`src/lib/logic/spell-logic.ts:33`), тож паладин 5 у копії рахується як рівень заклинача 2 замість 3.

(3) РІШЕННЯ ВЛАСНИКА — немає. `grep` по `docs/DECISIONS.md` і `docs/KNOWN-BUGS.md`: жодного рішення про перенесення редакції при копіюванні, `copyPersByToken` там не згадується взагалі. Це не прийнята поведінка.

(4) IN-FLIGHT — ні для залишку. `share-actions.ts` немає в списку файлів паралельної сесії з CONTEXT (там `spell-actions.ts`, `pers-actions.ts`, `spell-preparation-2024.ts` тощо). Два полагоджені шляхи були виправлені поза цим списком — це радше сесія-ремедіація за цим самим аудитом, ніж KR27.7/KR30.3.

(5) ВІДКРИТИЙ KR — немає. Єдина згадка: `docs/o13-2024-completeness/kr13.4-search-aliases.md:339` фіксує, що `copyPersByToken` «окремо не перевірялись інтеграційним тестом», бо це «той самий шлях, що й власний персонаж». Саме це припущення й хибне — шлях не той самий, він дублює вставку.

(6) СЕРЙОЗНІСТЬ — P0 не тримається за шкалою CONTEXT. P0 — «падіння, втрата даних, неможливо створити/підвищити персонажа». Тут нічого не падає, персонаж-джерело цілий, копія створюється успішно й лишається доступною на `/char/home`. Реальна шкода — «персонаж порахований не за книгою» (комірки половинного заклинача) плюс зникнення зі списку 2024, тобто рівно P1. Навіть у первісному повному обсязі (з автознімками на кожному рівні) це була б P1, а не P0. Після часткової правки обсяг звузився до одного добровільного потоку «друг скопіював за посиланням» — P1 остаточно.


### L12-secondary-flows-03 — `PERS_DUPLICATION_INCLUDE` не знає про `PersResourcePool`, `PersWildshape` і `PersBastion` — копія персонажа й копія теки губить ресурси класу, звірині форми й бастіон

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** n/a (втрата збереженого вибору гравця)

**Має бути:** Копія персонажа повторює всі його рядки: ресурси, дику форму, бастіон.

**Є:** Копія друїда не має жодної звіриної форми, копія персонажа 4+ рівня — бастіону, будь-яка копія — лічильників ресурсів класу.

**Доказ:** Прогін: `afterDuplicate` має `pools=0`, `wildshapes=0`, `bastion=0` при 1/1/1 в оригіналі (report.json). Код: `src/lib/logic/pers-duplication.ts:3-27` — у include немає `resourcePools`, `wildshapes`, `bastion`; повний перелік зв'язків `Pers` — `prisma/schema.prisma:652-672`. Виклики: `duplicatePers` (`src/server/db/pers-actions.ts:233`), копія теки (`pers-actions.ts:430`), копія спільної теки (`src/server/db/share-actions.ts:616`).

**Відтворення:** Персонаж 2024 з бастіоном і звіриною формою → «Копіювати» → `select (select count(*) from pers_bastion where pers_id=<копія>), (select count(*) from pers_wildshape where pers_id=<копія>)` = 0, 0.

**Куди дивитись:** Додати `resourcePools: true`, `wildshapes: true`, `bastion: { include: { facilities: true, turns: true } }` в `PERS_DUPLICATION_INCLUDE` і відповідні вставки в `clonePersWithRelations` (бастіон — з перемапуванням `persBastionId`).

**Файли:** `src/lib/logic/pers-duplication.ts`, `src/server/db/pers-actions.ts`, `src/server/db/share-actions.ts`

**Скептик:** Підтверджую власним прогоном, не спираючись на фікстуру автора.

(1) ПРАВИЛО — не потрібне: це не питання книги, а втрата рядків гравця. `rule_source: n/a` коректний.

(2) КОД — перевірив поточне дерево (файл змінено вчора о 23:27, тож цитати автора могли протухнути). `PERS_DUPLICATION_INCLUDE` (src/lib/logic/pers-duplication.ts:3-27) досі без `resourcePools`, `wildshapes`, `bastion`; grep по цих словах у файлі — нуль збігів. Тіло `clonePersWithRelations` пише рівно 11 таблиць (рядки 122, 129, 141, 160, 170, 177, 192, 217, 231, 249, 261, 274) — жодного `persResourcePool`/`persWildshape`/`persBastion`. Три виклики (pers-actions.ts:224+233, :426+430, share-actions.ts:612+616) нічого не дороблюють після клону; усі три висять на живих кнопках UI (CharHomeClient.tsx:1407, :1465, SharedFolderView.tsx:117, плюс SnapshotHistoryModal.tsx:74).

(3) РІШЕННЯ ВЛАСНИКА — немає. У DECISIONS.md про копію нічого; у KNOWN-BUGS.md теж; «Поза межами» o19-bastions/README.md:117-122 виключає лише бастіон для 2014 і спільні бастіони партії, o24-wildshape README:312-324 — конвертацію атак, спорядження, елементалів і заклинання у формі. Копіювання не згадане ніде.

(4) IN-FLIGHT — ні. `pers-duplication.ts` не у списку паралельної сесії. `pers-actions.ts` у списку, але правка потрібна лише в `pers-duplication.ts` (include + тіло), сусідні файли чіпати не треба.

(5) ВІДКРИТИЙ KR — немає: `grep -rln "PERS_DUPLICATION\|clonePersWithRelations\|duplicatePers" docs/` порожній.

(6) СЕРЙОЗНІСТЬ — P1 виправдана, але не всіма трьома пунктами. `PersWildshape` (creature_key, notes, sortOrder, currentHp, isActive) і `PersBastion` (name, description, notes + facilities + turns) — це авторський вміст гравця, і його втрата підпадає під «вибір гравця губиться». А от `PersResourcePool` — самі лічильники, і вони ліниво відтворюються через `upsert … create: { usesRemaining: max }` (feature-uses.ts:83, :222; wildshape-uses.ts:95), тобто копія просто стартує з повними ресурсами. Цей третій пункт сам по собі P3, і формулювання «обнулено лічильники» його трохи перебільшує — але на підсумкову оцінку це не впливає.

Поправка до звіту автора: сусідня знахідка 01 (`ruleset`) у робочому дереві **вже виправлена** — pers-duplication.ts:47-49 `ruleset: pers.ruleset` плюс сторож tests/logic/pers-copy-fields.test.ts; мій прогін дає copyRuleset = RULES_2024. Це не послаблює 03, а пояснює його: сторож зчитує лише **скалярні** стовпці `Pers` (`readPersScalarFields` відкидає поля-моделі), тож зникнення звʼязків він за визначенням не ловить.

Редакція: both — дикі форми й пули є в 2014 і 2024 (`PersWildshape.ruleset @default(RULES_2014)`), бастіон лише 2024.


### L12-secondary-flows-04 — `copyPersByToken` — третя незалежна реалізація копії, найбідніша: втрачає майстерність зброї, інфузії, ресурси, дику форму, бастіон і `raceStaticAcBonus`

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** n/a (втрата збереженого вибору гравця)

**Має бути:** Копія за посиланням не гірша за копію з власного списку.

**Є:** Найгірша з трьох копій; для 2024 приходить без майстерності зброї і в редакції 2014.

**Доказ:** Прогін: `copyPersByToken` дав `mastery=0` при 3 в оригіналі, `pools/wildshapes/bastion` = 0 (report.json, `afterTokenCopy`). Код: `src/server/db/share-actions.ts:646-860` має власний include (`:662-677`) і власні вставки, хоча `clonePersWithRelations` імпортовано в тому ж файлі (`share-actions.ts:7`). Крім усього, що втрачає знімок, тут немає й `raceStaticAcBonus` (`prisma/schema.prisma:641`), який `clonePersWithRelations` копіює (`pers-duplication.ts:89`).

**Відтворення:** «Поділитися» персонажем 2024 → відкрити посилання іншим користувачем → «Скопіювати собі» → у копії `pers_weapon_mastery` порожня.

**Куди дивитись:** Замінити тіло `copyPersByToken` на `clonePersWithRelations(tx, pers, { userId, name })` з `PERS_DUPLICATION_INCLUDE`; після цього знахідки 02 і 04 лікуються однією правкою include.

**Файли:** `src/server/db/share-actions.ts`, `src/lib/logic/pers-duplication.ts`

**Скептик:** Підтверджую власним доказом, і знахідка навіть слабша за реальність.

(1) ПРАВИЛО — n/a, це втрата збереженого стану, оракул не потрібен. Але наслідок числовий: `raceStaticAcBonus` іде в КЗ через `src/lib/logic/bonus-calculator.ts:349` (`raceStaticArmorClassBonus`), і виставляє його **гравець** тумблером на листі (`CombatSlide.tsx:490` → `src/server/db/equipment-actions.ts:303`); при створенні він завжди 0 (`character-creation.ts:432`). Тобто це саме збережений вибір гравця, який змінює КЗ.

(2) КОД — не обробляється більше ніде. Мій незалежний field-diff (скрипт `…/work/V-L12-04/fields.mjs`, та сама методика, що в репозиторному сторожі: скалярні стовпці `model Pers` проти літерала `const data = {`):
- `share-actions.ts` не пише `ruleset`, `raceStaticAcBonus`, `folderId`, `isPinned` (плюс `isActive`, який має `@default(true)`, тож нешкідливо);
- вставки в `copyPersByToken` торкаються лише `persSkill, persSpell, persFeature, persFeat, persFeatChoice, persWeapon, persArmor, persMulticlass, persMagicItem` — ані `pers_weapon_mastery`, ані `persInfusion`, ані пулів/дикої форми/бастіону.
Шлях живий: `CharacterSheet.tsx:94-107` і кнопка «Копіювати» `:233-241` на `/char/share/[token]`.

Автор недооцінив масштаб. Понад його перелік `copyPersByToken` ще й обрізає рядки, які **таки** копіює: `persWeapon.createMany` пише 6 колонок (`weaponId, overrideName, customDamageDice, customDamageAbility, customDamageBonus, isProficient`) — губляться `overrideDamage`, `attackBonus`, `overrideNormalRange`, `overrideLongRange`, `overrideDamageType`, `overrideAttackAbility`, `customAttackBonus`, `customDamageCount`, `isMagical`; `persMagicItem.createMany` пише лише `magicItemId` — губляться `isEquipped`, `isAttuned`. `clonePersWithRelations` копіює все це (`pers-duplication.ts:184-201`, `:243-256`). Це вже не «бідніша копія», а інші атака, шкода й КЗ у копії.

(3) РІШЕННЯ ВЛАСНИКА — немає. У `docs/DECISIONS.md` шеринг згадано лише про кукі (`:578`); у `KNOWN-BUGS.md` «Прийнято» — тільки BUG-001..003 про довіру сервера до UI. Єдина згадка `copyPersByToken` у доках — `docs/o13-2024-completeness/kr13.4-search-aliases.md:339`, і вона стверджує протилежне: «створює звичайний рядок `pers` … той самий шлях, що й власний персонаж, уже покритий тестом». Ця знахідка цю тезу спростовує.

(4) IN-FLIGHT — ні. `src/server/db/share-actions.ts` немає в списку паралельної сесії з CONTEXT (там `pers-actions.ts`, не `share-actions.ts`), і файл узагалі не має незакомічених змін.

(5) ВЖЕ ВІДКРИТО — жодного KR у `docs/o*/`.

Головне, що змінилося під аудитом і що **посилює** знахідку: `ruleset` уже полагоджено, але лише у двох із трьох шляхів. У робочому дереві `src/lib/logic/pers-duplication.ts:47` і `src/server/db/snapshots.ts` тепер мають `ruleset: pers.ruleset`, і зʼявився неатрекований сторож `tests/logic/pers-copy-fields.test.ts`, чий `COPY_SOURCES` перелічує рівно ці два файли. Я його прогнав — 4 зелених. Тобто сторож зелений, тоді як третій шлях досі падає на `@default(RULES_2014)` і жодним гейтом не покритий; наступний доданий стовпець `Pers` знову мовчки не поїде саме тут.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою CONTEXT правильно: губиться вибір гравця (майстерність зброї 2024, тумблер КЗ, налаштування зброї, спорядженість/налаштованість предметів) і персонаж рахується не за книгою (редакція 2014 → у паладина/слідопита половинний заклинач округлюється вниз замість угору). Не P0, бо ушкоджується копія в чужому профілі, а не оригінал.

Одне уточнення до формулювання: частина «і в редакції 2014» — це та сама першопричина, що в знахідці 01; якщо 01 закриють у всіх трьох місцях, від 04 лишиться `raceStaticAcBonus` + майстерність + інфузії + обрізані поля зброї/предметів. Це все одно P1.


### L12-secondary-flows-05 — Публічна сторінка шеринга не вантажить `pers_weapon_mastery` і опційні класові фічі — спільний лист 2024 показує менше, ніж власний

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (розходження двох завантажувачів того самого листа)

**Має бути:** Спільний лист показує ту саму механіку, що й власний — зокрема майстерність зброї, ядро правил 2024.

**Є:** На `/char/share/<token>` картка майстерності порожня, бейджі майстерності на зброї зникають, а бонуси від опційних класових фіч не входять у похідні числа.

**Доказ:** `src/server/db/share-actions.ts:159-357` (`getPersByShareToken`, обидві гілки) проти власного листа `src/server/db/pers-actions.ts:600-694`: у шерингу немає `pers_weapon_mastery: { include: { weapon: true } }` (є на :692), немає `classOptionalFeatures: { include: { feature: true } }` (є на :677), `choiceOptions`/`raceChoiceOptions` без вкладених фіч (порівняти з :678-679). Компоненти читають саме ці поля: `src/lib/components/characterSheet/WeaponMasteryCard.tsx:25` (`pers.pers_weapon_mastery ?? []`) і `WeaponsCard.tsx:71`. Похідні числа теж: `src/lib/logic/bonus-calculator.ts:189` додає бонуси з `pers.classOptionalFeatures`.

**Відтворення:** Персонаж 2024 з обраною майстерністю зброї → «Поділитися» → відкрити `/char/share/<token>` і порівняти з `/char/<id>`.

**Куди дивитись:** Винести один спільний `PERS_SHEET_INCLUDE` і використати його в `getPersById` і в обох гілках `getPersByShareToken` — зараз це дві копії, які вже розійшлися.

**Файли:** `src/server/db/share-actions.ts`, `src/server/db/pers-actions.ts`, `src/lib/components/characterSheet/WeaponMasteryCard.tsx`


### L12-secondary-flows-06 — Жодна фіча 2024 не має ані `limited_uses_per`, ані `uses_pool_key` — короткий і довгий відпочинок для персонажа 2024 не відновлюють нічого, і жоден ресурс класу не має лічильника

**Статус:** ✅ закрито 2026-09-08 ([KR31.3](kr31.3-feature-resources-2024.md)). Відпочинок відновлює класові, підкласові й видові ресурси; наскрізний доказ на видових — `tests/db/species-resource-2024-rest.test.ts` (орк повертає все коротким, дворф — тільки довгим).

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:238 (Rage), :3533 (Wild Shape), :4798 (Second Wind) — «You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest»; data/2024/srd/character-origins.md:154 (Breath Weapon — PB використань, усі на довгий відпочинок), :323 (Relentless Endurance — раз на довгий відпочинок)

**Має бути:** Rage, Second Wind, Wild Shape, Breath Weapon, Channel Divinity, Lay on Hands тощо мають кількість використань і тип відпочинку, і кнопка відпочинку їх відновлює.

**Є:** `src/server/db/rest-actions.ts:177-186` (короткий) і `:290-300` (довгий) шукають фічі з `limitedUsesPer in [SHORT_REST, LONG_REST]` — для 2024 вибірка порожня; пулів у персонажа 2024 не буває взагалі. Відпочинок для 2024 — порожня дія.

**Доказ:** SQL на spells_test 2026-09-04: `select ruleset, limited_uses_per, count(*) from feature group by 1,2` → RULES_2014: SHORT_REST 75, LONG_REST 202, DAY 1, null 1003; RULES_2024: LONG_REST **3** (лише Magic Initiate Cleric/Druid/Wizard list), null 544. `select ruleset, uses_pool_key, count(*) from feature where uses_pool_key is not null group by 1,2` → всі 8 ключів (WILD_SHAPE, CHANNEL_DIVINITY, SORCERY_POINTS, KI, PSIONIC_ENERGY, SUPERIORITY_DICE, BARDIC_INSPIRATION, ARCANE_SHOT) належать RULES_2014. Поіменно: 48849 `Barbarian: Rage (2024)`, 48906 `Fighter: Second Wind (2024)`, 48531 `Dragonborn: Breath Weapon (2024)`, 48524 `Aasimar: Healing Hands (2024)`, 48561 `Orc: Relentless Endurance (2024)` — усі `limited_uses_per=null, uses_count=null`. Прогін: паладин 5 рівня має 17 рядків `pers_feature`, `longRest` повернув `featuresRestored: 0`, `shortRest` — теж 0, `pers_resource_pool` не створився жодного (report.json).

**Відтворення:** Створити будь-якого персонажа 2024, натиснути «Довгий відпочинок» — `featuresRestored: 0`; на слайді Рис жодна фіча не має лічильника використань.

**Куди дивитись:** Сід контенту: проставити `usesCount` / `usesCountDependsOnProficiencyBonus` / `limitedUsesPer` / `usesPoolKey` фічам 2024 у `data/2024/normalized/classes.json` і `species.json` та перелити (Р33 — правити файл-джерело). Уже виміряно й записано в docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md:223 («як і всі фічі 2024 … це сід контенту, не цей KR»), але власника-цілі не має.

**Файли:** `data/2024/normalized/classes.json`, `data/2024/normalized/species.json`, `src/server/db/rest-actions.ts`, `docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md`


### L12-secondary-flows-08 — Довгий відпочинок видає стандартні комірки за ЗАГАЛЬНИМ рівнем персонажа замість рівня заклинача (BUG-010 досі відкритий; у 2024 зачіпає паладина й слідопита з першого рівня)

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-creation.md:937-942 — «Half your levels (round up) in the Paladin and Ranger classes … Then look up this total level in the Level column of the Multiclass Spellcaster table»

**Має бути:** Паладин 5 (2024) після довгого відпочинку має [4,2,0,…]; некастер — нулі.

**Є:** [4,3,2,0,…] — третя комірка 2-го кола понад максимум і дві комірки 3-го кола, яких у нього немає.

**Доказ:** Прогін на паладині 5 (2024): до відпочинку `currentSpellSlots = [4,2,0,…]` (правильно: рівень заклинача 3, `SPELL_SLOT_PROGRESSION.FULL[3]` — src/lib/refs/static.ts:9), після `longRest` — `[4,3,2,0,…]` (report.json). Код: `src/server/db/rest-actions.ts:388` — `const maxSpellSlots = getMaxSpellSlots(pers.level)`; приватна таблиця `:420-450` індексована рівнем персонажа. `calculateCasterLevel` у цій функції викликається (`:411`), але його результат іде лише в Pact-комірки. Готова правильна функція не використана: `getMaximumStandardSpellSlots` — src/rules/spellcasting.ts:31-37. Лист малює `cur/max` без обрізання (`src/lib/components/characterSheet/slides/MagicSlide.tsx:701-704, 726-729`), тож гравець побачить «3/2».

**Відтворення:** Персонаж 2024 паладин 5 рівня → витратити комірки → «Довгий відпочинок» → на слайді Магії 2-й рівень показує 3/2, з'являються 3-і комірки.

**Куди дивитись:** У `longRest` замінити `getMaxSpellSlots(pers.level)` на `getMaximumStandardSpellSlots(toRulesSpellcastingCharacter(persForSlots), SPELL_SLOT_PROGRESSION.FULL, pers.ruleset)` і видалити приватну таблицю. Задокументовано як BUG-010 (docs/KNOWN-BUGS.md:240-253, статус «відкрито») — підтверджую, що досі відтворюється.

**Файли:** `src/server/db/rest-actions.ts`, `src/rules/spellcasting.ts`, `docs/KNOWN-BUGS.md`


### L17-known-registries-05 — BUG-013 живий: тривалий відпочинок повертає всі кубики здоровʼя й персонажу 2014, якому книга дає половину

**Рівень:** P1 · **Редакція:** 2014 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

✅ **Закрито в KR31.12, 2026-09-06.** Дублікат `L16-ruleset-isolation-06` — та сама правка.

**Правило:** data/2014/srd/06_Gameplay/Adventuring.md:174 — «The character also regains spent Hit Dice, up to a number of dice equal to half of the character's total number of them (minimum of one die). For example, if a character has eight Hit Dice, he or she can regain four spent Hit Dice.» Для 2024 — data/2024/srd/rules-glossary.md:1035, «all spent Hit Point Dice» (там поведінка випадково правильна).

**Має бути:** Після одного тривалого відпочинку персонаж 2014 з 8 кубиками, витраченими всіма, має 4.

**Є:** Має 8 — повний запас за один відпочинок.

**Доказ:** src/server/db/rest-actions.ts:296-298 — `const restoredHitDice = serializeHitDicePools(collectHitDicePools(pers).map((pool) => ({ ...pool, current: pool.max })));` — pers.ruleset у функції не читається. Програмна збірка (repro.test.ts, зелена): Воїн 2014 8 рівня, currentHitDice виставлено в {"1":0}, один longRest → L17-EVIDENCE BUG-013 2014 Fighter lvl8, 0/8 hit dice, after longRest: {"1":8}.

**Відтворення:** bunx vitest run --config .../vitest.audit.mts з include на repro.test.ts, третій кейс.

**Куди дивитись:** Гілка за pers.ruleset через наявний шар src/rules/strategies/: 2014 — min(max, current + max(1, floor(max/2))), 2024 — max. Змінює поведінку 9 394 живих персонажів 2014, тому потребує окремого рішення власника (як і записано в реєстрі).

**Файли:** `src/server/db/rest-actions.ts`, `src/rules/hit-dice.ts`, `docs/KNOWN-BUGS.md`

**Скептик:** ПРАВИЛО — підтверджено обидва оракули власним читанням. `data/2014/srd/06_Gameplay/Adventuring.md`, розділ «Long Rest»: «The character also regains spent Hit Dice, up to a number of dice equal to half of the character's total number of them (minimum of one die). For example, if a character has eight Hit Dice, he or she can regain four spent Hit Dice». `data/2024/srd/rules-glossary.md`, «Long Rest → Regain All HP»: «You regain all lost Hit Points and all spent Hit Point Dice». Редакції справді розходяться, і поточна поведінка коректна лише для 2024.

КОД — інших обробників немає. `rg -n "longRest" src/` дає рівно одну реалізацію (`src/server/db/rest-actions.ts:291`) і одного споживача (`RestButton.tsx:60` через реекспорт `src/lib/actions/rest-actions`); в `src/server/db/offline-operations.ts` слова «rest» немає взагалі, тож офлайн-черга цей шлях не дублює. `grep -n "ruleset" src/server/db/rest-actions.ts` — жодного входження на весь файл. Дочитав longRest до кінця: `restoredHitDice` пишеться в базу як є (`prisma.pers.update … currentHitDice: restoredHitDice as object`, ~рядок 393), нічого пізніше його не обрізає. У `src/rules/hit-dice.ts` ділення навпіл немає — `buildHitDicePools` лише читає збережене значення, `serializeHitDicePools` лише розкладає назад.

ВЛАСНИЙ ДОКАЗ (не повторення авторського) — чиста збірка без бази, `bun run scratchpad/audit/work/V-L17-05/hitdice.ts`: справжні `buildHitDicePools`/`serializeHitDicePools` з репо плюс той самий вираз `map(p => ({...p, current: p.max}))` із longRest, вхід `{"1":0}` при classLevel 8 → вихід `{"1":8}`. За 2014 має бути 4.

РІШЕННЯ ВЛАСНИКА — прийнятої поведінки немає. У `docs/KNOWN-BUGS.md` розділ «Прийнято (не буде виправлено)» (рядки 41–97) містить лише BUG-001…003; BUG-013 стоїть на рядку 345, тобто в розділі «Відкриті» (з рядка 98), зі статусом «відкрито». У `docs/DECISIONS.md` про кубики здоровʼя чи відпочинок рішення немає (Р31 — про майстерність зброї, Р26 — про бастіон і «попереджати, не блокувати» у виборах гравця, не про автоматичне відновлення ресурсу). Важливий нюанс, який автор передав правильно: реєстр каже, що виправлення відкладено **навмисно**, бо «змінює поведінку відпочинку для наявних персонажів 2014 і має бути окремим рішенням власника» — це відкладена робота, а не прийнята поведінка, тож classification лишається `bug`, а не `accepted`.

IN-FLIGHT — `src/server/db/rest-actions.ts` і `src/rules/hit-dice.ts` не входять у список файлів паралельної сесії (KR27.7/KR30.3) з CONTEXT.

ВІДКРИТИЙ KR — окремого KR під це немає. `rg -ln "rest-actions" docs/` дає KR2.4 (закритий, чекбокс «короткий і довгий відпочинок — golden» відмічений), KR18.8 і KR27.6 — жоден не про кубики здоровʼя. Golden `tests/golden/derived-state/rest-and-slots.json` пінує BUG-010, але позначки BUG-013 у ньому немає, тобто чинна (хибна) поведінка кубиків зафіксована як еталон і виправлення потребуватиме оновлення фікстури.

СЕРЙОЗНІСТЬ — P1 за буквою шкали («персонаж порахований не за книгою (числа)»): число кубиків здоровʼя після тривалого відпочинку розходиться з книгою для всіх 9 394 живих персонажів 2014, і ресурс, який за правилами відновлюється кілька днів, не вичерпується взагалі. Помʼякшення, яке варто мати на увазі при пріоритизації: гравець може виправити запас вручну (`HitDiceDialog` → `setHitDice`, `src/server/db/rest-actions.ts:490`), тож дані не губляться незворотно, і опис кнопки в UI («Повністю відновить HP, всі кубики здоровʼя…», `translation.ts:1683`) чесно описує наявну поведінку. Це тримає знахідку на межі P1/P2, але off-book число переважує — лишаю P1, як у автора.


### P4-regression-2014-05 — BUG-013 живий: longRest повертає всі кубики хітів обом редакціям, хоча 2014 дає половину

**Рівень:** P1 · **Редакція:** 2014 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06.** Дублікат `L16-ruleset-isolation-06` — та сама правка.

**Правило:** data/2014/srd/06_Gameplay/Adventuring.md:174 — «regains spent Hit Dice, up to a number of dice equal to half of the character's total number of them (minimum of one die)»; 2024 — data/2024/srd/rules-glossary.md:1035 «all spent Hit Point Dice».

**Має бути:** Для RULES_2014: current + max(1, floor(max/2)), обрізане максимумом; для RULES_2024: max.

**Є:** current = max для будь-якої редакції.

**Доказ:** src/server/db/rest-actions.ts:295-297: `const restoredHitDice = serializeHitDicePools(collectHitDicePools(pers).map((pool) => ({ ...pool, current: pool.max })));`. `grep -n "ruleset" src/server/db/rest-actions.ts` → жодного входження у файлі, тобто гілки за редакцією немає й після появи 2024. Запис уже стоїть у docs/KNOWN-BUGS.md:345 зі статусом «відкрито».

**Відтворення:** Витратити кубики хітів персонажем 2014, натиснути «Відпочинок» → тривалий: пул кубиків повертається повністю. (Перевірено читанням коду; прогін відпочинку в браузері не робив.)

**Куди дивитись:** Гілка за Pers.ruleset через src/rules/strategies/ + характеризаційний тест на обидві редакції. Потрібне рішення власника — змінює поведінку для наявних 9 394 персонажів 2014.

**Файли:** `src/server/db/rest-actions.ts`, `src/rules/hit-dice.ts`


### P5-druid-secondary-flows-02 — Копія персонажа не переносить дику форму, пули ресурсів і бастіон

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Має бути:** Копія несе прикріплені звірині форми, поточні залишки пулів (WILD_SHAPE, SORCERY_POINTS…) і бастіон із приміщеннями та ходами.

**Є:** Копія стартує без жодної прикріпленої форми, з порожніми пулами і без бастіону. Той самий код обслуговує копію папки (pers-actions.ts:430) і копію з чужої розшареної папки (share-actions.ts:616).

**Доказ:** PERS_DUPLICATION_INCLUDE (src/lib/logic/pers-duplication.ts:3-26) перелічує 20 звʼязків; у моделі Pers (prisma/schema.prisma) є ще `wildshapes PersWildshape[]`, `resourcePools PersResourcePool[]`, `bastion PersBastion?`. `grep -n "wildshape\|resourcePool\|bastion" src/lib/logic/pers-duplication.ts` → порожньо, тобто їх немає ані в include, ані в тілі clonePersWithRelations.

**Відтворення:** Прикріпити персонажу форму Дикої форми і створити бастіон → «Дублювати» → у копії форм немає, /char/<copy>/bastion пропонує створити новий.

**Куди дивитись:** Додати три звʼязки в PERS_DUPLICATION_INCLUDE і три блоки createMany/create у clonePersWithRelations (бастіон — разом із PersBastionFacility і PersBastionTurn).

**Файли:** `src/lib/logic/pers-duplication.ts`, `src/server/db/pers-actions.ts`, `src/server/db/share-actions.ts`


### P5-druid-secondary-flows-03 — Знімок персонажа — окрема друга реалізація копіювання, ще бідніша за першу; активація знімка нічого не відновлює

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Має бути:** «Відновитися зі знімка» повертає персонажа в збережений стан цілком: майстерність зброї, інфузії, дика форма, пули, бастіон, налаштування зброї й екіпірування магічних предметів.

**Є:** Знімок від початку неповний, а «активація» лише вмикає знімок як окремого персонажа — стан батька не відновлюється, персонажі множаться.

**Доказ:** src/server/db/snapshots.ts:19-226 не викликає clonePersWithRelations, а повторює її вручну. Не копіюються: pers_weapon_mastery, persInfusions, wildshapes, resourcePools, bastion, folderId, isPinned. Зброя копіюється пʼятьма полями (snapshots.ts:174-186) проти чотирнадцяти в копії персонажа (pers-duplication.ts:182-208) — губляться overrideDamage, attackBonus, overrideNormalRange/LongRange, overrideDamageType, overrideAttackAbility, isMagical, customAttackBonus, customDamageCount. Магічні предмети — без isEquipped і isAttuned (snapshots.ts:213-220). Виконано: work/P5-druid-secondary-flows/flows.json → "snapshotMastery": 0. Активація: activatePersSnapshot (snapshots.ts:245-247) робить лише `update … data: { isActive: true }` на знімку — батьківський персонаж не чіпається.

**Відтворення:** Створити знімок 2024-персонажа зі зброєю з оверрайдами і магічними предметами → активувати знімок → у листі немає майстерності, предмети не екіпіровані, оригінал лишився активним.

**Куди дивитись:** Провести знімок через clonePersWithRelations з overrides { isSnapshot: true, parentPersId, snapshotLevel, isActive: false } — одна реалізація замість двох; окремо визначити, що саме означає «активувати знімок».

**Файли:** `src/server/db/snapshots.ts`, `src/lib/actions/snapshot-actions.ts`, `src/lib/logic/pers-duplication.ts`


### L08-levelup-machine-09 — Відкотити рівень або виправити помилковий вибір неможливо: знімки є, відновлення немає

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** n/a (можливість зрілого білдера: D&D Beyond уміє «Revert level»/«Manage levels»)

**Має бути:** Гравець може скасувати щойно взятий рівень або перевибрати підклас/рису/виклик у тому самому персонажі, зберігши persId, шеринг, теку й бастіон.

**Є:** Єдиний вихід — скопіювати знімок у нового персонажа; старий, помилково піднятий, лишається, а всі посилання (шеринг, тека, бастіон, друк) вказують на нього.

**Доказ:** Знімок робиться перед кожним підвищенням — прогін дав знімки рівнів 1..5 у воїна 6-го рівня, усі isActive:false. Серверна дія відновлення мертва: grep -rn "activateSnapshot" src/ → лише визначення src/lib/actions/snapshot-actions.ts:35, жодного виклику. Сама дія й не є відкотом: activatePersSnapshot (src/server/db/snapshots.ts:246) робить pers.update({data:{isActive:true}}) над копією. У UI (src/lib/components/characterSheet/SnapshotHistoryModal.tsx:72-84) є лише «Скопіювати» → duplicatePers(snapshotId), що створює НОВОГО персонажа з новим persId. Виправити вибір теж нічим: updateCharacterAction (src/lib/actions/update-character.ts:10-29) редагує лише текстові поля й монети.

**Відтворення:** Підвищити рівень із помилковим підкласом → відкрити «Історія» на листі → доступна лише кнопка «Скопіювати», яка веде на /char/<новий id>.

**Куди дивитись:** Або дати чесний відкат (перезалити стан знімка в оригінальний persId у транзакції й видалити знімки вище), або принаймні під'єднати activateSnapshot з переносом persId; це KR із DDL-рішенням власника.

**Файли:** `src/lib/actions/snapshot-actions.ts`, `src/server/db/snapshots.ts`, `src/lib/components/characterSheet/SnapshotHistoryModal.tsx`


### L12-secondary-flows-02 — Знімок рівня втрачає майстерність зброї, ресурси класу, дику форму, бастіон, інфузії та всі бойові налаштування зброї й стан магічних предметів

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт скептика:** downgraded

**Правило:** n/a (втрата збереженого вибору гравця)

**Має бути:** Знімок — повна фотографія персонажа на рівні; відкат до нього має повернути гравцеві те, що в нього було.

**Є:** Знімок 2024-персонажа не має ані майстерності зброї, ані бастіону, ані звіриних форм, ані лічильників ресурсів; зброя втрачає всі перевизначення, магічні предмети — стан вдягнення й налаштування.

**Доказ:** Прогін на паладині 2024: оригінал має `pers_weapon_mastery`=3, `pers_resource_pool`=1, `pers_wildshape`=1, `pers_bastion`=1; знімок — 0/0/0/0 (report.json, ключ `afterSnapshot`). Код: `src/server/db/snapshots.ts:20-34` — include без `pers_weapon_mastery`, `resourcePools`, `wildshapes`, `bastion`, `persInfusions`; вставка зброї `snapshots.ts:169-180` копіює лише 6 із 15 полів `PersWeapon` (`prisma/schema.prisma:899-922` — відсутні overrideDamage, attackBonus, overrideNormalRange, overrideLongRange, overrideDamageType, overrideAttackAbility, customAttackBonus, customDamageCount, isMagical); вставка предметів `snapshots.ts:203-210` не переносить `isEquipped`/`isAttuned` (`prisma/schema.prisma:815-816`).

**Відтворення:** Створити персонажа 2024 з майстерністю зброї й бастіоном, підвищити рівень (знімок створюється сам), відкрити знімок з історії — блоки майстерності й бастіону порожні. Або: `createCharacterSnapshot(persId)` і порівняти `select count(*) from pers_weapon_mastery where pers_id in (оригінал, знімок)`.

**Куди дивитись:** Звести знімок на той самий `clonePersWithRelations` + `PERS_DUPLICATION_INCLUDE` з перевизначеннями `isSnapshot/snapshotLevel/parentPersId/isActive`, а сам include доповнити (див. знахідку 03). Три копії одного коду — корінь розходження.

**Файли:** `src/server/db/snapshots.ts`, `src/lib/logic/pers-duplication.ts`

**Скептик:** ПРАВИЛО. `rule_source` = n/a справедливо: це не питання книги, оракул не потрібен. Перевіряв лише код і базу.

КОД — власний прогін, не читання. Створив персонажа 2024 напряму в `spells_test` зі зброєю, де виставлені ВСІ перевизначення, з рядком `pers_weapon_mastery`, магічним предметом `isEquipped/isAttuned = true`, пулом ресурсу, дикою формою й бастіоном, викликав `createPersSnapshot` і порівняв рядки (тест і результат — у `work/V-L12-02b/`).

**Спростовано (знахідка застаріла).** Заголовок «втрачає майстерність зброї» більше не істинний: у моєму прогоні `mastery` знімка = **1**, `ruleset` = **RULES_2024**. Дерево правили 2026-09-04 о 23:27 — через годину після прогону автора (його `report.json` має мітку 22:27). `git diff` показує незакомічені правки в обох файлах: у `snapshots.ts` додано `pers_weapon_mastery: true` в include, `createMany` для неї і `ruleset: pers.ruleset`; те саме в `pers-duplication.ts`. Зʼявився гейт `tests/logic/pers-copy-fields.test.ts`, який звіряє скалярні стовпці `Pers` зі списками обох копій. У тому ж гейті `folderId` і `isPinned` **навмисно** внесені в `skipped` для знімка — тобто ця частина знахідки тепер прийнята поведінка, а не дефект.

**Підтверджено власним доказом (залишок).** Знімок і далі не переносить: `resourcePools` = 0, `wildshapes` = 0, `bastion` = 0, `persInfusions` = 0. Зброя: `overrideDamage`, `attackBonus`, `overrideNormalRange`, `overrideLongRange`, `overrideDamageType`, `overrideAttackAbility`, `customDamageCount`, `isMagical` — усі `null`/`false` у знімку при заповнених в оригіналі (`snapshots.ts:178-190` копіює 6 полів із 15). Магічний предмет: `isEquipped`/`isAttuned` = `false` (`snapshots.ts:225-232`). Останнє має числовий наслідок: `bonus-calculator.ts:87-92` пропускає предмет без `isEquipped` (і без `isAttuned`, якщо той вимагає налаштування), тож лист знімка малює інший КЗ/атаку, ніж мав персонаж на тому рівні. Гейт `pers-copy-fields.test.ts` цього не ловить — він читає лише скалярні стовпці `Pers`, а не переліки полів у дочірніх `createMany`.

РІШЕННЯ ВЛАСНИКА. У `docs/DECISIONS.md` і `docs/KNOWN-BUGS.md` слова «знімок/snapshot» немає взагалі. Єдина дотична цитата — `docs/o19-bastions/kr19.2-bastion-foundation.md:202`: «знімок і поширений лист картки не показують: вести бастіон там нема кому» — це про **приховану картку** на читальному листі, а не про рішення не копіювати рядки. Прикриттям для знахідки не є.

IN-FLIGHT. `src/server/db/snapshots.ts` і `src/lib/logic/pers-duplication.ts` у списку паралельної сесії з CONTEXT **не значаться**, тому класифікацію `in-flight` не ставлю; але дерево тут явно рухалося після аудиту, і будь-який наступний прохід має перечитати файли, а не звірятися зі звітом.

ВЖЕ ВІДКРИТО. Відповідного KR у `docs/o2*/` не знайшов.

СЕРЙОЗНІСТЬ — знижую P1 → P2. Ключова помилка автора у формулюванні «Знімок — єдиний відкат гравця»: `activatePersSnapshot` (`snapshots.ts:255-257`) з UI **не викликається взагалі** — `activateSnapshot` не має жодного споживача поза `snapshot-actions.ts`, а `SnapshotHistoryModal.tsx` дає рівно дві дії: «Переглянути» (`/char/<snapshotId>`) і «Копіювати» через `duplicatePers`. Тобто відкату як заміни персонажа немає; оригінал після підвищення рівня лишається цілим і нічого зі свого не втрачає. Реальна шкода: (а) лист знімка показує числа, яких у персонажа на тому рівні не було, (б) копія зі знімка приходить без бастіону, звіриних форм, інфузій і налаштувань зброї — гравець мусить переналаштувати їх руками. Це «немає можливості / не можна відновити без ручної переробки» = P2 за шкалою CONTEXT, а не «вибір гравця губиться» безповоротно. Додатково: `resourcePools`/`wildshapes`/`bastion` губить і `clonePersWithRelations` — тобто ці три не є специфічними для знімка й уже описані окремою знахідкою L12-secondary-flows-03; власне знімкові тут лише перевизначення зброї, прапорці предмета та інфузії.


### L12-secondary-flows-07 — Короткий відпочинок відновлює використання до максимуму, а 2024 Rage / Wild Shape / Second Wind повертають рівно одне

**Статус:** ✅ закрито 2026-09-06 (KR31.3). Носіїв виявилося пʼять, а не три; від 2026-09-06 гілка доведена й наскрізно, на засіяних числах.

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Правило:** data/2024/srd/classes.md:3533 — «You can use Wild Shape twice. You regain **one** expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest» (те саме :238 Rage, :4798 Second Wind)

**Має бути:** Короткий відпочинок 2024 додає одне використання Люті / Дикої форми / Другого дихання.

**Є:** Виставляє максимум. Зараз замасковано знахідкою 06 (жодна фіча 2024 не має `limitedUsesPer`), тож гілка для 2024 не виконується — але щойно сід дасть використання, дефект стане тихим порушенням правил.

**Доказ:** `src/server/db/rest-actions.ts:196-206` — `data: { usesRemaining: maxUses }` для кожної фічі з `SHORT_REST`; `:213-236` — те саме для пулів. Жодної гілки «плюс одне» в файлі немає. Для 2014 поведінка правильна: `feature_id 2073 Second Wind` має `uses_count = 1`, тобто максимум і є одиниця (SQL на spells_test).

**Відтворення:** Після виправлення 06: друїд 2024 з 0/2 Дикої форми → короткий відпочинок → буде 2/2 замість 1/2.

**Куди дивитись:** Ввести на фічі поле «скільки повертає короткий відпочинок» (або гілку за редакцією в `rest-actions.ts`) і рахувати `min(max, remaining + regain)`; лагодити разом із сідом 06, інакше тест ні на чому перевірити.

**Файли:** `src/server/db/rest-actions.ts`

**Скептик:** Правило і код підтверджено власними доказами, тому знахідка не спростована. Але серйозність завищена, а класифікація неточна.

Чому не P1. Шкала CONTEXT: P1 — «персонаж рахується не за книгою або вибір гравця губиться». Сьогодні жодний персонаж 2024 так не рахується: у spells_test усі 547 фіч RULES_2024 мають limited_uses_per або null, або LONG_REST (3 рядки Magic Initiate), і жодна не має uses_pool_key. Гілка короткого відпочинку для 2024 не виконується взагалі — автор сам це пише («зараз замасковано знахідкою 06»). Спостережуваний дефект належить знахідці 06 (відпочинок 2024 не відновлює нічого); 07 — його тінь, яка оживає рівно тоді, коли 06 полагодять. Рахувати їх обидва як P1 — подвійний облік того самого релізного блокера. За шкалою це P2: немає можливості, яку має зрілий білдер (D&D Beyond веде «+1 за короткий відпочинок»), причому гравцеві лишається ручний «+»/«−» на слайді Рис (FeaturesSlide.tsx:413 restoreOneUse), тобто стан можна виправити без перестворення персонажа.

Чому missing-system, а не bug. Виправити не можна ні правкою рядка, ні прапорцем редакції. У 2024 співіснують обидві семантики короткого відпочинку: «повернути одне» (Лють :238, Дика форма :3533, Друге дихання :4798, Божественний канал клірика :2217 і паладина :5665) і «повернути все» (Джерело натхнення :910, Точки зосередження монаха :5155). Отже потрібне пофічеве поле, якого в схемі немає: RestType має лише SHORT_REST/LONG_REST/DAY (schema.prisma:1802), а «скільки повертається» не виражається ні через usesCount, ні через usesCountSpecial (той несе лише формули максимуму — feature-resources.ts). Тобто це DDL + гілка в чистих правилах + сід, ефорт M–L — відсутня система, а не баг однієї гілки.

Не in-flight (файл не в списку паралельної сесії; його незакомічений diff — рефактор кубиків здоров'я). Не accepted (у «Прийнято» KNOWN-BUGS лише BUG-001…003). Відкритого KR теж немає: KR24.6 свідомо лишив підключення пулів 2024 «поза межами» як сід контенту, і саме там варто дописати, що разом із пулом треба збудувати часткове відновлення — інакше зʼявиться тихе порушення правил замість помітної відсутності лічильника.


### L12-secondary-flows-09 — Довгий відпочинок повертає всі кубики здоровʼя обом редакціям — правильно для 2024, неправильно для 2014 (BUG-013 досі в коді)

**Рівень:** P2 · **Редакція:** 2014 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06.** Дублікат `L16-ruleset-isolation-06` — та сама правка.

**Правило:** 2024 — data/2024/srd/rules-glossary.md:1035: «You regain all lost Hit Points and all spent Hit Point Dice»; 2014 — data/2014/srd/06_Gameplay/Adventuring.md:174: «regains spent Hit Dice, up to a number of dice equal to half of the character's total number of them (minimum of one die)»

**Має бути:** 2014 — половина кубиків (мінімум один); 2024 — усі.

**Є:** Завжди всі, незалежно від `pers.ruleset`.

**Доказ:** `src/server/db/rest-actions.ts:277-279` — `collectHitDicePools(pers).map(pool => ({ ...pool, current: pool.max }))`. У `src/rules/hit-dice.ts` немає жодного ділення навпіл (grep `half|половин|ceil|floor` — порожньо). Прогін: `longRest` повернув `currentHitDice { "345": 5 }` для персонажа 5 рівня.

**Відтворення:** Персонаж 2014 8 рівня витрачає 8 кубиків → довгий відпочинок → має 8 замість 4.

**Куди дивитись:** Гілка за редакцією у `serializeHitDicePools`-виклику `longRest`; це вже BUG-013 (docs/KNOWN-BUGS.md:345-366) з приміткою, що правка змінює баланс 9 394 наявним персонажам і потребує рішення власника.

**Файли:** `src/server/db/rest-actions.ts`, `src/rules/hit-dice.ts`, `docs/KNOWN-BUGS.md`


### L12-secondary-flows-10 — Героїчного натхнення немає в моделі взагалі — людина 2024 не отримує його після довгого відпочинку, приміщення бастіону теж не дають

**Статус:** ✅ закрито 2026-09-09 (KR31.3). Колонка `pers.has_heroic_inspiration` (DDL 2026-09-08, у проді), правило в `src/rules/heroic-inspiration.ts`, видача в `longRest` носію `Human: Resourceful (2024)`, підказки на картках трьох приміщень бастіону — Noble Residence, Séance Parlor, Workshop (підказка, не автовидача, [Р26](../DECISIONS.md#р26)). Доведено наскрізно на `spells_test`.

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/character-origins.md:303 — Human, «_Resourceful._ You gain Heroic Inspiration whenever you finish a Long Rest»

**Має бути:** Прапорець Героїчного натхнення на листі, який довгий відпочинок вмикає людині-2024 і який гравець може витратити.

**Є:** Немає ані стовпця, ані UI, ані видачі — риса людини «Винахідливий» на листі нічого не робить.

**Доказ:** `grep -in "inspiration" prisma/schema.prisma` — жодного влучання; `grep -rln "натхнен" src/lib/components/characterSheet/` — порожньо. `longRest` (src/server/db/rest-actions.ts:380-405) виставляє лише HP, tempHp, кубики, комірки й ряткидки смерті. Водночас правило описане в довіднику застосунку (`src/lib/generated/rules-2024.json:361`), а три приміщення бастіону його дають (`src/lib/generated/bastions.json` — Workshop, Séance Parlor, Noble Residence).

**Відтворення:** Створити людину 2024, довгий відпочинок — на листі нічого не змінюється; шукати «натхнення» на листі — немає.

**Куди дивитись:** Булевий стовпець на `pers` (DDL у db/changes/), видача в `longRest` за наявності риси виду, перемикач на MainStatsSlide. Одна фіча, але новий стовпець — потрібен прогін власника.

**Файли:** `prisma/schema.prisma`, `src/server/db/rest-actions.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`

**Скептик:** ПРАВИЛО — підтверджено в оракулі. `data/2024/srd/character-origins.md:303`: «_Resourceful._ You gain Heroic Inspiration whenever you finish a Long Rest» (розділ #### Human). Сам механізм — `playing-the-game.md:417-425` і `rules-glossary.md:865-869` («expend it to reroll any die», «Human characters start each day with Heroic Inspiration»). Це саме 2024; у 2014 Натхнення існує, але видається лише майстром.

КОД — доказ автора відтворив незалежно і він точний. `grep -in "inspiration|натхнен" prisma/schema.prisma` — нуль. У `src/server/db/`, `src/lib/actions/`, `src/rules/`, `src/lib/logic/` слова `inspiration` немає взагалі. У компонентах і маршрутах єдине влучання «натхнення» — `characterCreator/modals/ClassInfoModal.tsx:66 label: "Кістка натхнення"` (кістка барда, інша сутність). `longRest` (`src/server/db/rest-actions.ts`, апдейт наприкінці) пише лише `currentHp, tempHp, currentHitDice, currentSpellSlots, currentPactSlots, deathSave*, isDead`. Персонаж має вільні текстові поля (`notes`, `customProficiencies`…), але спеціального трекера немає.

ДОДАТКОВО (сильніше за авторський доказ): риса засіяна як **PASSIVE без застосувань** — у `src/lib/generated/creator-content-2024.json` HUMAN_2024 → «Винахідливість | uses: null null | poolKey: null | display: ["PASSIVE"]», тобто навіть загальний механізм `limitedUsesPer`/`usesPoolKey`, який відновлює фічі на довгому відпочинку, тут не задіяний. Тому гравець не має ані прапорця, ані лічильника — лише текст риси.

РІШЕННЯ ВЛАСНИКА — прямого немає. Єдине дотичне — Р26 / `docs/o19-bastions/README.md:30`: бастіон «навіть якщо приміщення дає тимчасові хіти, стійкість, **натхнення**, феат чи предмет — показує або записує, але не застосовує». Це рішення знімає **бастіонну** частину доказу автора (три приміщення — свідомо show-only, не дефект), але людини-2024 і риси Musician не стосується: межа Р26 однобічна саме «бастіон → персонаж». У «Прийнято» docs/KNOWN-BUGS.md (BUG-001…003) цього немає.

IN-FLIGHT — ні, жоден із перелічених у CONTEXT файлів KR27.7/KR30.3 не зачеплено.

ВЖЕ ВІДКРИТО — ні. `grep -rn "Resourceful" docs/` порожній; у `docs/o18-2024-character-parity/reference-2024.md` Human описаний лише через другу Origin-рису й навичку (рядки 36, 300-305), критеріїв К1–К28 про натхнення немає. Тобто ціль паритету 2024 цю рису просто не помітила — це справді missing-system, а не забутий KR. Побічно: `docs/o6-rules-2024-import/kr6.2:336-337` трактує Heroic Inspiration як «не нову механіку, а перейменування наявного поняття» — тобто на етапі імпорту її свідомо провели як термін, а не як механіку.

СЕРЙОЗНІСТЬ — P2 правильна, підвищувати не треба. Жодне похідне число листа не стає хибним, вибір гравця не губиться, текст риси на листі є (риса зберігається як `PersFeature` — `src/server/db/character-generation` шлях `character-creation.ts:359 raceTraits`). Це відсутня можливість, яку має зрілий білдер (у D&D Beyond і на паперовому листі 2024 це окремий прапорець) — рівно визначення P2 з CONTEXT.


### L12-secondary-flows-11 — Співвласник за посиланням на редагування може назавжди видалити персонажа власника; знімки власника лишаються сиротами

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** n/a (доступ і втрата даних)

**Має бути:** Видалення персонажа — право власника; співвласник максимум відмовляється від доступу.

**Є:** Один клік у гостя знищує персонажа безповоротно, без підтвердження власника й без кошика; у базі лишаються сироти-знімки.

**Доказ:** `src/server/db/pers-actions.ts:194-215` — `deletePers` пускає будь-кого, кому `canEditPers` віддала `true`, і робить `prisma.pers.delete`. `canEditPers` (`pers-actions.ts:20-45`) віддає `true` кожному з `additionalUsers`, а рядок `pers_additional_users` створюється всім, хто відкрив посилання на редагування (`src/server/db/share-actions.ts:401-407`) або приєднався до спільної теки (`share-actions.ts:549-556`). Крім того `deleteMany({ where: { userId, parentPersId: persId } })` прибирає лише знімки того, хто видаляє; знімки власника лишаються з `parentpersid` на видалений рядок — каскаду немає, `parentPersId` це звичайний `Int?` (`prisma/schema.prisma:628`).

**Відтворення:** Власник A створює персонажа, генерує посилання на редагування, B його приймає; B на своєму /char/home натискає «Видалити» — персонаж A зникає.

**Куди дивитись:** Розділити `canEditPers` і `canDeletePers` (останнє — тільки `pers.userId === userId`); для співвласника кнопка має відв'язувати `PersAdditionalUser`, а не видаляти рядок. Знімки чистити за `parentPersId` без фільтра `userId`.

**Файли:** `src/server/db/pers-actions.ts`, `src/server/db/share-actions.ts`


### L19-parity-competitors-01 — Помилковий вибір при підвищенні рівня неможливо переграти: немає ні respec, ні зниження рівня, ні відкату до знімка — дія activateSnapshot існує, але з UI не викликається

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** n/a (паритет: D&D Beyond «Manage → Remove Level» + повний respec; Foundry — видалення class-item; DMV — перебудова будь-якого рівня)

**Має бути:** Гравець може відкотити останнє підвищення рівня (дані для цього вже збираються), переграти вибір ASI/риси/підкласу або зробити повний respec без втрати персонажа.

**Є:** Єдиний вихід — скопіювати знімок у нового персонажа (новий pers_id) або створити персонажа заново; посилання шеринга і теки при цьому втрачаються.

**Доказ:** `src/lib/actions/snapshot-actions.ts:34` визначає `activateSnapshot`, а `src/server/db/levelup-persistence.ts:1094-1095` робить знімок автоматично перед кожним підвищенням («// Create snapshot before changes» + `await createCharacterSnapshot(persId)`). Але `grep -rn "activateSnapshot" src/ --include=*.tsx` — порожньо; `SnapshotHistoryModal.tsx` (162 рядки) має лише `Button title="Переглянути"` (:135) і `onClick={() => handleCopy(snapshot.persId)}` (:144). `grep -rni "respec|changeSubclass|levelDown|знизити рівень" src/` — жодного збігу.

**Відтворення:** Відкрити /char/<id> → «Історія» → у списку знімків доступні лише «Переглянути» і «Копіювати»; кнопки повернення до знімка немає.

**Куди дивитись:** Додати в `SnapshotHistoryModal.tsx` кнопку «Відновити», що кличе вже наявний `activateSnapshot`; окремим KR — перепрохід майстра рівня для існуючого рівня (respec).

**Файли:** `src/lib/components/characterSheet/SnapshotHistoryModal.tsx`, `src/lib/actions/snapshot-actions.ts`, `src/server/db/snapshots.ts`, `src/server/db/levelup-persistence.ts`

**Скептик:** Спростувати не вдалося — ядро знахідки стоїть, і я довів його незалежно.

(1) ПРАВИЛО: оракул тут не потрібен — це паритет можливостей, не правило книги (`rule_source: n/a` коректний). Претензій до редакції немає.

(2) КОД: `grep -rn "activateSnapshot\|activatePersSnapshot" src/ tests/ docs/` (без `src/lib/generated`) дає рівно 5 рядків: визначення `src/server/db/snapshots.ts:259`, імпорт+дія `src/lib/actions/snapshot-actions.ts:6,35,46` і тест `tests/actions/snapshot-actions.test.ts:5,63`. Жодного виклику з UI. `SnapshotHistoryModal.tsx` прочитаний повністю (162 рядки): імпортує лише `getSnapshots` і `duplicatePers`, кнопок дві — «Переглянути» (:135, `Link` на `/char/<snapshotId>`) і «Скопіювати» (:144 → `duplicatePers`). Змінити підклас поза майстром теж нічим: `updatePersSubclass` (`src/server/db/legacy-levelup.ts:8`) має єдиного викликача — `src/lib/actions/character-transaction.ts:52`, тобто транзакцію підвищення.

Більше того — знахідка навіть недооцінює діру: `activatePersSnapshot` це один рядок `pers.update({data:{isActive:true}})` над копією, а `src/server/db/pers-access-filters.ts:13` (`OR: [{isSnapshot:false},{isSnapshot:true,isActive:true}]`) показує, що «активація» лише **показує знімок у списку як ще одного персонажа**; батьківський `pers` не змінюється. Тест `tests/actions/snapshot-actions.test.ts:63-68` фіксує саме це і нічого більше. Отже приєднати кнопку до наявної дії — не відкат; систему треба писати.

(3) РІШЕННЯ ВЛАСНИКА: у `docs/DECISIONS.md` 41 рішення (Р1–Р41, колізію Р33 знято 2026-09-07) — про респек/зниження рівня/відкат жодного; `docs/KNOWN-BUGS.md` «Прийнято» містить лише BUG-001…003 (валідація підкласу/опцій/риси при створенні); у «Поза межами» O18/O27/O22 збігів немає. Найближче до «прийнято» — підпис у самій модалці (`SnapshotHistoryModal.tsx:155-157`): «потрібно зіграти іншим рівнем? скопіюйте з історії!». Це продуктова підказка, що копія і є відповіддю, але не записане рішення власника, тож `accepted` не ставлю — варте питання власнику.

(4) IN-FLIGHT: жоден із файлів (`snapshot-actions.ts`, `snapshots.ts`, `SnapshotHistoryModal.tsx`, `levelup-persistence.ts`) не в списку паралельної сесії (KR27.7/KR30.3).

(5) ВІДКРИТИЙ KR: немає. Таблиця цілей `docs/README.md` (O1–O30) не містить цілі про респек/історію/відкат; `грep` по `docs/**/*.md` дає лише згадку в `o19-bastions/kr19.5` про перевикористання форматування модалки. Це нова, не запланована система.

(6) СЕРЙОЗНІСТЬ: P2 за шкалою CONTEXT («немає можливості, яку має зрілий білдер, або не можна виправити без перестворення»). На P1 не тягне: вибір гравця не губиться і числа рахуються за книгою — його просто не можна переграти.

Одне уточнення, де автор перебрав. «Переграти вибір ASI/риси» частково можливо вже зараз: `FeaturesSlide.tsx:816` монтує `FeatsSheetManagerModal`, який кличе `addFeatToPers`/`removeFeatFromPers` (`src/lib/actions/feat-actions.ts:28,53`), а `ModifyStatModal` (змонтований у `MainStatsSlide.tsx:1059`, `SkillsSlide.tsx:147`, `MagicSlide.tsx:1324`) перекриває характеристику в режимі BASE/BONUS. Без жодного шляху лишаються саме рівень, підклас і класові/підкласові опції — цього достатньо, щоб знахідка трималася на P2.

Дрібна помилка в `repro`: модалка «Історія» живе не на листі `/char/<id>`, а в меню картки списку — `src/app/char/home/CharHomeClient.tsx:652` (`noButtonTrigger`), той самий клієнт обслуговує й `/2024/char/home` (`src/app/2024/char/home/page.tsx:45`). Крок відтворення треба виправити на «/char/home → меню картки → Історія».


### L19-parity-competitors-12 — Немає ні експорту, ні імпорту JSON — персонажа неможливо ні зберегти собі, ні перенести у VTT

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** n/a (паритет: Pathbuilder і DMV дають JSON-експорт, який імпортують модулі Foundry/Roll20)

**Має бути:** Кнопка «Експортувати JSON» (резервна копія + перенесення) і, симетрично, імпорт.

**Є:** Персонаж живе тільки в цій базі; жодного машинно-читного виходу.

**Доказ:** `grep -rni "exportCharacter|importCharacter|downloadJson|export.*json" src/lib/actions src/app/char src/lib/components/characterSheet` — жодного збігу. Наявне: PDF (`src/server/pdf/generateCharacterPdf.ts:1259`), друк (`PrintCharacterDialog.tsx`) і посилання шеринга (`ShareDialog.tsx`).

**Куди дивитись:** Серверна дія, що віддає вже наявний `PERS_DUPLICATION_INCLUDE`-граф (`src/lib/logic/pers-duplication.ts`) як JSON; імпорт — окремим кроком через ті самі серверні дії створення.

**Файли:** `src/lib/logic/pers-duplication.ts`, `src/lib/components/characterSheet/PrintCharacterDialog.tsx`


### L12-secondary-flows-12 — Сторінка спільної теки не віддає ані редакції, ані мультикласу персонажа

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (UX і паритет із власним списком)

**Має бути:** У спільній теці персонаж підписаний так само, як у власному списку — усі класи мультикласу й редакція.

**Є:** Мультикласовий персонаж підписаний лише базовим класом; персонажа 2014 від 2024 у спільній теці не відрізнити.

**Доказ:** `src/server/db/share-actions.ts:477-493` — вибірка для `/char/folder/share/[token]` бере `race`, `class`, `background`, але не `ruleset` і не `multiclasses`. Власний список бере `multiclasses: { include: { class: true, subclass: true } }` і будує `classNames`/`subclassNames` (`src/server/db/pers-actions.ts:134-143`, `:246-260`).

**Відтворення:** Створити теку з мультикласовим персонажем 2024, поділитися нею, відкрити `/char/folder/share/<token>` — картка показує один клас і жодної позначки редакції.

**Куди дивитись:** Додати `ruleset: true` і `multiclasses` у `select` у `getFolderByShareToken`, підпис зібрати тим самим кодом, що й у `getUserPersHomeData`.

**Файли:** `src/server/db/share-actions.ts`, `src/lib/components/characterFolder/SharedFolderView.tsx`


## Походження (10)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P1 | 2024 | bug | `L02-backgrounds-01` | Конструктор 2024 ніколи не показує крок «Опції риси походження», тож риса походження з виборами (Посвячений у магію, Умілець) створюється порожньою — 6 із 16 походжень | src/lib/components/characterCreator/MultiStepForm.tsx, src/lib/components/characterCreator/creation-step-resolver.ts |
| · | P1 | 2024 | data | `L02-backgrounds-02` | Походження не фіксує список заклинань «Посвяченого у магію»: книга дає Magic Initiate (Cleric/Wizard/Druid), база — одну рису з вільним вибором списку | prisma/schema.prisma, data/2024/normalized/backgrounds.json |
| · | P1 | 2024 | bug | `P1-human-fighter-03` | Бонуси характеристик від походження (+2 Сила / +1 Статура Солдата) не застосовуються — Сила лишається 15 замість 17 | src/server/db/character-creation.ts, src/rules/background-asi.ts |
| ✓ | P1 | 2024 | bug | `P2-elf-wizard-03` | ASI походження (+2 ІНТ / +1 СТА від Мудреця) мовчки викидається: ІНТ 15 замість 17, КС заклинань 12 замість 13, атака +4 замість +5 | src/rules/background-asi.ts, src/server/db/character-creation.ts |
| ✓ | P1 | 2024 | bug | `P2-elf-wizard-07` | Риса походження 2024 (Magic Initiate у Мудреця) чіпляється без жодного вибору — кроку «Опції риси походження» не існує для всіх 16 походжень 2024 | src/lib/components/characterCreator/MultiStepForm.tsx, src/lib/components/characterCreator/creation-step-resolver.ts |
| · | P1 | 2024 | bug | `P3-multiclass-wizard-cleric-02` | Розподіл характеристик походження (+2/+1) мовчки губиться — INT 15 замість 17, WIS 14 замість 15 | src/rules/character-creation.ts, src/rules/background-asi.ts |
| · | P2 | 2024 | missing-system | `L02-backgrounds-03` | Зброя й речі зі стартового пакунка походження лягають вільним текстом, а не в інвентар — списом і кинджалами не можна битися | src/server/db/character-creation.ts, src/rules/background-equipment.ts |
| · | P2 | 2024 | missing-system | `L02-backgrounds-04` | Конкретний ігровий набір / музичний інструмент / реміснича спеціальність ніколи не обираються — і у володіннях, і в майні лишається «(на вибір)» | src/lib/components/characterCreator/MultiStepForm.tsx, src/lib/components/characterCreator/creation-step-resolver.ts |
| · | P2 | both | missing-system | `L02-backgrounds-05` | Походження й будь-який його вибір не можна змінити після створення — тільки перестворити персонажа | src/lib/actions/update-character.ts, src/server/db/pers-details.ts |
| · | P3 | 2024 | data | `P1-human-fighter-16` | Володіння Солдата «оберіть один ігровий набір» не обирається — записано узагальнене «Ігровий набір» | data/2024/normalized/backgrounds.json, prisma/seed/ |

### L02-backgrounds-01 — Конструктор 2024 ніколи не показує крок «Опції риси походження», тож риса походження з виборами (Посвячений у магію, Умілець) створюється порожньою — 6 із 16 походжень

**Стан KR31.2, 2026-09-05: 🟡 частково.** Крок фіксованої риси походження 2024 увімкнений у MultiStepForm; jsdom 4/4 із доведеним зламом. Повне збереження всіх видів виборів у браузерному проході ще не перевірене. Докази — у [журналі KR31.2](kr31.2-class-choices-2024.md).

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/character-origins.md:36 «**Feat:** Magic Initiate (Cleric) (see "Feats")»; data/2024/srd/feats.md:37-39 «You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list… Choose a level 1 spell from the same list»; feats.md:55 «You gain proficiency in any combination of three skills or tools of your choice»

**Має бути:** Служитель/Мудрець/Провідник отримують два замовляння, одне заклинання 1 рівня й характеристику замовляння від Посвяченого у магію; Шахрай/Шляхтич/Писар отримують три володіння від Умільця.

**Є:** Крок вибору не рендериться взагалі; риса прикріплюється порожньою, і добрати вибори потім нічим: updateCharacterAction таких полів не має, FeatsSheetManagerModal.tsx не згадує жодного ChoiceOption, PersFeatChoice пишеться лише в character-creation.ts:339, levelup-persistence.ts:1128, snapshots.ts:166, share-actions.ts:805.

**Доказ:** MultiStepForm.tsx:275-277: `hasBackgroundFeatChoice = (bg?.gainsFeats?.length ?? 0) > 0` і `backgroundFeat = feats.find(f => f.featId === formData.backgroundFeatId)`. У 2024 риса приходить полем `Background.originFeatId`, а `gainsFeats` порожній — перевірено на всіх 16 походженнях у src/lib/generated/creator-content-2024.json (`"gainsFeats": []`, `originFeatId` непорожній). Браузер (:3100, work/L02-backgrounds/steps-check.mjs, чернетка в localStorage `dnd-2024-pers-form`): для ACOLYTE, NOBLE_2024 і SOLDIER_2024 перелік `[data-step-id]` однаковий — ["race","class","classChoices","weaponMastery","background","asi","skills","languages","equipment","name"], кроків backgroundFeat/backgroundFeatChoices немає. Зонд справжньої серверної дії createCharacter без backgroundFeatChoiceSelections (work/L02-backgrounds/acolyte.test.ts, spells_test): Служитель — feats [{featId:3029, MAGIC_INITIATE}], persSpells: [], spells: [], PersFeatChoice: []; Шляхтич — feats [{Skilled}], skills лише [HISTORY, PERSUASION].

**Відтворення:** 1. http://127.0.0.1:3100/2024/char, вид Дворф 2024, клас Воїн 2024. 2. Крок «Передісторія» → Послушник (Acolyte). 3. Пройти майстра до кінця — кроку «Опції риси походження» немає. 4. На листі персонажа є риса «Посвячений у магію» без жодного заклинання. Те саме з Шляхтичем (Skilled) — жодної з трьох навичок.

**Куди дивитись:** MultiStepForm.tsx:276 — брати рису як feats.find(f => f.featId === (formData.backgroundFeatId ?? bg?.originFeatId)); сервер уже приймає backgroundFeatChoiceSelections і сам підставляє background.originFeatId (character-creation.ts:853). Тест: приймальний набір подає вибори повз UI (tests/helpers/build-2024-character.ts:105), тому потрібен окремий тест на resolveCreationSteps з походженням 2024.

**Файли:** `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/server/db/character-creation.ts`, `src/lib/generated/creator-content-2024.json`

**Скептик:** Перевірив усі шість пунктів; знахідка підтверджується власними доказами.

(1) ПРАВИЛО — оракул цитований вірно. `data/2024/srd/character-origins.md`: «#### Acolyte … **Feat:** Magic Initiate (Cleric)»; `feats.md`: Magic Initiate — «You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list… Choose a level 1 spell from the same list. You always have that spell prepared. You can cast it once without a spell slot», Skilled — «You gain proficiency in any combination of three skills or tools of your choice». Це саме 2024 (Origin Feat, редакційно окремий розділ SRD 5.2.1).

(2) КОД — обробки в іншому місці немає.
• Маршрут `/2024/char` рендерить той самий `MultiStepForm` (src/app/2024/char/page.tsx:36), інших конструкторів немає.
• `hasBackgroundFeatChoice = (bg?.gainsFeats?.length ?? 0) > 0` (MultiStepForm.tsx:275) — власним запитом по `src/lib/generated/creator-content-2024.json` підтвердив: у **всіх 16** походжень 2024 `gainsFeats: []`, `originFeatId` непорожній.
• `formData.backgroundFeatId` виставляється **лише** у `BackgroundFeatsForm.tsx` (рядки 43, 189, 220) — а той рендериться тільки на кроці `backgroundFeat`, який і не зʼявляється. Ланцюг замкнений: крок `backgroundFeatChoices` недосяжний у 2024 за побудовою.
• Сервер компенсації не робить: `character-creation.ts:854` `validData.backgroundFeatId ?? background.originFeatId` чіпляє рису, а вибори бере лише з `validData.backgroundFeatChoiceSelections`, які UI не заповнює. Жодної валідації «риса має вибори — вимагай їх» немає.
• Добрати потім нічим: єдиний післястворювальний писар `PersFeatChoice` — `addPersFeat(persId, featId, choiceOptionIds?)` (src/server/db/feat-actions.ts:58-84), і єдиний його виклик з UI — `FeatsSheetManagerModal.tsx:78` `addFeatToPers({ persId, featId: feat.featId })` — **без** `choiceOptionIds`. Крок `feat-choices` у `LevelUpWizard` привʼязаний до `selectedFeat` цього підвищення (LevelUpWizard.tsx:281), не до наявних рис.

(3) РІШЕННЯ ВЛАСНИКА — немає. У `docs/KNOWN-BUGS.md` є лише BUG-003 про **зворотну** проблему (`backgroundFeatId` не звіряється з `gainsFeats`), у `docs/DECISIONS.md` — тільки таблиця категорій рис. Навпаки, `creation-step-rule-links.ts:36-49` у мапі **RULES_2024_ANCHORS** явно тримає посилання для `backgroundFeat` і `backgroundFeatChoices` («parts-of-a-background--feat»), а в `STEPS_WITHOUT_RULE_ARTICLE.RULES_2024` їх немає — тобто конфіг очікує ці кроки в 2024, і сьогодні ці записи мертві.

(4) IN-FLIGHT — ні. `MultiStepForm.tsx`, `creation-step-resolver.ts`, `character-creation.ts`, `creator-content-2024.json` не в списку файлів паралельної сесії.

(5) ВЖЕ ВІДКРИТО — ні. KR18.3 закрив серверний бік («К8 · риса сама породжує вибори ✅ Skilled 18 опцій, Magic Initiate 3»), KR27.4 додав аналогічний крок «Опції риси виду» для Людини 2024 і прямо пише, що форма вже мала `backgroundFeatChoiceSelections», тобто фоновий бік вважали робочим. Відкритого KR на цю прогалину немає.

(6) СЕРЙОЗНІСТЬ — P1 правильна: персонаж рахується не за книгою (втрачені 2 замовляння + заклинання 1 рівня + характеристика замовляння, або 3 володіння), виправити без перестворення неможливо. Не P0 — створення не падає, дані не втрачаються.


### L02-backgrounds-02 — Походження не фіксує список заклинань «Посвяченого у магію»: книга дає Magic Initiate (Cleric/Wizard/Druid), база — одну рису з вільним вибором списку

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:36 (Acolyte) «**Feat:** Magic Initiate (Cleric)», :54 (Sage) «Magic Initiate (Wizard)»; data/2024/normalized/backgrounds.json — Guide: originFeat.engName «Magic Initiate (Druid)»

**Має бути:** Служитель дістає список клірика, Мудрець — чарівника, Провідник — друїда, без вибору.

**Є:** Список — вільний вибір із трьох; походження його ніяк не звужує. Навіть коли крок із знахідки 01 зʼявиться, Мудрець зможе взяти список клірика.

**Доказ:** Запит до spells_test: `select b.name, f.name from background b join feat f on f.feat_id=b.origin_feat_id where b.ruleset='RULES_2024'` → ACOLYTE|MAGIC_INITIATE, SAGE_2024|MAGIC_INITIATE, GUIDE_2024|MAGIC_INITIATE (feat_id=3029 в усіх трьох). Її feat_choice_option — три нічим не обмежені опції: 3379 «Клірик», 3380 «Друїд», 3381 «Чарівник». Каталог /2024/backgrounds при цьому показує конкретику: «Риса походження: Посвячений у магію (Клірик) [Magic Initiate (Cleric)]» (скрін scratchpad/audit/shots/L02-7-catalog-2024.png), бо бере originFeat.engName із нормалізованого файлу.

**Відтворення:** Запит вище до spells_test; порівняти з рядком «Риса походження» на /2024/backgrounds для Служителя, Мудреця й Провідника.

**Куди дивитись:** Або окремі рядки feat під кожен список (як у 5etools), або поле-обмежувач на background (напр. origin_feat_choice_option_id), яке конструктор проставляє замість запитання. Потрібен DDL.

**Файли:** `prisma/schema.prisma`, `data/2024/normalized/backgrounds.json`, `src/server/db/character-creation.ts`, `src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx`


### P1-human-fighter-03 — Бонуси характеристик від походження (+2 Сила / +1 Статура Солдата) не застосовуються — Сила лишається 15 замість 17

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:57-62 — «#### Soldier / **Ability Scores:** Strength, Dexterity, Constitution»; у 2024 бонуси до характеристик дає походження

**Має бути:** Сила 15+2 = 17 (мод +3, РятК +5, Дворучний меч 2d6+3 / влучання +5); Статура 14+1 = 15

**Є:** Сила 15, Статура 14; усі похідні числа занижені на 1

**Доказ:** Крок конструктора вибір прийняв і показав: «Сила +2, Спритність +0, Статура +1» (shots/P1-human-fighter-13-asi-done.png). Після створення: select str,dex,con from pers where pers_id=16 → str 15, dex 13, con 14. Лист: «СИЛ 15 +2 РятК +4», атака Дворучним мечем «2d6+2 … +4 ВЛУЧАННЯ» (shots/P1-human-fighter-19-sheet-lvl1.png). Той самий білд через хелпер із ruleset RULES_2024 (pers_id=6) → str 17.

**Відтворення:** Ті самі кроки, що в 01; на кроці «Характеристики» обрати «+2 і +1», Кому +2 → Сила, Кому +1 → Статура; після «Створити» подивитися лист

**Куди дивитись:** Наслідок P1-human-fighter-01: buildInitialCharacterState({ruleset,...}) і findBackgroundAsiProblem(ruleset,...) отримують RULES_2014, де бонусів походження немає (src/server/db/character-creation.ts:180-205)

**Файли:** `src/server/db/character-creation.ts`, `src/rules/background-asi.ts`


### P2-elf-wizard-03 — ASI походження (+2 ІНТ / +1 СТА від Мудреця) мовчки викидається: ІНТ 15 замість 17, КС заклинань 12 замість 13, атака +4 замість +5

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/character-origins.md:51 — Sage: «Ability Scores: Constitution, Intelligence, Wisdom»; character-creation.md — у 2024 бонуси до характеристик дає походження (+2/+1 або +1/+1/+1)

**Має бути:** СТА 15 (+2), ІНТ 17 (+3); КС заклинань 8+2+3=13, атака заклинанням +5, Магія/Історія +5

**Є:** СТА 14, ІНТ 15; КС 12, атака +4, Магія/Історія +4. Помилки чи попередження гравцю не показано — вибір просто зникає

**Доказ:** Крок «Характеристики» показує правильний підсумок «Статура +1 Інтелект +2 Мудрість +0» (shots/P2-elf-wizard-06a-asi-done.png). Наступний екран «Імʼя», блок «Фінальні характеристики» — СТА 14, ІНТ 15 (shots/P2-elf-wizard-07e-name-filled.png). У базі: {"str":8,"dex":13,"con":14,"int":15,"wis":12,"cha":10}. Лист /char/8: «БОНУС АТАКИ ЗАКЛИНАННЯМИ +4», «СК (СКЛАДНІСТЬ РЯТКИДКА) 12», Магія +4, Історія +4 (shots/P2-elf-wizard-08a-sheet-8.png). Причина: src/rules/background-asi.ts:32 — if (ruleset !== "RULES_2024") return null; у поєднанні з P2-elf-wizard-01.

**Відтворення:** 1) /2024/char, Мудрець 2024 2) на кроці «Характеристики» обрати «+2 і +1»: Кому +2 → Інтелект, Кому +1 → Статура 3) дійти до кроку «Імʼя» — блок «Фінальні характеристики» вже без бонусів 4) створити → select int, con from pers

**Куди дивитись:** Полагодити P2-elf-wizard-01; додатково — не приймати мовчки вибір, який далі відкидається: якщо ruleset != RULES_2024, крок «Бонуси походження» не має показуватися взагалі

**Файли:** `src/rules/background-asi.ts`, `src/server/db/character-creation.ts`, `src/lib/components/characterCreator/BackgroundAsiForm.tsx`

**Скептик:** (1) ПРАВИЛО — підтверджено в оракулі: `data/2024/srd/character-origins.md:48-53` «Sage — **Ability Scores:** Constitution, Intelligence, Wisdom», а `data/2024/srd/character-creation.md:483` «adjust them according to your background. Your background lists three abilities; increase one of those scores by 2 and a different one by 1, or increase all three by 1». Це саме редакція 2024; у 2014 бонуси дає раса. У базі `background SAGE_2024` має `ability_options = ["CON","INT","WIS"]` — дані правильні.

(2) КОД — обробки в іншому місці немає, і я довів це не читанням, а прогоном. Ланцюг: `src/lib/components/characterCreator/MultiStepForm.tsx:90` читає `formData.ruleset`, але **жоден** файл у `src/lib/components/characterCreator/` і `src/lib/stores/persFormStore.ts` його не записує (grep по `ruleset` — лише читання й ключ чернетки) → payload із браузера йде без поля → `src/lib/zod/schemas/persCreateSchema.ts:294` `z.enum([...]).default("RULES_2014").optional()`. Перевірив поведінку zod 4.1 окремо: `parse({})` → `{"ruleset":"RULES_2014"}`, тобто `??` у `src/server/db/character-creation.ts:180` ніколи не доходить до `characterClass.ruleset`. Далі `src/rules/character-creation.ts:88-92` застосовує `applyBackgroundASI` лише під `if (ruleset === "RULES_2024")`, а `findBackgroundAsiProblem` (`src/rules/background-asi.ts:32`) під 2014 повертає `null` — тому й помилки гравцю немає.

(3) РІШЕННЯ ВЛАСНИКА — не покрито. У `docs/KNOWN-BUGS.md:41-46` «Прийнято» стосується протилежного випадку (сервер **приймає** недозволений вибір), і формулювання власника прямо проти цього дефекту: «гірше — створити його без частини вибраного й змусити гравця перестворювати». У `docs/DECISIONS.md` рішення про дефолт `ruleset` немає; у `docs/o18-.../README.md:229` «Поза межами» цього теж немає.

(4) IN-FLIGHT — ні. Жоден із задіяних файлів (`persCreateSchema.ts`, `MultiStepForm.tsx`, `rules/character-creation.ts`, `rules/background-asi.ts`, `server/db/character-creation.ts`) не в переліку паралельної сесії.

(5) ВЖЕ ВІДКРИТО — ні. `docs/o18-2024-character-parity/kr18.2-background-asi.md` закритий («✅ зроблено 2026-08-28») і стверджує «Сервер не довіряє клієнту… повертає чистий `{ error }`» та «тепер персонаж 2024 не створюється без розподілу». Через браузер обидва твердження хибні: гейт стоїть під `ruleset`, а той приїжджає 2014. KR перевіряли лише хелпери `tests/helpers/build-2024-character.ts:103`, які передають `ruleset: "RULES_2024"` явно, тож весь дефект лежить у щілині між формою й тестом.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою CONTEXT правильна: персонаж рахується не за книгою і вибір гравця губиться мовчки. На P0 не тягне (створення відбувається, дані не втрачаються) — P0 у цієї ж кореневої причини вже є окремо, у знахідці 01 (неможливо підняти рівень).

УТОЧНЕННЯ ДО ЗНАХІДКИ (не змінює вердикту): корінь — **виключно** знахідка 01, а `src/rules/background-asi.ts:32` — правильна поведінка для 2014, лагодити там нічого. Список `files` варто замінити на `src/lib/zod/schemas/persCreateSchema.ts:294` + `src/lib/components/characterCreator/MultiStepForm.tsx`; `BackgroundAsiForm.tsx` відпрацював коректно (підсумок на кроці був правильний). Фактично 03 — наслідок 01 і зникне разом із ним; це один фікс, а не два.


### P2-elf-wizard-07 — Риса походження 2024 (Magic Initiate у Мудреця) чіпляється без жодного вибору — кроку «Опції риси походження» не існує для всіх 16 походжень 2024

**Стан KR31.2, 2026-09-05: 🟡 частково.** Крок фіксованої риси походження 2024 увімкнений у MultiStepForm; jsdom 4/4 із доведеним зламом. Фіксація списку Magic Initiate й повний браузерний прохід лишаються окремими перевірками. Докази — у [журналі KR31.2](kr31.2-class-choices-2024.md).

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:51 «Feat: Magic Initiate (Wizard)»; data/2024/srd/feats.md:37-41 — «You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list… Choose a level 1 spell from the same list. You always have that spell prepared. You can cast it once without a spell slot»

**Має бути:** Після вибору Мудреця 2024 конструктор питає список заклинань риси, два замовляння і одне заклинання 1-го рівня; вони лягають у pers_feat_choice і pers_spell як завжди підготовлені

**Є:** Риса чіпляється порожньою: жодного pers_feat_choice, жодного заклинання; гравець про втрату не дізнається

**Доказ:** Набір кроків конструктора для цієї персони (лог work/P2-elf-wizard/07.log): Раса → Опції раси → Клас → Передісторія → Характеристики → Навички → Мови → Спорядження → Імʼя. Кроків «Риса походження» / «Опції риси походження» немає. Риса все одно чіпляється сервером: PERS_FEAT: [{"pers_feat_id":7,"feat_id":3029,"eng_name":"Magic Initiate"}], а pers_feat_choice для pers_feat_id 7 — жодного рядка. На листі картка «Посвячений у магію / РИСА» показує повний текст правила без жодного обраного заклинання (shots/P2-elf-wizard-09b-features-8.png). Причина: MultiStepForm.tsx:275 — hasBackgroundFeatChoice = (bg?.gainsFeats?.length ?? 0) > 0, а gainsFeats у src/lib/generated/creator-content-2024.json порожній для всіх 16 походжень 2024 (звʼязок _BackgroundToFeat має 19 рядків, усі RULES_2014); риса 2024 приходить полем background.originFeatId, яке читає лише сервер (character-creation.ts:854), і MultiStepForm не переносить його у formData.backgroundFeatId, тож hasBackgroundFeatChoices (:277) теж ніколи не істинний. Масштаб: із 16 походжень 2024 шість несуть риси з виборами — MAGIC_INITIATE (3 опції) у Sage/Acolyte/Guide і SKILLED (18 опцій) у Charlatan/Noble/Scribe.

**Відтворення:** 1) /2024/char → будь-який вид → будь-який клас → Мудрець 2024 2) переглянути перелік кроків — кроку риси походження немає 3) створити → select * from pers_feat_choice where pers_feat_id = <id рядка pers_feat>

**Куди дивитись:** У 2024-гілці підставляти formData.backgroundFeatId = bg.originFeatId одразу після вибору походження — тоді крок «Опції риси походження» зʼявиться сам і FeatChoiceOptionsForm зробить решту. Альтернатива — рахувати hasBackgroundFeatChoice також від originFeatId, не лише від gainsFeats

**Файли:** `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/server/db/character-creation.ts`, `src/lib/generated/creator-content-2024.json`


### P3-multiclass-wizard-cleric-02 — Розподіл характеристик походження (+2/+1) мовчки губиться — INT 15 замість 17, WIS 14 замість 15

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-creation.md — походження 2024 дає +2/+1 або +1/+1/+1; фікстура tests/fixtures/2024-multiclass/21-human-wizard4-cleric4.json: `backgroundAsi: {mode:"+2/+1", plusTwo:"INT", plusOne:"WIS"}`, базові 15/14 → на 1-му рівні INT 17 / WIS 15

**Має бути:** INT 17, WIS 15 у базі й на листі; якщо редакція не 2024 — явна помилка, а не тихе відкидання вибору.

**Є:** INT 15, WIS 14; вибір гравця зникає без жодного повідомлення.

**Доказ:** На кроці «Характеристики» панель «Бонуси походження «Послушник»» прийняла вибір, бейджі показали `Інтелект +2 · Мудрість +1` (shots/P3-03-asi.png). Уже на кроці «Імʼя» блок «Фінальні характеристики» показує ІНТ 15 · МУД 14 (shots/P3-03-name.png). У базі pers 23: `str 8, dex 10, con 13, int 15, wis 14, cha 12`. На листі персонажа `ІНТ 15 +2`, `МУД 14 +2` (shots/P3-05-sheet.png). Причина в коді: `src/rules/character-creation.ts:91` `if (ruleset === "RULES_2024") { if (input.backgroundAbilityOptions && input.backgroundAsiChoice) scores = strategy.applyBackgroundASI(...) }` і `src/rules/background-asi.ts:32` `if (ruleset !== "RULES_2024") return null;` — гейт `findBackgroundAsiProblem` теж повертає null, тож помилки гравцю не показують: вибір приймають і викидають.

**Відтворення:** Створити персонажа за кроками знахідки 01, на кроці «Характеристики» обрати «+2 і +1», Кому +2 = Інтелект, Кому +1 = Мудрість. Порівняти бейджі кроку з блоком «Фінальні характеристики» на кроці «Імʼя» і з `select int, wis from pers`.

**Куди дивитись:** Корінь спільний зі знахідкою 01 (ruleset). Додатково: `findBackgroundAsiProblem` має падати помилкою, коли походження пропонує `abilityOptions`, а вибору в даних немає — інакше будь-яка майбутня втрата редакції знову з'їсть вибір мовчки.

**Файли:** `src/rules/character-creation.ts`, `src/rules/background-asi.ts`, `src/server/db/character-creation.ts`


### L02-backgrounds-03 — Зброя й речі зі стартового пакунка походження лягають вільним текстом, а не в інвентар — списом і кинджалами не можна битися

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:60 (Soldier) «**Equipment:** _Choose A or B:_ (A) Spear, Shortbow, 20 Arrows, Gaming Set…»; :48 (Criminal) «(A) 2 Daggers, Thieves' Tools…»

**Має бути:** Спис, короткий лук і кинджали стають рядками PersWeapon і зʼявляються серед атак на листі, як робить будь-який зрілий білдер.

**Є:** Це рядки тексту в полі «Спорядження»; гравець мусить додати зброю руками через діалог додавання зброї.

**Доказ:** src/server/db/character-creation.ts:544-551 — takeStartingItems кладе все, що не монета, у customEquipmentLines → Pers.customEquipment; гілки weaponId/armorId існують лише для класового спорядження (:557-566). Зонд work/L02-backgrounds/soldier.test.ts на spells_test: Солдат 2024 → customEquipment «Спис x1\nКороткий лук x1\nСтріли x20\nНабір для гри (на вибір) x1\nНабір цілителя x1\nСагайдак x1\nДорожній одяг x1», weapons: [], armors: [], gp «14». Злочинець 2024 → customEquipment «Кинджал x2\n…», weapons: [].

**Відтворення:** Створити Солдата 2024 з вибором пакунка (UI або зонд soldier.test.ts) і подивитися pers.weapons — порожньо, тоді як customEquipment містить «Спис x1».

**Куди дивитись:** Розширити takeStartingItems: перед записом у текст шукати предмет у weapon/armor за назвою (як робить класове спорядження через optionId) і створювати PersWeapon/PersArmor; решту лишати текстом.

**Файли:** `src/server/db/character-creation.ts`, `src/rules/background-equipment.ts`


### L02-backgrounds-04 — Конкретний ігровий набір / музичний інструмент / реміснича спеціальність ніколи не обираються — і у володіннях, і в майні лишається «(на вибір)»

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:60 «**Tool Proficiency:** _Choose one kind of_ Gaming Set (see "Equipment")»

**Має бути:** Гравець обирає конкретний набір (кості, карти, «три драконові ставки»…), і саме він потрапляє у володіння й у майно.

**Є:** Володіння записане категорією, у майні лишається нерозвʼязаний рядок «(на вибір)».

**Доказ:** База тримає лише категорію: `select name, tool_proficiencies from background where ruleset='RULES_2024'` → SOLDIER_2024/GUARD_2024/NOBLE_2024 = {GAMING_SET}, ENTERTAINER_2024 = {MUSICAL_INSTRUMENT}, ARTISAN_2024 = {ARTISAN_TOOLS}. Створений Солдат: customProficiencies містить рядок «Ігровий набір», customEquipment — «Набір для гри (на вибір) x1» (зонд soldier.test.ts). Кроку вибору інструмента в конструкторі 2024 немає (перелік кроків із knowledge 01).

**Відтворення:** Створити Солдата/Артиста/Ремісника 2024 і подивитися customProficiencies та customEquipment.

**Куди дивитись:** Крок вибору інструмента з категорії — або окремий, або всередині кроку «Передісторія»; enum ToolCategory уже має конкретні набори (DICE_SET, PLAYING_CARD_SET, DRAGONCHESS_SET, THREE_DRAGON_ANTE_SET).

**Файли:** `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/server/db/character-creation.ts`


### L02-backgrounds-05 — Походження й будь-який його вибір не можна змінити після створення — тільки перестворити персонажа

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Має бути:** Зрілий білдер дозволяє змінити походження або перерозподілити його бонуси без втрати персонажа.

**Є:** Помилка у виборі походження, розподілі +2/+1 чи в «пакунок замість 50 зм» лікується лише повторним створенням. Часткова компенсація одна — базові характеристики можна переписати руками (ModifyStatModal.tsx:168-187).

**Доказ:** src/lib/actions/update-character.ts:11-30 — увесь редагований набір: customProficiencies, customLanguagesKnown, customEquipment, personalityTraits, ideals, bonds, flaws, backstory, notes, alignment, xp, cp, ep, sp, gp, pp. Ні backgroundId, ні backgroundAsiChoice, ні вибору «пакунок / 50 зм», ні backgroundFeatChoiceSelections. Жодна інша серверна дія у src/lib/actions/ їх не пише.

**Відтворення:** Створити персонажа 2024, відкрити лист — жодного елементу керування походженням; викликати updateCharacterAction — у типі payload таких полів немає.

**Куди дивитись:** Окрема ціль: редагування Origin (походження + ASI + вибір спорядження + вибори риси походження) з перерахунком характеристик; передумова — знахідка 06 (зберігати сам розподіл).

**Файли:** `src/lib/actions/update-character.ts`, `src/server/db/pers-details.ts`


### P1-human-fighter-16 — Володіння Солдата «оберіть один ігровий набір» не обирається — записано узагальнене «Ігровий набір»

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:61 — Soldier: «**Tool Proficiency:** _Choose one kind of_ Gaming Set (see "Equipment")»

**Має бути:** Вибір конкретного набору (кості, карти, шахи…), він же в інвентарі й у володіннях

**Є:** Узагальнений плейсхолдер і в володіннях, і в предметах

**Доказ:** src/lib/generated/creator-content-2024.json SOLDIER_2024.toolProficiencies: ["GAMING_SET"], toolToChooseCount відсутній. Кроку вибору набору в конструкторі немає. Після створення: select custom_proficiencies from pers where pers_id=16 → «Легкі обладунки, Середні обладунки, Важкі обладунки, Щит\nІгровий набір\nПроста зброя, Бойова зброя». У спорядженні предмет називається «Набір для гри (на вибір)».

**Відтворення:** /2024/char → Солдат 2024 → пройти до кінця → лист, блок володінь

**Куди дивитись:** Завести toolToChooseCount + пул ігрових наборів для походжень 2024, що дають «choose one kind of»

**Файли:** `data/2024/normalized/backgrounds.json`, `prisma/seed/`, `src/lib/components/characterCreator/`


## Дані й переклад (18)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P1 | 2024 | data | `L05-class-choices-03` | Друїд 2024 отримує середні обладунки безумовно, хоча книга дає їх лише через Primal Order → Warden | prisma/seed/, data/2024/normalized/classes.json |
| ✓ | P1 | 2024 | data | `P1-human-fighter-05` | Жоден із 13 класів 2024 не має навичок класу — class.skill_proficiencies = null, конструктор вибору не пропонує | data/2024/normalized/classes.json, prisma/seed/ |
| ✓ | P1 | 2024 | data | `P2-elf-wizard-06` | Жоден із 13 класів 2024 не має стартових навичок на вибір — class.skill_proficiencies = null, тож Чарівник 2024 недоотримує 2 навички | data/2024/normalized/classes.json, prisma/seed/ |
| ✓ | P1 | 2024 | data | `P3-multiclass-wizard-cleric-03` | У всіх 13 класів RULES_2024 skill_proficiencies = NULL — крок «Навички» не пропонує жодного класового вибору | data/2024/normalized/classes.json, prisma/seed/ |
| · | P2 | 2024 | data | `L02-backgrounds-07` | Одне походження має дві різні українські назви: каталог бере їх із нормалізованого файлу, конструктор — із translation.ts | src/lib/backgroundsData.ts, src/lib/refs/translation.ts |
| · | P2 | 2024 | data | `L02-backgrounds-09` | Фермер: володіння інструментами тесляра змодельоване як уся категорія ремісничих — ширше за книгу, і назва розходиться між каталогом і листом | prisma/schema.prisma, data/2024/normalized/backgrounds.json |
| ✓ | P2 | 2024 | data | `P6-class-sweep-level1-10` | Картки Потойбічних викликів підписані описом ефекту замість назви виклику, з англійськими назвами заклинань усередині | prisma/seed/, data/2024/normalized/invocations.json |
| ✓ | P2 | 2024 | data | `P7-mobile-ux-04` | 14 із 31 потойбічного виклику 2024 показують неперекладені англійські назви заклинань у видимому тексті картки | data/2024/normalized/invocations.json |
| · | P3 | 2024 | data | `L02-backgrounds-10` | Спорядження походження на каталозі 2024 показане лише англійською, хоча український пакунок лежить у тому самому файлі | src/lib/backgroundsData.ts, data/2024/normalized/backgrounds.json |
| · | P3 | both | data | `L07-spellcasting-11` | На листі слоти заклинань названі «Комірки» — термін, який власник заборонив прямим рішенням | src/lib/components/characterSheet/slides/MagicSlide.tsx, src/lib/refs/translation.ts |
| · | P3 | 2024 | data | `L09-sheet-derived-11` | Кубики шкоди зброї 2024 записані латинкою («1d6»), 2014 — кирилицею («1к6»); лист друкує рядок дослівно | data/2024/normalized/weapons.json, src/lib/components/characterSheet/WeaponsCard.tsx |
| · | P3 | both | data | `L13-wildshape-07` | Показник небезпеки названо трьома різними способами в одному потоці Дикої форми — фічу не звірити з фільтром бестіарію | src/lib/refs/dictionary.json, src/rules/wildshape.ts |
| · | P3 | 2014 | data | `L17-known-registries-07` | BUG-004 живий: 30 рис 2014 досі несуть по дві дубльовані ASI-групи вибору, 80 мертвих рядків choice_option; 2024 чистий | prisma/seed/, tests/content/choice-option-integrity.test.ts |
| · | P3 | 2014 | data | `L17-known-registries-08` | BUG-005 живий: Elemental Adept 2014 має дві групи по пʼять стихій, жодна без структурного ефекту | prisma/seed/, docs/KNOWN-BUGS.md |
| ↓ | P3 | 2014 | data | `L17-known-registries-09` | «Б: раси без тексту» ширша, ніж записано: у spells_test без жодної риси не лише HUMAN_VARIANT, а й базова людина та Своя раса — правка, яку реєстр вважає застосованою, у клоні відсутня | db/changes/2026-08-28-race-traits-custom-lineage-and-human.sql, prisma/seed/ |
| · | P3 | 2024 | data | `P1-human-fighter-13` | Усі 16 походжень 2024 показуються з суфіксом редакції в назві — «Солдат 2024» / «Soldier 2024», і непослідовно (Послушник — без суфікса) | src/lib/refs/translation.ts, src/lib/refs/dictionary.json |
| · | P3 | 2024 | data | `P1-human-fighter-15` | Картка риси «Умілець» не каже, що риса дає — показано лише примітку про повторюваність | data/2024/normalized/feats.json, prisma/seed/ |
| · | P3 | 2024 | data | `P7-mobile-ux-05` | Назви передісторій 2024 містять службовий суфікс « 2024» у самому перекладі (15 із 16), і він тече в прозу кроку характеристик | src/lib/refs/translation.ts, src/lib/refs/dictionary.json |

### L05-class-choices-03 — Друїд 2024 отримує середні обладунки безумовно, хоча книга дає їх лише через Primal Order → Warden

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:3045 (Core Druid Traits, Armor Training) — «Light armor and Shields»; підтверджено data/2024/srd/classes.md:3063 (мультиклас: «training with Light armor and Shields»); середні обладунки лише в data/2024/srd/classes.md:3527 (Warden).

**Має бути:** class.armor_proficiencies для DRUID_2024 = {LIGHT,SHIELD}; MEDIUM додається опцією Warden.

**Є:** {LIGHT,MEDIUM,SHIELD} — кожен друїд 2024 і кожен, хто мультикласується в друїда, носить середні обладунки; КЗ завищений.

**Доказ:** SQL: `select eng_name, armor_proficiencies from class where eng_name='DRUID_2024'` → `{LIGHT,MEDIUM,SHIELD}`. Для порівняння CLERIC_2024 = {LIGHT,MEDIUM,SHIELD}, і це правильно (Core Cleric Traits: «Light and Medium armor and Shields»).

**Відтворення:** node q.mjs "select eng_name, armor_proficiencies from class where ruleset='RULES_2024' and eng_name='DRUID_2024'" на spells_test.

**Куди дивитись:** Виправити в сід-джерелі класів 2024 і подати DDL/UPDATE через db/changes/; разом із L05-class-choices-02, щоб MEDIUM приходив від опції.

**Файли:** `prisma/seed/`, `data/2024/normalized/classes.json`, `db/changes/`


### P1-human-fighter-05 — Жоден із 13 класів 2024 не має навичок класу — class.skill_proficiencies = null, конструктор вибору не пропонує

**Стан KR31.2, 2026-09-05: 🟡 частково.** Стартові навички 13 класів заповнені у normalized/classes.json і засіяні в spells_test. Звірки «книга → файл» та «файл → база» зелені й доведені зламом. Production-сід, оновлення каталогу й браузерна перевірка ще не виконані. Докази — у [журналі KR31.2](kr31.2-class-choices-2024.md).

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md, Core Fighter Traits: «Skill Proficiencies | Choose 2: Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Persuasion, Perception, or Survival»

**Має бути:** Крок «Навички» пропонує обрати 2 навички зі списку Воїна; Rogue — 4, Bard — 3 тощо

**Є:** Вибору немає, класових навичок персонаж не отримує зовсім

**Доказ:** Крок «Навички» показує лише «Фіксовані навички: Атлетика, Залякування» (від походження) і напис «Ці навички вже отримані з інших джерел і не змінюються на цьому кроці» — shots/P1-human-fighter-14-skills.png. Запит: select eng_name, skill_proficiencies from class where ruleset='RULES_2024' → усі 13 класів null. Порівняння 2014: FIGHTER_2014 → {"options":[ANIMAL_HANDLING,ACROBATICS,ATHLETICS,HISTORY,INSIGHT,INTIMIDATION,PERCEPTION,SURVIVAL],"choiceCount":2}. Джерело сіду теж порожнє: у data/2024/normalized/classes.json запис Fighter не має поля skillProficiencies взагалі. Це не наслідок 01: у pers_id=6 (RULES_2024) теж лише 2 рядки pers_skill.

**Відтворення:** /2024/char → будь-який клас 2024 → дійти до кроку «Навички»; або select skill_proficiencies from class where ruleset='RULES_2024'

**Куди дивитись:** Внести skillProficiencies (options + choiceCount) у data/2024/normalized/classes.json для всіх 13 класів, перелити сідом, перегенерувати creator-content-2024.json; додати гейт «кожен клас 2024 має непорожній skill_proficiencies»

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed/`, `src/lib/generated/creator-content-2024.json`


### P2-elf-wizard-06 — Жоден із 13 класів 2024 не має стартових навичок на вибір — class.skill_proficiencies = null, тож Чарівник 2024 недоотримує 2 навички

**Стан KR31.2, 2026-09-05: 🟡 частково.** Стартові навички 13 класів заповнені у normalized/classes.json і засіяні в spells_test. Звірки «книга → файл» та «файл → база» зелені й доведені зламом. Production-сід, оновлення каталогу й браузерна перевірка ще не виконані. Докази — у [журналі KR31.2](kr31.2-class-choices-2024.md).

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:9818 — Core Wizard Traits: «Skill Proficiencies — Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion»

**Має бути:** Чарівник 2024 пропонує обрати 2 навички з Arcana/History/Insight/Investigation/Medicine/Nature/Religion; аналогічно для решти 12 класів 2024

**Є:** Нуль виборів; персонаж 2024 недоотримує від 2 до 4 володінь навичками

**Доказ:** Крок «Навички» у конструкторі показує лише фіксовані (Магія, Історія від походження; Уважність від виду) і «ЗАЛИШОК: 0» (shots/P2-elf-wizard-06b-skills.png). У персонажа рівно три pers_skill: ARCANA, HISTORY, PERCEPTION. Запит по таблиці class у spells_test: усі 13 записів RULES_2024 мають skill_proficiencies = null, тоді як усі 13 записів RULES_2014 мають повний обʼєкт (WIZARD_2014: {"options":["ARCANA","HISTORY","INSIGHT","INVESTIGATION","MEDICINE","RELIGION"],"choiceCount":2}). SkillsForm читає саме selectedClass.skillProficiencies (src/lib/components/characterCreator/SkillsForm.tsx:34-67). У джерельному файлі data/2024/normalized/classes.json поля немає взагалі (ключі запису Wizard: ruleset, engName, weaponMasteryProgression, name, flavorTextEng, subclassLevel, abilityScoreImprovementLevels, epicBoonLevel, isPhbCore, note, source, featuresEng, features, translationStatus).

**Відтворення:** 1) /2024/char → будь-який вид → Чарівник 2024 → будь-яке походження 2) крок «Навички»: «ЗАЛИШОК: 0» 3) select eng_name, skill_proficiencies from class where ruleset='RULES_2024'

**Куди дивитись:** Внести skill_proficiencies у data/2024/normalized/classes.json за таблицями Core Traits усіх 13 класів, перелити сідом (Р33: правити файл-джерело, не прохід по базі), потім bun run generate:creator-content. Це не той самий дефект, що BUG-006/о27 §3 — ті про мультиклас, тут гублять і початковий клас

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed/`, `src/lib/components/characterCreator/SkillsForm.tsx`, `src/lib/generated/creator-content-2024.json`


### P3-multiclass-wizard-cleric-03 — У всіх 13 класів RULES_2024 skill_proficiencies = NULL — крок «Навички» не пропонує жодного класового вибору

**Стан KR31.2, 2026-09-05: 🟡 частково.** Стартові навички 13 класів заповнені у normalized/classes.json і засіяні в spells_test. Звірки «книга → файл» та «файл → база» зелені й доведені зламом. Production-сід, оновлення каталогу й браузерна перевірка ще не виконані. Докази — у [журналі KR31.2](kr31.2-class-choices-2024.md).

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md, Core Wizard Traits: «Skill Proficiencies — Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion»; Core Cleric Traits: «Choose 2: History, Insight, Medicine, Persuasion, or Religion»

**Має бути:** Чарівник 2024 обирає 2 навички з семи; клірик 2024 — 2 з пʼяти; кожен клас 2024 дає свій вибір, як це вже працює у 2014.

**Є:** Жоден клас 2024 не пропонує вибору навичок; персонаж 2024 недоотримує 2–4 володіння.

**Доказ:** Запит до spells_test: `select ruleset, count(*) filter (where skill_proficiencies is null) nulls, count(*) total from class group by ruleset` → RULES_2024: 13/13 NULL; RULES_2014: 0/13. Файл конструктора `src/lib/generated/creator-content-2024.json` — усі класи `"skillProficiencies": null`, тоді як `-2014.json` має `{"options":[...],"choiceCount":2}`. Джерело сіду `data/2024/normalized/classes.json` поля взагалі не містить (ключі запису: ruleset, engName, weaponMasteryProgression, name, flavorTextEng, subclassLevel, abilityScoreImprovementLevels, epicBoonLevel, isPhbCore, note, source, featuresEng, features, translationStatus). UI: крок «Навички» для Чарівника 2024 + Послушника показав лише «Фіксовані навички: Аналіз поведінки, Релігія» і текст «Ці навички вже отримані з інших джерел і не змінюються на цьому кроці» — жодного вибору (shots/P3-03-skills.png); на листі компетентність стоїть лише на Релігії та Аналізі поведінки.

**Відтворення:** /2024/char → будь-який клас 2024 → дійти до кроку «Навички». Або `select eng_name, skill_proficiencies from class where ruleset='RULES_2024'`.

**Куди дивитись:** Додати володіння навичками до `data/2024/normalized/classes.json` за таблицями Core * Traits із data/2024/srd/classes.md, перелити сідом (Р33 — правити файл-джерело, не прохід по базі), перегенерувати `src/lib/generated/creator-content-2024.json`. Крок «Навички» коду не потребує — він уже вміє це у 2014.

**Файли:** `data/2024/normalized/classes.json`, `prisma/seed/`, `src/lib/generated/creator-content-2024.json`, `src/lib/components/characterCreator/SkillsForm.tsx`

**Скептик:** Спробував спростувати за чотирма напрямами — жоден не спрацював.

(1) ПРАВИЛО. Оракул звірено власноруч: `data/2024/srd/classes.md` має рядок «Skill Proficiencies» у кожному з 12 класів. Чарівник (рядок 9817) — «Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion»; Клірик (1766) — «Choose 2: History, Insight, Medicine, Persuasion, or Religion»; Бард (392) — «Choose any 3»; Слідопит (6088) — 3; Пройдисвіт (6860) — 4. Тобто діапазон втрати 2–4 у знахідці правильний, і це саме редакція 2024.

(2) ДАНІ. Власний запит до `spells_test`: 13/13 класів `RULES_2024` мають `skill_proficiencies IS NULL`, 0/13 у `RULES_2014`. Це не «2024-класи загалом порожні»: у тих самих 13 рядках `armor_proficiencies`, `weapon_proficiencies` і `saving_throws` заповнені коректно — пропущено рівно навички.

(3) КОД — альтернативного шляху немає. Перевірив три можливі обхідні джерела: (а) `class_choice_option` — жодної опції з `effect_kind='SKILL_PROFICIENCY'` не привʼязано до класів 2024 (усі 18 таких опцій 2024 належать рисі Skilled, id 3361–3378); лише 4 класи 2024 взагалі мають choice-опції (FIGHTER/PALADIN/RANGER по 10, WARLOCK 31); (б) `feature` — жодного рядка `ruleset='RULES_2024'` з непорожнім `skill_proficiencies`, тож гілка `character-creation.ts:688` нічого не додасть; (в) сервер — класові навички потрапляють у персонажа ЛИШЕ через `validData.skillsSchema.basicChoices.selectedClass` (`src/server/db/character-creation.ts:435-444`), тобто рівно з UI-вибору, якого немає, бо `SkillsForm.tsx:303` рахує `classCount` із `selectedClass.skillProficiencies` = null.

(4) КОРІНЬ ГЛИБШИЙ, НІЖ У ЗВІТІ. Автор указав тільки `data/2024/normalized/classes.json`. Насправді поля немає й у сіді: у `prisma/seed/classSeed2024.ts` тип `CLASS_CONFIGS` (рядки 45–60) взагалі не має ключа `skillProficiencies`, хоча `savingThrows`/`armorProficiencies`/`weaponProficiencies` там прописані руками. Правка лише JSON нічого не дасть — потрібні обидва.

(5) ЦЕ НЕ ЛИШЕ ТЕСТОВА БАЗА. `src/lib/generated/creator-content-2024.json` (усі 13 класів `"skillProficiencies": null`) робиться скриптом `generate:creator-content` = `--target prod` (`package.json:24`) і перегенерований 2026-09-04 23:53 — отже й у робочій базі поле NULL. Це ще й файл, який читає задеплоєний конструктор (`findCharacterCreationOptions`), тож симптом у продакшні не залежить від стану бази. Гейт знято: `src/rules/access.ts` — `isRules2024Allowed()` повертає `true` (передрелізний гейт прибрано 2026-08-28), тобто `/2024/char` доступний реальним користувачам.

(6) РІШЕННЯ ВЛАСНИКА / ВІДКРИТІ KR. У `docs/DECISIONS.md` про навички немає нічого; у «Прийнято» `docs/KNOWN-BUGS.md` лише BUG-001..003 («сервер довіряє UI») — інша тема. Жодного KR у o13/o18/o27 на класові навички 2024 немає; єдина дотична згадка — `docs/o27-multiclass-2024/kr27.2-multiclass-entry.md:134`: «`skillProficiencies` класу в цю історію не входить взагалі», тобто явно винесено за межі тієї роботи й ніде не підхоплено. Файли знахідки (`classSeed2024.ts`, `data/2024/normalized/classes.json`, `SkillsForm.tsx`) не в переліку паралельної сесії — не in-flight.

(7) ЧОМУ ЗЕЛЕНІ ТЕСТИ НЕ ЛОВЛЯТЬ. `tests/rules-2024/acceptance-ten.test.ts:315` містить закладену хибну передумову: «Noble дає лише History і Persuasion, Паладин 2024 — жодної», тоді як SRD (рядок 5309) дає паладину 2 навички на вибір. Фікстури `tests/fixtures/2024-acceptance/*.json` узагалі не мають ані входу, ані очікування щодо класових навичок.

СЕРЙОЗНІСТЬ. P1 за шкалою CONTEXT: персонаж створюється з відсутніми 2–4 володіннями й без жодного сигналу гравцю, вибір із книги не пропонується взагалі. Не P0 — створення працює. Помʼякшення (варте згадки, але шкалу не змінює): на листі володіння можна виставити руками — `ModifyStatModal` + `updateSkillProficiency` (`src/server/db/bonus-actions.ts:205-242`), тож це не «неможливо виправити без перестворення».


### L02-backgrounds-07 — Одне походження має дві різні українські назви: каталог бере їх із нормалізованого файлу, конструктор — із translation.ts

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (CLAUDE.md: translation.ts — джерело істини для UI-рядків)

**Має бути:** Одна назва на одне походження в усьому застосунку; усередині конструктора 2024 суфікс «2024» у назві зайвий.

**Є:** Гравець бачить «Служитель» у каталозі й «Послушник» у конструкторі; «Шахрай» проти «Шарлатан 2024»; «Вартовий» проти «Охоронець 2024».

**Доказ:** src/lib/backgroundsData.ts:118 `name: b.name` (з data/2024/normalized/backgrounds.json) проти src/lib/refs/translation.ts:690 `ACOLYTE: "Послушник"`, :759 `CHARLATAN_2024: "Шарлатан 2024"`, :763 `GUARD_2024: "Охоронець 2024"`. Виміряно в браузері: /2024/backgrounds показує «СЛУЖИТЕЛЬ», «ШАХРАЙ», «Вартовий» (текст сторінки, скрін L02-7-catalog-2024.png), а крок «Передісторія» конструктора 2024 — «Послушник», «Шарлатан 2024», «Охоронець 2024» (текст сторінки, скрін L02-5-background-step.png).

**Відтворення:** Відкрити http://127.0.0.1:3100/2024/backgrounds і http://127.0.0.1:3100/2024/char (крок «Передісторія») поруч.

**Куди дивитись:** Звести: або каталог читає backgroundTranslations, або назви з нормалізованого файлу переносяться в translation.ts (і дзеркаляться в dictionary.json скриптом sync-dictionary-from-translation.ts). Заразом зняти суфікс «2024» у назвах, залишивши його бейджу редакції.

**Файли:** `src/lib/backgroundsData.ts`, `src/lib/refs/translation.ts`, `data/2024/normalized/backgrounds.json`, `src/lib/refs/dictionary.json`


### L02-backgrounds-09 — Фермер: володіння інструментами тесляра змодельоване як уся категорія ремісничих — ширше за книгу, і назва розходиться між каталогом і листом

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** PHB 2024 / data/2024/normalized/backgrounds.json (Farmer): "toolProficiency": {"engText":"Carpenter's Tools", "toolCategory":"ARTISAN_TOOLS", "isChoice":false, "note":"2014-специфічний enum CARPENTERS_TOOLS відсутній; ARTISAN_TOOLS — найближче наявне значення"}

**Має бути:** Володіння саме інструментами тесляра.

**Є:** Володіння цілою категорією ремісничих інструментів; та сама сутність названа по-різному в каталозі й на листі.

**Доказ:** enum ToolCategory у prisma/schema.prisma не має CARPENTERS_TOOLS (є SMITHS_TOOLS, BREWERS_SUPPLIES, CALLIGRAPHERS_SUPPLIES, JEWELERS_TOOLS…). Запит: `select name, tool_proficiencies from background where name::text='FARMER_2024'` → {ARTISAN_TOOLS}. Каталог показує «Інструменти тесляра» (nameUa з json), а лист персонажа отримає translateValue('ARTISAN_TOOLS') = «Ремісничі інструменти» (character-creation.ts:652-656).

**Відтворення:** Порівняти рядок «Інструменти» Фермера на /2024/backgrounds із customProficiencies створеного Фермера 2024.

**Куди дивитись:** Додати CARPENTERS_TOOLS (і решту бракуючих ремісничих) до enum ToolCategory через db/changes/ + db:pull, перезалити походження, оновити toolTranslations.

**Файли:** `prisma/schema.prisma`, `data/2024/normalized/backgrounds.json`, `src/lib/refs/translation.ts`


### P6-class-sweep-level1-10 — Картки Потойбічних викликів підписані описом ефекту замість назви виклику, з англійськими назвами заклинань усередині

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** docs/DECISIONS.md Р20 (неоднозначний термін несе оригінал як термін{{English}}); data/2024/srd/classes.md, Warlock Eldritch Invocations — виклики мають власні назви (Agonizing Blast, Armor of Shadows…)

**Має бути:** Картка називається «Мучливий вибух{{Agonizing Blast}}», нижче — опис ефекту; назви заклинань у описі — українською з маркером оригіналу

**Є:** назва картки == опис ефекту (виглядає як дубль), назви заклинань англійською без маркера; знайти виклик за назвою з книги неможливо

**Доказ:** Крок classChoices Чорнокнижника показує: «+модифікатор ХАР до шкоди атаки заклинанням» (двічі поспіль), «Накладання Mage Armor на себе без витрати чарунок», «Накладання Levitate на себе без чарунок», «Speak with Animals необмежено без чарунок», «Дальність Eldritch Blast = 30». У даних: {"name":"+модифікатор ХАР до шкоди атаки заклинанням","eng":"Agonizing Blast (2024)","group":"Потойбічні виклики","feat":["Мучливий вибух"]} — українська назва лежить у звʼязаній фічі й у UI не показується. Скріншот scratchpad/audit/shots/P6-WARLOCK_2024-03-classChoices.png

**Відтворення:** http://127.0.0.1:3100/2024/char → Людина → Пильний → Чорнокнижник → крок «Опції класу».

**Куди дивитись:** Або переписати choice_option.option_name на назву виклику й перенести теперішній текст у опис, або в UI брати назву зі звʼязаної фічі (choiceOption.features[0].feature.name). Заклинання в описах — через glossary-marker (src/lib/refs/glossary-marker.ts).

**Файли:** `prisma/seed/`, `data/2024/normalized/invocations.json`, `src/lib/components/characterCreator/ClassChoicesForm.tsx`


✅ **Закрито 2026-09-09** — обидві половини, разом із `P7-mobile-ux-03` і `P7-mobile-ux-04`.

Одне уточнення до «Куди дивитись» цього запису: маркер для назви заклинання тут **не** `{{English}}`.
Форма назви заклинання — ратифікована `Українська [English]` у квадратних дужках, і саме її розуміє
проставляч посилань (`scripts/spell-links/spell-mentions.ts`, KR25.3); `{{}}` — для термінів, не для назв
заклинань (див. скіл `dnd-ua-translation`). Тексти зведено до `[English]` і загорнуто в посилання.

### P7-mobile-ux-04 — 14 із 31 потойбічного виклику 2024 показують неперекладені англійські назви заклинань у видимому тексті картки

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Українська назва заклинання, за потреби з маркером оригіналу за Р20 («Магічна броня{{Mage Armor}}»).

**Є:** Голий англійський оригінал в українському інтерфейсі, у 14 із 31 картки — і це регрес відносно 2014, де ті самі виклики перекладені.

**Доказ:** База spells_test: `select count(*) from choice_option where ruleset='RULES_2024' and group_name ilike '%иклик%' and option_name ~ '[A-Za-z]{3,}'` → 14 із 31. Рядки: «Накладання Mage Armor на себе без витрати чарунок» (3572), «Накладання Levitate на себе без чарунок» (3573), «Speak with Animals необмежено без чарунок» (3574), «Дальність Eldritch Blast = 300 фт» (3581), «False Life на себе без чарунок (12 тимч. ОЗ)» (3583), «Дихання під водою, плавання та Water Breathing» (3585), «Отримання риси походження (Origin Feat)» (3588), «Disguise Self необмежено без чарунок» (3590), «Alter Self необмежено без чарунок» (3591), «Silent Image необмежено без чарунок» (3592), «Jump на себе необмежено без чарунок» (3594), «Arcane Eye необмежено без чарунок» (3599), «Speak with Dead необмежено без чарунок» (3600), «Істинний зір (Truesight) 30 фт» (3601). Файл-джерело (Р33): data/2024/normalized/invocations.json — ті самі 14 значень у shortDescription. Відповідники 2014 у базі перекладені повністю: «Магічна броня необмежено» (Armor of Shadows), «Розмова з тваринами необмежено» (Beast Speech), «Хибне життя необмежено» (Fiendish Vigor). Скріншот shots/P7/303-creation_step_classChoices-vp.png.

**Відтворення:** 375×812 → /2024/char → Тифлінг → Чорнокнижник → крок «Опції класу»; або SQL вище на spells_test.

**Куди дивитись:** Правити shortDescription у data/2024/normalized/invocations.json і перелити сід (Р33 — джерело файл, не прохід по базі).

**Файли:** `data/2024/normalized/invocations.json`


✅ **Закрито 2026-09-09.** Правлено джерело ([Р33](../DECISIONS.md#р33)), не базу:
`data/2024/normalized/invocations.json` — 12 `shortDescription` і 2 `prerequisite`. Далі
`bunx tsx scripts/link-spell-mentions.ts --write` загорнув 19 згадок у посилання.

**Чому проставляч не бачив цього сам** — і це головне, що варто винести з запису. Він чіпляється
**виключно за маркер `[EngName]`** після точної каталожної назви: так вирішено свідомо, бо український
текст стоїть у відмінках. Гола англійська назва без маркера для нього не існує — ні загорнути, ні
порахувати як недостачу покриття він її не може. Тому `description` виклику був звʼязаний правильно, а
короткий опис поруч лишався англійським, і жоден гейт цього не показував.

Дірку закрито детектором: `findBareSpellNamesInCarrier` у тому ж модулі + гейт
«у джерелах контенту жодної не лишилося» в `tests/content/spell-mentions-linked.test.ts`.

Детектор одразу знайшов ширшу популяцію, ніж описано в цьому записі — **46 згадок у трьох носіях**, усі
полагоджено:

| Носій | Згадок | Що було |
|---|---|---|
| `data/2024/normalized/invocations.json` | 14 | предмет запису |
| `data/2024/normalized/subclass-choices.json` | 24 | «Підготовлені заклинання: Blur, Burning Hands, Fire Bolt…» у чотирьох Колах землі 2024 |
| `data/2024/normalized/subclasses.json` | 8 | застарілі позначки «(заклинання 2024, переклад відкладено)» — назви вже ратифіковані в каталозі |
| `prisma/seed/raceFeatureSeed.ts` | 24 | 2014-расові риси: «Cure Wounds та Lesser Restoration 1/день» |

Плюс чотири **неератифіковані** назви в описах самих викликів, через які проставляч мовчки їх пропускав:
«Фальшиве життя» → «Удаване життя», «Зміна подоби» → «Зміна вигляду», «Безмовний образ» → «Мовчазний
образ», «Підглядання» → «Арканне око».

Переглянуті винятки (англійська назва як предмет розмови, а не згадка) лежать у
`data/spell-links/not-a-spell.json` з причиною на кожну: сім перекладацьких нотаток у
`data/2024/normalized/spells.json` і «Darkness» усередині власної назви «Queen of Air and Darkness».
Гейт протухання цього файлу розширено — він приймає обидва роди винятків і питає сам детектор, чи
виняток ще має на що вказувати.

«(Truesight)» і «(Origin Feat)» лишено як є: це не голі англійські назви — український термін стоїть
поруч, а дужкова форма для терміна, незрозумілого без оригіналу, дозволена стилем.

**Прогін у прод — за власником** (нижче, «Що лишилося власникові»).

### L02-backgrounds-10 — Спорядження походження на каталозі 2024 показане лише англійською, хоча український пакунок лежить у тому самому файлі

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Український список предметів із кількостями, як у каталозі 2014.

**Є:** Сирий англійський рядок із книги на україномовній сторінці.

**Доказ:** src/lib/backgroundsData.ts:135 для 2024 жорстко ставить `equipmentItems: []` і віддає `equipmentEngText`, тоді як data/2024/normalized/backgrounds.json має заповнений `equipmentPackage` українською (він же залитий у background.items — перевірено запитом). На сторінці це виглядає як розділ «СПОРЯДЖЕННЯ (МОВОЮ ОРИГІНАЛУ) — Choose A or B: (A) Calligrapher's Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP; or (B) 50 GP» (текст сторінки, скрін scratchpad/audit/shots/L02-7-catalog-2024.png).

**Відтворення:** http://127.0.0.1:3100/2024/backgrounds → будь-яке походження → розділ спорядження.

**Куди дивитись:** У backgroundsData.ts мапити equipmentPackage у equipmentItems для 2024; engText лишити другорядним рядком або прибрати.

**Файли:** `src/lib/backgroundsData.ts`, `data/2024/normalized/backgrounds.json`


### L07-spellcasting-11 — На листі слоти заклинань названі «Комірки» — термін, який власник заборонив прямим рішенням

**Рівень:** P3 · **Редакція:** both · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** docs/DECISIONS.md:768 — таблиця канону: spell slot → «слот заклинань»; :773 дослівна цитата власника: «ніяких чарунок, слоти заклинань — правильно».

**Має бути:** «Слоти заклинань» усюди на листі й у повідомленнях; «КС (Складність ряткидка)».

**Є:** «Комірки» у восьми місцях листа й серверних дій; «СК (Складість Ряткидка)» на картці.

**Доказ:** src/lib/components/characterSheet/slides/MagicSlide.tsx:694 заголовок блока «Комірки»; :712 «Натисніть, щоб керувати комірками» / «Комірки недоступні»; :823 «рівень комірки»; :831 «керувати комірками Магії пакту». src/lib/refs/translation.ts:1674 spellSlotsRestored: «Комірки заклять відновлено»; :1683 «…комірки заклять та здібності». src/lib/actions/spell-slots.ts:42 і :103 «Некоректний рівень комірки». Поруч там же MagicSlide.tsx:684 — «СК (Складість Ряткидка)»: друкарська помилка в «Складність», і абревіатура «СК» розходиться з «КС», яку вживає решта проєкту.

**Відтворення:** grep -rn "комірк\|Комірк" src — шість файлів; grep -n "Складість" src/lib/components/characterSheet/slides/MagicSlide.tsx → :684.

**Куди дивитись:** Заміна в MagicSlide.tsx, translation.ts і spell-slots.ts; читати речення, не токен (рід і відмінок міняються: «комірки» ж.р. → «слоти» ч.р.).

**Файли:** `src/lib/components/characterSheet/slides/MagicSlide.tsx`, `src/lib/refs/translation.ts`, `src/lib/actions/spell-slots.ts`


### L09-sheet-derived-11 — Кубики шкоди зброї 2024 записані латинкою («1d6»), 2014 — кирилицею («1к6»); лист друкує рядок дослівно

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (внутрішня узгодженість перекладу)

**Має бути:** Той самий запис кістки в обох редакціях («1к6»), як у решті українського тексту застосунку.

**Є:** Персонаж 2024 бачить «1d6» поруч із «1к6» в описах заклинань і рис.

**Доказ:** SQL: `select ruleset, count(*) total, count(*) filter (where damage like '%к%') cyr, count(*) filter (where damage like '%d%') lat from weapon group by ruleset` → RULES_2024: 38 / cyr 0 / lat 37; RULES_2014: 48 / cyr 45 / lat 0. WeaponsCard.tsx:160 друкує `pw.customDamageDice || pw.weapon?.damage` дослівно.

**Відтворення:** Додати посох персонажу 2024 → картка зброї показує «1d6».

**Куди дивитись:** Звести запис у джерелі 2024 (data/2024/normalized/weapons.json) до «к» і перелити — правити файл, не базу (Р33).

**Файли:** `data/2024/normalized/weapons.json`, `src/lib/components/characterSheet/WeaponsCard.tsx`


### L13-wildshape-07 — Показник небезпеки названо трьома різними способами в одному потоці Дикої форми — фічу не звірити з фільтром бестіарію

**Рівень:** P3 · **Редакція:** both · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** src/lib/refs/dictionary.json:265 `challengeRating: "Показник небезпеки (CR)"` і :537 `rules2024.statblockFields.cr: "Показник складності (ПС)"`

**Має бути:** Одна назва й одне скорочення на весь потік «фіча → картка → пікер → статблок».

**Є:** Три різні: КР / Показник небезпеки (CR) / Показник складності (ПС).

**Доказ:** src/lib/components/characterSheet/WildshapeCard.tsx:212 — `КР ${form.creature.challenge}`; src/rules/wildshape.ts:297 — `КР до ${…}`; src/components/bestiary/CreatureStatblockCard.tsx:194 і BestiaryFilterDialog.tsx:78 — «Показник небезпеки (CR)»; опис фічі 48895 у базі — «максимальним Показником складності 1/4» і колонка «Макс. ПС». Скорочення «КР» не збігається з жодним записом словника (grep '"КР' dictionary.json — порожньо).

**Відтворення:** Відкрити лист друїда 2024: картка каже «КР 1/4», опис фічі на слайді Фіч — «Показником складності 1/4», пікер бестіарію — «Показник небезпеки (CR)».

**Куди дивитись:** Власникові вирішити, який термін ратифікований для 2024, і звести всі три до нього; «КР» замінити на скорочення зі словника.

**Файли:** `src/lib/refs/dictionary.json`, `src/rules/wildshape.ts`, `src/lib/components/characterSheet/WildshapeCard.tsx`, `src/components/bestiary/CreatureStatblockCard.tsx`


### L17-known-registries-07 — BUG-004 живий: 30 рис 2014 досі несуть по дві дубльовані ASI-групи вибору, 80 мертвих рядків choice_option; 2024 чистий

**Рівень:** P3 · **Редакція:** 2014 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

🔴 **Не закрито. Рішення власника 2026-09-06: не чіпати зараз, повну правку зробити окремою ціллю після релізу 2024.** Проміжний варіант «видалити 80 мертвих рядків, лишивши парсер» відхилено — він лишає крихкий розбір англійських назв на місці. Вимір і межа: Перевиміряно: не 29 рис і 74 рядки, а **30 і 80**. Головне — **рецепт автора хибний**: правило «видалити все, що закінчується на `(здібність)`» знищило б єдину робочу групу **Resilient**, де саме `(здібність)` несе `effect_kind` на всіх 6 рядках, а мертва там — `Характеристика для Стійкості`. Правильний кінцевий стан (одна група з `effect_kind='ASI'`, як у 2024) вимагає зняти `character.ts` із легасі-розбору назв повними словами («Strength») — це зміна поведінки для 9 394 живих персонажів, тобто власний KR, а не прибирання. Джерело обох груп — `prisma/seed/featChoiceOptionSeed.ts:145` (Resilient, з ефектом) і `:432` (`halfFeatConfigs`, без ефекту).

**Правило:** n/a — цілісність даних, не правило книги.

**Має бути:** Одна ASI-група на риску, з effect_kind/effect_ability, як зроблено для 2024.

**Є:** Дві групи на кожну з 30 рис 2014; мертву рятує лише дедублікація в FeatChoiceOptionsForm.tsx за семантичним ключем.

**Доказ:** spells_test: select count(distinct f.feat_id) feats, count(*) dead_rows from feat_choice_option fco join choice_option co on co.option_id=fco.choice_option_id join feat f on f.feat_id=fco.feat_id where f.ruleset='RULES_2014' and co.group_name ~ '\(здібність\)$' → feats=30, dead_rows=80. Приклад ATHLETE (feat_id=2, RULES_2014): робоча група 2053/2054 «Характеристика ATHLETE» / «ATHLETE Ability (Strength|Dexterity)» і мертва 2174/2175 «Атлет (здібність)» / «ATHLETE (STR|DEX)», обидві з effect_kind=null. 2024 (feat_id=2991) — одна група «Характеристика» з effect_kind='ASI' і заповненим effect_ability. Крос-редакційного витоку немає: select count(*) … where f.ruleset <> co.ruleset → 0.

**Відтворення:** SQL вище через scratchpad/audit/work/L17-known-registries/q6.mjs.

**Куди дивитись:** Прибирання при чищенні сідів: видалити мертві рядки choice_option/feat_choice_option і, за зразком 2024, проставити effect_kind='ASI' на робочих. Реєстр правильно тримає це як прибирання даних, не логічний баг — 100 % збережених PersFeatChoice у проді вказують на робочу групу.

**Файли:** `prisma/seed/`, `tests/content/choice-option-integrity.test.ts`, `docs/KNOWN-BUGS.md`


### L17-known-registries-08 — BUG-005 живий: Elemental Adept 2014 має дві групи по пʼять стихій, жодна без структурного ефекту

**Рівень:** P3 · **Редакція:** 2014 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

🔴 **Не закрито. Те саме рішення власника 2026-09-06, що й у `L17-known-registries-07`** — спільна правка сіду `featChoiceOptionSeed.ts` виноситься в окрему ціль. Вимір: Перевиміряно, збігається дослівно: `feat_id=10`, групи `option_id` 1990–1994 і 2163–2167, `effect_kind` порожній у всіх десяти рядках. Це та сама правка сіду `featChoiceOptionSeed.ts` і той самий власний KR, що `L17-known-registries-07`.

**Правило:** n/a — опір типам шкоди в застосунку не змодельований; це лист персонажа, не симулятор бою.

**Має бути:** Одна група стихій (або жодної, якщо механіка не рахується).

**Є:** Десять рядків на пʼять стихій, з них пʼять дубльовані; вибір гравця не змінює нічого.

**Доказ:** spells_test, feat_id=10 (ELEMENTAL_ADEPT, RULES_2014): група «Стихія Адепта» (option_id 1990-1994, Elemental Adept (Acid|Cold|Fire|Lightning|Thunder)) і група «Elemental Adept (тип пошкодження)» (2163-2167, Elemental Adept (ACID|COLD|FIRE|LIGHTNING|THUNDER)); effect_kind у всіх десяти — null. Версія 2024 (feat_id=3015) натомість має коректні ASI-опції INT/WIS/CHA з effect_kind='ASI'.

**Відтворення:** SQL у scratchpad/audit/work/L17-known-registries/q6.mjs («BUG-005 ELEMENTAL_ADEPT»).

**Куди дивитись:** Видалити дубльовану групу 2163-2167 разом із BUG-004; пріоритет нижчий за BUG-004.

**Файли:** `prisma/seed/`, `docs/KNOWN-BUGS.md`


### L17-known-registries-09 — «Б: раси без тексту» ширша, ніж записано: у spells_test без жодної риси не лише HUMAN_VARIANT, а й базова людина та Своя раса — правка, яку реєстр вважає застосованою, у клоні відсутня

**Рівень:** P3 · **Редакція:** 2014 · **Тип:** data · **Праці:** M · **Вердикт скептика:** downgraded

✅ **Закрито в KR31.12, 2026-09-06** (рішення власника того ж дня — «додати features трьом порожнім расам через seed-module за чинною архітектурою та перейменувати «Темний зір» → «Темнозір»; новий `race.description` не додавати»). Разовий SQL переїхав у сід `prisma/seed/raceTraits2014.ts` — за [Р17](../DECISIONS.md#р17) контент їде сідом. Гейт `tests/db/race-traits-2014-seeded.test.ts` падає, якщо **будь-яка** раса 2014 лишиться без рис. Варіанта людини в тому SQL не було, і книжкового тексту для нього в репозиторії немає, тож його три риси виведені з власних даних проєкту (`raceVariantSeed.ts`, `SkillsForm.tsx:287`, `MultiStepForm.tsx:266`) — джерело кожної названо в модулі. Стовпець опису в `race` власник вирішив не заводити, тож ця частина знахідки закрита як межа, а не як дефект. **Прогін у прод — за власником.** Первісний вимір нижче лишається чинним: Перевиміряно на `spells_test`: без `race_trait` лишаються `HUMAN_2014` (4) і `CUSTOM_LINEAGE_TCE` (1485), без `race_variant_trait` — `HUMAN_VARIANT`; `race_choice_option` 117 досі «Темний зір». Скептик має рацію в механізмі: правки немає й у проді, а клон іде з проду, тож теза автора «наступний db-clone зітре» хибна. `KNOWN-BUGS.md` виправлено: «полагоджено сідом» → «SQL написано, прогін за власником». Не закрито тому, що разовий SQL для контенту суперечить [Р17](../DECISIONS.md#р17) — рядки мусять переїхати в сід-модуль, а це окрема робота з прогоном у прод за власником.

**Правило:** n/a — цілісність контенту.

**Має бути:** Людина, варіант людини й Своя раса мають рядки рис; термін у race_choice_option збігається з ратифікованим «Темнозір».

**Є:** HUMAN_2014, CUSTOM_LINEAGE_TCE — 0 race_trait; HUMAN_VARIANT — 0 race_variant_trait; option_id 117 — «Темний зір».

**Доказ:** spells_test: select r.race_id, r.name::text from race r where not exists (select 1 from race_trait rt where rt.race_id=r.race_id) → 1485 CUSTOM_LINEAGE_TCE, 4 HUMAN_2014. select rv.name::text, count(rvt.*) from race_variant rv left join race_variant_trait rvt using (race_variant_id) group by 1 having count(rvt.*)=0 → HUMAN_VARIANT 0 (єдиний варіант із нулем). При цьому db/changes/2026-08-28-race-traits-custom-lineage-and-human.sql справді робить INSERT INTO race_trait (…) на рядку 74 — тобто цих рядків у клоні немає. Два інші пункти «Б» відтворюються буквально: у таблиці race немає стовпця опису (information_schema: ac, armor_proficiencies, asi, burrow_speed, climb_speed, flight_speed, languages, languages_to_choose_count, name, race_id, ruleset, size, skill_proficiencies, sort_order, source, speed, swim_speed, tool_proficiencies, tool_to_choose_count, weapon_proficiencies); race_choice_option Своєї раси (option_id 117, race_id 1485) називає варіант «Темний зір», тоді як 12 рядків feature несуть «Темнозір»/«Вищий темнозір», а dictionary.json:426 дає "darkvision": "Темнозір" (у словнику «Темний зір» — назва заклинання Darkvision, інша сутність).

**Відтворення:** scratchpad/audit/work/L17-known-registries/q4.mjs і q5.mjs проти spells_test.

**Куди дивитись:** 1) Зʼясувати, чи правка є в робочій базі (агенту читати її заборонено — питання власнику), і донести її до spells_test; 2) перевести ці рядки з одноразового SQL у сід-модуль, інакше наступний db-clone.sh знову зітре їх із клона — той самий клас пастки, що Р33 описує для корекційних проходів; 3) HUMAN_VARIANT дозаповнити через race_variant_trait; 4) перейменувати option_id 117 на «Темнозір».

**Файли:** `db/changes/2026-08-28-race-traits-custom-lineage-and-human.sql`, `prisma/seed/`, `docs/KNOWN-BUGS.md`

**Скептик:** Факти автора підтверджую власними запитами, але серйозність завищена — механіки не гублять нічого, зникає лише книжковий текст.

1) ПРАВИЛО. Оракул є: `data/2014/beyond-srd-uk/batch-18.json` («Власний родовід»): Тип істоти, Розмір, Швидкість, Покращення характеристик, **Риса**, Змінна особливість («темнозір у межах 60 футів»), Мови. `data/2014/srd/01_Races/Racial_Traits.md` дає рубрики людини (ASI, Age, Alignment, Size, Speed, Languages). Тобто текст рис для цих рас справді має бути, і сам оракул пише «темнозір», а не «Темний зір».

2) ДАНІ — перевірив сам (`work/V-L17-09/q.mjs`, `q2.mjs`, `q3.mjs` проти `spells_test`):
- `race` без `race_trait`: 4 HUMAN_2014, 1485 CUSTOM_LINEAGE_TCE; `race_variant` без рис: 54 HUMAN_VARIANT (єдиний).
- Фіч із того SQL у базі **немає взагалі**: `feature where eng_name like 'Custom Lineage:%' or 'Human:%'` → лише три рядки 2024 (Resourceful/Skillful/Versatile).
- У `race` немає стовпця опису (перелік стовпців збігається з наведеним).
- `race_choice_option` 117 (race_id 1485, група «Своя раса»): `option_name = 'Темний зір'`, опис «Ви маєте темний зір…»; словник `dictionary.json:426` — `"darkvision": "Темнозір"`, а «Темний зір [Darkvision]» (рядок 1153) — заклинання.

3) НОВЕ, ЧОГО В АВТОРА НЕМАЄ — стан **робочої** бази. `src/lib/generated/races.json` генерується `scripts/generate-races.ts`, який робить просто `dotenv.config()` (`.env` = прод), а `generate:creator-content` у package.json — `--target prod`. Обидва файли (mtime 04.09 23:53) дають `CUSTOM_LINEAGE_TCE traits: 0`, `HUMAN_2014 traits: 0`, `HUMAN_VARIANT: 0`, і при цьому несуть маркери змін після 28.08 («Sea Elf Race», «Duergar Race», «Human: Resourceful (2024)») — тобто зняті з проду вже після дати SQL. Плюс сам файл `db/changes/2026-08-28-race-traits-custom-lineage-and-human.sql` у git **untracked**. Висновок: правки немає й у проді.

4) ПОЯСНЕННЯ, ЯКОГО АВТОР НЕ ЗНАЙШОВ. `docs/o15-ui-overhaul/kr15.6-races-classes-catalogs.md:296-298` прямо каже: «**Прогін у прод — за власником.** Сід застосований лише до `spells_test`. Поки його немає в робочій базі, `races.json` буде перекидатися». А `scripts/db-clone.sh` перестворює клон із `.env` (прод) з нуля — тому тестовий прогін і зник із `spells_test` після перезняття. Отже теза автора «наступний db-clone зітре її — той самий клас пастки, що Р33» хибна за механізмом: клон іде з проду, а прод правки ніколи не мав. Рядок у `KNOWN-BUGS.md:391-392` («полагоджено сідом») справді бреше про прод — це варто виправити на «SQL написано, прогін у прод за власником».

5) СЕРЙОЗНІСТЬ — знижую P2 → P3. Жодна механіка на `race_trait` тут не висить: `race.asi` тримає +1 до шести / гнучкі +2 (перевірив рядки 4 і 1485), розмір і «темнозір/навичка» — це `race_choice_option` 113/114/117/118 з власними описами, а варіант людини має `overrides_race_asi` і жорстко закодовані гілки (`MultiStepForm.tsx:260`, `SkillsForm.tsx:287`). Гублять рівно художній/довідковий текст на картці — за шкалою CONTEXT це «текст, косметика» (P3), а не «персонаж порахований не за книгою» і не «неможливо налаштувати без перестворення».

6) Не in-flight (файли поза списком паралельної сесії), не прийнято власником: у «Свідомо не зроблено» KR15.6 стоїть лише «розмір/швидкість/мови не заводимо рисами», а не «раси лишаються без тексту»; термін «Темний зір» там же позначено як «один рядок розбіжності, не чіпав» — відкладено, не ратифіковано.


### P1-human-fighter-13 — Усі 16 походжень 2024 показуються з суфіксом редакції в назві — «Солдат 2024» / «Soldier 2024», і непослідовно (Послушник — без суфікса)

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** «Солдат» / «Soldier» — редакція вже задана контекстом сторінки /2024/char

**Є:** Суфікс редакції став частиною назви й видно його на всіх екранах, при цьому один запис із 16 його не має

**Доказ:** src/lib/refs/translation.ts:771 `SOLDIER_2024: "Солдат 2024"`, :864 `SOLDIER_2024: "Soldier 2024"`; так само ARTISAN_2024: "Ремісник 2024" і решта. Дзеркало src/lib/refs/dictionary.json:3837. У списку походжень поруч ACOLYTE показано як «Послушник / Acolyte» без суфікса (shots/P1-human-fighter-10-background.png). Суфікс тягнеться далі: крок характеристик — «Бонуси походження «Солдат 2024»»; лист персонажа — «ПЕРЕДІСТОРІЯ Солдат 2024». Види й класи суфікса не мають («Людина», «Воїн»).

**Відтворення:** /2024/char → крок «Передісторія»; далі крок «Характеристики» і лист персонажа

**Куди дивитись:** Прибрати суфікс із translation.ts (обидві мапи) і перегенерувати дзеркало `npx tsx scripts/sync-dictionary-from-translation.ts`; редакцію показувати бейджем джерела, як уже робить «PHB 2024»

**Файли:** `src/lib/refs/translation.ts`, `src/lib/refs/dictionary.json`


### P1-human-fighter-15 — Картка риси «Умілець» не каже, що риса дає — показано лише примітку про повторюваність

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md:51-57 — Skilled: «You gain proficiency in any combination of three skills or tools of your choice. _Repeatable._ You can take this feat more than once.»

**Має бути:** Перша перевага — «Ви отримуєте володіння будь-якою комбінацією з трьох навичок або інструментів на ваш вибір»

**Є:** Гравець обирає рису, не бачачи, що вона робить

**Доказ:** У списку рис походження картка «Умілець» містить рівно «Повторюваність — Ви можете обирати цю рису більше одного разу» (shots/P1-human-fighter-03-after-race.png). Дані: data/2024/normalized/feats.json, Skilled → benefits: [{name:"Повторюваність", description:"Ви можете обирати цю рису більше одного разу."}], plainDescriptionEng: null. Сусідня «Жорстокий нападник» має повний текст. Так само порожній Great Weapon Master (benefits є, але описова частина відсутня в полі description).

**Відтворення:** /2024/char → Людина → крок «Опції раси», картка «Умілець»

**Куди дивитись:** Додати основну перевагу в benefits риси Skilled у data/2024/normalized/feats.json і перелити сідом (Р33 — правити файл-джерело)

**Файли:** `data/2024/normalized/feats.json`, `prisma/seed/`


### P7-mobile-ux-05 — Назви передісторій 2024 містять службовий суфікс « 2024» у самому перекладі (15 із 16), і він тече в прозу кроку характеристик

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** У редакційному конструкторі 2024 назва — «Шарлатан»; редакцію вже показує окремий бейдж «PHB 2024».

**Є:** Редакція повторена тричі в кожній картці, один із 16 варіантів вибивається без суфікса, а суфікс потрапляє в прозу — і потрапить на лист та у друк, бо вони беруть ту саму мапу.

**Доказ:** Код: src/lib/refs/translation.ts:758-772 — `ARTISAN_2024: "Ремісник 2024"`, `CHARLATAN_2024: "Шарлатан 2024"`, `NOBLE_2024: "Аристократ 2024"` … 15 записів; дзеркально англійська мапа :851-865 (`NOBLE_2024: "Noble 2024"`). Поруч :690 `ACOLYTE: "Послушник"` — той самий 2024-й Послушник без суфікса, бо перевикористовує enum 2014. Браузер (work/P7-mobile-ux/create2.json, крок 701, /2024/char): картки читаються «Аристократ 2024 / Noble 2024 / PHB 2024», «Шарлатан 2024 / Charlatan 2024 / PHB 2024», серед них «Послушник / Acolyte / PHB 2024». Крок 702 («Розподіл характеристик»): рядок «Бонуси походження «Шарлатан 2024»». Скріншот shots/P7/701-Оберіть_передісторію-vp.png.

**Відтворення:** 375×812 → /2024/char → Тифлінг → Чорнокнижник → крок «Оберіть передісторію».

**Куди дивитись:** Прибрати « 2024» з обох мап у translation.ts, перегенерувати дзеркало `npx tsx scripts/sync-dictionary-from-translation.ts`; розрізняти редакції ключем enum і бейджем джерела, а не текстом назви.

**Файли:** `src/lib/refs/translation.ts`, `src/lib/refs/dictionary.json`


## Риси (feats) (28)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P1 | 2024 | data | `L03-feats-01` | Усі 10 рис категорії «Бойовий стиль» 2024 — сама проза: +2 до дальньої атаки (Archery), +1 КЗ (Defense), +2 шкоди (Dueling) не доїжджають до листа | prisma/seed/, src/lib/logic/bonus-calculator.ts |
| · | P1 | 2024 | data | `L03-feats-02` | Жодна з 75 рис 2024 не видає володіння обладунком, зброєю чи інструментом — Lightly/Moderately/Heavily Armored, Martial Weapon Training, Chef, Poisoner, Crafter, Musician, Tavern Brawler порожні | prisma/seed/, src/server/db/levelup-persistence.ts |
| · | P1 | 2024 | data | `L03-feats-03` | Skill Expert не дає ні володіння навичкою, ні експертизи — лише +1 характеристики | prisma/seed/, src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx |
| ✓ | P1 | 2024 | data | `L03-feats-04` | Прирости швидкості від рис (Speedy +10 футів, Boon of Speed +30) не доїжджають до листа | src/lib/logic/bonus-calculator.ts, db/changes/ |
| · | P1 | 2024 | missing-system | `L03-feats-05` | Alert не додає бонус майстерності до ініціативи — головний числовий ефект риси відсутній | src/lib/logic/bonus-calculator.ts, db/changes/ |
| ✓ | P1 | 2024 | data | `L03-feats-07` | Magic Initiate: характеристику замовляння диктує обраний список (WIS/WIS/INT), хоча книга дає гравцеві вибір INT/WIS/CHA | prisma/seed/, src/rules/spell-sources.ts |
| ✓ | P1 | 2024 | missing-system | `L03-feats-10` | Fey Touched і Shadow Touched не дають жодного заклинання — ні Misty Step/Invisibility, ні обраного заклинання 1-го рівня | prisma/seed/, src/rules/spell-sources.ts |
| ✓ | P1 | 2024 | data | `L03-feats-12` | Weapon Master не додає слота майстерності зброї, хоча система майстерності в проєкті повністю реалізована | src/server/db/weapon-mastery.ts, src/lib/components/levelUp/levelup-weapon-mastery.ts |
| · | P1 | both | bug | `L03-feats-15` | Менеджер рис на листі додає рису без жодного гейта, без ASI і без виборів усередині риси | src/lib/actions/feat-actions.ts, src/server/db/feat-actions.ts |
| ✓ | P1 | 2024 | data | `L03-feats-16` | Риса «Ability Score Improvement» присутня в списку рис і не робить нічого — витрачене підвищення 4-го рівня | src/lib/components/characterCreator/FeatsForm.tsx, src/lib/components/levelUp/LevelUpASIForm.tsx |
| ✓ | P1 | 2024 | data | `L03-feats-19` | Епічні дари: жодної механіки, крім +1 характеристики — Boon of Fortitude +40 HP, Boon of Skill «володіння всіма навичками», Boon of Energy Resistance (вибір 2 типів шкоди) не існують | prisma/seed/, db/changes/ |
| · | P1 | 2024 | missing-system | `L09-sheet-derived-04` | Ініціатива не знає риси Пильність 2024 (+БМ) — жодна фіча чи риса не може вплинути на ініціативу взагалі | src/lib/logic/bonus-calculator.ts, prisma/schema.prisma |
| ✓ | P1 | 2024 | bug | `P1-human-fighter-07` | Три навички, обрані в рисі «Умілець» (Skilled), не зберігаються — ні pers_skill, ні _ChoiceOptionToPers | src/server/db/character-creation.ts, src/lib/components/characterCreator/MultiStepForm.tsx |
| · | P1 | 2024 | bug | `P3-multiclass-wizard-cleric-04` | Друга «Посвячений у магію» від Універсальності Людини не збереглася, а вибори списків заклинань не збереглися жодного разу | src/server/db/character-creation.ts, src/server/db/creation-content.ts |
| · | P2 | 2024 | data | `L03-feats-06` | Lucky не заводить пулу «Очки удачі» (БМ зарядів, відновлення довгим відпочинком), хоча система ресурсів у проєкті є | prisma/seed/, src/lib/logic/feature-resources.ts |
| ✓ | P2 | 2024 | data | `L03-feats-08` | Elemental Adept не має вибору типу шкоди, тому й повтор нічим не обмежений — рису можна брати нескінченно з тим самим ефектом | prisma/seed/, src/rules/repeatable-feats.ts |
| ✓ | P2 | 2024 | data | `L03-feats-09` | Skilled: пропонує лише 18 навичок (книга дозволяє й інструменти), а опис риси втратив сам бенефіт | data/2024/normalized/feats.json, prisma/seed/ |
| ✓ | P2 | 2024 | missing-system | `L03-feats-11` | Ritual Caster не дає ритуальних заклинань (БМ штук 1-го рівня, +1 при зростанні БМ) | src/rules/spell-sources.ts, prisma/seed/ |
| · | P2 | 2024 | data | `L03-feats-14` | Риси «Бойовий стиль» доступні будь-кому з класового ASI: у них немає передумови «Fighting Style Feature» | prisma/seed/, src/lib/logic/prerequisiteUtils.ts |
| · | P2 | 2024 | bug | `L03-feats-17` | Епічні дари: стеля характеристики зашита як 20, хоча книга дозволяє до 30 | src/rules/levelup.ts, src/rules/abilities.ts |
| ↓ | P2 | 2024 | missing-system | `L07-spellcasting-04` | Риса «Посвячений у магію» 2024 не дає заклинань і не питає, які саме: 2 замовляння + 1 заклинання 1-го рівня втрачені | src/lib/components/characterCreator/creation-step-resolver.ts, src/lib/components/levelUp/LevelUpWizard.tsx |
| · | P2 | 2024 | data | `L07-spellcasting-05` | «Посвячений у магію» 2024: характеристика замовляння прибита до списку, хоча книга дає вільний вибір INT/WIS/CHA | data/2024/normalized/feats.json, src/rules/spell-sources.ts |
| · | P2 | both | bug | `L08-levelup-machine-07` | Сервер не перевіряє передумови риси на ASI-рівні — ні рівень, ні характеристики | src/server/db/feat-gates.ts, src/rules/repeatable-feats.ts |
| · | P2 | both | bug | `L11-persistence-identity-05` | «Додати рису» з листа пише голий рядок `pers_feat`: без гейта категорій/повторів, без виборів, без ASI, без навичок і без рядків `pers_feature` | src/lib/actions/feat-actions.ts, src/server/db/feat-actions.ts |
| · | P2 | 2024 | data | `P1-human-fighter-11` | Риса «Умілець» пропонує лише 18 навичок — інструментів, дозволених книгою, у списку немає | data/2024/normalized/feats.json, prisma/seed/ |
| · | P2 | 2024 | data | `P2-elf-wizard-08` | Magic Initiate 2024: характеристика заклинань прибита до списку (Чарівник→INT, Клірик/Друїд→WIS), тоді як книга дає вибір INT/WIS/CHA | data/2024/normalized/feats.json, prisma/seed/ |
| ↓ | P3 | 2024 | bug | `L03-feats-13` | Передумова «володіння» (prerequisiteProficiency) ніде не перевіряється — Heavy Armor Master доступний чарівникові | src/lib/logic/prerequisiteUtils.ts, src/server/db/feat-gates.ts |
| · | P3 | 2024 | data | `L03-feats-18` | Boon of Spell Recall втратив передумову «Spellcasting Feature» — доступний варварові | data/2024/normalized/feats.json, prisma/seed/ |

### L03-feats-01 — Усі 10 рис категорії «Бойовий стиль» 2024 — сама проза: +2 до дальньої атаки (Archery), +1 КЗ (Defense), +2 шкоди (Dueling) не доїжджають до листа

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-06 (KR31.4). `FIGHTING_STYLE_MECHANICS_2024` у `prisma/seed/fightingStyle2024.ts` кладе числа книги в ті самі колонки `Feature`, які `bonus-calculator` уже читав для стилів 2014 — правки рушія не знадобилося. П'ять стилів із десяти лишаються прозою свідомо: Blind Fighting (сліпозір), Great Weapon Fighting (перекид куба), Interception і Protection (реакції) і Two Weapon Fighting не мають числа, яке лист рахує, і колонки під них у `feature` не існує.

**Правило:** data/2024/srd/feats.md: «Archery … you gain a +2 bonus to attack rolls you make with Ranged weapons»; «Defense … you gain a +1 bonus to Armor Class»

**Має бути:** Воїн 2024 з Archery має +2 до кидка атаки дальньою зброєю; з Defense — +1 КЗ у обладунку; з Dueling — +2 шкоди одноручною.

**Є:** Числа на листі ідентичні до і після взяття риси бойового стилю; риса лишається лише абзацом тексту.

**Доказ:** Запит до spells_test (scratchpad/audit/work/L03-feats/db.mjs): select f.eng_name, ft.eng_name, ft.bonus_to_ranged_attack_roll, ft.gives_ac, ft.bonus_to_melee_one_handed_weapon_damage from feat f join "_FeatGrantsFeature" j on j."A"=f.feat_id join feature ft on ft.feature_id=j."B" where f.ruleset='RULES_2024' and f.category='FIGHTING_STYLE'; → усі 10 рядків мають NULL у всіх механічних колонках. Для контрасту в тій самій таблиці: «Archery | RULES_2014 | rng=2», «Defense | RULES_2014 | ac=1, requires_armor=true», «Dueling | RULES_2014 | duel=2». Лист читає саме ці колонки: src/lib/logic/bonus-calculator.ts:440 (bonusToRangedAttackRoll), :471 (bonusToMeleeOneHandedWeaponDamage), :215 (givesAC), а фічі від рис у пул потрапляють — bonus-calculator.ts:183-186 «Feats can grant features».

**Відтворення:** 1) Створити на :3100 воїна 2024 рівня 1, на кроці бойового стилю обрати Archery. 2) На листі додати лук. 3) Порівняти бонус атаки з тим самим персонажем без риси — різниці немає.

**Куди дивитись:** Заповнити колонки фіч «Fighting Style: * (2024)» тими самими значеннями, що вже стоять у рядках 2014: bonus_to_ranged_attack_roll=2, gives_ac=1 + requires_armor_for_ac_bonus=true, bonus_to_melee_one_handed_weapon_damage=2, thrown_damage_boost=2, unarmed_damage для Unarmed Fighting. Правити у файлі-джерелі сіду й перелити (Р33), не проходом по базі.

**Файли:** `prisma/seed/`, `src/lib/logic/bonus-calculator.ts`, `src/lib/generated/creator-content-2024.json`


### L03-feats-02 — Жодна з 75 рис 2024 не видає володіння обладунком, зброєю чи інструментом — Lightly/Moderately/Heavily Armored, Martial Weapon Training, Chef, Poisoner, Crafter, Musician, Tavern Brawler порожні

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Статус:** 🔴 закрито шість рис із девʼяти (KR31.4, 2026-09-06). Lightly / Moderately / Heavily Armored, Martial Weapon Training, Chef і Poisoner видають володіння в даних (`FEAT_PROFICIENCY_GRANTS_2024`), і рушій їх уже читав. Crafter і Musician просять **обрати** три інструменти, а `ChoiceOptionEffectKind` має лише `ASI`, `SKILL_PROFICIENCY` і `SKILL_EXPERTISE`; Tavern Brawler дає володіння імпровізованою зброєю, якої немає в `WeaponType`. Обидва — новий канал, а не рядок даних.

Дорогою виміряно: форма `{COOKS_UTENSILS: 1}`, якою написані риси 2014, рушієм **не читається взагалі** — `parseEnumArray(…, ToolCategory)` чекає масив і на обʼєкті віддає `[]`. 2024 написаний масивами; 2014 не чіпано.

**Правило:** data/2024/source/raw/feat/moderately-armored.html: «Armor Training. You gain training with Medium armor.»; martial-weapon-training.html: «Weapon Proficiency. You gain proficiency with Martial weapons.»; crafter.html: «Tool Proficiency. You gain proficiency with three different Artisan's Tools of your choice»; musician.html: «Instrument Training. You gain proficiency with three Musical Instruments of your choice.»

**Має бути:** Moderately Armored додає володіння середнім обладунком; Martial Weapon Training — бойовою зброєю; Crafter і Musician дають вибір трьох інструментів.

**Є:** Списки володінь персонажа після взяття будь-якої з цих рис не змінюються; вибору інструментів у майстрі немає.

**Доказ:** Запит до spells_test: select f.eng_name, f.granted_skill_count, f.granted_armor_proficiencies, f.granted_weapon_proficiencies, f.granted_tool_proficiencies from feat f where f.ruleset='RULES_2024' and (granted_armor_proficiencies <> '{}' or granted_weapon_proficiencies is not null or granted_tool_proficiencies is not null or granted_skill_count > 0); → повертає РІВНО 6 рядків, і в жодному немає володінь: 5 рис із prerequisite_proficiency (Heavily Armored, Heavy Armor Master, Medium Armor Master, Moderately Armored, Shield Master) і Skilled (granted_skill_count=3). Тобто granted_armor_proficiencies='{}' і granted_weapon/tool_proficiencies=NULL для всіх 75. Рушій ці поля читає: src/server/db/levelup-persistence.ts:290-294 (featGrantedArmorProficiencies/ToolProficiencies/WeaponProficiencies). У Crafter і Musician до того ж featChoiceOptions.length === 0 — вибрати три інструменти нема де.

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); ['Lightly Armored','Moderately Armored','Heavily Armored','Martial Weapon Training','Chef','Poisoner','Crafter','Musician','Tavern Brawler'].forEach(n=>{const f=c.feats.find(x=>x.engName===n); console.log(n, JSON.stringify(f.grantedArmorProficiencies), f.grantedWeaponProficiencies, f.grantedToolProficiencies, (f.featChoiceOptions||[]).length)})"

**Куди дивитись:** Заповнити feat.granted_armor_proficiencies / granted_weapon_proficiencies / granted_tool_proficiencies у сіді 2024 і додати групу опцій «Інструменти» (3 вибори) для Crafter і Musician. Код уже все читає.

**Файли:** `prisma/seed/`, `src/server/db/levelup-persistence.ts`, `src/server/db/character-creation.ts`, `src/lib/generated/creator-content-2024.json`


### L03-feats-03 — Skill Expert не дає ні володіння навичкою, ні експертизи — лише +1 характеристики

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-06 (KR31.4). `seedSkillExpertChoiceOptions` дає дві групи по 18 навичок — «Володіння» з `SKILL_PROFICIENCY` і «Експертиза» з `SKILL_EXPERTISE`, — тобто рівно ту схему, яку та сама риса має в 2014, плюс `granted_skill_count = 1`. Обидва `effectKind` рушій застосовує і при створенні, і при підвищенні; механізм KR31.2 не дубльовано.

**Правило:** data/2024/source/raw/feat/skill-expert.html: «Skill Proficiency. You gain proficiency in one skill of your choice. Expertise. Choose one skill in which you have proficiency but lack Expertise. You gain Expertise with that skill.»

**Має бути:** +1 характеристика, +1 володіння навичкою на вибір, +1 експертиза в навичці, якою вже володієш.

**Є:** Тільки +1 характеристика; на слайді Навичок нічого не змінюється.

**Доказ:** creator-content-2024.json, Skill Expert: grantedSkillCount=0, grantedSkills=null, grantsFeature=[] (у базі: select count(j."B") from feat f left join "_FeatGrantsFeature" j on j."A"=f.feat_id where f.ruleset='RULES_2024' and f.category='GENERAL' → 0 для всіх 43 GENERAL), featChoiceOptions=6 і всі шість — вибір характеристики для grantedASI {"ANY":1}. Опцій з effectKind='SKILL_PROFICIENCY' чи експертизи немає. Український опис риси в тому самому JSON обидва бенефіти описує — розходяться саме текст і механіка.

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); const f=c.feats.find(x=>x.engName==='Skill Expert'); console.log(f.grantedSkillCount, f.grantedSkills, (f.grantsFeature||[]).length, (f.featChoiceOptions||[]).map(o=>o.choiceOption.groupName))"

**Куди дивитись:** Скопіювати схему Skilled: 18 опцій effectKind='SKILL_PROFICIENCY' у групі «Володіння» (1 вибір) плюс окрема група експертизи; Feature.skillExpertises у схемі вже є.

**Файли:** `prisma/seed/`, `src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx`


### L03-feats-04 — Прирости швидкості від рис (Speedy +10 футів, Boon of Speed +30) не доїжджають до листа

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-06 (KR31.4). Нова колонка `feature.speed_bonus` (DDL `2026-09-06-kr31.4-feat-mechanics-columns.sql`), правило `sumFeatureSpeedBonus` у `src/rules/feature-stat-grants.ts`, читання в `calculateFinalSpeed`. Speedy +10, Boon of Speed +30. Захардкоджена база 30 футів лишається — це KR31.6, інша знахідка.

**Правило:** data/2024/source/raw/feat/speedy.html: «Speed Increase. Your Speed increases by 10 feet.»; boon-of-speed.html: «Quickness. Your Speed increases by 30 feet.»

**Має бути:** Персонаж зі Speedy має швидкість 40 футів.

**Є:** 30 футів.

**Доказ:** Обидві риси мають grantsFeature=[] (у базі GENERAL і EPIC_BOON дають 0 фіч на 55 рис). src/lib/logic/bonus-calculator.ts:396-398: calculateFinalSpeed(pers) = 30 + getSimpleBonus(pers,"speed"), де 'speed' мапиться на pers.speedBonuses (bonus-calculator.ts:64-77) — це ручний JSON-бонус персонажа, який жодна риса не заповнює. У таблиці feature колонки швидкості взагалі немає (перелік колонок з information_schema: armor_proficiencies, bonus_hit_points_per_level, bonus_to_attack_roll, …, use_price, uses_* — жодної speed).

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); ['Speedy','Boon Of Speed'].forEach(n=>{const f=c.feats.find(x=>x.engName===n); console.log(n,(f.grantsFeature||[]).length,(f.featChoiceOptions||[]).length)})" → обидві: 0 фіч, лише опції характеристики

**Куди дивитись:** Або нова колонка feature.speed_bonus (DDL) із читанням у calculateFinalSpeed, або запис у pers.speedBonuses під час створення/підвищення при видачі риси.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `db/changes/`, `prisma/seed/`

**Скептик:** (1) ПРАВИЛО — підтверджено з оракула репо. `data/2024/source/raw/feat/speedy.html`: «Speed Increase. Your Speed increases by 10 feet.» (Prerequisite: Level 4+, Dex or Con 13+); `boon-of-speed.html`: «Quickness. Your Speed increases by 30 feet.» Обидві — PHB 2024 (у `data/2024/srd/feats.md` цих рис немає взагалі, `grep -i speed` там порожній), тож цитата автора точна і редакція названа правильно.

(2) КОД — перевірив незалежно, іншого каналу немає. Єдине місце, де швидкість малюється на листі: `/Users/luka/Documents/code/spells.holota.family/src/lib/components/characterSheet/slides/MainStatsSlide.tsx:565` → `calculateFinalSpeed(pers)`; друк — `src/server/pdf/generateCharacterPdf.ts:1065` і `:1205` те саме. Сама функція (`src/lib/logic/bonus-calculator.ts:394-398`): `return 30 + getSimpleBonus(pers, "speed")`, де `speed → speedBonuses` (`:68`). Писання в `speedBonuses` у всьому `src/` — лише ручний бонус (`ModifyStatModal.tsx:375`, `src/server/db/bonus-actions.ts:174`), дика форма (`src/lib/logic/beast-form.ts:114`) і копіювання персонажа/снапшот/шеринг. У `prisma/` і `scripts/` — жодного запису. Це визнано в самому проєкті: `docs/o24-wildshape-second-layer/kr24.4-second-layer.md:124` — «у `calculateFinalSpeed` іншого каналу немає — вона рахується як `30 + бонус`». Власний запит до `spells_test`: `feature` не має **жодного** стовпця з `speed` (`information_schema` → порожньо), `pers` має тільки `speedbonuses`; `Speedy` (feat_id 3051, GENERAL) і `Boon Of Speed` (3001, EPIC_BOON) дають по 0 фіч у `_FeatGrantsFeature`. Тобто риса фізично не має куди покласти швидкість.

(3) РІШЕННЯ ВЛАСНИКА — немає. `docs/DECISIONS.md` згадує швидкість один раз (рядок 876, про маркери глосарію), `docs/KNOWN-BUGS.md` — жодного разу, «Поза межами» в `docs/o18-2024-character-parity/README.md:229-234` перелічує бастіони, переклад, 2014 і гейт релізу — швидкості там немає. Прийнятою поведінкою це ніде не оголошено.

(4) IN-FLIGHT — ні. Жоден із задіяних файлів (`bonus-calculator.ts`, `MainStatsSlide.tsx`, `generateCharacterPdf.ts`, сіди рис) не у списку паралельної сесії (KR27.7/KR30.3 — заклинання й прогресія).

(5) ВЖЕ ВІДКРИТО — ні. KR18.3 (`docs/o18-2024-character-parity/kr18.3-feat-sources.md`) розібрав із прози тільки передумови, `grantedASI` й вибори; швидкість у його «Готово, коли» і в боргах не згадана. KR24.4 лише скористався `speedBonuses` як каналом для звіра. Тестів на швидкість персонажа немає взагалі (`grep -il speed tests/` дає лише бестіарій/дику форму).

(6) СЕРЙОЗНІСТЬ — P1 правильна: число на листі не за книгою (30 замість 40 у Speedy, 30 замість 60 у Boon of Speed). Ручний бонус на картці існує, але це обхід гравцем, а не розрахунок.

Уточнення класифікації: не `data`, а `missing-system`. Заповнювати нічого — у `feature` немає стовпця під швидкість, і навіть наявні дані ігноруються (див. нижче), тож потрібен DDL + нова гілка похідної, а не сід.

Уточнення редакції: не 2024, а **both** — корінь ширший за риси (докази нижче).


### L03-feats-05 — Alert не додає бонус майстерності до ініціативи — головний числовий ефект риси відсутній

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-06 (KR31.4) разом із `L09-sheet-derived-04`. Колонка `feature.initiative_proficiency` булева, а не числова: `grep` по `data/2024/srd` і `data/2024/normalized` дає рівно одне джерело числового впливу на ініціативу — саме Alert; Feral Instinct і Remarkable Athlete дають перевагу.

**Правило:** data/2024/srd/feats.md, Alert: «Initiative Proficiency. When you roll Initiative, you can add your Proficiency Bonus to the roll.»

**Має бути:** Персонаж 1-го рівня з рисою походження «Пильний» має ініціативу DEX+2.

**Є:** Ініціатива дорівнює модифікатору Спритності; риса — самий текст.

**Доказ:** Запит до spells_test: фіча «Origin Feat: Alert (2024)» має NULL у всіх механічних колонках (bonus_to_ranged_attack_roll, gives_ac, bonus_hit_points_per_level, armor/weapon/tool_proficiencies, skill_proficiencies, saving_throws, uses_count). У таблиці feature колонки для ініціативи не існує взагалі. src/lib/logic/bonus-calculator.ts:401-403: calculateFinalInitiative = DEX-mod + getSimpleBonus(pers,"initiative"), а 'initiative' → pers.initiativeBonuses (ручний JSON персонажа).

**Відтворення:** 1) На :3100 створити персонажа 2024 з походженням, що дає Alert. 2) Відкрити лист → блок Ініціативи. 3) Значення = модифікатор DEX без БМ.

**Куди дивитись:** Додати ознаку «ініціатива з БМ» на рівні Feature (DDL, напр. initiative_proficiency boolean) і врахувати в calculateFinalInitiative, або проставляти pers.initiativeBonuses під час видачі риси.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `db/changes/`, `prisma/seed/`


### L03-feats-07 — Magic Initiate: характеристику замовляння диктує обраний список (WIS/WIS/INT), хоча книга дає гравцеві вибір INT/WIS/CHA

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/feats.md, Magic Initiate: «Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat's spells (choose when you select this feat).»

**Має бути:** Чароді́й із Magic Initiate (Cleric) може обрати Харизму як характеристику заклинань риси.

**Є:** Характеристика завжди WIS (Cleric/Druid) або INT (Wizard); вибір гравця з книги втрачено, і у нечаклунських класів заклинання риси рахуються не тією характеристикою.

**Доказ:** creator-content-2024.json, Magic Initiate.featChoiceOptions — рівно три опції групи «Список заклинань», кожна з жорсткою характеристикою: choiceOptionId 3379 «Magic Initiate 2024 (Cleric)» effectAbility="WIS"; 3380 (Druid) effectAbility="WIS"; 3381 (Wizard) effectAbility="INT". src/rules/spell-sources.ts (findFeatSources / ChosenFeatOption.effectAbility) бере саме цю effectAbility як характеристику джерела риси. Групи «Характеристика замовляння» у риси немає.

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); c.feats.find(f=>f.engName==='Magic Initiate').featChoiceOptions.forEach(o=>console.log(o.choiceOption.optionNameEng, o.choiceOption.effectAbility))"

**Куди дивитись:** Додати другу групу опцій «Характеристика замовляння» (INT/WIS/CHA) на рису; findFeatSources читає її замість effectAbility списку.

**Файли:** `prisma/seed/`, `src/rules/spell-sources.ts`, `src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx`

**Скептик:** ПРАВИЛО (перевірив сам). `data/2024/srd/feats.md:37` — Magic Initiate, Two Cantrips: «Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat's spells (choose when you select this feat)». Це саме редакція 2024; у 2014 характеристику диктував клас списку, тож у даних відтворено правило старої редакції.

ДАНІ (незалежний доказ, не з авторського JSON). Запит до `spells_test` (скрипт scratchpad/audit/work/V-L03-07/q3.mjs): у риси `feat_id 3029` (MAGIC_INITIATE, RULES_2024) рівно три `feat_choice_option` → `choice_option` 3379/3380/3381, група «Список заклинань», `effect_ability` WIS/WIS/INT. Жодної групи вибору характеристики немає. Джерело даних — не прохід по базі, а сід: `prisma/seed/featMechanics2024.ts:146-159`, де `effectAbility: await findCastingAbility(prisma, spellList.classKey)` бере `class.primary_casting_stat` («Характеристику списку не пишемо руками — вона вже стоїть на самому класі»). Тобто помилка в файлі-джерелі, а не в базі — правити за Р33 у сіді.

КОД. Іншого місця, де б гравцеві давали цей вибір, немає: `src/rules/spell-sources.ts:172` `findFeatSources` фільтрує опції за `effectAbility && effectKind !== "ASI"` і бере характеристику як є; `src/server/db/spell-sources.ts:34-36` подає туди саме `choice_option.effect_ability`. Заголовок модуля прямо кодифікує стару норму: «риса „Посвячений у магію“ — характеристикою обраного списку». Проєкт при цьому вміє потрібний патерн: у видів 2024 є група «Базова характеристика заклинань» (`race_choice_option` 146-154, `spellcasting_ability` INT/WIS/CHA) — тобто механіка вибору існує, її просто не завели на рису. (Дрібна неточність у member_evidence: опції видів мають id 146-154, а не 144-146; на висновок не впливає.)

РІШЕННЯ ВЛАСНИКА. Не знайшов жодного. У DECISIONS.md про характеристику риси нічого; «Прийнято» в KNOWN-BUGS.md — лише BUG-001…003 про довіру сервера до UI; «Поза межами» O18 і O27 цього не містять. KR18.4 і KR27.5 закриті, але жоден не ставив питання вибору характеристики — KR27.5 явно обмежився «характеристика за джерелом» і Р38. Отже це не accepted і не відкритий KR.

IN-FLIGHT. Ні: `src/rules/spell-sources.ts`, `src/server/db/spell-sources.ts`, `prisma/seed/featMechanics2024.ts` не входять у список файлів паралельної сесії (KR27.7/KR30.3).

ЧОГО АВТОР НЕ ДОВІВ (важлива поправка). Твердження «у нечаклунських класів заклинання риси рахуються не тією характеристикою» сьогодні не відтворюване: `loadPersSpellSources` викликається **тільки** з тестових хелперів (`tests/helpers/build-2024-*.ts`), а лист і PDF рахують одну характеристику на весь лист із класу — `MagicSlide.tsx:163` `const spellcastingAbility = localPers.class?.primaryCastingStat` → `calculateSpellDC/Attack`, те саме в `generateCharacterPdf.ts:787-798`. Тож жодне число на листі зараз не «неправильне» через цю опцію; вона живе лише у виведеній моделі джерел, яку читає приймальний набір 2024 (обидві фікстури з MI — 03 wizard/INT і 08 ranger+Druid/WIS — випадково збігаються, тому набір цю помилку й не ловить).

СЕРЙОЗНІСТЬ. Лишаю P1 за буквою шкали («відсутня риса/**вибір**»): книжковий вибір відсутній повністю, і це не гіпотеза — гравцеві в конструкторі показують український опис риси, який прямо каже «Інтелект, Мудрість або Харизма є вашою характеристикою для заклинань цієї риси (оберіть під час вибору цієї риси)», а обирати нема де. Плюс модель джерел жорстко несе характеристику 2014. Але це P1 саме через **відсутній вибір**, а не через хибне число на листі — числа зараз не зачеплені.


### L03-feats-10 — Fey Touched і Shadow Touched не дають жодного заклинання — ні Misty Step/Invisibility, ні обраного заклинання 1-го рівня

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** data/2024/source/raw/feat/fey-touched.html: «Fey Magic. Choose one level 1 spell from the Divination or Enchantment school … You always have that spell and the Misty Step spell prepared. You can cast each of these spells without expending a spell slot … until you finish a Long Rest.»; shadow-touched.html — те саме з Invisibility, школи Illusion/Necromancy.

**Має бути:** Misty Step (відповідно Invisibility) завжди підготовлене, плюс одне обране заклинання 1-го рівня потрібної школи; кожне — одне безкоштовне застосування на довгий відпочинок (Р38: безкоштовне застосування — фіча).

**Є:** Риса дає лише +1 характеристики й абзац тексту; заклинань на листі не зʼявляється, вибору школи немає.

**Доказ:** creator-content-2024.json: Fey Touched і Shadow Touched мають grantsFeature=[] і featChoiceOptions=3, де всі три — вибір характеристики (INT_OR_WIS_OR_CHA). src/rules/spell-sources.ts:89-111 (findGrantedSpells) видає поіменні заклинання ТІЛЬКИ від виду: після перевірки редакції одразу findSpeciesSource(input.raceTraits, input.raceChoiceOptions) — рис серед джерел поіменних заклинань немає.

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); ['Fey Touched','Shadow Touched'].forEach(n=>{const f=c.feats.find(x=>x.engName===n); console.log(n,(f.grantsFeature||[]).length,f.featChoiceOptions.map(o=>o.choiceOption.groupName))})"

**Куди дивитись:** Звʼязок Feature.givesSpells (таблиця _FeatureToSpell) на фічі риси для Misty Step/Invisibility + група опцій «Заклинання 1-го рівня» з фільтром за школою; безкоштовне застосування — окрема фіча з limited_uses_per='LONG_REST'.

**Файли:** `prisma/seed/`, `src/rules/spell-sources.ts`, `db/changes/`

**Скептик:** Підтверджую власним доказом; знахідка автора точна, ще й вужча за реальність.

(1) ПРАВИЛО. `data/2024/source/raw/feat/fey-touched.html`: «Fey Magic. Choose one level 1 spell from the Divination or Enchantment school of magic. You always have that spell and the Misty Step spell prepared. You can cast each of these spells without expending a spell slot… until you finish a Long Rest». `shadow-touched.html` — те саме з Illusion/Necromancy та Invisibility. Обидві — PHB 2024, `GENERAL`, передумова «4+ рівень» (у SRD 5.2.1 їх немає, тому оракул саме raw/feat). `data/2024/normalized/feats.json` несе цей бенефіт і англійською, і українською (з посиланням на «Туманний крок [Misty Step]»), тобто джерело сіду про заклинання знає — сід їх просто не матеріалізує.

(2) КОД — перевірив незалежно, не лише через creator-content. Запит до `spells_test` (мій скрипт scratchpad/audit/work/V-L03-10.mjs): feat 3016 `Fey Touched` / 3044 `Shadow Touched`, `ruleset=RULES_2024` → у `_FeatGrantsFeature` **нуль рядків**; єдині `feat_choice_option` — група «Характеристика», `effect_kind=ASI`, INT/WIS/CHA. `_FeatureToSpell` з Misty Step/Invisibility має лише рядки `RULES_2014` (родовід/підклас), жодного для цих рис. Грепом по `src/` (без `lib/generated/`) `Fey Touched|FEY_TOUCHED|Shadow Touched` трапляється **лише** в `translation.ts:1421,1427` як підпис — обробки за іменем (як у Resilient/Tough) немає. `src/rules/spell-sources.ts:87-107` (`findGrantedSpells`) справді матеріалізує поіменні заклинання тільки від виду: `findSpeciesSource(...)`, і при порожньому джерелі повертає `[]`; риса в `findFeatSources` дає щонайбільше *джерело з характеристикою*, і то лише коли опція має `effectAbility` та `effectKind !== "ASI"` — у Fey/Shadow Touched усі три опції саме `ASI`, тож навіть джерела не виникає.

Додатковий доказ, якого в автора немає і який робить це саме `missing-system`, а не `data`: `enum ChoiceOptionEffectKind` у `prisma/schema.prisma` має рівно три значення — `ASI`, `SKILL_PROFICIENCY`, `SKILL_EXPERTISE`. Вибору «одне заклинання 1-го рівня зі школи X» немає чим виразити взагалі: потрібен новий вид опції (або окрема система вибору заклинання риси), а не заповнення наявних колонок. Механізм «фіча риси з `givesSpells` + `LONG_REST/1`» існує (так зроблено `Посвячений у магію: список X`), але для Fey/Shadow Touched не заведено нічого — ні фічі, ні лічильника.

(3) РІШЕННЯ ВЛАСНИКА — не покривають. Р38 говорить про *дублікат* заклинання з двох джерел і про безкоштовне застосування як фічу; він передбачає, що риса заклинання **дає**, а не скасовує це. «Поза межами» O18 (бастіони, переклад, 2014, гейт релізу) і O27 (спорядження, старт на високому рівні, 2014, артифіцер) цього не називають. У `KNOWN-BUGS.md` і `o21-user-signals/defects.md` цих рис немає. Грепом по всьому `docs/` — жодної згадки Fey/Shadow Touched.

(4) IN-FLIGHT — ні: `src/rules/spell-sources.ts`, сіди рис і `prisma/seed/featMechanics2024.ts` не в переліку файлів паралельної сесії (там `spell-preparation-2024.ts`, `spellcasting-progression.ts`, `spell-actions.ts`, `pers-actions.ts`, `AddSpellDialog.tsx` тощо).

(5) ВІДКРИТИЙ KR — не знайдено. KR18.3 закрив передумови й `grantedASI` усіх 75 рис і прямо перелічує, де завели вкладені вибори (Skilled, Magic Initiate, 10 бойових стилів) — Fey/Shadow Touched туди не потрапили і ніде не відкладені явно.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою підтверджую: персонаж рахується не за книгою (немає двох заклинань, які книга видає поіменно/на вибір) і вибір гравця (школа Ворожіння/Причарування) недоступний. Помʼякшення, яке варто знати: заклинання можна додати вручну з листа (`addManualSpell`), тож гравець не заблокований — але «завжди підготоване» й безкоштовне застосування раз на довгий відпочинок (за Р38 — фіча) не існують у жодному вигляді, тому до P2 не знижую.


### L03-feats-12 — Weapon Master не додає слота майстерності зброї, хоча система майстерності в проєкті повністю реалізована

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт скептика:** confirmed

**Статус:** 🔴 слот закрито, пул — ні (KR31.4, 2026-09-06). `countFeatMasterySlots` у `src/rules/weapon-mastery.ts` додає слот риси **поверх** класового максимуму (класи між собою беруть максимум, риса — окреме джерело), і чарівник із Weapon Master уперше отримує ємність 1. Пул зброї лишається класовим: `findWeaponMasteryOptionsForClasses` будує список із `class.weaponProficiencies`, а книга каже «provided you have proficiency with it» — тобто мав би рахувати й володіння від рис і виду.

**Правило:** data/2024/source/raw/feat/weapon-master.html: «Mastery Property. Your training with weapons allows you to use the mastery property of one kind of Simple or Martial weapon of your choice, provided you have proficiency with it. Whenever you finish a Long Rest, you can change the kind of weapon.»

**Має бути:** Взявши Weapon Master, персонаж отримує +1 слот майстерності зброї, який можна змінювати після довгого відпочинку.

**Є:** Кількість слотів майстерності після взяття риси не змінюється.

**Доказ:** creator-content-2024.json: Weapon Master grantsFeature=[], featChoiceOptions=2 — обидві вибір STR/DEX для grantedASI {"STR_OR_DEX":1}. При цьому в проєкті є таблиця pers_weapon_mastery, src/rules/weapon-mastery.ts, src/server/db/weapon-mastery.ts (findCreationWeaponMasteryOffer, replacePersWeaponMastery), крок weaponMastery у creation-step-resolver.ts:67 і LevelUpWeaponMasteryStep.tsx — але риса до цієї системи не підключена (грепом weapon-mastery не згадується в жодному feat-шляху).

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); const f=c.feats.find(x=>x.engName==='Weapon Master'); console.log((f.grantsFeature||[]).length, f.featChoiceOptions.map(o=>o.choiceOption.groupName))"

**Куди дивитись:** Розширити findCreationWeaponMasteryOffer і levelup-weapon-mastery.ts так, щоб кількість слотів рахувала й риси (як зараз рахує класову таблицю).

**Файли:** `src/server/db/weapon-mastery.ts`, `src/lib/components/levelUp/levelup-weapon-mastery.ts`, `src/rules/weapon-mastery.ts`

**Скептик:** ПРАВИЛО підтверджено власним читанням оракула: `data/2024/source/raw/feat/weapon-master.html` — «Prerequisite: Level 4+ … Mastery Property. Your training with weapons allows you to use the mastery property of one kind of Simple or Martial weapon of your choice, provided you have proficiency with it». Риса поза SRD 5.2.1 (grep «Weapon Master» у `data/2024/srd/feats.md` — 0 влучень), тобто оракул саме PHB-2024, редакція 2024 названа правильно.

КОД. Це не «не підключено в одному місці», а «джерело ємності одне і воно класове». `src/rules/weapon-mastery.ts:48` — `findWeaponMasteryCapacity(classes)` згортає **лише** масив класів; тип `MasteryClassLevel` не має входу для рис узагалі. Усі чотири місця, де ємність рахується, передають тільки класи: `src/lib/components/characterCreator/WeaponMasteryForm.tsx:27`, `src/server/db/character-creation.ts:937`, `src/lib/components/levelUp/levelup-weapon-mastery.ts:49`, `src/server/db/weapon-mastery.ts:106`. Пул зброї теж будується з `class.weaponProficiencies` (`findWeaponMasteryOptionsForClasses`), а не з володінь персонажа. Іншого обробника немає: grep «Weapon Master|WEAPON_MASTER» по `src/` (поза `src/lib/generated/`) дає лише мета-опис каталогу зброї.

Наслідок навіть жорсткіший, ніж написав автор: `buildOffer` при `capacity === 0` повертає `emptyOffer()` (`weapon-mastery.ts:106-107`), а `saveWeaponMastery` відмовляє рядком «Клас персонажа не дає майстерності зброї» (`weapon-mastery-actions.ts:49`). Тобто чарівник із Weapon Master не отримує 0→1, і кроку майстерності в конструкторі не побачить (`MultiStepForm.tsx:566` вмикає крок теж лише за `class.weapon_mastery_progression`); воїн 4-го рівня не отримує 4→5.

Риса реально досяжна: `GENERAL`, `prerequisite_level = 4`, а `ALLOWED_CATEGORIES_BY_SOURCE.CLASS_ASI = "any"` (`src/rules/repeatable-feats.ts:74-79`), тож на класовому ASI її видно й беруть.

РІШЕННЯ ВЛАСНИКА — не покриває. Р31 (DECISIONS.md:1348) вирішує лише *коли* набір змінний, і в «Наслідку для коду» описує класовий випадок («ємність … виводиться з `class.weapon_mastery_progression`»), а не звільняє риси. У «Поза межами» O18 (README.md:229) — бастіони, переклад, 2014, гейт релізу; рис там немає. У «Прийнято» `docs/KNOWN-BUGS.md:41+` — три знахідки про довіру сервера до UI, не про майстерність.

IN-FLIGHT — ні: жодного з файлів майстерності немає у списку паралельної сесії (KR27.7/KR30.3).

ВЖЕ ВІДКРИТО — ні. KR18.6 закрито 2026-08-30, і його «Готово, коли» говорить тільки про класи (Fighter 5 → 4, Rogue → 2, Monk → 0); grep по `docs/` на рису Weapon Master дає лише влучення `weapon_mastery_progression` / `pers_weapon_mastery`. Знахідка нова, це дірка в обсязі KR18.6, а не дубль.

СЕРЙОЗНІСТЬ P1 підтверджую за шкалою: у персонажа відсутній слот і губиться вибір гравця (вид зброї), тобто лист рахується не за книгою після свідомої витрати рисоподібного ASI 4-го рівня.

ЩО ПРАВЛЮ В АВТОРА: `classification` має бути **missing-system**, а не `data`. Сідом це не лікується: носія «риса дає +1 майстерності» у схемі немає — `information_schema` по `feat`/`feature` не дає жодної колонки з `master`, а `weapon_mastery_progression` існує тільки на `class` (`prisma/schema.prisma:130`). Потрібна зміна правила (`findWeaponMasteryCapacity` має приймати внески не від класів) плюс усі чотири виклики, плюс окреме джерело пулу зброї для рисового слота («будь-яка проста/бойова, якою володієш», а не «яку дає клас»). Тобто це KR (effort L), а не рядок у JSON.


### L03-feats-15 — Менеджер рис на листі додає рису без жодного гейта, без ASI і без виборів усередині риси

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md: «To take a feat, you must meet any prerequisite in its description»; docs/DECISIONS.md Р37 — повторювана риса = другий рядок pers_feat зі своїми виборами.

**Має бути:** Риса, додана з листа, поводиться так само, як додана в майстрі: передумови, категорія, Р37, застосований ASI, зроблені вибори.

**Є:** Персонаж 1-го рівня може додати собі Boon of Truesight; Skill Expert не змінює характеристик; Magic Initiate лягає без списку заклинань; повторювана риса лягає другим рядком без виборів — у стані, який майстер створення відхилив би.

**Доказ:** src/lib/actions/feat-actions.ts:28-49 — addFeatToPers перевіряє тільки право на редагування (assertOwnsPers) і одразу викликає addPersFeat. src/server/db/feat-actions.ts:56-84 — addPersFeat перевіряє тільки feat.isRepeatable; немає ні findFeatPackageProblem (категорія + Р37), ні checkFeatPrerequisites (рівень/характеристика/замовляння), ні звірки feat.ruleset із pers.ruleset, ні застосування grantedASI/grantedSkills/grantedLanguages/володінь. Виклик із UI: src/lib/components/characterSheet/FeatsSheetManagerModal.tsx:78 — addFeatToPers({persId, featId: feat.featId}) БЕЗ choiceOptionIds, а FeatCatalogTab.tsx:146 просто передає рису в onAddFeat. Для порівняння, майстер створення і підвищення проганяють ту саму рису через findFeatPackageProblem (character-creation.ts:186, levelup-persistence.ts:280).

**Відтворення:** 1) На :3100 відкрити лист персонажа 2024 рівня 1. 2) Менеджер рис → каталог. 3) Додати Boon of Combat Prowess (передумова 19+ рівень) — додається. 4) Додати Skill Expert — характеристики не змінюються, навичок не додається.

**Куди дивитись:** Провести addFeatToPers через findFeatPackageProblem + checkFeatPrerequisites (і звірку ruleset), додати крок виборів у FeatsSheetManagerModal і застосування grantedASI, як у levelup-persistence.ts:288-300.

**Файли:** `src/lib/actions/feat-actions.ts`, `src/server/db/feat-actions.ts`, `src/lib/components/characterSheet/FeatsSheetManagerModal.tsx`, `src/lib/components/characterSheet/feats/FeatCatalogTab.tsx`


### L03-feats-16 — Риса «Ability Score Improvement» присутня в списку рис і не робить нічого — витрачене підвищення 4-го рівня

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-06 (KR31.4). Рішення власника — прибрати рядок із бази, а не давати рисі механіку: той самий вибір уже є окремою гілкою кроку ASI, і дві дороги до одного ефекту були б новою розбіжністю. `prisma/seed/removeAbilityScoreImprovementFeat2024.ts` видаляє **умовно**: за Р28 знайдений носій (персонаж, походження) зупиняє сід із назвою причини. У `spells_test` рядок 2987 не мав жодного посилання й видалений.

**Правило:** data/2024/srd/feats.md, Ability Score Improvement (General Feat, Prerequisite: Level 4+): «Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can't increase an ability score above 20.»

**Має бути:** Або риси немає у списку (бо гілка «Характеристики» на тому самому кроці і є цією рисою), або вона дає +2/+1+1.

**Є:** Гравець обирає картку «Покращення Характеристик» замість гілки ASI і не отримує нічого — ні характеристик, ні фічі, ні виборів.

**Доказ:** creator-content-2024.json: featId 2987, name ABILITY_SCORE_IMPROVEMENT, grantedASI=null, featChoiceOptions=[], grantsFeature=[], isRepeatable=true, а весь опис — "**Повторюваний**\nВи можете обирати цей рис більше одного разу." (і це єдиний текст, який побачить гравець; до того ж помилка «цей рис» — друга така риса Elemental Adept). У майстрі підвищення рівня це звичайна картка серед рис: src/lib/components/levelUp/LevelUpASIForm.tsx:361 передає у FeatsForm увесь список feats, який приходить із src/server/db/levelup-content.ts:50 (findCharacterCreatorOptions(ruleset) — усі 75), а FeatsForm фільтрує лише за пошуком і повторюваністю. Виключень для ABILITY_SCORE_IMPROVEMENT у коді немає (грепом по src/ поза generated — тільки рядок перекладу в translation.ts:1452).

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); const f=c.feats.find(x=>x.engName==='Ability Score Improvement'); console.log(f.name, f.grantedASI, f.featChoiceOptions.length, f.grantsFeature.length, JSON.stringify(f.description))"

**Куди дивитись:** Приховати ABILITY_SCORE_IMPROVEMENT у FeatsForm, коли крок пропонує окрему гілку ASI; заразом виправити «цей рис» → «цю рису» у data/2024/normalized/feats.json (2 записи).

**Файли:** `src/lib/components/characterCreator/FeatsForm.tsx`, `src/lib/components/levelUp/LevelUpASIForm.tsx`, `data/2024/normalized/feats.json`

**Скептик:** (1) ПРАВИЛО — підтверджено дослівно: `data/2024/srd/feats.md:61-67` «#### Ability Score Improvement / _General Feat (Prerequisite: Level 4+)_ / Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1… _Repeatable._». Редакція саме 2024 (SRD 5.2.1); у 2014 такої «риси» немає — там це класова фіча.

(2) ДАНІ — підтверджено. `creator-content-2024.json`: featId 2987, `grantedASI: null`, `featChoiceOptions: []`, `grantsFeature: []`, `prerequisiteLevel: 4`, `isRepeatable: true`, `description` = «**Повторюваний**\nВи можете обирати цей рис більше одного разу.». Джерело сіду `data/2024/normalized/feats.json` теж має лише `benefitsEng: [{name:"Repeatable"}]` — сам бенефіт втрачено при нормалізації, тому це дефект даних, а не рушія (43 інші GENERAL-риси мають коректний `grantedASI`).

(3) КОД — жодної обробки в іншому місці немає. Грепом по `src` поза `src/lib/generated`: `ABILITY_SCORE_IMPROVEMENT` трапляється рівно один раз — рядок перекладу `src/lib/refs/translation.ts:1454` (автор дав 1452, це єдина його неточність). `LevelUpASIForm.tsx:361` віддає у `FeatsForm` увесь список `feats` з `levelup-content.ts:50` (`findCharacterCreatorOptions(ruleset)`), `FeatsForm.tsx:58-89` фільтрує лише пошуком і `isRepeatable`, `FeatPicker.tsx` малює картку з самою назвою «Покращення Характеристик» + `engName`, без опису. Сервер приймає: `ALLOWED_CATEGORIES_BY_SOURCE.CLASS_ASI = "any"` (`src/rules/repeatable-feats.ts:74`), `levelup-persistence.ts:294` кладе `featGrantedASI = feat.grantedASI` = null.

(4) ВЛАСНИЙ ДОКАЗ (наскрізний, не читанням коду) — прогнав фікстуру `01-dragonborn-fighter-soldier` крізь справжні `createCharacter`/`levelUpCharacter` на `spells_test`, замінивши на 4-му рівні `asi: STR+2` на `feat: ABILITY_SCORE_IMPROVEMENT`. Результат: помилок нема, рівень 5 досягнуто, `pers_feat` отримав рядок `ABILITY_SCORE_IMPROVEMENT` з `grantedASI: null` і `choices: 0`, а характеристики — STR 17 проти 19 у контрольному прогоні. Тобто підвищення 4-го рівня зникає безслідно й мовчки.

(5) РІШЕННЯ ВЛАСНИКА — не покрито. У `docs/DECISIONS.md` немає рішення про порожню ASI-рису; Р41 (категорія не є правом) і Р37 (повтор) стосуються іншого. «Прийнято» в `docs/KNOWN-BUGS.md` (BUG-001..003 «сервер довіряє UI») сюди не тягнеться. «Поза межами» O18 і O27 цього не називають.

(6) IN-FLIGHT — ні: `FeatsForm.tsx`, `LevelUpASIForm.tsx`, `data/2024/normalized/feats.json` не в списку файлів паралельної сесії (KR27.7/KR30.3).

(7) ВІДКРИТИЙ KR — ні. `ABILITY_SCORE_IMPROVEMENT` згадується лише в `docs/o27-multiclass-2024/README.md:109` і `kr27.4-repeatable-feats.md:17` — і тільки як приклад риси з `isRepeatable`; KR27.4 закритий 2026-09-04 і лагодив мовчазний `upsert` при повторі, а не порожній вміст самої риси. Це інший дефект.

(8) СЕРЙОЗНІСТЬ — P1 за шкалою: персонаж порахований не за книгою (виміряно: STR 17 замість 19) і вибір гравця губиться без жодного повідомлення. Пастка не теоретична: картка підписана рівно тим словом, яке шукає гравець («Покращення Характеристик»), а її єдиний текст в модалці про бенефіт мовчить.

Класифікація `data` правильна: рушій усе вміє (`grantedASI` + група опцій «Характеристика», як у 43 інших рис), порожні саме дані. Застереження: жодна риса в обох редакціях не має `grantedASI` зі значенням 2 — половину «+1/+1» доведеться робити групою на два вибори (як три навички у Skilled), тому чисто-даними фікс не однорядковий. Альтернатива автора (сховати картку, бо гілка «Характеристики» на тому ж кроці і є цією рисою) — теж законна й дешевша.


### L03-feats-19 — Епічні дари: жодної механіки, крім +1 характеристики — Boon of Fortitude +40 HP, Boon of Skill «володіння всіма навичками», Boon of Energy Resistance (вибір 2 типів шкоди) не існують

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт скептика:** confirmed

**Статус:** 🔴 закрито наполовину (KR31.4, 2026-09-06). Boon of Fortitude (+40 хітів через нову `feature.bonus_hit_points`), Boon of Speed (+30 футів) і Boon of Skill (усі 18 навичок через `granted_skills` плюс експертиза окремою групою) працюють. Boon of Energy Resistance і Boon of Truesight — ні, і це **не колонка**: опору шкоди й чуттів у персонажа немає ніде, `information_schema` знає `damage_resistance` і `senses` лише в `creature`, тобто у статблоці НІПа. Це система наскрізь — дані, правило, лист, друк, — тож окрема ціль.

**Правило:** data/2024/source/raw/feat/boon-of-fortitude.html: «Fortified Health. Your Hit Point maximum increases by 40»; boon-of-skill.html: «All-Around Adept. You gain proficiency in all skills. Expertise. Choose one skill in which you lack Expertise»; boon-of-energy-resistance.html: «You gain Resistance to two of the following damage types of your choice»; boon-of-truesight.html: «Truesight with a range of 60 feet»

**Має бути:** Boon of Fortitude додає 40 до максимуму HP; Boon of Skill дає володіння всіма 18 навичками плюс експертизу на вибір; Boon of Energy Resistance дає вибір двох типів шкоди.

**Є:** Кожен епічний дар дає рівно +1 характеристики й текст.

**Доказ:** Запит до spells_test: усі 12 EPIC_BOON мають 0 звʼязків у _FeatGrantsFeature; у creator-content-2024.json їхні featChoiceOptions = 6 (для ANY), 3 (INT_OR_WIS_OR_CHA) або 2 (STR_OR_DEX) — тобто ВИКЛЮЧНО вибір характеристики для ASI. granted_skill_count=0, granted_* володінь немає в жодного (запит із L03-feats-02 їх не повернув).

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); c.feats.filter(f=>f.category==='EPIC_BOON').forEach(f=>console.log(f.engName,(f.grantsFeature||[]).length,f.featChoiceOptions.map(o=>o.choiceOption.groupName).join()))"

**Куди дивитись:** Найдешевше: Boon of Skill через feat.granted_skills (усі 18) + група експертизи. Boon of Fortitude потребує плоского бонусу HP на Feature (є лише bonus_hit_points_per_level → потрібен DDL). Резистанси й Truesight власного поля не мають узагалі.

**Файли:** `prisma/seed/`, `db/changes/`, `src/rules/hit-points.ts`

**Скептик:** ПРАВИЛО — підтверджено власним читанням оракулів. `data/2024/srd/feats.md` (рядки 109–190) і сторінки PHB `data/2024/source/raw/feat/`: Boon of Fortitude — «Fortified Health. Your Hit Point maximum increases by 40… whenever you regain Hit Points, you can regain additional HP equal to your Constitution modifier»; Boon of Skill — «All-Around Adept. You gain proficiency in all skills» + «Expertise. Choose one skill in which you lack Expertise»; Boon of Energy Resistance — «Resistance to two of the following damage types of your choice» + Energy Redirection; Boon of Truesight — «Truesight with a range of 60 feet». Це редакція 2024 (епічних дарів у 2014 немає), тож змішування редакцій виключене.

ДАНІ — підтверджено незалежним запитом до `spells_test` (не повторюючи скрипт автора): усі 12 рис `category='EPIC_BOON', ruleset='RULES_2024'` мають `_FeatGrantsFeature = 0`, `granted_skill_count = 0`, `granted_skills = null`, `granted_armor_proficiencies = '{}'`, `granted_weapon/tool_proficiencies = null`, а **кожна** їхня опція вибору належить групі «Характеристика» з `effect_kind = 'ASI'` (6 / 3 / 2 опції). Те саме у `src/lib/generated/creator-content-2024.json`. Український опис бенефітів («максимум Хіт Поїнтів збільшується на 40», «володіння всіма навичками») у полі `description` є — тобто розходяться саме текст і механіка.

КОД — іншого місця обробки немає. Grep по `src/` на `boonOf|BOON_OF|Fortitude|Truesight|EpicBoon` дає лише мітки категорій в UI, назви в `translation.ts` і `src/rules/ability-score-ceiling.ts` (стеля 30 з KR27.9). Обробки за назвою, як у Resilient/Tough (`character-creation.ts:126,227`), для дарів немає. Опору шкоди для персонажа в проєкті не існує взагалі — `damage_resistance` є тільки в `Creature` (статблок монстра), у `src/rules/` і `src/lib/logic/` слово `resistance` не трапляється; чуттів (темнозір/істинний зір) лист не малює. Плоского бонусу HP немає: у `Feature` лише `bonus_hit_points_per_level`, і `src/rules/hit-points.ts` сумує саме його; `pers.hpBonuses` — ручний JSON гравця.

РІШЕННЯ ВЛАСНИКА — нема жодного, що це приймає. Р39 і KR27.9 (✅ 2026-09-04) закривають рівно дві речі: стелю 30 і додавання кроку «Епічний дар» на 19-му рівні класу; про бенефіти дарів там нічого. Навпаки, крок додано — отже, рису тепер **можна взяти**, і дефект живий. У `docs/KNOWN-BUGS.md` (розділ «Прийнято»: BUG-001…003) і в цілях o18/o27 цього немає.

IN-FLIGHT — ні: жоден із файлів (сіди рис, `data/2024/normalized/feats.json`, `src/rules/hit-points.ts`) не входить у список KR27.7/KR30.3.

ВЖЕ ВІДКРИТО — ні: відкритого KR на механіку епічних дарів у `docs/o*/` немає.

СЕРЙОЗНІСТЬ — авторський P2 занижений для двох підпунктів. Boon of Fortitude — це −40 до максимуму HP проти книги, тобто «персонаж порахований не за книгою (числа)»; Boon of Skill — відсутні 18 володінь навичками плюс експертиза, тобто «відсутнє володіння/вибір». Обидва підпадають під P1 дослівно, і сусідні знахідки того ж класу (L03-feats-01 бойові стилі, -04 швидкість, -05 ініціатива) автор оцінив як P1 — тут оцінка неузгоджена. Решта дарів (Peerless Aim, Blink Steps, Improve Fate, Free Casting, Merge with Shadows, Energy Redirection, Truesight) — справді P2/відсутня система.

КЛАСИФІКАЦІЯ — не `data`, а `missing-system`. Даними лагодиться лише Boon of Skill: `feat.grantedSkills` рушій застосовує в обох потоках (`src/server/db/character-creation.ts:465`, `src/server/db/levelup-persistence.ts:296`), тож досить заповнити 18 навичок. Для +40 HP, опору шкоди й істинного зору колонок і систем немає взагалі — потрібен DDL і нова гілка рушія; це визнає і сам автор у fix_hint, що суперечить його ж класифікації `data`.


### L09-sheet-derived-04 — Ініціатива не знає риси Пильність 2024 (+БМ) — жодна фіча чи риса не може вплинути на ініціативу взагалі

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-06 (KR31.4) разом із `L03-feats-05`. `findInitiativeProficiencyBonus` читає `feature.initiative_proficiency` з пулу `collectActiveFeatures`, а `calculateFinalInitiative` малюють і `MainStatsSlide`, і `generateCharacterPdf` — канал наскрізний. Дві такі фічі додають бонус один раз: книга каже «add your Proficiency Bonus», а не подвоїти.

**Правило:** data/2024/srd/feats.md:27 — Alert, Initiative Proficiency: «When you roll Initiative, you can add your Proficiency Bonus to the roll».

**Має бути:** Персонаж 5-го рівня з рисою Пильність має ініціативу СПР+3.

**Є:** Тільки модифікатор Спритності. Число можна отримати лише ручним бонусом.

**Доказ:** src/lib/logic/bonus-calculator.ts:400–404: `calculateFinalInitiative = calculateFinalModifier(pers, DEX) + getSimpleBonus(pers, "initiative")`; getSimpleBonus читає pers.initiativebonuses, яке править лише користувач руками через ModifyStatModal.tsx:235. У таблиці feature немає стовпця про ініціативу (повний перелік бонусних стовпців: bonus_hit_points_per_level, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_melee_one_handed_weapon_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, modifies_ac, no_armor_or_shield_for_ac_bonus, requires_armor_for_ac_bonus, uses_count_depends_on_proficiency_bonus); у таблиці feat теж (granted_asi, granted_skills, granted_languages, granted_*_proficiencies, prerequisite_*).

**Відтворення:** Створити персонажа 2024 з Origin-рисою Alert → лист → картка «Ініціатива» показує лише мод. СПР.

**Куди дивитись:** Додати Feature.bonusToInitiative (DDL у db/changes/), проставити в даних 2024 і прочитати в calculateFinalInitiative через collectActiveFeatures — механізм уже є для КЗ і шкоди.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `prisma/schema.prisma`, `data/2024/normalized/feats.json`


### P1-human-fighter-07 — Три навички, обрані в рисі «Умілець» (Skilled), не зберігаються — ні pers_skill, ні _ChoiceOptionToPers

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/feats.md:51-57 — Skilled: «You gain proficiency in any combination of three skills or tools of your choice.»

**Має бути:** 3 рядки pers_skill з PROFICIENT; на листі Виживання/Уважність/Медицина +3

**Є:** Вибір гравця не збережено взагалі; навички лишилися без володіння

**Доказ:** На кроці «Опції риси виду» обрано Виживання, Уважність, Медицину; чернетка: speciesFeatChoiceSelections: {"Skilled Options": [3374, 3373, 3372]}. Після створення: select * from pers_skill where pers_id=16 → лише ATHLETICS, INTIMIDATION; select * from "_ChoiceOptionToPers" where "B"=16 → лише {A:3384} (бойовий стиль Оборона). Лист: Виживання +1, Уважність +1, Медицина +1 — без бонусу майстерності (shots/P1-human-fighter-19-sheet-lvl1.png).

**Відтворення:** /2024/char → Людина → риса Умілець → на кроці «Опції риси виду» обрати 3 навички → створити → select * from pers_skill where pers_id=<новий>

**Куди дивитись:** Перевірити збереження speciesFeatChoiceSelections у src/server/db/character-creation.ts (гілка вибору риси виду). Чи це наслідок P1-human-fighter-01 — не доведено (порівняльного персонажа зі Skilled у базі немає)

**Файли:** `src/server/db/character-creation.ts`, `src/lib/components/characterCreator/MultiStepForm.tsx`

**Скептик:** (1) ПРАВИЛО — вірне і саме для 2024. `data/2024/srd/feats.md`, розділ Skilled (Origin Feat): «You gain proficiency in any combination of three skills or tools of your choice» + «_Repeatable._ You can take this feat more than once». Цитата автора точна.

(2) КОД — симптом підтверджую власним доказом, але причину автора уточнюю. Код збереження виборів риси **правильний**: `saveFeatWithChoices` (character-creation.ts:325-344) кладе `pers_feat` + `pers_feat_choice`, цикл на :866-869 обробляє рису від вибору виду, цикл на :519-531 переливає `SKILL_PROFICIENCY` опції в `pers_skill`. Гине все раніше — у `src/server/db/creation-content.ts:193`:
`ruleset: data.ruleset ?? characterClass?.ruleset ?? ACTIVE_RULESET`
Оскільки конструктор не кладе редакцію у payload (`MultiStepForm.tsx:90` тримає `currentRuleset` лише для UI; `persFormStore.ts` знає редакцію тільки як ключ чернетки), zod підставляє `RULES_2014` (`persCreateSchema.ts:294`), і запит шукає рису Skilled серед рис 2014. Ланцюг «опція виду → фіча → риса» у базі цілий: `race_choice_option` 162 (Skilled) → `race_choice_option_trait` → feature 49392 «Origin Feat: Skilled (2024)» → `_FeatGrantsFeature` → feat 3048 (Skilled, RULES_2024). Риса 2024 просто не потрапляє у вибірку 2014 → `featsGrantedByChoiceOptions` порожній → ні `pers_feat`, ні `pers_feat_choice`, ні навичок.

Отже: те, що автор лишив недоведеним («Чи це наслідок знахідки 01 — не доведено»), доведено — це **строгий наслідок P1-human-fighter-01 (P0)**. Окремої правки в `character-creation.ts` не потрібно; один фікс (покласти `initialRuleset` у `formData` / прибрати `.default("RULES_2014")`) закриває 07 повністю. `member_evidence` про «другий рядок повторюваної риси» (Р37) теж спростовано як окремий дефект — див. extra_evidence.

(3) РІШЕННЯ ВЛАСНИКА — прийнятою поведінкою не є. Єдиний дотичний блок «Прийнято» в `docs/KNOWN-BUGS.md:41-46` (BUG-001..003) каже протилежне: «краще, ніж… створити його без частини вибраного й змусити гравця перестворювати». «Поза межами» O18 і O27 цього не виключають.

(4) IN-FLIGHT — ні. `creation-content.ts`, `character-creation.ts`, `persCreateSchema.ts`, `MultiStepForm.tsx` не входять у список файлів паралельної сесії (KR27.7/KR30.3).

(5) ВЖЕ ВІДКРИТО — окремого KR немає. Найближче — O18 п.3 (KR18.3 закритий наполовину: крок другої риси вмикається умовою `HUMAN_VARIANT` 2014), але про втрату редакції в payload у docs нічого немає.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою (вибір гравця губиться: три володіння навичками замість трьох +3 на листі). Але як окрема одиниця роботи це **дублікат** P0-01: варта не власного фіксу, а регресійного тесту, що ганяє payload конструктора (без `ruleset`), а не payload хелпера.


### P3-multiclass-wizard-cleric-04 — Друга «Посвячений у магію» від Універсальності Людини не збереглася, а вибори списків заклинань не збереглися жодного разу

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** docs/o27-multiclass-2024/reference-fifteen.md §21: «Magic Initiate (Cleric) від походження, Magic Initiate (Druid) від Універсальності Людини»; фікстура 21-human-wizard4-cleric4.json: feats [MAGIC_INITIATE, MAGIC_INITIATE, ...], magicInitiateLists ["Cleric","Druid"]; Р37 — повторювана риса = другий рядок pers_feat

**Має бути:** Два рядки pers_feat з feat_id 3029 (походження + вид), кожен зі своїм pers_feat_choice (Cleric і Druid), плюс два замовляння і одне заклинання 1-го рівня від кожної риси.

**Є:** Один рядок pers_feat, нуль pers_feat_choice, нуль заклинань; вибір гравця «Magic Initiate (Druid)» і невибраний список для Послушника губляться беззвучно.

**Доказ:** Запити до spells_test для pers 23: `pers_feat` — 1 рядок (feat_id 3029 «Magic Initiate») замість 2; `pers_feat_choice` — 0 рядків замість 2; `_PersToRaceChoiceOption` — 1 рядок (A=23, B=159), тобто сам вибір Людини «Посвячений у магію» збережено, а риса й опція з нього — ні. `background.origin_feat_id` Послушника = 3029 — той самий feat, тому обидва надання цілять в один featId і вижило одне. UI: конструктор жодного разу не показав кроків `backgroundFeat`/`backgroundFeatChoices` — списку заклинань для Magic Initiate від Послушника не питали; крок `speciesFeatChoices` показали, вибір «Друїд» зроблено (shots/P3-03-sfc.png), у базу не потрапив. На листі одна картка «Посвячений у магію» і рядок «Риса походження: Посвячений у магію» без обраного списку (shots/P3-05-sheet.png); `pers_spell` порожня — жодного замовляння чи заклинання 1-го рівня від риси. Код, який мав це зробити, є: src/server/db/character-creation.ts:849-869 зберігає окремо validData.featId, background.originFeatId і кожен елемент featsGrantedByChoiceOptions, а saveFeatWithChoices (:326) має коментар «повторювана риса лягає другим рядком зі своїми виборами (Р37)».

**Відтворення:** Створити персонажа за кроками знахідки 01 (Людина + Послушник + Magic Initiate двічі), потім `select count(*) from pers_feat where pers_id=<id>` і `select * from pers_feat_choice pfc join pers_feat pf using(pers_feat_id) where pf.pers_id=<id>`.

**Куди дивитись:** Перевірити, чому `character.featIdsFromChoiceOptions` не містить feat 3029 (умова на src/server/db/character-creation.ts:866) і чи не відсіюється надання від виду раніше — у `findFeatsGrantedByCreationChoices`/`loadCreationContent`. Підозра на спільний корінь із знахідкою 01 (редакція), але перевіряти окремо. Крок вибору списку для риси походження в конструкторі 2024 має зʼявлятися завжди, коли `background.originFeatId` має featChoiceOptions.

**Файли:** `src/server/db/character-creation.ts`, `src/server/db/creation-content.ts`, `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/server/db/feat-gates.ts`


### L03-feats-06 — Lucky не заводить пулу «Очки удачі» (БМ зарядів, відновлення довгим відпочинком), хоча система ресурсів у проєкті є

**Статус:** ✅ закрито 2026-09-08 ([KR31.3](kr31.3-feature-resources-2024.md)). Носій — фіча `Lucky: Luck Points (2024)` на `Feat.grantsFeature`: колонок використань у `feat` немає, тож лічильник живе там само, де числові надання KR31.4. Пулу свідомо немає — пул потрібен лише там, де ресурс ділять кілька фіч, а обидві переваги Щасливчика коштують рівно одне очко. Разом прохід дав вісім носіїв серед 75 рис.

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/source/raw/feat/lucky.html: «Luck Points. You have a number of Luck Points equal to your Proficiency Bonus … You regain your expended Luck Points when you finish a Long Rest.»

**Має бути:** На листі — лічильник на БМ зарядів, що витрачається і відновлюється після довгого відпочинку.

**Є:** Тільки абзац тексту; витратити чи відстежити очки удачі неможливо.

**Доказ:** Запит до spells_test по фічі «Origin Feat: Lucky (2024)»: uses_count=NULL, uses_count_depends_on_proficiency_bonus=false, limited_uses_per=NULL, uses_pool_key=NULL. Механізм існує і використовується іншими фічами: src/rules/resource-pools.ts, src/server/db/resource-pool-provider.ts, src/lib/logic/feature-resources.ts, колонка Feature.usesCountDependsOnProficiencyBonus.

**Відтворення:** node /path/db.mjs "select eng_name, uses_count, uses_count_depends_on_proficiency_bonus, limited_uses_per, uses_pool_key from feature where eng_name='Origin Feat: Lucky (2024)'"

**Куди дивитись:** У сіді фічі: uses_count_depends_on_proficiency_bonus=true, limited_uses_per='LONG_REST', displayType з активним типом замість PASSIVE.

**Файли:** `prisma/seed/`, `src/lib/logic/feature-resources.ts`


### L03-feats-08 — Elemental Adept не має вибору типу шкоди, тому й повтор нічим не обмежений — рису можна брати нескінченно з тим самим ефектом

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-06 (KR31.4). Група «Тип шкоди» з пʼятьма стихіями в сіді плюс `ELEMENTAL_ADEPT` у `UNIQUE_CHOICE_GROUP_BY_FEAT` — «you must choose a different damage type each time» тепер тримається тим самим механізмом, що й Magic Initiate. Коментар у `src/rules/repeatable-feats.ts`, який пояснював, чому обмежити нема чим, знято разом із причиною. Сам ефект стихії — «заклинання обраної стихії ігнорують опір» — як не працював, так і не працює, і в обох редакціях: опору шкоди в застосунку немає взагалі (та сама причина, що в Boon of Energy Resistance). Це `BUG-005` у [KNOWN-BUGS.md](../KNOWN-BUGS.md), і він лишається чинним.

**Правило:** data/2024/source/raw/feat/elemental-adept.html (і normalized/feats.json): «Energy Mastery. Choose one of the following damage types: Acid, Cold, Fire, Lightning, or Thunder … Repeatable. You can take this feat more than once, but you must choose a different damage type each time.»

**Має бути:** Гравець обирає тип шкоди; другий Elemental Adept вимагає інший тип.

**Є:** Тип шкоди не зберігається взагалі; findFeatRepeatProblem дозволяє N однакових копій риси.

**Доказ:** creator-content-2024.json: Elemental Adept isRepeatable=true, featChoiceOptions=3 — усі три це вибір характеристики для grantedASI {"INT_OR_WIS_OR_CHA":1}. Код це вже визнає: src/rules/repeatable-feats.ts:24 — коментар «Elemental Adept у даних 2024 типу шкоди як вибору не має, тож обмежити його повтор нема чим», і UNIQUE_CHOICE_GROUP_BY_FEAT (:25-27) містить лише MAGIC_INITIATE.

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); const f=c.feats.find(x=>x.engName==='Elemental Adept'); console.log(f.isRepeatable, f.featChoiceOptions.map(o=>o.choiceOption.groupName))" → ['Характеристика','Характеристика','Характеристика']

**Куди дивитись:** Додати групу опцій «Тип шкоди» (Кислота/Холод/Вогонь/Блискавка/Грім) у сіді та ELEMENTAL_ADEPT у UNIQUE_CHOICE_GROUP_BY_FEAT.

**Файли:** `prisma/seed/`, `src/rules/repeatable-feats.ts`

**Скептик:** ПРАВИЛО — підтверджено власним читанням оракула. `data/2024/source/raw/feat/elemental-adept.html` (page-content) і `data/2024/normalized/feats.json` (`benefitsEng`) дослівно: «Energy Mastery. Choose one of the following damage types: Acid, Cold, Fire, Lightning, or Thunder…» + «Repeatable. You can take this feat more than once, but you must choose a different damage type each time for Energy Mastery.» Це саме PHB 2024; у `data/2024/srd/feats.md` риси немає взагалі (grep порожній), тож цитований автором html/normalized і є правильним оракулом для 2024.

ДАНІ — перевірив незалежно, запитом до `spells_test`, а не через generated-файл автора. `feat → feat_choice_option → choice_option` для `name='ELEMENTAL_ADEPT'` дає: 2024-риса `feat_id 3015`, `is_repeatable=true`, рівно 3 опції — «Характеристика» / `Elemental Adept 2024 (INT|WIS|CHA)` / `effect_kind=ASI`; 2014-риса `feat_id 10` — 10 опцій типу шкоди у двох групах («Стихія Адепта» і «Elemental Adept (тип пошкодження)», дубль із BUG-004). Тобто та сама риса тип шкоди в 2014 записує, а в 2024 — ні: це регресія редакції всередині одного застосунку, а не відсутній механізм. `_FeatGrantsFeature` — 0 фіч в обох редакціях.

КОД — перевірив виконанням, не читанням. Прогнав `src/rules/repeatable-feats.ts` через bun: `findFeatRepeatProblem` для другого `ELEMENTAL_ADEPT` → `null`, пакет із пʼяти копій → `null`, тоді як `MAGIC_INITIATE` з тим самим списком → `{kind:"same-choice"}`. Іншого гейта немає: `findFeatPackageProblem` (`src/server/db/feat-gates.ts:28-34`) робить лише категорію + `findFeatRepeatProblemInBatch`, а `pers_feat` у `spells_test` уже без унікальності (`pers_feat_pers_id_feat_id_idx` — звичайний індекс, Р37), тож нічого нижче теж не тримає. Корінь у сіді: `CHOICE_GROUPS_2024` (`prisma/seed/helpers/choiceOptions2024.ts:10-15`) знає лише ABILITY/PROFICIENCY/SPELL_LIST/FIGHTING_STYLE, а `prisma/seed/featMechanics2024.ts` заводить опції тільки для характеристик, Skilled і Magic Initiate — групи «Тип шкоди» не існує в жодному сіді 2024. Тому classification `data` правильний: спершу дані (нова група + 5 опцій), і лише потім однорядкова правка `UNIQUE_CHOICE_GROUP_BY_FEAT`.

РІШЕННЯ ВЛАСНИКА — не «accepted». Р37 (`docs/DECISIONS.md:1620-1621`) і KR27.4 (`kr27.4-repeatable-feats.md:199-201`) цю дірку називають, але як тимчасову межу закритого KR: «обмежити його повтор нема чим — це записано в правилі, а не приховано», «він повторюваний без умови, **поки дані не дадуть групу вибору**». У «Прийнято (не буде виправлено)» KNOWN-BUGS цього немає; у «Поза межами» O18 і O27 — теж немає.

IN-FLIGHT — ні. `src/rules/repeatable-feats.ts`, `prisma/seed/*`, `data/2024/normalized/feats.json` не входять до списку файлів паралельної сесії в CONTEXT (там лише spell-preparation/spellcasting-progression/spell-actions/pers-actions/AddSpellDialog/SpellInfoModal/spells-маршрути/multiclass-fifteen).

ВІДКРИТИЙ KR — немає такого. KR18.3 (механіка рис 2024) і KR27.4 (повтор) закриті, причому KR27.4 явно виводить цей випадок за свій обсяг. Ціль під це не заведена.

СЕРЙОЗНІСТЬ — P2 підтверджую, підвищувати до P1 не можна. BUG-005 (`docs/KNOWN-BUGS.md:137-152`, статус «відкрито», низький пріоритет) фіксує, що ефект Elemental Adept (ігнорування опору) не змодельований у **жодній** редакції — застосунок це лист персонажа, не бойовий симулятор. Отже жодне число на листі сьогодні не хибне, і після відновлення вибору теж не зміниться. «Нескінченний повтор» вигоди не дає: кожна копія — ті самі +1 до характеристики, що й будь-яка інша риса на тому самому слоті, а за книгою легальних взять пʼять — зайвими можуть бути хіба 6-та й 7-ма у воїна (рівні 6 і 14). Тобто це втрачена можливість записати вибір — яку має і 2014-гілка цього ж застосунку, і D&D Beyond — а не персонаж, порахований не за книгою. Формулювання автора «з тим самим ефектом» трохи перебільшене (ASI кожна копія таки дає), але суть знахідки — вибір типу шкоди не існує і повтор нічим не обмежений — доведена повністю.


### L03-feats-09 — Skilled: пропонує лише 18 навичок (книга дозволяє й інструменти), а опис риси втратив сам бенефіт

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** data/2024/source/raw/feat/skilled.html: «You gain proficiency in any combination of three skills or tools of your choice. Repeatable. You can take this feat more than once.»

**Має бути:** Один пул на три вибори з навичок І інструментів; опис риси називає бенефіт.

**Є:** Тільки 18 навичок; опис риси не пояснює, що вона взагалі дає.

**Доказ:** creator-content-2024.json: Skilled.featChoiceOptions = 18, усі effectKind='SKILL_PROFICIENCY' у групі «Володіння» — від «Skilled 2024 (ATHLETICS)» до «Skilled 2024 (PERSUASION)»; жодного інструмента. Окремо: description риси, який бачить гравець, — рівно "**Повторюваність**\nВи можете обирати цю рису більше одного разу.", тобто без речення про три володіння. Те саме в оракулі-нормалізації: data/2024/normalized/feats.json → Skilled.benefitsEng містить лише {name:'Repeatable'}, plainDescriptionEng порожній.

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); const f=c.feats.find(x=>x.engName==='Skilled'); console.log(JSON.stringify(f.description)); console.log(new Set(f.featChoiceOptions.map(o=>o.choiceOption.effectKind)))"

**Куди дивитись:** Додати опції інструментів у ту саму групу «Володіння» і відновити текст бенефіту в data/2024/normalized/feats.json та сіді.

**Файли:** `data/2024/normalized/feats.json`, `prisma/seed/`, `src/lib/generated/creator-content-2024.json`

**Скептик:** ПРАВИЛО — підтверджено двома оракулами. `data/2024/source/raw/feat/skilled.html` (тіло сторінки, витягнуте з page-content): «You gain proficiency in any combination of three skills or tools of your choice. / Repeatable. You can take this feat more than once.» Те саме в SRD 5.2.1: `data/2024/srd/feats.md:51-57` — «#### Skilled / _Origin Feat_ / You gain proficiency in any combination of three skills or tools of your choice.» Це саме редакція 2024.

ДАНІ — підтверджено незалежно, і у файлі, і в базі. `spells_test`: `feat` (feat_id 3048, SKILLED, RULES_2024) → `description = "**Повторюваність**\nВи можете обирати цю рису більше одного разу."`, `granted_tool_proficiencies = NULL`, `granted_skill_count = 3`; запит по `feat_choice_option → choice_option` дає рівно одну групу: `Володіння / SKILL_PROFICIENCY = 18`. Жодних інструментів. Те саме в `src/lib/generated/creator-content-2024.json`.

КОД — іншого місця, де це обробляється, немає, і бути не може без DDL. `ChoiceOptionEffectKind` має рівно три значення (`prisma/schema.prisma:1423-1427` і pg_enum у `spells_test`: ASI, SKILL_PROFICIENCY, SKILL_EXPERTISE) — вибору інструмента як ефекту не існує в принципі. Обрані інструменти ніде не зберігаються: `toolProficiencies` класу/виду/походження лише форматуються у текст (`character-creation.ts:650-660`), вибору немає в жодному потоці. Кількість виборів Умільця бере лише `grantedSkillCount` (`FeatChoiceOptionsForm.tsx:518-520`). Ланцюг опису: `data/2024/normalized/feats.json` (`benefits` = лише «Повторюваність», `plainDescriptionEng: null`) → `prisma/seed/featSeed2024.ts:27-33` `buildDescription` (бере `feat.description`, інакше склеює `benefits`) → рядок у базі; каталог теж не рятує — `FeatDetailCard.tsx:100-125` за наявності `benefits` малює **тільки** їх і `description` не показує. Тобто речення про три володіння гравець не бачить ніде.

РІШЕННЯ ВЛАСНИКА — немає. У `docs/DECISIONS.md` Умілець згадується тільки в Р37 (повторюваність: «`Skilled` — нічим», тобто два взяття не мусять різнитися) і Р33 (категорія не є правом взяття) — жодне не стосується складу пулу чи тексту. У «Прийнято» `docs/KNOWN-BUGS.md` і в «Поза межами» O18/O27 цього немає.

IN-FLIGHT — ні. `data/2024/normalized/feats.json` справді змінений у робочому дереві, але `git diff` — це виключно апостроф `ʼ` і терміни («Кухарське начиння», «Променева»); запису Skilled він не торкається. Файлів паралельної сесії (KR27.7/KR30.3) знахідка не зачіпає.

ВІДКРИТИЙ KR — не знайшов: грепом по `docs/` немає KR про інструменти Умільця чи про порожні описи рис 2024.

СЕРЙОЗНІСТЬ — P2 підтверджую. Персонаж рахується правильно, вибір гравця не губиться; бракує книжкової **можливості** (D&D Beyond дає вибрати інструмент) і опису. Половина про текст сама по собі тягне лише на P3.

КЛАСИФІКАЦІЯ — уточнюю з `data` на `missing-system`. Текст — справді дані (S: додати абзац у `feats.json` + сід). Але інструменти в пулі даними не лагодяться: потрібне нове значення enum `ChoiceOptionEffectKind` (DDL), збереження обраного інструмента на персонажі (сьогодні інструменти — лише текст) і крок у формі. Це KR, не правка сіду.

ДОКАЗ АВТОРА — ядро точне, одна деталь у `member_evidence` хибна: «так само порожній Great Weapon Master» не відповідає даним (GWM має три повні бенефіти). Порожніх насправді рівно два з 75.


### L03-feats-11 — Ritual Caster не дає ритуальних заклинань (БМ штук 1-го рівня, +1 при зростанні БМ)

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** data/2024/source/raw/feat/ritual-caster.html: «Ritual Spells. Choose a number of level 1 spells equal to your Proficiency Bonus that have the Ritual tag. You always have those spells prepared … Whenever your Proficiency Bonus increases thereafter, you can add an additional level 1 spell with the Ritual tag.»

**Має бути:** На 4-му рівні гравець обирає 2 ритуальні заклинання 1-го рівня, вони завжди підготовлені; на 5-му рівні (БМ 3) додається третє.

**Є:** Риса дає лише +1 характеристики.

**Доказ:** creator-content-2024.json: Ritual Caster grantsFeature=[], featChoiceOptions=3 (усі — вибір характеристики INT_OR_WIS_OR_CHA). Жодного механізму «вибрати N заклинань, де N = БМ» у рисах немає: src/rules/spell-sources.ts має тільки джерела класу, виду і риси-з-характеристикою.

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); const f=c.feats.find(x=>x.engName==='Ritual Caster'); console.log((f.grantsFeature||[]).length, f.featChoiceOptions.map(o=>o.choiceOption.groupName))"

**Куди дивитись:** Потрібна нова система «джерело заклинань від риси зі змінною кількістю, привʼязаною до БМ» — окрема ціль, бо ані ChoiceOption, ані Feature кількості за БМ для заклинань не мають.

**Файли:** `src/rules/spell-sources.ts`, `prisma/seed/`, `db/changes/`

**Скептик:** ПРАВИЛО — підтверджено власним читанням `data/2024/source/raw/feat/ritual-caster.html`: «Ritual Spells. Choose a number of level 1 spells equal to your Proficiency Bonus that have the Ritual tag. You always have those spells prepared, and you can cast them with any spell slots you have. The spells' spellcasting ability is the ability increased by this feat. Whenever your Proficiency Bonus increases thereafter, you can add an additional level 1 spell…». Цитата автора точна, але НЕПОВНА: риса має три бенефіти, третій — Quick Ritual («cast a Ritual spell … using its regular casting time … Doing so doesn't require a spell slot … once per Long Rest»), автор його не згадав узагалі. Риса лише PHB 2024, не SRD (`grep -i ritual data/2024/srd/feats.md` — порожньо), тому єдиний оракул — цей html.

КОД — підтверджено незалежно, і не з генерованого JSON, а прямим запитом у `spells_test`: feat_id 3041 (RULES_2024) має 0 рядків `_FeatGrantsFeature`; `feat_choice_option` для 3041 — рівно 3 рядки (option_id 3329/3330/3331, group_name «Характеристика», усі `effect_kind='ASI'`, ability INT/WIS/CHA). Ширше: серед УСІХ опцій рис 2024 існує лише три види ефекту — ASI 148, SKILL_PROFICIENCY 18, null 3. Виду ефекту «заклинання» немає взагалі. `src/rules/spell-sources.ts:87 findGrantedSpells` матеріалізує тільки заклинання виду (`findSpeciesSource`), а `findFeatSources:172` робить із риси лише ДЖЕРЕЛО з характеристикою, жодного spellId не повертає. Обидва споживачі (`src/server/db/character-creation.ts:356`, `src/server/db/species-level-grants.ts:49`) інших шляхів не мають. Греп `ritual` по `src/` поза `generated/`+`refs/` дає лише прапорець фільтра каталогу `hasRitual`. Іншого місця обробки немає.

РІШЕННЯ ВЛАСНИКА — немає жодного. Р37 і Р38 навпаки ПРИПУСКАЮТЬ, що риси дають заклинання (Р38: «Що дає риса понад класове — безкоштовне застосування раз на довгий відпочинок»). Три записи в «Прийнято» KNOWN-BUGS (BUG-001/002/003) — про довіру сервера клієнту на кроках створення, не про це. «Поза межами» в O18 і O27 цього не називає.

IN-FLIGHT — ні. `src/rules/spell-sources.ts` у списку паралельної сесії відсутній; KR27.7 — про рівні слотів проти рівнів підготовки, тему рис не чіпає.

ВЖЕ ВІДКРИТО — ні. У таблиці цілей `docs/README.md` немає цілі про механіку рис 2024; O18 і O27 закриті (9/9).

СЕРЙОЗНІСТЬ — P2 лишаю, але з іншим обґрунтуванням, ніж у автора: слайд «Магія» малюється без гейта заклинача (`CharacterCarousel.tsx:113`), а KR25.2 увімкнув «Додати до персонажа» для 2024, тож гравець може дописати ритуальні заклинання руками — нічого не втрачається назавжди і персонаж не потребує перестворення. Проте всередині самого звіту шкала непослідовна: L03-feats-10 (Fey Touched / Shadow Touched — той самий дефект «риса не дає заклинань», та сама пом'якшувальна обставина) стоїть P1. Пару треба звести до одного рівня; я б звів обидві до P2, бо жоден живий персонаж не зачеплений (усі 9 394 — RULES_2014, 2024 за гейтом релізу).

Класифікація `missing-system` правильна: механізм «гравець обирає заклинання всередині риси» відсутній як клас, а не зламаний.


### L03-feats-14 — Риси «Бойовий стиль» доступні будь-кому з класового ASI: у них немає передумови «Fighting Style Feature»

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md: кожна з рис Fighting Style позначена «_Fighting Style Feat (Prerequisite: Fighting Style Feature)_». Класовий ASI 2024 каже «another feat of your choice for which you qualify».

**Має бути:** Чарівник 4-го рівня не може взяти Archery або Defense — у нього немає фічі «Бойовий стиль».

**Є:** Може взяти будь-яку з 10 рис бойового стилю (і, через L03-feats-01, не отримує від неї нічого).

**Доказ:** creator-content-2024.json: усі 10 FIGHTING_STYLE рис мають prerequisiteLevel=null, prerequisiteFeat=null, prerequisiteProficiency=null, prerequisiteSpellcasting=false. Джерело вибору на підвищенні рівня завжди CLASS_ASI (src/server/db/levelup-persistence.ts:280-282: findFeatPackageProblem([{feat, source: "CLASS_ASI", …}])), а ALLOWED_CATEGORIES_BY_SOURCE.CLASS_ASI = "any" (src/rules/repeatable-feats.ts:74). Список у FeatsForm фільтрується лише пошуком і повторюваністю (той самий фільтр, що в BackgroundFeatsForm.tsx:65-88). Це не суперечить Р33: Р33 знімає обмеження за КАТЕГОРІЄЮ, а тут не виконана ПЕРЕДУМОВА риси.

**Відтворення:** 1) На :3100 підняти чарівника 2024 до 4-го рівня. 2) Гілка «Риса». 3) У списку присутні Archery, Defense, Dueling — усі як доступні; сервер приймає.

**Куди дивитись:** Внести передумову «має фічу Бойовий стиль» у дані рис (наприклад, prerequisiteFeature) і перевіряти її в checkFeatPrerequisites + feat-gates.ts.

**Файли:** `prisma/seed/`, `src/lib/logic/prerequisiteUtils.ts`, `src/server/db/feat-gates.ts`, `src/rules/repeatable-feats.ts`


### L03-feats-17 — Епічні дари: стеля характеристики зашита як 20, хоча книга дозволяє до 30

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ підтверджено закритим 2026-09-06 (KR31.4) — **закрив його KR27.9, не цей прохід**. Стеля живе однією чистою функцією `src/rules/ability-score-ceiling.ts`: 20 звичайно, 30 для `EPIC_BOON` у редакції 2024, плюс `raiseAbilityScore`, яка ніколи не знижує вже досягнутий показник. Усі сім місць, що раніше мали літерал, кличуть її; `grep "Math.min(20"` по `src/` не дає жодного входження в шляхах характеристик. Другої константи не заводилося.

**Правило:** data/2024/srd/feats.md, усі Epic Boon: «Ability Score Increase. Increase one ability score of your choice by 1, to a maximum of 30.»

**Має бути:** Персонаж 19-го рівня з 20 Силою, узявши Boon of Combat Prowess і обравши Силу, має 21.

**Є:** Лишається 20 — приріст мовчки з'їдається.

**Доказ:** Стеля 20 — константа в кожному шляху: src/rules/character-creation.ts:204 (clampAbilityScores → Math.min(20, score)); src/rules/levelup.ts:82-87 (Math.min(20, …) для всіх шести); src/rules/abilities.ts:157 (Math.min(20, scores[ability] + increase)); src/rules/strategies/rules2024.ts:72-76; src/server/db/levelup-persistence.ts:234 (newStats[k] = Math.min(20, v)). Жодне з цих місць не розрізняє категорію риси. Дані при цьому правильні: усі 12 EPIC_BOON мають grantedASI {"ANY":1} / {"STR_OR_DEX":1} / {"INT_OR_WIS_OR_CHA":1}.

**Відтворення:** grep -n "Math.min(20" src/rules/levelup.ts src/rules/abilities.ts src/rules/character-creation.ts src/server/db/levelup-persistence.ts

**Куди дивитись:** Зробити стелю параметром обчислення (20 звичайно, 30 коли приріст походить із риси категорії EPIC_BOON) і протягнути її крізь levelup.ts / abilities.ts / levelup-persistence.ts.

**Файли:** `src/rules/levelup.ts`, `src/rules/abilities.ts`, `src/rules/character-creation.ts`, `src/rules/strategies/rules2024.ts`, `src/server/db/levelup-persistence.ts`


### L07-spellcasting-04 — Риса «Посвячений у магію» 2024 не дає заклинань і не питає, які саме: 2 замовляння + 1 заклинання 1-го рівня втрачені

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** downgraded

**Правило:** data/2024/srd/feats.md:37–39: «You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list… Choose a level 1 spell from the same list… You always have that spell prepared. You can cast it once without a spell slot…»

**Має бути:** Крок вибору 2 замовлянь і 1 заклинання 1-го рівня з обраного списку; заклинання 1-го рівня — рядок pers_spell з isPrepared=true й excludeFromPreparedCount=true.

**Є:** Жодного рядка. Гравець додає їх як MANUAL: без «завжди підготовлено» і всередині ліміту класу.

**Доказ:** feat_choice_option для MAGIC_INITIATE (RULES_2024) містить рівно одну групу «Список заклинань» із трьома опціями (Cleric/Druid/Wizard) — вибору конкретних заклинань немає. Кроку заклинань немає ні в конструкторі (src/lib/components/characterCreator/creation-step-resolver.ts — жодної згадки spell), ні в майстрі підвищення (src/lib/components/levelUp/LevelUpWizard.tsx, id-кроків: path, summary, subclass, class-choices, subclass-choices, asi, feat-choices, infusions, weapon-mastery, skills, expertise, languages, optional-features, replacements, hp, confirm). Зібраний 03-high-elf-wizard-sage (originFeat MAGIC_INITIATE, список Wizard) на 5-му рівні має ЛИШЕ три заклинання родоводу; від риси — жодного.

**Відтворення:** probe-out.json → 03-high-elf-wizard-sage → spells: три рядки, усі origin RACE.

**Куди дивитись:** Або новий крок вибору заклинань риси (як featChoices), або звʼязок feature→spell там, де правило називає заклинання поіменно; рядок писати з excludeFromPreparedCount.

**Файли:** `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/rules/spell-sources.ts`, `data/2024/normalized/feats.json`

**Скептик:** Факт підтверджено власним доказом, але серйозність і редакцію завищено, а «очікувано» частково суперечить записаному рішенню.

(1) ПРАВИЛО — так. `data/2024/srd/feats.md`, «Magic Initiate»: «_Two Cantrips._ You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list… _Level 1 Spell._ Choose a level 1 spell from the same list… You always have that spell prepared. You can cast it once without a spell slot…».

(2) КОД І ДАНІ — гап реальний, перевірив сам. У `spells_test`: `feat` 3029 (MAGIC_INITIATE / RULES_2024) має рівно 3 `feat_choice_option` — група «Список заклинань», опції Cleric/Druid/Wizard; фічі `Magic Initiate: {Cleric,Druid,Wizard} list (2024)` мають `_FeatureToSpell = 0` і `LONG_REST / 1`. Єдиний запис `pers_spell` на створенні — `saveGrantedSpells` (`src/server/db/character-creation.ts:349-366`) через `findGrantedSpells`, а той у `src/rules/spell-sources.ts` бере лише `findSpeciesSource`; на підвищенні те саме (`src/server/db/levelup-persistence.ts:1375-1379`, коментар «Заклинання родоводу…»). `SpellOrigin.FEAT` в енумі є й не використовується. Кроку заклинань немає ні в `creation-step-resolver.ts`, ні в `LevelUpWizard.tsx`. У `probe-out.json` 03-high-elf-wizard-sage має три RACE-рядки, а MAGIC_INITIATE присутній лише як **джерело** (`kind: FEAT, ability: INT`) без жодного заклинання.

(3) РІШЕННЯ ВЛАСНИКА — частково перекриває «очікувано» автора. KR27.5 §5 (`docs/o27-multiclass-2024/kr27.5-spell-provenance.md`): «Позначка «завжди підготоване» для заклинання риси і лист із джерелами на одному заклинанні — не тут: Р38 прямо відкладає їх до появи окремого лічильника від рис». Те, що риса дає понад класове, за Р38 живе фічею з `limitedUsesPer/usesCount` — і це **зроблено** (перевірив у базі: три фічі списку, LONG_REST/1; `tests/actions/magic-initiate-2024.test.ts` це пінить). Тобто вимога автора «рядок `pers_spell` з `isPrepared=true`, `excludeFromPreparedCount=true`» — саме та частина, яку власник відклав.

(4) IN-FLIGHT — ні. Жоден із названих файлів не в списку паралельної сесії (`spell-actions.ts` і `AddSpellDialog.tsx` я лише читав, і механізму рис у них немає).

(5) ВІДКРИТИЙ KR — окремого KR під це немає, але діру вже виміряно й відкладено рішенням власника: `docs/o18-2024-character-parity/kr18.4-species-choices.md:113-123` — «у `persCreateSchema` немає **жодного** поля про заклинання — кроку вибору заклинань у створенні персонажа не існує… Довозити класові заклинання — це ще два-три KR… і власник 2026-08-29 підтвердив, що цього тут не робимо». Це scoping, не «Прийнято» (у `KNOWN-BUGS.md` розділі «Прийнято» цього немає), тому classification лишається `missing-system`, а не `accepted`.

(6) СЕРЙОЗНІСТЬ — P1 не тримається, це P2:
• вибір гравця **не губиться**: обраний список зберігається (`PersFeatChoice`), лічильник безкоштовного застосування видається на створенні;
• кроку вибору заклинань немає **для жодного джерела** — клірик 5-го рівня теж виходить із нулем заклинань; сам автор оцінив цю саму системну діру як P2 (L07-spellcasting-10), тож P1 тут внутрішньо суперечливий;
• ліміт підготовлених не примусовий — `MagicSlide.tsx:430-476` лише показує тост «Залишилось підготувати», а редактор бейджа (`MagicSlide.tsx:1278-1290`) дозволяє гравцеві вручну поставити `excludeFromPreparedCount`;
• заклинання чужого списку доступні: `AddSpellDialog.tsx:453` дає кнопку «Ні, без фільтрів».
Отже це «немає можливості, яку має зрілий білдер», виправне на листі без перестворення — рівно визначення P2.

Ще одна поправка: `edition` має бути `both`, а не `2024`. Риса 2014 (`feat_id = 22`) не має **жодного** `feat_choice_option` — у 2014 навіть списку не питають. Тобто це не регресія релізу 2024, а спільна діра продукту.


### L07-spellcasting-05 — «Посвячений у магію» 2024: характеристика замовляння прибита до списку, хоча книга дає вільний вибір INT/WIS/CHA

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md:37: «Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat's spells (choose when you select this feat).»

**Має бути:** Дві незалежні групи вибору: список (Cleric/Druid/Wizard) і характеристика (INT/WIS/CHA). Бард із «Посвяченим у магію (Чарівник)» має право чаклувати Харизмою.

**Є:** Характеристика виводиться зі списку; вибрати іншу неможливо.

**Доказ:** Запит до spells_test: group_name «Список заклинань» → «Magic Initiate 2024 (Cleric)» effect_ability=WIS, «(Druid)» WIS, «(Wizard)» INT. Тобто вибір списку одночасно фіксує характеристику — це правило 2014. findFeatSources (src/rules/spell-sources.ts:172) бере effectAbility як є, тому помилка доїжджає в джерело заклинань.

**Відтворення:** select co.group_name, co.option_name_eng, co.effect_ability from feat ft join feat_choice_option fco on fco.feat_id=ft.feat_id join choice_option co on co.option_id=fco.choice_option_id where ft.name='MAGIC_INITIATE' and ft.ruleset='RULES_2024';

**Куди дивитись:** Додати другу групу вибору «Характеристика замовляння» в data/2024/normalized/feats.json для MAGIC_INITIATE 2024; effectAbility брати з неї.

**Файли:** `data/2024/normalized/feats.json`, `src/rules/spell-sources.ts`


### L08-levelup-machine-07 — Сервер не перевіряє передумови риси на ASI-рівні — ні рівень, ні характеристики

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md:109-177 — «_Epic Boon Feat (Prerequisite: Level 19+)_»; General-риси мають «Prerequisite: Level 4+…»

**Має бути:** Серверна дія відхиляє рису, чиї передумови (рівень, характеристики, заклинальність) персонаж не виконує.

**Є:** Перевіряються лише категорія й повторюваність; виклик levelUpCharacter із featId епічного дару на 4-му рівні гейт не зупинить.

**Доказ:** src/server/db/feat-gates.ts:29-34 — findFeatPackageProblem перевіряє лише isFeatCategoryAllowed і повторюваність. checkFeatPrerequisites, де перевірка prerequisiteLevel реально є (src/lib/logic/prerequisiteUtils.ts:172-175), викликається лише з клієнтських форм BackgroundFeatsForm.tsx:166 і FeatsForm.tsx:185. У src/rules/repeatable-feats.ts:73 джерело CLASS_ASI описане як "any", тож і категорійний гейт епічний дар не спинить. Дані для перевірки є: у spells_test 2024 GENERAL — 43 риси з prerequisite_level=4, EPIC_BOON — 12 із prerequisite_level=19.

**Відтворення:** levelUpCharacter(persId, {classId, featId: <будь-який EPIC_BOON>, …}) на 4-му рівні — findFeatPackageProblem повертає null, бо CLASS_ASI дозволяє будь-яку категорію, а рівень не перевіряється взагалі.

**Куди дивитись:** Додати перевірку prerequisiteLevel/prerequisiteAbilityScore/prerequisiteSpellcasting у findFeatPackageProblem (або поруч, у чистій функції src/rules/), передавши рівень персонажа після підвищення й підсумкові характеристики.

**Файли:** `src/server/db/feat-gates.ts`, `src/rules/repeatable-feats.ts`, `src/lib/logic/prerequisiteUtils.ts`


### L11-persistence-identity-05 — «Додати рису» з листа пише голий рядок `pers_feat`: без гейта категорій/повторів, без виборів, без ASI, без навичок і без рядків `pers_feature`

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** docs/DECISIONS.md, Р37: «`upsert` по складеному ключу, який мовчки нічого не робив на другому взятті, замінено на `create` після гейта з причиною: неповторювана риса вдруге й `Magic Initiate` з тим самим списком відхиляються текстом, а не тишею»

**Має бути:** Додавання риси з листа проходить той самий гейт і дає ті самі наслідки, що й конструктор/підвищення (`saveFeatWithChoices`, character-creation.ts:325), або веде на крок із виборами.

**Є:** У базі зʼявляється рядок `pers_feat` без наслідків; частина ефектів (пасивні бонуси фічі риси) усе ж рахується, бо bonus-calculator.ts:191-193 читає `pf.feat.grantsFeature` через відношення, а не через `pers_feature`.

**Доказ:** src/lib/actions/feat-actions.ts:28-51 викликає лише `addPersFeat(persId, featId, choiceOptionIds)`. src/server/db/feat-actions.ts:56-84: `const existing = feat.isRepeatable ? null : await prisma.persFeat.findFirst({ where: { persId, featId } }); const persFeat = existing ?? (await prisma.persFeat.create({ data: { persId, featId } }));` — і більше нічого. (1) Гейт `findFeatPackageProblem` (src/server/db/feat-gates.ts:28) з цього шляху не викликається взагалі. (2) FeatsSheetManagerModal.tsx:78 шле `addFeatToPers({ persId, featId })` БЕЗ `choiceOptionIds`, тож `Skilled` з листа не дає навичок, а два `Magic Initiate` лягають без списків і нічим не відрізняються. (3) ASI від рис пишеться в `pers.str…cha` у транзакції (levelup-persistence.ts:373-400); `grep -n "asi" src/lib/logic/bonus-calculator.ts` — порожньо, тобто похідно ASI не рахується ніде. (4) `pers_skill` і `pers_feature` не створюються. (5) Неповторювана риса, яка вже є, повертає існуючий рядок, а дія віддає `{success:true}` і тост «Рису «X» додано!» (FeatsSheetManagerModal.tsx:82), хоча в базі нічого не змінилося.

**Відтворення:** Лист → «Керування рисами» → Каталог → додати `Skilled` → жодної нової навички на слайді Навичок; додати вже наявну неповторювану рису → зелений тост «додано», у БД без змін.

**Куди дивитись:** Викликати `findFeatPackageProblem` у `addFeatToPers` і винести блок наслідків із `saveFeatWithChoices` у спільну функцію; модалка має збирати `choiceOptionIds`.

**Файли:** `src/lib/actions/feat-actions.ts`, `src/server/db/feat-actions.ts`, `src/server/db/feat-gates.ts`, `src/lib/components/characterSheet/FeatsSheetManagerModal.tsx`, `src/server/db/character-creation.ts`


### P1-human-fighter-11 — Риса «Умілець» пропонує лише 18 навичок — інструментів, дозволених книгою, у списку немає

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md:55 — Skilled: «You gain proficiency in any combination of three skills **or tools** of your choice.»

**Має бути:** Комбінація з трьох навичок І/АБО інструментів на вибір

**Є:** Лише навички; гравець не може взяти від Skilled, наприклад, Злодійські інструменти

**Доказ:** Група «Skilled Options / Оберіть 3» містить рівно 18 позицій, усі — навички (Акробатика … Уважність), жодного інструмента: shots/P1-human-fighter-05-skilled-choices.png

**Відтворення:** /2024/char → Людина → риса Умілець → крок «Опції риси виду»

**Куди дивитись:** Розширити пул опцій риси Skilled інструментами (як зроблено для Ремісника/Музиканта, що дають інструменти)

**Файли:** `data/2024/normalized/feats.json`, `prisma/seed/`


### P2-elf-wizard-08 — Magic Initiate 2024: характеристика заклинань прибита до списку (Чарівник→INT, Клірик/Друїд→WIS), тоді як книга дає вибір INT/WIS/CHA

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md:37 — «Two Cantrips. You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat's spells (choose when you select this feat)»

**Має бути:** Дві незалежні групи виборів: список заклинань (Cleric/Druid/Wizard) і характеристика (INT/WIS/CHA)

**Є:** Одна група; характеристика жорстко прив'язана до списку, легальні комбінації (напр. Magic Initiate (Cleric) на INT) недосяжні

**Доказ:** select * from choice_option where option_id in (3379,3380,3381) (усі три — feat_choice_option риси 3029 MAGIC_INITIATE, RULES_2024): group_name «Список заклинань», option_name Клірик/Друїд/Чарівник, effect_ability відповідно WIS/WIS/INT. Групи «Базова характеристика заклинань» (як у ельфійського родоводу, де вона є — опції 144–146) для риси немає.

**Відтворення:** select option_id, option_name, group_name, effect_ability from choice_option where option_id in (3379,3380,3381)

**Куди дивитись:** Додати другу групу choice_option «Базова характеристика заклинань» до риси MAGIC_INITIATE 2024 за зразком опцій 144–146 ельфійського родоводу; правити файл-джерело сіду рис (Р33), не базу

**Файли:** `data/2024/normalized/feats.json`, `prisma/seed/`


### L03-feats-13 — Передумова «володіння» (prerequisiteProficiency) ніде не перевіряється — Heavy Armor Master доступний чарівникові

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт скептика:** downgraded

**Правило:** data/2024/srd/feats.md, «Parts of a Feat»: «Prerequisite. To take a feat, you must meet any prerequisite in its description unless a feature allows you to take the feat without the prerequisite.» Moderately Armored → Light Armor Training; Heavily Armored → Medium Armor Training; Heavy Armor Master → Heavy Armor Training; Medium Armor Master → Medium; Shield Master → щит.

**Має бути:** Чарівник без обладункових тренувань бачить Heavy Armor Master як недоступну (як зараз бачить недоступними риси з невідповідною характеристикою).

**Є:** Картка риси активна, сервер приймає вибір; персонаж отримує рису, передумови якої не виконує.

**Доказ:** Дані передумову несуть: запит до spells_test повертає prerequisite_proficiency = {'armor': ['MEDIUM']} для Heavily Armored і Medium Armor Master, {'armor': ['HEAVY']} для Heavy Armor Master, {'armor': ['LIGHT']} для Moderately Armored, {'armor': ['SHIELD']} для Shield Master. Але src/lib/logic/prerequisiteUtils.ts:150-244 (checkFeatPrerequisites) перевіряє тільки prerequisiteLevel, prerequisiteAbilityScore, prerequisiteSpellcasting, raceRestriction, subraceRestriction — гілки для prerequisiteProficiency немає. Греп по всьому src/: «prerequisiteProficiency» трапляється виключно всередині src/lib/generated/feats.json, у коді — жодного разу. Серверний гейт src/server/db/feat-gates.ts теж дивиться лише на категорію і повторюваність.

**Відтворення:** 1) На :3100 підняти чарівника 2024 до 4-го рівня. 2) На кроці ASI обрати гілку «Риса». 3) Heavy Armor Master і Shield Master показані як доступні й приймаються сервером.

**Куди дивитись:** Додати гілку prerequisiteProficiency у checkFeatPrerequisites (порівняння з наявними володіннями персонажа) і дзеркальну перевірку у feat-gates.ts, щоб серверний шлях теж не пускав.

**Файли:** `src/lib/logic/prerequisiteUtils.ts`, `src/server/db/feat-gates.ts`

**Скептик:** Правило підтверджено (data/2024/srd/feats.md:13), але знахідка в поданому формулюванні хибна у двох із трьох тверджень.

1) «Рівень і характеристики не перевіряються» — НЕПРАВДА. `FeatsForm.tsx:181-207` рахує `checkFeatPrerequisites` для кожної риси, `FeatPicker.tsx:63-90` малює картку затемненою з червоною причиною, а вибір іде через `PrerequisiteConfirmationDialog`. На підвищенні рівня контекст передається з правильним рівнем: `LevelUpASIForm.tsx:386-391` дає `level: levelAfter`. Тобто епічний дар на 4-му рівні показується з написом «Потрібен 19 рівень», а не «як доступний».

2) «Сервер не перевіряє» — ПРАВДА фактично, але це прямо ухвалено власником, двічі:
- `docs/o18-2024-character-parity/kr18.3-feat-sources.md:192`: «~~Передумови рис сервер не перевіряє.~~ Рішення власника 2026-08-28: **не робимо.** `checkFeatPrerequisites` кличуть лише екрани створення, обійти це можна й у 2014 — окремою дірою це не вважаємо.»
- `docs/DECISIONS.md:1667-1673` (Р39): «передумови рис у цьому проєкті — **попередження, а не заборона**: `FeatsForm` показує `PrerequisiteConfirmationDialog` і пускає далі, якщо гравець підтвердив, а сервер передумов не перевіряє взагалі… Це названа межа: політика «правила підказують, не забороняють» (Р26) спільна для всіх рис обох редакцій».
Отже «сервер приймає вибір» — не баг, а Р26/Р39; і «expected: чарівник бачить рису недоступною» суперечить політиці — недоступних рис у цьому UI немає взагалі, є попереджені.

3) Що справді лишається: `prerequisiteProficiency` не читає НІХТО — `checkFeatPrerequisites` (`prerequisiteUtils.ts:156-166`) приймає лише `prerequisiteAbilityScore/Level/Spellcasting/raceRestriction/subraceRestriction`; грep по `src/` дає це поле лише у `src/lib/generated/feats.json` і `scripts/generate-feats.ts:79`. Тож для 5 рис 2024 (і 6 рис 2014) гравець не отримує навіть попередження, яке політика Р26/Р39 обіцяє. Це реальна, але вузька дірка в підказці, а не в розрахунку: жодне число персонажа не змінюється (мехніки цих рис 2024 і так порожні — L03-feats-01/02), жоден вибір не губиться.

Серйозність за шкалою CONTEXT: P1 — «персонаж порахований не за книгою або вибір гравця губиться». Ні того, ні того тут немає — сервер і так пускає все за рішенням власника, а неотримана підказка це UX. Тому P3 (P2 захисне, якщо власник рахує повноту попереджень за можливість зрілого білдера).

Редакція: не «2024», а **both** — ті самі 6 рядків із `prerequisite_proficiency` є і в `RULES_2014` (Fighting Initiate, Heavily Armored, Heavy Armor Master, Medium Armor Master, Moderately Armored, Strike of the Giants).

Не in-flight (жоден із файлів не в списку паралельної сесії), не відкритий KR (єдина згадка в docs — саме як закрите «не робимо»).


### L03-feats-18 — Boon of Spell Recall втратив передумову «Spellcasting Feature» — доступний варварові

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/feats.md: «Boon of Spell Recall — _Epic Boon Feat (Prerequisite: Level 19+, Spellcasting Feature)_»

**Має бути:** Варвар 19-го рівня бачить Boon of Spell Recall недоступною з причиною «Потрібна здатність накладати заклинання».

**Є:** Риса доступна.

**Доказ:** creator-content-2024.json: Boon Of Spell Recall → prerequisiteSpellcasting: false, prerequisiteLevel: 19. Для порівняння, у Elemental Adept, Spell Sniper і War Caster прапорець стоїть true і checkFeatPrerequisites (prerequisiteUtils.ts:212-214) його відпрацьовує. data/2024/normalized/feats.json теж має prerequisite: "19+ рівень" без згадки замовляння — тобто помилка прийшла з нормалізації.

**Відтворення:** node -e "const c=require('./src/lib/generated/creator-content-2024.json'); console.log(c.feats.filter(f=>f.prerequisiteSpellcasting).map(f=>f.engName))" → ['Elemental Adept','Spell Sniper','War Caster'] — без Boon Of Spell Recall

**Куди дивитись:** prerequisite_spellcasting = true у сіді 2024 і в data/2024/normalized/feats.json.

**Файли:** `data/2024/normalized/feats.json`, `prisma/seed/`


## Мобільний (3)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P1 | both | bug | `P7-mobile-ux-01` | Смуга навігації слайдів листа персонажа прибита до сталих bottom-[75px] і на будь-якому iPhone із home indicator ховається під нижнім навбаром, який росте разом із env(safe-area-inset-bottom) | src/lib/components/characterSheet/CharacterCarousel.tsx, src/components/ui/Navigation.tsx |
| · | P2 | both | bug | `P7-mobile-ux-02` | Бічні стрілки каруселі — фіксовані 40×40 кружечки на вертикальній середині екрана, які на мобільному лежать поверх контенту слайда | src/lib/components/characterSheet/CharacterCarousel.tsx |
| · | P3 | both | bug | `P7-mobile-ux-07` | Тап-цілі менші за 40×40 на кожному ключовому екрані, зокрема головна дія конструктора «Далі →» (68×36) і «Додати до персонажа» в каталозі заклинань (32×32) | src/components/ui/button.tsx, src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx |

### P7-mobile-ux-01 — Смуга навігації слайдів листа персонажа прибита до сталих bottom-[75px] і на будь-якому iPhone із home indicator ховається під нижнім навбаром, який росте разом із env(safe-area-inset-bottom)

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Смуга навігації слайдів стоїть над глобальним навбаром на всіх пристроях, як панель «Далі/Назад» конструктора.

**Є:** На iPhone X…16 у портреті (safe-area-inset-bottom = 34 px) навбар накриває 31 із 42 px смуги; підписи слайдів невидимі, лишаються тільки свайп і бічні стрілки.

**Доказ:** Код: src/lib/components/characterSheet/CharacterCarousel.tsx:194 — `<div className="fixed bottom-[75px] left-0 w-full md:sticky md:bottom-0 z-20 border-t …">` (без env()). Проти src/components/ui/Navigation.tsx:241 — `"fixed bottom-0 left-0 z-50 … pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"`, тобто висота навбару росте з інсетом. Усі інші фіксовані панелі інсет враховують: MultiStepForm.tsx:1057 і LevelUpWizard.tsx:1349 `bottom-[calc(64px+env(safe-area-inset-bottom))]`, NavExtraMenu.tsx:287 `bottom-[calc(env(safe-area-inset-bottom)+72px)]` — карусель єдиний виняток. Вимір у браузері (scratchpad/audit/work/P7-mobile-ux/s11-safearea.mjs, 375x812, /char/132): інсет 0 → навбар top 740 h 72, смуга слайдів 695–737 (h 42), перекриття 0. Інсет 34px (симульовано paddingBottom навбару) → навбар top 706 h 106, смуга не рухається 695–737 → перекриття 31 px із 42, тобто 74 %. Скріншот scratchpad/audit/shots/P7/90-safe-area-sim.png: від смуги видно лише верхні ~11 px, підписи слайдів закриті.

**Відтворення:** 1) 375×812, isMobile, hasTouch, DPR 2. 2) Відкрити /char/<id> (я брав 132). 3) Подивитися на низ екрана на пристрої з home indicator, або запустити `node scratchpad/audit/work/P7-mobile-ux/s11-safearea.mjs`, який симулює інсет 34 px і друкує overlapPx=31.

**Куди дивитись:** CharacterCarousel.tsx:194 — замінити `bottom-[75px]` на `bottom-[calc(64px+env(safe-area-inset-bottom))]`, як у MultiStepForm.tsx:1057.

**Файли:** `src/lib/components/characterSheet/CharacterCarousel.tsx`, `src/components/ui/Navigation.tsx`


### P7-mobile-ux-02 — Бічні стрілки каруселі — фіксовані 40×40 кружечки на вертикальній середині екрана, які на мобільному лежать поверх контенту слайда

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** На мобільному навігація слайдів — свайп і смуга знизу; стрілки або поза контентом, або лише від md:.

**Є:** Дві непрозорі 40×40 кнопки постійно висять поверх вмісту слайда; на щільних слайдах (Бій, Магія) приходяться на рядки зброї та заклинань.

**Доказ:** Код: CharacterCarousel.tsx:171-190, коментар автора «Side navigation arrows (all breakpoints)», className="fixed left-2 md:left-28 top-1/2 -translate-y-1/2 … w-10 h-10 md:w-12 md:h-12 … z-10" (і дзеркально right-2). Вимір у браузері (s11-safearea.mjs, 375×812, /char/132): Previous slide — x 8…48, y 386…426; Next slide — x 327…367, y 386…426. Картка слайда займає майже всю ширину (≈12…363), тож обидві стрілки всередині її меж. Скріншот shots/P7/90-safe-area-sim.png: ліва стрілка накриває картку «СТА 13 +1 РЯТК +1», права — «ІНТ 15 +2 РЯТК +5».

**Відтворення:** 375×812 → /char/<id> → подивитися на вертикальну середину екрана; або запустити s11-safearea.mjs і подивитися поле `arrows`.

**Куди дивитись:** CharacterCarousel.tsx:172,183 — сховати стрілки на мобільному (`hidden md:flex`); навігація лишається свайпом і смугою знизу.

**Файли:** `src/lib/components/characterSheet/CharacterCarousel.tsx`


### P7-mobile-ux-07 — Тап-цілі менші за 40×40 на кожному ключовому екрані, зокрема головна дія конструктора «Далі →» (68×36) і «Додати до персонажа» в каталозі заклинань (32×32)

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Має бути:** Мінімум 44×44 (iOS HIG) або 40×40; для головної дії кроку — тим паче.

**Є:** Жоден із перелічених елементів не дотягує навіть до 40 px по одному з вимірів; найгірші — 32×32 «Додати до персонажа» у щільному списку заклинань і 36 px висоти в кнопки «Далі →» 10-крокового майстра.

**Доказ:** Вимір getBoundingClientRect() усіх button/a/[role=button|checkbox|radio|tab]/input/select при 375×812 (дані у work/P7-mobile-ux/{create2,catalogs,sheet-132}.json, поле smallTaps). Конструктор, усі кроки: «Далі →» 68×36, «Назад» 85×36. Крок «Вид»: «Показати деталі …» ×10 по 36×36. Крок «Опції класу»: «Інформація про …» ×23 по 32×32. Крок «Характеристики»: вкладки «За очками/Просто/Вільно» 89×32. Лист персонажа, шапка: «Друк» 36×36, «Поділитися» 36×36, «Відпочинок» 105×36, «Підняти рівень» 105×36. Слайд Навички: рядок навички ×18 по 157×36. /2024/spells і /spells: «Додати до персонажа» 32×32 і «Додати до друку» 36×36 на кожному заклинанні; «Друк(0)» 60×36. /2024/bastions і /2024/feats: чипи фільтра 30 px заввишки. Усі каталоги: «Фільтри» 88×36.

**Відтворення:** 375×812, isMobile, hasTouch → пройти /2024/char, відкрити /char/<id>, /2024/spells; заміряти елементи (скрипт work/P7-mobile-ux/measure.mjs, експорт MEASURE).

**Куди дивитись:** Підняти висоту базових варіантів Button (sm/icon) до 40–44 px під мобільним брейкпоінтом у src/components/ui/button.tsx і прибрати локальні h-8 w-8 / h-9 w-9 у перелічених місцях.

**Файли:** `src/components/ui/button.tsx`, `src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx`, `src/lib/components/characterCreator/MultiStepForm.tsx`, `src/app/2024/spells`, `src/app/char/[id]/CharHomeClient.tsx`


## Мультиклас (6)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P1 | 2014 | bug | `L17-known-registries-02` | BUG-006 живий для 2014: мультиклас не додає жодного скороченого володіння, бо таблиця містить лише класи 2024 (KR27.2 закрив тільки 2024) | src/rules/multiclass-proficiencies.ts, src/server/db/levelup-persistence.ts |
| · | P1 | 2014 | bug | `P3-multiclass-wizard-cleric-05` | Передумова мультикласу у формі `choice` не перевіряється в RULES_2014 — Воїна пропонують персонажу з СИЛ 8 і СПР 10 | src/rules/multiclass-entry.ts, src/lib/components/levelUp/LevelUpWizard.tsx |
| · | P2 | 2024 | bug | `L07-spellcasting-12` | Ліміт підготовлених у мультикласі 2024 складається в одне число замість окремого за класом | src/lib/components/characterSheet/slides/MagicSlide.tsx, src/lib/logic/spellcasting-progression.ts |
| ↓ | P2 | 2014 | bug | `L17-known-registries-03` | BUG-008 виправлено лише наполовину: гейт мультикласу для 2014 не читає форму `choice` (тобто Воїн 2014 без вимог взагалі) і ніколи не перевіряє поточний клас | src/rules/multiclass-entry.ts, src/server/db/levelup-persistence.ts |
| · | P3 | both | bug | `L08-levelup-machine-13` | getLevelUpInfo рахує потребу підкласу й ASI за рівнем основного класу, а нові фічі — за рівнем персонажа | src/server/db/levelup-persistence.ts, src/lib/actions/levelup.ts |
| · | P3 | both | missing-system | `L19-parity-competitors-15` | Недоступні для мультикласу класи ховаються замість того, щоб показатися з причиною — хоч у рисах цей патерн уже зроблено правильно | src/lib/components/levelUp/LevelUpWizard.tsx |

### L17-known-registries-02 — BUG-006 живий для 2014: мультиклас не додає жодного скороченого володіння, бо таблиця містить лише класи 2024 (KR27.2 закрив тільки 2024)

**Рівень:** P1 · **Редакція:** 2014 · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

✅ **Закрито в KR31.12, 2026-09-06.** Дописано `MULTICLASS_PROFICIENCIES_2014` рядок у рядок із `data/2014/srd/03_Characterization/Multiclassing.md:47-63`; функція лишилася одна, бо редакція вшита в назву класу. Тест `src/rules/multiclass-proficiencies.test.ts` (11 перевірок, доведений червоним). Матриця `multiclass-fifteen` лишилася `27 passed`. **Артифайсер свідомо без рядка:** таблиці 2014 (TCoE) у репозиторії немає, вигадувати не можна. Друга частина зауваження скептика — крок вибору навички при вході в клас — не закрита: її немає в жодній редакції, і це окрема робота.

**Правило:** data/2014/srd/03_Characterization/Multiclassing.md:47-63 — «When you gain your first level in a class other than your initial class, you gain only some of new class's starting proficiencies»; таблиця: Fighter «Light armor, medium armor, shields, simple weapons, martial weapons», Rogue «Light armor, one skill from the class's skill list, thieves' tools».

**Має бути:** Чарівник 2014, що бере 1 рівень Воїна, отримує в customProficiencies легкі й середні обладунки, щити, просту й бойову зброю.

**Є:** customProficiencies не змінюється взагалі — розрахунку для класів 2014 у коді немає.

**Доказ:** src/rules/multiclass-proficiencies.ts — константа називається MULTICLASS_PROFICIENCIES_2024 і має лише ключі *_2024; коментар у файлі (рядки 18-19): «Класи 2014 тут відсутні навмисно: у 2014 своя таблиця скорочених володінь, гілка `MULTICLASS` сьогодні не видає нічого, і 9 394 живих персонажі цієї редакції цим KR не рухаються.» Єдиний споживач — src/server/db/levelup-persistence.ts:1150-1164: findMulticlassProficiencies(selectedClass.name) для FIGHTER_2014 повертає null, блок customProficiencyExtras не виконується.

**Відтворення:** Читання коду: grep findMulticlassProficiencies src → один виклик у levelup-persistence.ts:1151; MULTICLASS_PROFICIENCIES_2024 не містить жодного ключа *_2014.

**Куди дивитись:** Додати MULTICLASS_PROFICIENCIES_2014 у той самий файл (значення рядок у рядок із SRD-таблиці вище) і зняти суфікс _2024 з назви таблиці/функції; ризик для наявних персонажів нульовий, бо рядки додаються лише в момент мультикласу.

**Файли:** `src/rules/multiclass-proficiencies.ts`, `src/server/db/levelup-persistence.ts`, `docs/KNOWN-BUGS.md`

**Скептик:** Спростувати не вдалося — знахідка стоїть, і я додав доказ, якого в автора не було. Правило звірено з оракулом 2014 дослівно; код перевірено на альтернативні шляхи (єдиний споживач `findMulticlassProficiencies` — `levelup-persistence.ts`, і при `MULTICLASS` рядок класу більше ніде не читається); golden-знімки реального левелапу показують нульовий приріст `customProficiencies` при вході в FIGHTER_2014 і CLERIC_2014 — тобто це не лише читання коду. BUG-006 у реєстрі має статус «відкрито», прийняття власника немає, у файлах паралельної сесії цього немає. Дві поправки до формулювання автора: (а) наслідок вужчий, ніж «без усього» — щит для КЗ і володіння предметами на листі працюють іншими шляхами, ламається саме записаний і друкований список володінь; (б) дефект ширший в іншому місці — навичка з мультикласу (Rogue/Bard/Ranger) не пропонується взагалі, і це так само в 2024. Серйозність лишаю P1: шкала CONTEXT прямо називає «відсутнє володіння» ознакою P1, і лист із друком суперечать книзі без втручання гравця; можливість дописати рядок руками не робить це P2, бо всі володіння в цьому застосунку живуть у тому самому текстовому полі — інакше клас P1 «володіння» був би порожнім за визначенням.


### P3-multiclass-wizard-cleric-05 — Передумова мультикласу у формі `choice` не перевіряється в RULES_2014 — Воїна пропонують персонажу з СИЛ 8 і СПР 10

**Рівень:** P1 · **Редакція:** 2014 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-creation.md, Multiclassing → Prerequisites: «To qualify for a new class, you must have a score of at least 13 in the primary ability of the new class and your current classes». PHB 2014 для Воїна: Сила 13 або Спритність 13.

**Має бути:** Воїна 2014 не показувати персонажу без СИЛ 13 і без СПР 13; персонажу з класом 2024 пропонувати класи 2024.

**Є:** Воїн 2014 доступний будь-кому; персонажу 2024 пропонують класи 2014, тож через UI зібрати мультиклас 2024 неможливо, а спроба дає персонажа з класами двох редакцій.

**Доказ:** Майстер /char/23/levelup → «Взяти новий клас (мультиклас)» (shots/P3-07-mc-path.png). На екрані підпис «Показано лише класи, для яких виконані вимоги мультикласу (зазвичай 13+)», далі «Ваші характеристики: СИЛ 8 · СПР 10 · СТА 13 · ІНТ 15 · МУД 14 · ХАР 12», а в списку — КЛІРИК, ДРУЇД, ВОЇН, ЧАРІВНИК, ВИНАХІДНИК. У базі `FIGHTER_2014.multiclassReqs = {"score":13,"choice":["STR","DEX"]}` — єдиний клас 2014, записаний формою `choice`. src/rules/multiclass-entry.ts, readRequirement: `if (ruleset === "RULES_2024" && reqs.choice?.length) { return {...} } return null;` — для 2014 форма `choice` дає null, тобто вимоги немає взагалі. Коментар у шапці файлу стверджує, що класи 2014 записані формою `required`, і саме тому виняток не помітили. Той самий екран доводить наслідок знахідки 01: персонажу з класом WIZARD_2024 пропонують класи 2014 (за логікою 2024 для ІНТ 15 / МУД 14 підійшли б рівно Клірик, Друїд, Чарівник, Винахідник — без Воїна).

**Відтворення:** Персонаж будь-якої редакції з СИЛ < 13 і СПР < 13 → /char/<id>/levelup → «Взяти новий клас (мультиклас)» → у списку є ВОЇН.

**Куди дивитись:** У `readRequirement` читати `choice` і для RULES_2014 (це та сама книжкова норма «або/або»), або переписати `FIGHTER_2014.multiclassReqs` у форму, яку 2014-гілка розуміє. Перше правильніше; поправити й коментар у шапці multiclass-entry.ts, бо він фактично неточний. Окремо: список класів у майстрі має фільтруватися за редакцією персонажа після виправлення знахідки 01.

**Файли:** `src/rules/multiclass-entry.ts`, `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/server/db/multiclass-content.ts`


### L07-spellcasting-12 — Ліміт підготовлених у мультикласі 2024 складається в одне число замість окремого за класом

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-creation.md:937: «You determine what spells you can prepare for each class individually, as if you were a single-classed member of that class. If you are a level 4 Ranger / level 3 Sorcerer, for example, you can prepare five level 1 Ranger spells, and you can prepare six Sorcerer spells of level 1 or 2.»

**Має бути:** Слідопит 4 / Чародій 3: дві окремі стелі — 5 заклинань Слідопита і 6 Чародія (приклад із самого SRD).

**Є:** Одна стеля 11, тобто лист дозволяє підготувати 11 заклинань Чародія.

**Доказ:** src/lib/components/characterSheet/slides/MagicSlide.tsx:275-289 (preparedSpellsLimit) підсумовує значення ВСІХ рядків із міткою «можна підготувати» в одне total і малює «Підготовлено: X / total» (:500-505). Самі числа рядків правильні — SPELL_PREPARATION_2024 звірено з SRD побайтово; неправильне саме склеювання. Додатково блок лежить у згорнутому Collapsible (MagicSlide.tsx:483, defaultOpen={false}), тож типовий гравець стелі не бачить узагалі.

**Відтворення:** Зібрати мультиклас Слідопит 4 / Чародій 3 у 2024 і відкрити блок «Кількість відомих / підготовлених» на слайді «Магія».

**Куди дивитись:** Рахувати підготовлені й стелю окремо на кожен рядок spellcastingCounts, привʼязуючи pers_spell до класу-джерела; блок розгортати за замовчуванням, коли стеля перевищена.

**Файли:** `src/lib/components/characterSheet/slides/MagicSlide.tsx`, `src/lib/logic/spellcasting-progression.ts`


### L17-known-registries-03 — BUG-008 виправлено лише наполовину: гейт мультикласу для 2014 не читає форму `choice` (тобто Воїн 2014 без вимог взагалі) і ніколи не перевіряє поточний клас

**Рівень:** P2 · **Редакція:** 2014 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Правило:** data/2014/srd/03_Characterization/Multiclassing.md:11 — «To qualify for a new class, you must meet the ability score prerequisites for both your current class and your new one»; таблиця там же: Fighter — «Strength 13 or Dexterity 13».

**Має бути:** Чарівник 2014 із СИЛ 9 / СПР 9 не може взяти рівень Воїна (потрібно СИЛ 13 або СПР 13), і мультиклас узагалі неможливий, якщо не виконані вимоги й поточного класу.

**Є:** levelUpCharacter повертає {success:true}, створюється рядок pers_multiclass. Для 2014 перевіряється лише новий клас, а для Воїна — нічого.

**Доказ:** Гейт зʼявився: src/server/db/levelup-persistence.ts:188-197 викликає findMulticlassEntryProblem до будь-якого запису. Але src/rules/multiclass-entry.ts:50-52 — `const classesToCheck = args.ruleset === "RULES_2024" ? [args.newClass, ...args.currentClasses] : [args.newClass];` і :96-99 — `if (ruleset === "RULES_2024" && reqs.choice?.length) { return {...}; } return null;`. У базі (select eng_name, "multiclassReqs" from class) єдиний клас 2014 із формою choice — FIGHTER_2014: {"score":13,"choice":["STR","DEX"]}. Програмна збірка (scratchpad/audit/work/L17-known-registries/mc2014.test.ts, зелена): before {"str":9,"dex":9,"level":1} → levelUp result {"success":true}, multiclasses [{"classId":1,"classLevel":1}]. Проміжний прогін без вибору бойового стилю дав {"error":"Дооберіть опції"} — тобто гейт характеристик пропустив персонажа, зупинила інша перевірка.

**Відтворення:** bunx vitest run --config .../vitest.audit.mts з include на mc2014.test.ts: createCharacter (WIZARD_2014, POINT_BUY STR 8 / DEX 8) → levelUpCharacter({levelUpPath:"MULTICLASS", classId: FIGHTER_2014, classChoiceSelections:{"Бойовий стиль":3}}).

**Куди дивитись:** Прибрати обидві умови «тільки 2024» в src/rules/multiclass-entry.ts: перевіряти [newClass, ...currentClasses] і читати `choice` для обох редакцій. Дані вже правильні. Перед вмиканням порахувати, скільки з 705 живих мультикласових персонажів 2014 зараз не проходять, — інакше вони не зможуть підвищитися далі.

**Файли:** `src/rules/multiclass-entry.ts`, `src/server/db/levelup-persistence.ts`, `docs/KNOWN-BUGS.md`

**Скептик:** ФАКТИ ПІДТВЕРДЖЕНО НЕЗАЛЕЖНО, АЛЕ СЕРЙОЗНІСТЬ ЗАВИЩЕНА І ЦЕ СВІДОМО ВІДКЛАДЕНА, ЗАПИСАНА МЕЖА.

(1) ПРАВИЛО — вірне. data/2014/srd/03_Characterization/Multiclassing.md:11: «To qualify for a new class, you must meet the ability score prerequisites for both your current class and your new one»; таблиця там же: Fighter — «Strength 13 or Dexterity 13». Цитата автора точна.

(2) КОД — вірний, і дірка ще ширша, ніж у формулюванні. src/rules/multiclass-entry.ts:50-52 і :97-99 — рівно як цитовано. Другого гейта немає: grep по src/ дає лише два виклики findMulticlassEntryProblem — сервер (src/server/db/levelup-persistence.ts:195, єдина перевірка передумов на гілці MULTICLASS) і клієнт (src/lib/components/levelUp/LevelUpWizard.tsx:698). Тобто «UI — джерело істини» тут теж не рятує: форма фільтрує тією самою функцією, і для 2014 воїн лишається у списку будь-кому. Прогнав src/rules/multiclass-entry.test.ts (DATABASE_URL=...none_test, 8 passed) — два кейси прямо пінять цю поведінку: «наявний клас не блокує входу» і «форму `choice` у 2014 не читає ніхто — воїн лишається доступним, як і сьогодні». Тобто механізм доведений самим репо, інтеграційну збірку автора перезапускати не треба.

(3) ДАНІ — вірні. Власний запит до spells_test (select class_id, eng_name, ruleset, "multiclassReqs" from class): з 13 класів 2014 форму `choice` несе рівно FIGHTER_2014 {"score":13,"choice":["STR","DEX"]}, решта — `required`. У 2024 навпаки: `choice` у дев'яти + артифіцер, `and` у трьох, `required` ніде.

(4) РІШЕННЯ ВЛАСНИКА — прийнятого рішення немає, тож classification лишається bug, а не accepted. docs/KNOWN-BUGS.md BUG-008: «Статус: відкрито — очікує рішення власника (прийняти за аналогією з BUG-001..003 чи трактувати окремо через геймплейний вплив)». У docs/DECISIONS.md мультикласової передумови немає (Р33 закрив округлення заклинача й категорії рис, не це).

(5) АЛЕ ЦЕ НЕ ВІДКРИТТЯ — межу описано дослівно й навмисно. docs/o27-multiclass-2024/kr27.2-multiclass-entry.md, розділ «Ризик»: «Передумова так само звужена редакцією, і це окреме рішення, а не недогляд… у 2014 вона є лише у воїна, тобто персонаж зі STR 12 і DEX 12 нині законно бере воїна другим класом… це зміна поведінки живих персонажів — питання власнику, не побічний ефект KR». Журнал того ж файлу: «у 2014 перевірка працювала для всіх, крім воїна». Шапка src/rules/multiclass-entry.ts:12-16 повторює те саме. Тобто знахідка переказує вже записане обмеження відкритого BUG-008, а не викриває його.

(6) СЕРЙОЗНІСТЬ — P1 не тримається за шкалою CONTEXT. P1 — «персонаж порахований не за книгою (числа, відсутня риса/вибір/слот/володіння) або вибір гравця губиться». Тут нічого не рахується неправильно й нічого не губиться: застосунок дозволяє більше, ніж книга. Це та сама категорія, яку власник уже прийняв 2026-08-13 по BUG-001..003 («UI — джерело істини; створити персонажа з недозволеним вибором краще, ніж відмовити»), і вмикання гейта — не безкоштовне: воно додає два нові блокування 705 живим мультикласовим персонажам, які після цього не зможуть підвищитися. Ближче до P2 («немає перевірки, яку має зрілий білдер»), з явним рішенням власника перед вмиканням. Ремарку автора про підрахунок постраждалих перед вмиканням вважаю обов'язковою, а не «обережно».

Дрібна неточність автора: підпис member_evidence про WIZARD_2024 зі СИЛ 8 / СПР 10 доводить цю знахідку лише якщо pers.ruleset = RULES_2014 (при RULES_2024 форма `choice` читається й воїна відфільтрувало б) — той екран радше доказ сусідньої знахідки про крос-редакційний список, ніж цієї. Суті це не міняє: код, дані й зелений юніт-набір доводять знахідку без браузера.


### L08-levelup-machine-13 — getLevelUpInfo рахує потребу підкласу й ASI за рівнем основного класу, а нові фічі — за рівнем персонажа

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-creation.md:911-915 — «When you gain a new level in a class, you get its features for that level»; рівень персонажа й рівень класу — різні лічильники (там само, §Proficiency Bonus)

**Має бути:** Поля відповіді описують рівень того класу, який гравець підвищує.

**Є:** needsSubclass/isASILevel — за основним класом навіть коли підвищується побічний; newClassFeatures — за рівнем персонажа. Сьогодні майстер перелічує все сам (LevelUpWizard.tsx:659-672), тож користувач цього не бачить, але поля публічні (src/lib/actions/levelup.ts:7) і брешуть.

**Доказ:** src/server/db/levelup-persistence.ts:86-91: `const mainClassLevelAfter = findMainClassLevel(pers) + 1; const needsSubclass = rulesStrategy.needsSubclassSelection(currentClass ?? {}, Boolean(pers.subclassId), mainClassLevelAfter); const isASILevel = isAbilityScoreIncreaseLevel(currentClass ?? {}, mainClassLevelAfter); const newClassFeatures = (currentClass?.features ?? []).filter((f) => f.levelGranted === nextLevel);` — три різні лінійки в чотирьох рядках. Для порівняння, executeLevelUp:711-720 робить правильно: `if (cf.levelGranted === classLevelAfter)`.

**Відтворення:** Мультикласовий персонаж (напр. Wizard 2 / Fighter 2) → getLevelUpInfo повертає needsSubclass/isASILevel для чарівника незалежно від того, який клас підвищують.

**Куди дивитись:** Або прибрати ці поля з відповіді, або рахувати їх від обраного класу — але клас відомий лише у формі, тож чесніше видалити й лишити один розрахунок у майстрі й в executeLevelUp.

**Файли:** `src/server/db/levelup-persistence.ts`, `src/lib/actions/levelup.ts`


### L19-parity-competitors-15 — Недоступні для мультикласу класи ховаються замість того, щоб показатися з причиною — хоч у рисах цей патерн уже зроблено правильно

**Рівень:** P3 · **Редакція:** both · **Тип:** missing-system · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a (паритет: DDB показує клас сірим із текстом «You do not meet the prerequisite»)

**Має бути:** Клас показується недоступним із конкретною причиною («потрібно Харизма 13, у вас 12»).

**Є:** Клас просто зникає зі списку; гравець не знає, чого саме бракує.

**Доказ:** `src/lib/components/levelUp/LevelUpWizard.tsx:2063` — «Показано лише класи, для яких виконані вимоги мультикласу»; `:2095` — «Немає доступних класів для мультикласу (перевірте вимоги 13+)». Порівняй із правильним патерном для рис: `src/lib/components/characterCreator/FeatPicker.tsx:87-89` рендерить `prerequisite.reason` під недоступною опцією, і `ClassChoiceOptionGroups.tsx:148-150` — так само.

**Куди дивитись:** Показувати всі класи, а недоступним підставляти текст причини з тієї самої функції передумови, яку вже кличе форма (LevelUpWizard.tsx:680).

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`


## Друк (13)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P1 | 2024 | bug | `L15-print-01` | Обрана майстерність зброї (2024) не потрапляє в PDF узагалі — друкується лише назва риси, а не обрані види зброї | src/server/pdf/generateCharacterPdf.ts, src/server/pdf/featuresPdf.ts |
| · | P1 | both | bug | `L15-print-02` | На листі заклинань не заповнюється жоден із 92 чекбоксів «підготовлено», хоча шаблон їх має і PersSpell.isPrepared існує | src/server/pdf/generateCharacterPdf.ts, public/CharacterSpells_fixed.pdf |
| · | P2 | both | bug | `L15-print-03` | Гроші (мідь/срібло/електрум/золото/платина) не друкуються, хоча поля CP/SP/EP/GP/PP у шаблоні є, а заповнення просто закоментоване | src/server/pdf/generateCharacterPdf.ts |
| · | P2 | both | bug | `L15-print-04` | Передісторія і нотатки персонажа не потрапляють у друк узагалі: код пише в поля, яких у шаблоні немає, а бланк подробиць порожній | src/server/pdf/generateCharacterPdf.ts, src/server/pdf/overlayLayout.ts |
| · | P2 | both | bug | `L15-print-05` | Лист заклинань мовчки обрізає списки: 8 замовлянь, 12 заклинань 1-го рівня, 13 на 2–4, 9 на 5–7, 7 на 8–9 — решта зникає без ознаки | src/server/pdf/generateCharacterPdf.ts |
| · | P2 | both | bug | `L15-print-06` | Слоти Магії пакту зливаються зі звичайними в один рядок «4 + 2» без підпису, хоча відновлюються коротким відпочинком | src/server/pdf/generateCharacterPdf.ts |
| · | P2 | both | bug | `L15-print-07` | Поле «Раса» друкує тільки вид без роду/підвиду (Ельф замість Ельф (Дроу)), а підпис лишається 2014-ним («Раса», не «Вид») | src/server/pdf/generateCharacterPdf.ts, public/CharacterSheet_fixed.pdf |
| · | P2 | 2024 | data | `L15-print-09` | Для 2024 усі 547 рис мають display_type={PASSIVE} і майже жодна не має uses_count — друкована сторінка «Здібності» втрачає Дії/Бонусні дії/Реакції та лічильники застосувань | data/2024/normalized/classes.json, data/2024/normalized/subclasses.json |
| · | P2 | both | bug | `L15-print-10` | Збій будь-якої необов'язкової секції гаситься log.warn — користувач отримує неповний PDF без жодної помилки | src/server/pdf/generateCharacterPdf.ts, src/lib/components/characterSheet/PrintCharacterDialog.tsx |
| · | P2 | both | bug | `L15-print-11` | У блоці атак лише три рядки зброї; четверта і далі різна зброя зникає без переносу в спорядження | src/server/pdf/generateCharacterPdf.ts, src/server/pdf/equipmentPrint.ts |
| · | P3 | both | bug | `L15-print-08` | Джерело заклинання друкується сирим enum (PHB_2024, XGTE), хоча український словник джерел уже існує | src/server/pdf/spellsPdf.ts, src/lib/refs/translation.ts |
| · | P3 | both | bug | `L15-print-12` | Маркери {{English}} (Р20) не знімаються на першій сторінці PDF: назви рис, спорядження, володіння друкуються без проєкції | src/server/pdf/generateCharacterPdf.ts, src/server/pdf/printProjection.ts |
| · | P3 | 2024 | accepted | `L15-print-13` | Бастіон не входить у друк чарника — підтверджено як прийняте рішення власника, не дефект | src/server/pdf/types.ts, docs/o28-print-bestiary-character/README.md |

### L15-print-01 — Обрана майстерність зброї (2024) не потрапляє в PDF узагалі — друкується лише назва риси, а не обрані види зброї

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Weapon Mastery: гравець обирає конкретні види зброї, чия властивість (Topple, Vex, Sap…) діє в бою; це збережений вибір, а не похідна

**Має бути:** Друкований чарник несе перелік обраних майстерностей зброї, як WeaponMasteryCard на листі

**Є:** У PDF немає жодного сліду обраних видів зброї; за столом гравець не бачить своїх майстерностей

**Доказ:** `grep -rn "mastery\|Mastery" src/server/pdf/` не дає жодного збігу. У spells_test персонаж mc12 (pers_id 7, «Ельф (Дроу), Паладин 5 / Чародій 3») має два рядки pers_weapon_mastery: LONGSWORD і JAVELIN. Дамп усіх заповнених полів згенерованого PDF (scratchpad/audit/work/L15-print/mc12.json) не містить ні LONGSWORD, ні JAVELIN — лише назву класової риси «· Майстерність зброї» у полі «Features and Traits». Лист має для цього окремий блок src/lib/components/characterSheet/WeaponMasteryCard.tsx.

**Відтворення:** 1) Зібрати фікстуру tests/fixtures/2024-multiclass/12-drow-paladin5-sorcerer3.json через build2024MulticlassCharacter; 2) викликати generateCharacterPdfFromData з усіма секціями; 3) прочитати поля PDF через pdf-lib — жодне не містить обраної зброї, хоча pers_weapon_mastery має 2 рядки

**Куди дивитись:** Додати рядок у buildArmorAndShieldText/AttacksSpellcasting (поле 166×114 pt має запас) або окремий блок у featuresPdf.ts; джерело даних — src/server/db/weapon-mastery.ts / таблиця pers_weapon_mastery

**Файли:** `src/server/pdf/generateCharacterPdf.ts`, `src/server/pdf/featuresPdf.ts`, `src/server/db/weapon-mastery.ts`


### L15-print-02 — На листі заклинань не заповнюється жоден із 92 чекбоксів «підготовлено», хоча шаблон їх має і PersSpell.isPrepared існує

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Prepared Spells: клірик/друїд/чарівник/паладин щодня обирають підготовлений набір; це вибір гравця

**Має бути:** Надрукований лист заклинань позначає підготовлені заклинання так само, як екранний лист

**Є:** Усі 92 чекбокси порожні; підготовлений набір губиться в друці

**Доказ:** public/CharacterSpells_fixed.pdf має 214 полів: 122 текстових і 92 чекбокси (Check Box 3031…) — по одному біля кожного рядка заклинання. fillSpellSheet (src/server/pdf/generateCharacterPdf.ts:780–870) заповнює лише текстові поля (Spells 10xx, SlotsTotal xx) і жодного разу не викликає setCheckIfPresent. Лист розрізняє стан: src/lib/components/characterSheet/slides/MagicSlide.tsx:319 фільтрує за ps.isPrepared.

**Відтворення:** Згенерувати PDF будь-якого персонажа з секцією SPELL_SHEET і відкрити CharacterSpells-сторінку — колонка «підготовлено» порожня незалежно від pers_spell.is_prepared

**Куди дивитись:** У fillSpellSheet зіставити індекс поля levelNamesMap[level][i] з відповідним «Check Box …» і викликати setCheckIfPresent(form, name, ps.isPrepared)

**Файли:** `src/server/pdf/generateCharacterPdf.ts`, `public/CharacterSpells_fixed.pdf`


### L15-print-03 — Гроші (мідь/срібло/електрум/золото/платина) не друкуються, хоча поля CP/SP/EP/GP/PP у шаблоні є, а заповнення просто закоментоване

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a — паритет із зрілим білдером (D&D Beyond, Roll20 друкують валюту)

**Має бути:** Поточні гроші персонажа друкуються в клітинках монет

**Є:** Клітинки монет завжди порожні

**Доказ:** Перелік полів public/CharacterSheet_fixed.pdf (106 полів) містить CP, SP, EP, GP, PP. У src/server/pdf/generateCharacterPdf.ts:1114–1120 стоїть блок «// Don't print coins» із закоментованими setTextForFirstPresent для всіх п'яти. У виміряних персонажів дані є: mc12/mc16 gp="22", c2014-warlock gp="5".

**Відтворення:** Згенерувати PDF будь-якого персонажа з секцією CHARACTER, прочитати поля через pdf-lib — CP/SP/EP/GP/PP відсутні серед заповнених

**Куди дивитись:** Розкоментувати рядки 1114–1120; один файл

**Файли:** `src/server/pdf/generateCharacterPdf.ts`


### L15-print-04 — Передісторія і нотатки персонажа не потрапляють у друк узагалі: код пише в поля, яких у шаблоні немає, а бланк подробиць порожній

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Має бути:** Передісторія й нотатки друкуються (окремим блоком або в бланку подробиць)

**Є:** Тихо зникають: жодного попередження, жодного логу

**Доказ:** generateCharacterPdf.ts:1092–1093 викликає setMultilineTextIfPresent(form, "Backstory", …) і (…, "Notes", …). Повний перелік полів public/CharacterSheet_fixed.pdf не містить ні «Backstory», ні «Notes» (є лише PersonalityTraits , Ideals, Bonds, Flaws), а setMultilineTextIfPresent мовчки виходить, якщо поля немає. Секція DETAILS теж не рятує: public/CharacterDetails.pdf має 0 полів форми (перевірено pdf-lib). Дані існують: prisma/schema.prisma:595–596 — backstory та notes на моделі Pers.

**Відтворення:** Задати персонажу backstory/notes, згенерувати PDF з секціями CHARACTER+DETAILS — тексту немає на жодній сторінці

**Куди дивитись:** Створити поля оверлеєм (механізм overlayLayout.ts + createFieldsFromOverlay уже є) або друкувати їх окремою HTML-секцією

**Файли:** `src/server/pdf/generateCharacterPdf.ts`, `src/server/pdf/overlayLayout.ts`, `public/CharacterDetails.pdf`


### L15-print-05 — Лист заклинань мовчки обрізає списки: 8 замовлянь, 12 заклинань 1-го рівня, 13 на 2–4, 9 на 5–7, 7 на 8–9 — решта зникає без ознаки

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Wizard: «Free Spells» плюс два заклинання за рівень, тобто понад 12 заклинань 1-го рівня досяжно вже на низьких рівнях

**Має бути:** Друга сторінка листа заклинань або хоча б помітка «…ще N»

**Є:** Заклинання понад місткість шаблона зникають без жодної позначки

**Доказ:** src/server/pdf/generateCharacterPdf.ts:806–826 — фіксовані масиви імен полів (cantripNames: 8; levelNamesMap[1]: 12; [2..4]: 13; [5..7]: 9; [8..9]: 7), а цикл levelSpells.forEach((ps, i) => { if (i < names.length) … }) просто не пише решту.

**Відтворення:** Додати персонажу 15 заклинань 1-го рівня, згенерувати PDF з SPELL_SHEET — у таблиці буде рівно 12

**Куди дивитись:** Або друкувати другу копію сторінки листа заклинань, коли рівень переповнений, або писати в останнє поле «…ще N»

**Файли:** `src/server/pdf/generateCharacterPdf.ts`


### L15-print-06 — Слоти Магії пакту зливаються зі звичайними в один рядок «4 + 2» без підпису, хоча відновлюються коротким відпочинком

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Warlock → Pact Magic: слоти відновлюються на короткому відпочинку (у 2014 те саме, PHB 2014 Warlock)

**Має бути:** Слоти пакту позначені окремо (підпис/окремий рядок), як на листі

**Є:** Неподільна сума; за столом не видно, що частина слотів повертається на короткому відпочинку

**Доказ:** src/server/pdf/generateCharacterPdf.ts:773–778 — formatSpellSlots(standard, pact) повертає `${standard} + ${pact}`, і це йде в поле SlotsTotal N. Лист тримає їх окремо: MagicSlide.tsx:307–316 обчислює pactInfo незалежно від maxSlots і малює окремий блок. Виміряно на mc16 (Чорнокнижник 5 / Бард 3).

**Відтворення:** Згенерувати PDF мультикласового чорнокнижника (фікстура 16) з секцією SPELL_SHEET

**Куди дивитись:** Друкувати пактові слоти окремо (напр. «4 | пакт 2») або окремим рядком у полі листа заклинань

**Файли:** `src/server/pdf/generateCharacterPdf.ts`


### L15-print-07 — Поле «Раса» друкує тільки вид без роду/підвиду (Ельф замість Ельф (Дроу)), а підпис лишається 2014-ним («Раса», не «Вид»)

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md — у 2024 це Species (Вид), а Дроу/Пекельний — Lineage у межах виду

**Має бути:** «Ельф (Дроу)» / «Тифлінг (Пекельний)»; для RULES_2024 підпис «Вид»

**Є:** Рід губиться; підпис на аркуші 2024-персонажа каже «Раса»

**Доказ:** src/server/pdf/generateCharacterPdf.ts:1035–1038: case "Race": value = translateRaceName(pers.race?.name) — pers.subrace і pers.raceVariants не читаються взагалі. Дамп полів: mc12 → Race  = 'Ельф' (персонаж «Ельф (Дроу)»), mc16 → Race  = 'Тифлінг' (персонаж «Тифлінг (Пекельний)»). Шаблон CharacterSheet_fixed.pdf має лише одне поле «Race » і один статичний підпис на обидві редакції.

**Відтворення:** Згенерувати PDF будь-якого персонажа з підвидом і прочитати поле «Race » через pdf-lib

**Куди дивитись:** У fillFirstPageUsingExistingFields склеювати race + subrace/raceVariant; для підпису — або оверлей поверх шаблона, або окремий шаблон для 2024

**Файли:** `src/server/pdf/generateCharacterPdf.ts`, `public/CharacterSheet_fixed.pdf`


### L15-print-09 — Для 2024 усі 547 рис мають display_type={PASSIVE} і майже жодна не має uses_count — друкована сторінка «Здібності» втрачає Дії/Бонусні дії/Реакції та лічильники застосувань

**Статус:** 🔴 тип дії й лічильники несуть усі чотири носії — класи, підкласи, види й риси персонажа (2026-09-08); що саме показує друкована сторінка «Здібності», ще ніхто не перевіряв.

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — Channel Divinity, Lay on Hands, Bardic Inspiration тощо мають тип дії та обмежену кількість застосувань за відпочинок

**Має бути:** Друкована сторінка «Здібності» 2024-персонажа має секції «Дії», «Бонусні дії», «Реакції» і лічильники [x/y кор. відп.], як у 2014

**Є:** Лише «Пасивні здібності», жодного лічильника — сторінка нечитна як бойова шпаргалка

**Доказ:** Запит до spells_test: `select ruleset, display_type, count(*) from feature group by 1,2` → RULES_2024 має єдиний рядок {PASSIVE} = 547; RULES_2014 має {PASSIVE}, {ACTION}, {BONUSACTION}, {REACTION} і комбінації. `select ruleset, count(*) filter (where uses_count is not null) …` → RULES_2024: 3 із 547; RULES_2014: 172 із 1281 плюс 44 з uses_count_depends_on_proficiency_bonus. Наслідок виміряно на живих персонажах: mc12 — passive 29, actions 0, bonusActions 0, reactions 0, жодна риса без usesPer; mc16 — 25/0/0/0; 2014-чорнокнижник 1 рівня — passive 2, actions 1, «Присутність феї» uses=1. groupFeaturesByType (featuresPdf.ts:22–38) малює лише непорожні секції, formatUsageInfo (featuresPdf.ts:41) виходить, коли usesPer не число.

**Відтворення:** Зібрати будь-якого 2024-персонажа, викликати getCharacterFeaturesGrouped — actions/bonusActions/reactions завжди порожні

**Куди дивитись:** Заповнити display_type і uses_count/limited_uses_per у нормалізованих джерелах data/2024/normalized/*.json і перелити сідом (Р33 — правити файл-джерело, не базу)

**Файли:** `data/2024/normalized/classes.json`, `data/2024/normalized/subclasses.json`, `data/2024/normalized/species.json`, `src/server/pdf/featuresPdf.ts`


### L15-print-10 — Збій будь-якої необов'язкової секції гаситься log.warn — користувач отримує неповний PDF без жодної помилки

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Або помилка користувачу, або явна сторінка «секцію не вдалося сформувати»

**Є:** Мовчазна втрата обраних користувачем секцій — файл виглядає успішним

**Доказ:** src/server/pdf/generateCharacterPdf.ts:1407–1543 — кожна секція (DETAILS, SPELL_SHEET, FEATURES, SPELLS, MAGIC_ITEMS, WILDSHAPES) обгорнута в `catch (err) { log.warn("<секція>.failed", { err }); if (strictSections) throw err; }`, де strictSections = process.env.PDF_STRICT_SECTIONS === "1" і в проді не виставлений. Секції FEATURES/SPELLS/MAGIC_ITEMS/WILDSHAPES генеруються через puppeteer-core + локальний Chrome (src/server/pdf/pdfUtils.ts getBrowser); падіння браузера тихо викидає сторінки. PrintCharacterDialog.tsx показує toast лише на виняток самої дії.

**Відтворення:** Тимчасово зробити PUPPETEER_EXECUTABLE_PATH невалідним і згенерувати PDF з секціями FEATURES+SPELLS — PDF приїде лише з першою сторінкою, без помилки

**Куди дивитись:** Додати сторінку-заглушку з текстом помилки для секції, або повертати список невдалих секцій у результаті дії і показувати toast

**Файли:** `src/server/pdf/generateCharacterPdf.ts`, `src/lib/components/characterSheet/PrintCharacterDialog.tsx`


### L15-print-11 — У блоці атак лише три рядки зброї; четверта і далі різна зброя зникає без переносу в спорядження

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Уся зброя персонажа видима в друці (додаткові рядки в AttacksSpellcasting або в спорядженні)

**Є:** З четвертої різної зброї починається мовчазна втрата

**Доказ:** src/server/pdf/generateCharacterPdf.ts:389–406 — fillWeapons має рівно три слоти (Wpn Name / Wpn Name 2 / Wpn Name 3) і `if (!weapon) continue;`. Після O28 однакова зброя групується з кількістю (groupPrintableWeaponAttacks у equipmentPrint.ts), але різна зброя понад три позиції не переноситься ні в поле Equipment, ні в AttacksSpellcasting. Заміряно шаблон: AttacksSpellcasting має 166×114 pt і зараз несе тільки «Атак за дію: N» плюс перелік обладунків.

**Відтворення:** Додати персонажу 4 різні зброї, згенерувати PDF, прочитати поля — заповнені лише три пари Wpn*

**Куди дивитись:** Після трьох слотів дописувати решту рядками в AttacksSpellcasting або в Equipment

**Файли:** `src/server/pdf/generateCharacterPdf.ts`, `src/server/pdf/equipmentPrint.ts`


### L15-print-08 — Джерело заклинання друкується сирим enum (PHB_2024, XGTE), хоча український словник джерел уже існує

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** «Книга Гравця (2024)»

**Є:** «PHB_2024» на українському друкованому описі заклинання

**Доказ:** src/server/pdf/spellsPdf.ts — `<div class="meta">${escapePrintHtml(String(s.source))}</div>`; loadPrintableSpells (src/server/db/print-content.ts) повертає String(spell.source). Значення в spells_test: PHB_2024 (391), PHB (360), XGTE (95), TCOE (22)… Український відповідник існує: src/lib/refs/translation.ts:936 sourceTranslations — PHB_2024: «Книга Гравця (2024)», XGTE: «Довідник Занатара про все».

**Відтворення:** Згенерувати PDF із секцією SPELLS і подивитися шапку будь-якої картки заклинання

**Куди дивитись:** У spellsPdf.ts застосувати sourceTranslations[s.source] ?? s.source

**Файли:** `src/server/pdf/spellsPdf.ts`, `src/lib/refs/translation.ts`


### L15-print-12 — Маркери {{English}} (Р20) не знімаються на першій сторінці PDF: назви рис, спорядження, володіння друкуються без проєкції

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** docs/DECISIONS.md Р20 — «назва риси чи дії несе маркер на першій згадці в записі»; визначення одне — src/lib/refs/glossary-marker.ts

**Має бути:** Перша сторінка PDF так само проходить preparePrintableMarkdown/stripGlossaryMarkers

**Є:** Зведена міна: перша ж партія назв за Р20 надрукує сирі {{…}} у полі «Features and Traits»

**Доказ:** `grep -rn "stripGlossaryMarkers\|preparePrintableMarkdown" src/` дає лише printProjection.ts (6, 8, 13), creaturesPdf.ts (9, 155) і seo-utils.ts — тобто HTML-секції. src/server/pdf/generateCharacterPdf.ts його не імпортує, тому buildFeaturesListText, buildEquipmentText, getProfAndLang і buildArmorAndShieldText виводять текст як є. Сьогодні витоку немає: у spells_test `feature.name like '%{{%'` → 0, `spell.name` → 0, `magic_item.name` → 0 (маркер лише в 1 описі риси, а описи проходять проєкцію).

**Відтворення:** Додати {{Radiant}} у назву будь-якої риси в spells_test і згенерувати PDF — маркер з'явиться в полі «Features and Traits» дослівно

**Куди дивитись:** Пропустити всі текстові збірники першої сторінки через preparePrintableMarkdown (він уже чистий і не тягне remark)

**Файли:** `src/server/pdf/generateCharacterPdf.ts`, `src/server/pdf/printProjection.ts`, `src/lib/refs/glossary-marker.ts`


### L15-print-13 — Бастіон не входить у друк чарника — підтверджено як прийняте рішення власника, не дефект

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** accepted · **Праці:** M · **Вердикт:** не перевірено

**Правило:** docs/o28-print-bestiary-character/README.md:19–20 — «не додаємо друк класів, рас, походжень, рис, вливань, викликів, зброї, обладунків, правил, пасток, об'єктів чи бастіонів як окремих каталогів»

**Має бути:** n/a — за рішенням O28 бастіон у друці не потрібен

**Є:** Бастіону в PDF немає; це відповідає рішенню

**Доказ:** src/server/pdf/types.ts:5 — PrintSection = CHARACTER | FEATURES | SPELLS | SPELL_SHEET | MAGIC_ITEMS | WILDSHAPES | DETAILS; секції бастіону немає, і жоден шлях друку не читає PersBastion*. Діалог PrintCharacterDialog.tsx не пропонує такої галочки.

**Відтворення:** Відкрити діалог «Друк у PDF» у персонажа з бастіоном — галочки бастіону немає

**Куди дивитись:** Нічого не міняти. Якщо власник передумає — бастіон найдешевше додати як ще одну HTML-секцію поряд із MAGIC_ITEMS

**Файли:** `src/server/pdf/types.ts`, `docs/o28-print-bestiary-character/README.md`


## Налаштовність листа (20)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P1 | both | bug | `L10-sheet-config-01` | Риса, додана з листа персонажа, не застосовує жодного свого надання (ASI, навички, мови, інструменти) і не питає внутрішніх виборів | src/lib/components/characterSheet/FeatsSheetManagerModal.tsx, src/lib/actions/feat-actions.ts |
| · | P1 | 2024 | bug | `L10-sheet-config-02` | На листі персонажа 2024 каталог зброї й обладунку жорстко фільтрується по RULES_2014, тож додана зброя ніколи не може мати майстерності | src/server/db/equipment-actions.ts, src/lib/components/characterSheet/AddWeaponDialog.tsx |
| · | P1 | both | bug | `L10-sheet-config-03` | Швидкість на листі й у друці завжди 30 + ручний бонус — видова швидкість із race.speed ігнорується | src/lib/logic/bonus-calculator.ts, src/lib/components/characterSheet/ModifyStatModal.tsx |
| ✓ | P1 | both | bug | `L10-sheet-config-14` | Будь-яка додана на листі зброя одразу позначається як «з володінням», хоча персонаж може нею не володіти | src/lib/components/characterSheet/AddWeaponDialog.tsx, src/server/db/equipment-actions.ts |
| · | P2 | both | missing-system | `L09-sheet-derived-09` | Лист не веде станів, виснаження й концентрації — ні стовпців у pers, ні UI | prisma/schema.prisma, src/lib/components/characterSheet/slides/MainStatsSlide.tsx |
| · | P2 | 2024 | bug | `L10-sheet-config-04` | Магічні предмети 2024 недосяжні з листа: діалог додавання завжди відкриває каталог 2014 | src/lib/components/characterSheet/AddMagicItemDialog.tsx, src/app/magic-items/page.tsx |
| ✓ | P2 | both | missing-system | `L10-sheet-config-05` | Ліміт налаштування на три магічні предмети не рахується і не показується — можна налаштуватися на будь-яку кількість | src/lib/components/characterSheet/slides/CombatSlide.tsx, src/lib/actions/magic-item-actions.ts |
| ✓ | P2 | both | missing-system | `L10-sheet-config-06` | Зарядів магічних предметів немає взагалі — ні стовпця, ні лічильника, ні відновлення на світанку | prisma/schema.prisma, src/server/db/magic-items.ts |
| · | P2 | both | missing-system | `L10-sheet-config-07` | Ваги предметів і навантаження немає: спорядження — вільний текст, тож ні суми ваги, ні порогів обтяження | src/lib/components/characterSheet/slides/MainStatsSlide.tsx, src/server/db/character-creation.ts |
| ✓ | P2 | both | missing-system | `L10-sheet-config-08` | Станів і виснаження на листі немає — трекера немає, а виснаження 2024 міняє всі числа листа | prisma/schema.prisma, src/lib/logic/bonus-calculator.ts |
| ✓ | P2 | both | missing-system | `L10-sheet-config-09` | Натхнення (Heroic Inspiration) не відстежується — поля й перемикача немає | prisma/schema.prisma, src/lib/components/characterSheet/slides/MainStatsSlide.tsx |
| · | P2 | both | missing-system | `L10-sheet-config-10` | Рівень не можна знизити, підклас не можна змінити, респеку немає — помилка виправляється лише перестворенням персонажа | src/lib/actions/snapshot-actions.ts, src/server/db/snapshots.ts |
| ✓ | P2 | both | missing-system | `L10-sheet-config-11` | Своєї фічі з текстом і ресурсом додати не можна: стовпець pers.custom_features мертвий, власний пул ресурсу створити нічим | prisma/schema.prisma, src/lib/components/characterSheet/slides/FeaturesSlide.tsx |
| ✓ | P2 | both | missing-system | `L10-sheet-config-12` | Володіння і мови зберігаються одним текстовим блоком, а не даними — окреме володіння ні додати, ні зняти механічно | src/server/db/character-creation.ts, src/lib/components/characterSheet/slides/MainStatsSlide.tsx |
| ✓ | P2 | both | missing-system | `L10-sheet-config-13` | Портрета й полів зовнішності немає — персонажі в списку не відрізняються нічим, крім тексту | prisma/schema.prisma, src/lib/components/characterSheet/slides/MainStatsSlide.tsx |
| · | P2 | both | missing-system | `L19-parity-competitors-03` | На листі немає станів і Виснаження — персонаж завжди рахується як здоровий | prisma/schema.prisma, src/lib/components/characterSheet/slides/MainStatsSlide.tsx |
| ✓ | P2 | both | missing-system | `L19-parity-competitors-04` | Натхнення (Heroic Inspiration) не існує ніде в продукті | prisma/schema.prisma, src/lib/components/characterSheet/slides/MainStatsSlide.tsx |
| ✓ | P2 | both | missing-system | `L19-parity-competitors-06` | Інвентар — один текстовий рядок; ваги немає в схемі взагалі, тож ні кількостей, ні контейнерів, ні навантаження | prisma/schema.prisma, src/server/db/character-creation.ts |
| · | P2 | both | bug | `L19-parity-competitors-07` | Ліміт «не більше трьох налаштованих предметів» не перевіряється — можна налаштуватися на скільки завгодно | src/lib/components/characterSheet/slides/CombatSlide.tsx, src/server/db/magic-items.ts |
| · | P3 | both | bug | `L10-sheet-config-15` | Поля налаштування, що є в базі, але яких немає в UI: тип шкоди й дальність зброї, PersSkill.customModifier | src/lib/components/characterSheet/WeaponCustomizeModal.tsx, src/server/db/equipment-actions.ts |

### L10-sheet-config-01 — Риса, додана з листа персонажа, не застосовує жодного свого надання (ASI, навички, мови, інструменти) і не питає внутрішніх виборів

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/feats.md — Skilled: «You gain proficiency in any combination of three skills or tools of your choice»; Resilient: «Increase the chosen ability score by 1… You gain proficiency in saving throws using the chosen ability»

**Має бути:** Додавання риси на листі має або відкривати той самий крок виборів, що і майстер рівня (FeatChoiceOptionsForm), і застосовувати grantedASI/grantedSkills/grantedLanguages/grantedToolProficiencies, або хоча б дозволяти зробити ці вибори після додавання.

**Є:** Риса лягає рядком pers_feat без жодного вибору й без жодного механічного ефекту: «Умілець» не дає володінь, «Стійкий» не дає +1 і ряткидка, риса 2024 з grantedASI не рухає характеристику. Виправити на листі неможливо — діалогу виборів риси на листі не існує.

**Доказ:** src/lib/components/characterSheet/FeatsSheetManagerModal.tsx:75 — `const res = await addFeatToPers({ persId, featId: feat.featId });` (choiceOptionIds не передається ніколи). src/server/db/feat-actions.ts:56-84 — addPersFeat пише лише рядок pers_feat. Надання риси застосовуються ЛИШЕ у src/server/db/character-creation.ts:118,218,465 і src/server/db/levelup-persistence.ts:288-411; src/lib/logic/bonus-calculator.ts:192 читає з риси тільки feat.grantsFeature.

**Відтворення:** Лист персонажа → слайд «Фічі» → «Керування рисами персонажа» → «+ Додати рису» → «Умілець» → `select * from pers_feat_choice where pers_feat_id=<новий>` порожньо, pers_skill не змінилась.

**Куди дивитись:** Винести застосування надань риси з levelup-persistence.ts у чисту функцію src/rules/feat-grants.ts; FeatsSheetManagerModal перед викликом addFeatToPers має проганяти FeatChoiceOptionsForm і передавати choiceOptionIds.

**Файли:** `src/lib/components/characterSheet/FeatsSheetManagerModal.tsx`, `src/lib/actions/feat-actions.ts`, `src/server/db/feat-actions.ts`, `src/server/db/levelup-persistence.ts`, `src/lib/logic/bonus-calculator.ts`

**Скептик:** ПІДТВЕРДЖУЮ (з двома уточненнями формулювання автора).

1) ПРАВИЛО. `data/2024/srd/feats.md:51-57` — Skilled (Origin): «You gain proficiency in any combination of three skills or tools of your choice», Repeatable. Resilient у SRD 5.2.1 немає, але є в `data/2024/normalized/feats.json` (PHB_2024, GENERAL, prerequisite «4+ рівень»): «Increase the chosen ability score by 1» + «You gain saving throw proficiency with the chosen ability». Обидві риси існують і в 2014 (feat_id 36/30), тож edition=both коректно.

2) КОД. Ланцюг однозначний і єдиний: `FeatsSheetManagerModal.tsx:78` (не :75, як у звіті) — `addFeatToPers({persId, featId: feat.featId})` без `choiceOptionIds`; `src/lib/actions/feat-actions.ts:28-49` — тільки `assertOwnsPers` + `addPersFeat`; `src/server/db/feat-actions.ts:56-84` — `findFirst`-або-`create` рядка `pers_feat`. Grep по всьому `src/`: `grantedASI/grantedSkills/grantedLanguages/granted*Proficiencies` застосовуються лише в `character-creation.ts` і `levelup-persistence.ts:288-430` (там вони МАТЕРІАЛІЗУЮТЬСЯ у `pers.str…cha`, `pers_skill`, `additional_save_proficiencies`), тобто похідно на листі не рахуються: у `bonus-calculator.ts` слово «asi» не трапляється жодного разу, з риси читається лише `grantsFeature` (рядок 192-193). `useCharacterStats.ts:139` справді читає `grantedASI` — але цей хук імпортує ТІЛЬКИ `characterCreator/NameForm.tsx`, лист його не використовує, тож «обробляється в іншому місці» — ні. `FeatChoiceOptionsForm` імпортують лише `MultiStepForm.tsx` і `LevelUpASIForm/LevelUpWizard` — діалогу виборів на листі справді не існує.

3) РІШЕННЯ ВЛАСНИКА. Не покрито. «Прийнято» в KNOWN-BUGS (2026-08-13) стосується лише того, що СЕРВЕР довіряє UI у валідації (BUG-001..003); тут не гейт, а втрачена механіка й неможливість зробити вибір узагалі. Р37 навпаки посилює знахідку: «вибори двох Skilled дають шість володінь, не три» — вибори мусять лягати в `pers_feat_choice`. KR10.3 (O10) закритий як «перегляд та додавання» — надання туди ніколи й не входили, але це опис обсягу, а не рішення «так і має бути».

4) IN-FLIGHT. Ні: `feat-actions.ts`, `FeatsSheetManagerModal.tsx`, `levelup-persistence.ts`, `bonus-calculator.ts` не входять у список файлів паралельної сесії (KR27.7/KR30.3).

5) ВІДКРИТИЙ KR. Немає жодного — у `docs/` нема ні `feat-grants`, ні планів винести надання риси в чисту функцію.

6) СЕРЙОЗНІСТЬ. P1 за шкалою: після додавання Resilient персонаж не має ні +1, ні володіння ряткидком (числа не за книгою), а вибір «які три володіння дає Умілець» гравець не може зробити взагалі — його ніде не питають і ніде не зберігають.

ДВІ ПОПРАВКИ ДО ЗВІТУ (не міняють вердикту): (а) `granted_skills` порожній у ВСІХ 167 рис обох редакцій — володіння Умільця живуть у `feat_choice_option` (18 опцій у групі «Володіння» для feat_id 3048), тож механізм втрати — саме нехтування `choiceOptionIds`, а не `grantedSkills`; (б) «без жодного механічного надання» трохи абсолютне: `bonus-calculator` таки підхоплює `feat.grantsFeature` (у базі це 20 рис, усі 2024; для 2014 — рівно 0), а `CombatSlide.tsx:239` виводить володіння щитом із `feat.grantedArmorProficiencies`. Тобто для 2014 риса з листа справді порожня, для 2024 — працює лише фіча-текст.


### L10-sheet-config-02 — На листі персонажа 2024 каталог зброї й обладунку жорстко фільтрується по RULES_2014, тож додана зброя ніколи не може мати майстерності

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/equipment.md — розділ Mastery Property: кожна зброя 2024 несе властивість майстерності (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)

**Має бути:** getBaseEquipment має брати ruleset із pers.ruleset; персонаж 2024 має бачити 38 записів зброї 2024 і 16 обладунків 2024, а додана ним зброя — нести mastery.

**Є:** Персонаж 2024 бачить лише 48 записів 2014 з mastery=null. Значок майстерності на доданій зброї не зʼявиться ніколи, бо weapon_id рядка 2014 не збігається з weapon_id, під яким записано вибір майстерності. Кастомна зброя падає у фолбек `weaponId || 1` (equipment-actions.ts:63) — це CLUB редакції 2014.

**Доказ:** src/server/db/equipment-actions.ts:9-10 `const ACTIVE_RULESET: Ruleset = "RULES_2014";` і :375-386 `prisma.weapon.findMany({ where: { ruleset: ACTIVE_RULESET } })`, те саме для armor. Браузер :3100, персонаж ruleset=RULES_2024, кнопка «Додати зброю» показала «Дубинка, Кинджал, Велика дубинка, Ручна сокира, Метальний спис, Легкий молот, Булава, Палиця, Серп, Спис, Беззбройний удар» (shots/L10-2-add-weapon.png). Запит до spells_test: `select ruleset, count(*) filter (where mastery is not null) as with_mastery, count(*) from weapon group by 1` → RULES_2024: 38/38 з майстерністю; RULES_2014: 0/48. WeaponsCard.tsx:70-72 звіряє майстерність по weaponId, pers_weapon_mastery.weapon_id — FK на weapon.

**Відтворення:** Створити персонажа 2024 → лист → слайд «Спорядження» → «Додати зброю»; список — 2014. Порівняти з `select name, ruleset, mastery from weapon where ruleset='RULES_2024'`.

**Куди дивитись:** getBaseEquipment(ruleset: Ruleset) замість константи ACTIVE_RULESET; AddWeaponDialog/AddArmorDialog передають pers.ruleset; фолбек кастомної зброї — HOMEBREW-рядок відповідної редакції, як уже зроблено для обладунку в equipment-actions.ts:186-198.

**Файли:** `src/server/db/equipment-actions.ts`, `src/lib/components/characterSheet/AddWeaponDialog.tsx`, `src/lib/components/characterSheet/AddArmorDialog.tsx`, `src/lib/components/characterSheet/WeaponsCard.tsx`


### L10-sheet-config-03 — Швидкість на листі й у друці завжди 30 + ручний бонус — видова швидкість із race.speed ігнорується

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:257 — Goliath: «**Speed:** 35 feet»

**Має бути:** Плитка «ШВИДКІСТЬ» має показувати race.speed (35 для Голіафа 2024, 25 для дварфа 2014) плюс бонуси; модалка має показувати цю ж базу.

**Є:** Показує 30 для всіх видів. Полагодити можна лише вписавши ручний бонус +5/−5, після чого лист бреше про джерело числа. Той самий 30 потрапляє у PDF.

**Доказ:** src/lib/logic/bonus-calculator.ts:394-397 — `/** Calculate final speed (base 30 + bonuses) */ export function calculateFinalSpeed(pers) { // TODO: Get from race when race has speed field\n  return 30 + getSimpleBonus(pers, "speed"); }`. Стовпець існує: `race.speed` (а також burrow/flight/swim/climb). Запит до spells_test: GOLIATH_2024=35, HALFLING_2014/GNOME_2014/DWARF_2014/GRUNG_OGA=25, LEONIN/DHAMPIR/SATYR=35, CENTAUR_MPMM=40. Ту саму функцію використовує PDF: src/server/pdf/generateCharacterPdf.ts:1065,1205. Модалка налаштування показує ту саму фіктивну базу: ModifyStatModal.tsx:233 `case "speed": baseValue = 30; break;`.

**Відтворення:** Персонаж 2024 з видом Голіаф (race.speed=35) → лист → плитка «ШВИДКІСТЬ» = 30. (Браузерне підтвердження зняти не встиг: паралельний прогін зробив TRUNCATE посеред перевірки; доказ — код + запит до бази + SRD.)

**Куди дивитись:** calculateFinalSpeed(pers) = (pers.race?.speed ?? 30) + getSimpleBonus(pers,'speed'); ModifyStatModal:233 — та сама база; окремо показати burrow/flight/swim/climb, для чого в src/rules/ уже є creature-speed.ts.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `src/lib/components/characterSheet/ModifyStatModal.tsx`, `src/server/pdf/generateCharacterPdf.ts`


### L10-sheet-config-14 — Будь-яка додана на листі зброя одразу позначається як «з володінням», хоча персонаж може нею не володіти

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/character-creation.ts n/a — правило володіння: бонус майстерності додається до кидка атаки лише зброєю, якою персонаж володіє (data/2024/srd/playing-the-game.md, «Proficiency Bonus»)

**Має бути:** Володіння має виводитися з class.weaponProficiencies / race.weaponProficiencies за weapon.weaponType (ці дані структурні), або принаймні не бути мовчазним true.

**Є:** Чарівник, який додав дворучний меч, отримує +бонус майстерності до атаки, поки сам не зніме галочку у WeaponCustomizeModal.

**Доказ:** src/lib/components/characterSheet/AddWeaponDialog.tsx:54-60 `addWeapon(persId, weapon.weaponId, { …, isProficient: true })` і :72-78 те саме для кастомної зброї. Сервер закріплює дефолт: src/server/db/equipment-actions.ts:73 `isProficient: customData.isProficient ?? true`.

**Відтворення:** Створити персонажа-чарівника → лист → «Спорядження» → «Додати зброю» → «Дворучний меч» → відкрити налаштування зброї: «Володіння» увімкнено, бонус атаки містить бонус майстерності.

**Куди дивитись:** У addWeapon виводити isProficient із структурних володінь класу/виду за weaponType, а не з константи true.

**Файли:** `src/lib/components/characterSheet/AddWeaponDialog.tsx`, `src/server/db/equipment-actions.ts`, `src/lib/components/characterSheet/WeaponCustomizeModal.tsx`

**Скептик:** Спростувати не вдалося — знахідка підтверджується, ще й ширша, ніж описав автор.

(1) ПРАВИЛО — так, і саме таке. `data/2024/srd/playing-the-game.md:375` «You add your Proficiency Bonus to your attack roll when you attack using a weapon you have proficiency with»; там же :606 «If you have proficiency with a weapon, you add your Proficiency Bonus to attack rolls you make with it»; `data/2024/srd/equipment.md:62` «Anyone can wield a weapon, but you must have proficiency with it to add your Proficiency Bonus to an attack roll». Автор дав `rule_source` без рядка — тепер закріплено. Для 2014 SRD у репо цього абзацу немає (`data/2014/srd/` розкладено по теках 01_Races…09_Magic_Items, збігу немає), але правило тотожне й механіка коду спільна, тож `edition: both` лишається чинним — просто оракул на нього є лише 2024.

(2) КОД — доказ автора правильний, але **неповний**: він показав лише, що прапорець ставиться, і не показав, що прапорець щось міняє. Показую: `src/lib/logic/bonus-calculator.ts:513` — `const pb = pw.isProficient ? calculateFinalProficiency(pers) : 0;` у `calculateWeaponAttackBonus`. Тобто число атаки на листі справді завищується. Ту саму функцію кличе друк — `src/server/pdf/generateCharacterPdf.ts:382`, отже в PDF те саме. Іншого місця, де `PersWeapon.isProficient` виводився б із персонажа, немає: повний `grep isProficient src/` дає лише запис (`equipment-actions.ts:77`), редагування (`:123`, `WeaponCustomizeModal`), копію/знімок/шеринг і читання в :513. `class.weaponProficiencies` у `src/` читають тільки конструктор, підвищення рівня й майстерність зброї — жодного разу для `PersWeapon`.

(3) РІШЕННЯ ВЛАСНИКА — немає. У `docs/DECISIONS.md` і `docs/KNOWN-BUGS.md` збігів на `isProficient`/`is_proficient` нуль; «Поза межами» в O18 і O27 цього не згадують (там бастіони, стартове спорядження, гейт `isRules2024Allowed`, Артифіцер). Прийнятою поведінкою не є.

(4) IN-FLIGHT — ні. `AddWeaponDialog.tsx`, `equipment-actions.ts`, `bonus-calculator.ts` не в списку паралельної сесії (там `AddSpellDialog.tsx`, `SpellInfoModal.tsx`, `spell-actions.ts`, `pers-actions.ts`, `spell-preparation-2024`…).

(5) ВЖЕ ВІДКРИТО — ні. `grep -ril "isProficient|is_proficient" docs/` — порожньо, жодного KR.

(6) СЕРЙОЗНІСТЬ — **піднімаю з P2 до P1**. Шкала в CONTEXT називає P1 як «персонаж порахований не за книгою (числа, відсутня риса/вибір/слот/**володіння**)» — це буквально цей випадок: чарівник із дворучним мечем має +2…+6 до атаки, яких книга не дає, і це число їде в лист і в PDF. Формулювання P2 («немає можливості, яку має зрілий білдер, або не можна налаштувати без перестворення») тут не підходить: можливість є, галочка у `WeaponCustomizeModal` працює. Помʼякшення, яке варто занести: помилка не мовчазна остаточно — стан видно й виправляється одним кліком у тій самій модалці, тож це хибний дефолт, а не втрачений вибір. Якщо власник читає P1 суворіше («не виправити з листа»), P2 теж захищається; але за буквою шкали це P1.

Класифікація `bug` — правильна: дані є, DDL не потрібен, це логіка.


### L09-sheet-derived-09 — Лист не веде станів, виснаження й концентрації — ні стовпців у pers, ні UI

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/rules-glossary.md §Exhaustion — кожен рівень виснаження дає −2 до всіх перевірок d20 і −5 футів швидкості (тобто це похідне число, а не нотатка); §Concentration — ряткидок Статури DC 10 або половина отриманої шкоди.

**Має бути:** Стани й виснаження впливають на похідні числа листа (−2 до перевірок, −5 швидкості), концентрація видима під час бою.

**Є:** Нічого з цього не існує ні в схемі, ні в UI.

**Доказ:** Повний перелік стовпців таблиці pers (information_schema): з бойового стану є лише temp_hp, death_save_failures, death_save_successes, currenthitdice, usedhitdice, is_dead — нічого про стани, виснаження чи концентрацію. У src/lib/components/characterSheet/ немає жодного входження «Виснаж», «Концентрац», «exhaust», «concentrat» (єдиний збіг — react-hooks/exhaustive-deps у CharacterSheet.tsx:87).

**Відтворення:** Відкрити лист → немає жодного місця, де відзначити стан, виснаження чи концентрацію.

**Куди дивитись:** DDL (db/changes/) + UI; окрема ціль — виснаження мусить входити в calculateFinalSkill/Save/Speed.

**Файли:** `prisma/schema.prisma`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `src/lib/logic/bonus-calculator.ts`


### L10-sheet-config-04 — Магічні предмети 2024 недосяжні з листа: діалог додавання завжди відкриває каталог 2014

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Персонаж RULES_2024 має додавати предмети з каталогу 2024.

**Є:** Відкривається каталог 2014; 445 предметів 2024 з листа недосяжні.

**Доказ:** src/lib/components/characterSheet/AddMagicItemDialog.tsx:24-27,56 — `new URLSearchParams({ origin: "character", persId })` і `<iframe src={`/magic-items?${queryParams}`} />` без редакції. src/app/magic-items/page.tsx:20 `getAllMagicItems()`; src/lib/magicItemsData.ts:73 `getAllMagicItems = (ruleset: Ruleset = "RULES_2014")`. Браузер, персонаж 2024: MAGIC IFRAME SRC = /magic-items?origin=character&persId=56&persName=… (shots/L10-3-add-magic-item.png). У spells_test 445 предметів RULES_2024. Маршрут /2024/magic-items існує й передає getAllMagicItems("RULES_2024") (src/app/2024/magic-items/page.tsx:19).

**Відтворення:** Лист персонажа 2024 → слайд «Спорядження» → блок магічних предметів → «Додати» → перевірити src iframe у DevTools.

**Куди дивитись:** У AddMagicItemDialog брати pers.ruleset і будувати `/2024/magic-items?…` для RULES_2024 (або передавати ruleset параметром і читати його в magic-items-client).

**Файли:** `src/lib/components/characterSheet/AddMagicItemDialog.tsx`, `src/app/magic-items/page.tsx`, `src/lib/magicItemsData.ts`


### L10-sheet-config-05 — Ліміт налаштування на три магічні предмети не рахується і не показується — можна налаштуватися на будь-яку кількість

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/equipment.md:2161 — «You can be attuned to no more than three magic items at a time. Any attempt to attune to a fourth item fails; you must end your Attunement to an item first. Additionally, you can't attune to more than one copy of an item.»

**Має бути:** Лічильник налаштованих предметів на листі й відмова від четвертого (для Artificer — від пʼятого: data/2024/srd/classes.md:7161 «You can attune to up to four magic items at once»).

**Є:** Гравець може налаштуватися на скільки завгодно предметів; бонуси всіх них ідуть у КЗ і решту чисел (bonus-calculator.ts:91 враховує предмет, якщо `!requiresAttunement || isAttuned`).

**Доказ:** src/lib/components/characterSheet/slides/CombatSlide.tsx:82 `onClick={() => onUpdate({ isAttuned: !pmi.isAttuned })}` — жодної перевірки. src/lib/actions/magic-item-actions.ts:30-48 updateMagicItem передає updates просто у prisma.persMagicItem.update. `grep -rn "isAttuned" src/` — 12 входжень, жодного підрахунку; лічильника «Налаштовано N/3» на листі немає.

**Відтворення:** Лист → «Спорядження» → додати 4+ предмети з вимогою налаштування → натиснути значок налаштування на кожному; усі стають НАЛАШТ.

**Куди дивитись:** Чиста функція src/rules/attunement.ts (findAttunementCapacity з урахуванням Artificer), перевірка в updateMagicItem і бейдж-лічильник у CombatSlide.

**Файли:** `src/lib/components/characterSheet/slides/CombatSlide.tsx`, `src/lib/actions/magic-item-actions.ts`, `src/server/db/magic-items.ts`

**Скептик:** Спростувати не вдалося — знахідка підтверджується власним доказом, але її `rule_source` містить помилкову атрибуцію, яку треба виправити.

**(1) Правило — так, і в обох редакціях.** 2024: `data/2024/srd/equipment.md`, розділ «No More Than Three Items» — цитата автора дослівна. Автор дав лише 2024, хоча поставив `edition: both`; я дібрав 2014-оракул: `data/2014/srd/09_Magic_Items/Magic_Items.md:13` — «a creature can be attuned to no more than three magic items at a time. Any attempt to attune to a fourth item fails». `edition: both` правильне, і це важливо, бо всі 9 394 прод-персонажі — `RULES_2014`.

**(2) Код — ніде не обробляється.** `grep isAttuned` по `src/ prisma/ tests/` дає рівно ті самі 12 входжень; єдиний запис — `updatePersMagicItem` (`src/server/db/magic-items.ts:18`) = голий `prisma.persMagicItem.update`, без валідації. `src/rules/attunement.ts` не існує (перевірив `ls src/rules/`). Перевірив і те, чого автор не перевіряв: у базі теж немає межі — запит до `spells_test` по `pg_constraint`/`pg_trigger` для `pers_magic_item` дає лише PK і два FK, тригерів нуль.

**(3) Рішення власника — не покриває.** У `docs/DECISIONS.md` і `docs/KNOWN-BUGS.md` слова «attun» немає взагалі. Найближчий прецедент — «Прийнято» BUG-001…003 (власник, 2026-08-13: «UI — джерело істини… краще прийняти, ніж відмовити»), але він про те, що **сервер** довіряє UI, який сам обмежує. Тут не обмежує жоден шар, тож рішення не поширюється — навпаки, за його ж логікою обмеження мало б бути в UI. Розділи «Поза межами» (o18, o19, o24, o27, o28) цього не виключають; o28 виключає лише «перебудову моделі інвентарю».

**(4) Не in-flight.** `CombatSlide.tsx`, `magic-item-actions.ts`, `src/server/db/magic-items.ts` у списку паралельної сесії відсутні.

**(5) Не відкритий KR.** Жодна ціль не володіє лімітом налаштування; усі згадки «attun» у `docs/` — про колонку `requires_attunement`, каталоги 2024 і партії перекладу.

**(6) Серйозність P2 — тримаю.** Числа справді розходяться з книгою, але лише після свідомої дії гравця; застосунок сам нічого не завищує й вибору не губить, а лист за задумом дозволяє ручні override (Р22, `overrideBaseAC`). Це відсутній запобіжник і відсутній лічильник, тобто «немає можливості, яку має зрілий білдер» — P2, `missing-system`, як і подано.


### L10-sheet-config-06 — Зарядів магічних предметів немає взагалі — ні стовпця, ні лічильника, ні відновлення на світанку

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/magic-items.md — типовий запис: «has 7 charges… Expended charges are regained daily at dawn»

**Має бути:** Лічильник зарядів на предметі з витратою й відновленням на довгому відпочинку/світанку — як у D&D Beyond і Roll20.

**Є:** Заряди можна вести лише в текстових нотатках персонажа.

**Доказ:** `select column_name from information_schema.columns where table_name='pers_magic_item'` у spells_test → pers_magic_item_id, pers_id, magic_item_id, is_attuned, is_equipped. У model MagicItem (prisma/schema.prisma) полів зарядів теж немає. `grep -rni "charge|заряд" src/lib/components/characterSheet src/lib/actions/magic-item-actions.ts src/server/db/magic-items.ts` — жодного збігу.

**Відтворення:** Лист → «Спорядження» → додати «Wand of Magic Missiles» → жодного лічильника зарядів на картці немає.

**Куди дивитись:** Стовпці charges/max_charges у pers_magic_item (DDL у db/changes/), відновлення чіпляти до rest-actions.ts; кількість зарядів уже присутня в описах предметів для розбору.

**Файли:** `prisma/schema.prisma`, `src/server/db/magic-items.ts`, `src/lib/components/characterSheet/slides/CombatSlide.tsx`, `src/lib/actions/rest-actions.ts`

**Скептик:** Спростувати не вдалося — знахідка підтверджується власним доказом по всіх шести перевірках.

(1) ПРАВИЛО. Автор процитував `data/2024/srd/magic-items.md` неточно (його рядок — це запис `Orb of Dragonkind`, ряд. 1763). Загальне правило лежить вище і воно саме таке: `data/2024/srd/magic-items.md:239-245` — «#### Charges … Some magic items have charges that must be expended to activate their properties… Magic items often have charges or properties that recharge at the next dawn». Для `edition: both` автор оракула 2014 не навів; я його знайшов: `data/2014/srd/09_Magic_Items/Magic_Items.md:53-55` — той самий розділ «### Charges». Отже правило справді таке в обох редакціях.

(2) КОД. Незалежна перевірка `spells_test` підтверджує стовпці: `pers_magic_item` = pers_magic_item_id, pers_id, magic_item_id, is_attuned, is_equipped; `magic_item` — жодного стовпця зарядів. Записуваний стан звужений типом: `src/server/db/magic-items.ts:3-6` — `type MagicItemUpdates = { isEquipped?: boolean; isAttuned?: boolean }`, і `updatePersMagicItem` віддає рівно його в Prisma. Картка предмета (`CombatSlide.tsx:63-90`) малює лише бейджі ЕКІП/НАЛАШТ і два перемикачі.

Головна перевірка «чи не обробляється це деінде»: система використань у проєкті **є** (`PersResourcePool.usesRemaining`, `FeatureCards.tsx`, `FeaturesSlide.tsx`), але вона намертво прив'язана до фіч. `findPoolProviderForPers` (`src/server/db/resource-pool-provider.ts:23-49`) шукає лише `Feature` з `usesPoolKey`, звужену `buildOwnedFeatureFilter` до `classFeatures / subclassFeatures / persFeatures`; `resourceItems` у `FeaturesSlide.tsx:259-263` фільтрує по `FeatureDisplayType.CLASS_RESOURCE`. `model MagicItem` (schema.prisma:520-544) не має **жодного** зв'язку з `Feature` — тільки `replicatedByInfusions`, `persMagicItems`, `givesSpells`. Тобто зачепити заряди нема за що. Відновлення теж немає: `grep -n "magicItem|magic_item" src/server/db/rest-actions.ts src/lib/actions/rest-actions.ts src/rules/resource-pools.ts` — порожньо.

(3) РІШЕННЯ ВЛАСНИКА. `docs/DECISIONS.md` про заряди не має нічого (два збіги на «заряджена рушниця» / «заряджений» — метафори про `SHADOW_DATABASE_URL` і генератор). `docs/KNOWN-BUGS.md` — нуль збігів. «Поза межами» в `docs/o18-2024-character-parity/README.md:229` перелічує бастіони, переклад, правила 2014 і гейт `isRules2024Allowed` — предметів там немає. Не accepted.

(4) IN-FLIGHT. Список паралельної сесії з CONTEXT — spell-preparation / multiclass / spells-маршрути; жодного файлу предметів. Змінені в `git status` `data/aidedd/magic-items-*` і `prisma/seed/magic-items/*` — це O14 (переклад предметів з aidedd), а не трекер зарядів. Не in-flight.

(5) ВЖЕ ВІДКРИТО. Відкритого KR під це немає: O14 — переклад (4/5, лишилося KR14.3-подібне по реєстру термінів), O19 — бастіони, O22 — межа контент/персонаж. `grep -rli "лічильник.*заряд|трекер предмет" docs/` — порожньо.

(6) СЕРЙОЗНІСТЬ. P2 за шкалою CONTEXT правильна: персонаж не рахується не за книгою і вибір гравця не губиться — предмет зберігається, бракує саме змінного лічильника, який мають D&D Beyond і Roll20. На P1 не тягне. Classification `missing-system` теж правильна — потрібен DDL плюс нова підсистема відновлення, тому effort L обґрунтований.

Масштаб автор недооцінив: це не поодинокий випадок. У `spells_test` 256 із 1 066 предметів каталогу прямо пишуть «заряд» в описі — 156 із 621 у 2014 і 100 із 445 у 2024; у файлах-джерелах те саме (57 із 282 у `data/aidedd/magic-items-2014.json`, 99 із 445 у `data/2024/normalized/magic-items.json`). Предмет із repro існує в обох редакціях: «Паличка магічних дротиків [Wand of Magic Missiles]», опис — «Ця паличка має 7 зарядів». Тобто чверть каталогу описує механіку, якої лист не вміє вести.


### L10-sheet-config-07 — Ваги предметів і навантаження немає: спорядження — вільний текст, тож ні суми ваги, ні порогів обтяження

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/equipment.md — «Carrying Capacity»; data/2024/srd/playing-the-game.md — правила обтяження

**Має бути:** Структурований інвентар із кількістю й вагою, сума ваги, поріг STR×15 і стани обтяження.

**Є:** Інвентар — один <textarea>; вага не існує як дані.

**Доказ:** `grep -rni "weight|вага|навантаж|carrying|encumb" src/lib/components src/rules src/lib/logic src/server/pdf` дає лише CSS font-weight і сортувальну вагу у FeatChoiceOptionsForm.tsx:898. Спорядження зберігається як `pers.custom_equipment` (текст) — MainStatsSlide.tsx:930, src/server/db/character-creation.ts.

**Відтворення:** Лист → «Детальна інформація» → поле «Спорядження» — вільний текст без структури.

**Куди дивитись:** Окрема ціль: таблиця pers_item (item, qty, weight, equipped) замість текстового блоку; текстове поле лишити як «інше».

**Файли:** `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `src/server/db/character-creation.ts`, `prisma/schema.prisma`


### L10-sheet-config-08 — Станів і виснаження на листі немає — трекера немає, а виснаження 2024 міняє всі числа листа

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/rules-glossary.md:774-778 — «_Exhaustion Levels._ This condition is cumulative. Each time you receive it, you gain 1 Exhaustion level. You die if your Exhaustion level is 6.» (у 2024 кожен рівень дає −2 до перевірок к20 і −5 футів швидкості)

**Має бути:** Перемикачі станів і рівень виснаження на листі, які автоматично міняють похідні числа — як у D&D Beyond і Roll20.

**Є:** Гравець мусить вручну вписати мінуси у кожен із шести бонусів характеристик, ряткидки, навички й швидкість — і памʼятати, що це треба зняти.

**Доказ:** У model Pers (prisma/schema.prisma) немає ні conditions, ні exhaustion_level. Стани існують лише як довідник: src/lib/rulesData.ts:87-290, src/lib/rules2024Data.ts:54. На персонажа їх почепити нічим.

**Відтворення:** Лист персонажа → жодного місця, де можна позначити «Отруєний» або рівень виснаження.

**Куди дивитись:** pers.conditions Condition[] + exhaustion_level Int (DDL), чиста функція src/rules/conditions.ts, яку читає bonus-calculator.

**Файли:** `prisma/schema.prisma`, `src/lib/logic/bonus-calculator.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`

**Скептик:** Знахідка підтверджується незалежно й повністю на всіх трьох рівнях: правило (обидві редакції, цитати з оракулів репо), схема (немає ні стовпця, ні enum — потрібен DDL), код (жодного трекера, лише довідник). Не прийнято власником, не in-flight, не дубль відкритого KR. Серйозність P2 за шкалою CONTEXT правильна: персонаж **порахований** за книгою — бракує можливості, яку мають D&D Beyond і Roll20 (трекер станів у грі), а не втрачається вибір гравця; тому не P1. Дві поправки до формулювання автора, які не міняють вердикт: (а) для 2014 більшість ефектів виснаження — перешкода, а не число, і застосунок узагалі не знає поняття переваги/перешкоди й не кидає кубиків, тож «вписати мінуси в бонуси» — це опис 2024, а в 2014 стосується лише рівнів 2/4/5; (б) `expected` «автоматично міняють похідні числа» стикається з лінією власника Р26/Р31 «трекер, а не суддя», тож обсяг (перемикач-маркер проти автоматичного перерахунку) — питання до власника.


### L10-sheet-config-09 — Натхнення (Heroic Inspiration) не відстежується — поля й перемикача немає

**Статус:** ✅ закрито 2026-09-09 (KR31.3) для 2024. Перемикач «Героїчне натхнення» на слайді «Головна» (`MainStatsSlide`, спільний `ToggleRow` із `CombatSlide`), пише через офлайн-чергу як хіти й кидки смерті; знімок і спільний перегляд показують стан лише для читання. Для 2014 перемикача немає навмисно — «Inspiration» там дає лише майстер, вмикати його — окреме рішення власника.

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/rules-glossary.md:865-869 — «If you (a player character) have Heroic Inspiration, you can expend it to reroll any die immediately after rolling it, and you must use the new roll.»

**Має бути:** Чекбокс натхнення в шапці листа — він є на офіційному аркуші й у D&D Beyond; у 2024 натхнення роздається частіше (видова риса людей).

**Є:** Відстежити натхнення можна лише в нотатках.

**Доказ:** У model Pers немає поля натхнення. `grep -rn "Натхнення|натхнення" src/lib src/app --include='*.tsx'` дає лише текст правил у src/lib/rulesData.ts:1061,1140.

**Відтворення:** Лист персонажа 2024 → шапка й слайд «Головна» — чекбокса натхнення немає.

**Куди дивитись:** pers.has_heroic_inspiration Boolean (DDL) + перемикач у шапці листа.

**Файли:** `prisma/schema.prisma`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`


### L10-sheet-config-10 — Рівень не можна знизити, підклас не можна змінити, респеку немає — помилка виправляється лише перестворенням персонажа

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Має бути:** Дія «відкотити останній рівень» і зміна підкласу на листі — D&D Beyond дає «Manage Levels» із видаленням рівня і повний респек.

**Є:** Помилився з підкласом на 3 рівні або підняв рівень зайвий раз — виправити всередині персонажа неможливо; копія зі знімка створює новий id, тобто шеринг, теки й посилання треба заводити заново.

**Доказ:** `grep -rn "levelDown|decreaseLevel|respec|знизити рівень" src/lib src/app src/server src/rules` — жодного збігу. updatePersSubclass (src/server/db/legacy-levelup.ts:8) викликається рівно з одного місця — транзакції підвищення рівня (src/lib/actions/character-transaction.ts:52). Єдиний обхід — копія зі знімка: SnapshotHistoryModal.tsx:74 `duplicatePers(snapshotId)`, але це новий pers_id.

**Відтворення:** Лист будь-якого персонажа → немає жодної кнопки зниження рівня чи зміни підкласу; /char/<id>/levelup тільки підіймає.

**Куди дивитись:** Мінімум — дія «відкотити останній рівень» поверх наявних знімків (snapshot-actions.ts уже зберігає стан кожного рівня) із записом у той самий pers_id.

**Файли:** `src/lib/actions/snapshot-actions.ts`, `src/server/db/snapshots.ts`, `src/server/db/legacy-levelup.ts`, `src/lib/components/characterSheet/SnapshotHistoryModal.tsx`


### L10-sheet-config-11 — Своєї фічі з текстом і ресурсом додати не можна: стовпець pers.custom_features мертвий, власний пул ресурсу створити нічим

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт скептика:** confirmed

**Має бути:** Список власних фіч із назвою, текстом, кількістю використань і типом відновлення — D&D Beyond має Custom Actions, Extras і лічильники.

**Є:** Домашня риса від майстра, благословення чи тимчасова здібність («3 рази на день, повертається на короткому») на листі не існують.

**Доказ:** `grep -rln "customFeatures" src/` → лише src/server/db/share-actions.ts, src/server/db/snapshots.ts, src/lib/logic/pers-duplication.ts — тобто поле тільки копіюють, жодне місце UI його не читає й не пише. `grep -rn "persResourcePool.create|createResourcePool|addResourcePool" src/` — порожньо; src/server/db/feature-uses.ts має лише spendFeatureUse (:29) і restoreFeatureUse (:169) для наявних фіч.

**Відтворення:** Лист → слайд «Фічі» → кнопка «+ Додати» веде лише до каталогу рис (feat), способу створити власний запис немає.

**Куди дивитись:** Увімкнути custom_features у слайді «Фічі» як список {назва, текст, uses, recharge} у JSON; витрату вести через наявний feature-uses.

**Файли:** `prisma/schema.prisma`, `src/lib/components/characterSheet/slides/FeaturesSlide.tsx`, `src/server/db/feature-uses.ts`

**Скептик:** Перевірив усі шість пунктів, знахідка стоїть.

(1) ПРАВИЛО — n/a і в автора теж n/a: це не питання редакції, а відсутня можливість білдера. Претензій нема.

(2) КОД — підтверджую власним прогоном, і сильніше за автора. Репо-широкий (не лише `src/`) grep `custom_features|customFeatures` дає рівно 5 входжень: `prisma/schema.prisma:588`, `db/schema.sql:2220` і три копіювальні місця — `src/server/db/share-actions.ts:705`, `src/server/db/snapshots.ts:68`, `src/lib/logic/pers-duplication.ts:70`. Жодного читання в UI, жодного запису (навіть `character-creation.ts`, який заповнює сусідні `custom_equipment`/`custom_languages_known`, цього поля не чіпає), і навіть друк його не бере: у `src/server/pdf/generateCharacterPdf.ts` є `customEquipment` (:201) і `customLanguagesKnown` (:873), `customFeatures` — ні. Тобто поле мертве навіть глибше, ніж написав автор.

Немає й обхідного шляху через існуючі таблиці: `PersFeature` (schema.prisma:734-744) має **обовʼязковий FK** `featureId → Feature` і `@@unique([persId, featureId])`, тому власну фічу нікуди покласти без вставки контентного рядка; усі `persFeature.create*` — це creation/levelup/копія/знімок, усі з каталожним `featureId`. Єдина точка додавання у слайді «Фічі» — `FeaturesSlide.tsx:816` → `FeatsSheetManagerModal`, який вантажить лише `getAllFeats(ruleset)` (:22-23), тобто каталог рис. Ресурс так само: `PersResourcePool` (schema.prisma:838-847) ключується вільним рядком `poolKey`, але створюється лише `upsert`-ами під `feature.usesPoolKey` наявної каталожної фічі (`feature-uses.ts:83,222`, `wildshape-uses.ts:95`) і скидається відпочинком (`rest-actions.ts:222,343`); `src/lib/actions/feature-uses.ts` — це `export * from` серверного файлу, де є тільки `spendFeatureUse` (:29) і `restoreFeatureUse` (:169).

Дрібна неточність у доказі автора (не міняє висновку): його grep шукав `persResourcePool.create`, а рядки пулу насправді створюються `upsert`-ом — просто виключно під ключ наявної фічі. Формулювання «створити власний пул нічим» лишається правильним, доказ треба вести через `upsert`, а не через відсутність `.create`.

Додатковий контекст, якого в звіті нема: `custom_features` — не «зарезервоване під це поле», а член сімʼї легасі-колонок, які всі мертві однаково (`raceCustom`, `classCustom`, `customBackground` теж зустрічаються тільки в тих самих трьох копіювальних файлах). Це радше здешевлює фікс (колонка вже є, DDL не потрібен), ніж посилює баг.

(3) РІШЕННЯ ВЛАСНИКА — немає. `docs/KNOWN-BUGS.md` «Прийнято» — це BUG-001…003 (сервер довіряє UI на створенні), не про це. `docs/DECISIONS.md` не містить рішення про homebrew-контент персонажа; згадки `HOMEBREW` в O12 — про enum `Source` для каталогів, інша тема. Розділів «Поза межами» з цим пунктом теж не знайшов.

(4) IN-FLIGHT — ні: `FeaturesSlide.tsx`, `feature-uses.ts`, `pers-duplication.ts` не в списку паралельної сесії (там `spell-*`, `AddSpellDialog`, `pers-actions.ts`, мультиклас-тести).

(5) ВЖЕ ВІДКРИТО — ні. Пройшов таблицю цілей `docs/README.md` (O1–O29): відкриті цілі — імпорти каталогів, довідник правил, мультиклас 2024, друк, спорядження 2024, стартове спорядження. Власних фіч/ресурсів гравця не покриває жодна.

(6) СЕРЙОЗНІСТЬ — P2 правильно. Персонаж не рахується не за книгою і вибір гравця не губиться (гравець його ніколи й не міг зробити) — це відсутня можливість зрілого білдера, тобто рівно визначення P2. Пониження до P3 не виправдане: текст домашньої риси ще можна вкинути в `notes`/`backstory`, але лічильника «3/день, повертає короткий відпочинок» не заміняє ніщо.


### L10-sheet-config-12 — Володіння і мови зберігаються одним текстовим блоком, а не даними — окреме володіння ні додати, ні зняти механічно

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Має бути:** Структуровані володіння й мови з джерелом кожного (як «Light Armor — Fighter» у D&D Beyond), щоб можна було додати одне володіння інструментом і щоб механіка його бачила.

**Є:** Володіння — проза. Додати одне володіння можна лише дописавши слово в абзац; жодна механіка цього не побачить (зокрема PersWeapon.isProficient не звіряється з цим текстом узагалі). Друк, копія й шеринг несуть той самий текст.

**Доказ:** src/server/db/character-creation.ts:713 `const customProficiencies = profLines.join("\n");` — володіння бронею, зброєю та інструментами з виду, класу, підвиду, підкласу, походження й риси зшиваються в один рядок; :750 те саме для customLanguagesKnown. На листі це <textarea>: MainStatsSlide.tsx:917 (володіння) і :955 (мови). Діалог «Мови» (MainStatsSlide.tsx:1010-1046) працює з Set токенів, розрізаних по /[\n,]/ (init на :133), а «Підставити» робить `setDraftLanguages(Array.from(selectedLanguages).join(", "))` — переноси рядків сплющуються, а токен, якого немає в LanguageTranslations, у чекбоксах не показується і зняти його не можна.

**Відтворення:** Лист → «Детальна інформація» → «Володіння (броня/зброя/інструменти)» — один <textarea>; додати «Інструменти теслі» можна тільки текстом.

**Куди дивитись:** Таблиці pers_proficiency / pers_language з полем source; текстове поле лишити як «інше». Косметична частина (діалог мов не має сплющувати переноси рядків) — окремо, effort S.

**Файли:** `src/server/db/character-creation.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `src/lib/actions/update-character.ts`, `prisma/schema.prisma`

**Скептик:** (1) ПРАВИЛО — оракул не потрібен: знахідка не про правило книги, а про відсутню можливість («rule_source: n/a» коректний). (2) КОД — підтверджено дослівно. `src/server/db/character-creation.ts:713` `const customProficiencies = profLines.join("\n")` і :750 те саме для `customLanguagesKnown`. У схемі **немає** ні `pers_proficiency`, ні `pers_language` — grep `^model .*(proficien|language)` по `prisma/schema.prisma` порожній; на персонажі це два звичайні `String` (`schema.prisma:589` `custom_languages_known`, `:618` `custom_proficiencies`). Єдині структурні володіння персонажа — `additionalSaveProficiencies Ability[]` (ряткидки) і рядки `PersSkill` (навички); броні, зброї, інструментів і мов серед них немає. Повний перелік споживачів двох стовпців — тільки показ і копіювання: `generateCharacterPdf.ts:872-873`, textarea `MainStatsSlide.tsx:911/913` і `:936/942`, `share-actions.ts:704,706`, `snapshots.ts:67,69`, `pers-duplication.ts:69,71`, `LevelUpWizard.tsx:542`. Записувачі лише доливають рядки: `character-creation.ts:713,750` і `levelup-persistence.ts:1196,1225` (`mergeUniqueLines`). Жоден калькулятор їх не читає: `bonus-calculator.ts:513` бере `pw.isProficient` з рядка `PersWeapon`, а не з тексту, а `calculateArmorClass` (`src/rules/armor.ts`) володіння бронею не перевіряє взагалі. Іншого місця обробки немає. (3) РІШЕННЯ ВЛАСНИКА — нема. У `docs/DECISIONS.md` (Р1–Р39) цього немає; «Прийнято» в `KNOWN-BUGS.md` — це BUG-001..003 про довіру сервера до UI; «Поза межами» в `o18/README.md` перелічує бастіони, переклад, 2014 і гейт релізу, не володіння. (4) IN-FLIGHT — ні: `character-creation.ts`, `MainStatsSlide.tsx`, `update-character.ts` не в списку паралельної сесії. (5) ВІДКРИТИЙ KR — ні. Grep `customProficiencies` по `docs/` дає лише BUG-006 (мультиклас 2014 не додає володінь узагалі) і O27/KR27.2 (мультиклас 2024 навчився доливати рядки). Обидва **пишуть у той самий текст**, тобто підтверджують знахідку, а не дублюють її. (6) СЕРЙОЗНІСТЬ — P2 правильна. P1 не підходить: текст несе володіння з усіх джерел правильно і редагується на листі, тож жодне число не пораховано не за книгою і жоден вибір не губиться саме через цю знахідку; P1-подібний наслідок (`isProficient: true` за замовчуванням) — це окрема знахідка 14, і піднімати обидві до P1 означало б порахувати одне двічі. P3 замало: це справді відсутня система, а не косметика. Головна поправка до автора: теза «жодна механіка їх не бачить» точна щодо **тексту**, але структурні володіння зброєю є на боці контенту і вже читаються правилом — `src/rules/weapon-mastery.ts:89` будує `WeaponProficiencyGrant` із `class.weaponProficiencies`/`weaponProficienciesSpecial`, щоб відфільтрувати пул майстерності. Тому оцінка effort **L** завищена для практичної частини: вивести володіння зброєю без DDL можна вже сьогодні (S/M), L потрібне лише для повного сховища `pers_proficiency`/`pers_language` з джерелом кожного рядка.


### L10-sheet-config-13 — Портрета й полів зовнішності немає — персонажі в списку не відрізняються нічим, крім тексту

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт скептика:** confirmed

**Має бути:** Портрет персонажа (як у D&D Beyond і Roll20) і поля зовнішності; портрет у списку /char/home.

**Є:** Портрета немає взагалі; зовнішність можна описати лише всередині «Передісторії».

**Доказ:** У model Pers (prisma/schema.prisma) немає ні image_url, ні avatar, ні age/height/weight/eyes/hair/skin. `grep -rn "imageUrl|avatar|portrait" prisma/schema.prisma` дає єдиний рядок 340 — це інша модель. У «Детальній інформації» (MainStatsSlide.tsx:807-979) є нотатки, риси характеру, ідеали, привʼязаності, вади й передісторія — зовнішності немає.

**Відтворення:** Лист → «Детальна інформація» → полів зовнішності немає; /char/home — картки без зображень.

**Куди дивитись:** pers.image_url (перший дешевий крок — зовнішнє посилання) + поля зовнішності одним JSON; показувати портрет у шапці листа й на картці в /char/home.

**Файли:** `prisma/schema.prisma`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `src/app/char/home/CharHomeClient.tsx`

**Скептик:** ПРАВИЛО: rule_source «n/a» коректний — це не питання редакції. Ні data/2014/srd/, ні data/2024/srd/ не містять «Height and Weight»/«Random Height» (grep порожній): зовнішність і портрет — не механіка SRD, а можливість листа. Претензія автора саме про паритет із зрілим білдером.

КОД (відтворив незалежно): (1) awk по model Pers у prisma/schema.prisma — повний список полів, жодного image_url/avatar/age/height/weight/eyes/hair/skin. Єдиний imageUrl (рядок 340) справді в іншій моделі: блок actions/reactions/legendaryActions/lairActions із @@map("creature"), тобто бестіарій. (2) Перевірив не артефакт, а саму базу spells_test: information_schema.columns для pers дає 72 стовпці — жодного зображення чи зовнішності. (3) UI: grep -niE "img |<Image|imageUrl|avatar|portrait" по src/app/char/home/CharHomeClient.tsx і по всіх src/lib/components/characterSheet/*.tsx — нуль збігів; PersCard (CharHomeClient.tsx:396) текстова. (4) «Детальна інформація» (MainStatsSlide.tsx): Нотатки 806, Світогляд 818, гроші, володіння, спорядження, мови, Риси характеру 953, Ідеали 962, Привʼязаності 971, Вади 980, Передісторія 991 — зовнішності немає; у конструкторі теж (grep по characterCreator/*.tsx порожній).

РІШЕННЯ ВЛАСНИКА: немає. grep -niE "портрет|аватар|зовнішн|appearance|image" по docs/ дає лише портрети ІСТОТ (O12, O24, O28) і каталоги рас/класів; «Прийнято» в docs/KNOWN-BUGS.md (41–95) — тільки BUG-001…003 про довіру серверу до UI; «Поза межами» O18 і O28 виключають бастіони, переклад і портрети істот у PDF, про портрет персонажа — ні слова. git log --grep порожній.

IN-FLIGHT: ні — schema.prisma, MainStatsSlide.tsx, CharHomeClient.tsx не у списку файлів паралельної сесії (KR27.7/KR30.3).

ВЖЕ ВІДКРИТО: ні — жодного KR у docs/o*/ про портрет чи зовнішність персонажа.

СЕРЙОЗНІСТЬ: P2 правильна («немає можливості, яку має зрілий білдер»). Не P1 — жодне число не рахується не за книгою, жоден вибір не губиться. Нюанс: половина знахідки мʼяка — текстову зовнішність гравець сьогодні впише в «Нотатки» чи «Передісторію» (без окремих полів і без друку в потрібному місці); тверда прогалина — саме портрет. Тому P2, але в нижній частині смуги.

Оцінка зусиль «M» занижена: інфраструктури завантаження немає взагалі — у src/app/api/ немає upload-маршруту, у next.config.ts немає images.remotePatterns. Стовпець pers.image_url із зовнішнім посиланням — S/M; справжнє завантаження зі сховищем — L.


### L19-parity-competitors-03 — На листі немає станів і Виснаження — персонаж завжди рахується як здоровий

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/rules-glossary.md:774-784 — «_Exhaustion Levels._ … You die if your Exhaustion level is 6. _D20 Tests Affected._ When you make a D20 Test, the roll is reduced by 2 times your Exhaustion level. _Speed Reduced._ Your Speed is reduced by a number of feet equal to 5 times your Exhaustion level.»

**Має бути:** Лист дозволяє позначити активні стани (14 станів) і рівень Виснаження; принаймні Виснаження має впливати на d20-перевірки, СК заклинань і швидкість, як у 2024.

**Є:** Немає ані сховища, ані UI; усі похідні числа завжди рахуються без станів.

**Доказ:** `grep -rni "виснаж|exhaustion" src/` знаходить лише довідковий текст `src/lib/rulesData.ts` і `src/lib/refs/weapon-mastery.ts`. `grep -rni "Стани|conditions\b|отруєн|приголомш" src/lib/components/characterSheet src/app/char --include=*.tsx` — порожньо. У `model Pers` немає стовпця під стани чи рівень виснаження.

**Куди дивитись:** Новий стовпець/таблиця станів на Pers + панель на MainStatsSlide; Виснаження підключити в bonus-calculator (d20, швидкість) як окремий доданок.

**Файли:** `prisma/schema.prisma`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `src/lib/logic/bonus-calculator.ts`


### L19-parity-competitors-04 — Натхнення (Heroic Inspiration) не існує ніде в продукті

**Статус:** ✅ закрито 2026-09-09 (KR31.3) для 2024 — див. `L12-secondary-flows-10` і `L10-sheet-config-09`: колонка, перемикач на листі, видача довгим відпочинком, підказки бастіону; копія й знімок переносять (`tests/logic/pers-copy-fields.test.ts`). 2014 лишається без натхнення до окремого рішення власника.

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/rules-glossary.md:865-869 — «If you (a player character) have Heroic Inspiration, you can expend it to reroll any die immediately after rolling it… If you gain Heroic Inspiration but already have it, it's lost unless you give it to a player character who lacks it.»

**Має бути:** Перемикач «Натхнення є / витрачено» на листі — у 2024 це базовий ресурс, який людський вид (Resourceful) відновлює після кожного довгого відпочинку.

**Є:** Гравець тримає це в голові або на папері; лист про Натхнення не знає.

**Доказ:** `grep -rni "натхнен|inspiration" src/` поза довідковими файлами знаходить лише `key: "bardic_inspiration_die"` у `src/lib/components/characterCreator/modals/ClassInfoModal.tsx:65` — це кістка барда, інша сутність. У `model Pers` немає булевого стовпця.

**Куди дивитись:** Булевий стовпець на Pers + перемикач біля хітів у MainStatsSlide; скидання/видача — у rest-actions.

**Файли:** `prisma/schema.prisma`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`


### L19-parity-competitors-06 — Інвентар — один текстовий рядок; ваги немає в схемі взагалі, тож ні кількостей, ні контейнерів, ні навантаження

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/rules-glossary.md:381-385 — «Your size and Strength score determine the maximum weight in pounds that you can carry… While dragging, lifting, or pushing weight in excess of the maximum weight you can carry, your Speed can be no more than 5 feet.»

**Має бути:** Предмет як рядок з кількістю, вагою, ознакою «споряджено», можливістю покласти в контейнер; сумарна вага проти вантажопідйомності.

**Є:** Вільний текст; жодна операція над предметом (продати, викинути, перекласти, порахувати вагу) неможлива, а порахувати навантаження нема з чого — ваги немає в даних.

**Доказ:** Стартове спорядження пишеться рядками в `Pers.custom_equipment`: `src/server/db/character-creation.ts:547` `customEquipmentLines.push(\`${name} x${quantity}\`)`, `:800` `customEquipment: customEquipmentLines.join("\n")`. Запит до spells_test, pers_id=3: `"Посох x1\nКаліграфічний набір x1\n…\nМантія x1\n…\nМантія x1\n…"` — 17 рядків тексту (з дублями). `grep -n "weight" prisma/schema.prisma` — жодного збігу: ні Weapon, ні Armor, ні MagicItem ваги не мають.

**Куди дивитись:** Таблиця PersItem (contentId | вільна назва, кількість, контейнер, споряджено) + стовпець weight у контентних таблицях зі 5etools/aidedd; сума й вантажопідйомність — чиста функція в src/rules/.

**Файли:** `prisma/schema.prisma`, `src/server/db/character-creation.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`

**Скептик:** ПРАВИЛО — підтверджено в обох редакціях. 2024: `data/2024/srd/rules-glossary.md` §Carrying Capacity — «Your size and Strength score determine the maximum weight in pounds that you can carry… While dragging, lifting, or pushing weight in excess of the maximum weight you can carry, your Speed can be no more than 5 feet». 2014: `data/2014/rules-uk/batch-06.json` («Підняття й носіння. Значення вашої Сили визначає, яку вагу ви витримуєте»), тег «вантажопідйомність». Отже `edition: both` правильний.

КОД — підтверджено власним доказом, не переказом. `grep -ni "weight|вага|encumb|carry|capacity" prisma/schema.prisma` — 0 збігів. Незалежний запит до `spells_test` (`information_schema.columns`, `column_name ilike '%weight%|%carry%|%encumb%'`) повернув **порожній список** — тобто ваги немає не лише у файлі схеми, а й у самій базі. `custom_equipment` у моїх власних рядках (pers_id 1–5, база була перезаписана чужим прогоном, тож персонажів автора вже немає) — це справді вільний текст: `"Знак рангу x1\nТрофей від переможеного ворога x1\nНабір для гри в кості або гральні карти x1\nЗвичайний одяг x1"`. Запис — `src/server/db/character-creation.ts:547` і `:800`, показ — `MainStatsSlide.tsx` `<textarea value={draftEquipment}>` під заголовком «Спорядження». Немає ні кількості як числа, ні контейнерів, ні «споряджено», ні підсумкової ваги.

ДВІ ПОПРАВКИ ДО ДОКАЗУ АВТОРА (суті не міняють, але формулювання хибне).
1. «Порахувати навантаження нема з чого — ваги немає в даних» — **неправда**. Вага є в джерелах: `data/2024/normalized/weapons.json` і `armor.json` несуть `"weight": "2 lb."` / `"8 lb."` для кожного рядка, `data/2024/srd/equipment.md` має колонку Weight для спорядження шукача пригод (Backpack 5 lb.) та інструментів. Більше того, `prisma/seed/weaponSeed2024.ts:29` **оголошує** `weight: string` у типі й ніде його не пише. Тобто дані вже в репо — їх викидає схема, а не бракує на вході. Це робить знахідку дешевшою у виправленні, ніж стверджує автор.
2. «Жодна операція над предметом неможлива» — **перебільшення**. Зброя, обладунок і магічні предмети є структурованими рядками (`PersWeapon`, `PersArmor` з `equipped`, `PersMagicItem` з `is_attuned`/`is_equipped`) з повним набором дій: `AddWeaponDialog`/`AddArmorDialog`/`AddMagicItemDialog`, `WeaponCustomizeModal`, `ArmorCustomizeModal`, `magic-item-actions.ts` (`updateMagicItem`, `deleteMagicItem`, `toggleMagicItemForPers`). Текстом лежить **решта інвентарю** — спорядження походження, пакунки, інструменти, витратне. Правильне формулювання: «немає моделі загального спорядження й ваги», а не «немає моделі предмета».
3. Дублі рядків, на які посилається автор, у друці вже зведені: KR28.4 (`docs/o28-print-bestiary-character/kr28.4-equipment-quantities.md`, ✅ 2026-09-01) дає `Спис ×10` і прибирає `×1`. Це лише print-проєкція — у базі й у textarea листа текст лишається сирим, тож знахідка від цього не зникає.

РІШЕННЯ ВЛАСНИКА — прийняття не знайдено. У `docs/DECISIONS.md` немає жодного рішення про інвентар як текст; навпаки, Р про бастіони (рядок 1107) припускає, що інвентар існує як місце: «Предмет гравець додає через наявний інвентар». `docs/KNOWN-BUGS.md` («Прийнято») і `docs/o21-user-signals/defects.md` спорядження не згадують узагалі. Єдина дотична фраза — `docs/o28-print-bestiary-character/README.md:134` «Поза межами: Перебудова моделі інвентарю» — це межа **тієї цілі** (друк), а не рішення власника не робити інвентар; ціль про друк і не мала його перебудовувати.

IN-FLIGHT — ні: жоден із файлів (`prisma/schema.prisma`, `character-creation.ts`, `MainStatsSlide.tsx`) не в списку паралельної сесії (KR27.7/KR30.3 — заклинання).

ВЖЕ ВІДКРИТО — ні: у таблиці цілей `docs/README.md` слова «інвентар», «навантаження», «вага» не зустрічаються; `docs/o18-2024-character-parity/reference-2024.md` теж мовчить. Відкритого KR під це немає.

СЕРЙОЗНІСТЬ — P2 за шкалою CONTEXT правильна. Це відсутня можливість зрілого білдера, а не помилка розрахунку: жодне число листа не рахується не за книгою через відсутність ваги, бо продукт і не обіцяє трекати перевантаження (як не трекає й станів — знахідка 03). P1 не заслуговує. `missing-system` теж правильно: потрібні DDL (таблиця `pers_item` + `weight` у контентних таблицях), сід із наявних файлів і UI — це L, окрема ціль.


### L19-parity-competitors-07 — Ліміт «не більше трьох налаштованих предметів» не перевіряється — можна налаштуватися на скільки завгодно

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/equipment.md:2161 — «You can be attuned to no more than three magic items at a time. Any attempt to attune to a fourth item fails; you must end your Attunement to an item first.» Межа рухома: data/2024/srd/classes.md:7161 (Rogue 13, Use Magic Device) — «You can attune to up to four magic items at once.»

**Має бути:** Спроба налаштуватися на четвертий предмет відхиляється з поясненням; межа читається з фіч персонажа, а не є константою.

**Є:** Кількість налаштованих предметів необмежена — персонаж може мати їх десять.

**Доказ:** Перемикач налаштування в `src/lib/components/characterSheet/slides/CombatSlide.tsx:83` (`title={pmi.isAttuned ? "Скасувати налаштування" : "Налаштуватися"}`) не супроводжується жодною перевіркою кількості: `grep -rni "attun" src/lib/actions src/server/db src/rules` дає лише `src/server/db/magic-items.ts:43` (створення рядка з `isAttuned: false`).

**Куди дивитись:** Чиста функція `findAttunementCapacity(pers)` у src/rules/ (база 3 + фічі) і перевірка в дії перемикання налаштування; лічильник «X / 3» біля списку предметів.

**Файли:** `src/lib/components/characterSheet/slides/CombatSlide.tsx`, `src/server/db/magic-items.ts`


### L10-sheet-config-15 — Поля налаштування, що є в базі, але яких немає в UI: тип шкоди й дальність зброї, PersSkill.customModifier

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Або поля доведені до UI (кинджал, що завдає шкоду холодом; лук із іншою дальністю), або прибрані з моделі.

**Є:** Стовпці існують, але жоден шлях UI їх не змінює; customModifier — мертвий дубль skillBonuses.

**Доказ:** PersWeapon має overrideDamageType, overrideNormalRange, overrideLongRange, overrideAttackAbility (prisma/schema.prisma), але WeaponCustomizeModal.tsx:24-33 редагує лише overrideName, attackBonus, customDamageBonus, customDamageDice, customDamageAbility, isMagical, isProficient, а updateWeapon (src/server/db/equipment-actions.ts:90-101) решти навіть не приймає. PersSkill.customModifier читається лише у pers-duplication.ts:132, snapshots.ts:127, share-actions.ts:766 — власний бонус до навички лист пише в skillBonuses JSON.

**Відтворення:** Лист → «Спорядження» → налаштування зброї: полів «Тип шкоди» й «Дальність» немає, хоча стовпці є.

**Куди дивитись:** Додати поля до WeaponCustomizeModal і до сигнатури updateWeapon; для PersSkill.customModifier — або читати його в bonus-calculator, або прибрати стовпець, щоб наступна сесія не рахувала його робочим.

**Файли:** `src/lib/components/characterSheet/WeaponCustomizeModal.tsx`, `src/server/db/equipment-actions.ts`, `prisma/schema.prisma`, `src/lib/logic/bonus-calculator.ts`


## Похідні числа листа (12)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P1 | both | bug | `L01-species-01` | Швидкість на листі й у друці жорстко 30 — голіаф 2024 (35 футів) і будь-яка раса 2014 з 25 футами показують 30 | src/lib/logic/bonus-calculator.ts, src/lib/components/characterSheet/slides/MainStatsSlide.tsx |
| ✓ | P1 | 2024 | missing-system | `L07-spellcasting-06` | Характеристика замовляння за джерелом порахована, але ніде не показана: лист має одну КС на весь персонаж | src/lib/components/characterSheet/slides/MagicSlide.tsx, src/server/db/spell-sources.ts |
| ✓ | P1 | both | bug | `L07-spellcasting-07` | Третинний заклинач (Лицар-Чаклун, Містичний спритник) не має характеристики замовляння на листі: КС = 8, атака = +0 | src/lib/components/characterSheet/slides/MagicSlide.tsx, src/rules/spell-sources.ts |
| ✓ | P1 | both | bug | `L09-sheet-derived-03` | Швидкість на листі захардкоджена як 30 — швидкість виду, родоводу й Рух без обладунків монаха ігноруються | src/lib/logic/bonus-calculator.ts, src/lib/components/characterSheet/slides/MainStatsSlide.tsx |
| ✓ | P1 | 2024 | bug | `L11-persistence-identity-02` | Бард 2024 не отримує «Майстра на всі руки»: пошук іде за точним `engName` «Jack of All Trades», а фіча 2024 зветься «Bard: Jack of all Trades (2024)» | src/lib/logic/bonus-calculator.ts |
| ✓ | P1 | both | bug | `L17-known-registries-01` | BUG-010 живий і сліпий до редакції: тривалий відпочинок видає слоти за загальним рівнем, тож 2024-мультиклас Воїн 3/Чарівник 2 отримує [4,3,2,…] замість [3,0,…] | src/server/db/rest-actions.ts, tests/golden/derived-state/rest-and-slots.json |
| · | P1 | 2024 | data | `P1-human-fighter-08` | Бойовий стиль «Оборона» не додає +1 до КЗ — Кольчуга дає 16 замість 17 | data/2024/normalized/feats.json, prisma/seed/ |
| ✓ | P2 | both | missing-system | `L01-species-07` | Немає системи опору до шкоди: опір дракононародженого, дворфа, тифлінга й аасімара живе лише в тексті риси | src/lib/components/characterSheet/slides/MainStatsSlide.tsx, data/2024/normalized/species.json |
| ✓ | P2 | both | missing-system | `L01-species-08` | Темнозір і відчуття ніде не зведені: на листі дроу одночасно лежать «60 футів» і «зростає до 120 футів» | src/lib/components/characterSheet/slides/MainStatsSlide.tsx, src/lib/logic/bonus-calculator.ts |
| · | P2 | both | missing-system | `L09-sheet-derived-08` | Пасивних Сприйняття, Аналізу й Проникливості на листі немає — вони рахуються тільки у PDF | src/lib/components/characterSheet/slides/SkillsSlide.tsx |
| · | P2 | both | missing-system | `L09-sheet-derived-10` | Володіння (броня/зброя/інструменти) і мови — вільний текст, знятий один раз при створенні, а не похідна величина | src/server/db/character-creation.ts, src/server/db/levelup-persistence.ts |
| · | P2 | both | missing-system | `L19-parity-competitors-10` | Жодне число на листі не пояснює, звідки воно: розкладки бонусів немає, а базова характеристика збережена вже згорнутою | src/lib/logic/bonus-calculator.ts, src/lib/components/characterSheet/ModifyStatModal.tsx |

### L01-species-01 — Швидкість на листі й у друці жорстко 30 — голіаф 2024 (35 футів) і будь-яка раса 2014 з 25 футами показують 30

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-11 (KR31.6). `calculateWalkingSpeed` бере швидкість виду, варіанта, підвиду й вибору; лист і PDF читають один `calculateFinalSpeed`. Голіаф 2024 — 35, вид на 25 — 25.

**Правило:** data/2024/srd/character-origins.md:255 — «#### Goliath … **Speed:** 35 feet»

**Має бути:** Голіаф 2024 — 35 футів на листі й у PDF; дворф/напіврослик/гном 2014 — 25.

**Є:** Завжди 30 плюс ручні бонуси; вид на швидкість не впливає взагалі.

**Доказ:** src/lib/logic/bonus-calculator.ts:394-398: `export function calculateFinalSpeed(pers) { // TODO: Get from race when race has speed field\n  return 30 + getSimpleBonus(pers, "speed"); }`. Поле race.speed існує (prisma/schema.prisma:928) і в базі правильне: SELECT name,speed FROM race WHERE ruleset='RULES_2024' → GOLIATH_2024=35, решта 30. Функцію читають рівно три місця, і всі показують число гравцю: MainStatsSlide.tsx:565 (плитка «Швидкість»), generateCharacterPdf.ts:1056 і :1196 (поле Speed у PDF). Зібраний персонаж 05-stone-goliath-barbarian-guard: race.speed=35, speedBonuses=null (probe-out.txt).

**Відтворення:** bunx vitest run --config scratchpad/audit/work/L01-species/vitest.probe.mts (з кореня репо) → probe-out.txt, блок 05-stone-goliath: race.speed=35, speedBonuses=null. Далі відкрити лист такого персонажа — плитка «Швидкість» = 30.

**Куди дивитись:** calculateFinalSpeed має брати pers.race.speed (та subrace.speedModifier для 2014) замість константи 30; PersWithRelations уже несе race. Потрібен golden на 2014-расах перед правкою.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `src/server/pdf/generateCharacterPdf.ts`


### L07-spellcasting-06 — Характеристика замовляння за джерелом порахована, але ніде не показана: лист має одну КС на весь персонаж

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-09 (KR31.5). Пораховане доведено до листа на листі: `findSpellcastingSources` (обидві редакції) → `loadPersSpellcastingSources` → `sheet-data.tsx` / `share/[token]` → `MagicSlide`, картки `SpellcastingSourceCards` — пара «атака / КС» на кожне джерело з підписом «Клас · характеристика». Журнал — [KR31.5](kr31.5-spells-2024.md#2026-09-09--кс-і-атака-заклинань-за-джерелом-на-листі). Тест: `tests/components/spellcasting-source-cards.test.tsx` — мультиклас показує дві різні КС.

**Правило:** data/2024/srd/character-creation.md:939: «Each spell you prepare is associated with one of your classes, and you use the spellcasting ability of that class when you cast the spell.» Той самий намір записаний у src/rules/spell-sources.ts:5-11 (KR18.4).

**Має бути:** Кожен рядок заклинання чаклується характеристикою свого джерела; лист і PDF показують КС/атаку за джерелом (клас, родовід, риса, кожен мультиклас окремо).

**Є:** Одна пара чисел від основного класу. Досить обрати родоводу іншу характеристику на кроці «Опції раси» — і КС заклинання родоводу на листі стає неправильною.

**Доказ:** src/lib/components/characterSheet/slides/MagicSlide.tsx:163 `const spellcastingAbility = localPers.class?.primaryCastingStat;` — одне значення на весь лист, із нього обидві картки «Бонус атаки Заклинаннями» (:673) і «СК» (:685). `grep -rn "loadPersSpellSources" src` знаходить ЛИШЕ сам файл src/server/db/spell-sources.ts:11 — жодного споживача. Зібраний 03-high-elf-wizard-sage має три джерела (WIZARD_2024/INT, «Ельфійський родовід»/INT, MAGIC_INITIATE/INT), лист покаже одне число. PDF має ту саму ваду мʼякше: src/server/pdf/generateCharacterPdf.ts:748 бере class.primaryCastingStat, інакше перший мультиклас із характеристикою.

**Відтворення:** probe-out.json → 03-high-elf-wizard-sage → sources (три джерела); MagicSlide.tsx:163 показує лише одне.

**Куди дивитись:** Підключити loadPersSpellSources до листа й PDF; малювати КС/атаку рядком на джерело, а рядок заклинання привʼязувати до джерела через pers_spell.sourceName.

**Файли:** `src/lib/components/characterSheet/slides/MagicSlide.tsx`, `src/server/db/spell-sources.ts`, `src/server/pdf/generateCharacterPdf.ts`


### L07-spellcasting-07 — Третинний заклинач (Лицар-Чаклун, Містичний спритник) не має характеристики замовляння на листі: КС = 8, атака = +0

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-09 (KR31.5). `findClassSources` бере характеристику в підкласу, коли клас не чаклує сам; Лицар-Чаклун 3 в обох редакціях віддає `FIGHTER_* · INT`, і ця пара доїжджає до листа й PDF. Тест на обох редакціях: `tests/actions/spellcasting-sources-sheet.test.ts` (воїн 2014 → Лицар-Чаклун 3; воїн 2024 → Лицар-Чаклун 3), чисті випадки — `tests/rules/spell-sources.test.ts`.

**Правило:** data/2024/srd/classes.md — Лицаря-Чаклуна в SRD 5.2.1 немає (див. docs/DECISIONS.md Р41); правило береться з PHB: Intelligence — характеристика замовляння підкласу, і сам проєкт це вже кодифікував (subclass.primary_casting_stat = INT в обох редакціях).

**Має бути:** Лицар-Чаклун 3 з INT 16 і БМ +2: КС = 8+3+2 = 13, атака = +5.

**Є:** КС = 8, атака = +0. Для порівняння, spellcasting-progression.ts і spell-preparation-2024.ts підклас враховують — два шари одного листа розходяться.

**Доказ:** src/lib/components/characterSheet/slides/MagicSlide.tsx:163 читає лише class.primaryCastingStat. У базі class.primary_casting_stat для FIGHTER_2014/2024 і ROGUE_2014/2024 = NULL, а INT лежить на підкласі: `select name, ruleset, spellcasting_type, primary_casting_stat from subclass where name in ('ELDRITCH_KNIGHT','ARCANE_TRICKSTER')` → усі 4 рядки THIRD/INT. MagicSlide.tsx:166-172 при !spellcastingAbility повертає attack=0 і DC=8, і ці значення все одно малюються картками (:673, :685). Той самий пропуск у src/rules/spell-sources.ts:125 (findClassSources фільтрує лише класи), тож джерела заклинань у третинного заклинача немає взагалі.

**Відтворення:** Створити Воїна 2024, підняти до 3-го рівня з підкласом ELDRITCH_KNIGHT, відкрити слайд «Магія».

**Куди дивитись:** Читати pers.subclass?.primaryCastingStat як фолбек у MagicSlide та PDF; додати підклас у findClassSources.

**Файли:** `src/lib/components/characterSheet/slides/MagicSlide.tsx`, `src/rules/spell-sources.ts`, `src/server/pdf/generateCharacterPdf.ts`


### L09-sheet-derived-03 — Швидкість на листі захардкоджена як 30 — швидкість виду, родоводу й Рух без обладунків монаха ігноруються

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-13 (KR31.6). Швидкість виду, варіанта, підвиду й вибору доїжджає з 2026-09-11; Рух без обладунків — `src/rules/unarmored-movement.ts` за рівнем Монаха (не персонажа) і лише без обладунку й щита, спільною для обох редакцій таблицею +10/15/20/25/30. `tests/db/monk-unarmored-movement.test.ts`: Монах 6 2024 — 45, Воїн 8 / Монах 6 2014 — 45, у шкіряному — 30.

**Правило:** data/2024/srd/classes.md §Level 2: Unarmored Movement — «Your speed increases by 10 feet while you aren't wearing armor or wielding a Shield»; Monk Features table рівень 5 → «+10 ft.». data/2024/srd/character-origins.md:257 Goliath — «Speed: 35 feet»; :222 Wood Elf lineage — «Your Speed increases to 35 feet».

**Має бути:** Монах-аасімар 5 без обладунку — 40 футів; голіат 2024 — 35; лісовий ельф — 35; дворф 2014 — 25.

**Є:** 30 для всіх. Жодне джерело швидкості не пише speedBonuses: у src/ його пишуть тільки bonus-actions.ts (ручний бонус користувача), share-actions.ts/snapshots.ts (копіювання) і beast-form.ts (дика форма).

**Доказ:** src/lib/logic/bonus-calculator.ts:393–397: `export function calculateFinalSpeed(pers) { // TODO: Get from race when race has speed field\n  return 30 + getSimpleBonus(pers, "speed"); }`. Поле є: prisma/schema.prisma:928 `speed Int @default(30)` у моделі Race; його читає лише каталог видів (src/components/races/RaceDetailCard.tsx:71, RacesClient.tsx:115,127,316), на листі — ніде (MainStatsSlide.tsx:565 малює calculateFinalSpeed(pers)). SQL: види зі швидкістю ≠30 — DWARF_2014 25, GNOME_2014 25, HALFLING_2014 25, LEONIN_MOOT 35, DHAMPIR_VRGTR 35, CENTAUR_MPMM 40, SATYR_MPMM 35, GRUNG_OGA 25, GOLIATH_2024 35. SQL: race_choice_option.modifies_speed=35 для ELF_2024/«Ельфійський родовід»/«Лісовий ельф» — у src/ це поле не читає ніхто. Програмна збірка фікстури 10: `speed 30`, armors [UNARMORED_DEFENSE_MONK equipped].

**Відтворення:** Зібрати фікстуру 10 (аасімар-монах) до 5-го рівня → лист → картка «Швидкість» = 30. Або створити голіата 2024 чи дворфа 2014.

**Куди дивитись:** calculateFinalSpeed має брати базу з pers.race.speed (+ raceVariant.overridesRaceSpeed, + subrace.speedModifier, + raceChoiceOption.modifiesSpeed). Рух без обладунків потребує поля на Feature (як givesAC) або окремого правила в src/rules/.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `prisma/schema.prisma`

**Скептик:** (1) ПРАВИЛО — перевірив оракул сам, цитати автора точні. `data/2024/srd/character-origins.md`: Goliath «**Speed:** 35 feet»; Wood Elf у таблиці Elven Lineage — «Your Speed increases to 35 feet». `data/2024/srd/classes.md:5166` §Level 2: Unarmored Movement — «Your speed increases by 10 feet while you aren't wearing armor or wielding a Shield», і в Monk Features table рядок рівня 2 має колонку Unarmored Movement = «+10 ft.» (рівні 3–5 теж +10). Редакція названа правильно. Для 2014 в репо оракула немає (`data/2014/srd/01_Races/` містить лише `Racial_Traits.md` без записів видів) — але 2014-половина й не потрібна: сторона 2024 доведена оракулом, а решта тримається на власних даних застосунку.

(2) КОД — спростувати не вдалося, підтверджується сильніше, ніж в автора. `src/lib/logic/bonus-calculator.ts:394-397` — тіло рівно `return 30 + getSimpleBonus(pers, "speed")`; `getSimpleBonus` (там само, 63-77) читає єдине джерело — колонку `pers.speedbonuses`. Репозиторний греп по `speedBonuses` (усі `.ts/.tsx/.sql`, поза `node_modules` і `src/lib/generated`) дає рівно чотирьох писарів: `bonus-actions.ts:174` (ручний бонус із модалки), `share-actions.ts:738` + `snapshots.ts:102` + `pers-duplication.ts:104` (копіювання) і `beast-form.ts:114` (дика форма). У `character-creation.ts` і `levelup-persistence.ts` слова «speed» немає взагалі — тобто база швидкості не фіксується й на створенні. Споживачів функції троє, і всі показують число гравцю: `MainStatsSlide.tsx:565` (плитка) і `generateCharacterPdf.ts:1065,1205` (поле Speed у PDF). Іншого місця, де швидкість рахувалася б правильно (сервер, окреме правило, `src/rules/`), немає.

(3) РІШЕННЯ ВЛАСНИКА — немає. `docs/DECISIONS.md`, розділ «Прийнято» в `docs/KNOWN-BUGS.md` і `docs/o21-user-signals/defects.md` про швидкість персонажа не кажуть нічого; грепи `modifies_speed|modifiesSpeed|Unarmored Movement|Рух без обладунків` по всьому `docs/` — нуль збігів.

(4) IN-FLIGHT — ні. Жоден із зачеплених файлів (`bonus-calculator.ts`, `MainStatsSlide.tsx`, `generateCharacterPdf.ts`) не входить у список паралельної сесії з CONTEXT.

(5) ВІДКРИТИЙ KR — ні. Найближче, що є, — `docs/o24-wildshape-second-layer/kr24.4-second-layer.md:124`, де записано «у `calculateFinalSpeed` іншого каналу немає — вона рахується як `30 + бонус`»; це констатація механізму, вжитого для дикої форми, а не ціль на виправлення й не прийняття.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою CONTEXT («персонаж порахований не за книгою (числа)»): число на листі й у PDF не збігається з книгою для голіата 2024, лісового ельфа обох редакцій, дворфа/гнома/напіврослика 2014 (три з найпопулярніших видів 2014, тобто зачеплена частка з 9 394 бойових персонажів), кентавра, сатира, леоніна, дампіра, ґрунга — і для будь-якого монаха від 2-го рівня. Не знижую.

Єдине уточнення до формулювання автора: «S без Руху без обладунків» справедливе лише для бази виду — родовід і підраса дають ще два непрочитані канали (див. extra_evidence), тож повний ланцюг усе одно M.


### L11-persistence-identity-02 — Бард 2024 не отримує «Майстра на всі руки»: пошук іде за точним `engName` «Jack of All Trades», а фіча 2024 зветься «Bard: Jack of all Trades (2024)»

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-13 (KR31.6). Назви обох редакцій — `JACK_OF_ALL_TRADES_FEATURE_ENG_NAMES` у `src/rules/proficiency.ts`; `tests/db/jack-of-all-trades.test.ts` тримає, що кожна з них — фіча барда 2-го рівня, а інших «Jack of All Trades» у базі немає. До ініціативи половина майстерності (вниз) додається лише в 2014: там «any ability check», а ініціатива — перевірка Спритності (`data/2014/srd/06_Gameplay/Order_of_Combat.md:23`); 2024 звузив рису до перевірок із навичкою (`data/2024/srd/classes.md:896`). Юніт: 2014 `2 ≠ 3` до правки, зняття умови редакції червонить кейс 2024.

**Правило:** data/2024/srd/classes.md, Bard, рівень 2 — Jack of All Trades: половина бонусу майстерності (заокруглена вниз) до перевірок характеристик, у яких немає володіння

**Має бути:** Бард 2024 рівня 2 з PB 2: +1 до кожної перевірки навички без володіння (і до ініціативи).

**Є:** +0 — предикат ніколи не спрацьовує для персонажа RULES_2024.

**Доказ:** src/lib/logic/bonus-calculator.ts:199-208 — `hasFeatureByEngName(pers, engName) { … features.some((f) => String(f.engName ?? "").trim() === engName) }` і `hasJackOfAllTrades(pers) { return hasFeatureByEngName(pers, "Jack of All Trades"); }`; використання на :326 `proficiency === "NONE" && hasJackOfAllTrades(pers)`. Запит до spells_test: `select feature_id, eng_name, ruleset from feature where eng_name ilike '%jack of all%'` → `17913 | "Jack of All Trades" | RULES_2014` і `48872 | "Bard: Jack of all Trades (2024)" | RULES_2024`. Звʼязок: `select cf.*, c.eng_name from class_feature cf join class c using(class_id) where cf.feature_id in (48872,17913)` → `1058 | class_id 340 | feature 48872 | level_granted 2 | BARD_2024`. Рядки не збігаються ні префіксом, ні регістром («all» vs «All»). `grep -rni "jack of all" src/` → лише bonus-calculator.ts, іншого місця, яке дає цей бонус, немає.

**Відтворення:** Зібрати барда 2024 до 2-го рівня (`tests/helpers/build-2024-character.ts` або /2024/char) → лист → будь-яка навичка без володіння показує чистий модифікатор без половини PB.

**Куди дивитись:** Шукати фічу за парою `(engName, ruleset)` або за стабільним ключем, не за рядком показу; корінь — L11-persistence-identity-07.

**Файли:** `src/lib/logic/bonus-calculator.ts`

**Скептик:** Знахідка підтверджується, і мій доказ сильніший за авторський, бо не залежить від знімка бази: `buildFeatureEngNames` у `prisma/seed/classSeed2024.ts:306-314` конструктивно робить кожну класову фічу 2024 виду `"<Клас>: <Фіча> (2024)"`, тож літерал `"Jack of All Trades"` у `hasJackOfAllTrades` для `RULES_2024` недосяжний у принципі. Виконуваний прогін чистої функції (той самий `pers`, різний `engName`) дає 1 проти 0 — правило мовчки зникає. Правило звірено з оракулом (`data/2024/srd/classes.md:894`, рівень 2 барда), редакція та сама. Іншого місця, що дає половину PB, у коді немає: `HALF` ніде не призначається автоматично, а `calculateFinalSkill` — єдиний споживач прапорця, і лист справді вантажить `class.features.feature`. Рішення власника перевірив: `questions.md` питання 4 (закрито 2026-08-28, варіант А) — це не прийняття дефекту, а навпаки, власник тоді ж прямо назвав `hasFeatureByEngName` у `bonus-calculator.ts:199` місцем, що стоїть на глобальній унікальності `engName`; імпорт 2024 назви розвів, а це місце не оновили. У «Прийнято» KNOWN-BUGS і в DECISIONS цього немає, відкритого KR теж немає (згадки JoAT у docs — лише kr13.2 про іменування й kr18.6 про пошук слова «майстер»). Файл не належить паралельній сесії. Серйозність P1 за шкалою: персонаж рахується не за книгою — бард 2024 з 2-го рівня недобирає половину PB на кожній навичці без володіння і в пасивній Уважності PDF; жодного живого постраждалого зараз немає (усі 9 394 персонажі прода — 2014), але це блокер готовності релізу 2024, і жоден тест цього не ловить. Єдина неточність автора — «і до ініціативи» в очікуваному: за формулюванням 2024 JoAT ініціативи не стосується, тож фікс не має її чіпати; на суть це не впливає, знижувати не за що.


### L17-known-registries-01 — BUG-010 живий і сліпий до редакції: тривалий відпочинок видає слоти за загальним рівнем, тож 2024-мультиклас Воїн 3/Чарівник 2 отримує [4,3,2,…] замість [3,0,…]

**Рівень:** P1 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-06 (KR31.12), кейс 2024 додано 2026-09-13 (KR31.6). `longRest` рахує слоти через `getMaximumStandardSpellSlots` за рівнем заклинача. `tests/db/long-rest-spell-slots-2024.test.ts`: Воїн 5 — без слотів, Воїн 3 / Чарівник 2 — `[3,0,0]`; підміна старим `[4,3,2,…]` червонить обидва кейси.

**Правило:** data/2024/srd/character-creation.md:937-942 — «_Spell Slots_. You determine your available spell slots by adding together the following: All your levels in the Bard, Cleric, Druid, Sorcerer, and Wizard classes; Half your levels (round up) in the Paladin and Ranger classes. Then look up this total level in the Level column of the Multiclass Spellcaster table.»

**Має бути:** Воїн 2024 5 рівня (некастер) після longRest має [0,0,0,0,0,0,0,0,0]; Воїн 3 / Чарівник 2 2024 (сумарний рівень кастера 2) — [3,0,0,0,0,0,0,0,0].

**Є:** Обидва отримують [4,3,2,0,0,0,0,0,0] — слоти повного кастера 5 рівня, включно з двома слотами 3 кола, недоступними за книгою.

**Доказ:** src/server/db/rest-actions.ts:369 — `const maxSpellSlots = getMaxSpellSlots(pers.level);` (pers.level = загальний рівень). calculateCasterLevel викликається поруч (рядок 385), але його результат іде лише в пактові слоти (рядок 386); гілки за pers.ruleset у файлі немає. Програмна збірка (scratchpad/audit/work/L17-known-registries/repro.test.ts, 2/2 зелені): FIGHTER_2024 lvl5 after longRest: {"level":5,"ruleset":"RULES_2024","currentSpellSlots":[4,3,2,0,0,0,0,0,0]}; F3/W2 2024 after longRest: {"level":5,"ruleset":"RULES_2024","currentSpellSlots":[4,3,2,0,0,0,0,0,0]}. Golden 2014 підтверджує давніше: tests/golden/derived-state/rest-and-slots.json — паладин 6 (caster level 3) → [4,3,3,…], мультиклас Паладин 2/Чарівник 3/Лицар-містик 3 (caster level 5) → [4,3,3,2,…].

**Відтворення:** bunx vitest run --config /private/tmp/claude-502/-Users-luka-Documents-code-spells-holota-family/0141b135-eeb1-42c1-a811-e88f5d9dced7/scratchpad/audit/work/L17-known-registries/vitest.audit.mts з include на repro.test.ts (створює 2024-персонажів через createCharacter, ставить level=5 і ruleset=RULES_2024, викликає longRest, читає pers.currentSpellSlots).

**Куди дивитись:** У src/server/db/rest-actions.ts перенести читання persForSlots вище й передати getMaxSpellSlots(caster.casterLevel) замість pers.level, з нулями при casterLevel === 0. Пін — зняти KNOWN_BUG: BUG-010 з tests/golden/derived-state/rest-and-slots.json і додати 2024-кейс.

**Файли:** `src/server/db/rest-actions.ts`, `tests/golden/derived-state/rest-and-slots.json`, `docs/KNOWN-BUGS.md`

**Скептик:** (1) ПРАВИЛО — відкрив оракул сам: `data/2024/srd/character-creation.md` (розділ «Spellcasting → _Spell Slots_») дослівно дає суму «All your levels in the Bard, Cleric, Druid, Sorcerer, and Wizard classes; Half your levels (round up) in the Paladin and Ranger classes», і приклад «level 4 Ranger / level 3 Sorcerer → рахується як 5 рівень». Воїн у сумі не бере участі — цитата автора точна й саме для 2024. Для 2014 те саме правило підтверджує golden-фікстура з полем `effectiveCasterLevel`.

(2) КОД — доказ автора точний, лише з уточненням адрес: `src/server/db/rest-actions.ts:369` — `const maxSpellSlots = getMaxSpellSlots(pers.level)`, приватна таблиця `:422-450` індексується рівнем ПЕРСОНАЖА; `calculateCasterLevel` викликається на `:385`, але його результат іде лише в `maxPactSlots` (`:386-387`); `pers.ruleset` у розрахунку слотів не читається взагалі. Іншого місця, яке б це виправляло, немає: `spendSpellSlot` (`src/lib/actions/spell-slots.ts:39-66`) стелі не перевіряє зовсім, а лист рахує максимум ПРАВИЛЬНО (`MagicSlide.tsx:297-306` — від `caster.casterLevel`), тож розбіжність не гаситься, а показується гравцеві.

(3) РІШЕННЯ ВЛАСНИКА — прийняття немає. У `docs/KNOWN-BUGS.md` BUG-010 стоїть у секції «Відкриті» (`:239`, «Статус: відкрито»), у «Прийнято» лише BUG-001…003. У `docs/DECISIONS.md` жодного рішення про слоти після відпочинку немає; навпаки, Р29 (`:1238`) прямо спирається на те, що стеля слотів рахується через `calculateCasterLevel` — тобто книжкова поведінка є нормою проєкту.

(4) IN-FLIGHT — ні: `src/server/db/rest-actions.ts` і golden `rest-and-slots.*` не входять у список файлів паралельної сесії (KR27.7/KR30.3).

(5) ВІДКРИТИЙ KR — окремого KR немає: grep по `docs/` дав BUG-010 лише в `KNOWN-BUGS.md`, `docs/o2-characterization/kr2.4-*`, `kr2.5-*` (де він і зафіксований як знахідка) і в golden. У `o18-2024-character-parity` та `o27-multiclass-2024` згадок нуль — тобто на реліз 2024 його ніхто не заплановано лагодити.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою CONTEXT: персонаж рахується не за книгою (похідний стан листа), і це не косметика — `spendSpellSlot` не має стелі, тож зайві слоти витрачаються. Не P0: падіння й втрати введених гравцем даних немає, перезаписується лише похідне поле. Одне уточнення до формулювання автора: у самому `MagicSlide` кнопки кіл із `max = 0` вимкнені (`:711`), тому два фантомні слоти 3 кола там не клікаються — зате гравець бачить «4/0» і «4/3», а зайвий слот 1 кола (4 замість 3 у F3/W2) витрачається штатно. На вердикт і серйозність це не впливає.


### P1-human-fighter-08 — Бойовий стиль «Оборона» не додає +1 до КЗ — Кольчуга дає 16 замість 17

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Статус:** ✅ закрито раніше (KR31.4), звірено 2026-09-13. `Fighting Style: Defense (2024)` несе `gives_ac = 1`, `requires_armor_for_ac_bonus = true` і в `spells_test`, і в робочій базі; дані тримає `tests/db/feat-mechanics-2024-seeded.test.ts`, КЗ — golden `tests/golden/derived-state/ac.test.ts`.

**Правило:** data/2024/srd/feats.md:91-95 — Defense: «While you're wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class.»

**Має бути:** КЗ 17 (Кольчуга 16 + Оборона 1)

**Є:** КЗ 16 — числовий ефект бойового стилю не змодельовано

**Доказ:** Лист: «КЛАС БРОНІ 16», блок обладунку «Кольчуга … АКТИВНИЙ … БАЗ. КБ 16» (shots/P1-human-fighter-19-sheet-lvl1.png). Персонаж носить кольчугу (pers_armor: armor_id 357, equipped true, is_proficient true) і має фічу (pers_feature 107). Запит: select feature_id, eng_name, modifies_ac from feature where feature_id=49282 → {"Fighting Style: Defense (2024)", modifies_ac: null}.

**Відтворення:** Створити Воїна 2024 з бойовим стилем Оборона і кольчугою → відкрити лист → блок «КЛАС БРОНІ»

**Куди дивитись:** Проставити modifies_ac = 1 фічі «Fighting Style: Defense (2024)» у джерелі сіду (Р33 — правити файл, не прохід по базі) і переконатися, що bonus-calculator читає modifiesAC для фіч-виборів

**Файли:** `data/2024/normalized/feats.json`, `prisma/seed/`, `src/lib/logic/bonus-calculator.ts`


### L01-species-07 — Немає системи опору до шкоди: опір дракононародженого, дворфа, тифлінга й аасімара живе лише в тексті риси

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-13 (KR31.6) для видів. `feature.damage_resistances` несе тип шкоди на 49 фічах видів обох редакцій (сід `seed:species-senses`), `calculateDamageResistances` зводить їх; «Головна» показує рядок «Опори», PDF — рядок «Опори» в блоці «Чуття й опори». Поза межами: опори від підкласів, заклинань і магічних предметів — колонка є, реєстру для них немає.

**Правило:** data/2024/srd/character-origins.md:146 «_Damage Resistance._ You have Resistance to the damage type determined by your Draconic Ancestry trait»; :168 Dwarven Resilience (Poison); :341-355 таблиця Fiendish Legacies (Poison/Necrotic/Fire); species.json Aasimar Celestial Resistance (Necrotic + Radiant)

**Має бути:** Лист показує блок опорів («Вогонь», «Отрута»…), зібраний з рис виду, підкласу й предметів, як це робить D&D Beyond.

**Є:** Гравець читає «Ви маєте опір до шкоди вогнем» усередині опису риси й тримає це в голові.

**Доказ:** `grep -rni "resistan|опір" src/lib/components/characterSheet/ src/lib/logic/ src/rules/ --include=*.ts --include=*.tsx` — жодного збігу. У model Pers немає поля опорів; у model Feature є savingThrows, bonusToSavingThrows, modifiesAC, givesAC — але нічого про опір до типу шкоди.

**Відтворення:** grep -rni "resistan\|опір" src/lib/components/characterSheet/ src/lib/logic/ src/rules/ → порожньо.

**Куди дивитись:** Виведене поле (не DDL): зібрати типи шкоди з обраних race_choice_option/traits за ключем у даних, показати в MainStatsSlide поруч зі швидкістю. Потребує машиночитного поля в даних видів — зараз опір є лише прозою.

**Файли:** `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `data/2024/normalized/species.json`, `prisma/seed/raceSeed2024.ts`

**Скептик:** (1) ПРАВИЛО — оракул підтверджений дослівно: `data/2024/srd/character-origins.md` «_Damage Resistance._ You have Resistance to the damage type determined by your Draconic Ancestry trait», «_Dwarven Resilience._ You have Resistance to Poison damage», таблиця Fiendish Legacies («Abyssal — You have Resistance to Poison damage»); аасімарський «Celestial Resistance» — у `data/2024/normalized/species.json:17-20` (поза SRD). 2014 має те саме: `prisma/seed/raceFeatureSeed.ts:127-136,214-217` (Hellish/Celestial/Draconic Resistance). Тож `edition: both` правильне.

(2) КОД — обробки немає ніде, і я довів це сильніше за автора. Ключове: концепт у системі **є, але лише для монстрів** — `prisma/schema.prisma:320-338` (`damageImmunity`, `damageResistance`, `damageVulnerability`) належать `model Creature`, а не `Pers`; `model Feature` (поля до `bonusHitPointsPerLevel`) не має жодного поля опору. Друк це показує наочно: `src/server/pdf/creaturesPdf.ts:99` друкує «Опір до ушкоджень» для істоти, а в `src/server/pdf/generateCharacterPdf.ts` слова «resistance/опір» немає взагалі. Перевірка `grep -rniI "імунітет|вразлив|стійк|резист" src/lib/components/characterSheet/ src/app/char/ src/server/pdf/featuresPdf.ts src/server/pdf/printProjection.ts` — порожньо. Єдиний збіг у листі — `WeaponCustomizeModal.tsx:186` («Впливає на ігнорування опору», прапорець зброї), не система опорів персонажа.

(3) РІШЕННЯ ВЛАСНИКА — немає. `docs/KNOWN-BUGS.md:137-152` (BUG-005) вже фіксує, що «опір/резист до типів шкоди в бойовій логіці взагалі не змодельований … (character sheet, не combat simulator)», але цей запис стоїть у розділі **«Відкриті»**, статус «відкрито», і це формулювання аудиту, а не рішення власника: у `docs/DECISIONS.md` нічого про межу «лист vs симулятор» немає, у «Поза межами» O18 і O27 опору теж немає. Тож `accepted` не проходить.

(4) IN-FLIGHT — ні; файли паралельної сесії стосуються підготовки заклинань і мультикласу.

(5) ВЖЕ ВІДКРИТО — окремого KR немає, але цільова картина власника його **вимагає**: `docs/o18-2024-character-parity/reference-2024.md:166` («Resistance: Fire» під вибором Draconic Ancestry) і `:997` у блоці «Builder має правильно отримати» → «Fire Resistance»; `kr18.4-species-choices.md:14,18` називають опір ефектом вибору. KR18.4 закрив вибори (вони справді зберігаються), але опір із них не виводиться. BUG-005 — часткове перекриття по кореню, не дублікат: він про фіт Elemental Adept, знахідка — про види й лист.

(6) СЕРЙОЗНІСТЬ — P2 підтверджую, підвищувати до P1 не можна. Інформація гравцеві не губиться: конкретний тип шкоди стоїть у прозі обраної опції — `prisma/seed/speciesChoices2024.ts:79`: `description: "Ваш Подих завдає шкоди ${damage}. Ви також маєте опір до шкоди ${damage}."`, і `FeaturesSlide.tsx:516-518` малює опис риси. Плюс є ручні поля-запобіжники в `model Pers` (`customFeatures`, `notes`, `customProficiencies`). Отже жодне число не пораховане не за книгою і жоден вибір не втрачено — це саме «немає можливості, яку має зрілий білдер» (P2), ефорт L (потрібне структуроване поле + зведення з видів, підкласів і предметів).

Єдина претензія до автора — форма доказу, не висновок: його команда `grep -rni "resistan|опір" … --include=*.ts` у zsh падає до запуску grep («no matches found: --include=*.ts»), тобто той конкретний рядок нічого не доводить. Після перезапуску з лапками результат той самий — порожньо.


### L01-species-08 — Темнозір і відчуття ніде не зведені: на листі дроу одночасно лежать «60 футів» і «зростає до 120 футів»

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-13 (KR31.6). `feature.darkvision_range` на 13 фічах видів, `calculateDarkvisionRange` бере найбільшу дальність: дроу 2014 і 2024 — 120, одним рядком «Темнозір» на «Головній» і в PDF. Поза межами: джерела, що *додають* дальність (Umbral Sight, Окуляри нічного зору), полем не описуються.

**Правило:** data/2024/srd/character-origins.md:166 Dwarf «Darkvision with a range of 120 feet»; :319 Orc — 120; решта видів — 60; :184 Drow «The range of your Darkvision increases to 120 feet»

**Має бути:** Лист показує «Темнозір 120 фт» одним значенням, зведеним із виду й родоводу.

**Є:** Числа лишаються в двох описах рис і суперечать одне одному; у друці відчуттів немає взагалі.

**Доказ:** `grep -rni "darkvision|темнозір" src/` поза src/lib/generated/ дає лише каталог рас (src/components/races/RacesClient.tsx:59,83) і довідник правил (src/lib/rulesData.ts) — на листі персонажа жодної згадки. MainStatsSlide.tsx має плитку «Швидкість» (:564) і блок «Мови» (:936), блока відчуттів немає. Через це у дроу в списку рис стоять дві риси з різними числами: «Elf: Darkvision (2024)» = 60 футів і «Elven Lineage: Drow (2024)» = «зростає до 120 футів», і система не каже, яке чинне.

**Відтворення:** Зібрати ельфа-дроу, відкрити слайд Рис — дві риси з різними дальностями; MainStats відчуттів не показує.

**Куди дивитись:** Виведене значення в bonus-calculator (max із рис виду) + рядок «Відчуття» в MainStatsSlide і PDF; потребує машиночитного поля дальності в даних видів.

**Файли:** `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `src/lib/logic/bonus-calculator.ts`, `prisma/seed/raceSeed2024.ts`

**Скептик:** (1) ПРАВИЛО — підтверджено, але номери рядків у автора зсунуті. `data/2024/srd/character-origins.md`: :170 Dwarf «You have Darkvision with a range of 120 feet», :321 Orc — 120, :158/:188/:243/:333 (дракононароджений, ельф, гном, тифлінг) — 60, :210 таблиця ельфійських родоводів, Drow — «The range of your Darkvision increases to 120 feet». Автор указав :166/:319/:184 — цитати дослівні, рядки хибні на 2–26.

(2) КОД — незалежно підтверджено. `grep -rni "darkvision|темнозір" src/` поза `src/lib/generated/` дає лише каталог рас (`src/components/races/RacesClient.tsx:59,83` — фільтр за назвою риси) і довідник (`src/lib/rulesData.ts`, `surnames.ts`). Немає ані зведеного поля, ані місця для нього: `model Race` (prisma/schema.prisma) має `speed/burrowSpeed/flightSpeed/swimSpeed/climbSpeed`, але **жодного** стовпця темнозору; у `model Feature` немає жодного поля класу «чуття» (є `savingThrows`, `modifiesAC`, `givesLanguages` тощо). У PDF єдине похідне «чуття» — `generateCharacterPdf.ts:1091 setTextIfPresent(form,"Passive",…)` (пасивна Уважність); поля Senses немає.

Дві суперечливі риси дроу підтверджені запитом до `spells_test`: `Elf: Darkvision (2024)` = «Ви маєте темнозір на відстань 60 футів», `race_choice_option.Drow` = «Дальність вашого темнозору зростає до 120 футів». `FeaturesSlide.tsx:278-285` малює і `RACE`, і `RACE_CHOICE`, тож гравець бачить обидва тексти й жодного зведення.

(3) РІШЕННЯ ВЛАСНИКА — немає. `docs/KNOWN-BUGS.md` «Прийнято» містить лише BUG-001…003 (сервер довіряє UI); єдина згадка темнозору там — розділ «Б» (термінологія «Темний зір» у Своїй расі). `docs/DECISIONS.md` про темнозір/чуття персонажа нічого не каже (:876 — це Р20 про маркери в механічних полях).

(4) IN-FLIGHT — ні: `MainStatsSlide.tsx`, `bonus-calculator.ts`, `raceSeed2024.ts` не в списку файлів паралельної сесії.

(5) ВІДКРИТИЙ KR — не знайшов. `docs/o18-2024-character-parity/reference-2024.md` (1 556 рядків) не згадує ні темнозору, ні чуттів; у `docs/o21-user-signals/defects.md` теж нічого. Тобто ціль на це не заведена.

(6) СЕРЙОЗНІСТЬ — P2 правильна. Персонаж не рахується не за книгою: обидва тексти дослівно з книги (книга сама формулює це як «60» + «зростає до 120»), вибір гравця не губиться. Бракує саме можливості зрілого білдера — рядка «Темнозір 120 фт» у зведенні. На P1 не тягне.

Дві неточності в доказі автора, які я виправляю, але вони суті не міняють: (а) «у друці відчуттів немає взагалі» — надто сильно: сторінка «Здібності» друку проводить обидва тексти через `groupCharacterFeaturesForPdf` (`src/server/pdf/groupCharacterFeatures.ts:70-118` штовхає `pers.features` і `pers.raceChoiceOptions`), тож число в друці є — немає **зведеного поля**; (б) «два суперечливі числа» — це не розбіжність даних, а відсутність зведення, тому класифікація саме `missing-system`, а не `bug`.


### L09-sheet-derived-08 — Пасивних Сприйняття, Аналізу й Проникливості на листі немає — вони рахуються тільки у PDF

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** S · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-11 (KR31.6). Пасивні Сприйняття, Аналіз і Проникливість на «Головній» рахує `calculatePassiveSkill` тим самим `calculateFinalSkill`, що й PDF.

**Правило:** n/a (можливість зрілого білдера: D&D Beyond, Roll20, Foundry показують пасивні перевірки на першому екрані)

**Має бути:** Пасивні Сприйняття/Аналіз/Проникливість видно на листі.

**Є:** Гравець мусить рахувати їх сам або друкувати PDF.

**Доказ:** src/server/pdf/generateCharacterPdf.ts:1090: `const passivePerception = 10 + calculateFinalSkill(pers, Skills.PERCEPTION).total;`. У src/lib/components/characterSheet/ слова «Пасивн» немає ніде, крім заголовка секції «Пасивні здібності» у FeaturesSlide.tsx:314 (це про риси, не про перевірки). Значення для зібраних фікстур (порахував вручну тим самим calculateFinalSkill): 01 → 10/9, 03 → 12/14, 07 → 11/9, 10 → 13/10.

**Відтворення:** Відкрити лист будь-якого персонажа → слайд «Навички»: пасивних чисел немає.

**Куди дивитись:** Три числа в SkillsSlide, формула вже є (10 + calculateFinalSkill).

**Файли:** `src/lib/components/characterSheet/slides/SkillsSlide.tsx`


### L09-sheet-derived-10 — Володіння (броня/зброя/інструменти) і мови — вільний текст, знятий один раз при створенні, а не похідна величина

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-13 (KR31.6) рішенням власника «похідний список + текст». `collectDerivedProficiencies` (`src/rules/derived-proficiencies.ts`) зводить фіксовані надання обладунків, зброї, інструментів і мов; `calculatePersProficiencies` (`src/lib/logic/pers-proficiencies.ts`) бере вид, підвид, вибори виду, передісторію, основний клас, пакет мультикласу, підкласи, риси й активні фічі. Лист показує блок «З джерел персонажа» над полями «Володіння» й «Мови», PDF — перед ручним текстом без дублікатів рядків. Вибори (мова чи інструмент на вибір) живуть у тексті, як і раніше; текст наявних персонажів не чиститься. `tests/db/pers-proficiencies.test.ts`: дворф Воїн 3 / Пройдисвіт 2 2014; без пакета мультикласу — `[] ≠ [THIEVES_TOOLS]`.

**Правило:** n/a (можливість зрілого білдера: володіння перераховуються з усіх джерел — вид, походження, клас, підклас, риси, мультиклас)

**Має бути:** Володіння перераховуються з джерел так само, як навички; предмет чи риса, що дає володіння, доїжджає на лист.

**Є:** Знімок тексту на момент створення; виправити помилку можна лише руками; жодного зв’язку з реальними джерелами.

**Доказ:** MainStatsSlide.tsx:911 — textarea з pers.customProficiencies («Володіння (броня/зброя/інструменти)»); :938 — textarea «Мови» з pers.customLanguagesKnown. Текст збирається один раз у src/server/db/character-creation.ts:660–713 (profLines.join("\n")) і :750–753, потім лише дозливається рядками при підвищенні рівня — levelup-persistence.ts:1191 (mergeUniqueLines) і :1220.

**Відтворення:** Створити персонажа, потім додати рису, що дає володіння зброєю → у полі «Володіння» нічого не змінюється.

**Куди дивитись:** Рахувати володіння як похідне з тих самих джерел, що й навички (src/rules/), а текстове поле лишити для ручних доповнень.

**Файли:** `src/server/db/character-creation.ts`, `src/server/db/levelup-persistence.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`


### L19-parity-competitors-10 — Жодне число на листі не пояснює, звідки воно: розкладки бонусів немає, а базова характеристика збережена вже згорнутою

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-13 (KR31.6) рішенням власника «похідні без DDL». `explainFinalStat/Save/Skill/AC/Speed/Initiative` у `bonus-calculator.ts` повертають складники з назвами; характеристика, ряткидок, навичка й ініціатива рахуються як їхня сума, КЗ і швидкість — через `explainArmorClass` і `explainWalkingSpeed` у правилах, тож розійтися з числом розкладка не може. `ModifyStatModal` показує її при натисканні. База характеристики лишається згорнутою — «+2 від походження» після створення без DDL не відновити.

**Правило:** n/a (паритет: DDB на кожному числі показує розкладку «Base + Dex + Armor…»; Foundry — список активних ефектів)

**Має бути:** Натиснувши на КБ, характеристику, ряткидок чи СК заклинань, гравець бачить складники з назвою джерела кожного.

**Є:** Видно тільки підсумок і власний ручний бонус; звірити з книгою можна лише перерахувавши все руками.

**Доказ:** Усі функції `src/lib/logic/bonus-calculator.ts` повертають скаляр: `:245-247` `export function calculateFinalStat(pers, ability) { return getBaseStat(pers, ability) + getStatBonus(pers, ability); }`; так само `calculateFinalAC` (:339), `getSaveBonus`, `getSkillBonus`. Внески за джерелами ніде не зберігаються: `Pers.str/dex/con/int/wis/cha` — вже підсумкові числа, тож «+2 від походження» після створення не існує як факт. `grep -rni "breakdown|provenance|розклад|звідки" src/lib/components/characterSheet src/lib/logic/bonus-calculator.ts` — жодного збігу поза коментарем у BeastFormMarks.tsx:19.

**Куди дивитись:** Повертати з bonus-calculator структуру {total, parts:[{label, value, source}]} і малювати її в ModifyStatModal; базові внески (вид/походження/ASI) зберігати окремо, а не згортати в Pers.str.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `src/lib/components/characterSheet/ModifyStatModal.tsx`, `prisma/schema.prisma`


## Види (11)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P1 | 2024 | bug | `L01-species-02` | Швидкість 35 лісового ельфа не застосовується: race_choice_option.modifies_speed не читає жоден рядок коду | src/server/db/character-creation.ts, src/lib/logic/bonus-calculator.ts |
| · | P1 | 2024 | data | `L01-species-03` | Жодна риса виду 2024 не має обмежених використань: дев'ять рис із лічильником у книзі стали PASSIVE-текстом | prisma/seed/raceSeed2024.ts, data/2024/normalized/species.json |
| ✓ | P1 | 2024 | data | `L01-species-04` | Аасімар не отримує замовляння «Світло» від риси «Світлоносець» — і не має характеристики замовляння виду | prisma/seed/speciesChoices2024.ts, src/rules/spell-sources.ts |
| ✓ | P1 | 2024 | data | `L01-species-05` | Людська «Вправність» (володіння однією навичкою на вибір) не реалізована ніде — ні в даних, ні в коді | prisma/seed/raceSeed2024.ts, src/lib/components/characterCreator/SkillsForm.tsx |
| · | P1 | 2024 | data | `P1-human-fighter-06` | Риса Людини «Вправність» (Skillful) не дає володіння навичкою — вибору немає ніде | data/2024/normalized/species.json, src/lib/generated/creator-content-2024.json |
| · | P1 | 2024 | bug | `P2-elf-wizard-04` | Замовляння родоводу (Prestidigitation від High Elf) не видається — персонаж створюється взагалі без жодного заклинання | src/rules/spell-sources.ts, src/server/db/character-creation.ts |
| · | P1 | 2024 | bug | `P5-druid-secondary-flows-08` | Лісовий ельф 2024: швидкість 35 футів не застосовується — лист показує 30, хоча значення лежить у базі | src/lib/logic/bonus-calculator.ts, prisma/schema.prisma |
| · | P1 | 2024 | data | `P6-class-sweep-level1-09` | Риса Людини 2024 «Skillful» не дає навички за вибором | prisma/seed/, data/2024/normalized/species.json |
| ✓ | P2 | both | missing-system | `L01-species-06` | Вибору розміру Small/Medium немає ніде: Людина, Тифлінг і Аасімар не можуть бути Малими, а розмір персонажа взагалі не зберігається | prisma/schema.prisma, prisma/seed/raceSeed2024.ts |
| · | P2 | 2024 | missing-system | `P1-human-fighter-10` | Людина 2024 не може обрати розмір (Середній або Малий) — кроку немає, pers.size ніколи не пишеться | src/lib/components/characterCreator/creation-step-resolver.ts, src/server/db/character-creation.ts |
| · | P3 | both | bug | `L01-species-11` | Володіння від «Гострих чуттів» зберігається у форматі, який серверний парсер мовчки викидає — гілка виглядає робочою, але завжди порожня | src/server/db/character-creation.ts, src/server/db/json.ts |

### L01-species-02 — Швидкість 35 лісового ельфа не застосовується: race_choice_option.modifies_speed не читає жоден рядок коду

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-13 (KR31.6). `modifies_speed` тепер читається й **додається** до швидкості виду, як у Прудконогості напівельфа 2014 (+5). Сід лісового ельфа 2024 тримав абсолютні 35, що дало б 65, — джерело `speciesChoices2024.ts` виправлено на +5. Гейт `tests/db/species-speed.test.ts`: швидкість виду + модифікатор = число з тексту опції; лісовий ельф через `getPersById` — 35.

**Правило:** data/2024/srd/character-origins.md:186 — «Wood Elf … Your Speed increases to 35 feet. You also know the Druidcraft cantrip.»

**Має бути:** Після вибору родоводу «Лісовий ельф» швидкість персонажа 35.

**Є:** Значення лежить у базі мертвим; швидкість лишається базовою (а через L01-species-01 — взагалі 30).

**Доказ:** У базі значення є: SELECT option_name_eng, modifies_speed FROM race_choice_option WHERE option_name_eng='Wood Elf' → «Wood Elf | 35». Поле є у схемі (prisma/schema.prisma:969 modifiesSpeed Int? @map("modifies_speed")) і потрапляє в src/lib/generated/creator-content-2024.json. Але `grep -rn "modifiesSpeed" src/ --include=*.ts --include=*.tsx | grep -v src/lib/generated` не дає жодного збігу — значення не читає ніхто.

**Відтворення:** grep -rn "modifiesSpeed" src/ --include="*.ts" --include="*.tsx" | grep -v generated → порожньо. Створити ельфа-лісовика в конструкторі 2024 → плитка «Швидкість» на листі = 30.

**Куди дивитись:** Або src/server/db/character-creation.ts кладе різницю (modifiesSpeed − race.speed) у pers.speedBonuses при записі обраних raceChoiceOptions, або calculateFinalSpeed читає обрані опції. Разом із L01-species-01 — одна правка.

**Файли:** `src/server/db/character-creation.ts`, `src/lib/logic/bonus-calculator.ts`, `prisma/seed/speciesChoices2024.ts`


### L01-species-03 — Жодна риса виду 2024 не має обмежених використань: дев'ять рис із лічильником у книзі стали PASSIVE-текстом

**Статус:** ✅ закрито 2026-09-08 ([KR31.3](kr31.3-feature-resources-2024.md)). Дванадцять рис видів мають лічильник у файлі, у базі й на листі; девʼять із них — саме ті, що перелічені нижче. Числа виведені зі сторінок `data/2024/source/raw/species/` і звірені другим читанням SRD; гейти — `tests/content/species-trait-uses-2024.test.ts`, `tests/db/species-trait-uses-2024-seeded.test.ts`, наскрізно — `tests/db/species-resource-2024-rest.test.ts`. Хвіст, що лишився: тип дії шести дарів Велетенського походження (Стрибок хмар — Бонусна дія, Камʼяна стійкість і Грім бурі — Реакції) живе у `prisma/seed/speciesChoices2024.ts` і в цей прохід не входив.

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:144 «You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest»; :150 Draconic Flight «Once you use this trait, you can't use it again until you finish a Long Rest»; :172-174 Stonecunning (PB/Long Rest); :261 Giant Ancestry (PB/Long Rest); :273 Large Form (1/Long Rest); :315-317 Adrenaline Rush (PB/Short or Long Rest); :321 Relentless Endurance (1/Long Rest); data/2024/normalized/species.json Aasimar → Healing Hands і Celestial Revelation (1/Long Rest)

**Має бути:** Подих = PB використань/довгий відпочинок і Бонусна дія; Каменярство = PB/довгий; Викид адреналіну = PB/короткий чи довгий, Бонусна дія; Невгамовна витривалість, Велика форма, Драконячий політ, Цілющі руки, Небесне одкровення = 1/довгий; Велетенське походження = PB/довгий (Стійкість каменю — Реакція).

**Є:** Усі — пасивний текст без лічильника; відпочинок нічого не відновлює, кнопки використання немає, тип дії не показано. Гравець 2014 має лічильник на тій самій расі, гравець 2024 — ні.

**Доказ:** Усі 39 рядків race_trait редакції 2024 мають display_type='{PASSIVE}', limited_uses_per=NULL, uses_count=NULL, uses_count_depends_on_proficiency_bonus=false — див. дамп у probe-out.txt (блок «SPECIES FEATURES» усіх десяти персонажів: «[uses=-/- pb=false]»), і POOLS: [] у кожного. Корінь у сіді: prisma/seed/raceSeed2024.ts:73-90 створює КОЖНУ рису виду з displayType:[FeatureDisplayType.PASSIVE] і ніколи не задає limitedUsesPer/usesCount/usesCountDependsOnProficiencyBonus, бо data/2024/normalized/species.json таких полів не має. У 2014 те саме працює: ORC_MPMM | Adrenaline Rush | {BONUSACTION} | uses NULL/LONG_REST pb=true; ORC_MPMM | Relentless Endurance | {PASSIVE} | uses 1/LONG_REST (prisma/seed/raceFeatureSeed.ts:354-365).

**Відтворення:** SELECT r.name, f.eng_name, f.display_type, f.limited_uses_per, f.uses_count, f.uses_count_depends_on_proficiency_bonus FROM race r JOIN race_trait rt ON rt.race_id=r.race_id JOIN feature f ON f.feature_id=rt.feature_id WHERE r.ruleset='RULES_2024' → у всіх 39 рядках {PASSIVE}/NULL/NULL/false.

**Куди дивитись:** Донести поля використань у data/2024/normalized/species.json (або таблицею в prisma/seed/raceSeed2024.ts, як це зроблено для 2014 у raceFeatureSeed.ts) і перелити сідом. DDL не потрібен — стовпці у feature вже є.

**Файли:** `prisma/seed/raceSeed2024.ts`, `data/2024/normalized/species.json`, `prisma/seed/raceFeatureSeed.ts`


### L01-species-04 — Аасімар не отримує замовляння «Світло» від риси «Світлоносець» — і не має характеристики замовляння виду

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-13 (KR31.5). Сід `speciesChoices2024.ts` звʼязує «Світлоносця» зі «Світлом», а `findSpeciesSource` бере Харизму з `FIXED_TRAIT_SPELLCASTING_ABILITIES` — колонки для характеристики, яку риса називає сама, у схемі немає, і DDL заради одного запису не заводився. Аасімар 2024 створюється зі «Світлом» і джерелом `Aasimar: Light Bearer (2024) · CHA`. Приймальну фікстуру `10-aasimar-monk-hermit` перезнято: вона закріпила дефект порожніми `spellSources` і `grantedSpells`.

**Правило:** data/2024/normalized/species.json, Aasimar → Light Bearer: «You know the Light cantrip. Charisma is your spellcasting ability for it.» (риса поза SRD, тому оракул — нормалізовані дані PHB 2024)

**Має бути:** Аасімар рівня 1 має замовляння Світло з джерелом «Світлоносець» і Харизмою як базовою характеристикою.

**Є:** Замовляння немає взагалі; риса присутня лише описом.

**Доказ:** Персонаж 10-aasimar-monk-hermit, рівень 5 (probe-out.txt): SPECIES FEATURES містить «Aasimar: Light Bearer (2024)», але RACE SPELLS порожньо і ALL SPELLS порожньо. Запит: SELECT f.eng_name, count(fs."B") FROM feature f LEFT JOIN "_FeatureToSpell" fs ON fs."A"=f.feature_id WHERE f.eng_name LIKE 'Aasimar:%' GROUP BY 1 → у всіх восьми рис 0. У решти видів звʼязки є: «Elven Lineage: High Elf (2024) -> Prestidigitation», «Fiendish Legacy: Infernal (2024) -> Fire Bolt», «Tiefling: Otherworldly Presence (2024) -> Thaumaturgy», «Gnome: Forest Gnome (2024) -> Minor Illusion, Speak with Animals». Саме заклинання в базі є: spell_id=1564 Light, level 0, RULES_2024. Друга половина: аасімар — єдиний вид 2024 без жодного race_choice_option (probe-out.txt: OPTIONS порожньо), а src/rules/spell-sources.ts:145-157 бере характеристику виду тільки з опції, що має spellcastingAbility+traitFeature — тож навіть після додання звʼязку ability буде null замість CHA.

**Відтворення:** Прогнати scratchpad/audit/work/L01-species/species-probe.test.ts → блок 10-aasimar-monk-hermit: «RACE SPELLS:» порожній рядок.

**Куди дивитись:** prisma/seed/speciesChoices2024.ts — додати «Aasimar: Light Bearer (2024)» → ["Light"] у TRAIT_SPELLS; характеристику дати або фіксовано CHA у findSpeciesSource, або окремим race_choice_option з єдиним варіантом.

**Файли:** `prisma/seed/speciesChoices2024.ts`, `src/rules/spell-sources.ts`, `data/2024/normalized/species.json`

**Скептик:** ПРАВИЛО. Оракул підтверджено дослівно: `data/2024/normalized/species.json`, Aasimar → trait `Light Bearer`, `descriptionEng`: «You know the Light cantrip. Charisma is your spellcasting ability for it.» Це PHB 2024 (поза SRD), редакція вказана правильно (`"ruleset": "RULES_2024"` у тому ж записі).

ДАНІ (власний незалежний запит до `spells_test`). Замовляння в базі є — `spell_id=1564 Light, level 0, RULES_2024`. Звʼязку немає: усі вісім `Aasimar: %` рис мають 0 рядків у `_FeatureToSpell` (зокрема `Aasimar: Light Bearer (2024)`, feature_id 48525). Серед **усіх** `race_trait` редакції 2024 звʼязок із заклинанням має рівно одна риса — `Tiefling: Otherworldly Presence (2024) → Thaumaturgy`. `race_choice_option` для `AASIMAR_2024` — нуль рядків (для порівняння, ELF/GNOME/TIEFLING мають групу «Базова характеристика заклинань»).

ПРИЧИНА В СІДІ. `prisma/seed/speciesChoices2024.ts:238-240` — `const TRAIT_SPELLS = [{ traitEngName: "Tiefling: Otherworldly Presence (2024)", spells: ["Thaumaturgy"] }]` — і це весь список; аасімара в ньому немає. Паритет із 2014 зламано: `prisma/seed/raceFeatureSeed.ts:422-431` для 2014-ї риси `Light Bearer` має `givesSpells: { connect: [{ engName_ruleset: { engName: "Light", … } }] }`, і запит показує 1 звʼязок у feature_id 1575. Тобто аасімар 2014 замовляння отримує, аасімар 2024 — ні.

КОД — іншого шляху немає. Заклинання виду матеріалізуються рівно з `findGrantedSpells` (`src/rules/spell-sources.ts:89`), яка збирає ідентифікатори тільки з `feature.givesSpells` рис виду й з обраних `race_choice_option` (`collectSpeciesSpellIds`, `collectEarnedLeveledSpellIds`). Її два виклики — створення (`src/server/db/character-creation.ts:356` → `buildSpeciesPersSpellRows`) і підвищення рівня (`src/server/db/species-level-grants.ts:49`, `levelup-persistence.ts:1377`). Порожній `givesSpells` ⇒ жодного рядка `pers_spell` ні при створенні, ні при підвищенні, ні при ремонтному прогоні. Хардкоду «Світлоносця» ніде немає: `grep -rn "Light Bearer|Світлоносець" src/ --include=*.ts --include=*.tsx` поза `src/lib/generated/` — порожньо; у `tests/`, `scripts/`, `docs/` — теж порожньо.

РІШЕННЯ ВЛАСНИКА — немає. `docs/DECISIONS.md` (Р20–Р39, зокрема Р24, Р28, Р38) нічого про текстові-без-механіки заклинання видів не приймає; «Прийнято» в `docs/KNOWN-BUGS.md` містить лише BUG-001…003 про серверну довіру до UI. Навпаки, `docs/o18-2024-character-parity/kr18.4-species-choices.md` («✅ зроблено») прямо декларує: «Матеріалізуються тільки ті заклинання, які правило називає поіменно — заклинання видів», а в таблиці видів у рядку Aasimar стоїть лише `Celestial Revelation` — тобто аасімара просто пропустили, а не виключили свідомо.

IN-FLIGHT — ні. Жоден із задіяних файлів (`speciesChoices2024.ts`, `src/rules/spell-sources.ts`, `src/server/db/species-level-grants.ts`, `character-creation.ts`) не входить до списку паралельної сесії KR27.7/KR30.3.

ВІДКРИТИЙ KR — не знайдено: у `docs/` немає жодної згадки `Light Bearer`/«Світлоносець», а KR18.4 і KR18.5 закриті.

ПОПРАВКИ ДО ДОКАЗУ АВТОРА (не міняють вердикту).
1) Формулювання «у решти видів звʼязки є … Elven Lineage: High Elf (2024) → Prestidigitation» неточне щодо таблиці: ці риси **не** є рядками `race_trait` (сід їх звідти знімає — `releaseLineageOptionsFromRaceTraits`, `speciesChoices2024.ts:257-263`), вони висять на `race_choice_option.traits`. Звʼязки в них справді є (High Elf 1, Infernal 1, Forest Gnome 2 — перевірив), тож висновок «в аасімара нуля бракує» лишається.
2) «Друга половина» (характеристика буде `null` замість CHA) на рівні коду правильна — `src/rules/spell-sources.ts:165` у фолбеку віддає `ability: null`. Але сьогодні вона нікого не зачіпає: `loadPersSpellSources` (`src/server/db/spell-sources.ts:11`) викликається **лише** з тестових хелперів (`tests/helpers/build-2024-character.ts:318`, `build-2024-multiclass-character.ts:402`), а `pers_spell` характеристику не зберігає (`buildSpeciesPersSpellRows` пише лише `sourceName`/бейдж). Тобто це латентна прогалина «на потім», а не другий видимий дефект — важливість цієї половини нижча, ніж у звіті.

СЕРЙОЗНІСТЬ. P1 за шкалою CONTEXT: персонаж рахується не за книгою — у аасімара 2024 бракує замовляння, яке правило дає безумовно на 1-му рівні (і яке аасімар 2014 у цьому ж продукті отримує). Не P0 (нічого не падає, персонаж створюється), не P2 (це не «немає можливості зрілого білдера», а розбіжність із книгою).


### L01-species-05 — Людська «Вправність» (володіння однією навичкою на вибір) не реалізована ніде — ні в даних, ні в коді

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/character-origins.md:305 — «_Skillful._ You gain proficiency in one skill of your choice.»

**Має бути:** Людина отримує +1 володіння навичкою на вибір понад походження й клас (у цьому персонажі мало б бути 6 навичок).

**Є:** 5 навичок; риса — мертвий текст.

**Доказ:** `grep -rn "Skillful" src/ --include=*.ts --include=*.tsx | grep -v generated` — порожньо; термін є лише в data/2024/normalized/species.json:340 як опис. У базі race.skill_proficiencies для HUMAN_2024 = NULL, і жодного race_choice_option групи «Вправність» немає (у людини є рівно одна група — «Риса походження» з 10 Origin-рисами). Персонаж 07-human-paladin-noble рівня 5 (probe-out.txt): SKILLS: HISTORY, PERSUASION (походження Noble) + ARCANA, INSIGHT, RELIGION (риса Skilled) — рівно 5, жодної від «Вправності», хоча риса «Human: Skillful (2024)» у списку рис є.

**Відтворення:** Зібрати фікстуру 07-human-paladin-noble через build2024Character і прочитати pers.skills — п'ять рядків, усі пояснюються походженням і рисою SKILLED.

**Куди дивитись:** У prisma/seed/raceSeed2024.ts задати HUMAN_2024.skillProficiencies = {options:[усі 18 навичок], choiceCount:1}: SkillsForm уже вміє цей формат (src/lib/components/characterCreator/SkillsForm.tsx:120-135, гілка raceOptionChoices/basicChoices.race).

**Файли:** `prisma/seed/raceSeed2024.ts`, `src/lib/components/characterCreator/SkillsForm.tsx`

**Скептик:** (1) ПРАВИЛО — підтверджено власним читанням оракула: `data/2024/srd/character-origins.md`, блок «#### Human»: «_Skillful._ You gain proficiency in one skill of your choice.» Це саме редакція 2024 (SRD 5.2.1); `data/2024/normalized/species.json` дублює те саме українською («Ви отримуєте володіння однією навичкою на ваш вибір»).

(2) КОД — обробки немає в жодному шарі, перевірив ланцюг цілком, а не лише grep автора:
• Дані: власний запит до `spells_test` — `race` HUMAN_2024 (race_id 1875) `skill_proficiencies = NULL`; у людини рівно одна група `race_choice_option` — «Риса походження» (10 варіантів), і в усіх `skill_proficiencies = NULL`; фіча 48557 `Human: Skillful (2024)` теж має `skill_proficiencies = NULL`. Жоден вид 2024 не має `race.skill_proficiencies` (запит повернув 0 рядків); з опцій виду 2024 навички дають рівно три — усі три ельфійські «Гострі чуття».
• Сід: `prisma/seed/raceSeed2024.ts` взагалі не має поля `skillProficiencies` у payload (рядки 49-56: name, ruleset, source, size, speed, ASI, languagesToChooseCount) — тобто дірка системна, а не забутий один вид.
• Конструктор: `SkillsForm.tsx:286-295` спеціальним випадком дає «1 навичка на вибір» лише для 2014 `HUMAN_VARIANT`, інакше повертає `race.skillProficiencies`; `getSkillProficienciesCount(null) → 0` (`SkillsForm.tsx:60-66`), тож група «race» на кроці «Навички» має нуль виборів. Механізм для об'єктного формату `{options, choiceCount}` існує і працює (він же обслуговує «Гострі чуття»), просто даних під нього нема.
• Сервер: `src/server/db/character-creation.ts:448` додає навички виду лише під охороною `Array.isArray(race.skillProficiencies)` (null → нічого); :617 читає опції виду, :688 — фічі, і в обох джерелах у людини NULL. Іншого шляху (левелап, species-grants) немає — `src/server/db/species-level-grants.ts` роздає лише заклинання й фічі.

(3) РІШЕННЯ ВЛАСНИКА — немає: grep «Skillful|Вправніст» по всьому `docs/` порожній. У `docs/KNOWN-BUGS.md` розділ «Прийнято» — це BUG-001…003 (subclassId, classOptionalFeatureSelections, backgroundFeatId), не про це. Отже це не прийнята поведінка.

(4) IN-FLIGHT — ні: `prisma/seed/raceSeed2024.ts`, `data/2024/normalized/species.json`, `SkillsForm.tsx` не входять у список файлів паралельної сесії (KR27.7/KR30.3 — заклинання і мультиклас).

(5) ВЖЕ ВІДКРИТО — ні, і це гірше, ніж «відкрито»: `docs/o18-2024-character-parity/README.md` §2 «Риси видів — проза без механіки» позначено ✅ закрито KR18.4, а таблиця обсягу KR18.4 (kr18.4-species-choices.md:20) відносить Людину до «без вкладених виборів або з простими — ». Тобто «Вправність» просто випала зі скоупу KR, який вважається зробленим; окремого відкритого KR під неї немає.

(6) СЕРЙОЗНІСТЬ — P1 за шкалою CONTEXT («відсутнє володіння»): персонаж-людина 2024 виходить із конструктора на одне володіння навичкою меншим, ніж дає книга, і гравцю ніде не показано, що вибір існує. Ручний обхід на листі є (`ModifyStatModal` через `SkillsSlide.tsx:147` пише `persSkill.upsert`, `src/server/db/bonus-actions.ts:218`), але це універсальний аварійний важіль для будь-якого числа, а не механіка — інакше під P2 провалилася б будь-яка відсутня видача. Класифікація `data` правильна: правка лише в сіді (`race.skillProficiencies = {options: [18 навичок], choiceCount: 1}`), бо і форма, і серверне збереження (`validData.skills`, character-creation.ts:435) уже вміють цей шлях.

Єдина неточність автора — посилання на `SkillsForm.tsx:120-135` як «форма вже вміє такий формат»: ті рядки якраз про фіксований масив; реальна підтримка об'єктного формату на рівні виду — :286-295 і :303. На висновок це не впливає.


### P1-human-fighter-06 — Риса Людини «Вправність» (Skillful) не дає володіння навичкою — вибору немає ніде

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:307 — Human: «_Skillful._ You gain proficiency in one skill of your choice.»

**Має бути:** Крок вибору однієї навички від виду Людина; +1 рядок pers_skill

**Є:** Риса присутня лише як опис, механічного ефекту немає

**Доказ:** Риса є як текст: pers_feature 105 = feature 48557 «Human: Skillful (2024)». Але HUMAN_2024.skillProficiencies = null у src/lib/generated/creator-content-2024.json і поля лічильника вибору в записі немає (ключі: raceId, name, size, speed, …, skillProficiencies, ASI, toolToChooseCount, ac, toolProficiencies, weaponProficiencies, …). Конструктор кроку вибору не показує; select * from pers_skill where pers_id=16 → лише ATHLETICS, INTIMIDATION.

**Відтворення:** /2024/char → Людина → пройти до кроку «Навички» — вибору від виду немає; після створення перевірити pers_skill

**Куди дивитись:** Додати вибір навички у дані виду HUMAN_2024 (як у 2014-видів з skillProficiencies/choiceCount) або як RaceChoiceOption-групу «Вправність»

**Файли:** `data/2024/normalized/species.json`, `src/lib/generated/creator-content-2024.json`, `src/lib/components/characterCreator/SkillsForm.tsx`


### P2-elf-wizard-04 — Замовляння родоводу (Prestidigitation від High Elf) не видається — персонаж створюється взагалі без жодного заклинання

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:216 — High Elf: «You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list»

**Має бути:** pers_spell містить Prestidigitation як завжди підготовлене замовляння виду, поза лімітом замовлянь класу; на 3-му і 5-му рівнях додаються Detect Magic і Misty Step

**Є:** Жодного рядка pers_spell; на листі «Заклинання відсутні»

**Доказ:** select * from pers_spell where pers_id=8 → 0 рядків; select ... from "_PersToSpell" where "A"=8 → 0 рядків. Лист: «ЗАКЛИНАННЯ … Заклинання відсутні» (shots/P2-elf-wizard-09a-magic-8.png). Дані при цьому правильні: feature 49374 «Elven Lineage: High Elf (2024)» має _FeatureToSpell → Prestidigitation, а race_choice_option_spell для опції 130 містить Detect Magic (character_level 3) і Misty Step (character_level 5). Причина: src/rules/spell-sources.ts:95 — if (input.ruleset !== "RULES_2024") return []; який викликає saveGrantedSpells (src/server/db/character-creation.ts:350-369) з ruleset із P2-elf-wizard-01.

**Відтворення:** 1) Створити ельфа (High Elf) через /2024/char 2) select * from pers_spell where pers_id=<id> → порожньо 3) відкрити /char/<id>, вкладка «Магія»

**Куди дивитись:** Корінь — P2-elf-wizard-01. Варто також додати інтеграційний тест, що будує персонажа тим самим payload, що й форма (без явного ruleset), і перевіряє наявність замовляння виду

**Файли:** `src/rules/spell-sources.ts`, `src/server/db/character-creation.ts`


### P5-druid-secondary-flows-08 — Лісовий ельф 2024: швидкість 35 футів не застосовується — лист показує 30, хоча значення лежить у базі

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-13 (KR31.6), та сама правка, що й `L01-species-02`.

**Правило:** data/2024/srd/character-origins.md:221-222 — «Wood Elf. Your Speed increases to 35 feet. You also know the Druidcraft cantrip.»

**Має бути:** Швидкість лісового ельфа — 35 футів на листі, у друці та в копії.

**Є:** 30 футів. Дані сіду правильні, споживача в коді немає — модифікатор швидкості від вибору виду не читається взагалі, тож постраждають і інші види/опції, що міняють швидкість.

**Доказ:** У spells_test: `select option_id, option_name_eng, modifies_speed from race_choice_option where option_id in (129,130,131)` → 131 | Wood Elf | 35 (у Drow і High Elf — null). При цьому `grep -rni "modifies_speed|modifiesSpeed" src prisma/schema.prisma` дає рівно один рядок — оголошення колонки prisma/schema.prisma:969; жоден файл у src/ її не читає. На листі pers 13 (shots/P5-sheet-original.png) плитка «ШВИДКІСТЬ 30», хоча на тому самому екрані текст обраної опції каже «Ваша швидкість зростає до 35 футів».

**Відтворення:** Створити Ельфа 2024 з родоводом «Лісовий ельф» → відкрити лист → плитка ШВИДКІСТЬ показує 30.

**Куди дивитись:** У похідній швидкості (src/lib/logic/bonus-calculator.ts) брати максимум із базової швидкості виду і `modifiesSpeed` обраних raceChoiceOptions; додати характеризаційний тест на лісового ельфа.

**Файли:** `src/lib/logic/bonus-calculator.ts`, `prisma/schema.prisma`


### P6-class-sweep-level1-09 — Риса Людини 2024 «Skillful» не дає навички за вибором

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:305: «_Skillful._ You gain proficiency in one skill of your choice.»

**Має бути:** Людина 2024 обирає 1 навичку будь-яку; крок «Навички» показує блок «Навички за расу — обрати 1»

**Є:** жодного вибору; навичка втрачена

**Доказ:** src/lib/generated/creator-content-2024.json, HUMAN_2024: 'Human: Skillful (2024) | skillProficiencies: null' (як і Resourceful, Versatile). Крок «Навички» в усіх 13 прогонах не показує жодного вибору за вид (текст кроку: «Фіксовані навички / Поводження з тваринами / Природа» — обидві з походження Фермер). У створеного клірика 141 у pers_skill лише ці дві навички.

**Відтворення:** http://127.0.0.1:3100/2024/char → Людина → Пильний → будь-який клас → крок «Навички»: блока за вид немає.

**Куди дивитись:** Заповнити feature.skill_proficiencies для 'Human: Skillful (2024)' ({options: всі навички, choiceCount: 1}); SkillsForm.tsx уже вміє читати навички з активних фіч виду.

**Файли:** `prisma/seed/`, `data/2024/normalized/species.json`, `src/lib/components/characterCreator/SkillsForm.tsx`


### L01-species-06 — Вибору розміру Small/Medium немає ніде: Людина, Тифлінг і Аасімар не можуть бути Малими, а розмір персонажа взагалі не зберігається

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Статус:** ⛔ не робиться — рішення власника 2026-09-13: на числа листа розмір не впливає. У 2024 штраф Малим за важку зброю прибрано; лишаються лише ситуації столу (схоплення й штовхання на один розмір більше, протискування, їзда).

**Правило:** data/2024/srd/character-origins.md:297 — Human «**Size:** Medium (about 4–7 feet tall) or Small (about 2–4 feet tall), chosen when you select this species»; :327 — те саме для тифлінга; аасімар — species.json size:["MEDIUM","SMALL"]

**Має бути:** Конструктор питає розмір у видів, де книга дає вибір; обране зберігається й видно на листі та в друці.

**Є:** Питання не ставиться, значення нікуди не пишеться, розмір ніде не показується.

**Доказ:** race.size у базі коректний (HUMAN_2024/TIEFLING_2024/AASIMAR_2024 = {MEDIUM,SMALL}), але: (1) жодного race_choice_option групи «Розмір» для 2024 немає — повний дамп опцій усіх десяти видів це показує; (2) у model Pers (prisma/schema.prisma) немає стовпця розміру взагалі; (3) `grep -rn '"SMALL"' src/` поза src/lib/generated/ — порожньо, єдина згадка розміру в UI — коментар src/lib/components/characterCreator/infoUtils.ts:180. Механізм існує в 2014: у CUSTOM_LINEAGE_TCE є група «Розмір» → «Середній»/«Малий» (creator-content-2014.json, optionId 113/114), але й вона нікуди не записується, бо поля в pers немає.

**Відтворення:** SELECT name, size FROM race WHERE ruleset='RULES_2024' → три види з {MEDIUM,SMALL}; SELECT choice_group_name FROM race_choice_option o JOIN race r USING(race_id) WHERE r.ruleset='RULES_2024' GROUP BY 1 → групи «Розмір» немає.

**Куди дивитись:** DDL: pers.size (enum Size). Далі race_choice_option групи «Розмір» для трьох видів 2024 (за зразком CUSTOM_LINEAGE_TCE) + показ у MainStatsSlide і PDF. Це також передумова для «Могутньої статури», «Спритності напівросликів» і «Природної непомітності», які спираються на розмір.

**Файли:** `prisma/schema.prisma`, `prisma/seed/raceSeed2024.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`

**Скептик:** Перевірив усі чотири шари самостійно.

1) ПРАВИЛО — підтверджено. `data/2024/srd/character-origins.md:297` (Human) «**Size:** Medium (about 4–7 feet tall) or Small (about 2–4 feet tall), chosen when you select this species», :327 — те саме для тифлінга; `data/2024/normalized/species.json` дає `Aasimar/Human/Tiefling → ["MEDIUM","SMALL"]`, решта — по одному розміру. Тобто книга справді вимагає вибір саме на кроці вибору виду і саме в редакції 2024.

2) КОД — підтверджено, обробки немає ніде. Незалежні докази: (а) `db/schema.sql`, `CREATE TABLE public.pers (...)` — стовпця розміру немає взагалі (перелічив усі 70+ колонок); те саме в `model Pers` (`prisma/schema.prisma:569-680`); (б) власний запит до `spells_test`: `select r.name, o.choice_group_name ... where r.ruleset='RULES_2024' group by` дає рівно 10 груп (Драконяче походження, Ельфійський/Гномський родовід, Гострі чуття, Базова характеристика заклинань ×3, Велетенське походження, Демонічна спадщина, Риса походження) — групи «Розмір» немає; запит по всіх редакціях `choice_group_name ilike '%озмір%'` дає лише два рядки `CUSTOM_LINEAGE_TCE | RULES_2014`; (в) те саме видно у файлі, з якого читає конструктор — `src/lib/generated/creator-content-2024.json`; (г) `grep "SMALL" src --include=*.ts(x)` поза generated дає єдиний рядок `src/lib/refs/translation.ts:1214 SMALL: "Маленький"`, тобто жодного правила чи форми, що читає розмір.

3) РІШЕННЯ ВЛАСНИКА — немає. У `docs/DECISIONS.md` слово «розмір» трапляється тільки про статблоки бестіарію (:875), каталог (:1121) і «розмір цілі» (:1462). У `docs/KNOWN-BUGS.md` — жодної згадки. Розділ «Поза межами» `docs/o18-2024-character-parity/README.md:229-236` виводить із цілі бастіони, переклад, правила 2014 і гейт `isRules2024Allowed` — розміру там немає, як немає його і в `reference-2024.md` (grep по «розмір|Small|Малий» — порожньо). Тож це не прийнята поведінка.

4) IN-FLIGHT — ні: `prisma/schema.prisma`, `prisma/seed/raceSeed2024.ts`, `FeaturesSlide.tsx`, `MainStatsSlide.tsx` не входять до списку файлів KR27.7/KR30.3.

5) ВЖЕ ВІДКРИТО — ні: grep «Малий|Small» по всьому `docs/` дає лише бестіарій (O11/O12/O16) і назви скриптів; відкритого KR про розмір персонажа немає.

6) СЕРЙОЗНІСТЬ — P2 правильна, підвищувати не треба. Жодне число листа з розміру не виводиться (немає ні правил Heavy-зброї для малих, ні захоплення), тож персонаж не рахується «не за книгою», і вибір гравця не губиться — його просто ніколи не пропонують. Це рівно «немає можливості, яку має зрілий білдер, і не можна виправити навіть перестворенням». Класифікація `missing-system` теж коректна: потрібен DDL на `pers` + крок конструктора + виведення.

Дві фактичні хиби в доказовій частині, які треба виправити у звіті (вони не змінюють вердикт):
— `member_evidence` каже «Колонка є (prisma/schema.prisma:303 `size String?`)» і «select size from pers where pers_id=16 → null». Рядок 303 належить `model Creature` (починається на 299), а не `Pers`; у `pers` такого стовпця немає ні в схемі, ні в `db/schema.sql`, тож той SELECT не може повернути null — він упав би помилкою. Основний текст знахідки тут правий, а член команди — ні.
— «розмір ніде не показується» і «єдина згадка розміру в UI — коментар infoUtils.ts:180» — перебільшення: розмір виду показує лист персонажа (`src/lib/components/characterSheet/slides/FeaturesSlide.tsx:496` — `<InfoPill label="Розмір" value={formatList(race.size)} />` у діалозі виду), конструктор (`modals/RaceInfoModal.tsx:48`) і каталог (`src/components/races/RaceDetailCard.tsx:78`, `RacesClient.tsx:315`). Показує він список можливих («Середній / Малий»), а не обраний — що якраз і робить дірку помітною гравцю.
— «у 2014 механізм є, але й вона нікуди не записується» — неправда. Вибір `CUSTOM_LINEAGE_TCE → Розмір` зберігається як звичайна опція виду: `src/server/db/character-creation.ts:808-813` конектить `raceChoiceOptions`, лист малює їх джерелом `RACE_CHOICE` (`FeaturesSlide.tsx:285`), друк — `src/server/pdf/groupCharacterFeatures.ts:107-118` («Розмір: Малий»). Тобто у 2014 вибір і зберігається, і видно; діра — саме у 2024, де вибору не існує взагалі.


### P1-human-fighter-10 — Людина 2024 не може обрати розмір (Середній або Малий) — кроку немає, pers.size ніколи не пишеться

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ⛔ не робиться — те саме рішення власника 2026-09-13, що й `L01-species-06`.

**Правило:** data/2024/srd/character-origins.md:298 — Human: «**Size:** Medium (about 4–7 feet tall) or Small (about 2–4 feet tall), chosen when you select this species»

**Має бути:** Крок або перемикач вибору розміру для видів із size.length > 1; pers.size записаний; розмір видно на листі

**Є:** Вибору немає, розмір персонажа ніде не зберігається й не показується

**Доказ:** Дані розмір знають: data/2024/normalized/species.json Human size: ["MEDIUM","SMALL"]; src/lib/generated/creator-content-2024.json HUMAN_2024.size: ["MEDIUM","SMALL"]. Але після вибору Людини йде одразу крок «Опції раси» з рисою походження (shots/P1-human-fighter-03-after-race.png), кроку розміру немає. Колонка є (prisma/schema.prisma:303 `size String?`), але grep -rn "size" src/lib/components/characterCreator/*.tsx дає лише window.resize; select size from pers where pers_id=16 → null.

**Відтворення:** /2024/char → Людина → пройти всі кроки: жодного вибору розміру; select size from pers where pers_id=<новий> → null

**Куди дивитись:** Додати крок/групу вибору розміру, коли race.size містить більше одного значення (Людина, Голіаф-варіанти), і писати pers.size у character-creation.ts

**Файли:** `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/server/db/character-creation.ts`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`


### L01-species-11 — Володіння від «Гострих чуттів» зберігається у форматі, який серверний парсер мовчки викидає — гілка виглядає робочою, але завжди порожня

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-13 (KR31.6). Сервер створення читає `race_choice_option.skill_proficiencies` через `findSkillsGrantedByChosenOption` (`src/rules/proficiency.ts`): опція з одним конкретним варіантом дає навичку, «будь-які» 2014 лишаються кроку «Навички». `tests/db/keen-senses-skill-2024.test.ts`: фікстура 03 із «Гострими чуттями: Сприйняття» без `skillsSchema` дістає PERCEPTION; зі старим `parseStringArray` — `undefined`.

**Правило:** data/2024/srd/character-origins.md:204 — «_Keen Senses._ You have proficiency in the Insight, Perception, or Survival skill.»

**Має бути:** Або серверна гілка вміє обидва формати, або дані для race-опцій зберігаються масивом.

**Є:** Код, який виглядає як джерело володіння від опції виду, ніколи нічого не додає; єдиний робочий шлях — крок «Навички» в браузері.

**Доказ:** race_choice_option.skill_proficiencies для «Гострих чуттів» — обʼєкт {"options":["INSIGHT"],"choiceCount":1} (запит по option_id 132–134). src/server/db/character-creation.ts:615-617 читає його через parseStringArray(opt.skillProficiencies), а parseStringArray (src/server/db/json.ts:17-20) приймає масив рядків і при невдалому safeParse повертає []. Тобто ця гілка сервера завжди дає порожньо; навичка доїжджає лише тому, що SkillsForm.tsx:171 окремо кладе вибір у плаский масив skills.

**Відтворення:** SELECT option_id, skill_proficiencies FROM race_choice_option WHERE choice_group_name='Гострі чуття' → обʼєкт із options/choiceCount; порівняти з підписом parseStringArray у src/server/db/json.ts:17.

**Куди дивитись:** У character-creation.ts використати normalizeSkillProficiencies (той самий хелпер, що й SkillsForm) замість parseStringArray для race-опцій.

**Файли:** `src/server/db/character-creation.ts`, `src/server/db/json.ts`


## Заклинацтво (10)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P1 | 2024 | missing-system | `L06-subclasses-01` | Підкласові «завжди підготовлені» заклинання 2024 не існують ніде — ні як дані, ні як джерело заклинань, тому Life Domain/Oath/Circle/Patron/Draconic дають нуль заклинань | src/rules/spell-sources.ts, src/server/db/spell-sources.ts |
| ✓ | P1 | 2024 | bug | `L09-sheet-derived-05` | Лист рахує одну КС і одну атаку заклинань із class.primaryCastingStat; джерела заклинань на листі не використовуються взагалі | src/lib/components/characterSheet/slides/MagicSlide.tsx, src/server/db/spell-sources.ts |
| · | P1 | 2024 | missing-system | `P6-class-sweep-level1-07` | Жоден заклинач 2024 не обирає замовлянь і заклинань під час створення — конструктор не має такого кроку | src/lib/components/characterCreator/creation-step-resolver.ts, src/rules/spell-preparation-2024.ts |
| · | P1 | 2024 | data | `P6-class-sweep-level1-08` | Слідопит 2024 не отримує Hunter's Mark як завжди підготовлене заклинання (Favored Enemy) | src/server/db/character-creation.ts, prisma/seed/ |
| · | P2 | 2024 | data | `L01-species-09` | Безкоштовні застосування заклинань родоводу (1 раз / довгий відпочинок; PB разів для лісового гнома) не трекаються | prisma/seed/raceSeed2024.ts, prisma/seed/speciesChoices2024.ts |
| · | P2 | 2024 | missing-system | `L05-class-choices-13` | Bard Magical Secrets (10) не реалізовано ніде в коді | src/rules/spell-sources.ts, src/rules/spell-preparation-2024.ts |
| · | P2 | both | missing-system | `L08-levelup-machine-11` | Підвищення рівня не пропонує ні нових замовлянь/заклинань, ні книжкової заміни одного заклинання | src/lib/components/levelUp/LevelUpWizard.tsx, src/server/db/levelup-persistence.ts |
| · | P2 | both | bug | `L11-persistence-identity-06` | «Не рахувати в підготовлених» вирішується двобічним підрядком у вільному тексті бейджа: бейджі «Клас», «Рас», «Ліс» (для ельфа) тихо випадають з ліміту | src/lib/logic/spell-prepared-exclusions.ts |
| ✓ | P2 | both | missing-system | `L19-parity-competitors-05` | Немає позначки концентрації — лист не знає, на чому персонаж концентрується | prisma/schema.prisma, src/lib/components/characterSheet/slides/MagicSlide.tsx |
| · | P2 | both | missing-system | `L19-parity-competitors-14` | «Накласти вищим слотом» не існує як дія: слот витрачається окремим кліком по комірці, без звʼязку із заклинанням | src/lib/components/characterSheet/slides/MagicSlide.tsx, src/lib/components/characterSheet/shared/SpellListGroup.tsx |

### L06-subclasses-01 — Підкласові «завжди підготовлені» заклинання 2024 не існують ніде — ні як дані, ні як джерело заклинань, тому Life Domain/Oath/Circle/Patron/Draconic дають нуль заклинань

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-08 (KR31.5). 34 підкласи, 329 згадок заклинань із
`data/2024/source/raw/subclass/*.html` → нова таблиця `subclass_spell` → правило
`findEarnedSubclassSpells` → рядок `pers_spell` з `excludeFromPreparedCount`. Окремого
`SpellSourceKind = "SUBCLASS"` навмисно не заведено: підклас чаклує характеристикою свого класу,
тож нового джерела для КС немає — рядок несе ту саму характеристику. Коло землі лишається поза
переліком (чотири таблиці на вибір після довгого відпочинку) — питання власнику в журналі KR31.5.

**Правило:** data/2024/srd/classes.md:2970 — «When you reach a Cleric level specified in the Life Domain Spells table, you thereafter always have the listed spells prepared» (3: Aid, Bless, Cure Wounds, Lesser Restoration; 5: Mass Healing Word, Revivify); classes.md:4410 — Circle of the Land Spells: «choose one type of land … you have the spells listed for your Druid level and lower prepared»

**Має бути:** Клірик Life Domain 5-го рівня має 6 завжди підготовлених заклинань, які не рахуються в ліміті підготовлених; аналогічно Oath/Circle of the Land/Patron/Draconic/Fey Wanderer/Gloom Stalker.

**Є:** Нуль рядків pers_spell; джерело заклинань лише CLASS. Гравець мусить додати їх вручну, і вони з'їдять ліміт підготовлених, якщо він сам не поставить бейдж із назвою підкласу (єдиний наявний механізм — евристика по тексту бейджа, src/lib/logic/spell-prepared-exclusions.ts:65).

**Доказ:** SQL на spells_test: `select s.ruleset, count(*) from "_SubclassExpandedSpells" e join subclass s on s.subclass_id=e."B" group by 1` → [] (таблиця порожня); `select ruleset, grants_spells, count(*) from subclass group by 1,2` → RULES_2024/false/48, RULES_2014/true/78. Усі 21 риса-таблиця («Life Domain Spells», «Oath of Devotion Spells», «Circle of the Land Spells», «Fiend Spells», «Draconic Spells», «Gloom Stalker Spells», «Psionic Spells», «Clockwork Spells», «Fey Wanderer Spells» …) має 0 рядків у `_FeatureToSpell`. Наскрізна проба (фікстура 02-dwarf-cleric-farmer через справжні createCharacter + 4× levelUpCharacter): PERS {level:5, subclass:{name:LIFE_DOMAIN, ruleset:RULES_2024, grantsSpells:false}}, SPELLS (0), SPELL SOURCES [{key:CLERIC_2024, ability:WIS, kind:CLASS}]. Код: src/rules/spell-sources.ts:16 `export type SpellSourceKind = "CLASS" | "SPECIES" | "FEAT";` — підкласу серед джерел немає; findGrantedSpells (там само, рядок 85) матеріалізує лише заклинання виду.

**Відтворення:** bunx vitest run з власним конфігом на tests/helpers/build-2024-character.ts, фікстура 02-dwarf-cleric-farmer → після 5-го рівня pers.persSpells порожній, loadPersSpellSources повертає лише CLERIC_2024.

**Куди дивитись:** Дані: рядки в `_SubclassExpandedSpells` або `_FeatureToSpell` для риси-таблиці з рівнями. Код: додати SUBCLASS у SpellSourceKind і гілку у findSpellSources/findGrantedSpells (src/rules/spell-sources.ts), завантаження в src/server/db/spell-sources.ts, видача при levelUpCharacter поруч із readMissingSpeciesGrants; на створеному рядку ставити excludeFromPreparedCount. Уже виміряно власником у docs/o18-2024-character-parity/kr18.4-species-choices.md:113-124 і відкладено в межах KR18.4.

**Файли:** `src/rules/spell-sources.ts`, `src/server/db/spell-sources.ts`, `src/server/db/levelup-persistence.ts`, `docs/o18-2024-character-parity/kr18.4-species-choices.md`

**Скептик:** Підтверджую знахідку власним доказом, з двома уточненнями.

(1) ПРАВИЛО — істинне й саме 2024. Прочитав `data/2024/srd/classes.md` у цитованих місцях: Life Domain Spells (3: Aid/Bless/Cure Wounds/Lesser Restoration, 5: Mass Healing Word/Revivify) і Circle of the Land Spells. Формулювання «you thereafter always have the listed spells prepared» — тобто понад ліміт підготовлених.

(2) КОД — обробки немає ніде. `SpellSourceKind` не має члена SUBCLASS; єдині два місця, що матеріалізують подаровані заклинання (`saveGrantedSpells` у character-creation.ts і `readMissingSpeciesGrants` у levelup-persistence.ts), беруть лише вид. `grantsSpells` і `expandedSpells` не читає жоден рядок у `src/**/*.ts(x)` — перший узагалі мертвий, другий лише вибирається в `creator-content-query.ts:23` і далі нікуди не йде. Альтернативного шляху (серверного чи клієнтського) немає.

(3) РІШЕННЯ ВЛАСНИКА — це **не** прийнята поведінка. Єдиний слід — журнал KR18.4: «власник підтвердив, що цього **тут** не робимо», з прямим текстом «це ще два-три KR». Це відкладання в межах KR, а не рішення. Ані в DECISIONS.md (Р38 про інше — риси й родоводи), ані в «Поза межами» O18/O27, ані в KNOWN-BUGS цього пункту немає.

(4) IN-FLIGHT — ні. Жоден із файлів знахідки (`src/rules/spell-sources.ts`, `src/server/db/spell-sources.ts`, `src/server/db/levelup-persistence.ts`) не в списку паралельної сесії. KR27.7, над яким працює інша сесія, — про кількість і стелю рівня підготовлених, не про підкласові дарунки.

(5) ВЖЕ ВІДКРИТО — ні. Ті «два-три KR», про які пише KR18.4, ніколи не заведені: грепу по `docs/` знайшлися лише три згадки «завжди підготов», жодна не є специфікацією. Отже це справді відкрита діра релізу 2024, а не облік уже запланованої роботи.

(6) СЕРЙОЗНІСТЬ — P1 підтверджую. Клірик Домену Життя 5-го рівня за книгою має шість заклинань, підготовлених завжди й поза лімітом; продукт дає нуль, тобто лист персонажа не дорівнює книзі — це рівно означення P1 у CONTEXT («відсутня риса/вибір»). Не P0: створення й підвищення проходять. Не P2: це не «відсутня можливість зрілого білдера», а невідповідність правилу.

Що в доказі автора хибне (не рятує знахідку, але важливе для виконавця): автор подає контраст «RULES_2014 grants_spells=true 78» як доказ, що в 2014 система є, а в 2024 зламали. Насправді `grants_spells` не читає ніхто, а `_SubclassExpandedSpells` порожня в **обох** редакціях — автоматичної видачі немає й у 2014. Справжня різниця, яку автор пропустив і яку я виміряв: у 2014 підкласові списки живуть у `spell_classes` як 49 псевдокласів («Домен життя», «Почвара», «Коло землі»…), і саме за ними фільтрує пікер (`AddSpellDialog` шле `sub=`) та спрацьовує бейджева евристика виключення з ліміту; у 2024 в `spell_classes` рівно 9 базових класів і жодного підкласу. Тому для 2024 гірше, ніж описано: заклинання підкласу, яких немає в списку класу (Fire Bolt і Burning Hands для Кола Землі, Burning Hands для Патрона-Диявола), гравець із увімкненими фільтрами **не побачить узагалі**, а не просто «мусить додати вручну». Правильна класифікація лишається missing-system: системи не існує ні як даних, ні як коду, ні для однієї редакції — але для релізу 2024 вона потрібна, бо 2024 навіть паперового обхідного шляху 2014 не має.


### L09-sheet-derived-05 — Лист рахує одну КС і одну атаку заклинань із class.primaryCastingStat; джерела заклинань на листі не використовуються взагалі

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

**Статус:** ✅ закрито 2026-09-09 (KR31.5). `MagicSlide` більше не читає `class.primaryCastingStat`; джерела заклинань доведено до листа на листі: `findSpellcastingSources` (обидві редакції) → `loadPersSpellcastingSources` → `sheet-data.tsx` / `share/[token]` → `MagicSlide`, картки `SpellcastingSourceCards` — пара «атака / КС» на кожне джерело з підписом «Клас · характеристика». Журнал — [KR31.5](kr31.5-spells-2024.md#2026-09-09--кс-і-атака-заклинань-за-джерелом-на-листі).

**Правило:** Критерій К27/К16 приймального набору (tests/rules-2024/acceptance-ten.test.ts:449) — «кожне джерело заклинань несе власну характеристику замовляння»; фікстура 03 має три джерела: WIZARD_2024, MAGIC_INITIATE, Elf: Elven Lineage (2024).

**Має бути:** КС і бонус атаки на джерело: заклинання від Magic Initiate (Wizard list, ІНТ) у клірика рахуються від ІНТ; воїн із Magic Initiate має власну КС.

**Є:** Одне число з основного класу. Для класу без primary_casting_stat (воїн, монах, розбійник, варвар) лист показує КС 8 і атаку +0.

**Доказ:** src/lib/components/characterSheet/slides/MagicSlide.tsx:163–173: `const spellcastingAbility = localPers.class?.primaryCastingStat; … if (!spellcastingAbility) return 0; … if (!spellcastingAbility) return 8;`. Греп loadPersSpellSources / spellSources по src/lib/components/characterSheet/ і src/app/char/[id]/ — жодного входження. SQL: primary_casting_stat у FIGHTER_2024 і MONK_2024 = null.

**Відтворення:** Створити воїна 2024 з Origin-рисою Magic Initiate → лист → слайд «Магія»: КС 8, атака +0.

**Куди дивитись:** Передати loadPersSpellSources у лист і малювати КС/атаку рядком на джерело — сервер це вже вміє (src/server/db/spell-sources.ts).

**Файли:** `src/lib/components/characterSheet/slides/MagicSlide.tsx`, `src/server/db/spell-sources.ts`, `src/app/char/[id]/CharHomeClient.tsx`

**Скептик:** Спростувати не вдалося — знахідка підтверджується власними доказами, ще й ширша, ніж заявлено.

1. ПРАВИЛО. Автор послався лише на критерій К16 приймального набору (це проєктна вимога, не книга). Справжній оракул знайдено: `data/2024/srd/spells.md:244` — «Spell save DC = 8 + your spellcasting ability modifier + your Proficiency Bonus», `:250` — «Spell attack modifier = your spellcasting ability modifier + your Proficiency Bonus»; `data/2024/srd/feats.md:37` (Magic Initiate) — «Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat's spells (choose when you select this feat)». Тобто характеристика належить джерелу, а не основному класу — правило справді таке.

2. КОД. `MagicSlide.tsx:163` `const spellcastingAbility = localPers.class?.primaryCastingStat;` — єдине джерело числа; `:165-173` при null повертає літеральні `0` і `8`, і саме вони малюються картками «Бонус атаки Заклинаннями» (:673) і «СК» (:685) — картки безумовні, слайд «Магія» теж безумовний (`CharacterCarousel.tsx:113`, масив `allSlides` без гейта). Іншого місця, де лист рахував би КС, немає: `grep primaryCastingStat` по `src/` (без generated) дає лише PDF, `spell-sources`, `class-content`, `creation-content`, модалки каталогу, `LevelUpWizard` і `ModifyStatModal`. `loadPersSpellSources` споживають ЛИШЕ `tests/helpers/build-2024-character.ts:318` і `build-2024-multiclass-character.ts:402` — на листі його немає, як і сказано.

3. РІШЕННЯ ВЛАСНИКА. У `docs/DECISIONS.md`, `docs/KNOWN-BUGS.md`, `docs/o21-user-signals/defects.md` — жодного запису про КС/атаку заклинань. Єдиний дотичний текст — `docs/o18-2024-character-parity/kr18.4-species-choices.md:158-163`: «Окремого блоку „Джерела заклинань · СК на джерело“ … немає … Це робота для O4/O8, не для цього KR. Серверний бік готовий — loadPersSpellSources». Це відкладення показу блоку в межах KR, а не рішення, що число може бути хибним; про КС 8 у класу без `primary_casting_stat` там нема ні слова. Тож `accepted` не підходить.

4. IN-FLIGHT. `MagicSlide.tsx` не в списку паралельної сесії. `spellcasting-progression.ts` — так, але його тип `SpellcastingCountsLine` (:11-20) не має ані характеристики, ані КС, тобто перерахунок КС по джерелах там не робиться. Класифікація `in-flight` не застосовна.

5. ВІДКРИТИЙ KR. Прямого відкритого KR немає; найближче — згадка в журналі KR18.4 (закритого) з переадресацією в O4/O8. Тобто дефект зафіксовано лише як «чого немає», без цілі.

6. СЕРЙОЗНІСТЬ. P1 за шкалою CONTEXT: персонаж рахується не за книгою — Потойбічний лицар 5 з ІНТ 14 має КС 8+2+3=13, а лист показує 8, атака +0 замість +5. Виправити руками не можна: гілка `if (!spellcastingAbility) return 8` спрацьовує ДО `getSimpleBonus(pers,"spellDC")`, тому ручний бонус із `ModifyStatModal` на цю картку не діє взагалі (а сам модал при цьому рахує базу від ІНТ — `ModifyStatModal.tsx:237,242` — і показує інше число, ніж картка).


### P6-class-sweep-level1-07 — Жоден заклинач 2024 не обирає замовлянь і заклинань під час створення — конструктор не має такого кроку

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md: Bard «You know two cantrips … choose four level 1 spells from the Bard spell list»; Cleric «three cantrips … choose four level 1 spells»; Druid «two cantrips … four level 1 spells»; Sorcerer «four Sorcerer cantrips … choose two level 1 Sorcerer spells»; Wizard (3 замовляння, 4 підготовлені, книга 6); Warlock (2 замовляння, 2 підготовлені, 1 чарунка); Paladin/Ranger «choose two level 1 … spells»

**Має бути:** На 1-му рівні заклинач обирає фіксовану кількість замовлянь і підготовлених заклинань (Клірик 3+4, Бард 2+4, Друїд 2+4, Чародій 4+2, Чарівник 3+4 і книга з 6, Чорнокнижник 2+2, Паладин 0+2, Слідопит 0+2)

**Є:** персонаж 2024 створюється з нулем заклинань; вибір відкладено на лист персонажа без жодного контролю кількості

**Доказ:** src/lib/components/characterCreator/creation-step-resolver.ts:33–43 — повний перелік кроків (race, raceDetails, raceChoices, speciesFeatChoices, class, subclass, subclassChoices, classChoices, classOptional, weaponMastery, background, asi, skills, feat, featChoices, backgroundFeat, backgroundFeatChoices, expertise, languages, equipment, name) не містить кроку заклинань. У всіх 8 браузерних прогонах заклиначів (Бард, Клірик, Друїд, Паладин, Слідопит, Чародій, Чорнокнижник, Чарівник, Винахідник) кроку spells/cantrips немає. У створеного клірика 141: pers_spell = 0 рядків.

**Відтворення:** http://127.0.0.1:3100/2024/char → Людина → Пильний → Клірик → до кінця → «Створити»; select count(*) from pers_spell where pers_id=<id> → 0.

**Куди дивитись:** Або додати крок вибору замовлянь/підготовлених заклинань у creation-step-resolver.ts для 2024 із лімітами з src/rules/spell-preparation-2024.ts, або задокументувати як свідоме рішення (заклинання додаються на листі) — але тоді лист має показувати ліміт «підготовлено X з N».

**Файли:** `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/rules/spell-preparation-2024.ts`, `src/server/db/character-creation.ts`


### P6-class-sweep-level1-08 — Слідопит 2024 не отримує Hunter's Mark як завжди підготовлене заклинання (Favored Enemy)

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-09 (KR31.5). Слідопит 2024 отримує Hunter's Mark від Улюбленого
ворога вже на 1-му рівні — рядок пише конструктор, і матриця десятки це фіксує на
`08-orc-ranger-guide`.

**Правило:** data/2024/srd/classes.md, Ranger Level 1 «Favored Enemy»: «You always have the Hunter's Mark spell prepared. You can cast it twice without expending a spell slot, and you regain all expended uses of this ability when you finish a Long Rest»

**Має бути:** У Слідопита 1-го рівня Hunter's Mark у списку заклинань як завжди підготовлене, плюс 2 безкоштовні застосування на довгий відпочинок

**Є:** жодного заклинання від Favored Enemy; безкоштовних застосувань немає (див. знахідку 04)

**Доказ:** spells_test: `select f.eng_name, count(*) from "_FeatureToSpell" fs join feature f on f.feature_id=fs."A" where f.ruleset='RULES_2024' group by 1` повертає лише видові фічі — Elven Lineage: Drow/High Elf/Wood Elf, Fiendish Legacy: Abyssal/Chthonic/Infernal, Gnome: Forest/Rock, Tiefling: Otherworldly Presence. 'Ranger: Favored Enemy (2024)' там відсутній. Крім того src/server/db/character-creation.ts:350–369 saveGrantedSpells бере джерела лише з content.raceTraitFeatures і content.raceChoiceOptions — класові фічі до нього не доходять навіть за наявності звʼязку.

**Відтворення:** Створити Слідопита 2024 → на листі слайд Магія: Hunter's Mark немає; select * from pers_spell where pers_id=<id> → порожньо.

**Куди дивитись:** Додати звʼязок _FeatureToSpell для 'Ranger: Favored Enemy (2024)' → Hunter's Mark і розширити saveGrantedSpells на класові фічі (content.features), тримаючи Р38 (одне заклинання з кількох джерел = один рядок).

**Файли:** `src/server/db/character-creation.ts`, `prisma/seed/`, `data/2024/normalized/classes.json`


### L01-species-09 — Безкоштовні застосування заклинань родоводу (1 раз / довгий відпочинок; PB разів для лісового гнома) не трекаються

**Статус:** ✅ закрито 2026-09-08 ([KR31.3](kr31.3-feature-resources-2024.md)). `Elf: Elven Lineage (2024)` і `Tiefling: Fiendish Legacy (2024)` несуть `[{lvl:3, uses:1}, {lvl:5, uses:2}]` на довгий відпочинок, `Gnome: Forest Gnome (2024)` — бонус майстерності. Скільки саме безкоштовних застосувань показувати, вирішив власник 2026-09-08: **скільки їх є насправді**, бо лист є трекер, а не рушій ([Р26](../DECISIONS.md#р26)).

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:182 (ельф) і :335 (тифлінг): «You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest.»; :249 Forest Gnome: «You can cast it without a spell slot a number of times equal to your Proficiency Bonus»

**Має бути:** Персонаж бачить, скільки безкоштовних застосувань Misty Step / Speak with Animals у нього лишилось, і довгий відпочинок їх повертає.

**Є:** Заклинання просто «завжди підготовлене»; безкоштовний каст ніде не рахується.

**Доказ:** Самі заклинання лягають правильно — 03-high-elf-wizard-sage: «RACE SPELLS: Prestidigitation(l0) | Detect Magic(l1) | Misty Step(l2)», origin=RACE, src=Elf: Elven Lineage (2024). Але лічильника немає: POOLS: [] у всіх десяти персонажів, а риси-джерела (Elf: Elven Lineage (2024), Gnome: Forest Gnome (2024), Tiefling: Fiendish Legacy (2024)) мають uses_count=NULL і limited_uses_per=NULL. Р33/Р38 (docs/DECISIONS.md:1623-1631) прямо каже: «безкоштовне застосування раз на довгий відпочинок — це фіча з обмеженими використаннями (limitedUsesPer / usesCount), яка трекається з боку фіч» — механізм обрано, дані під нього не заповнені.

**Відтворення:** probe-out.txt, будь-який із 03/04/09 — POOLS: [], а SELECT uses_count, limited_uses_per FROM feature WHERE eng_name IN ('Elf: Elven Lineage (2024)','Gnome: Forest Gnome (2024)') → NULL/NULL.

**Куди дивитись:** Той самий сідовий прохід, що й L01-species-03: задати limitedUsesPer/usesCount(/PB) рисам-джерелам родоводів у prisma/seed/raceSeed2024.ts і speciesChoices2024.ts.

**Файли:** `prisma/seed/raceSeed2024.ts`, `prisma/seed/speciesChoices2024.ts`, `docs/DECISIONS.md`


### L05-class-choices-13 — Bard Magical Secrets (10) не реалізовано ніде в коді

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:918–920 — «#### Level 10: Magical Secrets — Whenever you reach a Bard level … and the Prepared Spells number … increases, you can choose any of your new prepared spells from the Bard, Cleric, Druid, and Wizard spell lists…»

**Має бути:** З 10-го рівня бард готує нові заклинання зі списків барда, клірика, друїда й чарівника, і вони рахуються бардівськими; те саме при заміні підготовленого заклинання.

**Є:** Риса — лише текст на листі; список заклинань барда не розширюється.

**Доказ:** Риса в базі є (class_feature: `Bard: Magical Secrets (2024)`, level_granted = 10), але `grep -rn "Magical Secrets\|magicalSecrets" src/ --exclude-dir=generated` не дає жодного влучення — механіки розширення списку немає ні в правилах, ні в діалогах підготовки заклинань.

**Відтворення:** grep -rn "Magical Secrets" src/ --exclude-dir=generated → порожньо.

**Куди дивитись:** Перетинається з лінзою заклинань (spell-sources / spell-preparation-2024, зараз у роботі KR27.7) — узгодити, перш ніж чіпати.

**Файли:** `src/rules/spell-sources.ts`, `src/rules/spell-preparation-2024.ts`, `prisma/seed/`


### L08-levelup-machine-11 — Підвищення рівня не пропонує ні нових замовлянь/заклинань, ні книжкової заміни одного заклинання

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:882 — «_Changing Your Prepared Spells._ Whenever you gain a Bard level, you can replace one spell on your list with another Bard spell for which you have spell slots.» (так само чародій, чорнокнижник, чарівник; у клірика/друїда/паладина/слідопита заміна привʼязана до тривалого відпочинку — рядки 2199, 3509, 5639, 6408)

**Має бути:** На рівні, який дає нове замовляння або збільшує кількість підготовлених, майстер пропонує вибір; для класів 2024 із заміною «на рівень» — крок заміни одного заклинання.

**Є:** Кроку немає взагалі; заклинання додаються тільки руками на листі, книжкова заміна «одне на рівень» не існує як механіка.

**Доказ:** Перелік кроків майстра (src/lib/components/levelUp/LevelUpWizard.tsx:797-960) не містить жодного кроку про заклинання. grep -rn "replaceSpell\|spellReplacement\|заміна заклинан" src/ → порожньо. Емпірика: чорнокнижник 2024, проведений майстром 1→5, має spells=4, і всі чотири — від виду (Chill Touch, Thaumaturgy, False Life, Ray of Enfeeblement); класових замовлянь і підготовлених заклинань нуль.

**Відтворення:** Підняти чорнокнижника 2024 з 1-го до 5-го через майстер → у pers_spell лише заклинання виду.

**Куди дивитись:** Додати крок «Заклинання» (нові замовляння + підготовлені за таблицею класу + одна заміна) поруч із наявними кроками; дотично до KR27.7 (src/rules/spell-preparation-2024.ts, AddSpellDialog.tsx), над яким працює паралельна сесія — сам крок майстра до тих файлів не належить.

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/server/db/levelup-persistence.ts`


### L11-persistence-identity-06 — «Не рахувати в підготовлених» вирішується двобічним підрядком у вільному тексті бейджа: бейджі «Клас», «Рас», «Ліс» (для ельфа) тихо випадають з ліміту

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a — це не правило книги, а евристика застосунку; правильний носій джерела вже є в схемі (`PersSpell.origin` типу `SpellOrigin`, `source_id`, `source_name`)

**Має бути:** З ліміту підготовлених випадають рівно ті заклинання, які дав підклас або вид.

**Є:** Випадає будь-яке заклинання, чий бейдж є підрядком назви виду/підвиду персонажа або підрядком слова «підклас»/«раса». Ельф із бейджем «Ліс» тихо отримує на одне підготовлене більше.

**Доказ:** src/lib/logic/spell-prepared-exclusions.ts:49-63 — `const AUTO_EXCLUDE_BADGE_STATIC_TOKENS = ["архетип", "підклас", "раса", "підраса"]` і двобічні порівняння `if (normalized.includes(staticToken) || staticToken.includes(normalized)) return true;` та `if (normalized.includes(matcher) || matcher.includes(normalized)) return true;`. Прогін `bun run scratchpad/audit/work/L11-persistence-identity/badge-probe.ts` і `badge-probe2.ts`: `badge "Клас" -> true` (бо "підклас".includes("клас")), `badge "Рас" -> true` (бо "раса".includes("рас")), `badge "Клірик" -> false`; для персонажа з `race.name=ELF_2014`, `subrace.name=ELF_WOOD_2014` матчери = ["elf_2014","ельф","elf_wood_2014","лісовий ельф"], і тоді `badge "Ліс" -> true`, `badge "Ельф" -> true`, `badge "Лісовий" -> true`.

**Відтворення:** `bun run <scratchpad>/audit/work/L11-persistence-identity/badge-probe.ts` — виводить `badge "Клас" -> true`, `badge "Рас" -> true`. У браузері: лист → заклинання → підписати бейдж «Клас» → лічильник підготовлених зменшується на одиницю.

**Куди дивитись:** Рішення про виключення ухвалювати по `pers_spell.origin` / `source_id`, а не по вільному тексту; двобічне `includes` прибрати в будь-якому разі.

**Файли:** `src/lib/logic/spell-prepared-exclusions.ts`


### L19-parity-competitors-05 — Немає позначки концентрації — лист не знає, на чому персонаж концентрується

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт скептика:** confirmed

**Правило:** n/a (паритет: DDB показує активну концентрацію в рядку заклинання й попереджає про другу; Foundry вішає ефект)

**Має бути:** На листі видно, яке заклинання зараз тримає концентрацію, і накладання другого попереджає, що перше спаде.

**Є:** Концентрація існує лише як ознака в каталозі; персонаж її не тримає.

**Доказ:** `grep -rni "концентрац|concentration" src/` поза каталогами дає лише прапорець списку заклинань: `src/app/spells/spells-client.tsx:81 hasConcentration: string | null` і фільтр `:402`. У `src/lib/components/characterSheet` немає жодного трекера.

**Куди дивитись:** Поле «активна концентрація» на Pers (persSpellId або null) + індикатор у MagicSlide з підтвердженням при накладанні другого.

**Файли:** `prisma/schema.prisma`, `src/lib/components/characterSheet/slides/MagicSlide.tsx`

**Скептик:** ПРАВИЛО. Автор поставив rule_source «n/a», але правило в оракулах є і однакове в обох редакціях: data/2014/srd/07_Spells/Spellcasting.md:149 — «Casting another spell that requires concentration… You can't concentrate on two spells at once»; data/2024/srd/rules-glossary.md:455 — «_Another Concentration Effect._ You lose Concentration on an effect the moment you start casting a spell that requires Concentration», плюс :929 (Недієздатний ламає Концентрацію). Тож edition: both правильно.

КОД. Незалежно перевірено: слова concentr/концентрац НЕМАЄ в src/lib/components/ (у т.ч. characterSheet), src/lib/actions/, src/server/, src/rules/, src/lib/logic/, src/lib/stores/, src/lib/offline/ — grep по цих теках порожній. У всьому src/ (лише .ts/.tsx) файлів зі словом п'ять, усі каталогові чи довідкові: src/app/spells/page.tsx, src/app/2024/spells/page.tsx:41, src/app/spells/spells-client.tsx:81,402,698, src/lib/spellsData.ts, src/lib/rulesData.ts (плюс мітка фільтра src/components/spells/SpellsFilterDialog.tsx:241, яку автор пропустив — на висновок не впливає). У схемі єдиний збіг — prisma/schema.prisma:1100 hasConcentration на моделі Spell; ані Pers, ані PersSpell не мають поля стану (перевірено повним текстом обох моделей). Отже стану «зараз концентруюсь» немає ні в базі, ні в UI, ні на сервері.

РІШЕННЯ ВЛАСНИКА. У docs/DECISIONS.md, «Прийнято» docs/KNOWN-BUGS.md:41 і розділах «Поза межами» (o18:229, o27:210, o24:312, o19:117) концентрації немає — grep по всьому docs/ дає лише імпорт/звірку даних заклинань (KR6.2, KR16.2, KR17.x) і текст довідника. Не прийнята поведінка. Навпаки, наскрізний принцип власника — Р26 і Р31 («застосунок — трекер листа, а не суддя за столом») — саме на користь позначки-нагадування: трекер тут доречний, блокування другого заклинання — ні.

IN-FLIGHT. Файли паралельної сесії (spell-preparation-2024, spellcasting-progression, spell-actions, AddSpellDialog, SpellInfoModal, /spells/**) стосуються підготовки заклинань і мультикласу (KR27.7/KR30.3), а не трекера; MagicSlide.tsx і schema.prisma у списку немає. Не in-flight.

ВЖЕ ВІДКРИТО. Жодного KR: у таблиці цілей docs/README.md і в docs/o18-2024-character-parity/reference-2024.md (цільова картина 2024) концентрація не згадана жодного разу.

СЕРЙОЗНІСТЬ. P2 за шкалою: немає можливості зрілого білдера. Не P1 — жодне число не рахується не за книгою і жоден вибір гравця не губиться (концентрація — стан за столом, не похідна характеристика).


### L19-parity-competitors-14 — «Накласти вищим слотом» не існує як дія: слот витрачається окремим кліком по комірці, без звʼязку із заклинанням

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** n/a (паритет: DDB і Foundry дають «Cast at level N» просто із заклинання й показують оновлений ефект)

**Має бути:** Із рядка заклинання обирається рівень накладання, слот того рівня списується автоматично, а текст «На вищих рівнях» показується для обраного рівня.

**Є:** Гравець сам памʼятає, який слот витратити, і сам клікає правильну комірку.

**Доказ:** `src/lib/components/characterSheet/slides/MagicSlide.tsx:756` — `() => spendSpellSlot(localPers.persId, level)`; витрата привʼязана до рівня комірки, а не до заклинання. `grep -rni "higherLevel|upcast|atHigherLevels" src/lib/components/characterSheet --include=*.tsx` знаходить лише коментар в `AddSpellDialog.tsx:72`.

**Куди дивитись:** У SpellListGroup додати дію «Накласти» з вибором рівня ≥ рівня заклинання, що кличе наявний spendSpellSlot; текст ефекту брати з поля «На вищих рівнях».

**Файли:** `src/lib/components/characterSheet/slides/MagicSlide.tsx`, `src/lib/components/characterSheet/shared/SpellListGroup.tsx`


## Підкласові риси (8)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P1 | 2024 | missing-system | `L05-class-choices-08` | Жоден із 48 підкласів 2024 не має жодного вибору: subclass_choice_option під RULES_2024 порожня | prisma/seed/, data/2024/normalized/subclasses.json |
| · | P1 | 2024 | data | `L06-subclasses-03` | Усі 241 підкласові риси 2024 позначені PASSIVE і не мають жодного обмеженого використання чи пулу ресурсів | data/2024/normalized/subclasses.json, prisma/seed/ |
| · | P1 | 2024 | data | `L06-subclasses-04` | Жодна підкласова риса 2024 не дає володінь, експертизи, КЗ чи ХП — Draconic Resilience і Dazzling Footwork рахуються не за книгою | data/2024/normalized/subclasses.json, prisma/seed/ |
| ✓ | P1 | 2024 | missing-system | `L06-subclasses-05` | У підкласів 2024 немає жодного структурованого вибору — таблиця subclass_choice_option порожня, тож Circle of the Land, Hunter's Prey, Elemental Affinity і маневри Battle Master не вибираються | prisma/seed/, src/server/db/levelup-persistence.ts |
| · | P1 | 2024 | data | `L07-spellcasting-01` | Підкласові «завжди підготовлені» заклинання 2024 не існують у даних узагалі — жоден підклас не дає жодного заклинання | data/2024/normalized/subclasses.json, src/rules/spell-sources.ts |
| ✓ | P1 | 2024 | data | `L08-levelup-machine-04` | У редакції 2024 немає жодного вибору всередині підкласу — крок subclass-choices не зʼявиться ніколи | prisma/seed/, data/2024/normalized/subclasses.json |
| · | P1 | 2024 | data | `L09-sheet-derived-07` | Драконяча живучість 2024 не додає хітів — половина риси (КЗ) працює, половина (хіти) ні | src/rules/hit-points.ts, data/2024/normalized/subclasses.json |
| · | P2 | 2024 | data | `L13-wildshape-05` | «Місячний крок» Кола місяця 2024 (рівень 10) не має лічильника використань, хоча правило дає їх МУД-модифікатор на довгий відпочинок | prisma/seed/subclassSeed2024.ts, data/2024/normalized/subclasses.json |

### L05-class-choices-08 — Жоден із 48 підкласів 2024 не має жодного вибору: subclass_choice_option під RULES_2024 порожня

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:6817–6823 (Hunter's Prey: Colossus Slayer або Horde Breaker, вибір на 3-му, змінний на відпочинку); :6825–6831 (Defensive Tactics на 7-му); :4876–4878 (Champion, Level 7 Additional Fighting Style — «You gain another Fighting Style feat of your choice»). Battle Master (PHB 2024, поза SRD) — 3 маневри на 3-му, +2 на 7/10/15.

**Має бути:** Battle Master: 3 маневри на 3-му, +2 на 7/10/15 + кубики переваги; Champion: другий бойовий стиль на 7-му; Hunter: Hunter's Prey на 3-му і Defensive Tactics на 7-му; Circle of the Land: тип землі; тощо.

**Є:** Жодного підкласового вибору 2024 не існує ні в конструкторі, ні в майстрі підвищення.

**Доказ:** SQL: `select count(*) from subclass_choice_option where ruleset='RULES_2024'` → 0. Підкласи є всі 48 (BATTLE_MASTER, CHAMPION, ELDRITCH_KNIGHT, PSI_WARRIOR, CIRCLE_OF_THE_LAND, HUNTER, THIEF, ARCANE_TRICKSTER, ASSASSIN, SOULKNIFE, WARRIOR_OF_THE_ELEMENTS …). Те саме у файлі конструктора: у src/lib/generated/creator-content-2024.json сума subclassChoiceOptions по всіх підкласах = 0 (у 2014 — 118). Жодна риса 2024 не має ні gives_maneuvres, ні superiority_dice_count (див. запит у -05), хоча правило кількості маневрів для BATTLE_MASTER уже є в src/lib/logic/choicePoolRules.ts:88 і спрацює лише для 2014-підкласу з тим самим ім'ям.

**Відтворення:** node q.mjs "select count(*) from subclass_choice_option where ruleset='RULES_2024'" → 0. У LevelUpWizard.tsx:842 крок subclass-choices додається лише за непорожніх груп.

**Куди дивитись:** Окрема ціль: сід subclass_choice_option для 2024 (почати з Champion — опції бойового стилю вже в базі — і Hunter, далі Battle Master із маневрами й кубиками).

**Файли:** `prisma/seed/`, `data/2024/normalized/subclasses.json`, `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/lib/logic/choicePoolRules.ts`


### L06-subclasses-03 — Усі 241 підкласові риси 2024 позначені PASSIVE і не мають жодного обмеженого використання чи пулу ресурсів

**Статус:** ✅ закрито (KR31.3, 2026-09-07): 93 підкласові фічі мають лічильник із джерела, 31 — ключ пулу, з якого витрачають, 118 не пасивні.

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:5278 (Wholeness of Body) «You can use this feature a number of times equal to your Wisdom modifier … regain all expended uses when you finish a Long Rest»; classes.md:9786 (Dark One's Own Luck) те саме через Харизму; classes.md:3003 (Preserve Life) «As a Magic action … expend a use of your Channel Divinity»

**Має бути:** Підкласові риси-дії стоять у розділах «Дії / Бонусні дії / Реакції» листа, мають лічильник використань і, де треба, пул ресурсу (кубики переваги, кубики псіонічної енергії, Channel Divinity).

**Є:** Усі 241 риси падають у «Пасивні»; лічильників використань і пулів ресурсів у 2024 не існує взагалі.

**Доказ:** SQL: `select s.ruleset, f.display_type, count(*) from subclass s join subclass_feature sf using(subclass_id) join feature f using(feature_id) group by 1,2` → RULES_2024 {PASSIVE} 241 і більше нічого; RULES_2014 {PASSIVE} 408, {ACTION} 92, {BONUSACTION} 72, {REACTION} 57, {CLASS_RESOURCE} 5. `count(*) filter (where uses_count is not null or uses_count_special is not null)` → 2024: 0 з 241; 2014: 91 з 638. `uses_pool_key` → 2024: 0; 2014: 96. Порівняння тих самих рис: Warding Flare 2014 = {REACTION}+LONG_REST, 2024 = {PASSIVE} без використань; War Priest 2014 = {BONUSACTION}+LONG_REST, 2024 = {PASSIVE}; Combat Superiority 2014 = {CLASS_RESOURCE}+SHORT_REST+uses_pool_key=SUPERIORITY_DICE, 2024 = {PASSIVE}, pool=null. Текст у самій базі суперечить типу: «Path of the Berserker: Retaliation (2024)» — «ви можете реакцією зробити одну атаку», display_type={PASSIVE}; «War Domain: War Priest (2024)» — «Бонусною дією … кількість разів, що дорівнює вашому модифікатору Мудрості … відновлюєте … короткий або довгий відпочинок», uses_count=null. Проба Клірика Life Domain 5: POOLS: [].

**Відтворення:** SQL-запити вище на spells_test; наскрізна проба Клірика Life Domain 5 → persResourcePools порожній.

**Куди дивитись:** Заповнити display_type, uses_count/uses_count_special, limited_uses_per, uses_pool_key у джерелі сіду 2024 (data/2024/normalized/subclasses.json полів не має — їх треба туди додати) і перелити сідом, а не проходом по базі (Р33).

**Файли:** `data/2024/normalized/subclasses.json`, `prisma/seed/`


### L06-subclasses-04 — Жодна підкласова риса 2024 не дає володінь, експертизи, КЗ чи ХП — Draconic Resilience і Dazzling Footwork рахуються не за книгою

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Статус:** 🔴 частково (KR31.6, 2026-09-13). Хіти Драконячої живучості 2024 закрито (див. `L09-sheet-derived-07`); КЗ іде армор-рядком `DRACONIC_RESILIENCE`. Володіння, експертиза підкласів 2024 і Dazzling Footwork не бралися.

**Правило:** Текст самих рис у базі (переклад PHB 2024): «College of Lore: Bonus Proficiencies (2024)» — «Ви отримуєте Володіння трьома навичками на ваш вибір»; «Assassin: Assassin's Tools (2024)» — «Ви отримуєте Набір для маскування та Набір отруйника, і ви маєте Володіння ними»; «Draconic Sorcery: Draconic Resilience (2024)» — «Ваш максимум Хіт Поїнтів збільшується на 3 і збільшується ще на 1 щоразу, коли ви отримуєте черговий рівень Чародія … поки ви не носите броню, ваш базовий Клас Броні дорівнює [13 + мод. Спритності]»; «College of Dance: Dazzling Footwork (2024)» — «Ваш базовий Клас Броні дорівнює 10 плюс модифікатори Спритності та Харизми»

**Має бути:** Драконячий чародій 2024 має +1 ХП за рівень чародія та базовий КЗ 13+DEX без броні; бард Коледжу танцю — КЗ 10+DEX+CHA; Коледж знань — три навички на вибір; Асасин — володіння двома наборами.

**Є:** Жоден із цих ефектів не існує як дані, тому ХП, КЗ, навички й володіння порахуються без них.

**Доказ:** SQL: `select s.ruleset, count(*) filter (where f.skill_proficiencies is not null), count(*) filter (where f.skill_expertises is not null), count(*) filter (where array_length(f.armor_proficiencies,1)>0), count(*) filter (where f.weapon_proficiencies is not null), count(*) filter (where array_length(f.tool_proficiencies,1)>0), count(*) filter (where f.gives_ac is not null or f.modifies_ac is not null), count(*) filter (where f.bonus_hit_points_per_level is not null) from subclass s join subclass_feature sf using(subclass_id) join feature f using(feature_id) group by 1` → RULES_2024: 0 0 0 0 0 0 0 (з 241); RULES_2014: 4 1 9 5 4 0 0 (з 638). Точкова вибірка підтвердила: у Draconic Resilience 2024 gives_ac=null, modifies_ac=null, bonus_hit_points_per_level=null.

**Відтворення:** SQL вище на spells_test.

**Куди дивитись:** Ті самі сіди 2024, що й у L06-subclasses-03: заповнити skill_proficiencies, tool_proficiencies, weapon/armor_proficiencies, modifies_ac/gives_ac, bonus_hit_points_per_level. Для «трьох навичок на вибір» потрібен ще choice_option (див. -05).

**Файли:** `data/2024/normalized/subclasses.json`, `prisma/seed/`


### L06-subclasses-05 — У підкласів 2024 немає жодного структурованого вибору — таблиця subclass_choice_option порожня, тож Circle of the Land, Hunter's Prey, Elemental Affinity і маневри Battle Master не вибираються

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** data/2024/srd/classes.md:6817 (Hunter's Prey) «You gain one of the following feature options of your choice … you can replace the chosen option with the other one» (Colossus Slayer / Horde Breaker); classes.md:4410 (Circle of the Land Spells) «choose one type of land: arid, polar, temperate, or tropical»

**Має бути:** Крок «Опції підкласу» на 3-му (і 7/11/…) рівні з реальними варіантами, збережений вибір гравця, видимий на листі й у друці.

**Є:** Крок ніколи не з'являється (levelup-persistence.ts:103 фільтрує порожній список, LevelUpWizard крок не додає), вибір гравця не існує як дані. Маневри Battle Master 2024 не вибираються й не показуються.

**Доказ:** SQL: `select count(*) from subclass s join subclass_choice_option sco using(subclass_id) where s.ruleset='RULES_2024'` → 0. src/lib/generated/creator-content-2024.json підтверджує: усі 48 підкласів мають 0 subclassChoiceOptions. Текст у базі: «Draconic Sorcery: Elemental Affinity (2024)» — «Оберіть один з таких типів: Кислотна, Холодна, Вогняна, Блискавична або Отруйна»; «Battle Master: Combat Superiority (2024)» — «Ви опановуєте три маневри на вибір … ще два додаткові маневри на вибір»; «Hunter: Hunter's Prey (2024)» — «Ви отримуєте один із наведених нижче варіантів фічі на вибір».

**Відтворення:** SQL вище; або підняти воїна 2024 до 3-го рівня з Battle Master — кроку «Опції підкласу» немає.

**Куди дивитись:** Завести choice_option + subclass_choice_option для 2024 у сіді. Механіка кроку в майстрі вже є й працює для 2014 (levelup-persistence.ts:102-110, 674-691).

**Файли:** `prisma/seed/`, `src/server/db/levelup-persistence.ts`, `src/lib/components/characterCreator/SubclassChoiceOptionsForm.tsx`

**Скептик:** Знахідку підтверджено власними доказами, але класифікацію треба виправити з missing-system на data.

1) ПРАВИЛО. Оракул цитовано точно й для правильної редакції: data/2024/srd/classes.md — Hunter's Prey «You gain one of the following feature options of your choice… you can replace the chosen option with the other one» (Colossus Slayer / Horde Breaker), Defensive Tactics так само; Circle of the Land Spells «choose one type of land: arid, polar, temperate, or tropical». Battle Master поза SRD, але сам файл сідів (data/2024/normalized/subclasses.json, риса «Бойова перевага») каже: «Ви опановуєте три маневри на вибір… ще два додаткові маневри на вибір, коли досягаєте 7, 10 та 15 рівня Воїна».

2) ДАНІ (мій незалежний замір на spells_test). subclass ⋈ subclass_choice_option за редакцією: RULES_2014 — 118 опцій у 12 підкласів; RULES_2024 — жодного рядка. У 2014 бракує саме тих груп: «Маневри майстра бою» (23), «Здобич мисливця»/«Оборонна тактика»/«Захист вищого мисливця», «Коло землі (біом)» (8), «Дракон-предок» (10). Те саме з робочої бази: creator-content-2024.json — 48 підкласів / 0 subclassChoiceOptions, creator-content-2014.json — 118 / 118. Джерело сідів структури не несе взагалі: риса в normalized/subclasses.json має лише {level, name, description}; таблиця маневрів злита в прозу «Бойової переваги» (зафіксовано в docs/o6-rules-2024-import/kr6.2-extraction-translation.md:367).

3) КОД. Альтернативної гілки немає. Майстер будує групи з effectiveSubclass.subclassChoiceOptions (LevelUpWizard.tsx:631-665) і додає крок лише за непорожньої мапи (:851); сервер робить те саме в levelup-persistence.ts:108-116 (автор помилково вказав :103 і приписав фільтр серверу — насправді фільтрують обидва боки незалежно, висновок той самий). Хардкоду 2024-виборів ніде немає.

4) РІШЕННЯ ВЛАСНИКА. Немає ні в DECISIONS.md, ні в «Прийнято» KNOWN-BUGS.md, ні в «Поза межами» o18/README.md. Найближче — o23-rules-beyond-srd/README.md:42-44: «optionalfeatures.json — бойові стилі, потойбічні виклики, метамагія, маневри. Це опції персонажа, місце їм у каталогах і в O18». Тобто власник адресував це в O18, а O18 закрито 8/8, не зробивши. KR18.4:113-124, який цитує автор, стосується grants_spells/expanded_spells (заклинань), а не structured choices — до цієї знахідки він не належить.

5) IN-FLIGHT / ВІДКРИТИЙ KR. Жоден із файлів паралельної сесії не зачеплений (seed-и, LevelUpWizard, choicePoolRules у списку відсутні). Відкритого KR на це немає — дірка неприкрита.

6) СЕРЙОЗНІСТЬ. P1 за шкалою правильна: «відсутня риса/вибір» і «вибір гравця губиться». Battle Master 2024 на 3-му рівні за книгою мусить обрати три маневри — вибору не існує як даних; Elemental Affinity (тип шкоди) і біом Кола землі — теж обовʼязкові за книгою вибори. Персонаж 2024 виходить неповним там, де той самий підклас 2014 повний.

ВИПРАВЛЕННЯ ДО ЗВІТУ. (а) Класифікація — data, не missing-system: механізм цілий і edition-agnostic (subclass_choice_option + крок майстра + серверне збереження працюють для 2014), бракує рядків контенту. Більше того, getChoicePoolRule (choicePoolRules.ts:40-45) звіряє лише subclassName без редакції, а підклас 2024 зветься так само BATTLE_MASTER (перевірив: BATTLE_MASTER є і у FIGHTER_2014, і у FIGHTER_2024) — тож твердження member_evidence «спрацює лише для 2014-підкласу» хибне, правило кількості маневрів підхопиться саме. (б) Через це effort радше M (сід опцій + ChoiceOptionFeature + переклади, розріз прози маневрів), а не L; окремим питанням лишається лише те, що 2024 дозволяє переобирати Hunter's Prey після відпочинку й біом Кола землі щодовгого відпочинку — наявна модель тримає постійний вибір, це свідоме спрощення, не блокер.


### L07-spellcasting-01 — Підкласові «завжди підготовлені» заклинання 2024 не існують у даних узагалі — жоден підклас не дає жодного заклинання

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-08 (KR31.5). Усі три очікувані переліки збіглися з тим, що видала
правка: клірик — 6 рядків, паладин — 4, чорнокнижник — 6 понад заклинання спадщини. Фікстури
десятки перезнято за фактом.

**Правило:** data/2024/srd/classes.md:2970 (Life Domain): «When you reach a Cleric level specified in the Life Domain Spells table, you thereafter always have the listed spells prepared» — рів. 3: Aid, Bless, Cure Wounds, Lesser Restoration; рів. 5: Mass Healing Word, Revivify. Так само :6008 (Oath of Devotion) і :9751 (Fiend Spells).

**Має бути:** Клірик 5 (Домен життя) має 6 рядків pers_spell з isPrepared=true й excludeFromPreparedCount=true (Aid, Bless, Cure Wounds, Lesser Restoration, Mass Healing Word, Revivify); Паладин 5 (Клятва відданості) — 4 (Protection from Evil and Good, Shield of Faith, Aid, Zone of Truth); Чорнокнижник 5 (Почвара) — 6 (Burning Hands, Command, Scorching Ray, Suggestion, Fireball, Stinking Cloud).

**Є:** Нуль рядків у всіх трьох. Гравець мусить додати їх вручну, і тоді вони зʼїдають ліміт підготовлених класу.

**Доказ:** Запит до spells_test: `select count(*) from feature f join "_FeatureToSpell" fs on fs."A"=f.feature_id join subclass_feature sf on sf.feature_id=f.feature_id join subclass s on s.subclass_id=sf.subclass_id where s.ruleset='RULES_2024'` → 0. `select count(*) from "_SubclassExpandedSpells"` → 0. Фічі-носії в базі є й порожні: «Life Domain: Life Domain Spells (2024)» (level_granted 3), «Oath of Devotion: Oath of Devotion Spells (2024)» (3), «Circle of the Land: Circle of the Land Spells (2024)» (3). Програмна збірка фікстур через справжні серверні дії (scratchpad/audit/work/L07-spellcasting/probe.test.ts → probe-out.json): 02-dwarf-cleric-farmer (Клірик 5 / LIFE_DOMAIN) persSpells = []; 07-human-paladin-noble (Паладин 5 / OATH_OF_DEVOTION) persSpells = []; 09-chthonic-tiefling-warlock-charlatan (Чорнокнижник 5 / FIEND_PATRON) має лише 4 заклинання спадщини тифлінга, жодного від патрона.

**Відтворення:** bunx vitest run --config /private/tmp/claude-502/.../scratchpad/audit/work/L07-spellcasting/vitest.l07.mts (з кореня репо) → probe-out.json, поле spells для 02/07/09.

**Куди дивитись:** Додати звʼязок feature→spell у data/2024/normalized/subclasses.json і сід підкласів; надавати рядки поруч із findGrantedSpells тим самим механізмом, що й заклинання видів (buildSpeciesPersSpellRows кладе isPrepared+excludeFromPreparedCount).

**Файли:** `data/2024/normalized/subclasses.json`, `src/rules/spell-sources.ts`, `src/server/db/character-creation.ts`, `src/server/db/levelup-persistence.ts`, `src/server/db/species-level-grants.ts`


### L08-levelup-machine-04 — У редакції 2024 немає жодного вибору всередині підкласу — крок subclass-choices не зʼявиться ніколи

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md — підкласи на кшталт Battle Master дають «choose N maneuvers», Circle of the Land — вибір місцевості тощо

**Має бути:** Підкласи 2024, які дають вибір із списку, пропонують його на своєму рівні.

**Є:** Жодного subclassChoiceOption для 2024 у базі немає; крок «Опції підкласу» для 2024 недосяжний.

**Доказ:** prisma.subclassChoiceOption.findMany({ where: { subclass: { class: { ruleset: 'RULES_2024' } } } }) → 0 (виміряно у прогоні fixture-probe.test.ts). Той самий нуль SQL-запитом по subclass_choice_option join subclass join class where class.ruleset='RULES_2024'. Крок майстра LevelUpWizard.tsx:844-851 включається лише за непорожнього subclassChoiceGroups.

**Відтворення:** Будь-який персонаж 2024 з підкласом, що за книгою має вибір, підвищується без кроку «Опції підкласу».

**Куди дивитись:** Наповнити subclass_choice_option для 2024 з data/2024/normalized/subclasses.json; поки цього немає — крок мертвий за визначенням.

**Файли:** `prisma/seed/`, `data/2024/normalized/subclasses.json`, `src/lib/components/levelUp/LevelUpWizard.tsx`


### L09-sheet-derived-07 — Драконяча живучість 2024 не додає хітів — половина риси (КЗ) працює, половина (хіти) ні

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Статус:** ✅ закрито 2026-09-13 (KR31.6) для нових рівнів. `bonus_hit_points_per_level = 1` на Драконячій живучості обох редакцій (`prisma/seed/hitPointsPerLevel.ts`); `sumLevelUpFeatureHitPoints` у `src/rules/hit-points.ts` рахує фічу класу чи підкласу лише за рівні свого класу і заднім числом на рівні відкриття, фічу виду — за кожен рівень персонажа. Сервер і превʼю майстра — одним правилом. `tests/db/draconic-resilience-hit-points-2024.test.ts`: дворф Монах 4 / Чародій-дракон 4 — 59 (було 55; без заднього числа — 57). Уже створені персонажі хітів за минулі рівні не отримали — за рішенням власника 2026-09-13 їхній `max_hp` не дописується.

**Правило:** data/2024/srd/classes.md:8635 — «Your Hit Point maximum increases by 3, and it increases by 1 whenever you gain another Sorcerer level».

**Має бути:** Чародій-дракон 5: +3 хіти на 3-му рівні, +1 на 4-му, +1 на 5-му = +5 до максимуму.

**Є:** +0 до максимуму хітів; КЗ 10+СПР+ХАР при цьому працює.

**Доказ:** SQL: `select feature_id, eng_name, bonus_hit_points_per_level from feature where eng_name like '%Draconic Resilience%'` → 48754 «Draconic Sorcery: Draconic Resilience (2024)» null; 8603 «Draconic Resilience» (2014) null. `select … from feature where bonus_hit_points_per_level is not null` → лише «Dwarf: Dwarven Toughness (2024)» = 1 і «Dwarven Toughness (Hill Dwarf Subrace)» = 1. Половина риси при цьому змодельована: армор-рядок DRACONIC_RESILIENCE (armor_id 376, base_ac 10, {DEX,CHA}, RULES_2024) є, і src/rules/armor-class-formulas.ts його видає.

**Відтворення:** Створити SORCERER_2024 з підкласом Draconic Sorcery, підняти до 5-го рівня → maxHp без +5.

**Куди дивитись:** Механізм bonusHitPointsPerLevel рахує від 1-го рівня персонажа, а тут потрібно «від рівня класу, з якого відкрилася фіча» — або нове поле, або окреме правило в src/rules/hit-points.ts.

**Файли:** `src/rules/hit-points.ts`, `data/2024/normalized/subclasses.json`, `src/server/db/character-creation.ts`


### L13-wildshape-05 — «Місячний крок» Кола місяця 2024 (рівень 10) не має лічильника використань, хоча правило дає їх МУД-модифікатор на довгий відпочинок

**Статус:** ✅ закрито (KR31.3, 2026-09-07): «Місячний крок» несе `usesCountSpecial` формулою від МУД із мінімумом 1 і `LONG_REST`, виведеними з джерела.

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/normalized/subclasses.json, Circle of the Moon → «Місячний крок»: «Ви можете використовувати цю фічу кількість разів, що дорівнює вашому модифікатору Мудрості (мінімум один раз), і ви відновлюєте всі витрачені використання, коли завершуєте довгий відпочинок»

**Має бути:** Друїд Кола місяця 10 рівня бачить лічильник «Місячний крок X / мод.МУД», який відновлює довгий відпочинок.

**Є:** Фіча без ресурсу — гравець рахує використання руками поза застосунком.

**Доказ:** Запит до spells_test: feature_id 48627 «Circle of the Moon: Moonlight Step (2024)» — uses_count NULL, uses_count_special NULL, uses_pool_key NULL, level_granted 10. У проєкті для такого вже є готова форма: src/lib/logic/feature-resources.ts:113–121 обробляє `usesCountSpecial = { type: "FORMULA", group: "STAT_BASED", base: 0, stat: "wis", minimum: 1 }`.

**Відтворення:** Запит до бази (вище) або лист друїда 2024 Кола місяця 10 рівня, слайд «Фічі».

**Куди дивитись:** Заповнити usesCountSpecial (STAT_BASED / wis / minimum 1) і limitedUsesPer LONG_REST у сіді підкласів 2024 для feature 48627.

**Файли:** `prisma/seed/subclassSeed2024.ts`, `data/2024/normalized/subclasses.json`


## Дика форма (9)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P1 | 2024 | data | `L13-wildshape-01` | Друїд 2024 не має лічильника використань Дикої форми: фіча в базі без пулу й без чисел, вхід у форму нічого не витрачає | src/rules/wildshape-uses.ts, src/server/db/wildshape-uses.ts |
| · | P1 | 2024 | missing-system | `L13-wildshape-02` | Модель відпочинку не вміє «повернути одне використання» — короткий відпочинок віддасть друїду 2024 весь пул Дикої форми | src/server/db/rest-actions.ts, prisma/schema.prisma |
| · | P1 | 2024 | data | `P5-druid-secondary-flows-04` | Дика форма 2024 не має використань: ні лічильника на листі, ні витрати при перевтіленні, ні відновлення відпочинком | prisma/seed/, src/server/db/wildshape-uses.ts |
| · | P1 | 2024 | bug | `P5-druid-secondary-flows-05` | findFormFeature звʼязує тип істоти з фічею за англійською назвою «Wild Shape», якої в 2024 немає | src/rules/wildshape-uses.ts |
| ↓ | P2 | 2024 | bug | `L11-persistence-identity-04` | Ціна Дикої форми 2024 не знаходить свою фічу: `findFormFeature` шукає `engName === "Wild Shape"`, а фіча 2024 — «Druid: Wild Shape (2024)» | src/rules/wildshape-uses.ts, src/server/db/wildshape-uses.ts |
| · | P2 | 2014 | bug | `L13-wildshape-03` | Дика форма 2014 не бере вищий модифікатор навички/ряткидка зі статблока звіра, хоча правило 2014 це вимагає | src/rules/wildshape.ts, src/lib/logic/beast-form.ts |
| · | P2 | both | bug | `L13-wildshape-04` | Копія персонажа, копія теки, імпорт наданого персонажа і знімок рівня гублять усі прикріплені звірині форми | src/lib/logic/pers-duplication.ts, src/server/db/snapshots.ts |
| · | P2 | 2024 | bug | `P5-druid-secondary-flows-06` | Короткий відпочинок відновлює пул Дикої форми повністю, тоді як 2024 повертає рівно одне використання | src/server/db/rest-actions.ts, src/lib/logic/feature-resources.ts |
| · | P3 | 2014 | data | `L13-wildshape-08` | Архідруїд 20 рівня 2014 — «Дика форма без обмежень» — не знімає лічильника, пул лишається 2 / 2 | prisma/seed/classFeatureSeed.ts, src/lib/logic/feature-resources.ts |

### L13-wildshape-01 — Друїд 2024 не має лічильника використань Дикої форми: фіча в базі без пулу й без чисел, вхід у форму нічого не витрачає

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:3533 — «You can use Wild Shape twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest»; колонка Wild Shape таблиці Друїда: 2 / 3 (з 6) / 4 (з 17)

**Має бути:** Друїд 2024 бачить «Використань 2 / 2» з 2 рівня (3 з 6, 4 з 17), вхід у форму списує одне використання, «Дикий супутник» і «Дике відродження» мають із чого платити.

**Є:** Лічильника немає взагалі, перевтілень необмежено, фіча позначена PASSIVE і не має ані ресурсу, ані дії на слайді Фіч.

**Доказ:** Запит до spells_test: feature_id 48895 «Дика форма» / eng_name «Druid: Wild Shape (2024)» має uses_count NULL, uses_pool_key NULL, limited_uses_per NULL, uses_count_special NULL, display_type {PASSIVE}. Ширший запит `select … from feature f join class_feature cf … join class c … where c.ruleset='RULES_2024' and (f.uses_count is not null or f.uses_count_special is not null or f.uses_pool_key is not null)` повертає 0 рядків. Код падає двічі: src/server/db/wildshape-uses.ts:70 фільтрує `where: { usesPoolKey: WILDSHAPE_POOL_KEY, ...owned }` (у фічі 2024 ключ порожній), а src/rules/wildshape-uses.ts:26 шукає фічу з engName === "Wild Shape" — 2024-ва зветься «Druid: Wild Shape (2024)». Це рівно та пастка, яку docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md («Пастка, зафіксована заздалегідь») попереджав шукати. Наслідок: loadWildshapeForms (wildshape-actions.ts:92) віддає uses: null, WildshapeCard.tsx:106 малює бейдж лише `{uses && …}`, spendWildshapeUse (wildshape-actions.ts:214) повертає null нічого не списавши.

**Відтворення:** 1) Створити друїда 2024 (будь-який рівень ≥ 2). 2) Відкрити лист, слайд «Спорядження» — картка «Дика форма» без бейджа «Використань». 3) Прикріпити форму й натиснути «Перетворитися» кілька разів поспіль — жодного списання, жодного попередження.

**Куди дивитись:** Обидва боки одночасно: (а) сід 2024 — для feature 48895 задати usesPoolKey "WILD_SHAPE", usesCountSpecial [{lvl:2,uses:2},{lvl:6,uses:3},{lvl:17,uses:4}], displayType [CLASS_RESOURCE, ACTION]; (б) src/rules/wildshape-uses.ts — FORM_FEATURE_BY_CREATURE_TYPE мусить знати обидва engName (або звіряти за usesPoolKey + типом істоти). Сама лише правка даних не пройде звірку за engName.

**Файли:** `src/rules/wildshape-uses.ts`, `src/server/db/wildshape-uses.ts`, `src/lib/components/characterSheet/WildshapeCard.tsx`, `prisma/seed/classSeed2024.ts`, `data/2024/normalized/classes.json`


### L13-wildshape-02 — Модель відпочинку не вміє «повернути одне використання» — короткий відпочинок віддасть друїду 2024 весь пул Дикої форми

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:3533 — «You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest»

**Має бути:** Короткий відпочинок повертає друїду 2024 рівно одне використання Дикої форми; довгий — усі.

**Є:** Механізму часткового відновлення немає; будь-який пул із SHORT_REST відновлюється повністю. Сьогодні недосяжно через L13-wildshape-01 — і саме тому небезпечно: найпростіша правка 01 (дати фічі limitedUsesPer: SHORT_REST) дасть 2024-му друїду повне відновлення на короткому й виглядатиме «як працює».

**Доказ:** src/server/db/rest-actions.ts:221–243: для кожного пулу з провайдером SHORT_REST виконується `data: { usesRemaining: maxUses }` — відновлення до максимуму. Іншого режиму в моделі немає: prisma/schema.prisma:1802 `enum RestType { SHORT_REST LONG_REST DAY }`, поля «скільки саме повертається» не існує (grep usesRestoredOnRest|restoreAmount|regainOne по src і schema.prisma — порожньо).

**Відтворення:** Код-рівень: rest-actions.ts:221–243 не має гілки часткового відновлення; enum RestType не має відповідного значення.

**Куди дивитись:** Потрібне поле «скільки повертається за відпочинок» (наприклад usesCountSpecial-подібний JSON `{ shortRest: 1 }` або нова колонка) плюс гілка в shortRest(): `usesRemaining = min(max, remaining + n)` замість `= max`. 2014 при цьому має лишитися повним відновленням.

**Файли:** `src/server/db/rest-actions.ts`, `prisma/schema.prisma`, `db/changes/`


### P5-druid-secondary-flows-04 — Дика форма 2024 не має використань: ні лічильника на листі, ні витрати при перевтіленні, ні відновлення відпочинком

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** data · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:3533 — «_Number of Uses._ You can use Wild Shape twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.»

**Має бути:** Друїд 5 рівня бачить «Використань 2 / 2»; вхід у форму знімає 1; короткий відпочинок повертає одне, довгий — усі. Стовпчик Wild Shape таблиці класу: 2 / 3 / 4 (рівні 2 / 6 / 17).

**Є:** Лічильника немає взагалі, spendWildshapeUse — no-op (wildshape-uses.ts:50-61 виходить на `if (!uses) return null`), відпочинки не мають чого відновлювати. Разом із цим мовчки не працюють «Дикий супутник» (classes.md:3588) і «Дике відродження» 5 рівня (classes.md:3602-3604), які платять використаннями Дикої форми.

**Доказ:** Запит до spells_test: feature 17928 «Wild Shape» → limited_uses_per=SHORT_REST, uses_count=2, uses_pool_key=WILD_SHAPE (RULES_2014); feature 48895 «Druid: Wild Shape (2024)» → limited_uses_per=NULL, uses_count=NULL, uses_pool_key=NULL. У персонажа pers 13 (Друїд 5) `resourcePools` порожній (work/P5-druid-secondary-flows/built.json → "POOLS": []). На листі (shots/P5-sheet-original.png) картка ДИКА ФОРМА показує «Відомі форми 0 / 6» і рядок обмежень, але рядка «Використань N / M» немає — він малюється лише за `uses !== null` (src/lib/components/characterSheet/WildshapeCard.tsx:106-108), а findWildshapeUses віддає null, бо findFormFeatureOfPers шукає `where: { usesPoolKey: "WILD_SHAPE" }` (src/server/db/wildshape-uses.ts:64-73).

**Відтворення:** Відкрити лист 2024-друїда 2+ рівня → картка «ДИКА ФОРМА» → рядка «Використань» немає; прикріпити форму й перетворитися — нічого не списується.

**Куди дивитись:** У сіді фічі «Druid: Wild Shape (2024)» проставити usesPoolKey = WILD_SHAPE, usesCountSpecial із прогресією 2/3/4 за рівнем друїда (пороги 2/6/17) і limitedUsesPer = SHORT_REST — але без P5-05 і P5-06 запис нічого не змінить.

**Файли:** `prisma/seed/`, `src/server/db/wildshape-uses.ts`, `src/lib/components/characterSheet/WildshapeCard.tsx`


### P5-druid-secondary-flows-05 — findFormFeature звʼязує тип істоти з фічею за англійською назвою «Wild Shape», якої в 2024 немає

**Рівень:** P1 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Ціна перевтілення у звіра знаходиться для друїда обох редакцій.

**Є:** Для 2024 збігу не буде навіть після того, як фічі проставлять usesPoolKey — це другий, незалежний розрив того самого ланцюга, тож виправлення лише даних (P5-04) залишить поведінку без змін.

**Доказ:** src/rules/wildshape-uses.ts:29-33 — `FORM_FEATURE_BY_CREATURE_TYPE = [{ creatureType: "звір", engName: "Wild Shape" }, { creatureType: "елементаль", engName: "Elemental Wild Shape" }]`, далі `features.find((feature) => feature.engName === engName)` (:41-46). Англійська назва фічі 2024 в базі — «Druid: Wild Shape (2024)» (feature_id 48895, запит до spells_test).

**Відтворення:** Проставити usesPoolKey=WILD_SHAPE фічі 48895 у spells_test і відкрити лист — лічильник усе одно не зʼявиться.

**Куди дивитись:** Тримати список назв на тип істоти (наприклад ["Wild Shape", "Druid: Wild Shape (2024)"]) або звʼязувати фічу з типом істоти окремим полем даних замість літерала англійської назви.

**Файли:** `src/rules/wildshape-uses.ts`


### L11-persistence-identity-04 — Ціна Дикої форми 2024 не знаходить свою фічу: `findFormFeature` шукає `engName === "Wild Shape"`, а фіча 2024 — «Druid: Wild Shape (2024)»

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт скептика:** downgraded

**Правило:** data/2024/srd/classes.md, Druid рівень 2 — Wild Shape: 2 використання, відновлюються на Short/Long Rest

**Має бути:** Перевтілення друїда 2024 списує використання Дикої форми за `usePrice` фічі, а на нулі показує попередження `describeUseShortfall`.

**Є:** `findFormFeature` повертає `null` → `findFormPrice(null)` = 1, але списувати нема з чого (пулу WILD_SHAPE у 2024 немає, див. -03) → перевтілення безкоштовне і без лічильника.

**Доказ:** src/rules/wildshape-uses.ts:24-37 — `const FORM_FEATURE_BY_CREATURE_TYPE = [{ creatureType: "звір", engName: "Wild Shape" }, { creatureType: "елементаль", engName: "Elemental Wild Shape" }]` і `return features.find((feature) => feature.engName === engName) ?? null;`. Запит: `select feature_id, eng_name, uses_pool_key from feature where ruleset='RULES_2024' and eng_name ilike '%wild shape%'` → `48895 | "Druid: Wild Shape (2024)" | uses_pool_key null`. Рядка `Wild Shape` у RULES_2024 немає взагалі.

**Відтворення:** Друїд 2024 рівня 2 → лист → додати звірину форму й активувати; лічильник використань не змінюється.

**Куди дивитись:** Тримати звʼязок «тип істоти → фіча» ключем, стійким до редакції (пара `(engName, ruleset)` або окремі записи на редакцію); разом із -03 і -07.

**Файли:** `src/rules/wildshape-uses.ts`, `src/server/db/wildshape-uses.ts`

**Скептик:** (1) ПРАВИЛО — підтверджено: data/2024/srd/classes.md:3529-3535 «Level 2: Wild Shape … You can use Wild Shape twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest». Правило саме 2024.

(2) КОД — механізм підтверджено власним доказом, але причинний ланцюг автора неточний. У src/server/db/wildshape-uses.ts:67-70 запит спершу фільтрує `usesPoolKey = 'WILD_SHAPE'`, і лише потім `findFormFeature` порівнює engName. У spells_test пул WILD_SHAPE носять рівно 6 фіч — усі RULES_2014 (8710, 8713, 8718, 8723, 8728, 17928); для друїда 2024 кандидатів нуль, тож `null` сьогодні повертає **фільтр пулу**, а не збіг імені. Тобто «actual» автора («перевтілення безкоштовне і без лічильника») правдивий, але його безпосередня причина — знахідка -03 (дані), а не цей рядок. Сама ж вада engName реальна і **латентна**: `feature.eng_name` глобально `@unique` (prisma/schema.prisma:408), а classSeed2024.ts:306-315 завжди будує `${className}: ${feature.name} (2024)`, хоча в джерелі data/2024/normalized/classes.json фіча зветься просто «Wild Shape». Тому виправлення самих лише даних (проставити usesPoolKey на 48895) лічильника НЕ поверне. Довів чистою функцією: `bun run` probe → `findFormFeature([{featureId:48895, engName:"Druid: Wild Shape (2024)"}], "звір")` = `null`, `findFormPrice(null)` = 1; той самий виклик із «Wild Shape» (17928) знаходить фічу. Іншого місця, що звʼязує тип істоти з фічею оплати, у src/ немає (єдиний споживач — findWildshapeUses/spendWildshapeUse у wildshape-actions.ts:92,214).

(3) РІШЕННЯ ВЛАСНИКА — прямого рішення «так і має бути» немає. Але відсутність лічильника 2024 **задокументована як свідомо відкладена**: docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md, розділ «Виміряно й лишено поза межами»: «Використань Дикої форми в 2024 немає — і це не регресія цього KR… Підключення пулу — це сід контенту 2024, а не план KR24.6»; те саме в рядку O24 docs/README.md. Важливо: там же стоїть хибне твердження «щойно фіча дістане usesPoolKey, лічильник зʼявиться сам» — саме його моя проба спростовує, і це єдина справжня новина знахідки.

(4) IN-FLIGHT — ні: src/rules/wildshape-uses.ts і src/server/db/wildshape-* не входять у список файлів паралельної сесії (KR27.7/KR30.3 — заклинання).

(5) ВЖЕ ВІДКРИТО — окремого KR під ресурси 2024 немає; KR24.6 закрито 2026-09-01, KR24.5 закрито 2026-09-01. Робота лежить у зоні сідів 2024 (та сама, що знахідка -03).

(6) СЕРЙОЗНІСТЬ — P1 не тримається. Сьогодні -04 нічого не змінює у видимій поведінці: при виправленні тільки цього рядка лічильника все одно не буде (немає пулу), а при виправленні тільки даних — теж не буде (не збігається імʼя). Персонаж не рахується «не за книгою» через цей рядок, вибір гравця не губиться; це латентна пастка, яка вистрелить при закритті -03. P2 за шкалою («немає можливості, яку має зрілий білдер» — трекер використань Дикої форми) і рівно та оцінка, яку поставив сам автор у своєму звіті (у переданому мені записі severity піднято до P1 помилково). Класифікація bug (код), а не data: дані — це -03.


### L13-wildshape-03 — Дика форма 2014 не бере вищий модифікатор навички/ряткидка зі статблока звіра, хоча правило 2014 це вимагає

**Рівень:** P2 · **Редакція:** 2014 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06 — але не так, як пропонував автор.** Оракул автора слабкий: у `data/2014/srd/` класів немає взагалі, а цитата — зі статблока НІП-друїда в 5etools-бестіарії, не з PHB. Рішення власника 2026-09-06: реалізувати RAW **повністю**, а не звужувати до перетину — персонаж лишає свої володіння, додатково отримує володіння звіра, і де число статблока вище, береться воно. Тому прапорець `usesBetterOfBeastProficiencies` зник узагалі, а `raiseProficienciesToBeast` діє в обох редакціях. Тест `tests/logic/beast-form.test.ts:323` переписано разом із правкою: той самий вовк тепер дає Уважність +5 і Непомітність +4 замість +4 / +2, а власне володіння, вище за звірине, лишається власним.

**Правило:** data/5etools/raw/bestiary/bestiary-lr.json:181 (статблок друїда-НІП, який дослівно цитує Дику форму 2014): «Amble also retains all their skill and saving throw proficiencies, in addition to gaining those of the creature. If the creature has the same proficiency as Amble and the bonus in its stat block is higher, use the creature's bonus instead of Amble's.»

**Має бути:** Друїд 8 рівня 2014 із володінням Непомітністю у формі Гігантського павука (creatures.json: КР 1, «Непомітність +7», СПР 16 (+3)) показує +7.

**Є:** Показує +6 (+3 від СПР звіра + 3 БМ) — статблок ігнорується.

**Доказ:** src/rules/wildshape.ts: `export function usesBetterOfBeastProficiencies(ruleset: Ruleset): boolean { return ruleset === "RULES_2024"; }`, а коментар над нею стверджує, що 2014 «статблок для цього не читає — це прямо протилежні правила». Поведінка закріплена тестом tests/logic/beast-form.test.ts:323–334 («2014 володіння зі статблока не бере — той самий вовк, інша редакція»), тобто це зафіксоване рішення, а не проґавлення. src/lib/logic/beast-form.ts:144 `if (!usesBetterOfBeastProficiencies(layer.context.ruleset)) return pers;`

**Відтворення:** 1) Друїд 2014, рівень 8, володіння Непомітністю. 2) Прикріпити «Гігантський павук» і перетворитися. 3) Слайд «Навички» → Непомітність = +6 замість +7.

**Куди дивитись:** Правило 2014 вужче за 2024: брати число зі статблока тільки там, де персонаж теж володіє навичкою/ряткидком. Тобто не `usesBetterOfBeastProficiencies` як прапорець «так/ні», а третій режим: `raiseProficienciesToBeast` з додатковою умовою на власне володіння. Тест beast-form.test.ts:323 переписати разом із правкою.

**Файли:** `src/rules/wildshape.ts`, `src/lib/logic/beast-form.ts`, `tests/logic/beast-form.test.ts`


### L13-wildshape-04 — Копія персонажа, копія теки, імпорт наданого персонажа і знімок рівня гублять усі прикріплені звірині форми

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a — це втрата вибору гравця, а не правило

**Має бути:** Копія друїда несе ті самі відомі форми — це вибір гравця, зроблений у бестіарії; у 2024 форми ще й міняються по одній за довгий відпочинок, тож скидання списку не безкоштовне.

**Є:** Копія й знімок відкриваються з порожнім списком форм; попередження про втрату немає.

**Доказ:** src/lib/logic/pers-duplication.ts:3–27 — у PERS_DUPLICATION_INCLUDE немає `wildshapes` (і немає `resourcePools`), хоча звʼязок у схемі є: prisma/schema.prisma:667 `wildshapes PersWildshape[]`. Споживачі: src/server/db/pers-actions.ts:224 (duplicatePers), :426 (копія теки), src/server/db/share-actions.ts:612 (імпорт персонажа зі шеринга). src/server/db/snapshots.ts:21–34 (createPersSnapshot) так само не включає wildshapes.

**Відтворення:** 1) Друїд із двома-трьома прикріпленими формами. 2) «Копія» на /char/home. 3) Відкрити копію → картка «Дика форма» порожня.

**Куди дивитись:** Додати `wildshapes: true` (і, ймовірно, `resourcePools: true`) у PERS_DUPLICATION_INCLUDE та у створення записів у clonePersWithRelations; те саме в createPersSnapshot. Форма посилається на істоту ключем (Р25), тож копіювання рядка безпечне.

**Файли:** `src/lib/logic/pers-duplication.ts`, `src/server/db/snapshots.ts`


### P5-druid-secondary-flows-06 — Короткий відпочинок відновлює пул Дикої форми повністю, тоді як 2024 повертає рівно одне використання

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:3533 — «You regain **one** expended use when you finish a Short Rest, and you regain **all** expended uses when you finish a Long Rest.»

**Має бути:** Друїд 5 рівня після короткого відпочинку має remaining = min(max, remaining + 1).

**Є:** Отримає повний максимум (2), тобто короткий відпочинок дорівнює довгому для Дикої форми. Зараз дефект сплячий (пулу немає — P5-04) і спрацює того дня, коли P5-04 закриють даними.

**Доказ:** src/server/db/rest-actions.ts:221-241 — для кожного пулу, чий провайдер має limitedUsesPer = SHORT_REST, виконується `data: { usesRemaining: maxUses }`, тобто повний максимум. Поняття «повернути N» у коді немає взагалі; іншого шляху для пулів у короткому відпочинку теж немає.

**Відтворення:** Після виправлення P5-04: витратити обидва використання → короткий відпочинок → лічильник 2/2 замість 1/2.

**Куди дивитись:** Додати Feature полю «скільки повертає короткий відпочинок» і рахувати в shortRest `Math.min(max, remaining + N)` замість присвоєння max.

**Файли:** `src/server/db/rest-actions.ts`, `src/lib/logic/feature-resources.ts`, `prisma/schema.prisma`


### L13-wildshape-08 — Архідруїд 20 рівня 2014 — «Дика форма без обмежень» — не знімає лічильника, пул лишається 2 / 2

**Рівень:** P3 · **Редакція:** 2014 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06.** `hasUnlimitedWildshapeUses({ ruleset, druidLevel })` у `src/rules/wildshape-uses.ts`, свідомо звужено до 2014: Archdruid 2024 (`data/2024/srd/classes.md:3630`) межі не знімає — він повертає одне використання на ініціативі й міняє використання на комірку. Рівень саме друїда, а не персонажа: Друїд 17 / Воїн 3 межу має. Вхід у форму більше не списує; картка показує «Використань без обмежень» замість «2 / 2» — формулювання власника, бо «—» читалося б як «фіча недоступна». Тести в `tests/rules/wildshape-uses.test.ts` і `tests/components/wildshape-uses.test.tsx`, обидва доведені червоним.

**Правило:** Опис фічі в базі (feature 17932 «Archdruid»): «На 20 рівні … ви можете використовувати Дику форму без обмежень»

**Має бути:** Друїд 20 рівня 2014 не обмежений двома перетвореннями (або хоча б бачить позначку «без обмежень»).

**Є:** Картка показує «Використань 2 / 2», вхід списує використання.

**Доказ:** Запит до spells_test: feature 17932 «Archdruid» — uses_count NULL, uses_count_special NULL, uses_pool_key NULL. Провайдером пулу WILD_SHAPE лишається feature 17928 «Wild Shape» із фіксованим uses_count = 2, тож calculateMaxUsesForFeature на 20 рівні віддає 2.

**Відтворення:** Друїд 2014 20 рівня → лист → картка «Дика форма».

**Куди дивитись:** Дати «Archdruid» роль провайдера пулу WILD_SHAPE з ознакою «необмежено» (наприклад usesCountSpecial з дуже великим числом або окремим прапорцем), інакше — не показувати лічильник на 20 рівні.

**Файли:** `prisma/seed/classFeatureSeed.ts`, `src/lib/logic/feature-resources.ts`


## Бастіони (10)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P2 | 2024 | missing-system | `L14-bastions-01` | Базові приміщення відсутні як поняття: правило «бастіон стартує з двох безкоштовних базових приміщень — одне тісне, одне просторе» не реалізоване й ніде не підказане | src/rules/bastions.ts, src/server/db/bastions.ts |
| · | P2 | 2024 | missing-system | `L14-bastions-02` | Розмір приміщення не змінюється після додавання — «збільшення» можливе лише через видалення рядка, а з ним губляться наказ, захисники, найманці й нотатки | src/server/db/bastions.ts, src/lib/actions/bastion-actions.ts |
| · | P2 | 2024 | missing-system | `L14-bastions-03` | Підвищення рівня нічого не знає про бастіон: ані нових спеціальних приміщень на 9/13/17, ані права замінити одне приміщення щорівня | src/lib/components/levelUp/LevelUpWizard.tsx, src/rules/bastions.ts |
| · | P2 | 2024 | bug | `L14-bastions-04` | Копія персонажа (і копія теки, і «зберегти собі» з поширеної теки) втрачає бастіон повністю — приміщення, стан і весь журнал ходів | src/lib/logic/pers-duplication.ts, src/server/db/pers-actions.ts |
| · | P2 | 2024 | data | `L14-bastions-06` | Правил бастіону в застосунку немає взагалі: розділ 8 DMG 2024 не входить у жоден корпус правил | src/lib/generated/rules-beyond-srd.json, docs/o23-rules-beyond-srd/README.md |
| · | P3 | 2024 | missing-system | `L14-bastions-05` | Дубль спеціального приміщення додається без жодної підказки, хоча пікер уже отримав перелік уже доданих | src/components/bastions/BastionsClient.tsx, src/components/bastions/BastionPicking.tsx |
| · | P3 | 2024 | accepted | `L14-bastions-07` | Бастіон невидимий у поширеному листі, у знімку й у друці — партія й майстер його не бачать | src/lib/components/characterSheet/slides/FeaturesSlide.tsx, src/lib/actions/bastion-actions.ts |
| · | P3 | 2024 | bug | `L14-bastions-08` | Наказ «Утримання» за книгою віддається всьому бастіону й забороняє решту наказів на цей хід, а в застосунку це наказ окремого приміщення | src/lib/bastion-facility.ts, src/app/char/[id]/bastion/BastionPageClient.tsx |
| · | P3 | 2024 | accepted | `L14-bastions-09` | Персонаж 4-го рівня бастіон «створює з попередженням» за Р26, але дійти до сторінки може лише вгадавши URL | src/rules/bastions.ts, src/lib/components/characterSheet/slides/FeaturesSlide.tsx |
| · | P3 | 2024 | bug | `L14-bastions-10` | Рядок приміщення на сторінці бастіону не каже, базове воно чи спеціальне — лічильник «Спеціальних: 2 / 2» очима не звіряється | src/app/char/[id]/bastion/BastionPageClient.tsx |

### L14-bastions-01 — Базові приміщення відсутні як поняття: правило «бастіон стартує з двох безкоштовних базових приміщень — одне тісне, одне просторе» не реалізоване й ніде не підказане

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/5etools/raw/book/book-xdmg.json, розділ 8 «Bastions» → «Basic Facilities»: «A character's Bastion starts with two free basic facilities, which the character's player chooses from the Basic Facilities list below. One of the chosen facilities is Cramped, and the other is Roomy.» Там само таблиці «Adding Basic Facilities» (Cramped 500 GP / 20 днів, Roomy 1 000 GP / 45 днів, Vast 3 000 GP / 125 днів). Референс власника docs/o18-2024-character-parity/reference-2024.md §13 перелічує Basic Facilities як частину стану бастіону.

**Має бути:** Свіжостворений бастіон пропонує гравцю обрати два безкоштовні базові приміщення — одне тісне, одне просторе — і показує, що додаткові базові коштують грошей і часу за таблицею книги.

**Є:** Бастіон створюється порожнім. Базові приміщення додаються так само, як спеціальні, без різниці «безкоштовні/платні», без вимоги «одне тісне + одне просторе» і без вартості й строків.

**Доказ:** src/server/db/bastions.ts:99-115 — createBastion повертає `{ ...toBastionRecord(row), facilities: [], turns: [] }`, тобто бастіон створюється порожнім. У src/rules/bastions.ts є лише SPECIAL_FACILITY_LIMITS (рядки 43-48); жодної константи, функції чи підказки про базові приміщення в модулі немає. Лічильник на сторінці рахує тільки спеціальні: src/app/char/[id]/bastion/BastionPageClient.tsx:316 «Спеціальних: {usage.used} / {usage.limit}». Порожній стан: BastionPageClient.tsx:328 «Приміщень ще немає — додайте перше з каталогу». Каталог у режимі пікера (src/components/bastions/BastionsClient.tsx:262-266) пропонує всі 6 базових приміщень з трьома розмірами й кнопкою «Додати», не відрізняючи їх від платних; скріншот scratchpad/audit/shots/L14-bastions-0-catalog.png (вкладка «Базові»: Вітальня, Двір, Їдальня, Комора, Кухня, Спальня — у кожного «Тісне / Просторе / Розлоге»). Вартості й часу побудови в каталозі немає взагалі (перевірено по src/lib/generated/bastions.json: у kitchen опис — один абзац «Базове приміщення обставлене немагічними меблями…»).

**Відтворення:** 1) Персонаж 2024, рівень 5. 2) /char/<id>/bastion → «Створити». 3) Сторінка показує «Приміщень ще немає» і лічильник лише спеціальних. 4) «Додати приміщення» → вкладка «Базові» → жодного напису про два безкоштовні, про пару тісне+просторе чи про 500/1 000/3 000 зм.

**Куди дивитись:** Додати у src/rules/bastions.ts правило базових приміщень (двоє безкоштовних, один CRAMPED + один ROOMY) як підказку в стилі Р26; лічильник базових поруч зі спеціальним у BastionPageClient; у картці базового приміщення каталогу — таблиці вартості й часу з розділу 8.

**Файли:** `src/rules/bastions.ts`, `src/server/db/bastions.ts`, `src/app/char/[id]/bastion/BastionPageClient.tsx`, `src/components/bastions/BastionsClient.tsx`, `src/components/bastions/BastionFacilityDetailCard.tsx`


### L14-bastions-02 — Розмір приміщення не змінюється після додавання — «збільшення» можливе лише через видалення рядка, а з ним губляться наказ, захисники, найманці й нотатки

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/5etools/raw/book/book-xdmg.json, розділ 8 → «Enlarging Basic Facilities»: «A character can spend money and time to increase the space of a basic facility in their Bastion by one category» (Cramped→Roomy 500 GP / 25 днів, Roomy→Vast 2 000 GP / 80 днів); «Special Facilities → Space»: «A special facility can be enlarged to grant additional benefits if its description says so.»

**Має бути:** Розмір приміщення можна змінити на місці (в межах дозволених каталогом), не втрачаючи наказу, захисників, найманців і нотаток.

**Є:** Розмір фіксується назавжди при додаванні. Щоб виправити помилковий вибір або відобразити збільшення за столом, треба видалити приміщення і додати заново — весь стан KR19.4 (наказ, defenders, hirelings, notes) зникає безповоротно.

**Доказ:** space пишеться один раз у addBastionFacility (src/server/db/bastions.ts:325-341) і більше ніде не оновлюється: updateBastionFacilityState приймає рівно { facilityId, currentOrder, defenders, hirelings, notes } (src/server/db/bastions.ts:300-322), серверна дія saveFacilityState — те саме (src/lib/actions/bastion-actions.ts:150-186). У формі стану приміщення (BastionPageClient.tsx:392-500) поля розміру немає; розмір лише читається (BastionPageClient.tsx:371, bastionSpaceTranslations[view.space]). Скриптова звірка src/lib/generated/bastions.json: 13 приміщень мають більше одного розміру (6 базових + barrack, workshop, garden, stable, archive, museum, pub). Видалення робить фізичний delete рядка: src/server/db/bastions.ts:356-358 removeBastionFacility → prisma.persBastionFacility.delete.

**Відтворення:** 1) Персонаж 2024 з бастіоном. 2) Додати «Казарму» (barrack) розміром «Просторе». 3) Заповнити наказ, захисників, найманців, нотатки, зберегти. 4) Спробувати змінити розмір на «Розлоге» — у формі стану поля розміру немає, серверна дія його не приймає. 5) Єдиний шлях — кошик і повторне додавання, після чого всі поля стану порожні.

**Куди дивитись:** Додати space у saveFacilityState / updateBastionFacilityState з валідацією проти facility.space каталогу (як у readFacilitySpace), і селект розміру у BastionFacilityStateForm для тих 13 приміщень, де варіантів більше одного.

**Файли:** `src/server/db/bastions.ts`, `src/lib/actions/bastion-actions.ts`, `src/app/char/[id]/bastion/BastionPageClient.tsx`


### L14-bastions-03 — Підвищення рівня нічого не знає про бастіон: ані нових спеціальних приміщень на 9/13/17, ані права замінити одне приміщення щорівня

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/5etools/raw/book/book-xdmg.json, розділ 8 → «Special Facilities»: «Each new special facility immediately becomes part of the character's Bastion when the character reaches the level. Each time a character gains a level, that character can replace one of their Bastion's special facilities with another for which the character qualifies.» Референс власника docs/o18-2024-character-parity/reference-2024.md §11: «Під час level-up ти також можеш замінювати Special Facilities.»

**Має бути:** Підвищення до 9/13/17 рівня повідомляє, що ліміт спеціальних приміщень виріс (4/5/6), а кожне підвищення пропонує право замінити одне спеціальне приміщення іншим, для якого персонаж відповідає.

**Є:** Ні на кроці підвищення, ні у підсумку немає жодної згадки бастіону. Ліміт мовчки змінюється з 2/2 на 2/4 наступного разу, коли гравець сам відкриє сторінку бастіону. Заміни як операції не існує — тільки видалення + додавання, з утратою стану приміщення (див. L14-bastions-02).

**Доказ:** `grep -rli "bastion" src/lib/components/levelUp/` — жодного файлу. Майстер підвищення рівня (кроки path, summary, subclass, class-choices, subclass-choices, asi, feat-choices, infusions, weapon-mastery, skills, expertise, languages, optional-features, replacements, hp, confirm) бастіону не згадує; крок replacements існує, але для класових виборів. Ліміт рахується лише при відкритті сторінки бастіону: findSpecialFacilityUsage у BastionPageClient.tsx:277-280 і в банері пікера BastionPicking.tsx:118-146.

**Відтворення:** 1) Персонаж 2024 8-го рівня з бастіоном і 2 спеціальними приміщеннями. 2) /char/<id>/levelup до 9-го рівня, пройти всі кроки. 3) У підсумку жодного слова про бастіон. 4) Відкрити /char/<id>/bastion — лічильник тепер «Спеціальних: 2 / 4», але гравцеві ніхто цього не сказав і замінити приміщення не запропонував.

**Куди дивитись:** Крок або підсумковий напис у LevelUpWizard, коли findSpecialFacilityLimit(newLevel) > findSpecialFacilityLimit(oldLevel) і коли бастіон існує; окрема дія «замінити приміщення», яка переносить стан рядка (наказ, захисники, найманці, нотатки) або принаймні не змушує видаляти.

**Файли:** `src/lib/components/levelUp/LevelUpWizard.tsx`, `src/rules/bastions.ts`, `src/lib/actions/bastion-actions.ts`, `src/server/db/bastions.ts`


### L14-bastions-04 — Копія персонажа (і копія теки, і «зберегти собі» з поширеної теки) втрачає бастіон повністю — приміщення, стан і весь журнал ходів

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a — це втрата даних гравця, а не правило книги

**Має бути:** Копія персонажа несе його бастіон — назву, антураж, нотатки, приміщення з їхнім розміром і станом, журнал ходів; або принаймні прямо каже, що бастіон не копіюється.

**Є:** Копія створюється без рядка pers_bastion. Оригінал цілий, копія — персонаж 2024 без бастіону, мовчки. Гравець, який копіює персонажа, щоб спробувати іншу гілку розвитку, втрачає всю ручну роботу над бастіоном.

**Доказ:** PERS_DUPLICATION_INCLUDE (src/lib/logic/pers-duplication.ts:3-26) перелічує 21 звʼязок: skills, persSpells, features, feats, weapons, pers_weapon_mastery, armors, multiclasses, magicItems, persInfusions, race, class, subclass, background, raceVariants, raceChoiceOptions, choiceOptions, classOptionalFeatures, spells. Бастіону серед них немає; `grep -n "astion" src/lib/logic/pers-duplication.ts` — нуль збігів, тобто clonePersWithRelations (там само, рядок 33) бастіон не читає й не створює. Цей самий include живить три шляхи: duplicatePers (src/server/db/pers-actions.ts:217-233), копію теки (src/server/db/pers-actions.ts:415-436) і «зберегти собі» з поширеної теки (src/server/db/share-actions.ts:610-622).

**Відтворення:** 1) Персонаж 2024 5-го рівня з бастіоном, кількома приміщеннями зі станом і кількома записами журналу. 2) /char/home → «Дублювати». 3) Відкрити копію → слайд Рис: картки бастіону немає (isEntryCardShown false, бо бастіону немає). 4) /char/<copyId>/bastion → порожній стан «Створити». SQL-підтвердження: select * from pers_bastion where pers_id = <copyId> — нуль рядків.

**Куди дивитись:** Додати bastion: { include: { facilities: true, turns: true } } у PERS_DUPLICATION_INCLUDE і клонування трьох таблиць у clonePersWithRelations (facility_slug — слаґ каталогу, зовнішнього ключа немає, тому копія тривіальна).

**Файли:** `src/lib/logic/pers-duplication.ts`, `src/server/db/pers-actions.ts`, `src/server/db/share-actions.ts`


### L14-bastions-06 — Правил бастіону в застосунку немає взагалі: розділ 8 DMG 2024 не входить у жоден корпус правил

**Рівень:** P2 · **Редакція:** 2024 · **Тип:** data · **Праці:** L · **Вердикт:** не перевірено

**Правило:** data/5etools/raw/book/book-xdmg.json, розділ 8 — «Gaining a Bastion» («characters acquire their Bastions when they reach level 5»), «Bastion Turns» («By default, a Bastion turn occurs every 7 days of in-game time»), «Facility Space» (4/16/36 клітин), «Basic Facilities» з двома таблицями вартості, «Special Facilities» з таблицею 5/9/13/17, описи семи наказів, «Bastion Events».

**Має бути:** Гравець може прочитати в застосунку, що таке бастіон, коли він здобувається, як часто буває хід бастіону, що роблять сім наказів, скільки коштує базове приміщення і що таке події бастіону.

**Є:** Каталог /2024/bastions пояснює тільки окремі приміщення. Систему не пояснює ніде — ні на сторінці бастіону, ні в довіднику правил. Модуль-трекер вимагає від гравця знання книги, якої в застосунку немає.

**Доказ:** grep -c "астіон" src/lib/generated/rules-2024.json → 0; src/lib/generated/rules-2014.json → 0; src/lib/generated/rules-beyond-srd.json → 5, і всі пʼять — побіжні згадки з інших розділів («У розділі 8 є правила, які дозволяють персонажам гравців будувати, утримувати й насолоджуватися власними фортецями», «Якщо мертві персонажі мають Бастіони (див. розділ 8)…», абзац про укріплення). Самої глави немає. Черга O23 «до релізу» (docs/DECISIONS.md, Р27) охоплює глави 1–3 DMG 2024 — розділ 8 не належить жодній черзі.

**Відтворення:** 1) Пошук «бастіон» у розділі правил 2024 — жодної статті. 2) /char/<id>/bastion — на сторінці немає пояснення ані ходу, ані наказів, ані базових приміщень. 3) grep по згенерованих корпусах правил: 0/0/5 згадок, усі побіжні.

**Куди дивитись:** Завести розділ 8 DMG 2024 у чергу «до релізу» O23 (дослівний переклад за Р27) і покласти посилання на нього зі сторінки бастіону та з каталогу /2024/bastions.

**Файли:** `src/lib/generated/rules-beyond-srd.json`, `docs/o23-rules-beyond-srd/README.md`, `src/app/char/[id]/bastion/BastionPageClient.tsx`


### L14-bastions-05 — Дубль спеціального приміщення додається без жодної підказки, хоча пікер уже отримав перелік уже доданих

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** missing-system · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/5etools/raw/book/book-xdmg.json, розділ 8 → «Special Facilities»: «Each special facility can be chosen only once unless its description says otherwise.»

**Має бути:** Пікер позначає вже додані приміщення («вже в бастіоні») і, за Р26, дозволяє додати повторно з видимим написом — так само, як він робить для непройденої передумови й наказу поза каталогом.

**Є:** Жодної позначки. Гравець додає «Містичний кабінет» удруге, не помічаючи, і бачить лише «Спеціальних: 3 / 2 ⚠», не розуміючи причини.

**Доказ:** addFacility (src/lib/actions/bastion-actions.ts:106-129) перевіряє лише наявність слаґа в каталозі й дозволеність розміру — коментар над нею прямо каже, що ні передумова, ні ліміт не блокують (Р26). У клієнті пікера src/components/bastions/BastionsClient.tsx:262-266 кнопка BastionAddFacility малюється для кожного приміщення без перевірки, чи воно вже в бастіоні, — при тому що picker.facilityViews (перелік доданих зі слаґами, src/server/db/bastions.ts:196-206) уже приїхав у клієнт і використовується лише для банера specialCount (BastionsClient.tsx:183-190). У базі унікального індексу на (pers_bastion_id, facility_slug) немає (перевірено в spells_test: індекси pers_bastion_facility — тільки pkey і за pers_bastion_id).

**Відтворення:** 1) Персонаж 2024 5-го рівня з бастіоном. 2) «Додати приміщення» → «Містичний кабінет» → «Додати». 3) У тому самому пікері кнопка «Додати» на «Містичному кабінеті» лишається такою самою. 4) Натиснути ще раз — у бастіоні два однакові рядки.

**Куди дивитись:** У BastionsClient використати вже наявний picker.facilityViews: показувати бейдж «вже в бастіоні» і напис на кнопці в стилі решти підказок Р26.

**Файли:** `src/components/bastions/BastionsClient.tsx`, `src/components/bastions/BastionPicking.tsx`


### L14-bastions-07 — Бастіон невидимий у поширеному листі, у знімку й у друці — партія й майстер його не бачать

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** accepted · **Праці:** M · **Вердикт:** не перевірено

**Правило:** n/a — паритет із зрілим білдером і формулювання мети O19 («одне місце, де він бачить свій бастіон»)

**Має бути:** Поширене посилання на персонажа 2024 показує бастіон хоча б у режимі читання — це найчастіший спосіб показати персонажа майстрові й партії.

**Є:** У поширеному листі й у знімку картки бастіону немає, сторінка /char/<id>/bastion чужому користувачу не відкривається (canEditPers). Бастіон бачить лише власник.

**Доказ:** src/lib/components/characterSheet/slides/FeaturesSlide.tsx:159-161: `setBastionEntry(null); if (isReadOnly || pers.ruleset !== "RULES_2024") return;` — у режимі перегляду запиту про бастіон не буде взагалі. `grep -rli "bastion" src/server/pdf/ src/server/db/print-content.ts src/server/db/snapshots.ts src/server/db/share-actions.ts src/lib/actions/snapshot-actions.ts` — порожньо. Для PDF це записане рішення (docs/o19-bastions/README.md: «У карусель листа шостим слайдом не йде: слайди — бойовий стан, вони ходять у PDF-експорт»), для шерингу — лише коментар у коді, рішення власника немає.

**Відтворення:** 1) Персонаж 2024 з бастіоном. 2) «Поділитися» → відкрити /char/share/<token> у приватному вікні. 3) Слайд Рис: картки «Бастіон» немає.

**Куди дивитись:** Питання власника. Технічно: читальна гілка loadBastion без canEditPers для власника токена + картка в isReadOnly.

**Файли:** `src/lib/components/characterSheet/slides/FeaturesSlide.tsx`, `src/lib/actions/bastion-actions.ts`, `src/server/db/share-actions.ts`


### L14-bastions-08 — Наказ «Утримання» за книгою віддається всьому бастіону й забороняє решту наказів на цей хід, а в застосунку це наказ окремого приміщення

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** M · **Вердикт:** не перевірено

**Правило:** data/5etools/raw/book/book-xdmg.json, розділ 8 → «Orders»: «The Maintain order is unusual; it is issued to the whole Bastion rather than to one or more special facilities. … Issuing this order prohibits other orders from being issued to the Bastion on the current Bastion turn.»

**Має бути:** «Утримання» задається бастіону в цілому (одна дія), і UI підказує, що цього ходу решта наказів не віддається.

**Є:** «Утримання» — сьомий пункт у селекті наказу кожного приміщення. «Цього ходу весь бастіон на Утриманні» записується або сімома однаковими наказами, або вільним текстом у журналі.

**Доказ:** src/lib/bastion-facility.ts:29-34 — findAllowedOrderCodes додає "MAINTAIN" до дозволених наказів кожного приміщення, включно з базовими; коментар над функцією трактує його як «загальне “нічого особливого цей хід”, доступне будь-якому приміщенню». Колонки наказу на рівні бастіону немає: у spells_test pers_bastion має лише pers_bastion_id, pers_id, name, description, notes, created_at, updated_at.

**Відтворення:** 1) /char/<id>/bastion з кількома приміщеннями. 2) Селект «Наказ» у будь-якому приміщенні містить «Утримання» без напису «немає в каталозі» — тобто застосунок вважає його наказом приміщення. 3) Місця, де можна віддати наказ бастіону, на сторінці немає.

**Куди дивитись:** Або окреме поле наказу на pers_bastion (DDL) з підказкою «решта наказів цього ходу не віддається», або, мінімально, перенести MAINTAIN із findAllowedOrderCodes у бастіон-рівневий перемикач.

**Файли:** `src/lib/bastion-facility.ts`, `src/app/char/[id]/bastion/BastionPageClient.tsx`, `src/server/db/bastions.ts`


### L14-bastions-09 — Персонаж 4-го рівня бастіон «створює з попередженням» за Р26, але дійти до сторінки може лише вгадавши URL

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** accepted · **Праці:** S · **Вердикт:** не перевірено

**Правило:** docs/DECISIONS.md, Р26: «Персонаж 4-го рівня бастіон створює з попередженням»

**Має бути:** Або підказка Р26 має вхід в інтерфейсі (наприклад, картка з написом «за стандартними правилами з 5-го»), або поведінка описана як свідома в документі цілі.

**Є:** Дозволена Р26 можливість недосяжна нікому, крім того, хто набере /char/<id>/bastion руками.

**Доказ:** src/rules/bastions.ts:24-38 — `isEntryCardShown: isOffered && (input.hasBastion || !isBelowStandardLevel)`: картка входу на слайді фіч зʼявляється лише з 5-го рівня, і тест tests/rules/bastion-access.test.ts:26 фіксує це як бажану поведінку. Сама сторінка src/app/char/[id]/bastion/page.tsx:16 робить notFound() лише коли !access.isOffered, тобто для 4-го рівня відкривається й показує BelowStandardLevelHint.

**Відтворення:** 1) Персонаж 2024 4-го рівня. 2) Лист → слайд Рис: картки «Бастіон» немає. 3) Набрати /char/<id>/bastion — сторінка відкривається, попередження про 5-й рівень показане, створення працює.

**Куди дивитись:** Рішення власника: показувати картку з 1-го рівня в приглушеному вигляді чи лишити як є. Код — один предикат у findBastionAccess.

**Файли:** `src/rules/bastions.ts`, `src/lib/components/characterSheet/slides/FeaturesSlide.tsx`


### L14-bastions-10 — Рядок приміщення на сторінці бастіону не каже, базове воно чи спеціальне — лічильник «Спеціальних: 2 / 2» очима не звіряється

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** n/a — UX/паритет

**Має бути:** Кожен рядок приміщення позначений як базове або спеціальне, щоб лічильник спеціальних можна було звірити поглядом.

**Є:** Чотири однакові рядки й лічильник «Спеціальних: 2 / 2» — які саме два з чотирьох спеціальні, з екрана не видно.

**Доказ:** BastionFacilityView несе match.isSpecial (обчислюється у findFacilityMatch, src/rules/bastions.ts:141-151, і потрапляє в подання у src/server/db/bastions.ts:214), але BastionFacilityRow (src/app/char/[id]/bastion/BastionPageClient.tsx:350-390) малює лише назву, розмір і BastionMatchBadge — тип приміщення не рендериться ніде. У каталозі така мітка є («Базове» / «Рівень N+»), на сторінці бастіону — ні.

**Відтворення:** 1) Бастіон з 2 базовими й 2 спеціальними приміщеннями. 2) /char/<id>/bastion — жоден рядок не має мітки типу.

**Куди дивитись:** У BastionFacilityRow додати ту саму мітку, що вже є в каталозі: facility.level === null ? «Базове» : «Рівень N+» (дані вже в BastionFacilityView.level і match.isSpecial).

**Файли:** `src/app/char/[id]/bastion/BastionPageClient.tsx`


## Створення персонажа 2014 (2)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P2 | both | bug | `L17-known-registries-06` | BUG-012 живий: превʼю зміни характеристики на кроці «Опції риси» досі рахує base 10 + ASI без расових бонусів; рядки в реєстрі застаріли | src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx, src/rules/character-creation.ts |
| · | P3 | both | accepted | `P4-regression-2014-07` | Крок «Навички» пускає далі з невитраченими класовими виборами і без жодного попередження | src/lib/components/characterCreator/SkillsForm.tsx |

### L17-known-registries-06 — BUG-012 живий: превʼю зміни характеристики на кроці «Опції риси» досі рахує base 10 + ASI без расових бонусів; рядки в реєстрі застаріли

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** M · **Вердикт скептика:** confirmed

✅ **Закрито в KR31.12, 2026-09-06.** Третьої копії розрахунку не заведено, як і просив запис власника: `MultiStepForm` рахує бали канонічним `buildCreationAbilityScores` (тими самими доданками, що й сервер) і передає їх у крок; мемо в `FeatChoiceOptionsForm` бере передані бали, старе наближення лишається запасним для викликів без них. Тест `tests/components/creation-ability-preview.test.tsx` — «16 → 17» замість «14 → 15», доведений червоним. Звуження скептика (реально бʼє по 2014) підтверджую.

**Правило:** n/a — внутрішня узгодженість: превʼю має показувати те саме, що рахує buildCreationAbilityScores у src/rules/character-creation.ts.

**Має бути:** На кроці «Опції риси» показані поточний і майбутній бали дорівнюють тим, що отримає персонаж (з бонусами раси/варіанта/підраси, обраними на попередніх кроках).

**Є:** Показано занижене: раса з +2 СПР і риса Skill Expert дають у превʼю «СПР 14 → 15» замість фактичних 16 → 17.

**Доказ:** src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx:273-322 — гілка `if (pers) {...}` бере збережені бали, а для флоу створення стартує з `const base = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }` і накладає лише asi/simpleAsi/customAsi; жодної згадки raceASI/variantASI/subraceASI чи racialBonusChoiceSchema у функції немає. Лейбли «X: 14 → 15» тепер на :996-997 і :1109-1110. Реєстр указує 261-313 / 984-989 / 1097-1102 — рядки зʼїхали. Компонент спільний для обох редакцій: імпортують MultiStepForm.tsx (736, 764, 776), LevelUpASIForm.tsx:377 і LevelUpWizard.tsx; окремої 2024-копії немає.

**Відтворення:** Читання коду; ручна перевірка власника 2026-08-16 (скріншот у реєстрі).

**Куди дивитись:** Примітка власника в реєстрі лишається чинною: не патчити цю гілку, а винести спільний компонент «обрання характеристики», який сам перераховує наявні бали (левелап — з персонажа, створення — з усіх попередніх кроків) і накладає бонус на цю суму. Мінімум — оновити номери рядків у docs/KNOWN-BUGS.md.

**Файли:** `src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx`, `src/rules/character-creation.ts`, `docs/KNOWN-BUGS.md`

**Скептик:** Знахідку підтверджено власним доказом, але зі звуженням редакції.

(1) Правило — оракул не потрібен: це внутрішня узгодженість. Еталон рахунку — `buildCreationAbilityScores` (`src/rules/character-creation.ts:86-113`), який сервер отримує з форми у `src/server/db/character-creation.ts:198-213` (`custom: validData.customAsi`, `raceASI`, `variantASI`, `subraceASI`, `racialChoices`). Тобто у формі `asi/simpleAsi/customAsi` лежать БАЗОВІ бали до раси, а расові бонуси додаються окремо.

(2) Код — обробки в іншому місці немає. `FeatChoiceOptionsForm.tsx:278-330`: за відсутності `pers` превʼю стартує з `base = 10` і накладає лише обрану ASI-систему; у всьому файлі 0 згадок `raceASI|variantASI|subraceASI|racialBonusChoiceSchema|backgroundAsiChoice`. Лейбл будує `describeAbilityIncrease` (:341-347), споживачі — :1019 і :1128. `MultiStepForm.tsx` (736, 764, 776) `pers` НЕ передає; `LevelUpASIForm.tsx:398` і `LevelUpWizard.tsx:1080` передають — тож левелап показує реальні бали, дефект живе лише у флоу створення.

(3) Рішення власника: у `docs/KNOWN-BUGS.md` BUG-012 має «Статус: відкрито». Примітка власника стосується ФОРМИ фіксу (спільний компонент «обрання характеристики» замість патча), а не прийняття поведінки. У `docs/DECISIONS.md` про це нічого. Отже не `accepted`.

(4) In-flight: `FeatChoiceOptionsForm.tsx` не входить до списку файлів паралельної сесії.

(5) Відкритого KR немає: згадки компонента в `docs/o4-ui-decomposition/` — це закрита ціль (✅ 2026-08-15), і сам власник пише, що це «окрема майбутня робота», не її scope.

(6) Звуження до автора: `edition: both` перебільшено. У флоу створення 2024 доступні лише ORIGIN-риси (`creator-content-2024.json`: 10 ORIGIN — ALERT, HEALER, LUCKY, MAGIC_INITIATE, SAVAGE_ATTACKER, SKILLED, TAVERN_BRAWLER, TOUGH, CRAFTER, MUSICIAN), і ЖОДНА з них не має групи «Характеристика» — гілка з лейблом там не малюється взагалі; групи «Характеристика» є лише в GENERAL/EPIC_BOON, а їх беруть на левелапі, де `pers` передано. Реально дефект бʼє по 2014-створенню: варіант людини і Своя раса (TCoE) — єдині шляхи з рисою на 1-му рівні. Для варіанта людини (+1/+1) превʼю ще й ламає парність: показує 14 → 15 (модифікатор не росте), тоді як насправді 15 → 16 (+1 до модифікатора).

Серйозність P2 лишаю, хоч вона межова з P3: персонаж рахується правильно (тому не P1), і рису можна зняти/додати на листі (`removePersFeat`), але зріліший білдер показує коректну біжучу суму саме в точці вибору, а тут показане число хибне.


### P4-regression-2014-07 — Крок «Навички» пускає далі з невитраченими класовими виборами і без жодного попередження

**Рівень:** P3 · **Редакція:** both · **Тип:** accepted · **Праці:** S · **Вердикт:** не перевірено

✅ **Закрито в KR31.12, 2026-09-06 — і більше не `accepted`.** Рішення власника 2026-09-06: блокувати «Далі», доки класові вибори навичок не витрачені. `SkillsForm` віддає `onNextDisabledChange(isUnspent)` замість колишнього `isOverLimit`, коментар «Skills selection is optional» прибрано. Тест `tests/components/skills-step-gate.test.tsx` (0 обрано → заблоковано, 1 з 2 → заблоковано, 2 з 2 → пускає), доведений червоним.

**Правило:** PHB 2014: чарівник обирає 2 навички зі списку класу — це не опційний вибір.

**Має бути:** Або блокувати «Далі →», доки класові навички не обрані, або показувати те саме попередження/позначку «можна пропустити», що й крок мов.

**Є:** Кнопка активна від початку, попередження немає; персонаж може вийти без двох володінь навичками, і виправити це без перестворення не можна.

**Доказ:** Лог прогону: `SKILLS next disabled with 0 picked: false` при написі «ЗАЛИШОК: 2» на кроці (work/P4-regression-2014/fighter.log). Тексту «Цей крок можна пропустити» на кроці немає — на сусідньому кроці «Мови» він є (shots/P4-gw-07-languages.png). Навмисність у коді: src/lib/components/characterCreator/SkillsForm.tsx:430-431 «// Skills selection is optional: allow continuing even if not all picks are filled.»

**Відтворення:** /char/create → будь-який клас → дійти до кроку «Навички» → не обирати нічого → «Далі →» активна.

**Куди дивитись:** Не змінювати правило (воно свідоме), а додати той самий текст-підказку «Цей крок можна пропустити» + лічильник невитрачених виборів на екрані підтвердження перед «Створити».

**Файли:** `src/lib/components/characterCreator/SkillsForm.tsx`


## Паритет із конкурентами (4)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| ✓ | P2 | both | missing-system | `L19-parity-competitors-08` | Власного контенту (homebrew) немає: жодна контентна таблиця не має власника | prisma/schema.prisma, src/lib/content/creator-content.ts |
| · | P2 | both | missing-system | `L19-parity-competitors-11` | 3D-кубики оплачені й змонтовані, але кинути можна лише атаку зброєю — не навичку, ряткидок, заклинання чи хіт-дайс | src/lib/stores/diceUIStore.ts, src/lib/components/characterSheet/slides/SkillsSlide.tsx |
| · | P2 | both | missing-system | `L19-parity-competitors-13` | Компаньйонів, фамільярів і призваних істот немає як класу сутностей | prisma/schema.prisma, src/lib/components/characterSheet/slides/CombatSlide.tsx |
| · | P3 | both | missing-system | `L19-parity-competitors-16` | Портрета персонажа немає — ні поля в базі, ні UI | prisma/schema.prisma, src/app/char/home/CharHomeClient.tsx |

### L19-parity-competitors-08 — Власного контенту (homebrew) немає: жодна контентна таблиця не має власника

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт скептика:** confirmed

**Правило:** n/a (паритет: DDB Homebrew Collection працює як ще одне джерело в конструкторі; Roll20 Homebrew Character Builder; Foundry — будь-який Item; DMV — homebrew class creation)

**Має бути:** Гравець може завести власне заклинання/рису/предмет/підклас і взяти його в конструкторі — це те, чим DDB тримає домашні столи.

**Є:** Тільки вільний текст без механіки.

**Доказ:** `grep -n "user_id" prisma/schema.prisma` знаходить власника лише в `account`, `user`, `pers`, `pers_additional_users`, `pers_folder`, `pers_folder_member`, `pers_offline_operation`, `problem_report`. У `Spell`, `Feat`, `MagicItem`, `Race`, `Class`, `Subclass`, `Background` власника немає. Єдина заміна — текстові поля `Pers.customFeatures / customEquipment / customProficiencies / raceCustom / classCustom / customBackground / customLanguagesKnown`, які не беруть участі в жодному обчисленні (`generateCharacterPdf.ts:201` просто друкує рядок).

**Куди дивитись:** Окрема ціль: `owner_user_id` (nullable) у контентних таблицях + фільтр «мій контент» у creator-content і каталогах. До того — принаймні дати ручні рядки в списку фіч/предметів з полем «використань».

**Файли:** `prisma/schema.prisma`, `src/lib/content/creator-content.ts`

**Скептик:** Знахідку підтверджую власним доказом; спростувати не вдалося.

(1) ПРАВИЛО — оракул не потрібен: це паритетна знахідка (`rule_source: n/a`), а не твердження про правило D&D. Претензія до конкурентів (DDB Homebrew Collection, Roll20, Foundry Item, DMV) відповідає дійсності й не суперечить жодному SRD.

(2) КОД — доказ автора відтворив і розширив. `grep -n "user_id" prisma/schema.prisma` дає рівно 8 таблиць-власників: `account`, `user`, `Pers:571`, `PersAdditionalUser:683`, `PersFolder:748`, `PersFolderMember:770`, `pers_offline_operation:1216`, `problem_report:1240`. У жодної контентної таблиці власника немає. Важливіше за відсутність стовпця — форма звʼязків: кожен `pers_*` це FK на каталог і нічого більше (`PersFeature:737 featureId → Feature`, `PersMagicItem:814 → MagicItem`, `PersWeapon:902 → Weapon`), тобто рядок «своєї» фічі/предмета/заклинання фізично не може існувати без рядка в каталозі. Обхідного шляху в іншому місці немає: адмінського маршруту в `src/app/` немає, конструктор читає не базу, а закомічений файл (`src/lib/content/creator-content.ts:12-20`, `creator-content-2014/2024.json`), тож навіть рядок у базі не дійшов би до конструктора без регенерації артефакту й коміту. Це підтверджує `effort: L` і робить знахідку не «бракує стовпця», а «бракує системи».

(3) РІШЕННЯ ВЛАСНИКА — свідомого прийняття немає. Серед Р1–Р39 у `docs/DECISIONS.md` про користувацький контент немає нічого; серед 40 розділів «Поза межами» — теж. Пастка поруч: слово `HOMEBREW` у репо є (`prisma/schema.prisma:1312,1502,1891,2210` і `docs/o12-srd-2024-import/questions.md:370-373`), але це значення enum `Source` для імпортованого неканонічного матеріалу — мітка авторингу, а не сутність гравця. Дотично впирається Р25 («Контент — статика, персонаж — єдині живі дані»): вона не забороняє homebrew, але означає, що homebrew суперечить чинній моделі доставки контенту файлами — це питання власнику, а не готове «прийнято».

(4) IN-FLIGHT — ні. Файли паралельної сесії (KR27.7/KR30.3) знахідки не торкаються.

(5) ВЖЕ ВІДКРИТО — ні. Серед O1–O30 у `docs/README.md` цілі про власний контент немає.

(6) СЕРЙОЗНІСТЬ — P2 за шкалою CONTEXT: «немає можливості, яку має зрілий білдер». Персонаж не рахується неправильно й вибір не губиться, тож P1 не заслужено; масштаб більший за косметику, тож не P3.

Дві неточності в доказі автора (верхи не змінюють вердикту, але «actual» треба звузити): «не беруть участі в жодному обчисленні» — хибно для `customLanguagesKnown`, який `LevelUpWizard.tsx:541-556` розбирає назад у ключі мов, щоб не пропонувати вже відомі; і «тільки вільний текст» — для зброї є реальний шлях перефарбування (`PersWeapon.overrideName/overrideDamage/overrideDamageType/customDamageDice/isMagical`, редагується в `WeaponCustomizeModal.tsx:110`), плюс `ModifyStatModal`/`updateMaxHp`/оверрайд базового КЗ. Тобто «домашня зброя» і будь-яке число досяжні; недосяжні власні заклинання, риси, фічі, підкласи, види й магічні предмети.


### L19-parity-competitors-11 — 3D-кубики оплачені й змонтовані, але кинути можна лише атаку зброєю — не навичку, ряткидок, заклинання чи хіт-дайс

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** n/a (паритет: DDB кидає з кожного рядка листа; Foundry — з будь-якого пункту)

**Має бути:** Кидок із рядка навички, ряткидка, перевірки характеристики, атаки/шкоди заклинанням, хіт-дайса й ряткидка смерті — з уже підставленим бонусом.

**Є:** Кидати можна зброю і «вручну» з загальної шухляди; найчастіші кидки за столом гравець вводить сам.

**Доказ:** `@3d-dice/dice-box` у `package.json:110`, змонтований глобально: `src/app/layout.tsx:12,109` (`<DiceOverlay />`), сервіс `src/lib/components/dice/diceService.ts`, шухляда `DiceSidebar.tsx` (14 КБ). Контекстний кидок один: `useDiceUIStore.openWeapon` викликається тільки з `src/lib/components/characterSheet/WeaponsCard.tsx:61`; `src/lib/stores/diceUIStore.ts:3` — `export type DiceMode = "general" | "weapon"`. `grep -rn "Dice|dice" src/lib/components/characterSheet/slides/` дає лише HitDiceDialog (облік хіт-дайсів, не кидок).

**Куди дивитись:** Розширити DiceMode/контекст (label + модифікатор) і повісити виклик на рядки SkillsSlide, ряткидки в MainStatsSlide, атаку заклинанням у MagicSlide, HitDiceDialog.

**Файли:** `src/lib/stores/diceUIStore.ts`, `src/lib/components/characterSheet/slides/SkillsSlide.tsx`, `src/lib/components/characterSheet/slides/MainStatsSlide.tsx`, `src/lib/components/characterSheet/slides/MagicSlide.tsx`


### L19-parity-competitors-13 — Компаньйонів, фамільярів і призваних істот немає як класу сутностей

**Рівень:** P2 · **Редакція:** both · **Тип:** missing-system · **Праці:** L · **Вердикт:** не перевірено

**Правило:** n/a (паритет: DDB «Extras» — окремі листи істот під персонажем; Foundry — окремі актори)

**Має бути:** Персонаж може мати привʼязану істоту зі своїм листом: Find Familiar, Beast Master (Primal Companion), Find Steed, а в 2024 — заклинання Summon *.

**Є:** Гравці таких класів ведуть половину персонажа поза платформою.

**Доказ:** `grep -rni "фамільяр|familiar|компаньйон|companion|скакун|steed" src/` — жодного збігу (виключено generated/rulesData/refs). Дика форма реалізована окремим шаром (`PersWildshape`, `src/lib/logic/beast-form.ts`, `WildshapeCard.tsx`), але це заміщення власних характеристик, а не друга істота поруч.

**Куди дивитись:** Таблиця PersCompanion (persId, creatureId, поточні хіти, стан) і окрема картка на листі; статблоки вже є в бестіарії.

**Файли:** `prisma/schema.prisma`, `src/lib/components/characterSheet/slides/CombatSlide.tsx`


### L19-parity-competitors-16 — Портрета персонажа немає — ні поля в базі, ні UI

**Рівень:** P3 · **Редакція:** both · **Тип:** missing-system · **Праці:** M · **Вердикт:** не перевірено

**Правило:** n/a (паритет: DDB, Roll20, DMV дозволяють завантажити або вибрати аватар)

**Має бути:** Аватар на листі, у списку персонажів і на сторінці шеринга.

**Є:** Персонажі відрізняються лише текстом.

**Доказ:** Повний текст `model Pers` у `prisma/schema.prisma` не містить жодного стовпця зображення (перевірено виводом моделі цілком). `grep -rni "portrait|avatar|imageUrl|портрет" src/lib/components/characterSheet src/app/char -l` — порожньо.

**Куди дивитись:** Стовпець image_url на Pers + завантаження або вибір із наявних ілюстрацій; на листі й у CharHomeClient.

**Файли:** `prisma/schema.prisma`, `src/app/char/home/CharHomeClient.tsx`


## UX (11)

| | Рівень | Ред. | Тип | ID | Що не так | Де |
|---|---|---|---|---|---|---|
| · | P2 | both | bug | `P4-regression-2014-06` | /char/create і /char/<id>/levelup падають на серверному рендері: «useSession must be wrapped in a SessionProvider», сторінка перемикається на клієнтський рендер | src/app/char/create, src/lib/components/characterCreator/MultiStepForm.tsx |
| · | P3 | 2024 | bug | `L02-backgrounds-08` | Модалка деталей походження в конструкторі не показує ні трьох характеристик, ні риси походження, ні «або 50 зм» — саме те, за чим у 2024 обирають походження | src/lib/components/characterCreator/modals/BackgroundInfoModal.tsx, src/lib/types/model-types.ts |
| · | P3 | 2024 | data | `P1-human-fighter-14` | Сирий англійський ключ «Skilled Options» як назва групи вибору в українському інтерфейсі | data/2024/normalized/feats.json, prisma/seed/ |
| · | P3 | 2024 | bug | `P1-human-fighter-17` | Конструктор 2024 говорить «Раса» замість «Вид» і пропонує 2014-опцію «Правила Таші» | src/lib/components/characterCreator/creation-step-resolver.ts, src/lib/components/characterCreator/SkillsForm.tsx |
| · | P3 | 2024 | bug | `P2-elf-wizard-09` | Підсумок спорядження на останньому кроці конструктора показує сирі option_id (204, 205, 206, 208) замість назв предметів | src/lib/components/characterCreator/NameForm.tsx |
| · | P3 | 2024 | bug | `P2-elf-wizard-10` | У виборі мов пропонується «Загальна», яку персонаж отримує автоматично — вибір можна витратити на дублікат | src/lib/components/characterCreator/LanguagesForm.tsx |
| · | P3 | 2024 | bug | `P6-class-sweep-level1-11` | У конструкторі 2024 на кроці «Навички» показано перемикач «Правила Таші» — опційне правило редакції 2014 | src/lib/components/characterCreator/SkillsForm.tsx |
| · | P3 | 2024 | bug | `P7-mobile-ux-06` | Конструктор 2024 підписує кроки «Раса» / «Опції раси», хоча на тому самому екрані пише «Оберіть вид» і посилається на «Складові виду» | src/lib/components/characterCreator/creation-step-resolver.ts, src/lib/components/characterCreator/RaceChoiceOptionsForm.tsx |
| · | P3 | both | bug | `P7-mobile-ux-08` | Картки-вибори конструктора — це div з onClick без role/tabIndex/aria, а тап у зоні опису відкриває модалку заклинання замість вибору опції | src/lib/components/characterCreator/RaceChoiceOptionsForm.tsx, src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx |
| · | P3 | both | bug | `P7-mobile-ux-09` | Навігація каруселі листа озвучується англійською: aria-label="Previous slide" / "Next slide" | src/lib/components/characterSheet/CharacterCarousel.tsx |
| · | P3 | both | missing-system | `P7-mobile-ux-10` | На кроці «Опції класу» 1-го рівня показано всі 31 виклик, зокрема недоступні за передумовами, без приглушення й без сортування доступних догори | src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx |

### P4-regression-2014-06 — /char/create і /char/<id>/levelup падають на серверному рендері: «useSession must be wrapped in a SessionProvider», сторінка перемикається на клієнтський рендер

**Рівень:** P2 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** Сторінка конструктора рендериться на сервері без помилок; useSession викликається лише всередині SessionProvider.

**Є:** SSR падає, Next перемальовує сторінку на клієнті; у dev поверх неї стає оверлей помилки.

**Доказ:** Playwright збирає pageerror на кожному відкритті конструктора й майстра підвищення: «Error: Switched to client rendering because the server rendering errored: [next-auth]: `useSession` must be wrapped in a <SessionProvider />» (логи scratchpad/audit/work/P4-regression-2014/fighter.log і cleric.log, розділ errors). Побічний ефект видно механічно: у двох прогонах дев-оверлей `<nextjs-portal>` перекрив сторінку й перехопив кліки по картках рас — сценарій не міг обрати расу, доки портал не прибрати (cleric.log, перша спроба: «<nextjs-portal> … intercepts pointer events»).

**Відтворення:** Відкрити http://127.0.0.1:3100/char/create з валідною сесією й дивитися console/pageerror.

**Куди дивитись:** Знайти компонент у дереві навбара/сторінки, що кличе useSession без провайдера (той самий підозрюваний, що в записі «Гідратація навбара» в docs/KNOWN-BUGS.md — EditionSwitcher), і або обгорнути провайдером, або віддавати сесію пропом із серверного шару. Перевірено лише на dev-сервері :3100 — чи так само в проді, не перевірено.

**Файли:** `src/app/char/create`, `src/lib/components/characterCreator/MultiStepForm.tsx`


### L02-backgrounds-08 — Модалка деталей походження в конструкторі не показує ні трьох характеристик, ні риси походження, ні «або 50 зм» — саме те, за чим у 2024 обирають походження

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md §«Parts of a Background» — Ability Scores, Feat, Equipment (package or 50 GP)

**Має бути:** У модалці видно три дозволені характеристики, фіксовану рису походження і альтернативу «пакунок або 50 зм».

**Є:** Показано два поля, що для 2024 завжди порожні («Мови», «Особливість»), і немає трьох ключових.

**Доказ:** src/lib/components/characterCreator/modals/BackgroundInfoModal.tsx:57-73 малює лише: «Джерело», «Навички», «Інструменти», «Мови» (formatLanguages([], languagesToChooseCount) — для всіх 16 походжень 2024 це «—», бо лічильник 0) і «Особливість» (поняття 2014, для всіх 16 — «-»), далі список майна й опис. Полів abilityOptions, originFeat, grantsGoldInstead компонент не читає взагалі.

**Відтворення:** http://127.0.0.1:3100/2024/char → крок «Передісторія» → «Показати деталі» будь-якого походження.

**Куди дивитись:** Додати три InfoPill: «Характеристики на вибір», «Риса походження», «Спорядження: пакунок або 50 зм» — рівно те, що вже вміє каталожна картка.

**Файли:** `src/lib/components/characterCreator/modals/BackgroundInfoModal.tsx`, `src/lib/types/model-types.ts`


### P1-human-fighter-14 — Сирий англійський ключ «Skilled Options» як назва групи вибору в українському інтерфейсі

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** data · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** «Навички та інструменти» або «Опції риси «Умілець»»

**Є:** «Skilled Options»

**Доказ:** Крок «Опції риси виду»: «ГРУПА / Skilled Options / Оберіть 3» — shots/P1-human-fighter-05-skilled-choices.png. Той самий рядок лежить у чернетці як ключ: speciesFeatChoiceSelections: {"Skilled Options": [...]}. Порівняй сусідню групу на кроці раси — «Риса походження» (українською).

**Відтворення:** /2024/char → Людина → риса Умілець → крок «Опції риси виду»

**Куди дивитись:** Перекласти choiceGroupName у джерелі опцій риси Skilled (data/2024/normalized/feats.json → сід feat_choice_option)

**Файли:** `data/2024/normalized/feats.json`, `prisma/seed/`


### P1-human-fighter-17 — Конструктор 2024 говорить «Раса» замість «Вид» і пропонує 2014-опцію «Правила Таші»

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md — розділ «## Character Species»; «Правила Таші» (Custom Origin) — необовʼязкове правило TCoE 2014, у PHB 2024 його немає

**Має бути:** У редакції 2024 — «Вид»; необовʼязкове правило 2014 у конструкторі 2024 або приховане, або назване як кастомізація походження 2024

**Є:** Змішана термінологія й 2014-опція в 2024-потоці

**Доказ:** Кроки конструктора 2024 підписані «Раса», «Опції раси», «Опції риси виду» (shots/P1-human-fighter-03-after-race.png; data-testid creation-step-race, creation-step-raceChoices). Крок «Навички» містить тумблер «Правила Таші» з підписом «🌟 Режим Таші: всі навички від раси, підраси та передісторії тепер доступні для вільного вибору» (shots/P1-human-fighter-14b-skills-tasha.png).

**Відтворення:** /2024/char → перший крок; далі крок «Навички» → тумблер «Правила Таші»

**Куди дивитись:** Розвести підписи кроків за редакцією в creation-step-resolver.ts; вирішити (питання власника), чи лишати режим Таші в 2024

**Файли:** `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/lib/components/characterCreator/SkillsForm.tsx`


### P2-elf-wizard-09 — Підсумок спорядження на останньому кроці конструктора показує сирі option_id (204, 205, 206, 208) замість назв предметів

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:9830 — Wizard Starting Equipment: «(A) 2 Daggers, Arcane Focus (Quarterstaff), Robe, Spellbook, Scholar's Pack, and 5 GP»

**Має бути:** «Кинджал x2 • Містичне фокусування (палиця) • Мантія • Книга заклять • Вчений набір • 5 зм»

**Є:** Три з шести позицій показані як сирі числові id; записалося при цьому все правильно (pers.custom_equipment містить назви)

**Доказ:** Крок «Імʼя», блок «СПОРЯДЖЕННЯ»: «Опція 1: Кинджал x2 • 204 • 205 • 206 • Вчений набір • 208» (shots/P2-elf-wizard-07d-name.png, лог 07.log). У базі class_starting_equipment_option для class_id 350: option_id 204 item='Містичне фокусування (палиця)', 205 item='Мантія', 206 item='Книга заклять'. Причина: src/lib/components/characterCreator/NameForm.tsx:361-378 — resolveEquipmentOptionLabel збирає підпис із description/weapon/armor/equipmentPack і не читає колонку item, у якій лежить усе вільнотекстове спорядження 2024; далі return label ? `${label}${q}` : String(optionId).

**Відтворення:** 1) /2024/char → Чарівник 2024 → на кроці «Спорядження» обрати «Варіант A» 2) «Далі →» на крок «Імʼя» 3) подивитися блок «СПОРЯДЖЕННЯ»

**Куди дивитись:** У resolveEquipmentOptionLabel (NameForm.tsx:361) додати читання поля item поряд із description

**Файли:** `src/lib/components/characterCreator/NameForm.tsx`


### P2-elf-wizard-10 — У виборі мов пропонується «Загальна», яку персонаж отримує автоматично — вибір можна витратити на дублікат

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md — походження дає Common плюс дві мови на вибір; Common уже відомий

**Має бути:** Мова, вже надана видом/походженням, у списку вибору не показується

**Є:** «Загальна» присутня у списку; вибір її призвів би до втрати одного з двох слотів мови

**Доказ:** Крок «Мови»: «Ви можете обрати ще 2 з 2 мов», перша в переліку — «Загальна» (shots/P2-elf-wizard-07a-languages.png, лог 07.log). Після створення pers.custom_languages_known = "Загальна\nЕльфійська\nДраконяча" — Common додано автоматично на додачу до двох обраних.

**Відтворення:** 1) /2024/char → Ельф → Чарівник 2024 → Мудрець 2024 2) дійти до кроку «Мови» — «Загальна» у переліку

**Куди дивитись:** Фільтрувати вже відомі мови у LanguagesForm за зібраними джерелами (вид + походження + клас)

**Файли:** `src/lib/components/characterCreator/LanguagesForm.tsx`


### P6-class-sweep-level1-11 — У конструкторі 2024 на кроці «Навички» показано перемикач «Правила Таші» — опційне правило редакції 2014

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** Tasha's Cauldron of Everything «Customizing Your Origin» — опційне правило 2014; у 2024 його зміст вбудований у правила походження (data/2024/srd/character-origins.md — бонуси характеристик дає походження, навички обираються за походженням)

**Має бути:** У конструкторі 2024 перемикача Таші немає — правило неактуальне для цієї редакції

**Є:** перемикач показано для всіх 13 класів 2024

**Доказ:** Текст кроку «Навички» в усіх 13 прогонах починається рядком «Правила Таші» (scratchpad/audit/work/P6-class-sweep-level1/drive-BARD_2024.json, поле text кроку skills; скріншот scratchpad/audit/shots/P6-CLERIC_2024-05-skills.png)

**Відтворення:** http://127.0.0.1:3100/2024/char → Людина → Пильний → будь-який клас → Фермер → крок «Навички».

**Куди дивитись:** SkillsForm.tsx: ховати блок Таші, коли ruleset === RULES_2024.

**Файли:** `src/lib/components/characterCreator/SkillsForm.tsx`


### P7-mobile-ux-06 — Конструктор 2024 підписує кроки «Раса» / «Опції раси», хоча на тому самому екрані пише «Оберіть вид» і посилається на «Складові виду»

**Рівень:** P3 · **Редакція:** 2024 · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/character-origins.md:65 «## Character Species»; :75 «### Parts of a Species» — редакція 2024 не має поняття race

**Має бути:** У режимі 2024 крок зветься «Вид» / «Опції виду», як і заголовок «Оберіть вид».

**Є:** Три різні терміни для одного поняття на одному екрані; гравець 2024 не звірить крок із книгою, де це species.

**Доказ:** Код: src/lib/components/characterCreator/RacesForm.tsx:164 `{is2024 ? "Оберіть вид" : "Оберіть расу"}` — гілка є; src/lib/components/characterCreator/creation-step-rule-links.ts:38-39 `articleTitle: "Складові виду"`; але src/lib/components/characterCreator/creation-step-resolver.ts:33 `{ id: "race", name: "Раса", component: "races" }` і :49 `steps.push({ id: "raceChoices", name: "Опції раси", … })` — без гілки редакції; src/lib/components/characterCreator/RaceChoiceOptionsForm.tsx:115 заголовок `Опції раси` — теж без гілки. Браузер: на одному екрані одночасно «ОПЦІЇ РАСИ» (h2), «Як це працює: Складові виду» (посилання) і степер «КРОК 1 Раса / КРОК 2 Опції раси». Скріншот shots/P7/301-creation_step_raceChoices-vp.png.

**Відтворення:** 375×812 → /2024/char → вибрати Тифлінга → «Далі».

**Куди дивитись:** Прокинути ознаку редакції в resolveCreationSteps (умови вже містять прапорці) і в RaceChoiceOptionsForm; назви кроків 2024 — «Вид», «Опції виду».

**Файли:** `src/lib/components/characterCreator/creation-step-resolver.ts`, `src/lib/components/characterCreator/RaceChoiceOptionsForm.tsx`


### P7-mobile-ux-08 — Картки-вибори конструктора — це div з onClick без role/tabIndex/aria, а тап у зоні опису відкриває модалку заклинання замість вибору опції

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** role="radio" + tabIndex + aria-checked на картці; посилання в описі або поза зоною вибору, або позначені data-stop-card-click.

**Є:** Клавіатура і скрінрідер вибір не бачать; на дотик більша частина площі картки — опис із посиланнями, і влучання в посилання скасовує вибір, відкриваючи модалку заклинання.

**Доказ:** Код: src/lib/components/characterCreator/RaceChoiceOptionsForm.tsx:141-149 — `<Card className={clsx("glass-card cursor-pointer …")} onClick={() => selectOption(groupName, opt.optionId)}>` без role/tabIndex/aria-checked; те саме ClassChoiceOptionGroups.tsx:121-127. У DOM це `<div class="glass-card cursor-pointer …">` — мій сканер тап-цілей його навіть не бачить, бо це не button і не [role]. Браузер: у прогоні s5-full.mjs тап у центр картки «Безодня» на кроці «Опції раси» не вибрав опцію, а перевів сторінку на http://127.0.0.1:3100/2024/char?spell=poison-spray&edition=2024 (лог: `[301-creation_step_raceChoices-filled] /2024/char?spell=poison-spray&edition=2024`) — палець влучив у посилання на заклинання всередині опису картки. Механізм для захисту вже існує поруч: ClassChoiceOptionGroups.tsx:125 `if ((event.target)?.closest?.("[data-stop-card-click]")) return;`.

**Відтворення:** 375×812, hasTouch → /2024/char → Тифлінг → «Далі» → тапнути в середину картки «Безодня» (там, де текст «Ви маєте опір до шкоди отрутою. Ви також знаєте замовляння Отруйні бризки [Poison Spray].») → відкриється модалка заклинання, опція не вибереться, «Далі →» лишиться DIS.

**Куди дивитись:** Додати role/tabIndex/aria-checked на Card у RaceChoiceOptionsForm і ClassChoiceOptionGroups; позначити посилання в описі data-stop-card-click або винести опис за межі клікабельної зони.

**Файли:** `src/lib/components/characterCreator/RaceChoiceOptionsForm.tsx`, `src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx`


### P7-mobile-ux-09 — Навігація каруселі листа озвучується англійською: aria-label="Previous slide" / "Next slide"

**Рівень:** P3 · **Редакція:** both · **Тип:** bug · **Праці:** S · **Вердикт:** не перевірено

**Має бути:** «Попередній слайд» / «Наступний слайд».

**Є:** Англійські мітки в україномовному листі персонажа.

**Доказ:** src/lib/components/characterSheet/CharacterCarousel.tsx:175 `aria-label="Previous slide"`, :185 `aria-label="Next slide"`. Усередині кнопок лише іконка (ChevronLeft/ChevronRight), тож це єдиний текст для скрінрідера. Браузер підтвердив: на /char/132 єдині знайдені навігаційні кнопки мають саме ці англійські мітки (лог s10-sheet.mjs: `nav candidates [{"al":"Previous slide"},{"al":"Next slide"}]`).

**Відтворення:** /char/<id> → перевірити aria-label кнопок ‹ і › (наприклад, через VoiceOver або document.querySelectorAll('[aria-label]')).

**Куди дивитись:** Перекласти обидві мітки в CharacterCarousel.tsx:175,185.

**Файли:** `src/lib/components/characterSheet/CharacterCarousel.tsx`


### P7-mobile-ux-10 — На кроці «Опції класу» 1-го рівня показано всі 31 виклик, зокрема недоступні за передумовами, без приглушення й без сортування доступних догори

**Рівень:** P3 · **Редакція:** both · **Тип:** missing-system · **Праці:** S · **Вердикт:** не перевірено

**Правило:** data/2024/srd/classes.md:8962-8964 «Level 1: Eldritch Invocations … You gain one invocation of your choice» — на 1-му рівні законний рівно один вибір

**Має бути:** Недоступні опції приглушені й опущені донизу (або сховані за перемикачем), як у D&D Beyond і Foundry.

**Є:** Доступні й недоступні виглядають однаково яскраво і перемішані; гравець мусить прочитати всі 31, щоб знайти ті кілька, які може взяти на 1-му рівні.

**Доказ:** Скріншот shots/P7/303-creation_step_classChoices-full.png і текст кроку (work/P7-mobile-ux/create2.json, крок 700): чорнокнижник 1-го рівня бачить 31 картку, серед них «Потрібен 5 рівень цього класу», «Потрібен 9 рівень цього класу», «Потрібен 12 рівень цього класу», «Потрібен Дар клинка», «Потрібен Дар гримуара». Червона плашка з причиною є (ClassChoiceOptionGroups.tsx:147-152), але сама картка не приглушена і не опущена донизу — getCardClassName до prerequisite не звертається. Бейдж групи «Обрано: 0/1». На 375 px це ~6 екранів прокрутки заради одного вибору.

**Відтворення:** 375×812 → /2024/char → Тифлінг → Чорнокнижник → «Далі» → крок «Опції класу», прокрутити список.

**Куди дивитись:** ClassChoiceOptionGroups.tsx: getCardClassName уже має доступ до prerequisite — додати приглушення (opacity/grayscale) і сортування доступних догори; за бажанням перемикач «показати недоступні».

**Файли:** `src/lib/components/characterCreator/ClassChoiceOptionGroups.tsx`
