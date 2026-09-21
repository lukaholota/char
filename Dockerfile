# syntax=docker/dockerfile:1

# Збірці база НЕ потрібна. Це вимір, а не припущення: 2026-08-28 `next build` із
# завідомо мертвою адресою (порт 1 на localhost) пройшов до кінця — 4032 сторінки,
# код виходу 0. Раніше тут стояло протилежне, і це була правда свого часу: /char
# пререндерився й кликав базу. Тепер сторінка спершу викликає auth(), тому Next
# віддає її динамічно й до бази на збірці не ходить.
#
# Каталоги теж більше не потребують бази: вони лежать у git (див. .gitignore), а не
# генеруються перед збіркою. Джерелом контенту для образу був `spells_ci_test`, тобто
# сайт показував дані клона — рішення власника 2026-08-28 це прибрати.
#
#   docker build -t char:local .

# Один базовий образ на всі стадії — навмисно. Перша редакція тягнула два (oven/bun:1-debian
# для збірки і node:22-bookworm-slim для рантайму), і саме витягування bun-образу зайняло
# 301,6 с із приблизно десяти хвилин збірки. Bun ставиться пакетом у той самий node-образ.
FROM node:22-bookworm-slim AS base
RUN npm install -g bun@1.3.14

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Каталоги тепер приїжджають із git, а не з бази. Сторож лишається: порожній або
# відсутній файл валить збірку десь усередині Next на TS2307, і краще впасти тут.
RUN for f in spells magicItems feats backgrounds armor weapons infusions invocations \
             classes races rules-2024 bastions creatures creatures2024 \
             creator-content-2014 creator-content-2024; do \
      test -s "src/lib/generated/$f.json" \
        || { echo "ВІДМОВА: немає src/lib/generated/$f.json — він має лежати в git"; exit 1; }; \
    done

# prisma.config.ts кидає помилку, якщо DATABASE_URL не визначений, хоча сам `generate` нікуди
# не підключається. `.env` у образ не потрапляє (див. .dockerignore), тож підставляємо завідомо
# непрацездатну адресу: справжніх креденшелів у шарах образу бути не повинно.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:1/none"

RUN bunx prisma generate

# NEXT_PUBLIC_* Next вшиває в клієнтський бандл під час збірки — підставити їх у рантаймі вже
# неможливо, скільки б їх не було в env-файлі контейнера. Без цього One Tap їде в Google з
# client_id=undefined і мовчки не працює: серверний вхід при цьому цілий, тож помітно не одразу.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Порожнє значення дає зламаний One Tap у цілком «успішній» збірці. Краще впасти тут.
RUN test -n "$NEXT_PUBLIC_GOOGLE_CLIENT_ID" \
  || { echo "ВІДМОВА: порожній NEXT_PUBLIC_GOOGLE_CLIENT_ID — One Tap збереться зламаним"; exit 1; }

# Те саме й з тієї ж причини: клієнтський Sentry ініціалізується з NEXT_PUBLIC_SENTRY_DSN,
# і в рантаймі це значення підставити вже нічим. Серверна половина при цьому працювала б
# (вона читає SENTRY_DSN з char.env) — тобто помилки з браузера мовчки зникали б, а панель
# виглядала б живою. Мовчазно зламаний моніторинг гірший за відсутній.
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN test -n "$NEXT_PUBLIC_SENTRY_DSN" \
  || { echo "ВІДМОВА: порожній NEXT_PUBLIC_SENTRY_DSN — клієнтські помилки нікуди не поїдуть"; exit 1; }

# Та сама пастка з тієї ж причини: PostHog тут лише клієнтський (persistence: memory, без
# autocapture — docs/MONITORING.md), обидві змінні читаються в браузері з NEXT_PUBLIC_*.
# Порожнє значення дало б цілком «успішну» збірку, яка мовчки нікуди не шле продуктові події.
ARG NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY

RUN test -n "$NEXT_PUBLIC_POSTHOG_KEY" \
  || { echo "ВІДМОВА: порожній NEXT_PUBLIC_POSTHOG_KEY — продуктові події нікуди не поїдуть"; exit 1; }

ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

RUN test -n "$NEXT_PUBLIC_POSTHOG_HOST" \
  || { echo "ВІДМОВА: порожній NEXT_PUBLIC_POSTHOG_HOST — продуктові події нікуди не поїдуть"; exit 1; }

# Типи перевіряє джоба checks (`tsc --noEmit`), і деплой без неї не йде — тут це дубль.
ENV SKIP_BUILD_TYPECHECK=1

# Саме `next build`, а не `bun run build`: другий тягне prebuild -> generate:content, який
# пішов би в базу й перезаписав каталоги, що приїхали з git.
RUN bunx next build

# Рантайм — той самий node:22-bookworm-slim, тобто вже завантажені шари, без другого пулу.
FROM node:22-bookworm-slim AS runner

# chromium — для експорту PDF. Шрифти не опційні: без них кирилиця рендериться квадратами,
# і помітно це лише тоді, коли хтось натисне «експорт». Саме цей клас поломок і має закрити
# контейнеризація — на VPS Chromium стоїть руками й ніде не записаний.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-dejavu-core \
      fonts-liberation \
      ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# PUPPETEER_USE_SPARTICUZ навмисно не виставляється: у контейнері браузер уже системний,
# із зафіксованою версією. @sparticuz/chromium лишається для середовищ на кшталт Vercel.

WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

USER node
EXPOSE 3000
CMD ["node", "server.js"]
