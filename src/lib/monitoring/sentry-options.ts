import type { Breadcrumb, Event } from "@sentry/nextjs";
import { noiseErrorMessages, noiseSourceUrls } from "@/lib/monitoring/error-noise";
import { stripDraftFragment } from "@/lib/utils/draft-fragment";

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

export const sharedSentryOptions = {
  enabled: process.env.NODE_ENV === "production",
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  denyUrls: noiseSourceUrls,
  ignoreErrors: noiseErrorMessages,
  beforeSend: stripDraftFromEvent,
  beforeSendTransaction: stripDraftFromEvent,
  beforeBreadcrumb: stripDraftFromBreadcrumb,
};

export function stripDraftFromEvent<SentEvent extends Event>(event: SentEvent): SentEvent {
  if (event.request?.url) event.request.url = stripDraftFragment(event.request.url);
  event.breadcrumbs?.forEach(stripDraftFromBreadcrumb);
  return event;
}

export function stripDraftFromBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const data = breadcrumb.data;
  if (!data) return breadcrumb;
  for (const key of ["from", "to", "url"]) {
    if (typeof data[key] === "string") data[key] = stripDraftFragment(data[key]);
  }
  return breadcrumb;
}
