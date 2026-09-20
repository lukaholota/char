import tableRows from "@/lib/generated/wild-magic-surge-table.json";

export type WildMagicSurgeTableRow = {
  roll: string;
  description: string;
};

export const WILD_MAGIC_SURGE_TABLE_ROWS = tableRows as WildMagicSurgeTableRow[];
