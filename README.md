# char.holota.family

Український конструктор і лист персонажа, каталоги та довідник D&D 5e **2014 і 2024**.
Сайт: https://char.holota.family/.

Документація й навігація по задачах: [docs/README.md](docs/README.md).
Інструкції для роботи в репозиторії: [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md).

## Локальний запуск

Налаштуй змінні за [.env.example](.env.example). Dev-сервер звертається до бази, заданої в env;
для тестових змін використовуй локальний клон, описаний у
[WORKFLOWS](docs/WORKFLOWS.md#schema-and-databases).

```bash
bun install --frozen-lockfile
bunx prisma generate
bun dev
```

## Перевірки й збірка

```bash
bun run test:no-db
bunx tsc --noEmit
bun run lint
```

Інтеграційні тести працюють окремо на локальному Postgres 17 і копіях бази на воркер:

```bash
./scripts/local-test-db.sh status
bun run test:integration
```

`bunx next build` збирає наявні каталоги. **`bun run build` спершу запускає `prebuild` →
`generate:content`: читає налаштовану базу та перезаписує генеровані каталоги.** Вибирай команду
залежно від того, чи потрібна регенерація. Повний перелік команд — у [package.json](package.json).

## Продакшен і PDF

Пуш у `main` запускає [GitHub Actions](.github/workflows/deploy.yml): перевірки, Docker-образ,
викатку з перевіркою доступності й відкатом у разі невдалого смоуку. Пуш потребує явного
доручення власника. Workflow пропускає пуші, які змінюють лише Markdown/`docs/**`.

PDF генерує `puppeteer-core` у серверному процесі. [Dockerfile](Dockerfile) встановлює Chromium
і задає `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`; systemd-сервіс `char` для цього деплою
не використовується. Runtime env-файл контейнера визначає
[scripts/deploy-container.sh](scripts/deploy-container.sh) (`CHAR_ENV_FILE`, типовий шлях
`/home/luka/char.env`). `NEXT_PUBLIC_*` задаються під час збірки.

Параметри PDF є в [.env.example](.env.example): `PUPPETEER_EXECUTABLE_PATH`,
`PUPPETEER_USE_SPARTICUZ`, `PUPPETEER_DISABLE_DEV_SHM_USAGE`, `PDF_SET_CONTENT_TIMEOUT_MS`,
`PDF_RENDER_TIMEOUT_MS`. У контейнері з установленим Chromium використовуй його; для іншого
оточення обери системний браузер або Sparticuz відповідно до конфігурації.

Серверні знімки й обслуговування: [SERVER.md](docs/SERVER.md).
