// Шум, доведений тріажем KR21.1 (docs/o21-user-signals/kr21.1-classification.md, перегляд
// 2026-09-18) і переглядом PostHog 2026-09-25. Один список на Sentry і PostHog: до того PostHog
// фільтрів не мав, і ~85 % його issues були тим, що Sentry давно відкидав. Кожен запис — з
// причиною, бо без неї через пів року не зрозуміти, чи фільтр досі потрібен, чи вже ховає
// справжню помилку. Тарифи безкоштовні: шум зʼїдає квоту, за якою відкидаються справжні події.

// Файл останнього кадру стека — скрипти, яких у нашій збірці немає.
export const noiseSourceUrls: RegExp[] = [
  // Розширення браузерів, зареєстровані під своєю схемою.
  /^(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//i,
  // Так Safari показує в стеку файли розширень (PostHog `contentScriptData.init_ts`).
  /^webkit-masked-url:\/\//,
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

// Порівнюються і `<type>: <value>`, і сам `value` — так робить Sentry. Тексти взяті буквально
// з подій, не вигадані.
export const noiseErrorMessages: RegExp[] = [
  // JSON-RPC-відповідь гаманця-розширення (`-32601`), у нас немає web3 (JAVASCRIPT-NEXTJS-B).
  // `postEvent` — те саме з одного Android-телефона, 207 подій у PostHog за місяць.
  /(^|: )Error invoking post(Event)?: Method not found$/,
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
  // Вбудований браузер Threads/Instagram на Android шле дані в застосунок із власного
  // скрипта `navigation_performance_logger_android`, коли той уже закритий (JAVASCRIPT-NEXTJS-1B).
  /Java object is gone/,
  // Помилка в скрипті з чужого домену: браузер ховає і текст, і стек. Sentry відкидає її сам,
  // у PostHog — 52 події за місяць.
  /^(Error: )?Script error\.?$/,
  // Попередження браузера, а не збій: ResizeObserver не встиг доставити зміни за один кадр.
  // Sentry теж відкидає його сам, у PostHog — 12 подій.
  /^(Error: )?ResizeObserver loop (completed with undelivered notifications|limit exceeded)/,
];

export function isNoiseSourceUrl(url: string): boolean {
  return noiseSourceUrls.some((pattern) => pattern.test(url));
}

export function isNoiseErrorMessage(type: string | undefined, value: string): boolean {
  const candidates = type ? [value, `${type}: ${value}`] : [value];
  return candidates.some((message) => noiseErrorMessages.some((pattern) => pattern.test(message)));
}
