#!/usr/bin/env bash
#
# Смоук після деплою: чи живий застосунок на публічних маршрутах.
#
# Перевіряє рівно три речі — процес піднявся, Next віддає сторінку, запит у Postgres
# проходить. Правильність вмісту не перевіряється взагалі; це предмет O2 і O3.
#
#   ./scripts/smoke.sh https://char.holota.family

set -euo pipefail

BASE_URL="${1:-${SMOKE_BASE_URL:-}}"
: "${BASE_URL:?Не задано базовий URL — перший аргумент або SMOKE_BASE_URL}"
BASE_URL="${BASE_URL%/}"

# Сторінкові маршрути базу НЕ перевіряють, хоч і виглядають так. Перевірено 2026-08-09:
# контейнер зі свідомо зламаним DATABASE_URL віддав 200 на всіх трьох, бо `/spells` і
# `/magic-items` читають згенеровані spells.json / magicItems.json, а `/` до бази не ходить.
# Саме тому доданий `/api/health` — він робить `SELECT 1` і віддає 503, коли бази немає.
#
# Обидві редакції: конструктор і каталоги 2024 ідуть у реліз, тож без них контейнер, де половина
# сайту віддає 500, пройшов би смоук і зняв би старий контейнер (KR31.11).
ROUTES=(/ /api/health /spells /magic-items /char/create /2024 /2024/char /2024/spells /2024/classes)

BOOT_ATTEMPTS="${SMOKE_BOOT_ATTEMPTS:-10}"
BOOT_DELAY_SECONDS="${SMOKE_BOOT_DELAY_SECONDS:-6}"
REQUEST_TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-25}"

# Сторінки віддаються з Cache-Control: s-maxage=31536000. Кеша перед застосунком зараз немає,
# але якщо колись з'явиться (proxy_cache у nginx, CDN), смоук почав би читати кеш і показувати
# 200 на мертвому застосунку. Унікальний параметр дає промах кеша й гарантує похід у процес.
CACHE_BUSTER="smoke=$(date +%s)-$$"

find_status_code() {
  curl --silent --show-error --location \
    --output /dev/null --write-out '%{http_code}' \
    --max-time "$REQUEST_TIMEOUT_SECONDS" \
    "$1" || true
}

build_url() {
  echo "$BASE_URL$1?$CACHE_BUSTER"
}

wait_until_service_answers() {
  local url attempt=1 code
  url=$(build_url "${ROUTES[0]}")
  while [ "$attempt" -le "$BOOT_ATTEMPTS" ]; do
    code=$(find_status_code "$url")
    if [ "$code" = "200" ]; then
      echo "  ✓ $url — 200 (спроба $attempt)"
      return 0
    fi
    echo "  … $url — $code (спроба $attempt з $BOOT_ATTEMPTS)"
    if [ "$attempt" -lt "$BOOT_ATTEMPTS" ]; then
      sleep "$BOOT_DELAY_SECONDS"
    fi
    attempt=$((attempt + 1))
  done
  echo "  ✗ $url не відповів 200 за $BOOT_ATTEMPTS спроб — сервіс не піднявся"
  return 1
}

check_remaining_routes() {
  local failed=0 code url
  for route in "${ROUTES[@]:1}"; do
    url=$(build_url "$route")
    code=$(find_status_code "$url")
    if [ "$code" = "200" ]; then
      echo "  ✓ $url — 200"
    else
      echo "  ✗ $url — $code"
      failed=$((failed + 1))
    fi
  done
  return "$failed"
}

run_smoke() {
  echo "смоук проти $BASE_URL — ${#ROUTES[@]} маршрутів"
  if ! wait_until_service_answers; then
    echo "смоук червоний: застосунок не відповідає"
    return 1
  fi
  if ! check_remaining_routes; then
    echo "смоук червоний: маршрут(и) не віддали 200"
    return 1
  fi
  echo "смоук зелений: ${#ROUTES[@]} з ${#ROUTES[@]}"
}

run_smoke
