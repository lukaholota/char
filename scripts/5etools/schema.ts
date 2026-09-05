import { readCachedJson, readCachedValue, readLockedSourceLock } from "./mirror";

export type RulesEdition = "RULES_2014" | "RULES_2024";

export type SourceKind = "creature" | "spell" | "item" | "baseItem" | "facility";

export type ItemContainer = "item" | "itemGroup" | "magicvariant";

/// `raw` — незайманий вузол JSON. Схема KR16.1 обіцяє лише те, що справді перевірила;
/// решту полів читають наступні KR, свідомо розширюючи цей файл, а не кастами.
export type SourceRecord = {
  kind: SourceKind;
  nameEng: string;
  source: string;
  page: number | null;
  edition: RulesEdition;
  raw: unknown;
};

export type SourceCreature = SourceRecord & {
  kind: "creature";
  isFullStatblock: boolean;
  challengeRating: string | null;
};

export type SourceSpell = SourceRecord & {
  kind: "spell";
  level: number;
  school: string;
};

export type SourceItem = SourceRecord & {
  kind: "item";
  container: ItemContainer;
  rarity: string | null;
  requiresAttunement: boolean;
  hasFullText: boolean;
};

/// Базовий предмет (`items-base.json`) — спорядження без магії: зброя, обладунок, інструмент,
/// боєприпас. Тут лежать саме ті поля, які має наш каталог спорядження, тому звірка йде
/// колонка-в-колонку, а не по вільному тексту. Коди типів і властивостей лишаються сирими:
/// перекладати їх — робота того, хто звіряє, а не читача корпусу.
export type SourceBaseItem = SourceRecord & {
  kind: "baseItem";
  typeCode: string;
  isWeapon: boolean;
  isArmor: boolean;
  isFirearm: boolean;
  /// `renaissance` / `modern` / `futuristic` — позначка розділу «Firearms» у DMG. Її несуть
  /// рівно ті десять зразків, які наш каталог 2014 тримає окремим типом `FIREARMS`; мушкет
  /// і пістоль XPHB її не мають, бо 2024 звела їх у звичайну бойову дальню зброю.
  ageCategory: string | null;
  weaponCategory: "simple" | "martial" | null;
  armorClass: number | null;
  strengthRequirement: number | null;
  hasStealthDisadvantage: boolean;
  propertyCodes: string[];
  masteryNames: string[];
  damage: string | null;
  damageTypeCode: string | null;
  versatileDamage: string | null;
  rangeNormal: number | null;
  rangeLong: number | null;
  weightPounds: number | null;
  valueCopper: number | null;
};

/// Рядок вмісту набору спорядження. `itemKey` — ключ базового предмета (`candle|phb`),
/// `specialText` — вільний рядок для того, чого в корпусі немає окремим предметом
/// («alms box»). Рівно один із двох непорожній.
export type SourcePackEntry = {
  itemKey: string | null;
  specialText: string | null;
  quantity: number;
};

export type SourceFacility = SourceRecord & {
  kind: "facility";
  facilityType: "basic" | "special";
  level: number | null;
  space: string[];
  orders: string[];
};

/// Книги, що вийшли з ревізією 2024 і пізніше. Перелік виведений із
/// `Parser.SOURCE_JSON_TO_DATE` у `js/parser.js` тієї самої пінутої ревізії дзеркала:
/// усе з датою від 2024-09-17 (вихід XPHB). Редакцію беремо звідси, ніколи за назвою —
/// `Boots of False Tracks` існує і в XGE, і в XDMG з різним налаштуванням.
export const RULES_2024_SOURCES: ReadonlySet<string> = new Set([
  "ABH",
  "BQDD",
  "BQGT",
  "CaBoMP",
  "DrDe",
  "EFA",
  "FFotR",
  "FRAiF",
  "FRHoF",
  "HBTD",
  "HFDoMM",
  "HotB",
  "LFL",
  "NF",
  "RHW",
  "ScoEE",
  "UtHftLH",
  "WttHC",
  "XDMG",
  "XMM",
  "XPHB",
  "XSAC",
  "XScreen",
  "XScreenRHW",
]);

export function findEditionBySource(source: string): RulesEdition {
  return RULES_2024_SOURCES.has(source) ? "RULES_2024" : "RULES_2014";
}

/// Ключ для звірки з нашими маніфестами: лише літери й цифри. `Were Bat` в aidedd і
/// `Werebat` у 5etools — та сама істота, і на цьому одному пробілі звірка вже промахувалася.
export function findLooseNameKey(nameEng: string): string {
  return nameEng.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function readCreatures(): SourceCreature[] {
  return readBookIndex("bestiary").flatMap((path) => readCreaturesFrom(readCachedValue(path), path));
}

export function readSpells(): SourceSpell[] {
  return readBookIndex("spells").flatMap((path) => readSpellsFrom(readCachedValue(path), path));
}

export function readItems(): SourceItem[] {
  return readItemsFrom(readCachedValue("items.json"), "items.json");
}

/// Варіанти (`+1 Ammunition`, «of Slaying») тримають свої поля в `inherits`, а в тексті
/// лишають підстановки виду `{=bonusWeapon}`. Розкладати їх — робота KR16.4.
export function readMagicVariants(): SourceItem[] {
  return readMagicVariantsFrom(readCachedValue("magicvariants.json"), "magicvariants.json");
}

/// Базове спорядження лежить окремим файлом від `items.json`: там магія, тут зброя,
/// обладунки, інструменти й боєприпаси. Каталог спорядження звіряється саме з цим файлом.
export function readBaseItems(): SourceBaseItem[] {
  return readBaseItemsFrom(readCachedValue("items-base.json"), "items-base.json");
}

export function readBaseItemsFrom(container: unknown, where: string): SourceBaseItem[] {
  return pickRecords(container, "baseitem", where).map((entry, index) =>
    buildBaseItem(entry, `${where} › baseitem[${index}]`)
  );
}

/// `packContents` — машинний вміст набору. Кількість, якої там немає, означає одиницю;
/// але саме це поле в корпусі буває біднішим за прозу поруч (див. звірку наборів KR16.5),
/// тому читач віддає його як є, а розбіжність із прозою розбирає той, хто звіряє.
export function readPackContents(item: SourceItem): SourcePackEntry[] {
  const where = `${item.nameEng} (${item.source}) › packContents`;
  const raw = readObject(item.raw, where).packContents;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${where}: не масив`);

  return raw.map((entry, index) => buildPackEntry(entry, `${where}[${index}]`));
}

export type SpellClassEntry = {
  name: string;
  source: string;
  /// `true` — клас дістає заклинання не зі свого базового переліку, а з розширеного списку
  /// іншої книги (`classVariant`, здебільшого TCE). Рішення власника 2026-08-23: такі класи
  /// беремо, але книгу, що їх дає, треба показувати — вона в `definedIn`.
  isVariant: boolean;
  /// Книга, що завела розширений список. Порожньо для базового переліку.
  definedIn: string;
};

/// `spells/sources.json`: `ДЖЕРЕЛО → назва заклинання → { class, classVariant }`. Списки класів
/// не лежать у самому записі заклинання, тому без цього файла їх нема звідки взяти.
export function readSpellClassIndex(): Map<string, SpellClassEntry[]> {
  return readSpellClassIndexFrom(readCachedValue("spells/sources.json"), "spells/sources.json");
}

/// Читаємо і `class`, і `classVariant`: заклинання з супліментів (XGE, TCE) роздають класи
/// саме через другий ключ, і без нього 154 записи 2014 виглядали б як «клас нізвідки».
export function readSpellClassIndexFrom(
  value: unknown,
  where: string
): Map<string, SpellClassEntry[]> {
  const bySource = readObject(value, where);
  const index = new Map<string, SpellClassEntry[]>();

  for (const [source, spells] of Object.entries(bySource)) {
    for (const [nameEng, lists] of Object.entries(readObject(spells, `${where} › ${source}`))) {
      const where2 = `${where} › ${source} › ${nameEng}`;
      const record = readObject(lists, where2);
      const entries = [
        ...readClassEntries(record.class, `${where2} › class`, false),
        ...readClassEntries(record.classVariant, `${where2} › classVariant`, true),
      ];

      if (entries.length > 0) index.set(`${source}|${findLooseNameKey(nameEng)}`, entries);
    }
  }

  return index;
}

function readClassEntries(
  value: unknown,
  where: string,
  isVariant: boolean
): SpellClassEntry[] {
  if (!Array.isArray(value)) return [];

  return value.map((entry, position) => {
    const record = readObject(entry, `${where}[${position}]`);
    return {
      name: readString(record, "name", `${where}[${position}]`),
      source: readString(record, "source", `${where}[${position}]`),
      isVariant,
      definedIn: isVariant ? readString(record, "definedInSource", `${where}[${position}]`) : "",
    };
  });
}

export function readFacilities(): SourceFacility[] {
  return readFacilitiesFrom(readCachedValue("bastions.json"), "bastions.json");
}

export function readCreaturesFrom(container: unknown, where: string): SourceCreature[] {
  return pickRecords(container, "monster", where).map((entry, index) =>
    buildCreature(entry, `${where} › monster[${index}]`)
  );
}

export function readSpellsFrom(container: unknown, where: string): SourceSpell[] {
  return pickRecords(container, "spell", where).map((entry, index) =>
    buildSpell(entry, `${where} › spell[${index}]`)
  );
}

export function readItemsFrom(container: unknown, where: string): SourceItem[] {
  return [
    ...pickRecords(container, "item", where).map((entry, index) =>
      buildItem(entry, "item", `${where} › item[${index}]`)
    ),
    ...pickRecords(container, "itemGroup", where).map((entry, index) =>
      buildItem(entry, "itemGroup", `${where} › itemGroup[${index}]`)
    ),
  ];
}

export function readMagicVariantsFrom(container: unknown, where: string): SourceItem[] {
  return pickRecords(container, "magicvariant", where).map((entry, index) =>
    buildMagicVariant(entry, `${where} › magicvariant[${index}]`)
  );
}

export function readFacilitiesFrom(container: unknown, where: string): SourceFacility[] {
  return pickRecords(container, "facility", where).map((entry, index) =>
    buildFacility(entry, `${where} › facility[${index}]`)
  );
}

/// Кожен файл пінутого корпусу, а не лише ті контейнери, що мають типізованих читачів:
/// розкладач розмітки має пройти геть усе, інакше «невідомих тегів нема» нічого не значить.
export function readCorpusFiles(): { path: string; content: unknown }[] {
  return Object.keys(readLockedSourceLock().files).map((path) => ({
    path,
    content: readCachedValue(path),
  }));
}

export function collectStringsDeep(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringsDeep);
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(collectStringsDeep);
  }
  return [];
}

function buildBaseItem(entry: Record<string, unknown>, where: string): SourceBaseItem {
  const source = readString(entry, "source", where);
  const range = readRange(entry, where);

  return {
    kind: "baseItem",
    nameEng: readString(entry, "name", where),
    source,
    page: readOptionalNumber(entry, "page", where),
    edition: findEditionBySource(source),
    raw: entry,
    typeCode: readTypeCode(entry, where),
    isWeapon: entry.weapon === true,
    isArmor: entry.armor === true,
    isFirearm: entry.firearm === true,
    ageCategory: readOptionalString(entry, "age", where),
    weaponCategory: readWeaponCategory(entry, where),
    armorClass: readOptionalNumber(entry, "ac", where),
    strengthRequirement: readStrengthRequirement(entry, where),
    hasStealthDisadvantage: entry.stealth === true,
    propertyCodes: readPropertyCodes(entry, where),
    masteryNames: readMasteryNames(entry, where),
    damage: readOptionalString(entry, "dmg1", where),
    damageTypeCode: readOptionalString(entry, "dmgType", where),
    versatileDamage: readOptionalString(entry, "dmg2", where),
    rangeNormal: range.normal,
    rangeLong: range.long,
    weightPounds: readOptionalNumber(entry, "weight", where),
    valueCopper: readOptionalNumber(entry, "value", where),
  };
}

function buildPackEntry(entry: unknown, where: string): SourcePackEntry {
  if (typeof entry === "string") return { itemKey: entry, specialText: null, quantity: 1 };

  const record = readObject(entry, where);
  const quantity = readOptionalNumber(record, "quantity", where) ?? 1;
  const itemKey = readOptionalString(record, "item", where);
  const specialText = readOptionalString(record, "special", where);

  if (itemKey === null && specialText === null) {
    throw new Error(`${where}: рядок набору без «item» і без «special»`);
  }

  return { itemKey, specialText, quantity };
}

/// Тип у корпусі — `LA|XPHB`, `M`, `R|XPHB`. Книга після риски каже, хто завів код, і на
/// сам тип не впливає — рівно як у читачі магічних предметів KR16.4.
function readTypeCode(entry: Record<string, unknown>, where: string): string {
  const raw = readOptionalString(entry, "type", where);
  return raw === null ? "" : raw.split("|")[0];
}

function readWeaponCategory(
  entry: Record<string, unknown>,
  where: string
): "simple" | "martial" | null {
  const value = readOptionalString(entry, "weaponCategory", where);
  if (value === null) return null;
  if (value !== "simple" && value !== "martial") {
    throw new Error(`${where}: невідома категорія зброї «${value}»`);
  }
  return value;
}

/// Вимога до Сили в корпусі — рядок («13»), а не число.
function readStrengthRequirement(
  entry: Record<string, unknown>,
  where: string
): number | null {
  const value = readOptionalString(entry, "strength", where);
  if (value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${where}: вимога до Сили «${value}» не число`);
  return parsed;
}

/// Властивість буває рядком (`"V|XPHB"`) і обʼєктом із приміткою
/// (`{uid: "2H|XPHB", note: "unless mounted"}`) — списи 2024 саме такі.
function readPropertyCodes(entry: Record<string, unknown>, where: string): string[] {
  const value = entry.property;
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: поле «property» не масив`);

  return value.map((item, index) => {
    const at = `${where} › property[${index}]`;
    if (typeof item === "string") return item.split("|")[0];
    return readString(readObject(item, at), "uid", at).split("|")[0];
  });
}

function readMasteryNames(entry: Record<string, unknown>, where: string): string[] {
  const value = entry.mastery;
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: поле «mastery» не масив`);

  return value.map((item, index) => {
    if (typeof item !== "string") throw new Error(`${where}: «mastery[${index}]» не рядок`);
    return item.split("|")[0];
  });
}

/// Дальність у корпусі — один рядок «20/60».
function readRange(
  entry: Record<string, unknown>,
  where: string
): { normal: number | null; long: number | null } {
  const value = readOptionalString(entry, "range", where);
  if (value === null) return { normal: null, long: null };

  const parts = value.split("/");
  const normal = Number(parts[0]);
  const long = parts.length > 1 ? Number(parts[1]) : Number.NaN;
  if (!Number.isFinite(normal) || !Number.isFinite(long)) {
    throw new Error(`${where}: дальність «${value}» не читається`);
  }
  return { normal, long };
}

function buildCreature(entry: Record<string, unknown>, where: string): SourceCreature {
  const source = readString(entry, "source", where);

  return {
    kind: "creature",
    nameEng: readString(entry, "name", where),
    source,
    page: readOptionalNumber(entry, "page", where),
    edition: findEditionBySource(source),
    raw: entry,
    isFullStatblock: hasFullStatblock(entry),
    challengeRating: readChallengeRating(entry),
  };
}

function buildSpell(entry: Record<string, unknown>, where: string): SourceSpell {
  const source = readString(entry, "source", where);
  const level = readOptionalNumber(entry, "level", where);
  if (level === null) throw new Error(`${where}: заклинання без рівня`);

  return {
    kind: "spell",
    nameEng: readString(entry, "name", where),
    source,
    page: readOptionalNumber(entry, "page", where),
    edition: findEditionBySource(source),
    raw: entry,
    level,
    school: readString(entry, "school", where),
  };
}

function buildItem(
  entry: Record<string, unknown>,
  container: ItemContainer,
  where: string
): SourceItem {
  const source = readString(entry, "source", where);

  return {
    kind: "item",
    nameEng: readString(entry, "name", where),
    source,
    page: readOptionalNumber(entry, "page", where),
    edition: findEditionBySource(source),
    raw: entry,
    container,
    rarity: readOptionalString(entry, "rarity", where),
    requiresAttunement: entry.reqAttune !== undefined && entry.reqAttune !== false,
    hasFullText: hasNonEmptyEntries(entry.entries),
  };
}

function buildMagicVariant(entry: Record<string, unknown>, where: string): SourceItem {
  const inherits = readOptionalObject(entry, "inherits", where) ?? {};
  const source = readOptionalString(inherits, "source", where) ?? "";
  if (source === "") throw new Error(`${where}: варіант без inherits.source`);

  return {
    kind: "item",
    nameEng: readString(entry, "name", where),
    source,
    page: readOptionalNumber(inherits, "page", where),
    edition: findEditionBySource(source),
    raw: entry,
    container: "magicvariant",
    rarity: readOptionalString(inherits, "rarity", where),
    requiresAttunement: inherits.reqAttune !== undefined && inherits.reqAttune !== false,
    hasFullText: hasNonEmptyEntries(inherits.entries),
  };
}

function buildFacility(entry: Record<string, unknown>, where: string): SourceFacility {
  const source = readString(entry, "source", where);
  const facilityType = readString(entry, "facilityType", where);
  if (facilityType !== "basic" && facilityType !== "special") {
    throw new Error(`${where}: невідомий facilityType «${facilityType}»`);
  }

  return {
    kind: "facility",
    nameEng: readString(entry, "name", where),
    source,
    page: readOptionalNumber(entry, "page", where),
    edition: findEditionBySource(source),
    raw: entry,
    facilityType,
    level: readOptionalNumber(entry, "level", where),
    space: readStringList(entry, "space", where),
    orders: readStringList(entry, "orders", where),
  };
}

/// Повний статблок — це той, за яким можна грати. `cr` сюди не входить свідомо: у
/// заклинальних статблоків 2024 (`Animated Object`, `Giant Insect`) його немає взагалі.
function hasFullStatblock(entry: Record<string, unknown>): boolean {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  return (
    entry.ac !== undefined &&
    entry.hp !== undefined &&
    entry.speed !== undefined &&
    abilities.every((ability) => typeof entry[ability] === "number")
  );
}

function readChallengeRating(entry: Record<string, unknown>): string | null {
  const value = entry.cr;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value !== null && typeof value === "object" && "cr" in value) {
    const nested = (value as { cr: unknown }).cr;
    return typeof nested === "string" || typeof nested === "number" ? String(nested) : null;
  }
  return null;
}

function hasNonEmptyEntries(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function readBookIndex(directory: string): string[] {
  const path = `${directory}/index.json`;
  const files = readCachedJson(path, (value) => readStringMap(value, path));
  return Object.values(files).map((file) => `${directory}/${file}`);
}

function pickRecords(
  value: unknown,
  containerKey: string,
  where: string
): Record<string, unknown>[] {
  const container = readObject(value, where);
  const records = container[containerKey];

  if (records === undefined) return [];
  if (!Array.isArray(records)) {
    throw new Error(`${where}: поле «${containerKey}» не масив`);
  }

  return records.map((record, index) => readObject(record, `${where} › ${containerKey}[${index}]`));
}

function readObject(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${where}: очікували обʼєкт`);
  }
  return value as Record<string, unknown>;
}

function readStringMap(value: unknown, where: string): Record<string, string> {
  const container = readObject(value, where);
  const broken = Object.entries(container).filter(([, file]) => typeof file !== "string");
  if (broken.length > 0) {
    throw new Error(`${where}: у мапі «книга → файл» не-рядкові значення`);
  }
  return Object.fromEntries(
    Object.entries(container).map(([book, file]) => [book, String(file)])
  );
}

function readString(entry: Record<string, unknown>, field: string, where: string): string {
  const value = entry[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${where}: поле «${field}» має бути непорожнім рядком`);
  }
  return value;
}

function readOptionalString(
  entry: Record<string, unknown>,
  field: string,
  where: string
): string | null {
  const value = entry[field];
  if (value === undefined) return null;
  if (typeof value !== "string") throw new Error(`${where}: поле «${field}» не рядок`);
  return value;
}

function readOptionalNumber(
  entry: Record<string, unknown>,
  field: string,
  where: string
): number | null {
  const value = entry[field];
  if (value === undefined) return null;
  if (typeof value !== "number") throw new Error(`${where}: поле «${field}» не число`);
  return value;
}

function readOptionalObject(
  entry: Record<string, unknown>,
  field: string,
  where: string
): Record<string, unknown> | null {
  const value = entry[field];
  if (value === undefined) return null;
  return readObject(value, `${where} › ${field}`);
}

/// `space` і `orders` у бастіонах — масиви рядків; порожній список і відсутнє поле
/// для нас те саме, а от рядок замість масиву — привід зупинитися.
function readStringList(entry: Record<string, unknown>, field: string, where: string): string[] {
  const value = entry[field];
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: поле «${field}» не масив`);

  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`${where}: «${field}[${index}]» не рядок`);
    }
    return item;
  });
}
