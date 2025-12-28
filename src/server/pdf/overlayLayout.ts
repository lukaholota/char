import type { Ability } from "@prisma/client";

export type OverlayFieldKey =
  | "characterName"
  | "classLevel"
  | "background"
  | "playerName"
  | "race"
  | "alignment"
  | "xp"
  | "ac"
  | "initiative"
  | "speed"
  | "proficiencyBonus"
  | "hpMax"
  | "hpCurrent"
  | "hpTemp"
  | `stat:${Ability}:score`
  | `stat:${Ability}:mod`;

export type OverlayText = {
  pageIndex: number; // 0-based
  x: number;
  y: number;
  width: number;
  height: number;
  size?: number;
  align?: "left" | "right" | "center";
};

// NOTE:
// - These coordinates are template-dependent.
// - Use `npx tsx tools/make_pdf_grid.ts public/CharacterSheet.pdf` to generate a grid PDF
//   and tune the rects below.
// - Units are PDF points (1 inch = 72 points). Origin is bottom-left.
export const CHARACTER_SHEET_OVERLAY: Partial<Record<OverlayFieldKey, OverlayText>> = {
  // Header
  characterName: { pageIndex: 0, x: 66, y: 734, width: 250, height: 16, size: 12, align: "left" },
  classLevel: { pageIndex: 0, x: 66, y: 710, width: 250, height: 12, size: 10, align: "left" },
  background: { pageIndex: 0, x: 66, y: 692, width: 250, height: 12, size: 10, align: "left" },
  playerName: { pageIndex: 0, x: 330, y: 710, width: 210, height: 12, size: 10, align: "left" },
  race: { pageIndex: 0, x: 330, y: 692, width: 210, height: 12, size: 10, align: "left" },
  alignment: { pageIndex: 0, x: 330, y: 674, width: 120, height: 12, size: 10, align: "left" },
  xp: { pageIndex: 0, x: 460, y: 674, width: 80, height: 12, size: 10, align: "right" },

  // Top right combat boxes (very approximate)
  ac: { pageIndex: 0, x: 458, y: 734, width: 40, height: 16, size: 14, align: "center" },
  initiative: { pageIndex: 0, x: 505, y: 734, width: 40, height: 16, size: 12, align: "center" },
  speed: { pageIndex: 0, x: 552, y: 734, width: 50, height: 16, size: 12, align: "center" },

  // HP block (approx)
  hpMax: { pageIndex: 0, x: 460, y: 610, width: 60, height: 12, size: 10, align: "center" },
  hpCurrent: { pageIndex: 0, x: 460, y: 580, width: 140, height: 18, size: 12, align: "center" },
  hpTemp: { pageIndex: 0, x: 460, y: 548, width: 140, height: 18, size: 12, align: "center" },

  // Proficiency bonus (approx)
  proficiencyBonus: { pageIndex: 0, x: 92, y: 628, width: 40, height: 16, size: 12, align: "center" },

  // Ability scores and mods (approx; tune with grid)
  "stat:STR:score": { pageIndex: 0, x: 54, y: 648, width: 50, height: 16, size: 12, align: "center" },
  "stat:STR:mod": { pageIndex: 0, x: 54, y: 622, width: 50, height: 16, size: 12, align: "center" },

  "stat:DEX:score": { pageIndex: 0, x: 54, y: 586, width: 50, height: 16, size: 12, align: "center" },
  "stat:DEX:mod": { pageIndex: 0, x: 54, y: 560, width: 50, height: 16, size: 12, align: "center" },

  "stat:CON:score": { pageIndex: 0, x: 54, y: 524, width: 50, height: 16, size: 12, align: "center" },
  "stat:CON:mod": { pageIndex: 0, x: 54, y: 498, width: 50, height: 16, size: 12, align: "center" },

  "stat:INT:score": { pageIndex: 0, x: 54, y: 462, width: 50, height: 16, size: 12, align: "center" },
  "stat:INT:mod": { pageIndex: 0, x: 54, y: 436, width: 50, height: 16, size: 12, align: "center" },

  "stat:WIS:score": { pageIndex: 0, x: 54, y: 400, width: 50, height: 16, size: 12, align: "center" },
  "stat:WIS:mod": { pageIndex: 0, x: 54, y: 374, width: 50, height: 16, size: 12, align: "center" },

  "stat:CHA:score": { pageIndex: 0, x: 54, y: 338, width: 50, height: 16, size: 12, align: "center" },
  "stat:CHA:mod": { pageIndex: 0, x: 54, y: 312, width: 50, height: 16, size: 12, align: "center" },
};
