import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import creatures2014 from "@/lib/generated/creatures.json";
import creatures2024 from "@/lib/generated/creatures2024.json";
import { CreatureData } from "@/lib/bestiaryData";
import { findImageProvenance } from "@/lib/assets/asset-provenance";
import {
  CreatureImageManifest,
  CreatureRuleset,
  buildPublicImagePath,
  readCreatureImageManifest,
  stampCreatureImages,
} from "../../scripts/aidedd/creature-images";
import { GeneratedCreature } from "../../scripts/generate-creatures";

const MAX_IMAGE_WIDTH = 640;

const EDITIONS: Array<[CreatureRuleset, CreatureData[]]> = [
  ["RULES_2014", creatures2014 as CreatureData[]],
  ["RULES_2024", creatures2024 as CreatureData[]],
];

const manifest = readCreatureImageManifest();

function findPublicPath(publicRelativePath: string): string {
  return path.join(process.cwd(), "public", publicRelativePath.replace(/^\//, ""));
}

function buildCreature(nameEng: string, overrides: Partial<GeneratedCreature> = {}): GeneratedCreature {
  return { creatureId: 1, name: nameEng, nameEng, ...overrides } as GeneratedCreature;
}

describe("KR12.4 — картинки бестіарію", () => {
  describe("маніфест", () => {
    it("кожна назва в маніфесті має webp на диску", () => {
      for (const [ruleset] of EDITIONS) {
        const entries = Object.entries(manifest[ruleset]);
        expect(entries.length, `${ruleset}: маніфест порожній`).toBeGreaterThan(0);

        for (const [nameEng, image] of entries) {
          const publicPath = buildPublicImagePath(ruleset, image.file);
          expect(fs.existsSync(findPublicPath(publicPath)), `${nameEng}: немає ${publicPath}`).toBe(true);
        }
      }
    });

    it("розміри записані й не перевищують стелю стиснення", () => {
      for (const [ruleset] of EDITIONS) {
        for (const [nameEng, image] of Object.entries(manifest[ruleset])) {
          expect(image.width, `${nameEng}: немає ширини`).toBeGreaterThan(0);
          expect(image.height, `${nameEng}: немає висоти`).toBeGreaterThan(0);
          expect(image.width, `${nameEng}: ширина понад ${MAX_IMAGE_WIDTH}`).toBeLessThanOrEqual(MAX_IMAGE_WIDTH);
        }
      }
    });
  });

  describe("каталог", () => {
    it("у кожної редакції картинка є щонайменше в половини істот", () => {
      for (const [ruleset, creatures] of EDITIONS) {
        const withImage = creatures.filter((creature) => creature.imageUrl);
        expect(withImage.length, `${ruleset}: ${withImage.length} з ${creatures.length}`).toBeGreaterThan(
          creatures.length / 2
        );
      }
    });

    it("кожен imageUrl веде на локальний файл із заданими розмірами", () => {
      for (const [ruleset, creatures] of EDITIONS) {
        for (const creature of creatures.filter((entry) => entry.imageUrl)) {
          const publicPath = creature.imageUrl as string;
          expect(publicPath.startsWith("/images/creatures/"), `${creature.nameEng}: ${publicPath}`).toBe(true);
          expect(fs.existsSync(findPublicPath(publicPath)), `${creature.nameEng}: немає ${publicPath}`).toBe(true);
          expect(creature.imageWidth, `${creature.nameEng}: немає ширини`).toBeGreaterThan(0);
          expect(creature.imageHeight, `${creature.nameEng}: немає висоти`).toBeGreaterThan(0);
          expect(ruleset === "RULES_2024" ? publicPath.includes("/2024/") : publicPath.includes("/2014/")).toBe(
            true
          );
        }
      }
    });

    it("ілюстрації з книг не ховаються в режимі без ШІ", () => {
      expect(findImageProvenance("/images/creatures/2014/goblin.webp")).toBe("manual");
      expect(findImageProvenance("/images/creatures/2024/aboleth.webp")).toBe("manual");
    });
  });

  describe("stampCreatureImages", () => {
    const fixture: CreatureImageManifest = {
      RULES_2014: {},
      RULES_2024: {},
    };

    it("проставляє шлях і розміри за англійською назвою", () => {
      const [nameEng, image] = Object.entries(manifest.RULES_2024)[0];
      const [stamped] = stampCreatureImages([buildCreature(nameEng)], "RULES_2024");

      expect(stamped.imageUrl).toBe(buildPublicImagePath("RULES_2024", image.file));
      expect(stamped.imageWidth).toBe(image.width);
      expect(stamped.imageHeight).toBe(image.height);
    });

    it("не чіпає істоту, якої немає в маніфесті", () => {
      const [stamped] = stampCreatureImages([buildCreature("Не Існує Такої Істоти")], "RULES_2014");
      expect(stamped.imageUrl).toBeUndefined();
    });

    it("не перетирає вже заповнений imageUrl", () => {
      const [nameEng] = Object.entries(manifest.RULES_2024)[0];
      const [stamped] = stampCreatureImages(
        [buildCreature(nameEng, { imageUrl: "/images/creatures/2024/власний.webp" })],
        "RULES_2024"
      );

      expect(stamped.imageUrl).toBe("/images/creatures/2024/власний.webp");
    });

    it("пропускає запис маніфесту, чийого файлу немає на диску", () => {
      fixture.RULES_2014 = { Goblin: { file: "нема-такого-файлу.webp", width: 100, height: 100 } };
      const [stamped] = stampCreatureImages([buildCreature("Goblin")], "RULES_2014", fixture);
      expect(stamped.imageUrl).toBeUndefined();
    });
  });
});

/// Хвіст KR12.2, який власник просив закрити разом із картинками: парсер читав «XP N, or M in
/// Lair», а `build-creature-record.ts` це поле не передавав, тож у каталог воно не доїжджало.
describe("KR12.4 — XP у лігві доїжджає в каталог", () => {
  const creatures = creatures2024 as CreatureData[];

  it("легендарні істоти 2024 несуть xpInLair", () => {
    expect(creatures.filter((creature) => creature.xpInLair).length).toBeGreaterThan(25);
  });

  it("Аболет має саме те число, що подає джерело", () => {
    expect(creatures.find((creature) => creature.nameEng === "Aboleth")?.xpInLair).toBe("7200");
  });
});
