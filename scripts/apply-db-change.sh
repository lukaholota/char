#!/usr/bin/env bash
#
# Застосовує файл із db/changes/ до НЕвиробничої бази.
#
#   scripts/apply-db-change.sh db/changes/2026-08-24-kr17.3-spell-source-enum-values.sql
#   scripts/apply-db-change.sh <file.sql> --env .env.test
#
# Прод цим скриптом недосяжний: ціль читається з .env.test і мусить мати суфікс
# _test / _staging / _dev / _scratch. Робочу базу власник застосовує сам (Р2).
#
# Навіщо: DDL, застосований лише до робочої бази, лишає клон дрейфувати, і сід падає
# на P2007 через тижні. Синк клона — робота того, хто з клоном працює.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/pg.sh

SQL_PATH="${1:-}"
ENV_FILE=".env.test"

shift || true
while (( $# )); do
  case "$1" in
    --env) ENV_FILE="${2:?--env потребує шлях}"; shift 2 ;;
    *) echo "невідомий аргумент: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$SQL_PATH" ]]; then
  echo "usage: $0 <file.sql> [--env .env.test]" >&2
  exit 1
fi

[[ -f "$SQL_PATH" ]] || { echo "ВІДМОВА: немає файлу $SQL_PATH" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "ВІДМОВА: немає $ENV_FILE" >&2; exit 1; }

set -a; source "$ENV_FILE"; set +a
TARGET_URL="${DATABASE_URL:?У $ENV_FILE немає DATABASE_URL}"
TARGET_DB=$(find_db_name "$TARGET_URL")

case "$TARGET_DB" in
  *_test | *_staging | *_dev | *_scratch) ;;
  *)
    echo "ВІДМОВА: '$TARGET_DB' не закінчується на _test / _staging / _dev / _scratch." >&2
    echo "Робочу базу цим скриптом не чіпають — її застосовує власник." >&2
    exit 1
    ;;
esac

PSQL=$(require_client_binary psql 16)

echo "→ $SQL_PATH  ⇒  базa \"$TARGET_DB\""
"$PSQL" "$(build_pg_url "$TARGET_URL")" -v ON_ERROR_STOP=1 -f "$SQL_PATH"
echo "✓ застосовано"
