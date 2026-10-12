# RPGbot — початкова інвентаризація character optimization

**Вимір:** 2026-09-28. Продуктовий план — [O49](../../o49-rpgbot-analysis/README.md).
Артефакт — [inventory.json](inventory.json). Скрипт повторного виміру —
[collect-inventory.py](collect-inventory.py).

## Метод

Прямі read-only HTTP-запити: `robots.txt`, `sitemap.xml`, п’ять page/post sitemap,
дев’ять індексів (`dnd5/characters`, його classes/races/feats/spells та
`2024-dnd`, його classes/species/feats). Два одночасні запити максимум.
З HTML тимчасово прочитаних індексів взяті title й посилання всередині `<article>`;
повні HTML та аналітичні тексти не збережені. Категорійні/tag sitemap не обходили.

З sitemap взяті URL і lastmod; edition candidate виведений із URL-префікса.
Префікси 2024 classes/species/feats/backgrounds/spells/magic-items віднесено до core,
решту 2024 — review. Це технічна класифікація, не завершене редакційне рішення.
HTTP status 200 підтверджений лише для дев’яти fetched indexes.

## Результат і межі

- 351 кандидат 2014 усередині `/dnd5/characters/`.
- 120 основних кандидатів 2024 і 8 URL 2024 для перевірки змісту.
- 18 кандидатів `/dnd5/` поза коренями, знайдених у посиланнях індексів.
- П’ять sitemap і дев’ять індексів прочитані без помилок.

Це карта URL, не готовий corpus. Індекси, aliases, redirects і міжредакційні посилання
ще потребують перевірки; всі article links рекурсивно не обходили. Word count, actual
article count, ratings, source authors, переклади й entity bindings не збирали.
Інвентар не доводить повноту чи доступність кожної майбутньої статті.

`robots.txt` містив загальне `Allow: /` для використаного агента; його копія й UA
збережені в артефакті. Правила сайтів перевіряються знову при кожному запуску.
Дозвіл краулера не є підтвердженням права на перевидання/переклад текстів.

Повторний запуск: `python3 docs/research/rpgbot/collect-inventory.py` з кореня repo.
Команда використовує мережу й **перезаписує inventory.json** новим датованим виміром;
перед запуском пояснити її ефект і зберегти потрібний історичний зріз окремо.
Для повного manifest і source ingestion потрібен інший, розширений tooling у KR49.1–49.3.


## Перевірений реєстр KR49.1 — 2026-09-29

Початковий `inventory.json` не змінений; його побайтна датована копія —
[inventory-2026-09-28.json](inventory-2026-09-28.json). Розширений collector не запускає
старий скрипт і не перезаписує початковий інвентар.

[Manifest](../../../data/rpgbot/manifest.json): 700 candidate URL, 638 source records,
62 aliases; included 415 (289 лише 2014 / 124 лише 2024 / 2 shared), excluded 160, review 63.
[Покриття й усі unresolved](../../../data/rpgbot/manifest.coverage.md),
[структурований звіт](../../../data/rpgbot/manifest.coverage.json),
[metadata snapshot](observations.json), [команди й scope policy](MANIFEST-TOOLING.md).

20 fixtures/tests — PASS; replay з цього snapshot без мережі побайтно тотожний manifest,
окремий diff порожній. Повні тексти не збережені, текстові метрики unknown. Review
не є частиною verified included corpus; повнотекстовий імпорт та переклад ще не виконані.


Додаткова перевірка всіх 69 попередніх review: [матриця](review-results-2026-09-29.md),
[results JSON](review-results-2026-09-29.json), [metadata audit](review-audit-2026-09-29.json).
Чотири записи included, два excluded, 63 лишаються review з явною причиною.
