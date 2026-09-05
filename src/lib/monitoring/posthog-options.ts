import type { PostHogConfig } from "posthog-js";

// persistence: "memory" — жодного cookie чи localStorage. Анонімний distinct_id не переживає
// перезавантаження сторінки чи нову вкладку, зате саме через це PostHog не чіпає сховище
// пристрою і банер згоди не потрібен: тригер ePrivacy — доступ до/запис у сховище пристрою,
// а не сам факт відправки подій. Для залогінених — identify(userId) у PostHogIdentify
// привʼязує події до вже наявного акаунта без жодного стороннього ідентифікатора.
//
// autocapture і heatmaps вимкнені навмисно — рішення власника 2026-08-12: власні події
// дають кращий сигнал для дашбордів, ніж сирі кліки, і не дуже до цього тягнуть менше даних
// per-visitor. Не про приватність — про сигнал/шум.
export const sharedPostHogOptions: Partial<PostHogConfig> = {
  persistence: "memory",
  autocapture: false,
  capture_heatmaps: false,
  disable_session_recording: true,
  person_profiles: "identified_only",
};
