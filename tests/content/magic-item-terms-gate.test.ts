import { describe, expect, it } from "vitest";
import dictionary from "@/lib/refs/dictionary.json";
import aliasFile from "@/lib/refs/search-aliases.json";
import { readMagicItemBaseline } from "../../prisma/seed/magicItemBaseline";
import {
  applyBatchesToBaseline,
  readMagicItemBatches,
} from "../../prisma/seed/magicItemBatches";
import {
  isKnownTerm,
  readKnownEnglishTerms,
} from "../../scripts/aidedd/known-terms";

type Dictionary = typeof dictionary & {
  DND_DICTIONARY: typeof dictionary.DND_DICTIONARY & {
    materials?: { ivory?: string };
    rules: typeof dictionary.DND_DICTIONARY.rules & { forcedMarch?: string };
  };
};

const dnd = (dictionary as Dictionary).DND_DICTIONARY;
const aliases = aliasFile.aliases;
const corpus = applyBatchesToBaseline(
  readMagicItemBaseline(),
  readMagicItemBatches(),
).items;

function item(engName: string) {
  const found = corpus.find((row) => row.engName === engName);
  if (!found) throw new Error(`Немає предмета ${engName}`);
  return found;
}

describe("KR14.3 — ратифікований реєстр термінів магічних предметів", () => {
  it("тримає ухвалені власником терміни в dictionary.json", () => {
    expect(dnd.magicItemTypes.artifact).toBe("Артефакт");
    expect(dnd.materials?.ivory).toBe("слонова кістка");
    expect(dnd.rules.forcedMarch).toBe("Виснажливий перехід");
    expect(dnd.magicItemTypes.wand).toBe("Паличка");
    expect(dnd.magicItemTypes.rod).toBe("Жезл");
  });

  it("gate відрізняє затверджений controlled term від підробленого", () => {
    const known = readKnownEnglishTerms();
    expect(isKnownTerm("artifact", known)).toBe(true);
    expect(isKnownTerm("term invented by a batch", known)).toBe(false);
  });

  it("перейменовує власні назви й спершу зберігає старі форми aliases", () => {
    expect(item("Quiver of Ehlonna").name).toBe("Колчан Елони [Quiver of Ehlonna]");
    expect(item("Nolzur's Marvelous Pigments").name).toBe(
      "Дивовижні пігменти Нолзура [Nolzur's Marvelous Pigments]",
    );

    expect(aliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "magic-item",
          slug: "quiver-of-ehlonna",
          variants: expect.arrayContaining(["Колчан Ехлонни", "Колчан Еллонни"]),
        }),
        expect.objectContaining({
          entityType: "magic-item",
          slug: "nolzur-s-marvelous-pigments",
          variants: expect.arrayContaining(["Дивовижні пігменти Нользура"]),
        }),
      ]),
    );
  });

  it("виправляє ivory goats в окремому записі й у тексті бандла", () => {
    expect(item("Figurine of Wondrous Power (Ivory Goats)").name).toBe(
      "Фігурка дивовижної сили (Кози зі слонової кістки) [Figurine of Wondrous Power (Ivory Goats)]",
    );
    expect(item("Figurine of Wondrous Power").description).toContain(
      "**Кози зі слонової кістки (рідкісні).**",
    );
    expect(item("Figurine of Wondrous Power").description).not.toContain("**Слонові кози");
  });

  it("зберігає стару назву ivory goats як пошуковий alias", () => {
    expect(aliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "magic-item",
          slug: "figurine-of-wondrous-power-ivory-goats",
          variants: expect.arrayContaining([
            "Фігурка дивовижної сили (Слонові кози)",
            "Слонові кози",
          ]),
        }),
      ]),
    );
  });
});
