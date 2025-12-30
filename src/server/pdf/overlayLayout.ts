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
// - Ці координати виставлені за допомогою CharacterSheet.grid.pdf (Origin: bottom-left)
// - 1 inch = 72 points.
export const CHARACTER_SHEET_OVERLAY: Partial<Record<OverlayFieldKey, OverlayText>> = {
  // --- HEADER (Верхня плашка) ---
  characterName: { pageIndex: 0, x: 65, y: 708, width: 250, height: 16, size: 12, align: "left" },
  
  // Верхній рядок заголовка (Клас, Передісторія, Гравець)
  classLevel: { pageIndex: 0, x: 265, y: 721, width: 100, height: 12, size: 10, align: "left" },
  background: { pageIndex: 0, x: 378, y: 721, width: 95, height: 12, size: 10, align: "left" },
  playerName: { pageIndex: 0, x: 485, y: 721, width: 100, height: 12, size: 10, align: "left" },
  
  // Нижній рядок заголовка (Раса, Світогляд, Досвід)
  race: { pageIndex: 0, x: 265, y: 697, width: 100, height: 12, size: 10, align: "left" },
  alignment: { pageIndex: 0, x: 378, y: 697, width: 95, height: 12, size: 10, align: "left" },
  xp: { pageIndex: 0, x: 485, y: 697, width: 80, height: 12, size: 10, align: "right" },

  // --- COMBAT BLOCK (КБ, Ініціатива, Швидкість) ---
  ac: { pageIndex: 0, x: 398, y: 612, width: 34, height: 16, size: 14, align: "center" },
  initiative: { pageIndex: 0, x: 470, y: 612, width: 34, height: 16, size: 14, align: "center" },
  speed: { pageIndex: 0, x: 543, y: 612, width: 40, height: 16, size: 14, align: "center" },

  // --- HEALTH (HP) ---
  hpMax: { pageIndex: 0, x: 470, y: 568, width: 60, height: 12, size: 10, align: "center" },
  hpCurrent: { pageIndex: 0, x: 405, y: 532, width: 145, height: 20, size: 14, align: "center" },
  hpTemp: { pageIndex: 0, x: 405, y: 494, width: 145, height: 20, size: 14, align: "center" },

  // --- PROFICIENCY ---
  proficiencyBonus: { pageIndex: 0, x: 96, y: 624, width: 30, height: 16, size: 12, align: "center" },

  // --- STATS (STR, DEX, CON, INT, WIS, CHA) ---
  // Крок між статами приблизно 65 поінтів. Мод — на 25 поінтів нижче за Score.
  "stat:STR:score": { pageIndex: 0, x: 48, y: 638, width: 35, height: 16, size: 12, align: "center" },
  "stat:STR:mod": { pageIndex: 0, x: 48, y: 612, width: 35, height: 16, size: 14, align: "center" },

  "stat:DEX:score": { pageIndex: 0, x: 48, y: 572, width: 35, height: 16, size: 12, align: "center" },
  "stat:DEX:mod": { pageIndex: 0, x: 48, y: 546, width: 35, height: 16, size: 14, align: "center" },

  "stat:CON:score": { pageIndex: 0, x: 48, y: 507, width: 35, height: 16, size: 12, align: "center" },
  "stat:CON:mod": { pageIndex: 0, x: 48, y: 481, width: 35, height: 16, size: 14, align: "center" },

  "stat:INT:score": { pageIndex: 0, x: 48, y: 442, width: 35, height: 16, size: 12, align: "center" },
  "stat:INT:mod": { pageIndex: 0, x: 48, y: 416, width: 35, height: 16, size: 14, align: "center" },

  "stat:WIS:score": { pageIndex: 0, x: 48, y: 377, width: 35, height: 16, size: 12, align: "center" },
  "stat:WIS:mod": { pageIndex: 0, x: 48, y: 351, width: 35, height: 16, size: 14, align: "center" },

  "stat:CHA:score": { pageIndex: 0, x: 48, y: 312, width: 35, height: 16, size: 12, align: "center" },
  "stat:CHA:mod": { pageIndex: 0, x: 48, y: 286, width: 35, height: 16, size: 14, align: "center" },
};
