# KR4.1 — Виміряти й поставити guard для UI-декомпозиції

**Ціль:** [O4](README.md) · **Статус:** ✅ зроблено 2026-08-15 · **Залежить від:** O3

## Scope

`jscpd@4.0.5` додано як dev-залежність. `bun run check:ui-decomposition` є exact CI command
і запускається в `rules-coverage` job до coverage. Він друкує один JSON-документ, тому список
`violations` придатний для машинного читання. Checker не переносить UI-код і не створює shared
components.

## Baseline

| Метрика                 |                                Baseline | Guard                                                                                                                                                                   |
| ----------------------- | --------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.tsx`                  |                                     137 | scanner читає весь `src`                                                                                                                                                |
| `.tsx` понад 400 рядків |                                      19 | ceiling 400; рівно 19 historical paths у `config/ui-decomposition-guard.json` мають exact current ceiling, тож збільшення або новий файл падає                          |
| JSX nesting             |                max 14 (`spells-client`) | TypeScript AST; baseline ceiling 14, тож більша nesting падає; ціль ≤4 лишається KR4.4                                                                                  |
| UI clones               | 4 pairs, 235 lines, 0.74% (189 sources) | `jscpd` для всіх production UI roots: `src/app`, `src/components`, `src/lib/components`; `tsx`, ≥40 lines / ≥200 tokens; нова pair або збільшення історичної pair падає |

Короткий clone allowlist (обидва owner `KR4.3`, added 2026-08-15):

- `BackgroundFeatsForm.tsx` ↔ `FeatsForm.tsx`, максимум 119 сумарних clone-lines (records 53 і 66).
- `src/components/ui/dialog.tsx` ↔ `src/lib/components/ui/dialog.tsx`, максимум 120 сумарних clone-lines (records 50 і 70).

Report показує 235 duplicated lines через overlap records.

## Готово, коли

- [x] report відтворювано показує clone pairs, рядки та відсоток; baseline записаний у журналі.
- [x] CI падає лише на новому/збільшеному клоні або розширеному allowlist, а не на історичному боргу.
- [x] AST-check показує `.tsx > 400` і JSX nesting; його output є частиною CI.
- [x] Єдиний clone candidate записаний нижче; він **не** переходить у KR4.3 без двох реальних consumers, cosmetic similarity не рахується.

## Proof і стримування ризику

Навмисно внести малий дубльований fixture/фрагмент у test-fixture для controlled-red, побачити
падіння scanner-а, прибрати його. Перевірити, що report стабільний на незміненому дереві.
Ризик — шум і CI, який блокує легітимний код; стримування: зафіксована версія scanner-а,
явні пороги, короткий allowlist з owner/датою, жодних blanket exclusions.

## Журнал

2026-08-15 — план створено після O3. Baseline знято read-only; scanner ще не встановлено.

2026-08-15 — додано `jscpd@4.0.5`, `config/ui-decomposition-guard.json` і
`scripts/check-ui-decomposition.ts`. jscpd з параметрами `tsx`, ≥40 lines / ≥200 tokens у
`src/app`, `src/components` і `src/lib/components` стабільно дав 4 records, 235 duplicated lines
(0.74% у 189 sources). Вони зведені до двох allowlisted pairs із точними ceilings 119 і 120
sum-of-pair-lines. Allowlist не виключає папок чи файлів: він зберігає лише pair і її exact
ceiling, тому новий pair або збільшення pair блокує CI.

AST scanner на всьому `src` дав 137 `.tsx`, 19 понад 400 рядків, максимум 2 263 рядки й JSX
nesting 14 у `spells-client`. Для 19 legacy size-files записані точні ceilings; nesting має
baseline ceiling 14. Output завжди JSON із `violations`, а зелене дерево має порожній масив.

Controlled-red: додано два ізольовані тимчасові files під
`tests/fixtures/ui-decomposition-red/`, по 47 рядків із однаковим JSX-кодом; запуск
`bun scripts/check-ui-decomposition.ts tests/fixtures/ui-decomposition-red` завершився exit 1 і
JSON `clone` violation (1 pair, 47 sum-of-pair-lines, 46 duplicated lines, 50%). Обидва fixture
після proof повністю видалено; production run знову green.

Clone candidate не є автоматичним завданням KR4.3: `FeatsForm` має реальних callers
`MultiStepForm` та `LevelUpASIForm`, але `BackgroundFeatsForm` — лише `MultiStepForm`. Вони обидва
показують вибір feat у constructor flow, але ще не доведено двох реальних consumers одного
спільного віджета. Друга pair також не стає роботою KR4.3 автоматично: `src/components/ui/dialog.tsx`
має багато реальних імпортерів, а `src/lib/components/ui/dialog.tsx` не має in-repo importers.
Спершу потрібне окреме рішення: прибрати мертвий дубль чи підтвердити два активні consumers.
Новий shared component не створювався.
