// `dataCollection` тут не передається свідомо. Будь-який обʼєкт у цьому полі — навіть
// порожній `{}`, який стоїть у сніпетах самого Sentry, — перемикає незадані категорії на
// дозвільні значення, тобто вмикає збір IP, кук і заголовків. Поки поле не задане, SDK
// читає `sendDefaultPii`.
//
// Пастка на майбутнє: у @sentry/nextjs v11 `sendDefaultPii` прибирають, і дефолтом стає
// `userInfo: true`. Апгрейд мажорної версії мовчки увімкне те, що тут вимкнене, — на ньому
// треба буде переписати це на явний `dataCollection`.
//
// `enabled` вимикає відправку скрізь, крім прода. Помилки з `bun dev` — це помилки, яких ще
// не бачив жоден користувач; вони зʼїдали б безкоштовну квоту і змішувалися б у панелі зі
// справжніми. Локально DSN узагалі не потрібен, але покладатися на його відсутність не варто:
// один рядок у `.env` — і розробка мовчки почала б слати події в прод-проєкт.

// Шум, доведений тріажем KR21.1 (docs/o21-user-signals/kr21.1-classification.md, перегляд
// 2026-09-18). Кожен запис — з причиною, бо без неї через пів року не зрозуміти, чи фільтр
// досі потрібен, чи вже ховає справжню помилку. Тариф безкоштовний: шум зʼїдає квоту, за якою
// Sentry відкидає справжні події.
//
// `denyUrls` дивиться на файл останнього кадру стека — скрипти, яких у нашій збірці немає.
export const noiseSourceUrls: RegExp[] = [
  // Розширення браузерів, зареєстровані під своєю схемою.
  /^(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//i,
  // MetaMask і сумісні гаманці інжектять `scripts/inpage.js` у кожну сторінку
  // (JAVASCRIPT-NEXTJS-9, -6, -5).
  /\/scripts\/inpage\.js$/,
  // `executors/<N>.js` — теки збірки розширення, підставленої через sourceURL відносно нашого
  // origin; 100 % подій з одного браузера, `M_ID` у коді не існує (JAVASCRIPT-NEXTJS-E, -K).
  /\/executors\/\d+\.js$/,
  // `dist/contentScripts/*` — структура збірки розширення, наш вивід іде з `_next/`
  // (JAVASCRIPT-NEXTJS-N).
  /\/contentScripts\//,
  // Єдині blob-скрипти на сайті — воркери dice-box (фізика на Ammo). Їхні падіння на телефонах,
  // де Ammo не піднімається, ідуть сотнями на кожен resize (JAVASCRIPT-NEXTJS-8, -A, -M) і
  // нічого не додають: сам факт уже приходить одним попередженням «dice-box fallback» з
  // diceService.ts (D-005).
  /^blob:/,
];

// `ignoreErrors` порівнює з `<type>: <value>` і з самим `value`; рядок — точний збіг, regexp —
// пошук. Тексти взяті буквально з подій, не вигадані.
export const noiseErrorMessages: (string | RegExp)[] = [
  // JSON-RPC-відповідь гаманця-розширення (`-32601`), у нас немає web3 (JAVASCRIPT-NEXTJS-B).
  /(^|: )Error invoking post: Method not found$/,
  /Failed to connect to MetaMask/,
  /MetaMask extension not found/,
  // Обірваний fetch при відході зі сторінки чи втраті мережі: WebKit каже «Load failed»,
  // Chrome — «Failed to fetch», Firefox — «network error» (JAVASCRIPT-NEXTJS-D, -F, -G, -H).
  /^(TypeError: )?Load failed$/,
  /^(TypeError: )?Failed to fetch$/i,
  /^(TypeError: )?network error$/i,
  // React прибирає вузол, який стороннє розширення (перекладач, Grammarly) уже видалило з DOM
  // в обхід React (JAVASCRIPT-NEXTJS-7, -P).
  /Failed to execute 'removeChild' on 'Node'/,
];

export const sharedSentryOptions = {
  enabled: process.env.NODE_ENV === "production",
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  denyUrls: noiseSourceUrls,
  ignoreErrors: noiseErrorMessages,
};
