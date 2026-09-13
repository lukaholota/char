/**
 * KR31.3 — числа використань і тип дії рис персонажа 2024 у файлі-джерелі мусять дорівнювати
 * джерелу.
 *
 * Витяг читає локальні сторінки `data/2024/source/raw/feat/*.html` — вони покривають усі 75 рис,
 * тоді як SRD 5.2 (`data/2024/srd/feats.md`) описує 17. Ті 17 править тут за **друге, незалежне**
 * читання: гейт розбирає їх власним кодом і вимагає, щоб лічильники збіглися.
 *
 * Носій лічильника — не риса, а її **перевага**: у базі це окрема фіча `<Риса>: <Перевага> (2024)`
 * на `Feat.grantsFeature`, бо колонок використань у `feat` немає.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readFeatSources } from "../../scripts/2024/parse-feats";
import { extractFeatMechanics2024, FEATS_WITHOUT_A_COUNTER } from "../../scripts/2024/feat-uses";
import { applyMechanicsToFeats, FEATS_JSON } from "../../scripts/2024/parse-feat-uses";

type BenefitJson = { name: string; description: string; displayType?: string[]; uses?: Record<string, unknown> };
type FeatJson = { engName: string; name: string; benefitsEng?: BenefitJson[]; benefits?: BenefitJson[] };

const featsFromFile: FeatJson[] = JSON.parse(readFileSync(join(process.cwd(), FEATS_JSON), "utf-8"));

function listCarriers(): string[] {
  return featsFromFile
    .flatMap((feat) => (feat.benefitsEng ?? []).map((benefit) => ({ feat, benefit })))
    .filter(({ benefit }) => benefit.uses)
    .map(({ feat, benefit }) => `${feat.engName}: ${benefit.name} → ${JSON.stringify(benefit.uses)}`)
    .sort();
}

/// Друге читання: риси SRD розбором курсивних заголовків `_Benefit._` під `#### Feat`.
function readFeatsFromSrd(): Array<{ engName: string; descriptionEng: string; benefits: Array<{ name: string; descriptionEng: string }> }> {
  const srd = readFileSync(join(process.cwd(), "data/2024/srd/feats.md"), "utf-8");
  const feats: Array<{ engName: string; lines: string[] }> = [];

  for (const line of srd.split("\n")) {
    const featHeading = /^#### (.+)$/.exec(line);
    if (featHeading) feats.push({ engName: featHeading[1].trim(), lines: [] });
    else if (feats.length) feats[feats.length - 1].lines.push(line);
  }

  return feats.map(({ engName, lines }) => {
    const benefits: Array<{ name: string; descriptionEng: string }> = [];
    for (const line of lines) {
      const benefitHeading = /^_([^_]+)\._ ?(.*)$/.exec(line);
      if (benefitHeading) benefits.push({ name: benefitHeading[1].trim(), descriptionEng: benefitHeading[2] });
      else if (benefits.length) benefits[benefits.length - 1].descriptionEng += `\n${line}`;
    }
    return { engName, descriptionEng: lines.join("\n"), benefits };
  });
}

describe("числа використань рис персонажа 2024", () => {
  it("файл-джерело дорівнює витягу з сирих сторінок", () => {
    const rebuilt = applyMechanicsToFeats(
      structuredClone(featsFromFile),
      extractFeatMechanics2024(readFeatSources()),
    );

    expect(JSON.stringify(rebuilt, null, 2)).toBe(JSON.stringify(featsFromFile, null, 2));
  });

  it("носіїв ресурсу рівно стільки, скільки дає джерело", () => {
    expect(listCarriers()).toEqual([
      'Boon Of Fate: Improve Fate → {"limitedUsesPer":"SHORT_REST","usesCount":1}',
      'Boon Of Recovery: Last Stand → {"limitedUsesPer":"LONG_REST","usesCount":1}',
      'Fey Touched: Fey Magic → {"limitedUsesPer":"LONG_REST","usesCount":2}',
      'Lucky: Luck Points → {"limitedUsesPer":"LONG_REST","usesCountDependsOnProficiencyBonus":true}',
      'Mage Slayer: Guarded Mind → {"limitedUsesPer":"SHORT_REST","usesCount":1}',
      'Ritual Caster: Quick Ritual → {"limitedUsesPer":"LONG_REST","usesCount":1}',
      'Shadow Touched: Shadow Magic → {"limitedUsesPer":"LONG_REST","usesCount":2}',
      'Telepathic: Detect Thoughts → {"limitedUsesPer":"LONG_REST","usesCount":1}',
    ]);
  });

  it("Щасливчик рахує очки удачі бонусом майстерності, як каже книга", () => {
    const source = readFeatSources().find((feat) => feat.engName === "Lucky")!;
    expect(source.descriptionEng).toContain("You have a number of Luck Points equal to your Proficiency Bonus");
    expect(source.descriptionEng).toContain("You regain your expended Luck Points when you finish a Long Rest");

    const benefit = featsFromFile
      .find((feat) => feat.engName === "Lucky")!
      .benefitsEng!.find((candidate) => candidate.name === "Luck Points")!;

    expect(benefit.uses).toEqual({ limitedUsesPer: "LONG_REST", usesCountDependsOnProficiencyBonus: true });
  });

  it("SRD 5.2 дає ті самі лічильники для рис, які в ньому є", () => {
    const fromSrd = readFeatsFromSrd();
    expect(fromSrd.map((feat) => feat.engName)).toContain("Boon of Fate");

    const srdCarriers = extractFeatMechanics2024(fromSrd)
      .map((row) => `${row.featEngName}: ${row.benefitName} → ${JSON.stringify(row.uses)}`)
      .sort();

    // Із 17 рис SRD лічильник несе рівно одна: решта або пасивні, або виведені у виняток.
    expect(srdCarriers).toEqual(['Boon of Fate: Improve Fate → {"limitedUsesPer":"SHORT_REST","usesCount":1}']);

    // `feats.json` пише «Boon Of Fate», SRD — «Boon of Fate»; порівнюємо без цієї друкарні.
    const fileCarriers = listCarriers()
      .filter((line) => srdCarriers.some((srd) => srd.toLowerCase() === line.toLowerCase()))
      .map((line) => line.toLowerCase());

    expect(srdCarriers.map((line) => line.toLowerCase())).toEqual(fileCarriers);
  });

  it("риса, якій книга дає число, а прохід його не пише, стоїть у переліку винятків із причиною", () => {
    expect(Object.entries(FEATS_WITHOUT_A_COUNTER)).toEqual([
      [
        "Magic Initiate|Level 1 Spell",
        "лічильник уже стоїть на трьох фічах списків «Magic Initiate: X list (2024)» ([Р38], KR27.5) — другий носій показав би те саме двічі",
      ],
    ]);

    const magicInitiate = featsFromFile.find((feat) => feat.engName === "Magic Initiate")!;
    expect(magicInitiate.benefitsEng!.filter((benefit) => benefit.uses)).toEqual([]);
  });

  it("носій має український текст під тим самим індексом, що й англійський", () => {
    const withoutUkrainian = featsFromFile
      .flatMap((feat) => (feat.benefitsEng ?? []).map((benefit, index) => ({ feat, benefit, index })))
      .filter(({ benefit }) => benefit.uses)
      .filter(({ feat, index }) => !feat.benefits?.[index]?.name || !feat.benefits[index].description)
      .map(({ feat, benefit }) => `${feat.engName}: ${benefit.name}`);

    expect(withoutUkrainian).toEqual([]);
  });

  it("носій показується як ресурс класу, і тільки він", () => {
    const asResource = featsFromFile
      .flatMap((feat) => (feat.benefitsEng ?? []).map((benefit) => ({ feat, benefit })))
      .filter(({ benefit }) => benefit.displayType?.includes("CLASS_RESOURCE"))
      .map(({ feat, benefit }) => `${feat.engName}: ${benefit.name}`)
      .sort();

    expect(asResource).toEqual(listCarriers().map((line) => line.split(" → ")[0]));
  });
});
