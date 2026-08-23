#!/usr/bin/env bash
# Проганяє N партій KR12.3 підряд, кожну — окремим headless-запуском із чистим контекстом.
# Спиняється на першій партії, що лишила збірку червоною або полізла у чужі файли.
#
#   ./scripts/aidedd/run-batches.sh 4
#
# Нічого не комітить і не пушить. Логи — у logs/kr12.3/.
#
# Чужі файли рахуються з того, що агент реально редагував (його ж tool-виклики у stream-json),
# а не з `git status`: у репо паралельно працюють інші сесії, і їхні правки дифом від наших не
# відрізнити. Смуга партії — ALLOWED_PATHS у scripts/aidedd/review-batch-run.ts.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# macOS засинає посеред довгого прогону і рве відповідь агента на півслові.
if [ -z "${BATCHES_CAFFEINATED:-}" ] && command -v caffeinate >/dev/null 2>&1; then
  export BATCHES_CAFFEINATED=1
  exec caffeinate -dims "$0" "$@"
fi

BATCHES="${1:-1}"
PROMPT="prompts/kr12.3-batch.md"
LOG_DIR="logs/kr12.3"

mkdir -p "$LOG_DIR"

./scripts/db-tunnel.sh --status >/dev/null 2>&1 || ./scripts/db-tunnel.sh || {
  echo "не піднявся тунель до spells_test — БД-тести падатимуть таймаутом"
  exit 1
}

for run in $(seq 1 "$BATCHES"); do
  stamp="$(date +%Y%m%d-%H%M%S)"
  log="$LOG_DIR/$stamp.log"
  events="$LOG_DIR/$stamp.jsonl"

  echo "▶ прогін $run/$BATCHES → $log"
  claude -p "$(cat "$PROMPT")" --permission-mode acceptEdits \
    --output-format stream-json --verbose > "$events" 2>> "$log"
  claude_status=$?

  if [ $claude_status -ne 0 ]; then
    echo "✖ прогін $run: агент вийшов з кодом $claude_status — стоп"
    exit 1
  fi

  if ! bun scripts/aidedd/review-batch-run.ts "$events" >> "$log" 2> >(tee -a "$log" >&2); then
    echo "✖ прогін $run: агент вийшов за смугу партії — стоп, дивись $log"
    exit 1
  fi

  if ! bun run test >> "$log" 2>&1; then
    echo "✖ прогін $run: збірка червона — стоп, дивись $log"
    exit 1
  fi

  translated="$(bun -e 'const m=require("./data/aidedd/import-manifest.json");console.log(m.filter(r=>r.edition==="RULES_2014"&&r.status==="translated").length)')"

  # Порожній прогін виходить нулем так само, як зроблений: агент чесно каже «партії немає» і
  # спиняється. Без цієї перевірки решта циклу крутиться вхолосту й малює фальшиві галочки.
  if [ "$translated" = "${translated_before:-}" ]; then
    echo "✖ прогін $run: нічого не додалося ($translated) — черга порожня або агент нічого не зробив, стоп"
    exit 1
  fi
  translated_before="$translated"

  echo "✔ прогін $run: перекладено разом $translated із 934"
done

echo
echo "Питання, що чекають на відповідь:"
# Рахуються лише розділи без рядка «Рішення:» — решта закриті або позначені «не потрібне».
bun -e '
const text = require("node:fs").readFileSync("docs/o12-srd-2024-import/questions.md", "utf8");
const open = text
  .split(/^## /m)
  .slice(1)
  .filter((s) => !/\*\*Рішення:/.test(s))
  .filter((s) => !/не потрібне|закрито|вирішено/.test(s.split("\n")[0]));
console.log(open.length);
' 2>/dev/null || echo "?"
echo "Огляд: git diff --stat && bun run scripts/aidedd/scan-batch.ts --glossary"
