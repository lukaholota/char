import { StatblockEntry } from "../aidedd/creature-schema";
import { readCachedValue } from "./mirror";
import { stripMarkup } from "./markup";

const CORPUS_FILE = "bestiary/legendarygroups.json";

/// Дії лігва й регіональні ефекти лежать не в статблоці істоти, а окремим файлом; запис
/// посилається на групу парою `{name, source}`. Формат знято з рендерера пінованої ревізії
/// (`js/render.js`, `Renderer.monster._getCommonHtmlParts_lairActions`), а не вгаданий:
/// заголовки «Lair Actions» і «Regional Effects» рендерер тримає в коді, а весь текст —
/// включно з «On initiative count 20…» і «If the dragon dies…» — лежить у даних звичайними
/// рядками. Тому вступ і завершення ми беремо з масиву, а не дописуємо від себе.
export type LairSections = {
  lairInfo: string;
  lairActions: StatblockEntry[];
  regionEffects: StatblockEntry[];
};

export type LegendaryGroupReference = {
  name: string;
  source: string;
};

export function findLairSections(reference: unknown, where: string): LairSections | null {
  const key = readReferenceKey(reference, where);
  if (key === null) return null;

  const group = readGroupIndex().get(key);
  if (!group) {
    throw new Error(
      `${where}: у корпусі немає легендарної групи «${key}». ` +
        "Групи, що існують лише як `_versions`, читач не розгортає — назвіть це явно, а не пропускайте."
    );
  }

  const lair = readSection(group.lairActions, `${where} › lairActions`);
  const firstNamed = lair.findIndex((entry) => entry.name !== "");
  const introLength = firstNamed === -1 ? lair.length : firstNamed;

  /// Порожній рядок, а не пробіл: `buildDescriptionHtml` ділить на абзаци саме по `\n\n`, і без
  /// нього безіменні дії лігва (Штрад, чотири принци стихій) злипаються в один абзац — рішення
  /// власника 2026-08-27, питання 36.
  return {
    lairInfo: lair
      .slice(0, introLength)
      .map((entry) => entry.text)
      .join("\n\n"),
    lairActions: lair.slice(introLength),
    regionEffects: readSection(group.regionalEffects, `${where} › regionalEffects`),
  };
}

function readReferenceKey(reference: unknown, where: string): string | null {
  if (reference === undefined || reference === null) return null;

  const node = readObject(reference, `${where} › legendaryGroup`);
  const name = readStringValue(node.name, `${where} › legendaryGroup.name`);
  const source = readStringValue(node.source, `${where} › legendaryGroup.source`);
  return buildKey(name, source);
}

function buildKey(name: string, source: string): string {
  return `${name.toLowerCase()}|${source.toLowerCase()}`;
}

type RawGroup = Record<string, unknown>;

let groupIndex: Map<string, RawGroup> | null = null;

function readGroupIndex(): Map<string, RawGroup> {
  if (groupIndex) return groupIndex;

  const container = readObject(readCachedValue(CORPUS_FILE), CORPUS_FILE);
  const rows = container.legendaryGroup;
  if (!Array.isArray(rows)) throw new Error(`${CORPUS_FILE}: очікували масив legendaryGroup`);

  const raw = new Map<string, RawGroup>();
  for (const [index, row] of rows.entries()) {
    const group = readObject(row, `${CORPUS_FILE}[${index}]`);
    const name = readStringValue(group.name, `${CORPUS_FILE}[${index}].name`);
    const source = readStringValue(group.source, `${CORPUS_FILE}[${index}].source`);
    raw.set(buildKey(name, source), group);
  }

  groupIndex = new Map([...raw].map(([key, group]) => [key, applyInheritance(group, raw, key)]));
  return groupIndex;
}

/// `_copy` у цьому файлі — злиття всередині нього самого (`_meta.internalCopies`), і рівно два
/// режими: `appendArr` у відьом і `prependArr` в архідияволів. Будь-який інший режим — помилка,
/// бо мовчазний пропуск тут означає групу без половини правил.
function applyInheritance(group: RawGroup, raw: Map<string, RawGroup>, key: string): RawGroup {
  const copy = group._copy;
  if (copy === undefined) return group;

  const where = `${CORPUS_FILE} › ${key} › _copy`;
  const node = readObject(copy, where);
  const parentKey = buildKey(
    readStringValue(node.name, `${where}.name`),
    readStringValue(node.source, `${where}.source`)
  );
  const parent = raw.get(parentKey);
  if (!parent) throw new Error(`${where}: немає батьківської групи «${parentKey}»`);

  const merged: RawGroup = { ...applyInheritance(parent, raw, parentKey), ...withoutInheritanceKeys(group) };
  const mods = node._mod === undefined ? {} : readObject(node._mod, `${where}._mod`);

  for (const [property, mod] of Object.entries(mods)) {
    merged[property] = applyArrayMod(merged[property], mod, `${where}._mod.${property}`);
  }

  return merged;
}

function withoutInheritanceKeys(group: RawGroup): RawGroup {
  const { _copy, ...rest } = group;
  void _copy;
  return rest;
}

function applyArrayMod(current: unknown, mod: unknown, where: string): unknown[] {
  const node = readObject(mod, where);
  const mode = readStringValue(node.mode, `${where}.mode`);
  const items = Array.isArray(node.items) ? node.items : [node.items];
  const base = Array.isArray(current) ? current : [];

  if (mode === "appendArr") return [...base, ...items];
  if (mode === "prependArr") return [...items, ...base];
  throw new Error(`${where}: невідомий режим злиття «${mode}»`);
}

/// Секція лігва — суміш безіменної прози й іменованих пунктів списку, і **порядок джерела має
/// значення**: «Якщо дракон гине, ці ефекти згасають…» стоїть після переліку, а не перед ним.
/// Тому секція лишається одним впорядкованим списком, у якому безіменний запис — це абзац.
function readSection(value: unknown, where: string): StatblockEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: очікували масив`);

  return value.flatMap((node, index) => readNode(node, `${where}[${index}]`));
}

function readNode(node: unknown, where: string): StatblockEntry[] {
  if (typeof node === "string") return [toUnnamedEntry(stripMarkup(node, where))];

  const object = readObject(node, where);
  const type = object.type === undefined ? "entries" : readStringValue(object.type, `${where}.type`);

  if (type === "list") return readList(object.items, `${where} › items`);
  if (type === "item" || type === "itemSub" || type === "entries") return [readNamedEntry(object, where)];

  throw new Error(`${where}: невідомий вузол секції лігва «${type}»`);
}

function readList(items: unknown, where: string): StatblockEntry[] {
  if (!Array.isArray(items)) throw new Error(`${where}: очікували масив`);
  return items.flatMap((item, index) => readNode(item, `${where}[${index}]`));
}

function readNamedEntry(node: RawGroup, where: string): StatblockEntry {
  const name = node.name === undefined ? "" : stripMarkup(readStringValue(node.name, `${where}.name`), where);
  return { name, text: readText(node.entries ?? node.entry, `${where} › entries`) };
}

function readText(value: unknown, where: string): string {
  if (value === undefined) return "";
  if (typeof value === "string") return stripMarkup(value, where);
  if (Array.isArray(value)) {
    return value
      .map((item, index) => readText(item, `${where}[${index}]`))
      .filter((part) => part !== "")
      .join(" ");
  }

  const node = readObject(value, where);
  const type = node.type === undefined ? "entries" : readStringValue(node.type, `${where}.type`);
  if (type === "list") return readText(node.items, `${where} › items`);
  if (type === "item" || type === "itemSub" || type === "entries") {
    const entry = readNamedEntry(node, where);
    return entry.name === "" ? entry.text : `${entry.name}. ${entry.text}`;
  }

  throw new Error(`${where}: невідомий вузол тексту «${type}»`);
}

function toUnnamedEntry(text: string): StatblockEntry {
  return { name: "", text };
}

function readObject(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${where}: очікували обʼєкт`);
  }
  return value as Record<string, unknown>;
}

function readStringValue(value: unknown, where: string): string {
  if (typeof value !== "string") throw new Error(`${where}: очікували рядок`);
  return value;
}
