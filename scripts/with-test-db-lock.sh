#!/usr/bin/env bash
#
# Пускає лише один прогін тестів за раз на всю машину. Тести роблять
# `TRUNCATE … CASCADE` у spells_test (tests/user-data.ts), тож дві паралельні сесії
# витирають одна одній фікстури й дають фальшиву червону збірку.
#
#   ./scripts/with-test-db-lock.sh vitest run
#
# Замок — тека в TMPDIR. Знімається у trap; покинутий (процес мертвий або старший за
# TEST_DB_LOCK_STALE) прибирається наступним охочим.

set -uo pipefail

LOCK_DIR="${TEST_DB_LOCK_DIR:-${TMPDIR:-/tmp}/spells-test-db.lock}"
WAIT_TIMEOUT_SECONDS="${TEST_DB_LOCK_TIMEOUT:-1800}"
STALE_SECONDS="${TEST_DB_LOCK_STALE:-1800}"
CLAIM_GRACE_SECONDS=10

if [ $# -eq 0 ]; then
  echo "вкажи команду: ./scripts/with-test-db-lock.sh vitest run" >&2
  exit 2
fi

if [ -n "${TEST_DB_LOCK_HELD:-}" ]; then
  exec "$@"
fi

find_modified_at() {
  stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0
}

find_lock_age() {
  echo $(( $(date +%s) - $(find_modified_at "$LOCK_DIR") ))
}

is_lock_alive() {
  local pid age
  age="$(find_lock_age)"
  pid="$(cat "$LOCK_DIR/pid" 2>/dev/null)"

  # Щойно створена тека ще не встигла отримати pid — це не покинутий замок.
  [ -z "$pid" ] && [ "$age" -lt "$CLAIM_GRACE_SECONDS" ] && return 0

  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  [ "$age" -lt "$STALE_SECONDS" ]
}

acquire_lock() {
  local waited=0 announced=0
  until mkdir "$LOCK_DIR" 2>/dev/null; do
    if ! is_lock_alive; then
      rm -rf "$LOCK_DIR"
      continue
    fi
    if [ "$announced" -eq 0 ]; then
      echo "⏳ чекаю на spells_test — тести вже крутить pid $(cat "$LOCK_DIR/pid" 2>/dev/null)" >&2
      announced=1
    fi
    if [ "$waited" -ge "$WAIT_TIMEOUT_SECONDS" ]; then
      echo "✖ не дочекався замка на spells_test за ${WAIT_TIMEOUT_SECONDS}с: $LOCK_DIR" >&2
      exit 1
    fi
    sleep 2
    waited=$(( waited + 2 ))
  done
  echo $$ > "$LOCK_DIR/pid"
}

release_lock() {
  rm -rf "$LOCK_DIR"
}

acquire_lock
trap release_lock EXIT INT TERM

TEST_DB_LOCK_HELD=1 "$@"
status=$?

trap - EXIT INT TERM
release_lock
exit $status
