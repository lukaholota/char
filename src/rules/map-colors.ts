const HEX_COLOR = /^#[0-9a-f]{6}$/;

export function parseHexColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const color = raw.toLowerCase();
  return HEX_COLOR.test(color) ? color : null;
}

/// Світлий текст на мапі обводимо темним, темний — світлим.
export function isLightColor(hex: string): boolean {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return 0.299 * red + 0.587 * green + 0.114 * blue > 150;
}
