import { readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";

const SIZE = 64;
const WORK = 256;
const TARGET_STROKE = 2.6;
const REFERENCE_VALUE = 0.865;
const REFERENCE_SATURATION = 0.45;
const PLATE = "data/spell-icons/stone-plate.png";

type Pixels = { data: Buffer; width: number };

async function readRgb(input: Buffer | string, size: number): Promise<Pixels> {
  const { data } = await sharp(input).resize(size, size, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: size };
}

function dilate({ data, width }: Pixels, radius: number): Pixels {
  if (radius <= 0) return { data, width };
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const max = [0, 0, 0];
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const ny = Math.min(width - 1, Math.max(0, y + dy));
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const i = (ny * width + nx) * 3;
          for (let c = 0; c < 3; c += 1) if (data[i + c] > max[c]) max[c] = data[i + c];
        }
      }
      const o = (y * width + x) * 3;
      for (let c = 0; c < 3; c += 1) out[o + c] = max[c];
    }
  }
  return { data: out, width };
}

function measureStroke({ data, width }: Pixels): number {
  const runs: number[] = [];
  for (let y = 0; y < width; y += 1) {
    let run = 0;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      const value = Math.max(data[i], data[i + 1], data[i + 2]) / 255;
      if (value > 0.62) run += 1;
      else {
        if (run >= 1 && run <= 14) runs.push(run);
        run = 0;
      }
    }
    if (run >= 1 && run <= 14) runs.push(run);
  }
  if (!runs.length) return 0;
  runs.sort((a, b) => a - b);
  return runs[Math.floor(runs.length / 2)];
}

function toHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, max ? d / max : 0, max];
}

function toRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const table: [number, number, number][] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]];
  return table[i % 6];
}

function normaliseGlyph({ data, width }: Pixels): Pixels {
  const lit: [number, number][] = [];
  for (let i = 0; i < data.length; i += 3) {
    const [, s, v] = toHsv(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    if (v > 0.62) lit.push([s, v]);
  }
  if (!lit.length) return { data, width };
  const meanValue = lit.reduce((sum, [, v]) => sum + v, 0) / lit.length;
  const meanSaturation = Math.max(0.02, lit.reduce((sum, [s]) => sum + s, 0) / lit.length);
  const valueScale = REFERENCE_VALUE / meanValue;
  const saturationScale = REFERENCE_SATURATION / meanSaturation;

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const [h, initialSaturation, initialValue] = toHsv(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    let s = initialSaturation;
    let v = initialValue;
    if (v > 0.35) {
      v = Math.min(1, v * valueScale);
      s = Math.min(1, s * saturationScale);
    }
    const [r, g, b] = toRgb(h, s, v);
    out[i] = Math.round(r * 255);
    out[i + 1] = Math.round(g * 255);
    out[i + 2] = Math.round(b * 255);
  }
  return { data: out, width };
}

function compositeOnPlate(glyph: Pixels, plate: Pixels, bloom: Pixels): Buffer {
  const out = Buffer.alloc(glyph.data.length);
  for (let i = 0; i < glyph.data.length; i += 3) {
    const luminance = Math.max(glyph.data[i], glyph.data[i + 1], glyph.data[i + 2]) / 255;
    const alpha = Math.pow(luminance, 0.85);
    for (let c = 0; c < 3; c += 1) {
      const lit = glyph.data[i + c] * alpha + plate.data[i + c] * (1 - alpha);
      out[i + c] = Math.min(255, Math.round(lit + bloom.data[i + c] * 0.55));
    }
  }
  return out;
}

async function buildIcon(glyphPath: string, outPath: string): Promise<void> {
  const source = await readRgb(glyphPath, WORK);

  let best = { radius: 0, stroke: 0, pixels: source };
  for (const radius of [0, 1, 2, 3, 4]) {
    const thickened = dilate(source, radius);
    const small = await readRgb(await toPng(thickened), SIZE);
    const stroke = measureStroke(small);
    if (!best.stroke || Math.abs(stroke - TARGET_STROKE) < Math.abs(best.stroke - TARGET_STROKE)) {
      best = { radius, stroke, pixels: small };
    }
  }

  const glyph = normaliseGlyph(best.pixels);
  const plate = await readRgb(PLATE, SIZE);
  const masked = await maskToBlack(glyph);
  const bloom = await readRgb(await sharp(await toPng(masked)).blur(1.6).png().toBuffer(), SIZE);

  const composed = compositeOnPlate(glyph, plate, bloom);
  const sharpened = await sharp(composed, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .sharpen({ sigma: 0.8 })
    .webp({ quality: 92 })
    .toBuffer();
  writeFileSync(outPath, sharpened);
  console.log(`${basename(glyphPath).padEnd(34)} потовщення ${best.radius}  штрих ${best.stroke.toFixed(1)}px  → ${outPath}`);
}

async function maskToBlack({ data, width }: Pixels): Promise<Pixels> {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const alpha = Math.pow(Math.max(data[i], data[i + 1], data[i + 2]) / 255, 0.85);
    for (let c = 0; c < 3; c += 1) out[i + c] = Math.round(data[i + c] * alpha);
  }
  return { data: out, width };
}

async function toPng({ data, width }: Pixels): Promise<Buffer> {
  return sharp(data, { raw: { width, height: width, channels: 3 } }).png().toBuffer();
}

async function buildEveryIcon(): Promise<void> {
  const [inDir, outDir] = [process.argv[2], process.argv[3]];
  if (!inDir || !outDir) {
    console.error("використання: bunx tsx scripts/build-spell-icon.ts <тека з гліфами> <тека для іконок>");
    process.exit(1);
  }
  const glyphs = readdirSync(inDir).filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file)).sort();
  for (const file of glyphs) {
    await buildIcon(join(inDir, file), join(outDir, file.replace(/\.[^.]+$/, ".webp")));
  }
  console.log(`\nзібрано ${glyphs.length}`);
}

void buildEveryIcon();
