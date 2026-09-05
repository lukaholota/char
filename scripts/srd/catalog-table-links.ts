/**
 * Таблиці зброї й обладунків уже є каталогами — /weapons і /armor, і їхні двійники 2024.
 * Друга копія в довіднику з часом розійшлася б із каталогом, а цей проєкт уже має цей клас
 * багів, тому проза несе посилання на каталог замість таблиці.
 */

export const RULES_2014_CATALOG_PREFIX = "";
export const RULES_2024_CATALOG_PREFIX = "/2024";

type CatalogTable = {
  /// SRD 5.1 підписує таблицю «Table- Armor», SRD 5.2.1 — просто «Armor».
  caption: RegExp;
  headerColumn: string;
  catalogPath: string;
  catalogName: string;
};

const CATALOG_TABLES: CatalogTable[] = [
  {
    caption: /^\*\*(?:Table- )?Weapons\*\*$/,
    headerColumn: "Damage",
    catalogPath: "/weapons",
    catalogName: "Weapons",
  },
  {
    caption: /^\*\*(?:Table- )?Armor\*\*$/,
    headerColumn: "Armor Class",
    catalogPath: "/armor",
    catalogName: "Armor",
  },
];

export function linkCatalogTables(body: string, catalogPrefix: string): string {
  return CATALOG_TABLES.reduce((text, table) => replaceTableWithLink(text, table, catalogPrefix), body);
}

export function findCatalogLinks(catalogPrefix: string): string[] {
  return CATALOG_TABLES.map((table) => buildCatalogLink(table, catalogPrefix));
}

/// Речення довкола посилання переклав KR20.8, а сам маршрут перекладу не має. Тому гейт у
/// tests/content/rules-equipment-import.test.ts звіряє маршрут, а не англійський рядок.
export function findCatalogHrefs(catalogPrefix: string): string[] {
  return CATALOG_TABLES.map((table) => `](${catalogPrefix}${table.catalogPath})`);
}

function replaceTableWithLink(body: string, table: CatalogTable, catalogPrefix: string): string {
  const blocks = body.split("\n\n");
  const captionIndex = blocks.findIndex((block) => table.caption.test(block.trim()));
  if (captionIndex < 0 || !isTableOf(blocks[captionIndex + 1] ?? "", table)) return body;

  blocks.splice(captionIndex, 2, buildCatalogLink(table, catalogPrefix));
  return blocks.join("\n\n");
}

function isTableOf(block: string, table: CatalogTable): boolean {
  return block.startsWith("|") && block.split("\n")[0].includes(table.headerColumn);
}

function buildCatalogLink(table: CatalogTable, catalogPrefix: string): string {
  return `The full ${table.catalogName} table is the [${table.catalogName} catalog](${catalogPrefix}${table.catalogPath}).`;
}
