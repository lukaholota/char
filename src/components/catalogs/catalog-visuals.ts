import { ComponentType } from "react";
import {
  Backpack,
  Flame,
  Skull,
  Shield,
  Wand2,
  WandSparkles,
  Eye,
  Heart,
  Ghost,
  Atom,
  CircleDashed,
  Award,
  Sparkles,
  Crown,
  Sword,
  Swords,
  Scroll,
  FlaskConical,
  CircleDot,
  PawPrint,
  Sun,
  User,
  Zap,
  Bot,
  Wind,
  Crosshair,
  Target,
  ShieldCheck,
  Layers,
  Wrench,
  BookOpen,
  ShieldAlert,
  Compass,
  Home,
} from "lucide-react";

export type ItemVisual = {
  icon: ComponentType<{ className?: string }>;
  iconWrap: string;
  iconColor: string;
  badgeClass: string;
};

// 1. Spell School Visuals
export function getSpellSchoolVisual(school: string | null | undefined): ItemVisual {
  const key = String(school ?? "").toLowerCase();

  if (key.includes("evocation") || key.includes("втілен")) {
    return {
      icon: Flame,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }
  if (key.includes("necromancy") || key.includes("некром")) {
    return {
      icon: Skull,
      iconWrap: "bg-emerald-950/60 border-emerald-800/60",
      iconColor: "text-emerald-300",
      badgeClass: "border-emerald-800/45 bg-emerald-950/35 text-emerald-300",
    };
  }
  if (key.includes("abjuration") || key.includes("огородж") || key.includes("захист")) {
    return {
      icon: Shield,
      iconWrap: "bg-sky-950/60 border-sky-800/60",
      iconColor: "text-sky-300",
      badgeClass: "border-sky-800/45 bg-sky-950/35 text-sky-300",
    };
  }
  if (key.includes("conjuration") || key.includes("виклик")) {
    return {
      icon: WandSparkles,
      iconWrap: "bg-teal-950/60 border-teal-800/60",
      iconColor: "text-teal-300",
      badgeClass: "border-teal-800/45 bg-teal-950/35 text-teal-300",
    };
  }
  if (key.includes("divination") || key.includes("віщ") || key.includes("ворож")) {
    return {
      icon: Eye,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/35 text-amber-300",
    };
  }
  if (key.includes("enchantment") || key.includes("зачар") || key.includes("причар")) {
    return {
      icon: Heart,
      iconWrap: "bg-pink-950/60 border-pink-800/60",
      iconColor: "text-pink-300",
      badgeClass: "border-pink-800/50 bg-pink-950/35 text-pink-300",
    };
  }
  if (key.includes("illusion") || key.includes("ілюз")) {
    return {
      icon: Ghost,
      iconWrap: "bg-cyan-950/60 border-cyan-800/60",
      iconColor: "text-cyan-100",
      badgeClass: "border-cyan-800/45 bg-cyan-950/35 text-cyan-100",
    };
  }
  if (key.includes("transmutation") || key.includes("перетвор")) {
    return {
      icon: Atom,
      iconWrap: "bg-purple-950/60 border-purple-800/60",
      iconColor: "text-purple-300",
      badgeClass: "border-purple-800/50 bg-purple-950/40 text-purple-300",
    };
  }

  return {
    icon: CircleDashed,
    iconWrap: "bg-slate-900/70 border-slate-700/60",
    iconColor: "text-slate-300",
    badgeClass: "border-slate-600/60 bg-slate-900/55 text-slate-300",
  };
}

// 2. Magic Item Visuals (STRICTLY by Item Type)
export function getMagicItemTypeVisual(itemType: string | null | undefined): ItemVisual {
  const t = String(itemType ?? "").toUpperCase();

  if (t.includes("WEAPON") || t.includes("ЗБРОЯ")) {
    return {
      icon: Sword,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }
  if (t.includes("ARMOR") || t.includes("SHIELD") || t.includes("ОБЛАДУНОК") || t.includes("ЩИТ")) {
    return {
      icon: Shield,
      iconWrap: "bg-sky-950/60 border-sky-800/60",
      iconColor: "text-sky-300",
      badgeClass: "border-sky-800/50 bg-sky-950/40 text-sky-300",
    };
  }
  if (t.includes("POTION") || t.includes("ЗІЛЛЯ")) {
    return {
      icon: FlaskConical,
      iconWrap: "bg-emerald-950/60 border-emerald-800/60",
      iconColor: "text-emerald-300",
      badgeClass: "border-emerald-800/50 bg-emerald-950/40 text-emerald-300",
    };
  }
  if (t.includes("SCROLL") || t.includes("СУВІЙ")) {
    return {
      icon: Scroll,
      iconWrap: "bg-indigo-950/60 border-indigo-800/60",
      iconColor: "text-indigo-300",
      badgeClass: "border-indigo-800/50 bg-indigo-950/40 text-indigo-300",
    };
  }
  if (t.includes("RING") || t.includes("ПЕРСТЕНЬ") || t.includes("КІЛЬЦЕ")) {
    return {
      icon: CircleDot,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }
  if (t.includes("ROD") || t.includes("STAFF") || t.includes("WAND") || t.includes("ПАЛИЧКА") || t.includes("ПОСОХ") || t.includes("ЖЕРДИНА") || t.includes("ЖЕЗЛ")) {
    return {
      icon: Wand2,
      iconWrap: "bg-cyan-950/60 border-cyan-800/60",
      iconColor: "text-cyan-300",
      badgeClass: "border-cyan-800/50 bg-cyan-950/40 text-cyan-300",
    };
  }

  // Wondrous / Other
  return {
    icon: Sparkles,
    iconWrap: "bg-purple-950/60 border-purple-800/60",
    iconColor: "text-purple-300",
    badgeClass: "border-purple-800/50 bg-purple-950/40 text-purple-300",
  };
}

// Magic Item Rarity Badges
export function getMagicItemRarityBadge(rarity: string | null | undefined): string {
  const rar = String(rarity ?? "").toUpperCase();
  switch (rar) {
    case "UNCOMMON":
      return "border-emerald-800/50 bg-emerald-950/40 text-emerald-300";
    case "RARE":
      return "border-sky-800/50 bg-sky-950/40 text-sky-300";
    case "VERY_RARE":
      return "border-purple-800/50 bg-purple-950/40 text-purple-300";
    case "LEGENDARY":
      return "border-amber-800/50 bg-amber-950/40 text-amber-300";
    case "ARTIFACT":
      return "border-rose-800/50 bg-rose-950/40 text-rose-300";
    case "COMMON":
    default:
      return "border-slate-700/60 bg-slate-900/60 text-slate-300";
  }
}

// 3. Feat Category Visuals
export function getFeatVisual(category: string | null | undefined): ItemVisual {
  const cat = String(category ?? "").toUpperCase();

  if (cat.includes("ORIGIN") || cat.includes("ПОХОДЖЕННЯ")) {
    return {
      icon: Sparkles,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }
  if (cat.includes("EPIC") || cat.includes("ЕПІЧН")) {
    return {
      icon: Crown,
      iconWrap: "bg-purple-950/60 border-purple-800/60",
      iconColor: "text-purple-300",
      badgeClass: "border-purple-800/50 bg-purple-950/40 text-purple-300",
    };
  }
  if (cat.includes("FIGHTING") || cat.includes("БОЙОВ")) {
    return {
      icon: Swords,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }

  // General Feats
  return {
    icon: Award,
    iconWrap: "bg-teal-950/60 border-teal-800/60",
    iconColor: "text-teal-300",
    badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
  };
}

// 4. Creature Type Visuals
export function getCreatureVisual(type: string | null | undefined): ItemVisual {
  const key = String(type ?? "").toLowerCase();

  if (key.includes("звір") || key.includes("beast") || key.includes("тварина")) {
    return {
      icon: PawPrint,
      iconWrap: "bg-emerald-950/60 border-emerald-800/60",
      iconColor: "text-emerald-300",
      badgeClass: "border-emerald-800/50 bg-emerald-950/40 text-emerald-300",
    };
  }
  if (key.includes("дракон") || key.includes("dragon")) {
    return {
      icon: Flame,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }
  if (key.includes("нежить") || key.includes("undead")) {
    return {
      icon: Skull,
      iconWrap: "bg-slate-900/70 border-slate-700/60",
      iconColor: "text-slate-300",
      badgeClass: "border-slate-700/60 bg-slate-900/55 text-slate-300",
    };
  }
  if (key.includes("демон") || key.includes("диявол") || key.includes("біс") || key.includes("fiend")) {
    return {
      icon: Zap,
      iconWrap: "bg-red-950/60 border-red-800/60",
      iconColor: "text-red-300",
      badgeClass: "border-red-800/50 bg-red-950/40 text-red-300",
    };
  }
  if (key.includes("небожитель") || key.includes("celestial")) {
    return {
      icon: Sun,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }
  if (key.includes("фея") || key.includes("fey")) {
    return {
      icon: Sparkles,
      iconWrap: "bg-teal-950/60 border-teal-800/60",
      iconColor: "text-teal-300",
      badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
    };
  }
  if (key.includes("конструкт") || key.includes("construct")) {
    return {
      icon: Bot,
      iconWrap: "bg-sky-950/60 border-sky-800/60",
      iconColor: "text-sky-300",
      badgeClass: "border-sky-800/50 bg-sky-950/40 text-sky-300",
    };
  }
  if (key.includes("елементаль") || key.includes("elemental")) {
    return {
      icon: Wind,
      iconWrap: "bg-cyan-950/60 border-cyan-800/60",
      iconColor: "text-cyan-300",
      badgeClass: "border-cyan-800/50 bg-cyan-950/40 text-cyan-300",
    };
  }
  if (key.includes("гуманоїд") || key.includes("humanoid")) {
    return {
      icon: User,
      iconWrap: "bg-blue-950/60 border-blue-800/60",
      iconColor: "text-blue-300",
      badgeClass: "border-blue-800/50 bg-blue-950/40 text-blue-300",
    };
  }
  if (key.includes("монстр") || key.includes("monstrosity") || key.includes("аберація") || key.includes("aberration")) {
    return {
      icon: Eye,
      iconWrap: "bg-purple-950/60 border-purple-800/60",
      iconColor: "text-purple-300",
      badgeClass: "border-purple-800/50 bg-purple-950/40 text-purple-300",
    };
  }

  return {
    icon: Eye,
    iconWrap: "bg-teal-950/60 border-teal-800/60",
    iconColor: "text-teal-300",
    badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
  };
}

// 5. Weapon Category Visuals
export function getWeaponVisual(weaponType: string | null | undefined, isRanged?: boolean): ItemVisual {
  const t = String(weaponType ?? "").toUpperCase();

  if (t.includes("FIREARMS") || t.includes("ВОГНЕП")) {
    return {
      icon: Crosshair,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }

  if (isRanged || t.includes("RANGED") || t.includes("ДАЛЬН")) {
    return {
      icon: Target,
      iconWrap: "bg-teal-950/60 border-teal-800/60",
      iconColor: "text-teal-300",
      badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
    };
  }

  if (t.includes("MARTIAL") || t.includes("БОЙОВ")) {
    return {
      icon: Swords,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }

  return {
    icon: Sword,
    iconWrap: "bg-slate-900/70 border-slate-700/60",
    iconColor: "text-slate-200",
    badgeClass: "border-slate-700/60 bg-slate-900/55 text-slate-300",
  };
}

// 6. Armor Type Visuals
export function getArmorVisual(armorType: string | null | undefined): ItemVisual {
  const t = String(armorType ?? "").toUpperCase();

  if (t.includes("SHIELD") || t.includes("ЩИТ")) {
    return {
      icon: ShieldCheck,
      iconWrap: "bg-emerald-950/60 border-emerald-800/60",
      iconColor: "text-emerald-300",
      badgeClass: "border-emerald-800/50 bg-emerald-950/40 text-emerald-300",
    };
  }

  if (t.includes("HEAVY") || t.includes("ВАЖК")) {
    return {
      icon: Shield,
      iconWrap: "bg-purple-950/60 border-purple-800/60",
      iconColor: "text-purple-300",
      badgeClass: "border-purple-800/50 bg-purple-950/40 text-purple-300",
    };
  }

  if (t.includes("MEDIUM") || t.includes("СЕРЕДН")) {
    return {
      icon: Layers,
      iconWrap: "bg-sky-950/60 border-sky-800/60",
      iconColor: "text-sky-300",
      badgeClass: "border-sky-800/50 bg-sky-950/40 text-sky-300",
    };
  }

  // Light armor
  return {
    icon: Shield,
    iconWrap: "bg-teal-950/60 border-teal-800/60",
    iconColor: "text-teal-300",
    badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
  };
}

// 7. Infusion Target Visuals
export function getInfusionVisual(targetType: string | null | undefined): ItemVisual {
  const t = String(targetType ?? "").toUpperCase();

  if (t.includes("WEAPON") || t.includes("ЗБРОЯ")) {
    return {
      icon: Sword,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }

  if (t.includes("ARMOR") || t.includes("SHIELD") || t.includes("ОБЛАДУНОК") || t.includes("ЩИТ")) {
    return {
      icon: Shield,
      iconWrap: "bg-sky-950/60 border-sky-800/60",
      iconColor: "text-sky-300",
      badgeClass: "border-sky-800/50 bg-sky-950/40 text-sky-300",
    };
  }

  if (t.includes("RING") || t.includes("BOOTS") || t.includes("HELMET")) {
    return {
      icon: Sparkles,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }

  return {
    icon: Wrench,
    iconWrap: "bg-teal-950/60 border-teal-800/60",
    iconColor: "text-teal-300",
    badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
  };
}

// 8. Invocation Visuals
export function getInvocationVisual(pact: string | null | undefined, minLevel?: number | null): ItemVisual {
  const p = String(pact ?? "").toLowerCase();

  if (p.includes("blade") || p.includes("клинк")) {
    return {
      icon: Sword,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }

  if (p.includes("tome") || p.includes("книг")) {
    return {
      icon: BookOpen,
      iconWrap: "bg-indigo-950/60 border-indigo-800/60",
      iconColor: "text-indigo-300",
      badgeClass: "border-indigo-800/50 bg-indigo-950/40 text-indigo-300",
    };
  }

  if (p.includes("chain") || p.includes("ланцюг")) {
    return {
      icon: PawPrint,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }

  if (minLevel && minLevel >= 12) {
    return {
      icon: Crown,
      iconWrap: "bg-purple-950/60 border-purple-800/60",
      iconColor: "text-purple-300",
      badgeClass: "border-purple-800/50 bg-purple-950/40 text-purple-300",
    };
  }

  return {
    icon: Eye,
    iconWrap: "bg-violet-950/60 border-violet-800/60",
    iconColor: "text-violet-300",
    badgeClass: "border-violet-800/50 bg-violet-950/40 text-violet-300",
  };
}

// 8b. Bastion Facility Visuals — за наказом, який приміщення виконує
export function getBastionFacilityVisual(order: string | null | undefined): ItemVisual {
  const key = String(order ?? "").toLowerCase();

  if (key === "craft") {
    return {
      icon: Wrench,
      iconWrap: "bg-orange-950/60 border-orange-800/60",
      iconColor: "text-orange-300",
      badgeClass: "border-orange-800/50 bg-orange-950/40 text-orange-300",
    };
  }

  if (key === "empower") {
    return {
      icon: Sparkles,
      iconWrap: "bg-violet-950/60 border-violet-800/60",
      iconColor: "text-violet-300",
      badgeClass: "border-violet-800/50 bg-violet-950/40 text-violet-300",
    };
  }

  if (key === "harvest") {
    return {
      icon: FlaskConical,
      iconWrap: "bg-emerald-950/60 border-emerald-800/60",
      iconColor: "text-emerald-300",
      badgeClass: "border-emerald-800/50 bg-emerald-950/40 text-emerald-300",
    };
  }

  if (key === "recruit") {
    return {
      icon: Swords,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }

  if (key === "research") {
    return {
      icon: BookOpen,
      iconWrap: "bg-indigo-950/60 border-indigo-800/60",
      iconColor: "text-indigo-300",
      badgeClass: "border-indigo-800/50 bg-indigo-950/40 text-indigo-300",
    };
  }

  if (key === "trade") {
    return {
      icon: Scroll,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }

  return {
    icon: Home,
    iconWrap: "bg-slate-900/60 border-slate-700/60",
    iconColor: "text-slate-300",
    badgeClass: "border-slate-700/50 bg-slate-900/40 text-slate-300",
  };
}

// 9. Rules Category Visuals
export function getRuleCategoryVisual(category: string | null | undefined): ItemVisual {
  const cat = String(category ?? "").toLowerCase();

  if (cat.includes("combat") || cat.includes("бій")) {
    return {
      icon: Swords,
      iconWrap: "bg-rose-950/60 border-rose-800/60",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40 text-rose-300",
    };
  }

  if (cat.includes("spell") || cat.includes("магі") || cat.includes("чар")) {
    return {
      icon: Sparkles,
      iconWrap: "bg-indigo-950/60 border-indigo-800/60",
      iconColor: "text-indigo-300",
      badgeClass: "border-indigo-800/50 bg-indigo-950/40 text-indigo-300",
    };
  }

  if (cat.includes("abilit") || cat.includes("характер")) {
    return {
      icon: Award,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }

  if (cat.includes("cond") || cat.includes("стан")) {
    return {
      icon: ShieldAlert,
      iconWrap: "bg-emerald-950/60 border-emerald-800/60",
      iconColor: "text-emerald-300",
      badgeClass: "border-emerald-800/50 bg-emerald-950/40 text-emerald-300",
    };
  }

  if (cat.includes("advent") || cat.includes("пригод") || cat.includes("відпоч")) {
    return {
      icon: Compass,
      iconWrap: "bg-teal-950/60 border-teal-800/60",
      iconColor: "text-teal-300",
      badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
    };
  }

  if (cat.includes("equip") || cat.includes("споряд")) {
    return {
      icon: Backpack,
      iconWrap: "bg-orange-950/60 border-orange-800/60",
      iconColor: "text-orange-300",
      badgeClass: "border-orange-800/50 bg-orange-950/40 text-orange-300",
    };
  }

  // gamemaster / other
  return {
    icon: BookOpen,
    iconWrap: "bg-purple-950/60 border-purple-800/60",
    iconColor: "text-purple-300",
    badgeClass: "border-purple-800/50 bg-purple-950/40 text-purple-300",
  };
}

// 11. Background Source Visuals
const EXPANSION_SOURCES = ["XGTE", "SCAG", "TCOE", "MPMM", "VGTM", "SACOC"];

export function getBackgroundVisual(source: string | null | undefined): ItemVisual {
  const key = String(source ?? "").toUpperCase();

  if (key === "PHB_2024") {
    return {
      icon: Compass,
      iconWrap: "bg-amber-950/60 border-amber-800/60",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/40 text-amber-300",
    };
  }
  if (key === "PHB") {
    return {
      icon: Scroll,
      iconWrap: "bg-teal-950/60 border-teal-800/60",
      iconColor: "text-teal-300",
      badgeClass: "border-teal-800/50 bg-teal-950/40 text-teal-300",
    };
  }
  if (EXPANSION_SOURCES.includes(key)) {
    return {
      icon: BookOpen,
      iconWrap: "bg-sky-950/60 border-sky-800/60",
      iconColor: "text-sky-300",
      badgeClass: "border-sky-800/45 bg-sky-950/35 text-sky-300",
    };
  }

  // Setting and adventure books
  return {
    icon: Crown,
    iconWrap: "bg-purple-950/60 border-purple-800/60",
    iconColor: "text-purple-300",
    badgeClass: "border-purple-800/50 bg-purple-950/40 text-purple-300",
  };
}

export { getCategoryImagePath, CATEGORY_IMAGE_MAP } from "@/lib/assets/image-manifest";

