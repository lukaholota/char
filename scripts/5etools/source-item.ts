import { MagicItemKind, MagicItemRarity, MAGIC_ITEM_RARITIES } from "../aidedd/magic-item-schema";
import { stripMarkup } from "./markup";
import { SourceItem } from "./schema";

/// Один запис корпусу 5etools у формі, придатній для перекладу й для колонок `MagicItem`.
/// Це не `ParsedMagicItem` з aidedd: там рядок типу друкований і його треба розбирати
/// регуляркою, тут тип, рідкість і налаштування лежать окремими полями, тож рядок типу
/// навпаки **збирається** — щоб перекладач бачив те саме, що надруковано в книзі.
export type SourceItemVariant = {
  nameEng: string;
  source: string;
  page: number | null;
  itemType: MagicItemKind;
  /// `null` — джерело каже «rarity varies»: у книзі рідкість задає таблиця варіантів усередині
  /// запису. Такий рядок бере рідкість із каталогу, як бандли aidedd у KR14.5.
  rarity: MagicItemRarity | null;
  requiresAttunement: boolean;
  attunementConditionEng: string;
  typeLineEng: string;
  descriptionEng: string;
  attachedSpellsEng: string[];
};

const RARITY_BY_WORD: Record<string, MagicItemRarity> = Object.fromEntries(
  MAGIC_ITEM_RARITIES.map(([word, rarity]) => [word, rarity])
);

/// Коди типів 5etools. Виведені з `Parser.ITEM_TYPE_JSON_TO_ABV` пінутої ревізії, а не з
/// голови: суфікс після `|` — це книга, що завела код, і на тип він не впливає.
const KIND_BY_TYPE_CODE: Record<string, MagicItemKind> = {
  M: "WEAPON",
  R: "WEAPON",
  A: "WEAPON",
  AF: "WEAPON",
  S: "ARMOR",
  LA: "ARMOR",
  MA: "ARMOR",
  HA: "ARMOR",
  RG: "RING",
  RD: "ROD",
  WD: "WAND",
  ST: "STAFF",
  P: "POTION",
  SC: "SCROLL",
  INS: "WONDROUS_ITEM",
  SCF: "WONDROUS_ITEM",
  GS: "WONDROUS_ITEM",
  OTH: "WONDROUS_ITEM",
};

/// Варіант (`magicvariants.json`) не має власного типу — він має перелік базових предметів,
/// до яких кріпиться. Тип беремо звідти: `{"sword": true}` дає зброю, `{"type": "HA"}` —
/// обладунок. Мовчазний відкат на «дивовижний предмет» тут заборонений: `Dragonlance`
/// поїхала б у каталог не тим типом і зникла б із фільтра зброї.
const KIND_BY_REQUIREMENT_FLAG: Record<string, MagicItemKind> = {
  sword: "WEAPON",
  bow: "WEAPON",
  crossbow: "WEAPON",
  axe: "WEAPON",
  club: "WEAPON",
  dagger: "WEAPON",
  hammer: "WEAPON",
  mace: "WEAPON",
  polearm: "WEAPON",
  spear: "WEAPON",
  staff: "WEAPON",
  firearm: "WEAPON",
  weapon: "WEAPON",
  armor: "ARMOR",
  shield: "ARMOR",
};

export function readSourceItemVariant(item: SourceItem): SourceItemVariant {
  const where = `${item.nameEng} (${item.source})`;
  const node = findPayload(item, where);

  const rarity = readRarity(node, where);
  const attunement = readAttunement(node, where);
  const itemType = readItemType(item, node, where);

  return {
    nameEng: item.nameEng,
    source: item.source,
    page: item.page,
    itemType,
    rarity,
    requiresAttunement: attunement.required,
    attunementConditionEng: attunement.condition,
    typeLineEng: buildTypeLine(itemType, node, rarity, attunement),
    descriptionEng: renderEntries(node.entries, node, where),
    attachedSpellsEng: readAttachedSpells(node, where),
  };
}

/// Варіант тримає всі поля в `inherits`; звичайний предмет — у собі. Далі по файлу різниці
/// між ними немає, і саме тому вона знімається одним місцем, а не гілкою в кожному читачі.
function findPayload(item: SourceItem, where: string): Record<string, unknown> {
  const raw = item.raw as Record<string, unknown>;
  if (item.container !== "magicvariant") return raw;

  const inherits = raw.inherits;
  if (typeof inherits !== "object" || inherits === null) {
    throw new Error(`${where}: варіант без inherits`);
  }
  return inherits as Record<string, unknown>;
}

function readRarity(node: Record<string, unknown>, where: string): MagicItemRarity | null {
  const word = typeof node.rarity === "string" ? node.rarity.toLowerCase() : "";
  if (word === "varies") return null;

  const known = RARITY_BY_WORD[word];
  if (!known) throw new Error(`${where}: рідкість «${node.rarity}» не читається`);
  return known;
}

type Attunement = { required: boolean; condition: string };

function readAttunement(node: Record<string, unknown>, where: string): Attunement {
  const value = node.reqAttune;
  if (value === undefined || value === false) return { required: false, condition: "" };
  if (value === true) return { required: true, condition: "" };
  if (typeof value === "string") return { required: true, condition: stripMarkup(value, where) };
  if (value === "optional") return { required: false, condition: "" };
  throw new Error(`${where}: reqAttune має несподіване значення ${JSON.stringify(value)}`);
}

function readItemType(
  item: SourceItem,
  node: Record<string, unknown>,
  where: string
): MagicItemKind {
  if (node.staff === true) return "STAFF";
  if (item.container === "magicvariant") return readVariantItemType(item, where);

  const code = typeof node.type === "string" ? node.type.split("|")[0] : "";
  if (code !== "") {
    const known = KIND_BY_TYPE_CODE[code];
    if (!known) throw new Error(`${where}: невідомий код типу «${node.type}»`);
    return node.wondrous === true && known === "WONDROUS_ITEM" ? "WONDROUS_ITEM" : known;
  }

  if (node.wondrous === true) return "WONDROUS_ITEM";
  throw new Error(`${where}: у записі немає ні type, ні wondrous — тип не виводиться`);
}

function readVariantItemType(item: SourceItem, where: string): MagicItemKind {
  const requires = (item.raw as Record<string, unknown>).requires;
  if (!Array.isArray(requires) || requires.length === 0) {
    throw new Error(`${where}: варіант без requires — базовий тип не виводиться`);
  }

  const kinds = new Set(requires.map((entry) => readRequirementKind(entry, where)));
  if (kinds.size !== 1) {
    throw new Error(`${where}: requires дає кілька типів (${[...kinds].join(", ")})`);
  }
  return [...kinds][0];
}

function readRequirementKind(entry: unknown, where: string): MagicItemKind {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`${where}: рядок requires не є обʼєктом`);
  }
  const record = entry as Record<string, unknown>;

  if (typeof record.type === "string") {
    const known = KIND_BY_TYPE_CODE[record.type.split("|")[0]];
    if (!known) throw new Error(`${where}: невідомий код типу requires «${record.type}»`);
    return known;
  }
  for (const [flag, kind] of Object.entries(KIND_BY_REQUIREMENT_FLAG)) {
    if (record[flag] === true) return kind;
  }
  /// «Pike»/«Lance» у `Dragonlance` і `weaponCategory: "martial"` у `Weapon of Throne's
  /// Command` — це теж зброя, просто названа не прапорцем.
  if (typeof record.name === "string" || typeof record.weaponCategory === "string") return "WEAPON";
  if (typeof record.dmgType === "string") return "WEAPON";

  throw new Error(`${where}: рядок requires ${JSON.stringify(record)} не називає типу`);
}

const TYPE_LINE_WORDS: Record<MagicItemKind, string> = {
  WEAPON: "Weapon",
  ARMOR: "Armor",
  WONDROUS_ITEM: "Wondrous item",
  POTION: "Potion",
  SCROLL: "Scroll",
  RING: "Ring",
  WAND: "Wand",
  ROD: "Rod",
  STAFF: "Staff",
};

const RARITY_WORDS: Record<MagicItemRarity, string> = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  VERY_RARE: "very rare",
  LEGENDARY: "legendary",
  ARTIFACT: "artifact",
};

function buildTypeLine(
  itemType: MagicItemKind,
  node: Record<string, unknown>,
  rarity: MagicItemRarity | null,
  attunement: Attunement
): string {
  const subtype = node.tattoo === true ? " (tattoo)" : "";
  const tail = attunement.required
    ? ` (requires attunement${attunement.condition === "" ? "" : ` ${attunement.condition}`})`
    : "";
  return `${TYPE_LINE_WORDS[itemType]}${subtype}, ${rarity === null ? "rarity varies" : RARITY_WORDS[rarity]}${tail}`;
}

/// `attachedSpells` буває і масивом назв, і обʼєктом за частотою (`{daily: {"1e": […]}}`).
/// Ключ `ability` серед них не список заклинань, а характеристика («int»), і без цього винятку
/// вона доїжджає в перелік як назва заклинання.
function readAttachedSpells(node: Record<string, unknown>, where: string): string[] {
  const value = node.attachedSpells;
  if (value === undefined) return [];
  const lists = Array.isArray(value)
    ? value
    : Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "ability")
        .map(([, entry]) => entry);

  return [...new Set(collectSpellNames(lists, where))];
}

function collectSpellNames(value: unknown, where: string): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return [stripMarkup(value, where).split("|")[0].split("#")[0]];
  if (Array.isArray(value)) return value.flatMap((entry) => collectSpellNames(entry, where));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      collectSpellNames(entry, where)
    );
  }
  throw new Error(`${where}: attachedSpells містить ${typeof value}`);
}

/// Проза предмета в тому ж вигляді, у якому її тримає каталог: абзаци через порожній рядок,
/// підпункти жирним, таблиці розміткою Markdown. Невідомий вузол — помилка: тихо пропущена
/// таблиця варіантів забирає з предмета половину правил і жоден гейт цього не побачить.
export function renderEntries(
  value: unknown,
  node: Record<string, unknown>,
  where: string
): string {
  return renderNodes(value, buildSubstitutions(node), where).join("\n\n").trim();
}

function buildSubstitutions(node: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(node)
      .filter(([, value]) => typeof value === "string" || typeof value === "number")
      .map(([key, value]) => [key, String(value)])
  );
}

function renderNodes(value: unknown, subs: Record<string, string>, where: string): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return [renderText(value, subs, where)];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => renderNodes(entry, subs, `${where}[${index}]`));
  }

  const node = value as Record<string, unknown>;
  const type = typeof node.type === "string" ? node.type : "entries";

  /// `render.js:474` — `section` рендериться тим самим шляхом, що й `entries`, лише з іншою
  /// глибиною заголовка, яка нам байдужа. `actions` (`_renderActions`, render.js:1651) робить
  /// той самий жирний заголовок + абзаци, що `_renderEntries` — розкладачу обʼєктів KR23.5
  /// (`actionEntries` силового балісти тощо) різниця теж байдужа.
  if (type === "entries" || type === "section" || type === "inset" || type === "quote" || type === "actions") {
    return renderBlock(node, subs, where);
  }
  if (type === "list") return renderList(node, subs, where);
  if (type === "item" || type === "itemSub") return renderBlock(node, subs, where);
  if (type === "table") return [renderTable(node, subs, where)];
  if (type === "attack") return renderAttack(node, subs, where);
  /// `_renderAbilityGeneric`, render.js:1600 — `<b>name</b> = text`, звірено з пінованою ревізією.
  if (type === "abilityGeneric") return renderAbilityGeneric(node, subs, where);
  /// Ілюстрації книг ми не імпортуємо — з них лишається тільки підпис, якщо він є. Це не мовчазна
  /// втрата: у полі `href` немає тексту, лише шлях до файла в репозиторії 5etools.
  if (type === "image") return renderImageCaption(node, subs, where);

  throw new Error(`${where}: невідомий вузол тексту «${type}»`);
}

/// `_renderAttack`, render.js:1675 — `<AttackType>: <attackEntries> Hit: <hitEntries>`, звірено
/// з пінованою ревізією, не вгадано. `Parser.ATK_TYPE_TO_FULL` пінутої ревізії має лише два
/// коди — MW і RW; обʼєкти KR23.5 інших не використовують.
const ATTACK_TYPE_TO_FULL: Record<string, string> = {
  MW: "Melee Weapon Attack",
  RW: "Ranged Weapon Attack",
};

function renderAttack(node: Record<string, unknown>, subs: Record<string, string>, where: string): string[] {
  const attackType = String(node.attackType ?? "");
  const full = ATTACK_TYPE_TO_FULL[attackType];
  if (!full) throw new Error(`${where}: невідомий attackType «${attackType}»`);

  const attackEntries = renderNodes(node.attackEntries, subs, `${where} › attackEntries`).join(" ");
  const hitEntries = renderNodes(node.hitEntries, subs, `${where} › hitEntries`).join(" ");
  return [`*${full}:* ${attackEntries} *Hit:* ${hitEntries}`];
}

function renderAbilityGeneric(
  node: Record<string, unknown>,
  subs: Record<string, string>,
  where: string
): string[] {
  const name = node.name === undefined ? "" : renderNodes(node.name, subs, `${where} › name`).join(" ");
  const text = node.text === undefined ? "" : renderNodes(node.text, subs, `${where} › text`).join(" ");
  return [name ? `**${name}** = ${text}` : text];
}

function renderBlock(
  node: Record<string, unknown>,
  subs: Record<string, string>,
  where: string
): string[] {
  const body = renderNodes(node.entries ?? node.entry, subs, `${where} › entries`);
  if (node.name === undefined) return body;

  const name = renderText(String(node.name), subs, where);
  const [first, ...rest] = body.length === 0 ? [""] : body;
  return [`**${name}.** ${first}`.trim(), ...rest];
}

function renderImageCaption(
  node: Record<string, unknown>,
  subs: Record<string, string>,
  where: string
): string[] {
  const caption = node.title ?? node.caption;
  return caption === undefined ? [] : [`_${renderText(String(caption), subs, where)}_`];
}

function renderList(
  node: Record<string, unknown>,
  subs: Record<string, string>,
  where: string
): string[] {
  return renderNodes(node.items, subs, `${where} › items`).map((line) =>
    line.startsWith("**") ? line : `- ${line}`
  );
}

function renderTable(
  node: Record<string, unknown>,
  subs: Record<string, string>,
  where: string
): string {
  const headers = readHeaderLabels(node, subs, where);
  const rows = readTableRows(node.rows, subs, `${where} › rows`);
  const caption = node.caption === undefined ? "" : `**${renderText(String(node.caption), subs, where)}**\n\n`;

  const width = Math.max(headers.length, ...rows.map((row) => row.length));
  const line = (cells: string[]) => `| ${pad(cells, width).join(" | ")} |`;

  return [
    caption + line(headers),
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...rows.map(line),
  ].join("\n");
}

function readTableRows(value: unknown, subs: Record<string, string>, where: string): string[][] {
  if (!Array.isArray(value)) throw new Error(`${where}: рядки таблиці не масив`);
  return value.map((row, index) => readCells(unwrapRow(row), subs, `${where}[${index}]`));
}

/// Деякі рядки книг 5etools обгорнуті `{type: "row", style, row: [...]}` замість голого масиву —
/// `_renderTable`, render.js:846 (`let roRender = r.type === "row" ? r.row : r`). `style`
/// (наприклад `row-indent-first`) лишається візуальним нюансом HTML, тут не потрібним.
function unwrapRow(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const node = value as Record<string, unknown>;
  return node.type === "row" ? node.row : value;
}

function readCells(value: unknown, subs: Record<string, string>, where: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: клітинки не масив`);
  return value.map((cell, index) => readCell(cell, subs, `${where}[${index}]`));
}

/// Клітинка буває обʼєктом `{type: "cell", roll: {exact | min, max}}` — це той самий кидок,
/// який у книзі надрукований числом або діапазоном, або `{type: "cell", width, entry}` —
/// клітинка-заголовок підрозділу таблиці (наприклад «Martial Ranged Weapons» над рядками зброї).
function readCell(value: unknown, subs: Record<string, string>, where: string): string {
  if (typeof value === "string") return renderText(value, subs, where);
  if (typeof value === "number") return String(value);
  if (typeof value !== "object" || value === null) throw new Error(`${where}: клітинка не читається`);

  const node = value as Record<string, unknown>;
  if (node.type === "cell") {
    if (node.roll !== undefined) return readRoll(node.roll, where);
    if (node.entry !== undefined) return renderNodes(node.entry, subs, where).join(" ");
    throw new Error(`${where}: клітинка типу cell без roll і без entry`);
  }
  return renderNodes(node, subs, where).join(" ");
}

/// Шапка буває однорядковою (`colLabels`) або багаторядковою (`colLabelRows`, наприклад
/// «Roll Needed» / «Number of Successes» над двома групами стовпців). Markdown-таблиця не має
/// colspan, тож груповий підпис зливається з власним через «—» на кожен стовпець.
function readHeaderLabels(node: Record<string, unknown>, subs: Record<string, string>, where: string): string[] {
  if (node.colLabels !== undefined) return readCells(node.colLabels, subs, `${where} › colLabels`);
  if (node.colLabelRows !== undefined) return flattenHeaderRows(node.colLabelRows, subs, `${where} › colLabelRows`);
  return [];
}

function flattenHeaderRows(value: unknown, subs: Record<string, string>, where: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${where}: не масив`);

  const expanded = value.map((row, index) => expandHeaderRow(row, subs, `${where}[${index}]`));
  const width = Math.max(0, ...expanded.map((row) => row.length));

  return Array.from({ length: width }, (_, col) => {
    const labels = expanded.map((row) => row[col] ?? "").filter((label) => label !== "");
    return [...new Set(labels)].join(" — ");
  });
}

/// `Renderer.table.getHeaderRowSpanWidth`, render.js:13962 — `cellHeader.width` рахує colspan;
/// тут те саме число розгортається повторенням підпису на всю ширину групи.
function expandHeaderRow(value: unknown, subs: Record<string, string>, where: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${where}: рядок шапки не масив`);

  return value.flatMap((cell, index) => {
    const cellWhere = `${where}[${index}]`;
    if (typeof cell === "object" && cell !== null && (cell as Record<string, unknown>).type === "cellHeader") {
      const record = cell as Record<string, unknown>;
      const label = renderNodes(record.entry, subs, cellWhere).join(" ");
      const span = typeof record.width === "number" ? record.width : 1;
      return Array.from({ length: span }, () => label);
    }
    return [readCell(cell, subs, cellWhere)];
  });
}

function readRoll(value: unknown, where: string): string {
  if (typeof value !== "object" || value === null) throw new Error(`${where}: roll не обʼєкт`);
  const roll = value as Record<string, unknown>;
  if (roll.exact !== undefined) return String(roll.exact);
  if (roll.min !== undefined && roll.max !== undefined) return `${roll.min}—${roll.max}`;
  throw new Error(`${where}: roll без exact і без min/max`);
}

function pad(cells: string[], width: number): string[] {
  return [...cells, ...Array.from({ length: Math.max(0, width - cells.length) }, () => "")];
}

/// `{=bonusWeapon}` — підстановка з полів самого запису; 5etools робить її в рендерері, і без
/// неї в тексті лишається «you gain a {=bonusWeapon} bonus».
function renderText(raw: string, subs: Record<string, string>, where: string): string {
  const substituted = raw.replace(/\{=([a-zA-Z]+)([^}]*)\}/g, (match, key: string) => {
    const value = subs[key];
    if (value === undefined) throw new Error(`${where}: немає поля «${key}» для підстановки ${match}`);
    return value;
  });
  return stripMarkup(substituted, where);
}
