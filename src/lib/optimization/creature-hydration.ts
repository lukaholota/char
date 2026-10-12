import { getAllCreatures, type CreatureData } from "@/lib/bestiaryData";
import { toEntitySlug } from "@/lib/slug-utils";
import { findGlossaryMarkers, stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import type { ContentReference, OptimizationRuleset } from "./types";
import type { HydrationTarget } from "./content-hydration";

const CREATURE_ACTION_ALIASES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  "Bearded Devil": { Beard: ["Bearded Devil's Poison"] },
  "Bone Naga": { Bite: ["Bone Naga Venom"] },
  Chuul: { Tentacles: ["Chuul Poison"] },
  "Corpse Flower": { Tentacle: ["Corpse Flower Poison"], "Stench of Death": ["Corpse Flower Stench"] },
  Drider: { Bite: ["Drider Venom"] },
  "Drow Arachnomancer": { "Poisonous Touch": ["Drow Arachnomancer's Touch"] },
  "Flying Snake": { Bite: ["Flying Snake Venom"] },
  Geryon: { Stinger: ["Geryon's Sting"] },
  "Giant Centipede": { Bite: ["Giant Centipede Poison"] },
  "Giant Scorpion": { Sting: ["Giant Scorpion Poison"] },
  "Giant Spider": { Bite: ["Giant Spider Poison"] },
  "Giant Toad": { Bite: ["Giant Toad Poison"] },
  "Giant Wasp": { Sting: ["Giant Wasp Poison"] },
  "Giant Wolf Spider": { Bite: ["Giant Wolf Spider Poison"] },
  "Green Abishai": { "Fiendish Claw": ["Green Abishai's Claw"] },
  Grell: { Tentacles: ["Grell Poison"] },
  Grung: { "Poisonous Skin": ["Grung Poison"] },
  "Guardian Naga": { "Spit Poison": ["Guardian Naga's Poison"] },
  "Phase Spider": { Bite: ["Phase Spider Poison"] },
  "Poisonous Snake": { Bite: ["Poisonous Snake Venom"] },
  Scorpion: { Sting: ["Scorpion Poison"] },
  Spider: { Bite: ["Spider Poison"] },
  "Sea Spawn": { "Piscine Anatomy": ["Sea Spawn's Poison Quills"] },
  Tlincalli: { Sting: ["Tlincalli's Bite"] },
  Yochlol: { Slam: ["Yochlol's Poison"] },
  "Yuan-ti Abomination": { Bite: ["Yuan-ti Abomination's Poison"] },
  "Yuan-ti Anathema": { "Flurry of Bites": ["Yuan-ti Anathema's Poison"] },
  "Yuan-ti Mind Whisperer": { Bite: ["Yuan-ti Mind Whisperer's Poison"] },
  "Yuan-ti Pit Master": { Bite: ["Yuan-ti Pit Master's Poison"] },
  Bulezau: { "Barbed Tail": ["Bulezau's Barbs"] },
  Mummy: { "Rotting Fist": ["Mummy Rot"] },
  Orcus: { Tail: ["Orcus' Poison"] },
  Quasit: { Claws: ["Quasit's Claw"] },
  Shoosuva: { "Tail Stinger": ["Shoosiva's Sting"] },
  Zuggtmoy: { Pseudopod: ["Zuggtmoy's Poison"] },
  "Iron Golem": { "Poison Breath": ["Iron Golem Breath"] },
  Juiblex: { Foul: ["Jubilex's Foul"] },
  Otyugh: { Bite: ["Otyug's Bite"] },
  Kraken: { "Ink Cloud": ["Kraken's Ink"] },
  Wastrilith: { "Corrupt Water": ["Wrastilith's Foul Water"] },
};

const STAT_FIELDS = [
  ["Розмір", "size"], ["Тип", "type"], ["Світогляд", "alignment"],
  ["КБ", "ac"], ["Очки здоровʼя", "hp"], ["Швидкість", "speed"],
  ["Сила", "strength"], ["Спритність", "dexterity"], ["Статура", "constitution"],
  ["Інтелект", "intelligence"], ["Мудрість", "wisdom"], ["Харизма", "charisma"],
  ["Ряткидки", "savingThrows"], ["Навички", "skills"], ["Чуття", "senses"],
  ["Мови", "languages"], ["Небезпечність", "challenge"], ["Досвід", "xp"], ["Бонус майстерності", "proficiencyBonus"],
  ["Імунітет до шкоди", "damageImmunity"], ["Опір до шкоди", "damageResistance"],
  ["Вразливість до шкоди", "damageVulnerability"],
  ["Імунітет до станів", "conditionImmunity"],
] as const satisfies readonly (readonly [string, keyof CreatureData])[];

const DESCRIPTION_FIELDS = [
  ["Здібності", "specialAbilities"], ["Дії", "actions"], ["Реакції", "reactions"],
  ["Бонусні дії", "bonusActions"], ["Легендарні дії", "legendaryActions"],
  ["Лігво", "lairInfo"], ["Дії лігва", "lairActions"], ["Регіональні ефекти", "regionEffects"],
  ["Міфічні здібності", "mythicInfo"], ["Міфічні дії", "mythicActions"],
] as const satisfies readonly (readonly [string, keyof CreatureData])[];

export function collectCreatureReferences(ruleset: OptimizationRuleset): ContentReference[] {
  const prefix = ruleset === "RULES_2024" ? "/2024" : "";
  return getAllCreatures(ruleset).map((creature) => ({
    kind: "creature", name: creature.name, engName: creature.nameEng,
    href: `${prefix}/bestiary?creature=${toEntitySlug(creature.nameEng)}`,
    details: STAT_FIELDS.flatMap(([label, field]) => creature[field] ? [{ label, value: String(creature[field]) }] : []),
    description: [creature.description, ...DESCRIPTION_FIELDS.flatMap(([title, field]) =>
      creature[field] ? [`<h3>${title}</h3>${creature[field]}`] : [])].filter(Boolean).join("\n\n"),
  }));
}

export function collectCreatureAbilityReferences(ruleset: OptimizationRuleset): ContentReference[] {
  const prefix = ruleset === "RULES_2024" ? "/2024" : "";
  const references = getAllCreatures(ruleset).flatMap((creature) => DESCRIPTION_FIELDS.flatMap(([title, field]) => {
    const content = creature[field];
    if (typeof content !== "string") return [];
    return [...content.matchAll(/<p>\s*<(?:b|strong)>[\s\S]*?(?=<p>\s*<(?:b|strong)>|$)/g)].flatMap(([description]) => {
      const heading = description.match(/^<p>\s*<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/)?.[1];
      if (!heading) return [];
      const markers = findGlossaryMarkers(heading);
      if (markers.length !== 1) return [];
      return [{ kind: "feature" as const, name: stripGlossaryMarkers(heading).replace(/[.:]\s*$/, ""), engName: markers[0].original,
        href: `${prefix}/bestiary?creature=${toEntitySlug(creature.nameEng)}&feature=${toEntitySlug(markers[0].original)}`,
        description, details: [{ label: "Істота", value: creature.name }, { label: "Розділ", value: title }] }];
    });
  }));
  return mergeCreatureAbilityReferences(references);
}

function mergeCreatureAbilityReferences(references: readonly ContentReference[]): ContentReference[] {
  const groups = new Map<string, ContentReference[]>();
  for (const reference of references) groups.set(reference.href, [...(groups.get(reference.href) ?? []), reference]);
  return [...groups.values()].map((variants) => {
    const [first] = variants;
    if (variants.length === 1) return first;
    const descriptions = [...new Set(variants.map((variant) => variant.description))];
    const sections = [...new Set(variants.flatMap((variant) => variant.details).filter((detail) => detail.label === "Розділ").map((detail) => detail.value))];
    return { ...first, name: first.name.replace(/\s*\([^)]*\)$/, ""), description: descriptions.join("\n\n"),
      details: [...first.details.filter((detail) => detail.label !== "Розділ"), { label: "Розділ", value: sections.join(", ") }] };
  });
}

export function collectCreatureAbilityAliases(ruleset: OptimizationRuleset, references: readonly ContentReference[]): HydrationTarget[] {
  const creatureNames = new Map(getAllCreatures(ruleset).map((creature) => [toEntitySlug(creature.nameEng), creature.nameEng]));
  return references.flatMap((reference) => {
    const creatureSlug = new URL(reference.href, "https://local.invalid").searchParams.get("creature");
    const creatureName = creatureNames.get(creatureSlug!);
    if (!creatureName) return [];
    const originals = [`${creatureName}'s ${reference.engName}`, `${creatureName} ${reference.engName}`,
      ...(creatureName.endsWith("s") ? [`${creatureName}' ${reference.engName}`] : []),
      ...(CREATURE_ACTION_ALIASES[creatureName]?.[reference.engName] ?? [])];
    return originals.map((engName) => ({ ...reference, name: `${reference.name} (${creatureName})`, engName, priority: 0 }));
  });
}

export function collectCreatureNameAliases(references: readonly ContentReference[]): HydrationTarget[] {
  const originals: Readonly<Record<string, readonly string[]>> = {
    "Rothé": ["Rothe"], "Deep Rothé": ["Deep Rothe"], "Giant Constrictor Snake": ["Giant Constrictor"],
    "Bore Worm": ["Boreworm"],
    "Star Spawn Larva Mage": ["Star Spawn Larva Mage's Poison"], "Yuan-ti Malison": ["Yuan-ti Malison's Poison"],
    "Myconid Sprout": ["Myconid Poison"], "Myconid Adult": ["Myconid Poison", "Myconid's Euphoria Spores"],
    "Myconid Sovereign": ["Myconid Poison", "Myconid's Euphoria Spores"],
    Grung: ["Blue Grung", "Gold Grung", "Green Grung", "Orange Grung", "Purple Grung", "Red Grung"],
    "Green Dragon Wyrmling": ["Green Dragon Breath"], "Young Green Dragon": ["Green Dragon Breath"],
    "Adult Green Dragon": ["Green Dragon Breath"], "Ancient Green Dragon": ["Green Dragon Breath"],
  };
  return references.flatMap((reference) => (originals[reference.engName] ?? []).map((engName) => ({ ...reference, engName })));
}
