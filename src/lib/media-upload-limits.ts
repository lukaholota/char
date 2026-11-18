// Браузер спершу зменшує фото, тож звичайним картинкам вистачає менш як 1 МБ.
export const MAX_IMAGE_UPLOAD_BYTES = 950 * 1024;
/// Детальна мапа: 50×50 клітинок по 72 px — це кілька МБ навіть у webp.
/// Тіло дії обмежують і serverActions.bodySizeLimit у next.config, і client_max_body_size у nginx — тримати їх вищими.
export const MAX_MAP_UPLOAD_BYTES = 8 * 1024 * 1024;
export const CLIENT_PORTRAIT_EDGE = 512;
/// Скріншот до звіту: текст на ньому має лишатись читабельним, тож довша сторона більша за портретну.
export const CLIENT_SCREENSHOT_EDGE = 1600;
/// «Менше стискати» для мапи. 4096² — ще й найбільше полотно, яке iOS Safari дає намалювати.
export const CLIENT_DETAILED_MAP_EDGE = 4096;
export const ACCEPTED_IMAGE_MIME_TYPES = "image/jpeg,image/png,image/webp";
