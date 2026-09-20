#!/usr/bin/env bash
#
# `bun run test:integration [-- файли…]`: інтеграційний прогін і гейт тривалості файлів після
# нього. Окремим скриптом, бо `bun run` дописує аргументи в кінець усього рядка, і у ланцюжку
# `vitest … && check` фільтр файлів потрапив би до перевірки, а не до vitest.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

vitest run --config vitest.integration.config.mts "$@"
bun tsx scripts/check-test-file-durations.ts .vitest/file-durations.json
