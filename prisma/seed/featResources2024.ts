/**
 * KR31.3 — ресурси рис персонажа 2024: `Lucky` та решта рис, яким книга дає лічильник.
 *
 * У `feat` колонок використань немає й не буде: лічильник живе на `feature`, яку риса дає через
 * `Feat.grantsFeature`. Тим самим шляхом уже їдуть бойові стилі й числові надання KR31.4, тож
 * назва носія тримає ту саму форму — `<Риса>: <Перевага> (2024)`. Взявши рису, персонаж дістає
 * рядок `pers_feature` (`levelup-persistence.ts`, `character-creation.ts`), і саме з нього лист
 * малює лічильник, витрата його зменшує, а відпочинок повертає.
 *
 * Джерело чисел — `data/2024/normalized/feats.json`, поле `uses` названої переваги; туди їх
 * кладе `scripts/2024/parse-feat-uses.ts` зі сторінок `data/2024/source/raw/feat/`. Український
 * текст носія береться з тієї ж переваги у `benefits[]`, тому тут не коіновано жодного терміна.
 */

import { FeatureDisplayType, Prisma, PrismaClient, RestType, Ruleset } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RULESET: Ruleset = "RULES_2024";

type BenefitUses2024 = {
  limitedUsesPer?: keyof typeof RestType;
  usesCount?: number;
  usesCountSpecial?: unknown;
  usesCountDependsOnProficiencyBonus?: true;
};

type Benefit2024 = { name: string; description: string; uses?: BenefitUses2024; displayType?: string[] };
type Feat2024 = { engName: string; name: string; benefitsEng?: Benefit2024[]; benefits?: Benefit2024[] };

/**
 * KR31.5 — заклинання, які перевага риси називає поіменно й дає завжди підготовленими. Лічильник
 * безкоштовних застосувань уже стоїть на тому самому носії (Р38), тож звʼязок лягає туди ж.
 */
const BENEFIT_SPELLS_2024: Readonly<Record<string, readonly string[]>> = {
  // «You always have that spell and the Misty Step spell prepared.»
  "Fey Touched: Fey Magic (2024)": ["Misty Step"],
  // «You always have that spell and the Invisibility spell prepared.»
  "Shadow Touched: Shadow Magic (2024)": ["Invisibility"],
  // «You always have the Detect Thoughts spell prepared.»
  "Telepathic: Detect Thoughts (2024)": ["Detect Thoughts"],
};

type FeatResource = {
  featEngName: string;
  featureEngName: string;
  name: string;
  description: string;
  displayType: FeatureDisplayType[];
  uses: BenefitUses2024;
};

export const seedFeatResources2024 = async (prisma: PrismaClient) => {
  const resources = collectFeatResources(readFeats2024());
  console.log(`🍀 Ресурси рис 2024: ${resources.length} носіїв…`);

  for (const resource of resources) {
    await grantResourceFeatureToFeat(prisma, resource);
  }

  console.log(`✅ Ресурси рис 2024 на місці`);
};

function readFeats2024(): Feat2024[] {
  return JSON.parse(readFileSync(join(process.cwd(), "data/2024/normalized/feats.json"), "utf-8"));
}

/**
 * Перевага з лічильником — англійська, бо саме її бачить витяг; український текст стоїть під тим
 * самим індексом у `benefits[]`, як і в підкласах (`features` / `featuresEng`).
 */
function collectFeatResources(feats: Feat2024[]): FeatResource[] {
  return feats.flatMap((feat) =>
    (feat.benefitsEng ?? []).flatMap((benefitEng, index) => {
      if (!benefitEng.uses) return [];

      const benefit = feat.benefits?.[index];
      if (!benefit) throw new Error(`${feat.engName}: перевага «${benefitEng.name}» не має українського відповідника.`);

      return [
        {
          featEngName: feat.engName,
          featureEngName: `${findEnglishTitleCase(feat.engName)}: ${benefitEng.name} (2024)`,
          name: `${feat.name}: ${benefit.name}`,
          description: benefit.description,
          displayType: readDisplayTypes(benefitEng.displayType),
          uses: benefitEng.uses,
        },
      ];
    }),
  );
}

/// `feats.json` пише «Boon Of Fate», а носії KR31.4 у базі — «Boon of Fortitude: …». Зводимо до другого.
function findEnglishTitleCase(engName: string): string {
  return engName.replace(/\bOf\b/g, "of");
}

function readDisplayTypes(names: string[] | undefined): FeatureDisplayType[] {
  return (names ?? [FeatureDisplayType.PASSIVE]).map((name) => {
    if (!(name in FeatureDisplayType)) throw new Error(`Невідомий тип дії 2024: ${name}`);
    return FeatureDisplayType[name as keyof typeof FeatureDisplayType];
  });
}

async function grantResourceFeatureToFeat(prisma: PrismaClient, resource: FeatResource) {
  const feat = await prisma.feat.findFirst({
    where: { ruleset: RULESET, engName: resource.featEngName },
    select: { featId: true },
  });
  if (!feat) {
    console.warn(`  ⚠️ Риси "${resource.featEngName}" (2024) немає в базі — спершу запусти seedFeats2024`);
    return;
  }

  const data = {
    name: resource.name,
    description: resource.description,
    shortDescription: resource.name,
    displayType: resource.displayType,
    ruleset: RULESET,
    limitedUsesPer: resource.uses.limitedUsesPer ? RestType[resource.uses.limitedUsesPer] : null,
    usesCount: resource.uses.usesCount ?? null,
    usesCountSpecial: (resource.uses.usesCountSpecial as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
    usesCountDependsOnProficiencyBonus: resource.uses.usesCountDependsOnProficiencyBonus ?? false,
  };

  const feature = await prisma.feature.upsert({
    where: { engName: resource.featureEngName },
    update: data,
    create: { ...data, engName: resource.featureEngName },
  });

  await prisma.feat.update({
    where: { featId: feat.featId },
    data: { grantsFeature: { connect: { featureId: feature.featureId } } },
  });
  await connectBenefitSpells(prisma, feature.featureId, BENEFIT_SPELLS_2024[resource.featureEngName] ?? []);

  console.log(`  • ${resource.featureEngName}`);
}

async function connectBenefitSpells(prisma: PrismaClient, featureId: number, spellEngNames: readonly string[]) {
  if (!spellEngNames.length) return;

  const spells = await prisma.spell.findMany({
    where: { ruleset: RULESET, engName: { in: [...spellEngNames] } },
    select: { spellId: true },
  });
  if (spells.length !== spellEngNames.length) {
    throw new Error(`Заклинань 2024 бракує в базі: ${spellEngNames.join(", ")} — знайдено ${spells.length}`);
  }

  await prisma.feature.update({
    where: { featureId },
    data: { givesSpells: { set: spells.map((spell) => ({ spellId: spell.spellId })) } },
  });
}
