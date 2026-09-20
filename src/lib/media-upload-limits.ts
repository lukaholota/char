// Server actions у Next приймають тіло до 1 МБ; браузер спершу зменшує фото, тож цього вистачає з запасом.
export const MAX_IMAGE_UPLOAD_BYTES = 950 * 1024;
export const CLIENT_RESIZE_EDGE = 1024;
/// Скріншот до звіту: текст на ньому має лишатись читабельним, тож довша сторона більша за портретну.
export const CLIENT_SCREENSHOT_EDGE = 1600;
export const ACCEPTED_IMAGE_MIME_TYPES = "image/jpeg,image/png,image/webp";
