import { ComponentType } from "react";
import {
  Flame,
  Skull,
  Shield,
  WandSparkles,
  Eye,
  Sparkles,
  Swords,
  PawPrint,
  Sun,
  User,
  Zap,
  Bot,
  Music,
  Trees,
  Footprints,
  Hammer,
  Feather,
  Compass,
  Key,
  BookOpen,
  Wrench,
  Mountain,
  Droplet,
} from "lucide-react";
import { getRaceImagePath, getClassImagePath } from "@/lib/assets/image-manifest";

export type CreationVisual = {
  icon: ComponentType<{ className?: string }>;
  bgGradient: string;
  glowColor: string;
  badgeClass: string;
  accentBorder: string;
  imageSrc?: string | null;
};

// 1. Race Visual Theme Mapping
export function getRaceVisual(raceName: string | null | undefined): CreationVisual {
  const key = String(raceName ?? "").toUpperCase();
  const imageSrc = getRaceImagePath(raceName);

  if (key.includes("DRAGONBORN") || key.includes("ДРАКОНОРОДЖ")) {
    return {
      icon: Flame,
      bgGradient: "from-amber-950/70 via-rose-950/40 to-slate-950",
      glowColor: "rgba(245, 158, 11, 0.2)",
      badgeClass: "border-amber-700/50 bg-amber-950/40 text-amber-300",
      accentBorder: "group-hover:border-amber-500/50",
      imageSrc,
    };
  }
  if (key.includes("DWARF") || key.includes("ДВАРФ")) {
    return {
      icon: Hammer,
      bgGradient: "from-stone-900/90 via-amber-950/40 to-slate-950",
      glowColor: "rgba(217, 119, 6, 0.2)",
      badgeClass: "border-amber-800/50 bg-stone-900/60 text-amber-300",
      accentBorder: "group-hover:border-amber-600/50",
      imageSrc,
    };
  }
  if (key.includes("ELF") || key.includes("ЕЛЬФ")) {
    return {
      icon: Sparkles,
      bgGradient: "from-teal-950/80 via-emerald-950/40 to-slate-950",
      glowColor: "rgba(20, 184, 166, 0.2)",
      badgeClass: "border-teal-700/50 bg-teal-950/40 text-teal-300",
      accentBorder: "group-hover:border-teal-500/50",
      imageSrc,
    };
  }
  if (key.includes("GNOME") || key.includes("ГНОМ")) {
    return {
      icon: Bot,
      bgGradient: "from-cyan-950/80 via-indigo-950/40 to-slate-950",
      glowColor: "rgba(6, 182, 212, 0.2)",
      badgeClass: "border-cyan-700/50 bg-cyan-950/40 text-cyan-300",
      accentBorder: "group-hover:border-cyan-500/50",
      imageSrc,
    };
  }
  if (key.includes("HALF_ELF") || key.includes("НАПІВЕЛЬФ")) {
    return {
      icon: Feather,
      bgGradient: "from-blue-950/80 via-teal-950/40 to-slate-950",
      glowColor: "rgba(59, 130, 246, 0.2)",
      badgeClass: "border-blue-700/50 bg-blue-950/40 text-blue-300",
      accentBorder: "group-hover:border-blue-500/50",
      imageSrc,
    };
  }
  if (key.includes("HALF_ORC") || key.includes("ORC") || key.includes("ОРК")) {
    return {
      icon: Swords,
      bgGradient: "from-emerald-950/90 via-slate-900/60 to-slate-950",
      glowColor: "rgba(16, 185, 129, 0.2)",
      badgeClass: "border-emerald-700/50 bg-emerald-950/40 text-emerald-300",
      accentBorder: "group-hover:border-emerald-500/50",
      imageSrc,
    };
  }
  if (key.includes("HALFLING") || key.includes("ГАФЛІНГ") || key.includes("НАПІВРОСЛИК")) {
    return {
      icon: Footprints,
      bgGradient: "from-lime-950/70 via-emerald-950/40 to-slate-950",
      glowColor: "rgba(132, 204, 22, 0.2)",
      badgeClass: "border-lime-700/50 bg-lime-950/40 text-lime-300",
      accentBorder: "group-hover:border-lime-500/50",
      imageSrc,
    };
  }
  if (key.includes("HUMAN") || key.includes("ЛЮДИНА")) {
    return {
      icon: User,
      bgGradient: "from-slate-900/90 via-sky-950/40 to-slate-950",
      glowColor: "rgba(148, 163, 184, 0.2)",
      badgeClass: "border-slate-700/50 bg-slate-900/60 text-slate-300",
      accentBorder: "group-hover:border-slate-400/50",
      imageSrc,
    };
  }
  if (key.includes("TIEFLING") || key.includes("ТІФЛІНГ") || key.includes("ТИФЛІНГ")) {
    return {
      icon: Skull,
      bgGradient: "from-rose-950/85 via-purple-950/50 to-slate-950",
      glowColor: "rgba(225, 29, 72, 0.2)",
      badgeClass: "border-rose-700/50 bg-rose-950/40 text-rose-300",
      accentBorder: "group-hover:border-rose-500/50",
      imageSrc,
    };
  }
  if (key.includes("AASIMAR") || key.includes("АСІМАР") || key.includes("АСИМАР") || key.includes("ААЗИМАР")) {
    return {
      icon: Sun,
      bgGradient: "from-amber-950/80 via-yellow-950/40 to-slate-950",
      glowColor: "rgba(234, 179, 8, 0.2)",
      badgeClass: "border-amber-700/50 bg-amber-950/40 text-amber-300",
      accentBorder: "group-hover:border-amber-400/50",
      imageSrc,
    };
  }
  if (key.includes("GOLIATH") || key.includes("ГОЛІАФ")) {
    return {
      icon: Mountain,
      bgGradient: "from-cyan-950/80 via-slate-900/60 to-slate-950",
      glowColor: "rgba(8, 145, 178, 0.2)",
      badgeClass: "border-cyan-700/50 bg-cyan-950/40 text-cyan-300",
      accentBorder: "group-hover:border-cyan-500/50",
      imageSrc,
    };
  }
  if (key.includes("TABAXI") || key.includes("ТАБАКСІ")) {
    return {
      icon: PawPrint,
      bgGradient: "from-orange-950/80 via-amber-950/40 to-slate-950",
      glowColor: "rgba(249, 115, 22, 0.2)",
      badgeClass: "border-orange-700/50 bg-orange-950/40 text-orange-300",
      accentBorder: "group-hover:border-orange-500/50",
      imageSrc,
    };
  }
  if (key.includes("GENASI") || key.includes("ДЖЕНАЗІ") || key.includes("ГЕНАЗІ")) {
    return {
      icon: Droplet,
      bgGradient: "from-indigo-950/80 via-cyan-950/40 to-slate-950",
      glowColor: "rgba(99, 102, 241, 0.2)",
      badgeClass: "border-indigo-700/50 bg-indigo-950/40 text-indigo-300",
      accentBorder: "group-hover:border-indigo-500/50",
      imageSrc,
    };
  }

  // Fallback
  return {
    icon: Sparkles,
    bgGradient: "from-slate-900/90 via-slate-900/60 to-slate-950",
    glowColor: "rgba(148, 163, 184, 0.15)",
    badgeClass: "border-slate-700/50 bg-slate-900/60 text-slate-300",
    accentBorder: "group-hover:border-slate-500/50",
    imageSrc,
  };
}

// 2. Class Visual Theme Mapping
export function getClassVisual(className: string | null | undefined): CreationVisual {
  const key = String(className ?? "").toUpperCase();
  const imageSrc = getClassImagePath(className);

  if (key.includes("BARBARIAN") || key.includes("ВАРВАР")) {
    return {
      icon: Flame,
      bgGradient: "from-rose-950/85 via-red-950/50 to-slate-950",
      glowColor: "rgba(225, 29, 72, 0.2)",
      badgeClass: "border-rose-700/50 bg-rose-950/40 text-rose-300",
      accentBorder: "group-hover:border-rose-500/50",
      imageSrc,
    };
  }
  if (key.includes("BARD") || key.includes("БАРД")) {
    return {
      icon: Music,
      bgGradient: "from-fuchsia-950/85 via-purple-950/50 to-slate-950",
      glowColor: "rgba(217, 70, 239, 0.2)",
      badgeClass: "border-fuchsia-700/50 bg-fuchsia-950/40 text-fuchsia-300",
      accentBorder: "group-hover:border-fuchsia-500/50",
      imageSrc,
    };
  }
  if (key.includes("CLERIC") || key.includes("ЖРЕЦЬ") || key.includes("КЛІРИК")) {
    return {
      icon: Sun,
      bgGradient: "from-amber-950/80 via-yellow-950/40 to-slate-950",
      glowColor: "rgba(234, 179, 8, 0.2)",
      badgeClass: "border-amber-700/50 bg-amber-950/40 text-amber-300",
      accentBorder: "group-hover:border-amber-400/50",
      imageSrc,
    };
  }
  if (key.includes("DRUID") || key.includes("ДРУЇД")) {
    return {
      icon: Trees,
      bgGradient: "from-emerald-950/85 via-green-950/40 to-slate-950",
      glowColor: "rgba(16, 185, 129, 0.2)",
      badgeClass: "border-emerald-700/50 bg-emerald-950/40 text-emerald-300",
      accentBorder: "group-hover:border-emerald-500/50",
      imageSrc,
    };
  }
  if (key.includes("FIGHTER") || key.includes("ВОЇН")) {
    return {
      icon: Swords,
      bgGradient: "from-slate-900/95 via-stone-900/60 to-slate-950",
      glowColor: "rgba(168, 162, 158, 0.2)",
      badgeClass: "border-slate-700/50 bg-slate-900/60 text-slate-300",
      accentBorder: "group-hover:border-slate-400/50",
      imageSrc,
    };
  }
  if (key.includes("MONK") || key.includes("МОНАХ")) {
    return {
      icon: Zap,
      bgGradient: "from-cyan-950/80 via-sky-950/40 to-slate-950",
      glowColor: "rgba(6, 182, 212, 0.2)",
      badgeClass: "border-cyan-700/50 bg-cyan-950/40 text-cyan-300",
      accentBorder: "group-hover:border-cyan-500/50",
      imageSrc,
    };
  }
  if (key.includes("PALADIN") || key.includes("ПАЛАДИН")) {
    return {
      icon: Shield,
      bgGradient: "from-blue-950/85 via-indigo-950/50 to-slate-950",
      glowColor: "rgba(59, 130, 246, 0.2)",
      badgeClass: "border-blue-700/50 bg-blue-950/40 text-blue-300",
      accentBorder: "group-hover:border-blue-500/50",
      imageSrc,
    };
  }
  if (key.includes("RANGER") || key.includes("СЛІДОПИТ")) {
    return {
      icon: Compass,
      bgGradient: "from-teal-950/85 via-emerald-950/40 to-slate-950",
      glowColor: "rgba(20, 184, 166, 0.2)",
      badgeClass: "border-teal-700/50 bg-teal-950/40 text-teal-300",
      accentBorder: "group-hover:border-teal-500/50",
      imageSrc,
    };
  }
  if (key.includes("ROGUE") || key.includes("ПЛУТ") || key.includes("ПРОЙДИСВІТ")) {
    return {
      icon: Key,
      bgGradient: "from-zinc-950 via-purple-950/40 to-slate-950",
      glowColor: "rgba(168, 85, 247, 0.2)",
      badgeClass: "border-purple-800/50 bg-zinc-900/60 text-purple-300",
      accentBorder: "group-hover:border-purple-500/50",
      imageSrc,
    };
  }
  if (key.includes("SORCERER") || key.includes("ЧАРОДІЙ")) {
    return {
      icon: WandSparkles,
      bgGradient: "from-purple-950/85 via-pink-950/40 to-slate-950",
      glowColor: "rgba(192, 38, 211, 0.2)",
      badgeClass: "border-purple-700/50 bg-purple-950/40 text-purple-300",
      accentBorder: "group-hover:border-purple-500/50",
      imageSrc,
    };
  }
  if (key.includes("WARLOCK") || key.includes("ЧАКЛУН") || key.includes("ЧОРНОКНИЖНИК")) {
    return {
      icon: Eye,
      bgGradient: "from-indigo-950/90 via-teal-950/40 to-slate-950",
      glowColor: "rgba(99, 102, 241, 0.2)",
      badgeClass: "border-indigo-700/50 bg-indigo-950/40 text-indigo-300",
      accentBorder: "group-hover:border-indigo-500/50",
      imageSrc,
    };
  }
  if (key.includes("WIZARD") || key.includes("ЧАРІВНИК")) {
    return {
      icon: BookOpen,
      bgGradient: "from-sky-950/85 via-blue-950/50 to-slate-950",
      glowColor: "rgba(14, 165, 233, 0.2)",
      badgeClass: "border-sky-700/50 bg-sky-950/40 text-sky-300",
      accentBorder: "group-hover:border-sky-500/50",
      imageSrc,
    };
  }
  if (key.includes("ARTIFICER") || key.includes("ВИНАХІДНИК")) {
    return {
      icon: Wrench,
      bgGradient: "from-amber-950/80 via-orange-950/40 to-slate-950",
      glowColor: "rgba(245, 158, 11, 0.2)",
      badgeClass: "border-amber-700/50 bg-amber-950/40 text-amber-300",
      accentBorder: "group-hover:border-amber-500/50",
      imageSrc,
    };
  }

  // Fallback
  return {
    icon: Shield,
    bgGradient: "from-slate-900/90 via-slate-900/60 to-slate-950",
    glowColor: "rgba(148, 163, 184, 0.15)",
    badgeClass: "border-slate-700/50 bg-slate-900/60 text-slate-300",
    accentBorder: "group-hover:border-slate-500/50",
    imageSrc,
  };
}

// 3. Class Hit Die & Primary Stat Helpers
export function getClassHitDie(className: string | null | undefined): string {
  const key = String(className ?? "").toUpperCase();
  if (key.includes("BARBARIAN") || key.includes("ВАРВАР")) return "к12";
  if (
    key.includes("FIGHTER") ||
    key.includes("ВОЇН") ||
    key.includes("PALADIN") ||
    key.includes("ПАЛАДИН") ||
    key.includes("RANGER") ||
    key.includes("СЛІДОПИТ")
  ) {
    return "к10";
  }
  if (
    key.includes("SORCERER") ||
    key.includes("ЧАРОДІЙ") ||
    key.includes("WIZARD") ||
    key.includes("ЧАРІВНИК")
  ) {
    return "к6";
  }
  return "к8";
}

export function getClassPrimaryStats(className: string | null | undefined): string {
  const key = String(className ?? "").toUpperCase();
  if (key.includes("BARBARIAN") || key.includes("ВАРВАР")) return "СИЛ • ТІЛ";
  if (key.includes("BARD") || key.includes("БАРД")) return "ХАР • ЛОВ";
  if (key.includes("CLERIC") || key.includes("ЖРЕЦЬ")) return "МУД • ТІЛ";
  if (key.includes("DRUID") || key.includes("ДРУЇД")) return "МУД • ТІЛ";
  if (key.includes("FIGHTER") || key.includes("ВОЇН")) return "СИЛ / ЛОВ";
  if (key.includes("MONK") || key.includes("МОНАХ")) return "ЛОВ • МУД";
  if (key.includes("PALADIN") || key.includes("ПАЛАДИН")) return "СИЛ • ХАР";
  if (key.includes("RANGER") || key.includes("СЛІДОПИТ")) return "ЛОВ • МУД";
  if (key.includes("ROGUE") || key.includes("ПЛУТ")) return "ЛОВ • ІНТ";
  if (key.includes("SORCERER") || key.includes("ЧАРОДІЙ")) return "ХАР • ТІЛ";
  if (key.includes("WARLOCK") || key.includes("ЧАКЛУН")) return "ХАР • ТІЛ";
  if (key.includes("WIZARD") || key.includes("ЧАРІВНИК")) return "ІНТ • ТІЛ";
  if (key.includes("ARTIFICER") || key.includes("ВИНАХІДНИК")) return "ІНТ • ТІЛ";
  return "Універсал";
}
