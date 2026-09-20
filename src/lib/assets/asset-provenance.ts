/**
 * Where a picture on the site came from. The «без ШІ» mode filters on this and only this —
 * it hides generated art, not images in general.
 *
 * The marking is a path convention, not per-file metadata: every generated illustration is
 * born from a prompt filed in `prompts/` and lands in one of the directories below
 * (see `.agent/rules/visual-assets.md`). A new generated directory must be registered here,
 * otherwise its art keeps showing in no-AI mode.
 */
export type ImageProvenance =
  /** Generated from a prompt. Hidden in no-AI mode. */
  | "ai"
  /** Commissioned or hand-drawn by a person. Always shown. */
  | "drawn"
  /** Taken from an official WotC manual. Always shown. */
  | "manual"
  /** Logos, icons, favicons — interface furniture, not illustration. Always shown. */
  | "chrome";

const PROVENANCE_BY_PREFIX: ReadonlyArray<readonly [string, ImageProvenance]> = [
  ["/images/categories/", "ai"],
  /// Owner's call 2026-08-28: the two home covers — spells and characters — count as non-AI
  /// and stay on screen in the no-AI mode, generated or not. Any other cover under
  /// `/images/home/` is a 2:3 crop of its generated tile and hides together with the tile.
  ["/images/home/characters.webp", "drawn"],
  ["/images/home/spells.webp", "drawn"],
  ["/images/home/", "ai"],
  ["/images/races/", "ai"],
  ["/images/classes/", "ai"],
  ["/images/backgrounds/", "ai"],
  ["/images/rules/", "ai"],
  ["/images/errors/", "ai"],
  ["/images/creatures/", "manual"],
  ["/images/manual/", "manual"],
  ["/images/home-", "drawn"],
];

export function findImageProvenance(src: string | null | undefined): ImageProvenance {
  const path = String(src ?? "");
  const match = PROVENANCE_BY_PREFIX.find(([prefix]) => path.startsWith(prefix));
  return match ? match[1] : "chrome";
}

export function isAiGeneratedImage(src: string | null | undefined): boolean {
  return findImageProvenance(src) === "ai";
}

/// Режим без ШІ не завжди означає «порожньо». Там, де для місця є ілюстрація з мануалу, вона
/// стає на місце згенерованої; немає заміни — згенероване ховається, як і раніше.
export function findVisibleImageSrc({
  src,
  noAiSrc,
  isNoAiMode,
  provenance,
}: {
  src?: string | null;
  noAiSrc?: string | null;
  isNoAiMode: boolean;
  provenance?: ImageProvenance;
}): string | null {
  if (!isNoAiMode) return src ?? null;
  if (noAiSrc) return noAiSrc;
  return (provenance ?? findImageProvenance(src)) === "ai" ? null : (src ?? null);
}
