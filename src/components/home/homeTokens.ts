/// Ratio of the two big covers. 1 = 1:1, the format the illustrator's future art ships in
/// (KR13.7 §4). Switching to 2:3 means writing `2 / 3` here and nothing else.
export const HOME_HERO_RATIO = 1;

/// Ratio of the small category covers, matching /images/categories/<slug>.webp (3:4).
export const HOME_TILE_RATIO = 3 / 4;

/// Caps how tall the hero row may grow, so the first category row always peeks into the
/// first screen (KR13.7 §6). Width is derived from the ratio, so the cap survives a ratio change.
const HERO_ROW_MAX_HEIGHT = "46svh";

export const HOME_HERO_ROW_MAX_WIDTH = `calc(${HERO_ROW_MAX_HEIGHT} * ${HOME_HERO_RATIO} * 2 + 1.5rem)`;

export type HomeAccentName = "arcaneViolet" | "runicCyan" | "emberGold" | "ashenSteel";

type HomeAccent = {
  textClassName: string;
  hoverTextClassName: string;
  frameClassName: string;
  glowClassName: string;
};

export const HOME_ACCENTS: Record<HomeAccentName, HomeAccent> = {
  arcaneViolet: {
    textClassName: "text-violet-300",
    hoverTextClassName: "group-hover:text-violet-200",
    frameClassName: "bg-violet-300/25",
    glowClassName: "group-hover:shadow-[0_0_44px_-14px_rgba(167,139,250,0.75)]",
  },
  runicCyan: {
    textClassName: "text-cyan-200",
    hoverTextClassName: "group-hover:text-cyan-100",
    frameClassName: "bg-cyan-200/25",
    glowClassName: "group-hover:shadow-[0_0_44px_-14px_rgba(103,232,249,0.75)]",
  },
  emberGold: {
    textClassName: "text-amber-300",
    hoverTextClassName: "group-hover:text-amber-200",
    frameClassName: "bg-amber-300/25",
    glowClassName: "group-hover:shadow-[0_0_44px_-14px_rgba(252,211,77,0.7)]",
  },
  ashenSteel: {
    textClassName: "text-slate-400",
    hoverTextClassName: "group-hover:text-slate-50",
    frameClassName: "bg-white/15",
    glowClassName: "group-hover:shadow-[0_0_34px_-16px_rgba(226,232,240,0.6)]",
  },
};
