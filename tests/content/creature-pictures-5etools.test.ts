import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mergeCreatureImageManifests } from "../../scripts/aidedd/creature-images";
import { PictureCorpus, collectPictureCorpus, pickPicture } from "../../scripts/5etools/creature-pictures";

function buildCorpus(entries: Record<string, Array<[string, "art" | "token"]>>): PictureCorpus {
  return new Map(
    Object.entries(entries).map(([name, candidates]) => [
      name.toLowerCase(),
      candidates.map(([source, kind]) => ({ source, kind, path: `bestiary/${source}/${name}.webp` })),
    ])
  );
}

describe("картинки бестіарію з 5etools", () => {
  describe("злиття маніфестів", () => {
    it("для однієї назви перемагає aidedd, а решта назв 5etools лишається", () => {
      const aidedd = { RULES_2014: { Goblin: { file: "goblin.webp", width: 1, height: 1 } }, RULES_2024: {} };
      const fivetools = {
        RULES_2014: { Goblin: { file: "goblin-token.webp", width: 2, height: 2 }, Guard: { file: "guard.webp", width: 3, height: 3 } },
        RULES_2024: { Aboleth: { file: "aboleth.webp", width: 4, height: 4 } },
      };

      const merged = mergeCreatureImageManifests(aidedd, fivetools);

      expect(merged.RULES_2014.Goblin.file).toBe("goblin.webp");
      expect(merged.RULES_2014.Guard.file).toBe("guard.webp");
      expect(merged.RULES_2024.Aboleth.file).toBe("aboleth.webp");
    });
  });

  describe("pickPicture", () => {
    it("арт із будь-якої книги випереджає токен із власної", () => {
      const corpus = buildCorpus({ Commoner: [["MM", "token"], ["CoS", "art"]] });
      expect(pickPicture({ nameEng: "Commoner", source: "MM" }, "RULES_2014", corpus)?.source).toBe("CoS");
    });

    it("серед артів першою йде книга самої істоти, навіть під нашим кодом джерела", () => {
      const corpus = buildCorpus({ "Kender Skirmisher": [["MM", "art"], ["DSotDQ", "art"]] });
      expect(pickPicture({ nameEng: "Kender Skirmisher", source: "DRAGONLANCE" }, "RULES_2014", corpus)?.source).toBe("DSotDQ");
    });

    it("для 2024 книги нової редакції випереджають старі, для 2014 — навпаки", () => {
      const corpus = buildCorpus({ Aboleth: [["MM", "art"], ["XMM", "art"]] });
      expect(pickPicture({ nameEng: "Aboleth", source: "HOMEBREW" }, "RULES_2024", corpus)?.source).toBe("XMM");
      expect(pickPicture({ nameEng: "Aboleth", source: "HOMEBREW" }, "RULES_2014", corpus)?.source).toBe("MM");
    });

    it("знімає наш суфікс «(2024)» і бере першу половину подвійної назви", () => {
      const corpus = buildCorpus({ Goblin: [["XMM", "token"]], Succubus: [["MM", "art"]] });
      expect(pickPicture({ nameEng: "Goblin (2024)", source: "MM_2024" }, "RULES_2024", corpus)?.path).toContain("Goblin");
      expect(pickPicture({ nameEng: "Succubus / Incubus", source: "MM" }, "RULES_2014", corpus)?.path).toContain("Succubus");
    });

    it("без збігу повертає undefined", () => {
      expect(pickPicture({ nameEng: "Devilroot", source: "HOMEBREW" }, "RULES_2014", buildCorpus({}))).toBeUndefined();
    });
  });

  describe("collectPictureCorpus", () => {
    it("бере першу внутрішню ілюстрацію, токен за hasToken і пропускає кросовер-сети", () => {
      const dir = mkdtempSync(join(tmpdir(), "bestiary-"));
      writeFileSync(
        join(dir, "fluff-bestiary-mm.json"),
        JSON.stringify({
          monsterFluff: [
            { name: "Aboleth", source: "MM", images: [{ href: { type: "internal", path: "bestiary/MM/Aboleth.webp" } }, { href: { type: "internal", path: "bestiary/MM/Aboleth Lair.webp" } }] },
            { name: "Guard", source: "WttHC", images: [{ href: { type: "internal", path: "bestiary/WttHC/Guard.webp" } }] },
          ],
        })
      );
      writeFileSync(
        join(dir, "bestiary-mm.json"),
        JSON.stringify({ monster: [{ name: "Guard", source: "MM", hasToken: true }, { name: "Nameless", source: "MM" }] })
      );

      const corpus = collectPictureCorpus(dir);

      expect(corpus.get("aboleth")).toEqual([{ source: "MM", kind: "art", path: "bestiary/MM/Aboleth.webp" }]);
      expect(corpus.get("guard")).toEqual([{ source: "MM", kind: "token", path: "bestiary/tokens/MM/Guard.webp" }]);
      expect(corpus.has("nameless")).toBe(false);
    });
  });
});
