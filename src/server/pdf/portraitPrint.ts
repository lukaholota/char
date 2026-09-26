import type { PDFPage } from "pdf-lib";

import { buildMediaImageUrl } from "@/lib/media-url";
import { buildPrintJpeg } from "@/server/media/image-processing";
import type { createLogger } from "@/server/logging/logger";

type Logger = ReturnType<typeof createLogger>;
export type PdfArea = { x: number; y: number; width: number; height: number };

const PORTRAIT_FETCH_TIMEOUT_MS = 5_000;

/// Портрет — прикраса: якщо R2 не відповів, лист друкується з порожньою рамкою.
export async function loadPortraitJpeg(portraitKey: string | null, log: Logger): Promise<Uint8Array | null> {
  if (!portraitKey) return null;
  try {
    const response = await fetch(buildMediaImageUrl(portraitKey, "full"), { signal: AbortSignal.timeout(PORTRAIT_FETCH_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await buildPrintJpeg(new Uint8Array(await response.arrayBuffer()));
  } catch (err) {
    log.warn("pdf.portrait.failed", { err });
    return null;
  }
}

export async function drawPortrait(page: PDFPage, portraitJpeg: Uint8Array, area: PdfArea) {
  const image = await page.doc.embedJpg(portraitJpeg);
  const scale = Math.min(area.width / image.width, area.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, { x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2, width, height });
}
