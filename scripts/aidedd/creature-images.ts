import { existsSync, readFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { AIDEDD_DIR } from "./aidedd-catalogs";
import { CreatureImageShape, GeneratedCreature } from "../generate-creatures";

export type CreatureRuleset = "RULES_2014" | "RULES_2024";

export type CreatureImage = {
  file: string;
  width: number;
  height: number;
  shape?: CreatureImageShape;
};

export type CreatureImageManifest = Record<CreatureRuleset, Record<string, CreatureImage>>;

export const CREATURE_IMAGE_MANIFEST_PATH = join(AIDEDD_DIR, "creature-images.json");
export const FIVETOOLS_CREATURE_IMAGE_MANIFEST_PATH = join(process.cwd(), "data/5etools/creature-images.json");

export const MAX_IMAGE_WIDTH = 640;
const WEBP_QUALITY = 78;

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

/// aidedd came first and its pictures are the ones the catalogue was tuned on, so where both
/// sources know a creature the aidedd file wins; 5etools only fills the names aidedd has no art for.
export function readCreatureImageManifest(): CreatureImageManifest {
  return mergeCreatureImageManifests(
    readCreatureImageManifestFile(CREATURE_IMAGE_MANIFEST_PATH),
    readCreatureImageManifestFile(FIVETOOLS_CREATURE_IMAGE_MANIFEST_PATH)
  );
}

export function readCreatureImageManifestFile(path: string): CreatureImageManifest {
  if (!existsSync(path)) {
    return { RULES_2014: {}, RULES_2024: {} };
  }

  const parsed = JSON.parse(readFileSync(path, "utf-8")) as Partial<CreatureImageManifest>;
  return { RULES_2014: parsed.RULES_2014 ?? {}, RULES_2024: parsed.RULES_2024 ?? {} };
}

export function mergeCreatureImageManifests(
  primary: CreatureImageManifest,
  secondary: CreatureImageManifest
): CreatureImageManifest {
  return {
    RULES_2014: { ...secondary.RULES_2014, ...primary.RULES_2014 },
    RULES_2024: { ...secondary.RULES_2024, ...primary.RULES_2024 },
  };
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
      ...(image.shape ? { imageShape: image.shape } : {}),
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

export async function compressToWebp(originalPath: string, targetPath: string): Promise<CreatureImage> {
  const info = await sharp(originalPath)
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(targetPath);
  return { file: targetPath.split("/").pop() ?? "", width: info.width, height: info.height };
}

export async function measureImage(path: string, file: string): Promise<CreatureImage> {
  const { width, height } = await sharp(path).metadata();
  if (!width || !height) throw new Error(`Не читається як картинка: ${path}`);
  return { file, width, height };
}

function buildNameIndex(entries: Record<string, CreatureImage>): Map<string, CreatureImage> {
  return new Map(Object.entries(entries).map(([name, image]) => [normalizeName(name), image]));
}
