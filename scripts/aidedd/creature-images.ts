import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR } from "./aidedd-catalogs";
import { GeneratedCreature } from "../generate-creatures";

export type CreatureRuleset = "RULES_2014" | "RULES_2024";

export type CreatureImage = {
  file: string;
  width: number;
  height: number;
};

export type CreatureImageManifest = Record<CreatureRuleset, Record<string, CreatureImage>>;

export const CREATURE_IMAGE_MANIFEST_PATH = join(AIDEDD_DIR, "creature-images.json");

const EDITION_DIRS: Record<CreatureRuleset, string> = {
  RULES_2014: "2014",
  RULES_2024: "2024",
};

export function findImageDir(ruleset: CreatureRuleset): string {
  return join(process.cwd(), "public/images/creatures", EDITION_DIRS[ruleset]);
}

export function buildPublicImagePath(ruleset: CreatureRuleset, file: string): string {
  return `/images/creatures/${EDITION_DIRS[ruleset]}/${file}`;
}

export function readCreatureImageManifest(): CreatureImageManifest {
  if (!existsSync(CREATURE_IMAGE_MANIFEST_PATH)) {
    return { RULES_2014: {}, RULES_2024: {} };
  }

  const parsed = JSON.parse(readFileSync(CREATURE_IMAGE_MANIFEST_PATH, "utf-8")) as Partial<CreatureImageManifest>;
  return { RULES_2014: parsed.RULES_2014 ?? {}, RULES_2024: parsed.RULES_2024 ?? {} };
}

/// The catalogue record carries no aidedd slug, so the English name is the join key — it comes from
/// the same page the picture does. Width and height travel with the path because the card has to
/// reserve the box before the file loads; a picture the manifest names but git does not hold is
/// skipped, so a half-finished download never ships a broken `<img>`.
export function stampCreatureImages(
  creatures: GeneratedCreature[],
  ruleset: CreatureRuleset,
  manifest: CreatureImageManifest = readCreatureImageManifest()
): GeneratedCreature[] {
  const byName = buildNameIndex(manifest[ruleset]);
  const imageDir = findImageDir(ruleset);

  return creatures.map((creature) => {
    if (creature.imageUrl) return creature;

    const image = byName.get(normalizeName(creature.nameEng));
    if (!image || !existsSync(join(imageDir, image.file))) return creature;

    return {
      ...creature,
      imageUrl: buildPublicImagePath(ruleset, image.file),
      imageWidth: image.width,
      imageHeight: image.height,
    };
  });
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildNameIndex(entries: Record<string, CreatureImage>): Map<string, CreatureImage> {
  return new Map(Object.entries(entries).map(([name, image]) => [normalizeName(name), image]));
}
