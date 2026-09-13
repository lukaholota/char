import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSubclassSources } from "../../scripts/2024/parse-subclasses";
import { getBastionFacilityBySlug } from "@/lib/bastionsData";
import {
  listBastionFacilitiesGrantingHeroicInspiration,
  listFeaturesGrantingHeroicInspirationOnLongRest,
} from "@/rules/heroic-inspiration";

/**
 * Реєстри в `src/rules/heroic-inspiration.ts` мусять дорівнювати корпусу 2024: інакше новий
 * носій речення про довгий відпочинок мовчки лишиться без натхнення, а нове приміщення —
 * без підказки. Корпус читається незалежно від реєстру — це звірка, а не його повторний виклик.
 */
const NORMALIZED_DIR = join(process.cwd(), "data/2024/normalized");
const GRANTS_ON_LONG_REST = /You gain Heroic Inspiration whenever you finish a Long Rest/;
const MENTIONS_HEROIC_INSPIRATION = /Heroic Inspiration/;

type CorpusMention = { file: string; owner: string; text: string };

/// `subclasses.json` англійського тексту фіч не несе — його читають сирі сторінки підкласів,
/// тим самим читачем, що й гейт «одне використання на короткому відпочинку».
function collectMentions(pattern: RegExp): CorpusMention[] {
  const normalized = readdirSync(NORMALIZED_DIR)
    .filter((name) => name.endsWith(".json"))
    .flatMap((file) => {
      const found: CorpusMention[] = [];
      walk(JSON.parse(readFileSync(join(NORMALIZED_DIR, file), "utf8")), [], (owner, text) => {
        if (pattern.test(text)) found.push({ file, owner, text });
      });
      return found;
    });
  const subclassSources = readSubclassSources().flatMap((subclass) =>
    subclass.featuresEng
      .filter((feature) => pattern.test(feature.descriptionEng))
      .map((feature) => ({ file: "subclasses (source)", owner: `${subclass.engName} → ${feature.name}`, text: feature.descriptionEng })),
  );
  return [...normalized, ...subclassSources];
}

/// Мітка носія — ланцюжок імен предків: вид → риса, клас → фіча, приміщення.
function walk(node: unknown, owners: string[], onText: (owner: string, text: string) => void): void {
  if (typeof node === "string") {
    onText(owners.join(" → "), node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walk(item, owners, onText);
    return;
  }
  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    const own = [record.slug, record.engName, record.nameEng].find((value) => typeof value === "string") as string | undefined;
    const nextOwners = own ? [...owners, own] : owners;
    for (const [key, value] of Object.entries(record)) {
      if (key === "descriptionEng" || key === "description" || key === "text" || key === "textEng") walk(value, nextOwners, onText);
      else if (typeof value !== "string") walk(value, nextOwners, onText);
    }
  }
}

function toFeatureEngName(mention: CorpusMention): string {
  return `${mention.owner.replace(" → ", ": ")} (2024)`;
}

describe("Героїчне натхнення 2024 — реєстри дорівнюють корпусу", () => {
  it("носії речення про довгий відпочинок — це реєстр правила, і поки що це лише Людина", () => {
    const carriers = collectMentions(GRANTS_ON_LONG_REST);

    expect(carriers.map(toFeatureEngName).sort()).toEqual(listFeaturesGrantingHeroicInspirationOnLongRest().sort());
    expect(carriers).toEqual([expect.objectContaining({ file: "species.json", owner: "Human → Resourceful" })]);
  });

  it("SRD читається незалежно й називає того самого носія", () => {
    const srd = readFileSync(join(process.cwd(), "data/2024/srd/character-origins.md"), "utf8");
    const carriers: string[] = [];
    let species = "";
    for (const line of srd.split("\n")) {
      const heading = /^#### (.+)$/.exec(line);
      if (heading) species = heading[1].trim();
      const trait = /^_([^_]+)\._ (.+)$/.exec(line);
      if (species && trait && GRANTS_ON_LONG_REST.test(trait[2])) carriers.push(`${species}: ${trait[1]} (2024)`);
    }

    expect(carriers).toEqual(listFeaturesGrantingHeroicInspirationOnLongRest());
  });

  /**
   * Решта згадок у корпусі — це не тригери застосунку: Героїчний воїн Чемпіона дає натхнення на
   * початку ходу в бою (гравець вмикає з листа), Музикант роздає його союзникам. Новий запис
   * тут — сигнал переглянути, чи не потрібен ще один тригер, а не помилка корпусу.
   */
  it("інші згадки натхнення в корпусі відомі поіменно", () => {
    const others = collectMentions(MENTIONS_HEROIC_INSPIRATION)
      .filter((mention) => !GRANTS_ON_LONG_REST.test(mention.text))
      .map((mention) => `${mention.file}: ${mention.owner}`);

    expect([...new Set(others)].sort()).toEqual([
      "bastion-facilities.json: lords-alliance-noble-residence",
      "bastion-facilities.json: seance-parlor",
      "bastion-facilities.json: workshop",
      "feats.json: Musician",
      "subclasses (source): Champion → Heroic Warrior",
    ]);
  });

  it("приміщення бастіону з натхненням — це реєстр підказок, і кожне є в каталозі застосунку", () => {
    const facilities = collectMentions(/you gain Heroic Inspiration/)
      .filter((mention) => mention.file === "bastion-facilities.json")
      .map((mention) => mention.owner);

    expect([...new Set(facilities)].sort()).toEqual(listBastionFacilitiesGrantingHeroicInspiration().sort());
    for (const slug of listBastionFacilitiesGrantingHeroicInspiration()) {
      expect(getBastionFacilityBySlug(slug)?.slug, slug).toBe(slug);
    }
  });
});
