import { join } from "path";

export const SRD_REPO = "downfallx/dnd-5e-srd-markdown";

/// SRD 5.2.1, CC-BY-4.0. Pinned to a commit so the test oracle cannot drift under us.
export const SRD_COMMIT = "1b4b99dcb786cdd1a2fb26f8acec1551191f1ca4";

export const SRD_DIR = join(process.cwd(), "data/2024/srd");

export const SRD_FILES = [
  "animals.md",
  "character-creation.md",
  "character-origins.md",
  "classes.md",
  "equipment.md",
  "feats.md",
  "gameplay-toolbox.md",
  "magic-items.md",
  "monsters-A-Z.md",
  "monsters.md",
  "playing-the-game.md",
  "rules-glossary.md",
  "spells.md",
] as const;

export const SRD_STATBLOCK_FILES = ["monsters-A-Z.md", "animals.md"] as const;

export function buildSrdFileUrl(file: string): string {
  return `https://raw.githubusercontent.com/${SRD_REPO}/${SRD_COMMIT}/${file}`;
}

export function findSrdFilePath(file: string): string {
  return join(SRD_DIR, file);
}
