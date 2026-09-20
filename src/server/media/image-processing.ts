import sharp from "sharp";

const MAX_INPUT_PIXELS = 40_000_000;
const FULL_SIZE = 512;
const THUMBNAIL_SIZE = 96;
const WEBP_QUALITY = 80;
const SCREENSHOT_EDGE = 1600;
const SCREENSHOT_WEBP_QUALITY = 72;

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
  const job = processingQueue.then(() => encodeSquareWebpImages(bytes));
  processingQueue = job.catch(() => undefined);
  return job;
}

export function buildScreenshotWebp(bytes: Uint8Array): Promise<Uint8Array> {
  const job = processingQueue.then(() => encodeScreenshotWebp(bytes));
  processingQueue = job.catch(() => undefined);
  return job;
}

async function encodeScreenshotWebp(bytes: Uint8Array): Promise<Uint8Array> {
  const encoded = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize(SCREENSHOT_EDGE, SCREENSHOT_EDGE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: SCREENSHOT_WEBP_QUALITY })
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
