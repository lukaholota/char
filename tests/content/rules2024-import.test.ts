import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  subclassTranslations,
  subclassTranslationsEng,
  featTranslations,
  featCategoryTranslations,
} from "@/lib/refs/translation";
import { stripSpellAnchors } from "@/lib/spell-link";

const NORMALIZED_DIR = join(process.cwd(), "data/2024/normalized");

function readJson(filename: string): unknown[] {
  const raw = readFileSync(join(NORMALIZED_DIR, filename), "utf-8");
  return JSON.parse(raw) as unknown[];
}

const RULESET_FILES = [
  "backgrounds.json",
  "species.json",
  "feats.json",
  "subclasses.json",
  "classes.json",
  "weapons.json",
  "existing-2024-backgrounds-update-data.json",
  "spells.json",
  "magic-items.json",
];

describe("KR6.2 — normalized 2024 data never silently defaults to RULES_2014", () => {
  it.each(RULESET_FILES)("every record in %s has ruleset === RULES_2024", (filename) => {
    const records = readJson(filename) as Array<{ ruleset?: string; engName?: string }>;
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      expect(record.ruleset, `${filename}: ${record.engName ?? "(no engName)"}`).toBe("RULES_2024");
    }
  });

  it("every record has an engName for cross-referencing against 2014", () => {
    for (const filename of RULESET_FILES) {
      const records = readJson(filename) as Array<{ engName?: string }>;
      for (const record of records) {
        expect(record.engName, filename).toBeTruthy();
      }
    }
  });
});

describe("KR18.6 — Weapon Mastery capacity stays in class data", () => {
  type ClassRecord = {
    engName: string;
    weaponMasteryProgression?: number[];
  };

  const classes = readJson("classes.json") as ClassRecord[];
  const progressionOf = (engName: string) =>
    classes.find((characterClass) => characterClass.engName === engName)?.weaponMasteryProgression;

  it("stores one capacity value for every class level", () => {
    for (const characterClass of classes) {
      expect(characterClass.weaponMasteryProgression, characterClass.engName).toHaveLength(20);
    }
  });

  it("keeps Fighter, Rogue, and Monk capacities in data rather than UI constants", () => {
    expect(progressionOf("Fighter")?.[0]).toBe(3);
    expect(progressionOf("Fighter")?.[4]).toBe(4);
    expect(progressionOf("Rogue")?.[4]).toBe(2);
    expect(progressionOf("Monk")?.[4]).toBe(0);
  });
});

describe("KR6.2 — no new terminology is invented outside dictionary.json", () => {
  // Background/species display names are original translated proper nouns for new content
  // entities — same convention as 2014, where race/background names live directly in seed
  // files, never in dictionary.json. This gate is for reusable TERMINOLOGY (mechanics,
  // categories) required by kr6.2-extraction-translation.md, not entity proper nouns.
  const dictionary = JSON.parse(
    readFileSync(join(process.cwd(), "src/lib/refs/dictionary.json"), "utf-8"),
  ) as { DND_DICTIONARY: { rules2024: Record<string, Record<string, string>> } };

  const rules2024 = dictionary.DND_DICTIONARY.rules2024;

  it("has an approved Ukrainian rendering for every required core 2024 concept term", () => {
    for (const key of ["weaponMastery", "originFeat", "epicBoon", "species"]) {
      expect(rules2024.coreConceptTerms[key], key).toBeTruthy();
    }
  });

  it("has an approved Ukrainian rendering for all 8 weapon mastery properties", () => {
    for (const key of ["cleave", "graze", "nick", "push", "sap", "slow", "topple", "vex"]) {
      expect(rules2024.weaponMasteryProperties[key], key).toBeTruthy();
    }
  });

  it("every weapon in weapons.json resolves its mastery name from the approved term list", () => {
    const weapons = readJson("weapons.json") as Array<{ mastery: string; masteryNameUa: string }>;
    const approvedMasteryNames = new Set(Object.values(rules2024.weaponMasteryProperties));
    for (const w of weapons) {
      expect(approvedMasteryNames.has(w.masteryNameUa), `${w.mastery} -> ${w.masteryNameUa}`).toBe(true);
    }
  });

  it("every feat has a resolved Ukrainian name (reused-2014 or approved-2024)", () => {
    const feats = readJson("feats.json") as Array<{ name: string | null; engName: string }>;
    for (const f of feats) {
      expect(f.name, f.engName).toBeTruthy();
    }
  });

  it("every feat prerequisite is translated to Ukrainian (no English Level/Feature markers) or null", () => {
    const feats = readJson("feats.json") as Array<{ prerequisite?: string | null; engName: string }>;
    for (const f of feats) {
      if (f.prerequisite) {
        expect(/\b(level|feat|strength|dexterity|constitution|intelligence|wisdom|charisma|training|feature|spellcasting)\b/i.test(f.prerequisite), f.engName).toBe(false);
      }
    }
  });

  it("every subclass has a resolved Ukrainian name, and every non-reused one traces to dictionary.json", () => {
    const subclasses = readJson("subclasses.json") as Array<{
      name: string | null;
      engName: string;
      nameSource: string;
    }>;
    const approvedSubclassNames = new Set([
      ...Object.values(rules2024.renamedSubclassNames).filter((v): v is string => typeof v === "string"),
      ...Object.values(rules2024.newSubclassNames),
    ]);
    for (const s of subclasses) {
      expect(s.name, s.engName).toBeTruthy();
      if (s.nameSource !== "reused-2014") {
        expect(approvedSubclassNames.has(s.name as string), `${s.engName} -> ${s.name}`).toBe(true);
      }
    }
  });

  it("every 2024 subclass exists in subclassTranslations and subclassTranslationsEng", () => {
    const subclasses = readJson("subclasses.json") as Array<{ engName: string; name: string }>;
    for (const s of subclasses) {
      const enumKey = `${s.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024` as keyof typeof subclassTranslations;
      expect(subclassTranslations[enumKey], `subclassTranslations[${enumKey}]`).toBe(s.name);
      expect(subclassTranslationsEng[enumKey], `subclassTranslationsEng[${enumKey}]`).toBe(s.engName);
    }
  });

  it("every 2024 feat exists in featTranslations", () => {
    const feats = readJson("feats.json") as Array<{ engName: string; name: string }>;
    for (const f of feats) {
      const key = f.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
      expect(featTranslations[key], `featTranslations[${key}]`).toBe(f.name);
    }
  });

  it("featCategoryTranslations aligns with dictionary.json canonical category names", () => {
    expect(featCategoryTranslations.ORIGIN).toBe("Риса походження");
    expect(featCategoryTranslations.GENERAL).toBe("Загальна риса");
    expect(featCategoryTranslations.EPIC_BOON).toBe("Епічний дар");
    expect(featCategoryTranslations.FIGHTING_STYLE).toBe("Бойовий стиль");
  });
});


describe("KR6.2 — the 15 existing *_2024 backgrounds keep their production background_id", () => {
  it("has exactly the 15 background_id values verified read-only against production 2026-08-15", () => {
    const records = readJson("existing-2024-backgrounds-update-data.json") as Array<{
      existingBackgroundId: number;
    }>;
    const ids = records.map((r) => r.existingBackgroundId).sort((a, b) => a - b);
    expect(ids).toEqual([153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167]);
  });
});

describe("KR6.2 Phase 2 — feat and subclass feature descriptions are fully translated", () => {
  type SubclassFeature = { level: number | null; name: string; description: string };
  type SubclassRecord = {
    engName: string;
    tagline?: string;
    flavorText?: string;
    featuresEng: Array<{ level: number | null; name: string }>;
    features?: SubclassFeature[];
    translationStatus?: string;
  };

  const subclasses = readJson("subclasses.json") as SubclassRecord[];

  it("every subclass is marked fully translated", () => {
    for (const s of subclasses) {
      expect(s.translationStatus, s.engName).toBe("fully translated");
    }
  });

  it("every subclass has a translated tagline and flavor text", () => {
    for (const s of subclasses) {
      expect(s.tagline, s.engName).toBeTruthy();
      expect(s.flavorText, s.engName).toBeTruthy();
    }
  });

  it("every subclass has exactly as many translated features as English source features, same levels, same order", () => {
    for (const s of subclasses) {
      const features = s.features ?? [];
      expect(features.length, s.engName).toBe(s.featuresEng.length);
      for (let i = 0; i < features.length; i++) {
        expect(features[i].level, `${s.engName} feature ${i}`).toBe(s.featuresEng[i].level);
        expect(features[i].name, `${s.engName} feature ${i}`).toBeTruthy();
        expect(features[i].description, `${s.engName}: ${features[i].name}`).toBeTruthy();
      }
    }
  });

  type FeatBenefit = { name: string; description: string };
  type FeatRecord = {
    engName: string;
    category: string;
    benefitsEng: FeatBenefit[] | null;
    plainDescriptionEng: string | null;
    benefits?: FeatBenefit[];
    description?: string;
    translationStatus?: string;
  };

  const feats = readJson("feats.json") as FeatRecord[];

  it("every feat is marked fully translated", () => {
    for (const f of feats) {
      expect(f.translationStatus, f.engName).toBe("fully translated");
    }
  });

  it("every benefits-style feat has as many translated benefits as English source, same order, each with a description", () => {
    for (const f of feats.filter((f) => f.benefitsEng)) {
      const benefits = f.benefits ?? [];
      expect(benefits.length, f.engName).toBe((f.benefitsEng as FeatBenefit[]).length);
      for (let i = 0; i < benefits.length; i++) {
        expect(benefits[i].name, `${f.engName} benefit ${i}`).toBeTruthy();
        expect(benefits[i].description, `${f.engName}: ${benefits[i].name}`).toBeTruthy();
      }
    }
  });

  it("every plain-description feat has a translated description", () => {
    for (const f of feats.filter((f) => f.plainDescriptionEng)) {
      expect(f.description, f.engName).toBeTruthy();
    }
  });

  it("no translated text contains an unresolved term/spell marker", () => {
    const files = ["subclasses.json", "feats.json"];
    for (const file of files) {
      const raw = readFileSync(join(NORMALIZED_DIR, file), "utf-8");
      expect(raw.includes("⚠️"), file).toBe(false);
      expect(raw.includes("NEEDS-TERM-DECISION"), file).toBe(false);
      expect(raw.includes("NEEDS-SPELL-TRANSLATION"), file).toBe(false);
    }
  });

  it("every core 2024 concept term used across subclasses/feats resolves to dictionary.json", () => {
    const dictionary = JSON.parse(
      readFileSync(join(process.cwd(), "src/lib/refs/dictionary.json"), "utf-8"),
    ) as { DND_DICTIONARY: { rules2024: { coreConceptTerms: Record<string, string> } } };
    const approved = new Set(Object.values(dictionary.DND_DICTIONARY.rules2024.coreConceptTerms));
    // Spot-check the highest-frequency new 2024 terms actually resolve, rather than
    // scanning free-form prose for arbitrary capitalized phrases (too noisy to assert on).
    const mustResolve = ["Магічна дія", "Закривавлений", "Очко Зосередження"];
    for (const term of mustResolve) {
      expect(approved.has(term), term).toBe(true);
    }
  });
});

describe("KR6.2 Phase 3 — full PHB 2024 spell corpus", () => {
  type SpellRecord = {
    ruleset: string;
    engName: string;
    name: string;
    level: number;
    school: string;
    castingTime: string;
    range: string;
    components: string;
    duration: string;
    hasRitual: string;
    hasConcentration: string;
    description: string;
    classes: string[];
    source: string;
    kind: "new" | "renamed" | "unchanged";
    old2014EngName?: string;
    differsFrom2014: boolean;
    translationStatus?: string;
  };

  const spells = readJson("spells.json") as SpellRecord[];

  it("has exactly the 391 PHB-2024-tagged spell pages accounted for (378 name-matched to 2014 + 13 new/renamed)", () => {
    expect(spells.length).toBe(391);
  });

  it("every spell is marked fully translated with a non-empty name and description", () => {
    for (const s of spells) {
      expect(s.translationStatus, s.engName).toBe("fully translated");
      expect(s.name, s.engName).toBeTruthy();
      expect(s.description, s.engName).toBeTruthy();
    }
  });

  it("every spell has hasRitual/hasConcentration as так/ні, matching the 2014 corpus convention", () => {
    for (const s of spells) {
      expect(["так", "ні"], s.engName).toContain(s.hasRitual);
      expect(["так", "ні"], s.engName).toContain(s.hasConcentration);
    }
  });

  it("has exactly 10 confirmed-new and 3 confirmed-renamed spells, the rest unchanged", () => {
    const byKind = { new: 0, renamed: 0, unchanged: 0 };
    for (const s of spells) {
      byKind[s.kind]++;
    }
    expect(byKind.new).toBe(10);
    expect(byKind.renamed).toBe(3);
    expect(byKind.unchanged).toBe(378);
  });

  it("every renamed spell traces to its 2014 predecessor by old2014EngName", () => {
    const renamed = spells.filter((s) => s.kind === "renamed");
    const expected = new Set(["Feeblemind", "Branding Smite", "Summon Draconic Spirit"]);
    expect(new Set(renamed.map((s) => s.old2014EngName))).toEqual(expected);
  });

  it("does not include Blade of Disaster (name-matches 2014 but its 2024 wiki page is Forgotten Realms, not PHB)", () => {
    expect(spells.some((s) => s.engName === "Blade of Disaster")).toBe(false);
  });

  it("no translated description contains an unresolved term/spell marker", () => {
    const raw = readFileSync(join(NORMALIZED_DIR, "spells.json"), "utf-8");
    expect(raw.includes("⚠️")).toBe(false);
    expect(raw.includes("NEEDS-TERM-DECISION")).toBe(false);
    expect(raw.includes("NEEDS-SPELL-TRANSLATION")).toBe(false);
  });

  /// Прози тут не буває з розміткою — крім якоря на заклинання, який ставить проставляч O25
  /// (KR25.4). Його знімає `stripSpellAnchors`, тож будь-який інший тег і далі валить гейт.
  it("no description leaks raw HTML tags beyond the spell anchor (normalized data is otherwise plain text)", () => {
    for (const s of spells) {
      expect(/<[a-zA-Z/][^>]*>/.test(stripSpellAnchors(s.description)), s.engName).toBe(false);
    }
  });
});

describe("KR6.2 Phase 4 — magic item catalog: scraped and classified", () => {
  const VALID_ITEM_TYPES = [
    "WEAPON",
    "ARMOR",
    "WONDROUS_ITEM",
    "POTION",
    "SCROLL",
    "RING",
    "WAND",
    "ROD",
    "STAFF",
  ];
  const VALID_RARITIES = ["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "LEGENDARY", "ARTIFACT"];

  type MagicItemRecord = {
    ruleset: string;
    engName: string;
    name: string | null;
    wikiSlug: string;
    itemType: string;
    rarity: string | null;
    bundlesMultipleVariants: boolean;
    requiresAttunement: boolean;
    descriptionEng: string;
    description: string | null;
    translationStatus: string;
    source: string;
    splitFromEngName?: string;
  };

  const magicItems = readJson("magic-items.json") as MagicItemRecord[];

  it("has exactly 445 records (350 scraped DMG/PHB pages, 19 of which bundled multiple rarity variants and were split into 114 standalone records: 350 - 19 + 114 = 445)", () => {
    expect(magicItems.length).toBe(445);
  });

  it("no record bundles multiple rarity variants anymore — every bundled page was split into standalone records", () => {
    for (const item of magicItems) {
      expect(item.bundlesMultipleVariants, item.engName).toBe(false);
    }
  });

  it("every item has a valid itemType and a valid rarity", () => {
    for (const item of magicItems) {
      expect(VALID_ITEM_TYPES, item.engName).toContain(item.itemType);
      expect(VALID_RARITIES, item.engName).toContain(item.rarity);
    }
  });

  it("source is DMG_2024 for all but the one confirmed PHB reprint (base-tier Potion of Healing)", () => {
    const nonDmg = magicItems.filter((i) => i.source !== "DMG_2024");
    expect(nonDmg.map((i) => i.engName)).toEqual(["Potion of Healing"]);
    expect(nonDmg[0].source).toBe("PHB_2024");
  });

  it("every record has a non-empty raw English description (audit trail for the translation)", () => {
    for (const item of magicItems) {
      expect(item.descriptionEng, item.engName).toBeTruthy();
    }
  });

  it("114 records trace back to exactly 19 unique bundled source pages via splitFromEngName", () => {
    const split = magicItems.filter((i) => i.splitFromEngName);
    expect(split.length).toBe(114);
    expect(new Set(split.map((i) => i.splitFromEngName)).size).toBe(19);
  });
});

describe("KR6.2 Phase 5 — full magic item catalog translation", () => {
  type MagicItemRecord = {
    engName: string;
    name: string | null;
    description: string | null;
    translationStatus: string;
  };

  const magicItems = readJson("magic-items.json") as MagicItemRecord[];

  it("every record is marked fully translated with a non-empty name and description", () => {
    for (const item of magicItems) {
      expect(item.translationStatus, item.engName).toBe("fully translated");
      expect(item.name, item.engName).toBeTruthy();
      expect(item.description, item.engName).toBeTruthy();
    }
  });

  it("every name follows the 'Українська назва [English Name]' format, preserving the exact engName in brackets (a trailing ' +N' bonus suffix may sit outside the brackets, matching 2014 seed style)", () => {
    for (const item of magicItems) {
      const name = item.name as string;
      const plusSuffixMatch = /^(.*) (\+\d)$/.exec(item.engName);
      if (plusSuffixMatch) {
        const [, base, suffix] = plusSuffixMatch;
        const matchesTrailingSuffix = name.includes(`[${item.engName}]`);
        const matchesOutsideSuffix = name.includes(`[${base}]`) && name.trimEnd().endsWith(suffix);
        expect(matchesTrailingSuffix || matchesOutsideSuffix, item.engName).toBe(true);
      } else {
        expect(name, item.engName).toContain(`[${item.engName}]`);
      }
    }
  });

  it("no translated description leaks raw HTML tags beyond the spell anchor", () => {
    for (const item of magicItems) {
      expect(/<[a-zA-Z/][^>]*>/.test(stripSpellAnchors(item.description as string)), item.engName).toBe(false);
    }
  });

  it("no translated description leaks English d4/d6/d20-style dice notation", () => {
    for (const item of magicItems) {
      expect(/\d+d\d+/.test(item.description as string), item.engName).toBe(false);
    }
  });

  it("no translated description contains an unresolved term/spell marker", () => {
    const raw = readFileSync(join(NORMALIZED_DIR, "magic-items.json"), "utf-8");
    expect(raw.includes("⚠️")).toBe(false);
    expect(raw.includes("NEEDS-TERM-DECISION")).toBe(false);
    expect(raw.includes("NEEDS-SPELL-TRANSLATION")).toBe(false);
  });

  it("every new Phase-5 concept term (Obscured states, Bastion, Sentience, Random Properties) resolves to dictionary.json", () => {
    const dictionary = JSON.parse(
      readFileSync(join(process.cwd(), "src/lib/refs/dictionary.json"), "utf-8"),
    ) as { DND_DICTIONARY: { rules2024: { coreConceptTerms: Record<string, string> } } };
    const terms = dictionary.DND_DICTIONARY.rules2024.coreConceptTerms;
    for (const key of ["lightlyObscured", "heavilyObscured", "bastion", "sentience", "randomProperties"]) {
      expect(terms[key], key).toBeTruthy();
    }
  });
});
