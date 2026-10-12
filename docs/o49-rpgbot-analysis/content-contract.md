# Контракт KR49.2 і відтворення

Реалізація: [schema.ts](../../src/lib/optimization/schema.ts),
[types.ts](../../src/lib/optimization/types.ts),
[validation.ts](../../src/lib/optimization/validation.ts),
[indices.ts](../../src/lib/optimization/indices.ts),
[bindings.ts](../../src/lib/optimization/bindings.ts),
[revisions.ts](../../src/lib/optimization/revisions.ts).
Жодної нової залежності, DDL, мережевого запиту чи звернення до DB.

## Файли та межі

- `data/rpgbot/manifest.json` — незмінений URL-реєстр KR49.1. Loader бере лише
  проєкцію included `sourceId` і перевірених редакцій; повні evidence/aliases лишаються в manifest.
- `data/rpgbot/uk/<articleId>.json` — окремий `ArticleDocument`: `sources`,
  `sourceRevisions`, `article`, `translations`, `ratings`. Кожен файл валідний самостійно;
  джерела/редакції додатково звіряються з included manifest під час генерації.
- `data/rpgbot/bindings.json` — масив перевірених прив’язок. Стаття може існувати без них.
  Для `kind: "feature"` обов’язкові `parentKey` підкласу й `optionId` точного пункту
  списку (`sectionId-blockId-item-N`); `entityKey` дорівнює каталожному `findFeatureKey`.
  Валідація перевіряє пункт, редакцію та належність оцінки саме цьому пункту й блоку.
  Одна прив’язка обслуговує обидва напрямки читання; станом на 2026-10-04 реалізовано
  лише напрямок «риса → аналіз» для Монаха 2014, приватно для власника.
- `data/rpgbot/entity-keys.json` — явний перевірений snapshot ключів сутностей для
  cross-reference validation. Його наповнення й matching реального корпусу — KR49.3;
  тут він порожній. Binding до ключа поза переданим snapshot дає `missing-entity`.
- `data/rpgbot/builds.json` — масив майбутніх recipes; зараз порожній. За масштабного
  імпорту KR49.8 можна рознести recipes на файли без зміни моделі.
- `src/lib/generated/optimization-articles.json` — тільки published summaries і адреси розділів.
- `optimization-bindings.json` — перевірені короткі previews, refs та окремі score/color/context;
  повні пояснення оцінок сюди не копіюються.
- `optimization-search.json` — окремий section search text, включно з поясненнями оцінок.
  Його lazy інтеграція в пошук — KR49.6; article/binding index його не імпортує.

Індекси зараз містять **0 статей, 0 bindings, 0 search sections**. Це стан відсутнього
перекладеного корпусу, а не 415 завершених перекладів. Власні fixtures з тестовим автором
ніколи не записуються у production data.

[Server-only reader](../../src/lib/optimization/article-reader.server.ts) відкриває
лише `<articleId>.json` за валідованим ID і перевіряє summary/revision refs. Він повертає
саме опубліковану ревізію, навіть коли та stale. Client-safe типи мають лише type imports;
повний reader/corpus не під’єднані до client registry, layouts або UI. Перевірка import graph
обходить runtime imports, reexports і literal dynamic imports транзитивно від усіх
`use client` коренів і app layouts. Читання файлів — Node server runtime; маршрути,
рендеринг AST і packaging/tracing корпусу в деплої належать KR49.4.

## Семантика

Zod strict schemas відхиляють зайві поля й raw HTML nodes. AST: sections із явними IDs,
heading/paragraph/list/table/rating blocks, text/emphasis/strong/link/inline rating nodes.
Посилання допускають HTTP(S) або локальні абсолютні шляхи, не `javascript:`/`data:`.
Текстові значення — plain text: майбутній renderer має виводити їх текстовими вузлами,
без `dangerouslySetInnerHTML`. Tiptap editor не підходить для цього контракту: він
не зберігає source revision refs і контекстні ratings. Нормалізація HTML джерела — KR49.3.

ID статті, slug, sectionId, blockId, source revision ID та translation revision ID задаються
явно, не перераховуються з заголовків. Перейменування title/heading не змінює адресу.
Порядок section/block/choice arrays зберігає авторську структуру; article/binding indices
та ratings у search text сортуються за ID без locale-залежності. Дублікати IDs, slugs
в одній редакції, section/block IDs в одній ревізії та циклічні parent refs дають помилку.

Кожен rating належить точній translation revision/section/target block і контексту.
Одна сутність має кілька ratings без усереднення. `score` optional, без default;
невідома оцінка не отримує нуля чи 4/4. Вказаний колір має відповідати числу:
red=1, orange=2, green=3, blue=4. Пояснення — текст або точний block ref.
Binding preview включає лише явно вказані ratings цієї сутності й published section.

Каталогові `ClassData.key`, `SubclassData.key` підтверджено в `src/lib/classesData.ts`.
Constructor `SubclassI.name` — enum `Subclasses`; батько `Class.name` — enum `Classes`.
Наприклад, `FIGHTER_2014` + `CHAMPION`, не числові DB IDs чи перекладена назва.
Обидва адаптери типізовані чинними моделями без `any` і повертають складений ключ
`ruleset + kind + parentKey + entityKey`. Resolver повертає `resolved/missing/ambiguous`;
будь-яке число primary, відмінне від одного, дає ambiguity, порядок масиву не обирає переможця.
Жодного автоматичного 2014 fallback для 2024/legacy. Shared source дозволяє лише явно
окремі публікації з власними ревізіями перекладу й ratings.

`applySourceRevision` додає immutable source revision, перевіряє hash і позначає інші
переклади цього source stale при зміні hash. Старі sections, source refs і published
revision pointer зберігаються. Повтор того самого revision — idempotent; зміна його
вмісту під тим самим ID — помилка. Publish/switch/review workflow реалізується в KR49.3.

BuildRecipe має pinned article/translation/source/section/block/rating refs, редакцію,
class/entity keys, source-backed choices/alternatives і progression. Валідуються refs,
редакції, наявність ключів у snapshot, count і dependencies лише до попередніх choice groups.
Це контракт походження рекомендацій, а не механічна перевірка чи складання персонажа;
рецепти, ASI/інші конкретні рішення та executable coverage — KR49.8–49.10.

## Команди з кореня репозиторію

Preview читає manifest і окремі JSON corpus-файли, валідує їх, показує counts/byte diff;
нічого не пише:

```sh
bun scripts/rpgbot/generate-indices.ts
```

Apply після тієї самої перевірки записує тільки три generated JSON, якщо байти змінилися:

```sh
bun scripts/rpgbot/generate-indices.ts --apply
```

Ізольована генерація: `--input /path/to/corpus --output /tmp/optimization-indices`.
Пропущені/пошкоджені вхідні файли — явна помилка, а не порожній успішний корпус.
Валідний порожній corpus — законний поточний стан. Генератор не додано до prebuild;
build/runtime не залежать від мережі, DB або повного regeneration.

```sh
bun run test:no-db src/lib/optimization
bunx tsc --noEmit --incremental false
bunx eslint src/lib/optimization scripts/rpgbot
```

На 2026-09-29: **36 tests PASS**, TypeScript/ESLint PASS, повторний preview — всі
`changed: false`. Тести перевіряють conditional/no-rating/comparison-only/missing entity,
legacy, revisions, unsafe AST, invalid refs, recipes, окремі файли, reader та import graph.
