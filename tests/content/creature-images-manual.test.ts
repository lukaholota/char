import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import creatures2014 from "@/lib/generated/creatures.json";
import { CreatureData } from "@/lib/bestiaryData";
import {
  CreatureRuleset,
  MANUAL_CREATURE_IMAGE_SOURCE_DIR,
  MANUAL_FILE_PREFIX,
  buildPublicImagePath,
  readCreatureImageManifest,
  readManualCreatureImageManifest,
} from "../../scripts/aidedd/creature-images";

const manual = readManualCreatureImageManifest();
const merged = readCreatureImageManifest();
const RULESETS: CreatureRuleset[] = ["RULES_2014", "RULES_2024"];

describe("ручні картинки бестіарію", () => {
  it("кожен запис має оригінал у git і зібраний webp з відбитком", () => {
    for (const ruleset of RULESETS) {
      for (const [nameEng, image] of Object.entries(manual[ruleset])) {
        expect(fs.existsSync(path.join(MANUAL_CREATURE_IMAGE_SOURCE_DIR, image.source)), `${nameEng}: немає оригіналу`).toBe(true);
        expect(image.file, `${nameEng}: імʼя без відбитку вмісту`).toMatch(
          new RegExp(`^${MANUAL_FILE_PREFIX}[a-z0-9-]+-[0-9a-f]{10}\\.webp$`)
        );
      }
    }
  });

  it("ручний запис бʼє дзеркала, і саме він доїжджає в каталог", () => {
    for (const ruleset of RULESETS) {
      for (const [nameEng, image] of Object.entries(manual[ruleset])) {
        expect(merged[ruleset][nameEng]?.file, `${nameEng}: у злитому маніфесті інший файл`).toBe(image.file);
      }
    }

    for (const [nameEng, image] of Object.entries(manual.RULES_2014)) {
      const creature = (creatures2014 as CreatureData[]).find((entry) => entry.nameEng === nameEng);
      expect(creature?.imageUrl, `${nameEng}: каталог показує іншу картинку`).toBe(
        buildPublicImagePath("RULES_2014", image.file)
      );
    }
  });
});
