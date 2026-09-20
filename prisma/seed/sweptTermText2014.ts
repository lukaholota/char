import type { PrismaClient, Subclasses } from "@prisma/client";
import { readInfusionFeatureSeedInputs } from "./infusionFeaturesSeed";
import { readRaceFeatureSeedInputs } from "./raceFeatureSeed";
import { readSubclassFeatureSeedInputs } from "./subclassFeatureSeed";
import { readSubclassSeedInputs } from "./subclassSeed";

/// Повні сідери апсертять сотні рядків і переписують привʼязки, а ще тримають ASCII-апостроф
/// там, де база вже має канонічний ʼ — широкий прохід відкотив би зачистку апострофа на
/// 26 фічах. Тому текст їде за білим списком: рівно ті записи 2014, чий текст правила зачистка
/// `radiant` (KR17.5, 2026-09-04) або переклад голих англійських назв заклинань (KR25.5). Записи 2024
/// везуть власні сіди з `data/2024/normalized/`.
const SWEPT_FEATURES_2014 = [
  "Channel Divinity: Radiance of the Dawn",
  "Corona of Light",
  "Divine Strike (Twilight)",
  "Holy Nimbus",
  "Infusion: Resistant Armor",
  "Lunar Empowerment",
  "Radiant Soul (Celestial)",
  "Radiant Sun Bolt",
  "Searing Sunburst",
  "Searing Vengeance",
  "Spirit Projection",
  "Strength of the Grave",
  "Sun Shield",
  "Umbral Form",
  /// Риси рас і драконячих міток: у сіді голі англійські назви заклинань уже переведено
  /// («Ви знаєте Mending» → «Лагодження [Mending]»), у прод текст не їхав (KR25.5, 2026-09-14).
  "Maker's Gift",
  "Magical Detection",
  "Wards and Seals",
  "Shape Shadows",
  "Finder's Magic",
  "Innkeeper's Magic",
  "Healing Touch",
  "Healing Machine",
  "Scribe's Insight",
  "Spellsmith",
  "Magical Passage",
  "Primal Connection",
  "Guardian's Shield",
  /// O35: «очки чародійства» замість «очок метамагії» у підкласах чародія (`Umbral Form` уже вище).
  "Psionic Sorcery",
  "Revelation in Flesh",
  "Warping Implosion",
  "Bastion of Law",
  "Trance of Order",
  "Clockwork Cavalcade",
  "Elemental Affinity",
  "Draconic Presence",
  "Empowered Healing",
  "Lunar Boons",
  "Waxing and Waning",
  "Lunar Phenomenon",
  "Eyes of the Dark",
  "Hound of Ill Omen",
  "Wild Magic Surge",
  "Bend Luck",
] as const;

/// Фанатика тут більше немає: його опис звірено з джерелом і везе `seed:catalog-prose-2014` (KR33.7).
const SWEPT_SUBCLASSES_2014: Subclasses[] = ["WAY_OF_THE_SUN_SOUL"];

/// Назви підкласів 2024 частково збігаються з 2014 (`PATH_OF_THE_ZEALOT` є в обох), тож без
/// редакції запис переписав би опис 2024 текстом 2014.
const SUBCLASS_RULESET = "RULES_2014";

const FEATURE_FIELDS = ["name", "shortDescription", "description"] as const;

export type SweptTextChange = {
  entity: "feature" | "subclass";
  key: string;
  field: string;
};

export async function findSweptTextDrift(prisma: PrismaClient): Promise<SweptTextChange[]> {
  return [...(await findFeatureDrift(prisma)), ...(await findSubclassDrift(prisma))];
}

export async function syncSweptTextFromSeed(prisma: PrismaClient): Promise<SweptTextChange[]> {
  const drift = await findSweptTextDrift(prisma);
  const features = new Map(readSweptFeatures().map((seeded) => [seeded.engName, seeded]));
  const subclasses = new Map(readSweptSubclasses().map((seeded) => [seeded.name, seeded]));

  for (const change of drift) {
    if (change.entity === "feature") {
      const seeded = features.get(change.key);
      if (seeded) {
        await prisma.feature.update({
          where: { engName: change.key },
          data: { [change.field]: seeded[change.field as (typeof FEATURE_FIELDS)[number]] },
        });
      }
      continue;
    }

    const seeded = subclasses.get(change.key as Subclasses);
    if (seeded) {
      await prisma.subclass.updateMany({
        where: { name: change.key as Subclasses, ruleset: SUBCLASS_RULESET },
        data: { description: seeded.description },
      });
    }
  }

  return drift;
}

async function findFeatureDrift(prisma: PrismaClient): Promise<SweptTextChange[]> {
  const drift: SweptTextChange[] = [];

  for (const seeded of readSweptFeatures()) {
    const stored = await prisma.feature.findUnique({
      where: { engName: seeded.engName },
      select: { name: true, shortDescription: true, description: true },
    });
    if (!stored) continue;

    for (const field of FEATURE_FIELDS) {
      if ((stored[field] ?? "") === seeded[field]) continue;
      drift.push({ entity: "feature", key: seeded.engName, field });
    }
  }

  return drift;
}

async function findSubclassDrift(prisma: PrismaClient): Promise<SweptTextChange[]> {
  const drift: SweptTextChange[] = [];

  for (const seeded of readSweptSubclasses()) {
    const stored = await prisma.subclass.findMany({
      where: { name: seeded.name, ruleset: SUBCLASS_RULESET },
      select: { description: true },
    });
    if (stored.some((row) => (row.description ?? "") !== seeded.description)) {
      drift.push({ entity: "subclass", key: seeded.name, field: "description" });
    }
  }

  return drift;
}

function readSweptFeatures(): { engName: string; name: string; shortDescription: string; description: string }[] {
  const swept = new Set<string>(SWEPT_FEATURES_2014);
  const found = [...readSubclassFeatureSeedInputs(), ...readInfusionFeatureSeedInputs(), ...readRaceFeatureSeedInputs()]
    .filter((input) => swept.has(input.engName))
    .map((input) => ({
      engName: input.engName,
      name: input.name,
      shortDescription: String(input.shortDescription ?? ""),
      description: String(input.description ?? ""),
    }));

  if (found.length !== SWEPT_FEATURES_2014.length) {
    const missing = SWEPT_FEATURES_2014.filter((key) => !found.some((input) => input.engName === key));
    throw new Error(`У сідах немає фіч: ${missing.join(", ")}`);
  }

  return found;
}

function readSweptSubclasses(): { name: Subclasses; description: string }[] {
  const swept = new Set<string>(SWEPT_SUBCLASSES_2014);
  const found = readSubclassSeedInputs()
    .filter((input) => swept.has(input.name))
    .map((input) => ({ name: input.name, description: String(input.description ?? "") }));

  if (found.length !== SWEPT_SUBCLASSES_2014.length) {
    const missing = SWEPT_SUBCLASSES_2014.filter((key) => !found.some((input) => input.name === key));
    throw new Error(`У сіді немає підкласів: ${missing.join(", ")}`);
  }

  return found;
}
