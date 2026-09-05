import { toEntitySlug } from "../../src/lib/slug-utils";
import { stripMarkup } from "./markup";
import { SourceFacility, readFacilities } from "./schema";

export type BastionSpace = "cramped" | "roomy" | "vast";

export type BastionOrder = "craft" | "empower" | "harvest" | "recruit" | "research" | "trade";

export type BastionHirelings = {
  exact: number | null;
  min: number | null;
  /// Приміщення побільшало — найманців треба більше. `null`, коли число не залежить від простору.
  space: BastionSpace | null;
};

/// Конʼюнктивна нормальна форма: усі `allOf` мають виконатися, всередині кожного досить одного
/// `anyOf`. Саме її вимагає §12 референсу — `War Room` це «Fighting Style АБО Unarmored
/// Defense», а `Red Wizard Necropolis` — «Red Wizards І будь-який заклинальний фокус».
export type BastionPrerequisite = { allOf: BastionRequirement[][] };

export type BastionRequirement =
  | { kind: "spellcastingFocus"; focus: string }
  | { kind: "membership"; organizationEng: string }
  | { kind: "renown"; organizationEng: string; min: number }
  | { kind: "expertise"; scope: "anySkill" }
  | { kind: "skillProficiency"; skillEng: string }
  | { kind: "feature"; featureEng: string };

export type ParsedBastionFacility = {
  slug: string;
  nameEng: string;
  source: string;
  page: number | null;
  facilityType: "basic" | "special";
  /// Рівень персонажа, з якого приміщення можна взяти. Базові його не мають.
  level: number | null;
  space: BastionSpace[];
  hirelings: BastionHirelings[];
  orders: BastionOrder[];
  prerequisite: BastionPrerequisite | null;
  prerequisiteTextEng: string;
  descriptionEng: string;
};

const SPACES: readonly string[] = ["cramped", "roomy", "vast"];

const ORDERS: readonly string[] = ["craft", "empower", "harvest", "recruit", "research", "trade"];

export function buildBastionFacilities(): ParsedBastionFacility[] {
  return readFacilities()
    .map(buildFacility)
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

function buildFacility(facility: SourceFacility): ParsedBastionFacility {
  const where = `${facility.nameEng} (${facility.source})`;
  const raw = facility.raw as Record<string, unknown>;

  return {
    slug: buildFacilitySlug(facility.nameEng),
    nameEng: facility.nameEng,
    source: findCatalogSource(facility.source),
    page: facility.page,
    facilityType: facility.facilityType,
    level: facility.level,
    space: facility.space.map((value) => readSpace(value, where)),
    hirelings: readHirelings(raw.hirelings, where),
    orders: facility.orders.map((value) => readOrder(value, where)),
    prerequisite: readPrerequisite(raw.prerequisite, where),
    prerequisiteTextEng: findPrerequisiteTextEng(raw.prerequisite, where),
    descriptionEng: renderEntries(raw.entries, where),
  };
}

/// Коди книг 2024 у 5etools (`XDMG`) і в наших мапах джерел (`DMG_2024`) різні. Каталог малює
/// назву книги через `sourceTranslations`, тож код треба звести тут, а не лишати сирим —
/// інакше поруч із приміщенням стоїть «XDMG» замість «Посібник Майстра (2024)».
const SOURCE_CODES: Record<string, string> = {
  XDMG: "DMG_2024",
  XPHB: "PHB_2024",
  XMM: "MM_2024",
};

function findCatalogSource(source: string): string {
  return SOURCE_CODES[source] ?? source;
}

/// `Séance Parlor` без цього дає `s-ance-parlor`: `toEntitySlug` різати діакритику не вміє,
/// а міняти його — це переписати слаґи восьми каталогів, що вже в проді.
function buildFacilitySlug(nameEng: string): string {
  return toEntitySlug(nameEng.normalize("NFD").replace(/\p{Diacritic}/gu, ""));
}

function readSpace(value: string, where: string): BastionSpace {
  if (!SPACES.includes(value)) throw new Error(`${where}: невідомий простір «${value}»`);
  return value as BastionSpace;
}

function readOrder(value: string, where: string): BastionOrder {
  if (!ORDERS.includes(value)) throw new Error(`${where}: невідомий наказ «${value}»`);
  return value as BastionOrder;
}

function readHirelings(value: unknown, where: string): BastionHirelings[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: hirelings не список`);

  return value.map((entry) => {
    const record = entry as Record<string, unknown>;
    const space = record.space === undefined ? null : readSpace(String(record.space), where);
    return {
      exact: typeof record.exact === "number" ? record.exact : null,
      min: typeof record.min === "number" ? record.min : null,
      space,
    };
  });
}

function readPrerequisite(value: unknown, where: string): BastionPrerequisite | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) throw new Error(`${where}: prerequisite не список`);
  if (value.length !== 1) throw new Error(`${where}: очікувався один блок передумов`);

  const allOf = Object.entries(value[0] as Record<string, unknown>).map(([key, payload]) =>
    readRequirementGroup(key, payload, where)
  );
  return allOf.length > 0 ? { allOf } : null;
}

function readRequirementGroup(key: string, payload: unknown, where: string): BastionRequirement[] {
  switch (key) {
    case "spellcastingFocus":
      return readFocusGroup(payload);
    case "membership":
      return asStringList(payload, where).map((organizationEng) => ({
        kind: "membership" as const,
        organizationEng,
      }));
    case "expertise":
      return [{ kind: "expertise", scope: "anySkill" }];
    case "proficiency":
      return readSkillProficiencyGroup(payload, where);
    case "otherSummary":
      return readOtherGroup(payload, where);
    default:
      throw new Error(`${where}: невідомий вид передумови «${key}»`);
  }
}

function readFocusGroup(payload: unknown): BastionRequirement[] {
  if (payload === true) return [{ kind: "spellcastingFocus", focus: "any" }];
  return (payload as string[]).map((focus) => ({ kind: "spellcastingFocus" as const, focus }));
}

function readSkillProficiencyGroup(payload: unknown, where: string): BastionRequirement[] {
  return (payload as Array<Record<string, unknown>>).flatMap((entry) =>
    asStringList(entry.skill, where).map((skillEng) => ({
      kind: "skillProficiency" as const,
      skillEng,
    }))
  );
}

/// `otherSummary` — єдине місце, де 5etools лишає передумову прозою. Розбираємо її на вираз, бо
/// KR19.1 вимагає саме виразу; нерозпізнана проза валить збірку, а не тихо стає текстом.
function readOtherGroup(payload: unknown, where: string): BastionRequirement[] {
  const entry = stripMarkup(String((payload as Record<string, unknown>).entry), where);

  const renown = /^Renown (\d+)\+ with (.+)$/.exec(entry);
  if (renown) {
    return [{ kind: "renown", organizationEng: renown[2], min: Number(renown[1]) }];
  }

  const features = entry.match(/([A-Z][\w' ]*?) feature/g);
  if (features) {
    return features.map((match) => ({
      kind: "feature" as const,
      featureEng: match.replace(/ feature$/, "").trim(),
    }));
  }

  throw new Error(`${where}: передумову «${entry}» не вдалося розкласти на вираз`);
}

function findPrerequisiteTextEng(value: unknown, where: string): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const other = (value[0] as Record<string, unknown>).otherSummary as
    | Record<string, unknown>
    | undefined;
  return other ? stripMarkup(String(other.entry), where) : "";
}

function asStringList(value: unknown, where: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${where}: очікувався список рядків`);
  return value.map(String);
}

function renderEntries(value: unknown, where: string): string {
  return renderNodes(value, where).join("\n\n").trim();
}

function renderNodes(value: unknown, where: string): string[] {
  if (typeof value === "string") return [stripMarkup(value, where)];
  if (Array.isArray(value)) return value.flatMap((node) => renderNodes(node, where));
  if (value === null || typeof value !== "object") return [];

  const node = value as Record<string, unknown>;
  switch (node.type) {
    case "entries":
      return renderNamedSection(node, where);
    case "list":
      return [renderList(node, where)];
    case "table":
      return renderTable(node, where);
    case "item":
      return [renderListItem(node, where)];
    default:
      throw new Error(`${where}: невідомий вузол опису «${String(node.type)}»`);
  }
}

function renderNamedSection(node: Record<string, unknown>, where: string): string[] {
  const body = renderNodes(node.entries, where);
  return node.name ? [`**${stripMarkup(String(node.name), where)}**`, ...body] : body;
}

function renderList(node: Record<string, unknown>, where: string): string {
  const items = node.items as unknown[];
  return items.map((item) => `- ${renderListItem(item, where)}`).join("\n");
}

function renderListItem(item: unknown, where: string): string {
  if (typeof item === "string") return stripMarkup(item, where);

  const node = item as Record<string, unknown>;
  const text = renderNodes(node.entry ?? node.entries, where).join(" ");
  return node.name ? `**${stripMarkup(String(node.name), where)}** ${text}` : text;
}

function renderTable(node: Record<string, unknown>, where: string): string[] {
  const labels = (node.colLabels as string[]).map((label) => stripMarkup(label, where));
  const rows = (node.rows as unknown[][]).map((row) =>
    row.map((cell) => stripMarkup(String(cell), where).replace(/\|/g, "\\|"))
  );

  const markdown = [
    `| ${labels.join(" | ")} |`,
    `| ${labels.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

  const caption = node.caption ? [`**${stripMarkup(String(node.caption), where)}**`] : [];
  const footnotes = ((node.footnotes as string[]) ?? []).map((note) => stripMarkup(note, where));
  return [...caption, markdown, ...footnotes];
}
