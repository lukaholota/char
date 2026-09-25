import { CLIENT_PORTRAIT_EDGE, CLIENT_SCREENSHOT_EDGE, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import type { SourceSquare } from "./crop-geometry";

const OUTPUT_TYPE = "image/webp";
const PORTRAIT_PASSES = [
  { edge: CLIENT_PORTRAIT_EDGE, quality: 0.8 },
  { edge: CLIENT_PORTRAIT_EDGE, quality: 0.6 },
  { edge: 384, quality: 0.5 },
];

export async function cropImageForUpload(bitmap: ImageBitmap, square: SourceSquare): Promise<Blob> {
  const [firstPass, ...remainingPasses] = PORTRAIT_PASSES;
  let encoded = await encodeCanvas(drawSquareCrop(bitmap, square, firstPass.edge), firstPass.quality);
  for (const pass of remainingPasses) {
    if (encoded.size <= MAX_IMAGE_UPLOAD_BYTES) return encoded;
    encoded = await encodeCanvas(drawSquareCrop(bitmap, square, pass.edge), pass.quality);
  }
  return encoded;
}

function drawSquareCrop(bitmap: ImageBitmap, square: SourceSquare, maxEdge: number): HTMLCanvasElement {
  const edge = Math.max(1, Math.min(maxEdge, Math.round(square.size)));
  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  canvas.getContext("2d")?.drawImage(bitmap, square.x, square.y, square.size, square.size, 0, 0, edge, edge);
  return canvas;
}

/// Скріншот стискається двома заходами: спершу м\u02bcяко, а якщо не влізає в ліміт дії — сильніше.
const SCREENSHOT_PASSES = [
  { edge: CLIENT_SCREENSHOT_EDGE, quality: 0.8 },
  { edge: 1200, quality: 0.6 },
];

export async function shrinkScreenshotForUpload(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    let smallest: Blob | null = null;
    for (const pass of SCREENSHOT_PASSES) {
      const encoded = await encodeCanvas(drawFitted(bitmap, pass.edge), pass.quality);
      if (encoded.size <= MAX_IMAGE_UPLOAD_BYTES) return encoded;
      smallest = encoded;
    }
    return smallest ?? file;
  } finally {
    bitmap.close();
  }
}

function drawFitted(bitmap: ImageBitmap, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Браузер не зміг стиснути картинку"))), OUTPUT_TYPE, quality);
  });
}
