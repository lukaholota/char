import { readFileSync } from "node:fs";
import { Classes, Feats, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent } from "@/server/db/creator-content-query";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { ManualLevelStep } from "./assembly-manual-path";

export type AssemblyScenario = {
  buildId: string;
  targetLevel: number;
  buildStart: () => Promise<PersFormData>;
  manualSteps: ManualLevelStep[];
};

export function readRecipeFile(buildId: string) {
  return buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${buildId}.json`, "utf8")));
}

export async function buildPresetStart(slug: string, name: string): Promise<PersFormData> {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
  return { ...buildReadyPresetDraft(readRecipeFile(preset.buildId), preset, content), name };
}

export const barbarianScenario: AssemblyScenario = {
  buildId: "build-barbarian-berserker-2014",
  targetLevel: 5,
  buildStart: () => buildPresetStart("barbarian-berserker-2014", "Берсерк"),
  manualSteps: [
    { className: Classes.BARBARIAN_2014 },
    { className: Classes.BARBARIAN_2014, subclass: Subclasses.PATH_OF_THE_BERSERKER },
    { className: Classes.BARBARIAN_2014, abilityScoreIncrease: [{ ability: "STR", value: 2 }] },
    { className: Classes.BARBARIAN_2014 },
  ],
};

export const wizardScenario: AssemblyScenario = {
  buildId: "build-wizard-evocation-2014",
  targetLevel: 5,
  buildStart: () => buildPresetStart("wizard-evocation-2014", "Втілення"),
  manualSteps: [
    { className: Classes.WIZARD_2014, subclass: Subclasses.SCHOOL_OF_EVOCATION, spellbookNames: ["Identify", "Shield"] },
    { className: Classes.WIZARD_2014, spellbookNames: ["Scorching Ray", "Shatter"] },
    { className: Classes.WIZARD_2014, abilityScoreIncrease: [{ ability: "INT", value: 2 }], cantripNames: ["Fire Bolt"], spellbookNames: ["Flaming Sphere", "Misty Step"] },
    { className: Classes.WIZARD_2014, spellbookNames: ["Fireball", "Fly"] },
  ],
};

export const druidScenario: AssemblyScenario = {
  buildId: "build-druid-dreams-githzerai-2014",
  targetLevel: 7,
  buildStart: () => buildPresetStart("druid-dreams-githzerai-2014", "Ґрат"),
  manualSteps: [],
};

export const sorcadinScenario: AssemblyScenario = {
  buildId: "build-sorcadin-clockwork-2014",
  targetLevel: 7,
  buildStart: () => buildPresetStart("sorcadin-clockwork-2014", "Соркадін"),
  manualSteps: [
    { className: Classes.PALADIN_2014, classOptionNames: ["Dueling"] },
    { className: Classes.PALADIN_2014, subclass: Subclasses.OATH_OF_REDEMPTION },
    { className: Classes.SORCERER_2014, isMulticlass: true, subclass: Subclasses.CLOCKWORK_SOUL, cantripNames: ["Booming Blade", "Mage Hand", "Mind Sliver", "Prestidigitation"], knownSpellNames: ["Silvery Barbs", "Magic Missile"] },
    { className: Classes.SORCERER_2014, knownSpellNames: ["Shield"] },
    { className: Classes.SORCERER_2014, classOptionNames: ["Heightened Spell", "Quickened Spell"], knownSpellNames: ["Misty Step"] },
    { className: Classes.SORCERER_2014, featName: Feats.WAR_CASTER, cantripNames: ["Sword Burst"], knownSpellNames: ["Absorb Elements"] },
  ],
};
