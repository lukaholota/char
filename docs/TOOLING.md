# Інструменти й перевірки

Звірено з локальними `package.json`, Vitest-конфігами та CI workflow 2026-09-27.
Це карта наявних перевірок; результат останнього запуску не випливає з їхньої наявності.

## Що використовується

| Інструмент / команда | Що перевіряє | Джерело |
|---|---|---|
| `rg`, `rg --files`, читання файлів | Пошук коду й залежностей у цьому репозиторії | [AGENTS.md](../AGENTS.md) |
| `bunx tsc --noEmit` | Типи | [tsconfig.json](../tsconfig.json) |
| `bun run lint` | ESLint | [package.json](../package.json) |
| `bun run check:db-boundary` | Імпорт Prisma-клієнта лише з `src/server/db/` | [.dependency-cruiser.cjs](../.dependency-cruiser.cjs) |
| `bun run check:ui-decomposition` | Обмеження розмірів великих UI-файлів | [check-ui-decomposition.ts](../scripts/check-ui-decomposition.ts) |
| `bun run test:no-db` | Основний набір без бази, зокрема правила, контент і компоненти | [vitest.config.mts](../vitest.config.mts) |
| `bun run test:rules:coverage` | Покриття чистих правил | [vitest.rules.config.mts](../vitest.rules.config.mts) |
| `bun run test:integration` | DB/actions/PDF на локальних копіях бази та тривалість файлів | [test-integration.sh](../scripts/test-integration.sh), [конфіг](../vitest.integration.config.mts) |
| `bun run test:corpus` | Окремі звірки з корпусом джерела | [vitest.corpus.config.mts](../vitest.corpus.config.mts) |
| `bun run test:quarantine` | Окремий набір відкладених перевірок | [vitest.quarantine.config.mts](../vitest.quarantine.config.mts) |
| `bun run test:e2e` | Playwright | [playwright.config.ts](../playwright.config.ts) |
| `clean-code-guard` | Ревʼю нетривіальних змін production-коду перед комітом | Доступна навичка агента |

Перед дозволеним пушем звір набір із
[.github/workflows/deploy.yml](../.github/workflows/deploy.yml): CI також тримає сторожі межі
бази, розміру UI й покриття правил. Лише `tsc + lint + test` не відтворюють усі його перевірки.

CI не має бази: інтеграційні тести запускаються локально. Testing Library/jsdom уже є серед
залежностей, але дотик, Swiper, справжню історію й продуктивність перевіряємо браузером.
Процедури: [WORKFLOWS.md](WORKFLOWS.md#tests-and-ci), рішення Р32 і Р45.

## Що не слід вважати налаштованим

За рішенням власника codebase-memory MCP **не використовуємо в цьому проєкті**, зокрема
не виконуємо запити й переіндексацію. Це виняток із глобальної переваги MCP для інших репозиторіїв;
наявність старого індексу чи автоматично доданих інструкцій не змінює цього правила.

`jscpd` є в залежностях, але це не означає наявність CI-гейта дублів. `knip`, Storybook і
хук `PostToolUse` з першого плану не є чинними перевірками лише тому, що їх колись запропонували.
Підтверджуй конкретну команду чи конфіг перед використанням. Claude налаштовується власником;
не змінюй його setup під інший агент.

Prisma Migrate й `prisma db push` заборонені рішенням
[Р2](DECISIONS.md#р2-бд--джерело-істини-міграцій-немає). Kysely не є запланованою заміною
Prisma ([Р5](DECISIONS.md#р5-на-kysely-не-мігруємо)). Testcontainers не використовуються для
поточного локального Postgres-процесу й копій бази на воркер.
