#!/usr/bin/env bash
#
# Локальний Postgres для тестів: один процес на ~10 МБ, дані в ~/.spells-test-pg17, порт 5433.
# Запит до бази на сервері коштує ~40 мс мережі, локально — менше мілісекунди; повний
# інтеграційний прогін через це 4 хв замість 11 (Р45).
#
#   scripts/local-test-db.sh start          # підняти (ідемпотентно; initdb, якщо каталогу нема)
#   scripts/local-test-db.sh stop
#   scripts/local-test-db.sh status
#   scripts/local-test-db.sh clone [spells_test]   # робоча база з .env → локально, без даних користувачів
#
# Роль і пароль беруться з DATABASE_URL у .env.test, щоб та сама адреса працювала без правок.
# Джерело клону можна підмінити: CLONE_SOURCE_URL=… scripts/local-test-db.sh clone

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/pg.sh

PG_BIN="${TEST_PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
DATA_DIR="${TEST_PG_DATA_DIR:-$HOME/.spells-test-pg17}"
PORT="${TEST_PG_PORT:-5433}"
JOBS="${DB_CLONE_JOBS:-4}"

[[ -x "$PG_BIN/pg_ctl" ]] || {
  echo "ВІДМОВА: нема $PG_BIN/pg_ctl. Постав: brew install postgresql@17" >&2
  exit 1
}

read_test_url() {
  [[ -f .env.test ]] || { echo "ВІДМОВА: нема .env.test" >&2; exit 1; }
  local url
  url=$(grep -E '^DATABASE_URL=' .env.test | head -1 | sed -E 's/^DATABASE_URL="?([^"]*)"?$/\1/')
  [[ -n "$url" ]] || { echo "ВІДМОВА: у .env.test нема DATABASE_URL" >&2; exit 1; }
  printf '%s\n' "$url"
}

url_part() {
  python3 -c 'import sys,urllib.parse as u; p=u.urlparse(sys.argv[1]); print(getattr(p, sys.argv[2]) or "")' "$1" "$2"
}

TEST_URL=$(read_test_url)
DB_USER=$(url_part "$TEST_URL" username)
DB_PASSWORD=$(python3 -c 'import sys,urllib.parse as u; print(u.unquote(u.urlparse(sys.argv[1]).password or ""))' "$TEST_URL")
LOCAL_ADMIN_URL="postgresql://$DB_USER@127.0.0.1:$PORT/postgres"

is_running() {
  "$PG_BIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1
}

init_cluster() {
  echo "  initdb → $DATA_DIR"
  "$PG_BIN/initdb" -D "$DATA_DIR" -E UTF8 --locale=en_US.UTF-8 -U "$DB_USER" --auth=trust >/dev/null
  cat >> "$DATA_DIR/postgresql.conf" <<CONF
# spells.holota.family — тестова база, її можна перезняти за пів хвилини, тому без fsync.
port = $PORT
listen_addresses = '127.0.0.1'
shared_buffers = 64MB
max_connections = 100
fsync = off
synchronous_commit = off
full_page_writes = off
logging_collector = off
CONF
}

start_cluster() {
  [[ -d "$DATA_DIR" ]] || init_cluster
  if is_running; then
    return 0
  fi
  "$PG_BIN/pg_ctl" -D "$DATA_DIR" -l "$DATA_DIR/server.log" -w start >/dev/null
  "$PG_BIN/psql" "$LOCAL_ADMIN_URL" -qc "ALTER ROLE \"$DB_USER\" WITH PASSWORD '$DB_PASSWORD' CREATEDB;"
  echo "локальний Postgres піднято на 127.0.0.1:$PORT"
}

stop_cluster() {
  is_running || { echo "локальний Postgres не запущений"; return 0; }
  "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m fast stop >/dev/null
  echo "локальний Postgres зупинено"
}

show_status() {
  if is_running; then
    echo "запущений: 127.0.0.1:$PORT, дані в $DATA_DIR"
    "$PG_BIN/psql" "$LOCAL_ADMIN_URL" -tAc \
      "SELECT '  ' || datname || ': ' || pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE datname LIKE 'spells%' ORDER BY 1"
  else
    echo "не запущений (дані в $DATA_DIR)"
  fi
}

clone_from_source() {
  local target="${1:-spells_test}"
  case "$target" in
    *_test | *_staging | *_dev | *_scratch) ;;
    *) echo "ВІДМОВА: '$target' не закінчується на _test / _staging / _dev / _scratch." >&2; exit 1 ;;
  esac

  load_dotenv
  local source_url="${CLONE_SOURCE_URL:-${DATABASE_URL:?DATABASE_URL не заданий — перевір .env}}"
  local src_url
  src_url=$(build_pg_url "$source_url" "")
  local server_major pg_dump psql pg_restore
  server_major=$(find_server_major "$src_url")
  pg_dump=$(require_client_binary pg_dump "$server_major")
  psql=$(require_client_binary psql "$server_major")
  pg_restore=$(require_client_binary pg_restore "$server_major")

  start_cluster
  echo "$(find_db_name "$source_url") → локальна $target"
  local dump_args=(--no-owner --no-acl --format=custom)
  echo "  без даних користувача:"
  while IFS= read -r table; do
    [[ -n "$table" ]] || continue
    dump_args+=(--exclude-table-data="$table")
    echo "    $table"
  done < <(list_user_data_tables "$psql" "$src_url")

  local dump_file
  dump_file=$(mktemp -t spells-local-clone-XXXXXX)
  trap "rm -f '$dump_file'" EXIT
  echo "  дамп…"
  "$pg_dump" "${dump_args[@]}" --file="$dump_file" "$src_url"

  echo "  перестворення ${target}…"
  "$PG_BIN/psql" "$LOCAL_ADMIN_URL" -v ON_ERROR_STOP=1 -q <<SQL
DROP DATABASE IF EXISTS "$target" WITH (FORCE);
CREATE DATABASE "$target" OWNER "$DB_USER";
SQL
  echo "  відновлення…"
  "$pg_restore" --no-owner --no-acl --jobs="$JOBS" --dbname="postgresql://$DB_USER@127.0.0.1:$PORT/$target" "$dump_file"

  echo
  echo "Готово. DATABASE_URL для .env.test:"
  echo "  postgresql://$DB_USER:***@127.0.0.1:$PORT/$target?schema=public"
}

case "${1:-}" in
  start) start_cluster ;;
  stop) stop_cluster ;;
  status) show_status ;;
  clone) clone_from_source "${2:-}" ;;
  *) echo "usage: $0 start|stop|status|clone [target-db]" >&2; exit 2 ;;
esac
