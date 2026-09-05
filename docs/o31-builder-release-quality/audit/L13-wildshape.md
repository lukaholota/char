# L13-wildshape — Дика форма (O24) в обох редакціях

Аудит 2026-09-04. Робочу базу не читав і не чіпав; усі запити — до `spells_test` через
`node + pg` (скрипт `work/L13-wildshape/q.mjs`). Нічого в репозиторії не змінено.

## Що з оракула

**2024 — `data/2024/srd/classes.md`, рядки 3529–3545:**

> _Number of Uses._ You can use Wild Shape twice. You regain one expended use when you finish a
> Short Rest, and you regain all expended uses when you finish a Long Rest.
> You gain additional uses when you reach certain Druid levels…

Колонка «Wild Shape» таблиці Друїда (витяг скриптом із того ж файлу): **2** на рівнях 2–5,
**3** з 6, **4** з 17.

Таблиця «Beast Shapes» там же: `2 → 4 форми / КР 1/4 / без польоту`, `4 → 6 / 1/2 / без польоту`,
`8 → 8 / 1 / політ дозволено`. Колонки плавання немає взагалі.
Тимчасові ХП = рівень друїда.

**Коло місяця 2024 — `data/2024/normalized/subclasses.json`, «Форми кола» (рівень 3):**
КР = рівень друїда / 3 (вниз); КБ = 13 + мод. МУД, якщо це більше за КБ звіра; тимчасові ХП ×3.

**2014.** Класів у `data/2014/srd/` немає (перевірено `grep -ril "wild shape" data/2014/` →
лише `dnd-data-monsters.json`). Але дослівний текст правила 2014 у репозиторії **є** —
`data/5etools/raw/bestiary/bestiary-lr.json:181`, статблок друїда-НІП, який цитує фічу:

> «Amble also retains all their skill and saving throw proficiencies, in addition to gaining those
> of the creature. **If the creature has the same proficiency as Amble and the bonus in its stat
> block is higher, use the creature's bonus instead of Amble's.**»

---

## Знахідки

### L13-wildshape-01 · P1 · 2024 · дані/баг
**Друїд 2024 не має лічильника використань Дикої форми взагалі: перевтілення нічого не витрачає.**

Доказ, запит до `spells_test`:

```
feature_id 48895 | "Дика форма" | eng_name "Druid: Wild Shape (2024)"
uses_count NULL | uses_pool_key NULL | limited_uses_per NULL | uses_count_special NULL
display_type {PASSIVE}
```

і ширше:

```sql
select … from feature f join class_feature cf … join class c …
 where c.ruleset='RULES_2024'
   and (f.uses_count is not null or f.uses_count_special is not null or f.uses_pool_key is not null)
-- 0 рядків
```

Код падає на цьому **двічі**:

- `src/server/db/wildshape-uses.ts:70` — `prisma.feature.findMany({ where: { usesPoolKey: WILDSHAPE_POOL_KEY, ...owned } })`;
  у фічі 2024 `usesPoolKey` порожній, тож вона в кандидати не потрапляє;
- `src/rules/wildshape-uses.ts:26` — `FORM_FEATURE_BY_CREATURE_TYPE` шукає фічу з
  `engName === "Wild Shape"`, а 2024-ва зветься `Druid: Wild Shape (2024)`. Це рівно та пастка,
  яку `docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md` («Пастка, зафіксована
  заздалегідь») попереджав шукати, — і вона спрацювала не на українській назві, а на англійській.

Наслідок на листі: `loadWildshapeForms` (`src/server/db/wildshape-actions.ts:92`) віддає
`uses: null`, `WildshapeCard.tsx:106` малює бейдж «Використань X / Y` лише `{uses && …}` — бейджа
немає; `spendWildshapeUse` (`wildshape-actions.ts:214`) повертає `null`, нічого не списавши.
Перевтілень у друїда 2024 необмежено. Заразом нема з чого платити «Дикому супутнику»
(`Wild Companion`, витрачає використання Дикої форми) і «Дикому відродженню».

**Очікувано:** 2 використання з 2 рівня, 3 з 6, 4 з 17; бейдж на картці; вхід списує одне.
**Фактично:** лічильника немає, вхід безкоштовний, фіча позначена `PASSIVE`.

**Де лагодити:** дані — `usesPoolKey: "WILD_SHAPE"`, `usesCountSpecial: [{lvl:2,uses:2},{lvl:6,uses:3},{lvl:17,uses:4}]`,
`displayType: [CLASS_RESOURCE, ACTION]` для фічі 48895 (сід 2024); код — навчити
`FORM_FEATURE_BY_CREATURE_TYPE` обох імен або звіряти за `usesPoolKey` + типом істоти.
Правити треба **обидва боки**: сама лише правка даних не пройде звірку за `engName`.

---

### L13-wildshape-02 · P1 · 2024 · відсутня система
**Модель відпочинку не вміє «повернути одне використання» — короткий відпочинок віддає весь пул.**

`src/server/db/rest-actions.ts:221–243`:

```ts
const provider = await findPoolProviderForPers({ persId, poolKey: pool.poolKey, restTypes: [RestType.SHORT_REST] });
…
data: { usesRemaining: maxUses },
```

Пул відновлюється **до максимуму**. Іншого режиму в моделі немає: `RestType` — це
`SHORT_REST | LONG_REST | DAY` (`prisma/schema.prisma:1802`), поля «скільки саме повертається»
не існує (`grep usesRestoredOnRest|restoreAmount` — порожньо).

Правило 2024 (`data/2024/srd/classes.md:3533`): «You regain **one** expended use when you finish a
Short Rest, and you regain **all** expended uses when you finish a Long Rest».

Сьогодні це недосяжно через 01, і саме тому небезпечно: найпростіша правка 01 — дати фічі
`limitedUsesPer: SHORT_REST` — зробить друїду 2024 повне відновлення на короткому відпочинку,
тобто **зайву силу**, і виглядатиме як «працює». 2014 цим не зачеплено: там усі використання
справді повертає короткий відпочинок.

---

### L13-wildshape-03 · P2 · 2014 · баг
**Дика форма 2014 не бере вищий модифікатор зі статблока звіра, хоча правило 2014 це вимагає.**

`src/rules/wildshape.ts`:

```ts
export function usesBetterOfBeastProficiencies(ruleset: Ruleset): boolean {
  return ruleset === "RULES_2024";
}
```

Коментар над нею стверджує, що 2014 «навпаки лишає володіння персонажа „де застосовно“ й статблок
для цього не читає — це прямо протилежні правила». Оракул у репозиторії каже інше —
`data/5etools/raw/bestiary/bestiary-lr.json:181` (цитата вгорі): у 2014 правило теж є, лише
вужче — воно діє там, де **обидва** володіють навичкою.

Поведінка закріплена тестом, тобто це не проґавлення, а зафіксоване рішення:
`tests/logic/beast-form.test.ts:323–334` — «2014 володіння зі статблока не бере — той самий вовк,
інша редакція».

**Відтворення (числа з `src/lib/generated/creatures.json`):** Гігантський павук 2014 — КР 1,
`Непомітність +7`, СПР 16 (+3). Друїд 8 рівня з володінням Непомітністю у формі павука:
+3 (СПР звіра) + 3 (БМ) = **+6** на листі; за правилом мало б бути **+7**.

Це продакшн-редакція з реальними персонажами, тому знахідка не косметична.

---

### L13-wildshape-04 · P2 · обидві · баг
**Копія персонажа й знімок рівня гублять усі прикріплені звірині форми.**

`src/lib/logic/pers-duplication.ts:3–27` — у `PERS_DUPLICATION_INCLUDE` немає `wildshapes`
(і немає `resourcePools`), хоча звʼязок у схемі є: `prisma/schema.prisma:667`
`wildshapes PersWildshape[]`.

Споживачі, кожен із яких мовчки губить форми:
- `src/server/db/pers-actions.ts:224` — `duplicatePers` (кнопка «Копія»);
- `src/server/db/pers-actions.ts:426` — копія теки з персонажами;
- `src/server/db/share-actions.ts:612` — імпорт персонажа, яким поділилися.

`src/server/db/snapshots.ts:21–34` (створення знімка рівня) так само не включає `wildshapes`.

**Очікувано:** копія друїда несе ті самі відомі форми — це вибір гравця, зроблений у бестіарії.
**Фактично:** копія відкривається з порожнім списком форм; у 2024 це ще й скидання «відомих форм»,
які за правилом міняються по одній за довгий відпочинок.

---

### L13-wildshape-05 · P2 · 2024 · дані
**«Місячний крок» (Коло місяця 2024, рівень 10) не має лічильника використань.**

Запит: `feature_id 48627 | "Circle of the Moon: Moonlight Step (2024)" | uses_count NULL |
uses_count_special NULL | uses_pool_key NULL`.

Правило (`data/2024/normalized/subclasses.json`, «Місячний крок»): «кількість разів, що дорівнює
вашому модифікатору Мудрості (мінімум один раз), і ви відновлюєте всі витрачені використання,
коли завершуєте довгий відпочинок». У проєкті для цього вже є готова форма
`usesCountSpecial = { type: "FORMULA", group: "STAT_BASED", base: 0, stat: "wis", minimum: 1 }`
(`src/lib/logic/feature-resources.ts:113–121`) — вона просто не заповнена.

---

### L13-wildshape-06 · P2 · 2024 · відсутня система (готовність до релізу)
**Дика форма 2024 не покрита жодним наскрізним тестом — саме тому 01 і не помітили.**

- `tests/fixtures/2024-acceptance/*.json` — десять персонажів, друїда серед них немає
  (`01 fighter, 02 cleric, 03 wizard, 04 rogue, 05 barbarian, 06 bard, 07 paladin, 08 ranger,
  09 warlock, 10 monk`).
- `tests/db/wildshape-forms.test.ts` — усі персонажі створюються з `ruleset: "RULES_2014"`;
  `RULES_2024` там зустрічається тричі й лише як **редакція каталогу істот**, не персонажа
  (рядки 147, 157, 159).
- 2024 перевірено тільки чистими тестами `tests/rules/wildshape.test.ts` і
  `tests/logic/beast-form.test.ts`, які до бази не ходять і фічі в ній не бачать.

Тобто шлях «персонаж 2024 → серверна дія → пул використань» не проходить жоден тест.

---

### L13-wildshape-07 · P3 · обидві · дані/UX
**Три різні назви Показника небезпеки в одному потоці — гравець не звірить фічу з фільтром.**

| Де | Як написано |
|---|---|
| `src/lib/components/characterSheet/WildshapeCard.tsx:212` | `КР 1/4 · …` |
| `src/rules/wildshape.ts:297` | `КР до 1/4` |
| `src/components/bestiary/CreatureStatblockCard.tsx:194` | `Показник небезпеки (CR):` |
| `src/components/bestiary/BestiaryFilterDialog.tsx:78` | `Показник небезпеки (CR)` |
| опис фічі 48895 у базі | «максимальним **Показником складності** 1/4», таблиця «Макс. **ПС**» |

Словник має **обидва** терміни: `dictionary.json:265` `challengeRating: "Показник небезпеки (CR)"`
і `dictionary.json:537` `rules2024.statblockFields.cr: "Показник складності (ПС)"`.
Скорочення **«КР»**, яким користується вся Дика форма, не збігається з жодним із них.

---

### L13-wildshape-08 · P3 · 2014 · дані
**Архідруїд 20 рівня — «Дика форма без обмежень» — не знімає лічильника: пул лишається 2.**

`feature 17932 "Archdruid"`: опис у базі — «ви можете використовувати Дику форму **без
обмежень**»; `uses_count NULL`, `uses_count_special NULL`, `uses_pool_key NULL`.
Провайдером пулу лишається `feature 17928 "Wild Shape"` із фіксованим `uses_count = 2`, тож
друїд 20 рівня бачить «Використань 2 / 2».

---

## Перевірено й правильно

- **Таблиця «Beast Shapes» обох редакцій** — `src/rules/wildshape.ts:67–79` збігається з
  `data/2024/srd/classes.md` дослівно: 2024 → 4/6/8 форм, КР 1/4 → 1/2 → 1 на рівнях 2/4/8,
  політ із 8, плавання **не обмежене жодним рядком**; 2014 → КР ті самі, політ із 8, плавання з 4.
  Лазіння не обмежене в жодній редакції — і форма про це прямо каже
  (`climbSpeedAllowed`, `wildshape.ts:249`).
- **Коло місяця, КР.** 2024: `level >= 3 ? floor(level/3) : …` — на 3 рівні 1, на 6 — 2, на 8 — 2.
  2014: `level >= 6 ? floor(level/3) : 1` — з 2 рівня КР 1, з 6 — третина рівня. Обидва збігаються
  з правилом; межа кола ніколи не буває нижчою за табличну.
- **Тимчасові ХП 2024** = рівень друїда, ×3 у Колі місяця (`findWildshapeTemporaryHitPoints`);
  у 2014 їх немає взагалі (0 = «правило не застосовується»). Запис у `pers.tempHp` бере **більше
  з двох**, а не додає (`src/server/db/wildshape.ts:88–93`) — так само, як тимчасові хіти за
  правилами не складаються.
- **КБ Кола місяця 2024** = `max(КБ звіра, 13 + мод. МУД)` (`findBeastFormArmorClass`), і в
  формі до нього не додається ані щит, ані расовий бонус (`beast-form.ts:123–135`).
- **Хіти.** 2014 — окремий стос звіра, надлишок шкоди переливається в персонажа й викидає з форми
  (`applyDamageInBeastForm`), добровільний вихід хітів не чіпає; 2024 — стос не створюється
  взагалі (`enterBeastForm(id, null)`), а `damageBeastForm`/`healBeastForm` для 2024 явно
  відмовляють із поясненням (`wildshape-actions.ts:55–59`).
- **Шар статблока на листі.** СИЛ/СПР/СТА підмінюються, расові бонуси до них знімаються
  (`clearAbilityEntries`), ІНТ/МУД/ХАР лишаються; швидкість, КБ і похідні (навички, ряткидки,
  ініціатива) перераховуються самі через ту саму `buildBeastFormPers` —
  `CharacterCarousel.tsx:70`. Спорядження, магія й фічі свідомо лишаються персонажевими (Р-2).
- **Правило 2024 «береться більше з двох»** реалізоване й покрите (`raiseProficienciesToBeast`,
  `beast-proficiencies.ts` читає назви навичок зі словника, а не з власної копії).
- **Каталог правильної редакції.** `findCreatureByKey(key, ruleset)` і
  `pers_wildshape.ruleset` розводять `creatures.json` (974 записи, 115 звірів) і
  `creatures2024.json` (531 / 83). Прикріплена форма читається в межах своєї редакції
  (`tests/db/wildshape-forms.test.ts:145`). Рекомендовані PHB 2024 форми в каталозі 2024 є всі:
  Rat 0, Riding Horse 1/4, Spider 0, Wolf 1/4, жодної без потрібних полів.
- **Скільки форм каталог пропонує** (порахував по `creatures*.json`): 2014 — 36 на 2 рівні,
  61 на 4, 86 на 8, 50 для Кола місяця з КР 1; 2024 — 39 / 46 / 63 і 54 для кола. Тобто фільтр
  не порожній і плавучі звірі 2024 справді доступні з 2 рівня.
- **Тип істоти** звіряється точним збігом, а не входженням (`isBeast`), тож «Рій дрібних звірів»
  і «Бестія (перевертень)» у Дику форму не потрапляють.
- **Пікер форм** — це `/bestiary` чи `/2024/bestiary` в iframe із фільтром «придатні мені»
  (`buildWildshapePickerUrl`), а не другий список; `postMessage` перевіряє походження.
- **Друк.** Форми потрапляють у PDF окремою секцією `WILDSHAPES`
  (`src/server/pdf/generateCharacterPdf.ts:1303, 1535`).
- **Одна активна форма** гарантована частковим унікальним індексом у базі, а не кодом
  (`enterBeastForm`, транзакція + `pers_wildshape_one_active_per_pers`).
- **Підклас Кола місяця 2024** приїхав під тим самим ключем `CIRCLE_OF_THE_MOON`
  (`subclass_id 133`, `classId` DRUID_2024) — `findDruidStanding` знаходить його правильно;
  фічі кола стоять на рівнях 3 / 3 / 6 / 10 / 14, як у книзі.
- **Рівень друїда, а не персонажа.** `findMainClassLevel` + `multiclasses` — мультиклас
  3 воїн / 2 друїд дістає Дику форму 2 рівня.

## Не перевірено

- **Браузер на :3100.** Інтеграційний прогін чужої сесії тримав замок `spells_test` понад 6 хв
  (`with-test-db-lock.sh vitest run --config vitest.integration.config.mts`, pid 20905), тож мій
  програмний зонд (`work/L13-wildshape/probe.test.ts` + `probe.config.mts`) так і не стартував —
  я його зняв, щоб не забрати замок і не витерти персонажів інших агентів. Усі знахідки доведені
  запитом до бази й читанням коду; зонд лишається в теці роботи й готовий до запуску.
- Поведінка «заміна однієї відомої форми за довгий відпочинок» (2024) — застосунок трекер, ліміт
  показується, перевищення попереджає (Р-3, Р26); чи це влаштовує власника як кінцевий стан — не
  моє рішення.
- Тривалість форми (пів рівня друїда в годинах) і заборона чаротворення у формі не моделюються
  в жодній редакції; це узгоджується з «застосунок трекер, а не суддя», але в звіті не перевіряв,
  чи є про це рішення.
