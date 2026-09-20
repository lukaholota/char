/**
 * Б9 (KR13.4): одна функція «сутність → іконка» для каталогу й пошуку.
 *
 * Кожна категорія пошуку вже має свою функцію в catalog-visuals.ts, якою малює себе сам каталог
 * (getSpellSchoolVisual, getArmorVisual…). До цього омні-пошук малював іконку по category і не
 * бачив далі — звідси «Злочинець» зеленим сувоєм у каталозі й фіолетовою книгою в пошуку. Тут же
 * OmniSearchItem.visualKey несе той самий сирий атрибут (spell.school, armor.armorType…), яким
 * керується catalog-visuals.ts, тож обидва місця викликають ту саму функцію з тим самим входом.
 */

import { BookOpen, FlaskConical, Shield, User, Users } from "lucide-react";
import type { OmniSearchCategory, OmniSearchItem } from "@/lib/omniSearchData";
import {
  getSpellSchoolVisual,
  getMagicItemTypeVisual,
  getWeaponVisual,
  getArmorVisual,
  getCreatureVisual,
  getFeatVisual,
  getInvocationVisual,
  getMetamagicVisual,
  getInfusionVisual,
  getBastionFacilityVisual,
  getBackgroundVisual,
  getRuleCategoryVisual,
  ItemVisual,
} from "@/components/catalogs/catalog-visuals";

const CLASS_VISUAL: ItemVisual = {
  icon: Shield,
  iconWrap: "bg-blue-950/60 border-blue-800/60",
  iconColor: "text-blue-300",
  badgeClass: "border-blue-800/50 bg-blue-950/40 text-blue-300",
};

const RACE_VISUAL: ItemVisual = {
  icon: Users,
  iconWrap: "bg-teal-950/60 border-teal-800/60",
  iconColor: "text-teal-300",
  badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
};

const CHARACTER_VISUAL: ItemVisual = {
  icon: User,
  iconWrap: "bg-amber-950/60 border-amber-800/60",
  iconColor: "text-amber-300",
  badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
};

const HOMEBREW_VISUAL: ItemVisual = {
  icon: FlaskConical,
  iconWrap: "bg-emerald-950/60 border-emerald-800/60",
  iconColor: "text-emerald-300",
  badgeClass: "border-emerald-800/50 bg-emerald-950/40 text-emerald-300",
};

const DEFAULT_VISUAL: ItemVisual = {
  icon: BookOpen,
  iconWrap: "bg-indigo-950/60 border-indigo-800/60",
  iconColor: "text-indigo-300",
  badgeClass: "border-indigo-800/50 bg-indigo-950/40 text-indigo-300",
};

export function findOmniSearchVisual(item: OmniSearchItem): ItemVisual {
  return dispatchVisual(item.category, item.visualKey, item.visualKeySecondary);
}

function dispatchVisual(
  category: OmniSearchCategory,
  visualKey: OmniSearchItem["visualKey"],
  visualKeySecondary: OmniSearchItem["visualKeySecondary"]
): ItemVisual {
  switch (category) {
    case "spells":
      return getSpellSchoolVisual(visualKey);
    case "magic-items":
      return getMagicItemTypeVisual(visualKey);
    case "weapons":
      return getWeaponVisual(visualKey, typeof visualKeySecondary === "boolean" ? visualKeySecondary : undefined);
    case "armor":
      return getArmorVisual(visualKey);
    case "bestiary":
      return getCreatureVisual(visualKey);
    case "feats":
      return getFeatVisual(visualKey);
    case "invocations":
      return getInvocationVisual(visualKey, typeof visualKeySecondary === "number" ? visualKeySecondary : null);
    case "metamagic":
      return getMetamagicVisual(typeof visualKeySecondary === "number" ? visualKeySecondary : null, visualKey === "level");
    case "infusions":
      return getInfusionVisual(visualKey);
    case "bastions":
      return getBastionFacilityVisual(visualKey);
    case "backgrounds":
      return getBackgroundVisual(visualKey);
    case "rules":
      return getRuleCategoryVisual(visualKey);
    case "classes":
      return CLASS_VISUAL;
    case "races":
      return RACE_VISUAL;
    case "characters":
      return CHARACTER_VISUAL;
    case "homebrew":
      return HOMEBREW_VISUAL;
    default:
      return DEFAULT_VISUAL;
  }
}
