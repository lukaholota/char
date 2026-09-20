import surge from "@/lib/generated/wild-magic-surge-table.json";

export type WildMagicSurgeTableRow = {
  roll: string;
  description: string;
};

type WildMagicSurge = {
  intro: string;
  rows: WildMagicSurgeTableRow[];
};

const WILD_MAGIC_SURGE = surge as WildMagicSurge;

export const WILD_MAGIC_SURGE_TABLE_ROWS = WILD_MAGIC_SURGE.rows;
export const WILD_MAGIC_SURGE_INTRO = WILD_MAGIC_SURGE.intro;
