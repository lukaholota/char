export type LibraryMap = {
  slug: string;
  name: string;
  originalName: string;
  pack: string;
  key: string;
  width: number;
  height: number;
  grid: { columns: number; rows: number } | null;
};

export const MAP_LIBRARY_KEY_PREFIX = "library/maps/";

export const MAP_LIBRARY_PACK_LABELS: Record<string, string> = {
  dndavid: "DnDavid",
  bloodborne: "Bloodborne",
  theros: "Терос",
  "castle-ravenloft": "Замок Равенлофт",
  "elden-ring": "Elden Ring",
  "kanji-temples": "Забуті храми",
  "dark-souls": "Dark Souls",
};
