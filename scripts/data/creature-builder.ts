import { GeneratedCreature } from "../generate-creatures";
import { keepFilled } from "../lib/keep-filled";

export function createCreature(
  creatureId: number,
  name: string,
  nameEng: string,
  size: string,
  type: string,
  alignment: string,
  source: string,
  ac: string,
  hp: string,
  speed: string,
  stats: [number, number, number, number, number, number],
  challenge: string,
  xp: string,
  meta: {
    skills?: string;
    senses?: string;
    languages?: string;
    damageImmunity?: string;
    damageResistance?: string;
    damageVulnerability?: string;
    conditionImmunity?: string;
    savingThrows?: string;
    specialAbilities?: string;
    actions?: string;
    reactions?: string;
    legendaryActions?: string;
    proficiencyBonus?: string;
    description?: string;
    lairActions?: string;
    lairInfo?: string;
    regionEffects?: string;
    ruleset?: "RULES_2014" | "RULES_2024";
    initiative?: string;
    gear?: string;
    bonusActions?: string;
    xpInLair?: string;
    imageUrl?: string;
    mythicInfo?: string;
    mythicActions?: string;
  }
): GeneratedCreature {
  const formatStat = (val: number) => {
    const mod = Math.floor((val - 10) / 2);
    const sign = mod >= 0 ? `+${mod}` : `${mod}`;
    return `${val} (${sign})`;
  };

  return {
    creatureId,
    name,
    nameEng,
    size,
    type,
    alignment,
    source,
    ac,
    hp,
    speed,
    strength: formatStat(stats[0]),
    dexterity: formatStat(stats[1]),
    constitution: formatStat(stats[2]),
    intelligence: formatStat(stats[3]),
    wisdom: formatStat(stats[4]),
    charisma: formatStat(stats[5]),
    skills: meta.skills || "",
    senses: meta.senses || "пасивна Уважність 10",
    languages: meta.languages || "—",
    challenge,
    damageImmunity: meta.damageImmunity || "",
    damageResistance: meta.damageResistance || "",
    conditionImmunity: meta.conditionImmunity || "",
    savingThrows: meta.savingThrows || "",
    specialAbilities: meta.specialAbilities || "",
    actions: meta.actions || "",
    reactions: meta.reactions || "",
    legendaryActions: meta.legendaryActions || "",
    proficiencyBonus: meta.proficiencyBonus || "+2",
    description: meta.description || "",
    lairActions: meta.lairActions || "",
    lairInfo: meta.lairInfo || "",
    regionEffects: meta.regionEffects || "",
    xp,
    ruleset: meta.ruleset || "RULES_2014",
    ...keepFilled({
      initiative: meta.initiative,
      gear: meta.gear,
      bonusActions: meta.bonusActions,
      damageVulnerability: meta.damageVulnerability,
      xpInLair: meta.xpInLair,
      imageUrl: meta.imageUrl,
      mythicInfo: meta.mythicInfo,
      mythicActions: meta.mythicActions,
    }),
  };
}
