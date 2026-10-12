# QA-bootstrap: неправильний редирект, 2026-10-03

Власник попросив перевірити Sentry через `ERR_TUNNEL_CONNECTION_FAILED` у ChatGPT Work
cloud browser при відкритті `https://char.holota.family/qa-sign-in`.

## Перевірено наживо

- GET production `/qa-sign-in` без cookie, з вимкненим автоматичним переходом:
  **307**, `Location: https://0.0.0.0:3000/char`, заголовок `Set-Cookie` присутній.
  Значення cookie не виводилося й не зберігалося.
- Адреса переходу вказує на внутрішній origin контейнера. Це підтверджений дефект
  production і пояснює збій cloud browser після bootstrap. Сам cloud browser у цій
  сесії не перевірявся; стан його QA-сесії не встановлено.
- Sentry API `de.sentry.io`, проєкт `char-da/javascript-nextjs`: читання issue успішне
  (200), пошук `qa-sign-in` із `statsPeriod=14d` повернув `[]`.
  Відсутність issue не доводить відсутність дефекту: неправильний HTTP-редирект
  не потребує винятку в застосунку.
- Свіжий список issue також містить `OfflineActionError`, N+1 та старі Server Action
  errors; зв'язок цих issue з QA-bootstrap не встановлено.

## Наявна правка та наступна перевірка

У спільному робочому дереві **до початку діагностики** вже були зміни
`src/app/qa-sign-in/route.ts` і `tests/routes/qa-sign-in.test.ts`: абсолютну адресу
редиректу замінено на відносний `Location: /char`; тест використовує внутрішній
origin `https://0.0.0.0:3000` і очікує `/char`.

Правки не змінювалися, тести в цій діагностиці не запускалися, пушу чи деплою не було.
На момент прямої перевірки production усе ще віддавав неправильну абсолютну адресу.
Після авторизованого деплою перевірити `Location: /char`, а потім новий запуск QA
у ChatGPT Work з початковим відкриттям `/qa-sign-in`.

## Деплой за окремим дорученням власника

Власник дозволив задеплоїти саме цю правку без решти незакомічених змін.
Створено окремий клон у `/tmp/holota-qa-redirect-deploy-20261003`, на актуальний
`origin/main` перенесено лише маршрут і тест. Спільне робоче дерево не змінювалося.

- Коміт `439bea8d3268d470cf90ca164a92c90ba1bf1bd1` містить рівно два файли:
  `src/app/qa-sign-in/route.ts`, `tests/routes/qa-sign-in.test.ts`.
- Локально: тест маршруту 5/5, UI guard, DB boundary, TypeScript і lint успішні
  (наявні попередження поза правкою). Default suite: 442 файли, 3320 тестів,
  один skipped; rules coverage успішне. Sandbox-прогони падали через `listen EPERM`
  у smoke-тестах; повний прогін поза sandbox успішний, із чотирма воркерами.
- Пуш у `main` виконано лише з ізольованого клону.
- [GitHub Actions 37124211385](https://github.com/lukaholota/char/actions/runs/37124211385):
  checks, rules-coverage, image та deploy успішні, включно з production smoke.
- Пряма перевірка після деплою: `/qa-sign-in` → **307**, `Location: /char`,
  cookie присутній; `/api/auth/session` із цим cookie → **200**, QA-акаунт
  `qa-browser@char.holota.family`; `/char` → `/char/create` → **200** на
  `https://char.holota.family`.

Cookie використовувався лише в пам'яті діагностичного процесу. Персонажі не
створювалися й не змінювалися. Повторний запуск у ChatGPT Work cloud browser
залишається окремою перевіркою: цього браузера сесія не мала.
