export const ICON_STYLE_BLOCK = `A single flat glyph for a fantasy spell icon, drawn on a PLAIN BLACK BACKGROUND.

STYLE: hand-painted 2D line art, flat and frontal. One continuous line drawing, uniform stroke
width, rounded stroke ends. Drawn freehand — the lines are slightly uneven and imperfect, never
ruler-straight and never geometrically exact. The line glows: a near-white core along the middle
of the stroke, the chosen hue along its outer edge, and a soft coloured bloom spreading outward
about two stroke-widths into the black. No fill inside shapes, no gradients across the subject,
no perspective, no depth, no texture, no stone, no tile, no frame, no scenery, no character art,
not a photograph, not a 3D render.

BACKGROUND: pure black, completely empty. Nothing but the glyph and its glow.

STROKE: THICK — about one sixteenth of the image width. It must survive being reduced to 64x64
pixels: few bold shapes, no fine detail, no thin parallel lines spaced closer than the stroke
width, no lettering, no numerals, no signature, no watermark.

COMPOSITION: at most two elements, centred, together occupying about 80% of the square.

COLOUR: {{HUE}} only — the whole glyph is that one hue.

SUBJECT: {{SUBJECT}}

Square 1:1 image.`;

const HUE_BY_SCHOOL: Record<string, string> = {
  "Втілення": "warm gold",
  "Захист": "pale cyan",
  "Ворожіння": "teal",
  "Причарування": "rose pink",
  "Ілюзія": "pale blue-white",
  "Некромантія": "sickly green",
  "Виклик": "amber",
  "Перетворення": "pale violet",
};

export function findDefaultHue(school: string | null | undefined): string {
  return HUE_BY_SCHOOL[String(school ?? "")] ?? "warm gold";
}

export function buildIconPrompt(hue: string, subject: string): string {
  return ICON_STYLE_BLOCK.replace("{{HUE}}", hue).replace("{{SUBJECT}}", subject);
}

export function buildIconFileName(engName: string): string {
  return engName
    .toLowerCase()
    .replace(/[’ʼ']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
