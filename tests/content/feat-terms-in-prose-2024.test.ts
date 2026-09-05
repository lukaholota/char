import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { featTranslations } from "@/lib/refs/translation";

/**
 * Проза 2024 називає риси у форматі `Українська назва [English]`. Українська половина мусить
 * збігатися з ратифікованим реєстром, інакше той самий термін живе на сторінці у двох виглядах —
 * саме так `Human: Versatile (2024)` радив «Досвідчений [Skilled]», хоча риса зветься «Умілець».
 */

const CORPUS_FILES = [
  "species.json",
  "classes.json",
  "subclasses.json",
  "backgrounds.json",
  "feats.json",
];

const NAMED_FEAT_IN_PROSE = /([А-ЯІЇЄҐ][А-Яа-яІіЇїЄєҐґʼ'’\- ]{2,40}?)\s*\[([A-Z][A-Za-z' \-]{2,40})\]/g;

const ratifiedByEnglishName = new Map(
  Object.entries(featTranslations).map(([enumName, ukrainian]) => [
    enumName.replace(/_/g, " ").toLowerCase(),
    ukrainian,
  ]),
);

function findDriftedFeatNames(): string[] {
  return CORPUS_FILES.flatMap((file) => {
    const text = readFileSync(join(process.cwd(), "data/2024/normalized", file), "utf-8");
    return Array.from(text.matchAll(NAMED_FEAT_IN_PROSE)).flatMap(([, used, englishName]) => {
      const ratified = ratifiedByEnglishName.get(englishName.trim().toLowerCase());
      if (!ratified || ratified === used.trim()) return [];
      return [`${file}: «${used.trim()} [${englishName}]» — ратифіковано «${ratified}»`];
    });
  });
}

describe("назви рис усередині прози 2024 збігаються з ратифікованим реєстром", () => {
  it("жодна риса не названа в тексті інакше, ніж у featTranslations", () => {
    expect(findDriftedFeatNames()).toEqual([]);
  });

  it("гейт справді дивиться в реєстр, а не вважає все правильним", () => {
    expect(ratifiedByEnglishName.get("skilled")).toBe("Умілець");
  });
});
