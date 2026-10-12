import { findGlossaryMarkers, stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { findPlainEnglishName } from "@/lib/catalogs/reading-target";
import { normalizeContentName, type HydrationTarget } from "./content-hydration";
import type { ContentReference, TranslationRevision } from "./types";
import { collectBlockText } from "./block-text";
import { collectMechanicalReferenceAliases } from "./mechanical-reference-aliases";
import { collectRareReferenceAliases } from "./rare-reference-aliases";

const COMPONENT_PARENTS: Readonly<Record<string, readonly string[]>> = {
  "Celestial Revelation": ["Necrotic Shroud (MPMM)", "Radiant Consumption (MPMM)", "Radiant Soul (MPMM)"],
  "Hadozee Resilience": ["Hadozee Dodge"],
  "Animal Enhancements": ["Animal Enhancement", "Manta Glide", "Nimble Climber", "Underwater Adaptation", "Acid Spit", "Carapace", "Grappling Appendages"],
  "Eldritch Cannon": ["Force Ballista"],
  "Steel Defender": ["Repair"],
  "Diamond Soul": ["Diamond Body"],
  "Shell Armor": ["Natural Armor"],
  "Armor Model": ["Guardian", "Infiltrator", "Thunder Gauntlets", "Lightning Launcher"],
  "Kobold Legacy": ["Defiance", "Draconic Sorcery", "Craftiness"],
  "Minor Conjuration": ["Conjuration Creation"],
  "Storm Aura": ["Environment Choices"],
  "Master Transmuter": ["Major Transformation", "Panacea", "Restore Life", "Restore Youth"],
  "The Third Eye": ["Greater Comprehension"],
  "Genie’s Vessel": ["Bottled Respite", "Genie's Wrath"],
  "Path of the Kensei": ["Kensei’s Shot"],
  "Tokens of the Departed": ["Soul Trinkets"],
  "Wails from the Grave": ["Wail of Souls"],
  "Awakened Mind": ["Telepathic Link"],
  "Instinctive Charm": ["Instinctive Enchantment"],
  "Colossus Slayer (Hunter)": ["Hunter’s Prey: Colossus Slayer"],
  "Channel Divinity: Champion Challenge": ["Champion's Challenge"],
  "Cosmic Omen": ["Weal", "Woe"],
  "Rune Carver": ["Fire Rune (Rune Knight)", "Stone Rune (Rune Knight)", "Hill Rune (Rune Knight)", "Storm Rune (Rune Knight)"],
  "Rune Shaper": ["Rune Magic", "Cloud Rune", "Death Rune", "Dragon Rune", "Enemy Rune", "Fire Rune", "Friend Rune", "Frost Rune", "Hill Rune", "Journey Rune", "King Rune", "Mountain Rune", "Stone Rune", "Storm Rune"],
  "Strike of the Giants": ["Cloud Strike", "Fire Strike", "Frost Strike", "Hill Strike", "Stone Strike", "Storm Strike"],
  Cartomancer: ["Card Tricks", "Hidden Ace"],
  "Cohort of Chaos": ["Chaotic Flare", "Chaotic Flares"],
  Poisoner: ["Poisoner Feat Poison"],
  "Gift of the Metallic Dragon": ["Protective Wings", "Draconic Healing"],
  "Gift of the Chromatic Dragon": ["Reactive Resistance", "Chromatic Infusion"],
  "Gift of the Gem Dragon": ["Telekinetic Reprisal"],
  Telekinetic: ["Telekinetic Shove"],
  "Font of Magic": ["Sorcery Point", "Sorcery Points", "Flexible Casting"],
  "Mystic Arcanum": ["Mystic Arcana"],
  "Eldritch Invocations": ["Eldritch Invocation"],
  "Bardic Inspiration": ["Bardic Inspiration Improvement"],
  "Song of Rest": ["Song of Rest Improvement"],
  "Combat Superiority": ["Superiority Dice", "Maneuvers"],
  "Lunar Embodiment": ["Moon Phase"],
  "Cloak of Shadows (Trickery Domain)": ["Channel Divinity: Cloak of Shadows"],
  "Stunning Strike": ["Stunning Fist"],
  "Blade Flourish": ["Defensive Flourish", "Slashing Flourish", "Mobile Flourish"],
  "Telekinetic Adept": ["Psi-Powered Leap", "Telekinetic Thrust"],
  "Star Map": ["Star Map Focus"],
  "Clockwork Spells": ["Clockwork Magic"],
  "Giant’s Havoc": ["Crushing Throw", "Giant Stature"],
  "Tales from Beyond": ["Clever Animal", "Renowned Duelist", "Beloved Friends", "Runaway", "Avenger", "Traveler", "Beguiler", "Brute", "Tale of the Brute", "Dragon", "Angel", "Phantom", "Mind-Bender"],
  "Primal Companion (Optional)": ["Beast of the Land", "Beast of the Sea", "Beast of the Sky"],
  "Psionic Power (Psi Warrior)": ["Psionic Energy Dice"],
  "Psionic Power (Soulknife)": ["Psionic Energy Dice", "Psychic Energy Dice"],
  "Psionic Power": ["Psionic Energy Dice"],
};
const SCOPED_COMPONENT_PARENTS: Readonly<Record<string, readonly string[]>> = {
  "Radiant Soul (Celestial)": ["Celestial Radiance"],
  "Twilight Sanctuary": ["Twilight Bastion"],
  "Draconic Gift": ["Tongue of the Dragons"],
  "Drake Companion": ["Infused Strikes"],
  "Bond of Fang and Scale": ["Drake Mount", "Magic Fang", "Resistance"],
  "Perfected Bond": ["Empowered Bite", "Large Drake", "Reflexive Resistance"],
  "Experimental Elixir": ["Healing", "Swiftness", "Resilience", "Boldness", "Flight", "Transformation"],
  "Bestial Soul": ["Swim Speed", "Climb Speed"],
  "Infectious Fury": ["Forced Attack", "Psychic Damage"],
  "Genie Expanded Spells": ["Dao", "Djinni", "Efreeti", "Marid"],
  "Genie’s Vessel": ["Dao", "Djinni", "Efreeti", "Marid"],
  "Elemental Gift": ["Dao", "Djinni", "Efreeti", "Marid"],
};
type AliasIndex = {
  targets: readonly HydrationTarget[];
  names: ReadonlySet<string>;
  descriptions: ReadonlyMap<string, ContentReference[]>;
};

export function collectEntityAliases(revisions: readonly TranslationRevision[], references: readonly ContentReference[], targets: readonly HydrationTarget[]): HydrationTarget[] {
  const referenceNames = new Map(references.map((reference) => [reference.href, reference.engName]));
  const aliases = [...collectShortNames(references), ...collectEquipmentAliases(targets), ...collectSpellComponentAliases(targets), ...collectMechanicalReferenceAliases(targets), ...collectRareReferenceAliases(targets), ...targets.flatMap((target) => target.sectionId
    ? [...(SCOPED_COMPONENT_PARENTS[referenceNames.get(target.href) ?? target.engName] ?? SCOPED_COMPONENT_PARENTS[target.engName] ?? []),
      ...(COMPONENT_PARENTS[target.engName] ?? COMPONENT_PARENTS[findPlainEnglishName(target.engName)] ?? [])]
      .map((engName) => ({ ...target, engName })) : [])];
  const index: AliasIndex = { targets: [...targets, ...aliases], descriptions: buildDescriptionNameIndex(references),
    names: new Set([...targets, ...aliases].map((reference) => normalizeContentName(reference.engName))) };
  return [...aliases, ...revisions.flatMap((revision) => revision.sections.flatMap((section) => collectSectionAliases(section, index)))];
}

function collectSectionAliases(section: TranslationRevision["sections"][number], index: AliasIndex) {
  const aliases: HydrationTarget[] = [];
  for (const marker of section.blocks.flatMap(collectBlockText).flatMap(findGlossaryMarkers)) {
    const parents = index.names.has(normalizeContentName(marker.original)) ? [] : index.descriptions.get(normalizeContentName(marker.term)) ?? [];
    for (const reference of hasCommonRoot(parents) ? parents : []) {
      const contextual = index.targets.find((target) => target.href === reference.href && target.sectionId === section.sectionId);
      aliases.push({ name: marker.term, engName: marker.original, href: reference.href, sectionId: section.sectionId, priority: contextual?.priority ?? 0 });
    }
    aliases.push(...collectQualifiedNames(marker.original, section.sectionId, index.targets));
  }
  return aliases;
}

// A heading like «Ряткидки» repeats across unrelated stat blocks; it names a part only when one parent contains all the others.
function hasCommonRoot(references: readonly ContentReference[]) {
  return references.some((root) => {
    const description = normalizeContentName(root.description ?? "");
    return references.every((reference) => reference.name === root.name || description.includes(normalizeContentName(reference.name.replace(/\s*\[[^\]]+\]$/, ""))));
  });
}

function collectShortNames(references: readonly ContentReference[]) {
  const classes = references.filter((reference) => reference.kind === "class");
  const classNames = new Set(classes.map((reference) => normalizeContentName(reference.engName)));
  const classNamesByKey = new Map(classes.map((reference) => [
    new URL(reference.href, "https://local.invalid").searchParams.get("class"), reference.engName,
  ]));
  return references.flatMap((reference) => [
    ...collectCommonReferenceAliases(reference, classNames),
    ...collectRaceBranchAliases(reference), ...collectMagicItemAliases(reference),
    ...collectSubclassAliases(reference, classNamesByKey.get(new URL(reference.href, "https://local.invalid").searchParams.get("class"))),
  ]);
}

function collectCommonReferenceAliases(reference: ContentReference, classNames: ReadonlySet<string>): HydrationTarget[] {
  const names: string[] = [];
  const shortName = reference.engName.replace(/\s*\([^)]*\)\s*$/, "");
  if (shortName !== reference.engName && reference.kind !== "race") names.push(shortName);
  if (reference.engName.endsWith(" Domain Spells")) names.push("Domain Spells");
  if (reference.kind === "background" && reference.engName === "Sage") names.push("Researcher");
  if (reference.engName === "Banneret") names.push("Purple Dragon Knight");
  if (reference.engName === "Human Variant") names.push("Variant Human");
  if (reference.kind === "rule" && reference.engName === "Customizing Your Origin") names.push("Custom Origin", "Customized Origin");
  if (reference.kind === "rule" && reference.href === "/rules/adventuring#resting") names.push("Hit Die", "Hit Dice");
  if (reference.kind === "rule" && reference.engName === "Rituals") names.push("Ritual Casting");
  const components = reference.engName.split(/:\s+| [—-] /);
  if (components.length > 1 && !classNames.has(normalizeContentName(components[0]))) names.push(components[0], components.at(-1)!);
  if (reference.kind === "feature" || reference.kind === "feat") {
    names.push(...(COMPONENT_PARENTS[reference.engName] ?? COMPONENT_PARENTS[findPlainEnglishName(reference.engName)] ?? []));
  }
  return names.map((engName) => ({ ...reference, engName }));
}

function collectSubclassAliases(reference: ContentReference, className: string | undefined): HydrationTarget[] {
  if (reference.kind !== "subclass") return [];
  const shortName = reference.engName.replace(/^(?:Path of the |Path of |College of |Circle of the |Circle of |Way of the |Way of |Oath of the |Oath of |School of |The )/, "")
    .replace(/ (?:Conclave|Domain)$/, "");
  const names: string[] = [];
  if (shortName !== reference.engName) names.push(shortName);
  if (reference.engName === "School of Bladesinging") names.push("Bladesinger");
  if (reference.engName === "Hexblade") names.push("Hexblade Warlock");
  if (className) names.push(`${shortName} ${className}`, `${reference.engName} ${className}`);
  if (reference.engName === "School of Bladesinging" && className) names.push(`Bladesinger ${className}`);
  if (className === "Warlock") {
    names.push(`${shortName} patron`);
    if (reference.engName === "Hexblade") names.push("Hexblades");
  }
  return names.map((engName) => ({ ...reference, engName }));
}

function collectRaceBranchAliases(reference: ContentReference): HydrationTarget[] {
  if (reference.kind !== "race") return [];
  const branch = reference.engName.match(/^(.+) \(([^)]+)\)$/);
  if (!branch) return [];
  const [, race, variant] = branch;
  const names = variant.startsWith("Mark of ") ? [variant]
    : race === "Tiefling" ? [variant, `${variant} Tiefling`]
    : ["Duergar", "Drow", "Svirfneblin"].includes(variant) ? [race, variant]
    : ["DMG", "MPMM"].includes(variant) ? [race] : [];
  return names.map((engName) => ({ ...reference, engName }));
}

function collectMagicItemAliases(reference: ContentReference): HydrationTarget[] {
  if (reference.kind !== "magic-item") return [];
  const names: string[] = [];
  if (/ \+\d$/.test(reference.engName)) names.push(reference.engName.replace(/ \+\d$/, ""), reference.engName.replace(/ (\+\d)$/, ", $1"));
  const giant = reference.engName.match(/^Belt of (Hill|Stone|Frost|Fire|Cloud|Storm) Giant Strength$/)?.[1];
  if (giant) names.push("Belt of Giant Strength", `Belt of Giant Strength (${giant})`,
    ...(["Frost", "Stone", "Fire"].includes(giant) ? ["Belt of Giant Strength (Frost, Stone, Fire)"] : []),
    ...(["Cloud", "Storm"].includes(giant) ? ["Belt of Giant Strength (Cloud, Storm)"] : []));
  if (["Staff of Adornment", "Staff of Birdcalls", "Staff of Flowers"].includes(reference.engName)) names.push("Staff of Adornment/Birdcalls/Flowers");
  if (["Cloak of Protection", "Ring of Protection"].includes(reference.engName)) names.push("Cloak or Ring of Protection");
  if (reference.engName === "Flame Tongue") names.push("Flametongue");
  return names.map((engName) => ({ ...reference, engName }));
}

function collectEquipmentAliases(targets: readonly HydrationTarget[]): HydrationTarget[] {
  return targets.flatMap((target) => {
    const crossbow = target.kind === "weapon" && target.engName.match(/^(Light|Hand|Heavy) Crossbow$/)?.[1];
    const armor = target.kind === "armor" && ["Padded", "Leather", "Studded Leather", "Hide", "Splint", "Plate"].includes(target.engName);
    const names = [...(crossbow ? [`Crossbow, ${crossbow}`] : []), ...(armor ? [`${target.engName} Armor`] : []),
      ...(target.kind === "weapon" && ["Javelin", "Antimatter Rifle"].includes(target.engName) ? [`${target.engName}s`] : [])];
    return names.map((engName) => ({ ...target, engName }));
  });
}

function collectSpellComponentAliases(targets: readonly HydrationTarget[]): HydrationTarget[] {
  const components: Readonly<Record<string, readonly string[]>> = {
    "Enhance Ability": ["Bear's Endurance", "Bull's Strength", "Cat's Grace", "Eagle's Splendor", "Fox's Cunning", "Owl's Wisdom"],
    "Control Water": ["Flood", "Part Water", "Redirect Flow", "Whirlpool"],
    Clairvoyance: ["Clairaudience"],
  };
  return targets.flatMap((target) => target.kind === "spell"
    ? (components[target.engName] ?? []).map((engName) => ({ ...target, engName })) : []);
}

function collectQualifiedNames(original: string, sectionId: string, targets: readonly HydrationTarget[]) {
  const base = original.replace(/\s*\([^)]*\)\s*$/, "");
  if (base === original) return [];
  if (targets.some((target) => (!target.sectionId || target.sectionId === sectionId) && normalizeContentName(target.engName) === normalizeContentName(original))) return [];
  const qualifiedKind = original.match(/\((armor|weapon|spell)\)$/i)?.[1].toLowerCase();
  return base === original ? [] : targets.filter((target) => (!target.sectionId || target.sectionId === sectionId) && normalizeContentName(target.engName) === normalizeContentName(base))
    .filter((target) => !qualifiedKind || target.kind === qualifiedKind)
    .map((target) => ({ ...target, engName: original, sectionId }));
}

function buildDescriptionNameIndex(references: readonly ContentReference[]) {
  const names = new Map<string, ContentReference[]>();
  for (const reference of references) {
    const headings = [...(reference.description ?? "").matchAll(/\*\*([^*\n]+)\*\*/g)].map((match) => stripGlossaryMarkers(match[1]).replace(/[.:]\s*$/, ""));
    for (const name of [reference.name.replace(/\s*\[[^\]]+\]$/, ""), ...headings]) {
      const key = normalizeContentName(name);
      names.set(key, [...(names.get(key) ?? []), reference]);
    }
  }
  return names;
}
