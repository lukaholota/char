#!/usr/bin/env bash
#
# Клонує базу з DATABASE_URL у другу базу на тому ж сервері.
#
#   scripts/db-clone.sh spells_test              # схема + контент, без даних користувачів
#   scripts/db-clone.sh spells_staging full      # усе, включно з персонажами
#   scripts/db-clone.sh spells_scratch schema    # тільки структура
#
# Цільова база завжди перестворюється з нуля.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/pg.sh
load_dotenv

SOURCE_URL="${DATABASE_URL:?DATABASE_URL не заданий — перевір .env}"
TARGET_DB="${1:-}"
MODE="${2:-content}"
JOBS="${DB_CLONE_JOBS:-4}"

if [[ -z "$TARGET_DB" ]]; then
  echo "usage: $0 <target-db> [content|full|schema]" >&2
  exit 1
fi

# Запобіжник: цільова база мусить мати суфікс. Прод перезаписати неможливо.
case "$TARGET_DB" in
  *_test | *_staging | *_dev | *_scratch) ;;
  *)
    echo "ВІДМОВА: '$TARGET_DB' не закінчується на _test / _staging / _dev / _scratch." >&2
    echo "Це навмисно — щоб неможливо було затерти прод." >&2
    exit 1
    ;;
esac

build_url() { build_pg_url "$SOURCE_URL" "${1:-}"; }

SOURCE_DB=$(find_db_name "$SOURCE_URL")
SRC_URL=$(build_url "")
DST_URL=$(build_url "$TARGET_DB")
ADMIN_URL=$(build_url "postgres")

if [[ "$SOURCE_DB" == "$TARGET_DB" ]]; then
  echo "ВІДМОВА: джерело і ціль — одна й та сама база ($SOURCE_DB)." >&2
  exit 1
fi

# Старіший клієнт проти новішого сервера мовчки дає неповний дамп.
SERVER_MAJOR=$(find_server_major "$SRC_URL")
PG_DUMP=$(require_client_binary pg_dump "$SERVER_MAJOR")
PG_RESTORE=$(require_client_binary pg_restore "$SERVER_MAJOR")
PSQL=$(require_client_binary psql "$SERVER_MAJOR")

echo "$SOURCE_DB → $TARGET_DB (режим: $MODE)"

dump_args=(--no-owner --no-acl --format=custom)
case "$MODE" in
  full) ;;
  schema) dump_args+=(--schema-only) ;;
  content)
    # Друкуємо список навмисно: якщо колись з'явиться контентна таблиця з посиланням на
    # user (умовний homebrew, створений користувачем), вона теж потрапить сюди — і це
    # має бути видно одразу, а не виявитись через порожню таблицю в тестах.
    echo "  без даних користувача:"
    while IFS= read -r table; do
      [[ -n "$table" ]] || continue
      dump_args+=(--exclude-table-data="$table")
      echo "    $table"
    done < <(list_user_data_tables "$PSQL" "$SRC_URL")
    ;;
  *)
    echo "Невідомий режим '$MODE'. Доступні: content, full, schema." >&2
    exit 1
    ;;
esac

dump_file=$(mktemp -t spells-clone-XXXXXX)
trap 'rm -f "$dump_file"' EXIT

echo "  дамп…"
"$PG_DUMP" "${dump_args[@]}" --file="$dump_file" "$SRC_URL"

# Локаль і власника беремо з бази-джерела, а не з дефолтів кластера. На Hetzner дефолт
# кластера `C.utf8`, а прод на `en_US.utf8` — голий CREATE DATABASE дав би копію, яка
# сортує українські назви інакше, ніж прод. Тести на такій копії перевіряли б не той
# порядок, який бачить користувач, і мовчали б саме там, де мали б кричати.
find_source_database_shape() {
  "$PSQL" "$ADMIN_URL" -tA -F'|' -c \
    "SELECT pg_get_userbyid(datdba), datlocprovider, datcollate, datctype,
            pg_encoding_to_char(encoding)
       FROM pg_database WHERE datname = '$SOURCE_DB';"
}

IFS='|' read -r SRC_OWNER SRC_PROVIDER SRC_COLLATE SRC_CTYPE SRC_ENCODING \
  < <(find_source_database_shape)

if [[ "$SRC_PROVIDER" != "c" ]]; then
  echo "ВІДМОВА: джерело використовує провайдер локалі '$SRC_PROVIDER', а не libc." >&2
  echo "Відтворити такий клон цей скрипт не вміє — доробити перед використанням." >&2
  exit 1
fi

echo "  перестворення бази (власник $SRC_OWNER, локаль $SRC_COLLATE)…"
"$PSQL" "$ADMIN_URL" -v ON_ERROR_STOP=1 -q <<SQL
SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
 WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "$TARGET_DB";
CREATE DATABASE "$TARGET_DB" OWNER "$SRC_OWNER" TEMPLATE template0
  LOCALE_PROVIDER libc LC_COLLATE '$SRC_COLLATE' LC_CTYPE '$SRC_CTYPE'
  ENCODING '$SRC_ENCODING';
SQL

echo "  відновлення…"
"$PG_RESTORE" --no-owner --no-acl --jobs="$JOBS" --dbname="$DST_URL" "$dump_file"

# `--no-owner` робить власником об'єктів того, хто підключився. А підключитись мусить роль
# із CREATEDB, тобто зазвичай суперюзер. Виходить база, що належить одному, і таблиці, що
# належать іншому: роль застосунку бачить їх, але не має прав. Ловиться це не тут, а через
# кілька кроків — падінням тестів на TRUNCATE з `permission denied`.
CLONE_ROLE=$("$PSQL" "$DST_URL" -tAc 'SELECT current_user')
if [[ "$CLONE_ROLE" != "$SRC_OWNER" ]]; then
  echo "  передача власності: $CLONE_ROLE → $SRC_OWNER"
  # Не `REASSIGN OWNED BY`: він відмовляється віддавати об'єкти бутстрап-суперюзера,
  # бо частину з них вважає системними, і падає цілком. Тому поштучно.
  "$PSQL" "$DST_URL" -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$
DECLARE cmd text;
BEGIN
  FOR cmd IN
    SELECT format('ALTER TABLE %I.%I OWNER TO %I', schemaname, tablename, '$SRC_OWNER')
      FROM pg_tables WHERE schemaname = 'public'
    UNION ALL
    SELECT format('ALTER SEQUENCE %I.%I OWNER TO %I', schemaname, sequencename, '$SRC_OWNER')
      FROM pg_sequences WHERE schemaname = 'public'
    UNION ALL
    SELECT format('ALTER VIEW %I.%I OWNER TO %I', schemaname, viewname, '$SRC_OWNER')
      FROM pg_views WHERE schemaname = 'public'
    UNION ALL
    SELECT format('ALTER TYPE %I.%I OWNER TO %I', n.nspname, t.typname, '$SRC_OWNER')
      FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typtype = 'e'
  LOOP
    EXECUTE cmd;
  END LOOP;
END \$\$;
SQL
fi

echo
"$PSQL" "$DST_URL" -tAc "
  SELECT relname || ': ' || n_live_tup
    FROM pg_stat_user_tables
   WHERE n_live_tup > 0
   ORDER BY n_live_tup DESC
   LIMIT 12;
" | sed 's/^/  /'

echo
echo "Готово. DATABASE_URL для цієї бази:"
echo "  $(build_url "$TARGET_DB" | sed -E 's#://([^:]+):[^@]+@#://\1:***@#')"
