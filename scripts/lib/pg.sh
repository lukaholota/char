# Спільне для db-clone.sh і db-dump.sh. Підключати через `source`.

# Решта проєкту читає .env через dotenv, але bun run не віддає ці змінні шелл-скриптам.
# Уже виставлене оточення має пріоритет — у CI .env немає і не потрібен.
load_dotenv() {
  [[ -n "${DATABASE_URL:-}" ]] && return 0
  [[ -f .env ]] || return 0
  set -a
  source .env
  set +a
}

# Prisma домішує до URL параметри, яких libpq не знає (schema, pool_timeout).
# psql і pg_dump на них падають, тож лишаємо тільки валідні.
build_pg_url() {
  python3 - "$1" "${2:-}" <<'PY'
import sys, urllib.parse as u

url, db = sys.argv[1], sys.argv[2]
parsed = u.urlparse(url)
libpq_params = {
    "sslmode", "sslrootcert", "sslcert", "sslkey",
    "connect_timeout", "application_name",
}
query = [(k, v) for k, v in u.parse_qsl(parsed.query) if k in libpq_params]
if db:
    parsed = parsed._replace(path="/" + db)
print(u.urlunparse(parsed._replace(query=u.urlencode(query))))
PY
}

find_db_name() {
  python3 -c 'import sys,urllib.parse as u; print(u.urlparse(sys.argv[1]).path.lstrip("/"))' "$1"
}

find_server_major() {
  psql "$1" -tAc 'SHOW server_version' | cut -d. -f1
}

find_client_major() {
  "$1" --version | grep -oE '[0-9]+' | head -1
}

# Старіший клієнт проти новішого сервера дає неповний дамп або падає.
# На машині може стояти кілька версій, і потрібна не завжди в PATH.
# Без конвеєра: `... | head -1` під `set -o pipefail` дає ненульовий код через SIGPIPE
# і валить скрипт навіть тоді, коли бінарник знайдено.
find_client_binary() {
  local name="$1" min_major="$2" candidate candidates

  candidates=$(
    command -v "$name" 2>/dev/null || true
    for base in /opt/homebrew/opt /usr/local/opt /Applications/Postgres.app/Contents/Versions; do
      [[ -d "$base" ]] || continue
      for dir in "$base"/*; do
        [[ -x "$dir/bin/$name" ]] && printf '%s\n' "$dir/bin/$name"
      done
    done
    true
  )

  while IFS= read -r candidate; do
    [[ -n "$candidate" && -x "$candidate" ]] || continue
    if (( $(find_client_major "$candidate") >= min_major )); then
      printf '%s\n' "$candidate"
      return 0
    fi
  done <<< "$candidates"

  return 1
}

require_client_binary() {
  local name="$1" min_major="$2" found
  if ! found=$(find_client_binary "$name" "$min_major"); then
    echo "ВІДМОВА: не знайдено $name версії $min_major або новішої." >&2
    echo "Постав клієнт: brew install postgresql@${min_major}" >&2
    return 1
  fi
  printf '%s\n' "$found"
}

# Дані користувача — pers / user / account і все, що на них транзитивно посилається.
# Список рахується з бази, а не ведеться руками: писаний руками перелік пропускав неявні
# m2m-таблиці Prisma (`_PersToSpell`, `_ChoiceOptionToPers` — вони не підпадають під `pers*`).
# Той самий запит, що в tests/user-data.ts — розходитися їм не можна.
list_user_data_tables() {
  local psql_bin="$1" url="$2"
  "$psql_bin" "$url" -tA <<'SQL'
WITH RECURSIVE user_data(oid) AS (
  SELECT c.oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relname IN ('pers', 'user', 'account')
  UNION
  SELECT con.conrelid
    FROM pg_constraint con
    JOIN user_data u ON con.confrelid = u.oid
   WHERE con.contype = 'f'
)
SELECT format('public.%I', c.relname)
  FROM user_data u
  JOIN pg_class c ON c.oid = u.oid
 ORDER BY 1;
SQL
}
