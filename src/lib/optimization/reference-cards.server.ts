import "server-only";
import { getArmorByIdOrSlug, type ArmorData } from "@/lib/armorData";
import { getBackgroundByIdOrSlug, type BackgroundData } from "@/lib/backgroundsData";
import { findClassBySlugOrId, type ClassData } from "@/lib/classesData";
import { findClassTable } from "@/lib/catalogs/class-tables";
import type { ClassTable } from "@/rules/class-table";
import { getFeatByIdOrSlug, type FeatData } from "@/lib/featsData";
import { getInfusionByIdOrSlug, type InfusionData } from "@/lib/infusionsData";
import { getInvocationByIdOrSlug, type InvocationData } from "@/lib/invocationsData";
import { getMagicItemById, type MagicItemWithSpells } from "@/lib/magicItemsData";
import { getMetamagicByIdOrSlug, type MetamagicData } from "@/lib/metamagicData";
import { findRaceBySlug, type RaceData } from "@/lib/racesData";
import { getWeaponByIdOrSlug, type WeaponData } from "@/lib/weaponsData";
import type { ReferenceCardTarget } from "./reference-card-target";

export type ReferenceCard =
  | { catalog: "class"; characterClass: ClassData; table?: ClassTable }
  | { catalog: "race"; race: RaceData }
  | { catalog: "feat"; feat: FeatData }
  | { catalog: "magic-item"; item: MagicItemWithSpells }
  | { catalog: "background"; background: BackgroundData }
  | { catalog: "invocation"; invocation: InvocationData }
  | { catalog: "metamagic"; metamagic: MetamagicData }
  | { catalog: "infusion"; infusion: InfusionData }
  | { catalog: "weapon"; weapon: WeaponData }
  | { catalog: "armor"; armor: ArmorData };

export function loadReferenceCard({ catalog, key, ruleset }: Omit<ReferenceCardTarget, "params">): ReferenceCard | null {
  switch (catalog) {
    case "class": return wrapCard(findClassBySlugOrId(key, ruleset), (characterClass) => ({ catalog, characterClass, table: findClassTable(characterClass.key, ruleset) }));
    case "race": return wrapCard(findRaceBySlug(key, ruleset), (race) => ({ catalog, race }));
    case "feat": return wrapCard(getFeatByIdOrSlug(key, ruleset), (feat) => ({ catalog, feat }));
    case "magic-item": return wrapCard(/^\d+$/.test(key) ? getMagicItemById(Number(key), ruleset) : null, (item) => ({ catalog, item }));
    case "background": return wrapCard(getBackgroundByIdOrSlug(key, ruleset), (background) => ({ catalog, background }));
    case "invocation": return wrapCard(getInvocationByIdOrSlug(key, ruleset), (invocation) => ({ catalog, invocation }));
    case "metamagic": return wrapCard(getMetamagicByIdOrSlug(key, ruleset), (metamagic) => ({ catalog, metamagic }));
    case "infusion": return wrapCard(ruleset === "RULES_2014" ? getInfusionByIdOrSlug(key) : null, (infusion) => ({ catalog, infusion }));
    case "weapon": return wrapCard(getWeaponByIdOrSlug(key, ruleset), (weapon) => ({ catalog, weapon }));
    case "armor": return wrapCard(getArmorByIdOrSlug(key, ruleset), (armor) => ({ catalog, armor }));
  }
}

function wrapCard<Entity>(entity: Entity | null | undefined, build: (entity: Entity) => ReferenceCard): ReferenceCard | null {
  return entity ? build(entity) : null;
}
