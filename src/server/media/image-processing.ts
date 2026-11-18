import sharp from "sharp";

export const MAX_INPUT_PIXELS = 40_000_000;
const FULL_SIZE = 512;
const THUMBNAIL_SIZE = 96;
const WEBP_QUALITY = 80;
const SCREENSHOT_EDGE = 1600;
const SCREENSHOT_WEBP_QUALITY = 72;
const MAP_THUMBNAIL_EDGE = 320;
/// Детальна мапа — на прохання майстра: дрібні написи й сітка лишаються чіткими, файл важчий.
const DETAILED_MAP_EDGE = 3200;
const DETAILED_MAP_WEBP_QUALITY = 86;
const PRINT_JPEG_QUALITY = 88;

export type ProcessedImage = { full: Uint8Array; thumbnail: Uint8Array };
export type AcceptedImageType = "jpeg" | "png" | "webp";

sharp.concurrency(1);

let processingQueue: Promise<unknown> = Promise.resolve();

export function detectImageType(bytes: Uint8Array): AcceptedImageType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 12) === "WEBP") return "webp";
  return null;
}

// Одна картинка за раз на весь процес: VPS один, і кілька одночасних завантажень не мають зʼїсти памʼять.
export function buildSquareWebpImages(bytes: Uint8Array): Promise<ProcessedImage> {
  return runQueued(() => encodeSquareWebpImages(bytes));
}

export function buildScreenshotWebp(bytes: Uint8Array): Promise<Uint8Array> {
  return runQueued(() => encodeFittedWebp(bytes, SCREENSHOT_EDGE, SCREENSHOT_WEBP_QUALITY));
}

export function buildDetailedMapWebp(bytes: Uint8Array): Promise<Uint8Array> {
  return runQueued(() => encodeFittedWebp(bytes, DETAILED_MAP_EDGE, DETAILED_MAP_WEBP_QUALITY));
}

export function buildMapThumbnailWebp(bytes: Uint8Array): Promise<Uint8Array> {
  return runQueued(() => encodeFittedWebp(bytes, MAP_THUMBNAIL_EDGE, SCREENSHOT_WEBP_QUALITY));
}

export function buildPrintJpeg(bytes: Uint8Array): Promise<Uint8Array> {
  return runQueued(() => encodePrintJpeg(bytes));
}

function runQueued<T>(encode: () => Promise<T>): Promise<T> {
  const job = processingQueue.then(encode);
  processingQueue = job.catch(() => undefined);
  return job;
}

async function encodePrintJpeg(bytes: Uint8Array): Promise<Uint8Array> {
  const encoded = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: PRINT_JPEG_QUALITY })
    .toBuffer();
  return new Uint8Array(encoded);
}

async function encodeFittedWebp(bytes: Uint8Array, edge: number, quality: number): Promise<Uint8Array> {
  const encoded = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  return new Uint8Array(encoded);
}

async function encodeSquareWebpImages(bytes: Uint8Array): Promise<ProcessedImage> {
  const source = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();
  const [full, thumbnail] = await Promise.all([
    source.clone().resize(FULL_SIZE, FULL_SIZE, { fit: "cover" }).webp({ quality: WEBP_QUALITY }).toBuffer(),
    source.clone().resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" }).webp({ quality: WEBP_QUALITY }).toBuffer(),
  ]);
  return { full: new Uint8Array(full), thumbnail: new Uint8Array(thumbnail) };
}

function readAscii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}
