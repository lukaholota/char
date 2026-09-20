import { Atom, CircleDashed, Eye, Flame, Ghost, Heart, Shield, Skull, WandSparkles } from "lucide-react";
import type { ComponentType } from "react";

export type SchoolVisual = {
  icon: ComponentType<{ className?: string }>;
  iconWrap: string;
  iconColor: string;
  badgeClass: string;
};

export const DEFAULT_SCHOOL_VISUAL: SchoolVisual = {
  icon: CircleDashed,
  iconWrap: "bg-slate-900/65 border-slate-600/60",
  iconColor: "text-slate-300",
  badgeClass: "border-slate-600/60 bg-slate-900/55",
};

const SCHOOL_VISUALS: { keys: string[]; visual: SchoolVisual }[] = [
  {
    keys: ["evocation", "втілен"],
    visual: {
      icon: Flame,
      iconWrap: "bg-rose-950/55 border-rose-800/50",
      iconColor: "text-rose-300",
      badgeClass: "border-rose-800/50 bg-rose-950/40",
    },
  },
  {
    keys: ["necromancy", "некром"],
    visual: {
      icon: Skull,
      iconWrap: "bg-emerald-950/55 border-emerald-800/45",
      iconColor: "text-emerald-300",
      badgeClass: "border-emerald-800/45 bg-emerald-950/35",
    },
  },
  {
    keys: ["abjuration", "огородж", "захист"],
    visual: {
      icon: Shield,
      iconWrap: "bg-sky-950/55 border-sky-800/45",
      iconColor: "text-sky-300",
      badgeClass: "border-sky-800/45 bg-sky-950/35",
    },
  },
  {
    keys: ["conjuration", "виклик"],
    visual: {
      icon: WandSparkles,
      iconWrap: "bg-arcane-950/55 border-arcane-800/45",
      iconColor: "text-arcane-300",
      badgeClass: "border-arcane-800/45 bg-arcane-950/35",
    },
  },
  {
    keys: ["divination", "віщ", "ворож"],
    visual: {
      icon: Eye,
      iconWrap: "bg-amber-950/55 border-amber-800/50",
      iconColor: "text-amber-300",
      badgeClass: "border-amber-800/50 bg-amber-950/35",
    },
  },
  {
    keys: ["enchantment", "зачар", "причар"],
    visual: {
      icon: Heart,
      iconWrap: "bg-pink-950/55 border-pink-800/50",
      iconColor: "text-pink-300",
      badgeClass: "border-pink-800/50 bg-pink-950/35",
    },
  },
  {
    keys: ["illusion", "ілюз"],
    visual: {
      icon: Ghost,
      iconWrap: "bg-cyan-950/55 border-cyan-800/45",
      iconColor: "text-cyan-100",
      badgeClass: "border-cyan-800/45 bg-cyan-950/35",
    },
  },
  {
    keys: ["transmutation", "перетвор"],
    visual: {
      icon: Atom,
      iconWrap: "bg-purple-950/60 border-purple-800/50",
      iconColor: "text-purple-300",
      badgeClass: "border-purple-800/50 bg-purple-950/40",
    },
  },
];

export function findSchoolVisual(school: string | null | undefined): SchoolVisual {
  const key = String(school ?? "").toLowerCase();
  return SCHOOL_VISUALS.find((entry) => entry.keys.some((k) => key.includes(k)))?.visual ?? DEFAULT_SCHOOL_VISUAL;
}
