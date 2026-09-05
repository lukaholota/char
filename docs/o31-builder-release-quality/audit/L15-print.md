# L15-print — друк / PDF

Аудит: 2026-09-04. Лінза — друк персонажа в PDF: `src/server/pdf/*`,
`src/server/db/print-content.ts`, `PrintCharacterDialog.tsx`, серверні дії
`src/app/char/[id]/print/actions.ts` і `src/app/char/share/[token]/print/actions.ts`.

## Як здобувалися докази

1. Прочитано весь конвеєр друку: `generateCharacterPdf.ts` (1 563 рядки), `featuresPdf.ts`,
   `spellsPdf.ts`, `magicItemsPdf.ts`, `equipmentPrint.ts`, `printProjection.ts`,
   `groupCharacterFeatures.ts`, `types.ts`, `print-content.ts`, діалог друку.
2. Програмно зібрано три персонажі **тим самим шляхом, що й UI** (серверні дії `createCharacter`
   + `levelUpCharacter` через хелпери `tests/helpers/build-2024-multiclass-character.ts` і
   `tests/fixtures/builds`), і для кожного викликано `generateCharacterPdfFromData` з усіма
   секціями:
   - `mc12` — Ельф (Дроу), Паладин 5 / Чародій 3, `RULES_2024` (фікстура
     `12-drow-paladin5-sorcerer3`), 8 сторінок PDF;
   - `mc16` — Тифлінг (Пекельний), Чорнокнижник 5 / Бард 3, `RULES_2024` (фікстура
     `16-infernal-tiefling-warlock5-bard3`), 8 сторінок;
   - `c2014-warlock` — Чорнокнижник 1, `RULES_2014` (білд `warlock-pact-patron`), 4 сторінки —
     регресія 2014.
   Файли: `…/audit/work/L15-print/{mc12,mc16,c2014-warlock}.pdf` та однойменні `.json`
   (дамп усіх заповнених полів AcroForm + вхідні дані персонажа).
   Прогін: `bunx vitest run --config …/work/L15-print/vitest.audit.mts` — 3 passed.
3. Шаблони `public/CharacterSheet_fixed.pdf`, `public/CharacterSpells_fixed.pdf`,
   `public/CharacterDetails.pdf` розібрано через `pdf-lib` (перелік і геометрія полів) і `qpdf`.
4. Запити до `spells_test` через node + `pg` (скрипти `q.mjs`, `q2.mjs`, `q3.mjs` у теці роботи).

---

## Знахідки

### L15-print-01 — P1 — Майстерність зброї не друкується взагалі

**Правило (2024).** `data/2024/srd/classes.md`: Weapon Mastery — гравець обирає конкретні види
зброї, властивість яких («Topple», «Vex»…) діє в бою. Це збережений вибір гравця, а не
похідна величина.

**Доказ.**
```
$ grep -rn "mastery\|Mastery" src/server/pdf/   →  нічого
```
База (`spells_test`), персонаж `mc12` (pers_id 7):
```
pers_id | name                                            | weapon
      7 | Ельф (Дроу), Паладин 5 / Чародій 3 (рівень 8)   | LONGSWORD
      7 | Ельф (Дроу), Паладин 5 / Чародій 3 (рівень 8)   | JAVELIN
```
Дамп полів згенерованого PDF (`work/L15-print/mc12.json`) не містить ні `LONGSWORD`, ні
`JAVELIN`, ні слова «майстерність» у жодному полі, окрім назви класової риси
`· Майстерність зброї` у «Features and Traits» — тобто надруковано, що риса є, але не *які саме*
види зброї обрано. Лист має для цього окремий блок `WeaponMasteryCard.tsx`.

**Очікувано.** Друкований чарник несе перелік обраних майстерностей (як `WeaponMasteryCard`).
**Фактично.** Вибір гравця в PDF відсутній.
**Де лагодити.** `fillFirstPageUsingExistingFields` (додати рядок у `AttacksSpellcasting`, там
є місце 166×114 pt) або окремий блок у `featuresPdf.ts`; дані —
`findPersWeaponMasteryOffer` / `pers_weapon_mastery`.

---

### L15-print-02 — P1 — «Підготовлені» заклинання не позначаються: 92 чекбокси шаблона не заповнюються

**Доказ.** Шаблон `public/CharacterSpells_fixed.pdf` має 214 полів: 122 текстових і **92
чекбокси** (`Check Box 3031`…), розташованих по одному біля кожного рядка заклинання — це
стандартна колонка «підготовлено». `fillSpellSheet`
(`src/server/pdf/generateCharacterPdf.ts:780–870`) заповнює лише текстові поля
(`Spells 10xx`, `SlotsTotal xx`) і **жодного разу не викликає `setCheckIfPresent`**.

`PersSpell.isPrepared` існує і використовується листом:
`src/lib/components/characterSheet/slides/MagicSlide.tsx:319` фільтрує
`filterMode === "prepared"` саме за цим полем.

**Очікувано.** Надрукований лист заклинань розрізняє підготовлені й непідготовлені (для клірика,
друїда, чарівника, паладина це щоденний вибір гравця).
**Фактично.** Усі чекбокси порожні; за столом лист не показує, що персонаж підготував.
**Де лагодити.** `fillSpellSheet` — зіставити `levelNamesMap[level][i]` з відповідним
`Check Box …` і викликати `setCheckIfPresent(form, …, ps.isPrepared)`.

---

### L15-print-03 — P2 — Гроші не друкуються, хоча поля в шаблоні є

**Доказ.** Шаблон `CharacterSheet_fixed.pdf` містить поля `CP`, `SP`, `EP`, `GP`, `PP`
(перелік полів шаблона, 106 полів). Код їх заповнює — але закоментованим:
```ts
// src/server/pdf/generateCharacterPdf.ts:1114–1120
// Don't print coins
// setTextForFirstPresent(form, ["CP"], safeText((pers as any).cp));
// setTextForFirstPresent(form, ["SP"], safeText((pers as any).sp));
…
```
У персонажів `mc12`/`mc16` `gp = "22"`, у 2014-персонажа `gp = "5"` — дані є, друк їх мовчки
викидає.

**Очікувано.** Стартові й поточні гроші в PDF (D&D Beyond, Roll20 друкують).
**Фактично.** Порожні клітинки монет.
**Де лагодити.** Розкоментувати ті ж рядки; це один файл.

---

### L15-print-04 — P2 — Передісторія і нотатки не потрапляють у друк узагалі

**Доказ.** `generateCharacterPdf.ts:1092–1093`:
```ts
setMultilineTextIfPresent(form, "Backstory", safeText(extras.backstory));
setMultilineTextIfPresent(form, "Notes", safeText(extras.notes));
```
Повний перелік полів `CharacterSheet_fixed.pdf` **не містить** ні `Backstory`, ні `Notes`
(є `PersonalityTraits `, `Ideals`, `Bonds`, `Flaws`). `setMultilineTextIfPresent` мовчки виходить,
коли поля немає. Секція `DETAILS` теж не рятує: `public/CharacterDetails.pdf` має **0 полів
форми** — це порожній бланк.

`prisma/schema.prisma:595–596` — `backstory String @default("")`, `notes String @default("")`,
тобто дані на листі є.

**Очікувано.** Передісторія й нотатки друкуються (або в бланку подробиць, або окремим блоком).
**Фактично.** Тихо зникають; користувач не отримує жодного попередження.
**Де лагодити.** Або створити поля оверлеєм (`overlayLayout.ts` + `createFieldsFromOverlay` вже
є і саме для цього), або додати їх у HTML-секцію.

---

### L15-print-05 — P2 — Лист заклинань мовчки обрізає списки

**Доказ.** `fillSpellSheet` має фіксовані масиви імен полів:
замовляння — 8, рівень 1 — 12, рівні 2–4 — по 13, рівні 5–7 — по 9, рівні 8–9 — по 7
(`generateCharacterPdf.ts:806–826`), і цикл `if (i < names.length)` просто не пише решту:
```ts
levelSpells.forEach((ps, i) => { if (i < names.length) { … } });
```
Чарівник 2024 на 5-му рівні тримає в книзі більш ніж 12 заклинань 1-го рівня
(`data/2024/srd/classes.md`, Wizard: «Free Spells» + два за рівень), тобто межа досяжна на
низьких рівнях.

**Очікувано.** Або друк другої сторінки листа заклинань, або хоча б помітка «…ще N».
**Фактично.** Заклинання просто зникають з таблиці без жодної ознаки.
(Повні описи в секції `SPELLS` не рятують: там немає слотів і структури таблиці.)

---

### L15-print-06 — P2 — Слоти Магії пакту зливаються зі звичайними без підпису

**Доказ.** `generateCharacterPdf.ts:773–778`:
```ts
function formatSpellSlots(standard: number, pact: number): string {
  if (standard > 0 && pact > 0) return `${standard} + ${pact}`;
  …
}
```
У полі `SlotsTotal N` з'являється, наприклад, `4 + 2` без пояснення, що друга цифра
відновлюється **коротким** відпочинком. Лист це розрізняє: `MagicSlide.tsx:307–316` тримає
`pactInfo` окремо від `maxSlots` і малює окремий блок.

**Правило.** `data/2024/srd/classes.md`, Warlock → Pact Magic: слоти відновлюються на короткому
відпочинку; це головна відмінність чорнокнижника.
**Фактично.** Персонаж `mc16` (Чорнокнижник 5 / Бард 3) друкує неподільну суму.

---

### L15-print-07 — P2 — Рід/походження виду губиться в полі «Раса», термінологія 2024 не застосована

**Доказ.** `generateCharacterPdf.ts:1035–1038`:
```ts
case "Race":
  value = translateRaceName(pers.race?.name);
```
`pers.subrace` / `raceVariants` не читаються. Дамп полів:
- `mc12`: `Race ` = `'Ельф'` (персонаж — **Ельф (Дроу)**, це видно з його ж імені
  `'Ельф (Дроу), Паладин 5 / Чародій 3 (рівень 8)'`);
- `mc16`: `Race ` = `'Тифлінг'` (персонаж — **Тифлінг (Пекельний)**).

Крім того, шаблон і код усюди кажуть «Раса», тоді як у 2024 це **Вид**
(`data/2024/srd/character-origins.md` — Species). Одного шаблона на дві редакції для цього мало.

**Очікувано.** `Ельф (Дроу)`, підпис «Вид» для `RULES_2024`.
**Фактично.** Втрачений рід; підпис 2014-ної редакції на аркуші 2024-персонажа.

---

### L15-print-08 — P3 — Джерело заклинання друкується сирим enum

**Доказ.** `src/server/pdf/spellsPdf.ts` — `<div class="meta">${escapePrintHtml(String(s.source))}</div>`,
а `loadPrintableSpells` віддає `String(spell.source)`. Значення в базі:
`PHB_2024` (391), `PHB` (360), `XGTE` (95), `TCOE` (22)…
Український відповідник **існує**: `src/lib/refs/translation.ts:936` `sourceTranslations`
(`PHB_2024: "Книга Гравця (2024)"`, `XGTE: "Довідник Занатара про все"`).

**Фактично.** На українському друкованому описі заклинання стоїть `PHB_2024`.

---

### L15-print-09 — P2 — Для 2024 друк «Здібностей» втрачає структуру дій і лічильники (дані)

**Доказ (запит до `spells_test`).**
```
ruleset      | display_type | count
RULES_2024   | {PASSIVE}    | 547     ← усі 547
RULES_2014   | {PASSIVE} / {ACTION} / {BONUSACTION} / {REACTION} / комбінації
```
```
ruleset     | with_uses | pb | total
RULES_2024  |         3 |  0 |   547
RULES_2014  |       172 | 44 |  1281
```
Наслідок у друці: `groupFeaturesByType` (`featuresPdf.ts:22–38`) для будь-якого 2024-персонажа
дає лише секцію «Пасивні здібності» — заголовків «Дії», «Бонусні дії», «Реакції» не буде ніколи,
а `formatUsageInfo` (`featuresPdf.ts:41`) не намалює жодного `[x/y кор. відп.]`.

Виміряно на живих персонажах: `mc12` — `passive: 29, actions: 0, bonusActions: 0, reactions: 0`,
жодна з 29 рис не має `usesPer`; `mc16` — `passive: 25, 0, 0, 0`. Для порівняння,
2014-чорнокнижник 1-го рівня: `passive: 2, actions: 1`, і `Присутність феї` має `uses=1`.

Це дефект **даних** (сіди 2024 не заповнюють `display_type` / `uses_count`), але помітний він
саме у друці, бо там немає інтерактивного обходу.

---

### L15-print-10 — P2 — Збій секції гаситься логом: користувач отримує неповний PDF без помилки

**Доказ.** `generateCharacterPdfFromData` обгортає **кожну** необов'язкову секцію в
```ts
} catch (err) {
  log.warn("spells.failed", { err });
  if (strictSections) throw err;
}
```
(`DETAILS`, `SPELL_SHEET`, `FEATURES`, `SPELLS`, `MAGIC_ITEMS`, `WILDSHAPES` — рядки 1407–1543),
де `strictSections = process.env.PDF_STRICT_SECTIONS === "1"` і в проді не виставлений.
Секції `FEATURES/SPELLS/MAGIC_ITEMS/WILDSHAPES` йдуть крізь `puppeteer-core` + локальний Chrome
(`pdfUtils.getBrowser`); якщо браузера немає або він упав, PDF просто приїде без цих сторінок.
Діалог друку показує «Завантажити PDF» і жодного попередження.

**Очікувано.** Або помилка, або явна сторінка «секцію не вдалося сформувати».
**Фактично.** Мовчазна втрата обраних користувачем секцій.

---

### L15-print-11 — P2 — У шапці атак лише 3 рядки зброї; четверта зброя зникає

**Доказ.** `fillWeapons` (`generateCharacterPdf.ts:389–406`) має рівно три слоти
(`Wpn Name`, `Wpn Name 2`, `Wpn Name 3`) і `if (!weapon) continue;` — зайві записи не
переносяться ні у «Спорядження», ні кудись іще. Після O28 однакова зброя групується з
кількістю (`groupPrintableWeaponAttacks`), але **різна** зброя понад три позиції губиться.
Шаблон дає для цього місце: поле `AttacksSpellcasting` (166×114 pt) зараз несе тільки
`Атак за дію: N` + перелік обладунків.

---

### L15-print-12 — P3 — Маркери `{{English}}` не знімаються на першій сторінці PDF

**Правило проєкту.** Р20 (`docs/DECISIONS.md`): неоднозначний термін пишеться `термін{{English}}`;
«назва риси чи дії несе його на першій згадці в записі».

**Доказ.** `stripGlossaryMarkers` викликається **тільки** з `printProjection.ts`, а той — з
`featuresPdf.ts`, `spellsPdf.ts`, `magicItemsPdf.ts`, `creaturesPdf.ts` (HTML-секції):
```
$ grep -rn "stripGlossaryMarkers\|preparePrintableMarkdown" src/
src/server/pdf/printProjection.ts:6, 8, 13
src/server/pdf/creaturesPdf.ts:9, 155
src/lib/seo-utils.ts:5, 13
```
`generateCharacterPdf.ts` його не імпортує. Тому `buildFeaturesListText` (назви рис у полі
«Features and Traits»), `buildEquipmentText`, `getProfAndLang`, `buildArmorAndShieldText`
надрукують сирі `{{…}}`.

Сьогодні витоку немає: у базі `spells_test` `feature.name like '%{{%'` → 0, `spell.name` → 0,
`magic_item.name` → 0 (маркер є лише в 1 описі риси, а описи проходять через проєкцію). Тобто це
**зведена міна**, яка спрацює з першою ж партією назв за Р20.

---

### L15-print-13 — P3 — Бастіон у друці немає — це прийняте рішення, підтверджено

**Доказ.** `PrintSection` (`src/server/pdf/types.ts:5`) — `CHARACTER | FEATURES | SPELLS |
SPELL_SHEET | MAGIC_ITEMS | WILDSHAPES | DETAILS`; секції бастіону немає, і жоден шлях друку не
торкається `PersBastion*`.

`docs/o28-print-bestiary-character/README.md:19–20` — рішення власника:
> «не додаємо друк класів, рас, походжень, рис, вливань, викликів, зброї, обладунків, правил,
> пасток, об'єктів чи **бастіонів** як окремих каталогів»

**Оцінка.** Для гри за столом бастіон (споруди, їхні лічильники, черга ходу бастіону) — це
дошка, яку веде гравець між сесіями; його відсутність у PDF **не** блокує гру, на відміну від
майстерності зброї чи підготовлених заклинань. Класифікація — `accepted`, не баг.

---

### L15-print-14 — P3 — Конвеєр друку не покритий жодним тестом

**Доказ.** Тека `tests/pdf/` **порожня**. Існують чотири дотичні юніт-тести —
`tests/logic/equipment-print.test.ts`, `group-character-features-print.test.ts`,
`print-projection.test.ts`, `creatures-print.test.ts` і `tests/routes/bestiary-print.test.ts`, —
але жоден не викликає `generateCharacterPdf` / `generateCharacterPdfFromData`, не перевіряє
заповнення полів шаблона і не ловить перейменування поля в PDF.
Це найдорожчий клас регресій тут: усі сеттери мовчазні (`try { … } catch { return; }`), тож
одруківка в імені поля не дає ані помилки, ані логу — просто порожня клітинка.

---

## Перевірено й виявилося правильним

- **Мультиклас у шапці.** `ClassLevel` = `Паладин 5 / Чародій 3`, `Чорнокнижник 5 / Бард 3` —
  головний клас рахується як `level − Σ multiclass.classLevel` (`buildClassLevelString`), збіг з
  фікстурою точний.
- **Кубики хітів за класом.** `HDTotal` = `5к10+3к6` (Паладин к10 + Чародій к6) і `5к8+3к8`;
  через `buildHitDicePools` з `@/rules/hit-dice`, з українською «к». Поточні кубики свідомо не
  друкуються (закоментовано разом із поточними HP/тимчасовими HP — бланк друкується «чистим»).
- **Ряткидки.** Чекбокси володіння беруться з `additionalSaveProficiencies`; вимір показав, що
  колонка справді заповнена класовими ряткидками (Паладин 2024 → `['WIS','CHA']`, Чорнокнижник
  2014 → `['WIS','CHA']`) — початкова підозра «чекбокси завжди порожні» не підтвердилася.
- **Слоти.** `getSpellSlots` рахує `FULL[casterLevel]` + `PACT[pactLevel]` — **тими самими**
  таблицями й тією самою `calculateCasterLevel`, що й лист (`MagicSlide.tsx:297–316`). Розбіжності
  «лист ≠ друк» немає. (Те, що обидва беруть `FULL` навіть для одноклассового половинного
  заклинача 2014, — питання лінзи spellcasting, а не друку.)
- **Характеристика замовляння.** PDF бере `pers.class.primaryCastingStat`, а якщо головний клас
  не заклинач — перший мультиклас із `primaryCastingStat`. Лист (`MagicSlide.tsx:163`) робить
  **менше** — лише головний клас. Тобто друк тут не гірший за лист; єдине джерело
  `loadPersSpellSources` не використовує ні лист, ні друк (лише тести).
- **Групування однакової зброї й спорядження (O28).** `groupPrintableWeaponAttacks` і
  `formatEquipmentText` справді зводять однакові рядки: `Мішечок ×2` у полі `Equipment`.
- **Дика форма.** Секція `WILDSHAPES` вмикається за замовчуванням, коли форми є:
  `PrintCharacterDialog.tsx:88` — `setIncludeWildshapes(count > 0 && (!initialSections || …))`;
  кількість рахує `findPrintableWildshapeCountAction` → `countAttachedForms`.
- **Друк за токеном шеринга** існує окремою дією (`src/app/char/share/[token]/print/actions.ts`)
  і йде тим самим `generateCharacterPdfFromData`.
- **Риси (feats) і їхні вибори** у секції «Здібності» перекладаються:
  `getFeatureDisplayName(name, "FEAT")` → `translateFeatName`, тож сирі `LUCKY`/`SPELL_SNIPER`
  (які реально приходять із `getCharacterFeaturesGrouped`) на сторінці стають «Щасливчик» /
  «Снайпер заклять». На першій сторінці те саме робить `translatePdfText`.
- **Українські шрифти.** `NotoSans-Regular/Bold` вбудовуються двічі: у `pdf-lib`
  (`embedNotoSansFonts` + `form.updateFieldAppearances`) і як base64 `@font-face` для HTML-секцій
  (`fonts.ts`). Кирилиця у згенерованих файлах читається (див. дампи полів).
- **Розміри полів проти обсягу.** Виміряно геометрію: `Features and Traits` 165×370 pt (при
  шрифті 7 pt ≈ 46 рядків — 29 рис `mc12` вміщуються), `ProficienciesLang` 166×129,
  `Equipment` 120×163, `AttacksSpellcasting` 166×114. Переповнення на перевірених персонажах
  **не** відтворилося; ризик лишається для персонажів 15+ рівня і для великих інвентарів.
- **Володіння та мови** доїжджають у поле `ProficienciesLang` одним блоком із заголовками
  «Володіння (броня/зброя/інструменти):» та «Мови:».

## Не перевірено

- **Відповідність назв полів навичок українським підписам шаблона.** `fillSkills`
  (`generateCharacterPdf.ts:694–732`) свідомо зіставляє навички з «прокляті» іменами полів; я
  довів, що зіставлення **внутрішньо узгоджене** — це рівно `SKILL_ORDER_UA_SHEET[i] → i-та за
  англійською абеткою назва поля. Але щоб довести, що i-й рядок шаблона підписаний саме тією
  українською навичкою, потрібен рендер шаблона в растр (ні `pdftotext`, ні `mutool`, ні
  Ghostscript у системі немає; часткове декодування ToUnicode дало лише 7 підписів із ~40).
  **Це найдорожчий неперевірений пункт лінзи**: помилка тут = усі 18 навичок друкуються не в тих
  рядках, і жоден тест цього не ловить.
- Візуальне переповнення сторінок HTML-секцій (розриви колонок `column-count: 2` у
  `featuresPdf`/`spellsPdf`) — оцінювалося тільки за CSS, растр не знімався.
- Друк на мобільному (діалог `PrintCharacterDialog` у 375×812).
