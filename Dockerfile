# syntax=docker/dockerfile:1

# Збірці ПОТРІБНА жива база. Це не припущення: спроба зібрати з недосяжною адресою
# (порт 1 на localhost) впала на `next build` з P1001 — сторінка /char пререндериться
# на етапі збірки й викликає prisma.race.findMany(). Так само поводиться і поточний
# деплой у GitHub Actions, який збирає проти прод-бази.
#
# Тому DATABASE_URL подається як BuildKit-секрет і монтується лише на час команди —
# у шарах образу він не осідає. Збирати достатньо проти будь-якої бази з тим самим
# контентом: spells_test підходить, ходити в прод заради збірки не обов'язково.
#
#   bun run generate:content
#   docker build --secret id=database_url,env=DATABASE_URL -t char:local .

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

# Ці вісім JSON у .gitignore і генеруються з бази. Без них збірка падає на TS2307 десь
# усередині Next — краще впасти тут із текстом, який каже, що робити.
RUN for f in spells magicItems feats backgrounds armor weapons infusions invocations; do \
      test -s "src/lib/generated/$f.json" \
        || { echo "ВІДМОВА: немає src/lib/generated/$f.json — спершу 'bun run generate:content'"; exit 1; }; \
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

# Саме `next build`, а не `bun run build`: другий тягне prebuild -> generate:spells, який
# перезаписав би spells.json і вимагав би базу ще й для цього.
# Секрет підставляється інлайном і перекриває заглушку вище лише на час цієї команди.
RUN --mount=type=secret,id=database_url \
    DATABASE_URL="$(cat /run/secrets/database_url)" bunx next build

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
