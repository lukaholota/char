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
  ["/images/races/", "ai"],
  ["/images/classes/", "ai"],
  ["/images/creatures/", "manual"],
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
