# Корекції витягу

Початкові `staging/*.json` незмінні. `index.json` указує активну корекцію для
конкретної source revision; файл корекції містить повний AST, `correctionOf`,
той самий hash сирого HTML й той самий revision ID. Похідний `contentHash`
може змінитися, якщо новий extractor інакше вилучає навігацію. `coverage.ts`
перевіряє ці звʼязки перед заміною витягу в ledger.

`bun scripts/rpgbot/reextract-corrections.ts` показує preview; `--apply`
додає immutable файли й оновлює індекс. Повторний preview має `pending: 0`.
Накладка виправляє машинний витяг, але не означає редакторську перевірку тексту,
оцінок або перекладу.

Стан 2026-09-30: індекс містить 17 накладок для всіх історичних
`text-coverage-review`. Повторний preview має `fixed: 17`, `unresolved: 0`,
`pending: 0`. Аномальні структури HTML лишають окремі review issues.
