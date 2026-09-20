/// Ratio of the two big covers. Owner's call 2026-08-28: 2:3 on the home page.
export const HOME_HERO_RATIO = 2 / 3;

/// Ratio of the small category covers, matching /images/categories/<slug>.webp (3:4).
export const HOME_TILE_RATIO = 3 / 4;

/// Caps how tall the hero row may grow, so the first category row always peeks into the
/// first screen (KR13.7 §6). Width is derived from the ratio, so the cap survives a ratio change —
/// but a portrait ratio makes the height cap alone squeeze the covers into slivers, so the row
/// also has a floor: no cover gets narrower than the 298 px calibrated with the owner on 1440×900,
/// however many columns the row has.
const HERO_ROW_MAX_HEIGHT = "44svh";
const HERO_CARD_MIN_WIDTH = "298px";
const HERO_ROW_GAP = "1.5rem";

export function buildHomeHeroRowMaxWidth(columns: number): string {
  const gaps = `${HERO_ROW_GAP} * ${columns - 1}`;
  const floor = `min(calc(${HERO_CARD_MIN_WIDTH} * ${columns} + ${gaps}), 100%)`;
  const fromHeight = `calc(${HERO_ROW_MAX_HEIGHT} * ${HOME_HERO_RATIO} * ${columns} + ${gaps})`;
  return `max(${floor}, ${fromHeight})`;
}

export type HomeAccentName = "arcaneViolet" | "runicCyan" | "emberGold" | "prismSheen" | "ashenSteel";

type HomeAccent = {
  textClassName: string;
  hoverTextClassName: string;
  frameClassName: string;
  glowColor: string;
};

export const HOME_ACCENTS: Record<HomeAccentName, HomeAccent> = {
  arcaneViolet: {
    textClassName: "text-violet-300",
    hoverTextClassName: "group-hover:text-violet-200",
    frameClassName: "bg-violet-300/25",
    glowColor: "rgba(167,139,250,0.5)",
  },
  runicCyan: {
    textClassName: "text-cyan-200",
    hoverTextClassName: "group-hover:text-cyan-100",
    frameClassName: "bg-cyan-200/25",
    glowColor: "rgba(103,232,249,0.5)",
  },
  emberGold: {
    textClassName: "text-amber-300",
    hoverTextClassName: "group-hover:text-amber-200",
    frameClassName: "bg-amber-300/25",
    glowColor: "rgba(252,211,77,0.45)",
  },
  prismSheen: {
    textClassName: "text-prism-300",
    hoverTextClassName: "group-hover:text-prism-200",
    frameClassName: "bg-prism-300/25",
    glowColor: "rgba(192,74,224,0.45)",
  },
  ashenSteel: {
    textClassName: "text-slate-400",
    hoverTextClassName: "group-hover:text-slate-50",
    frameClassName: "bg-white/15",
    glowColor: "rgba(226,232,240,0.35)",
  },
};
