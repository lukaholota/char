import { createHash } from "crypto";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { basename, join } from "path";
import {
  CreatureRuleset,
  MANUAL_CREATURE_IMAGE_MANIFEST_PATH,
  MANUAL_CREATURE_IMAGE_SOURCE_DIR,
  MANUAL_FILE_PREFIX,
  ManualCreatureImage,
  ManualCreatureImageManifest,
  buildPublicImagePath,
  compressToWebp,
  findImageDir,
  normalizeName,
  readManualCreatureImageManifest,
} from "../aidedd/creature-images";

/// Картинка, яку дав власник, лежить у git оригіналом, а в public/ їде зібраною: обидва
/// маніфести дзеркал переписуються своїм фетчером цілком, тож правка в них не живе.
const RULESETS: CreatureRuleset[] = ["RULES_2014", "RULES_2024"];
const CONTENT_TAG_LENGTH = 10;

async function buildManualCreatureImages(): Promise<void> {
  const manifest = readManualCreatureImageManifest();

  for (const ruleset of RULESETS) {
    const built = await buildRulesetImages(ruleset, manifest[ruleset]);
    manifest[ruleset] = built;
    const removed = removeSupersededManualFiles(ruleset, new Set(Object.values(built).map((image) => image.file)));
    console.log(`✅ ${ruleset}: ${Object.keys(built).length} ручних картинок, прибрано ${removed}`);
  }

  writeFileSync(MANUAL_CREATURE_IMAGE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  console.log(`📒 маніфест ${MANUAL_CREATURE_IMAGE_MANIFEST_PATH}`);
}

async function buildRulesetImages(
  ruleset: CreatureRuleset,
  entries: Record<string, ManualCreatureImage>
): Promise<Record<string, ManualCreatureImage>> {
  const built: Record<string, ManualCreatureImage> = {};

  for (const nameEng of Object.keys(entries).sort((left, right) => left.localeCompare(right))) {
    const entry = entries[nameEng];
    const originalPath = join(MANUAL_CREATURE_IMAGE_SOURCE_DIR, entry.source);
    if (!existsSync(originalPath)) throw new Error(`${nameEng}: немає оригіналу ${originalPath}`);

    const file = buildWebpName(entry.source, readContentTag(originalPath));
    const compressed = await compressToWebp(originalPath, join(findImageDir(ruleset), file));
    built[nameEng] = { ...entry, file, width: compressed.width, height: compressed.height };
    console.log(`  🖼️ ${nameEng} → ${buildPublicImagePath(ruleset, file)} (${compressed.width}×${compressed.height})`);
  }

  return built;
}

/// Відбиток міняє імʼя, тож попередній файл лишився б у теці назавжди; чіпаємо рівно свій
/// префікс — картинки дзеркал лежать поруч і належать їхнім маніфестам.
function removeSupersededManualFiles(ruleset: CreatureRuleset, kept: Set<string>): number {
  const dir = findImageDir(ruleset);
  let removed = 0;
  for (const file of readdirSync(dir)) {
    if (!file.startsWith(MANUAL_FILE_PREFIX) || kept.has(file)) continue;
    rmSync(join(dir, file));
    removed += 1;
  }
  return removed;
}

function buildWebpName(source: string, contentTag: string): string {
  const slug = normalizeName(basename(source, source.slice(source.lastIndexOf(".")))).replace(/ /g, "-");
  return `${MANUAL_FILE_PREFIX}${slug}-${contentTag}.webp`;
}

function readContentTag(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, CONTENT_TAG_LENGTH);
}

buildManualCreatureImages().catch((error) => {
  console.error(error);
  process.exit(1);
});
