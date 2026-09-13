/// Розкладач розмітки 5etools: `{@damage 1d10}`, `{@spell fireball|XPHB}`, `{@atk mw}` тощо.
/// Правила зняті з `js/render.js` тієї самої пінутої ревізії дзеркала (`Renderer.stripTags`
/// і таблиця `Renderer.tag.*`), а не з памʼяті. Невідомий тег — помилка, бо саме мовчазне
/// викидання тегів і є тим місцем, де тихо гине зміст.

export type MarkupReferenceKind = keyof typeof ENTITY_TAGS;

export type MarkupReference = {
  kind: MarkupReferenceKind;
  nameEng: string;
  source: string;
  /// Нормалізований ключ для машинного звʼязку: `SPELLS.eng_name` у dictionary.json,
  /// `nameEng` у маніфестах бестіарію та предметів.
  key: string;
};

export type DecomposedMarkup = {
  text: string;
  references: MarkupReference[];
};

/// Теги, що іменують сутність, яку ми справді імпортуємо. Кожен дає `MarkupReference`.
/// `defaultSource` — з `Renderer.tag.*`; без нього `{@spell fireball}` не відрізнити від
/// `{@spell fireball|XPHB}`, а редакцію ми беремо саме за джерелом.
const ENTITY_TAGS = {
  action: "PHB",
  /// `Renderer.Tag.TagClass` — `_TagPipedDisplayTextThird`, `defaultSource = SRC_PHB`.
  class: "PHB",
  condition: "PHB",
  creature: "MM",
  disease: "DMG",
  feat: "PHB",
  hazard: "DMG",
  item: "DMG",
  itemProperty: "PHB",
  /// `Renderer.Tag.TagItemMastery` — `_TagPipedDisplayTextThird`, `defaultSource = SRC_XPHB`.
  itemMastery: "XPHB",
  language: "PHB",
  /// `Renderer.Tag.TagObject` — `_TagPipedDisplayTextThird`, `defaultSource = SRC_DMG`.
  object: "DMG",
  race: "PHB",
  reward: "DMG",
  sense: "PHB",
  skill: "PHB",
  spell: "PHB",
  status: "PHB",
  /// `Renderer.Tag.TagTrap` — `_TagPipedDisplayTextThird`, `defaultSource = SRC_DMG`.
  trap: "DMG",
  variantrule: "DMG",
} as const;

/// Теги, від яких лишається тільки видимий текст: посилання на книги, таблиці, оформлення.
/// Число — індекс частини з текстом показу; частина 0 — запасний варіант.
const DISPLAY_ONLY_TAGS: Record<string, number> = {
  adventure: 0,
  b: 0,
  /// KR33.5: `Renderer.Tag.TagBackground` і `TagOptfeature` — `_TagPipedDisplayTextThird`.
  background: 2,
  /// `Renderer.Tag.TagBoldLong` — той самий `_TagTextStyle`, що й `{@b}`.
  bold: 0,
  book: 0,
  card: 3,
  classFeature: 5,
  color: 0,
  deck: 2,
  deity: 3,
  /// `Renderer.Tag.TagFacility`, `TagVehicle`, `TagVehupgrade` — `_TagPipedDisplayTextThird`.
  /// Файли з ними (book-xdmg, variantrules) лежали в замку раніше, але звіт покриття з того
  /// часу не перезбирався, тож теги ніхто не розкладав.
  facility: 2,
  filter: 0,
  footnote: 0,
  i: 0,
  italic: 0,
  link: 0,
  note: 0,
  optfeature: 2,
  quickref: 4,
  /// `Renderer.Tag.TagStrikethroughShort` — `_TagTextStyle`, той самий шлях показу, що `{@b}`/`{@i}`.
  s: 0,
  table: 2,
  /// KR33.5: `Renderer.Tag.TagSubclass` — `_TagPipedDisplayTextFifth`, `TagSubclassFeature` —
  /// `_TagPipedDisplayTextEight`, `TagTip` — `_TagTextStyle`, як `{@b}`.
  subclass: 4,
  subclassFeature: 7,
  tip: 0,
  vehicle: 2,
  vehupgrade: 2,
  /// `Renderer.Tag.Tag5etoolsImg` — `_TagPipedNoDisplayText`, той самий шлях показу, що `{@book}`.
  "5etoolsImg": 0,
  /// `Renderer.Tag.Tag5etools` — той самий `_TagPipedNoDisplayText`: посилання на сторінку
  /// сайту, показується перша частина («{@5etools sample backgrounds|backgrounds.html}»).
  "5etools": 0,
};

const ENTITY_DISPLAY_INDEX = 2;
const ENTITY_SOURCE_INDEX = 1;

const ABILITY_NAMES: Record<string, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const ORDINAL_NAMES = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
];

export const KNOWN_MARKUP_TAGS: readonly string[] = [
  ...Object.keys(ENTITY_TAGS),
  ...Object.keys(DISPLAY_ONLY_TAGS),
  "actResponse",
  "actSave",
  "actSaveFail",
  "actSaveFailBy",
  "actSaveSuccess",
  "actSaveSuccessOrFail",
  "actTrigger",
  "atk",
  "atkr",
  "chance",
  "d20",
  "damage",
  "dc",
  "dcYourSpellSave",
  "dice",
  "h",
  "hit",
  "hitYourSpellAttack",
  "hom",
  "recharge",
  "scaledamage",
  "scaledice",
  "skillCheck",
].sort();

export function decomposeMarkup(raw: string, context = ""): DecomposedMarkup {
  const references: MarkupReference[] = [];
  const text = renderChunks(raw, references, context);
  return { text, references };
}

export function stripMarkup(raw: string, context = ""): string {
  return decomposeMarkup(raw, context).text;
}

/// Ключ для звʼязку з нашими даними: без регістру, без 5etools-уточнення в дужках
/// (`Emanation [Area of Effect]`), з нормалізованими апострофами й пробілами.
export function findReferenceKey(nameEng: string): string {
  return nameEng
    .replace(/\s*\[[^\]]*\]\s*$/, "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function renderChunks(raw: string, references: MarkupReference[], context: string): string {
  return splitIntoChunks(raw)
    .map((chunk) =>
      isTagChunk(chunk) ? renderTagChunk(chunk, references, context) : chunk
    )
    .join("");
}

function renderTagChunk(chunk: string, references: MarkupReference[], context: string): string {
  const { tag, body } = readTag(chunk, context);
  const parts = splitByPipe(body);

  collectReference(tag, parts, references);

  return renderChunks(renderTag(tag, body, parts, context), references, context);
}

function renderTag(tag: string, body: string, parts: string[], context: string): string {
  if (tag in ENTITY_TAGS) return pickDisplayPart(parts, ENTITY_DISPLAY_INDEX);

  const displayIndex = DISPLAY_ONLY_TAGS[tag];
  if (displayIndex !== undefined) return pickDisplayPart(parts, displayIndex);

  const computed = renderComputedTag(tag, body, parts);
  if (computed !== null) return computed;

  throw new Error(
    `Невідомий тег розмітки {@${tag}}${context ? ` у ${context}` : ""}. ` +
      "Розкладач зупиняється: мовчки викинути тег означає тихо втратити зміст. " +
      "Додайте правило в scripts/5etools/markup.ts, звіривши його з js/render.js тієї самої ревізії."
  );
}

function renderComputedTag(tag: string, body: string, parts: string[]): string | null {
  switch (tag) {
    case "damage":
    case "dice":
      return parts[1] || parts[0].replace(/;/g, "/");
    case "hit":
    case "d20":
      return parts[1] || formatSignedBonus(parts[0]);
    case "skillCheck":
      return parts[1] || formatSignedBonus(readSkillBonus(parts[0]));
    case "dc":
      return `DC ${parts[1] || parts[0]}`;
    case "dcYourSpellSave":
      return parts[0] || "your spell save DC";
    case "hitYourSpellAttack":
      return parts[0] || "your spell attack modifier";
    case "chance":
      return parts[1] || `${parts[0]} percent`;
    case "recharge":
      return formatRecharge(parts[0]);
    case "scaledamage":
    case "scaledice":
      return parts[4] || parts[2];
    case "h":
      return "Hit: ";
    case "hom":
      return "Hit or Miss: ";
    case "atk":
      return expandAttackTag(body, false);
    case "atkr":
      return expandAttackTag(body, true);
    case "actSave":
      return `${readAbilityName(body)} Saving Throw:`;
    case "actSaveSuccess":
      return "Success:";
    case "actSaveFail":
      return parts[0] ? `${readOrdinalName(parts[0])} Failure:` : "Failure:";
    case "actSaveFailBy":
      return `Failure by ${parts[0]} or More:`;
    case "actSaveSuccessOrFail":
      return "Failure or Success:";
    case "actTrigger":
      return "Trigger:";
    case "actResponse":
      return body.includes("d") ? "Response—" : "Response:";
    default:
      return null;
  }
}

function collectReference(tag: string, parts: string[], references: MarkupReference[]): void {
  if (!(tag in ENTITY_TAGS)) return;

  const kind = tag as MarkupReferenceKind;
  const nameEng = parts[0].trim();

  references.push({
    kind,
    nameEng,
    source: parts[ENTITY_SOURCE_INDEX]?.trim() || ENTITY_TAGS[kind],
    key: findReferenceKey(nameEng),
  });
}

/// 5etools показує порожній рядок, якщо частина показу порожня (`{@item longsword|phb|}`).
/// Ми натомість відкочуємося на назву — порожнє місце в тексті прочитати неможливо.
function pickDisplayPart(parts: string[], displayIndex: number): string {
  const chosen = parts.length > displayIndex ? parts[displayIndex] : "";
  return chosen.trim() === "" ? parts[0] : chosen;
}

function formatSignedBonus(value: string): string {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  return `${parsed >= 0 ? "+" : ""}${parsed}`;
}

function readSkillBonus(skillAndBonus: string): string {
  const pieces = skillAndBonus.split(" ").filter((piece) => piece.trim() !== "");
  return pieces.slice(1).join(" ");
}

function formatRecharge(value: string): string {
  const threshold = Number(value || 6);
  if (Number.isNaN(threshold)) return "(Recharge ?)";
  return `(Recharge ${threshold}${threshold < 6 ? "–6" : ""})`;
}

function expandAttackTag(body: string, isRoll: boolean): string {
  const groups = body
    .toLowerCase()
    .split(",")
    .map((group) => group.trim())
    .filter((group) => group !== "")
    .map((group) => group.split(""));

  dropRepeatedFlags(groups);

  const rendered = groups.map(describeAttackGroup).filter((piece) => piece !== "");
  return `${rendered.join(" or ")} Attack${isRoll ? " Roll" : ""}:`;
}

/// `{@atk ms,rs}` має читатися «Melee or Ranged Spell Attack», а не «Melee Spell or Ranged
/// Spell Attack»: спільні позначки лишаються в останній групі. Так само робить render.js.
function dropRepeatedFlags(groups: string[][]): void {
  if (groups.length < 2) return;

  const seen = new Set(groups[groups.length - 1]);
  for (let index = groups.length - 2; index >= 0; index -= 1) {
    groups[index] = groups[index].filter((flag) => {
      const isNew = !seen.has(flag);
      seen.add(flag);
      return isNew;
    });
  }
}

function describeAttackGroup(flags: string[]): string {
  const range = flags.includes("m")
    ? "Melee"
    : flags.includes("r")
      ? "Ranged"
      : flags.includes("g")
        ? "Magical"
        : flags.includes("a")
          ? "Area"
          : "";
  const method = flags.includes("w")
    ? "Weapon"
    : flags.includes("s")
      ? "Spell"
      : flags.includes("p")
        ? "Power"
        : "";

  return [range, method].filter((piece) => piece !== "").join(" ");
}

function readAbilityName(abbreviation: string): string {
  const name = ABILITY_NAMES[abbreviation.trim().toLowerCase()];
  if (name) return name;
  throw new Error(`Невідома характеристика в {@actSave ${abbreviation}}`);
}

function readOrdinalName(ordinal: string): string {
  const name = ORDINAL_NAMES[Number(ordinal) - 1];
  if (name) return name;
  throw new Error(`Невідомий порядковий номер у {@actSaveFail ${ordinal}}`);
}

function readTag(chunk: string, context: string): { tag: string; body: string } {
  const inner = chunk.slice(2, -1);
  const firstSpace = inner.indexOf(" ");
  const tag = firstSpace === -1 ? inner : inner.slice(0, firstSpace);
  const body = firstSpace === -1 ? "" : inner.slice(firstSpace + 1);

  if (tag === "") {
    throw new Error(`Порожній тег розмітки${context ? ` у ${context}` : ""}: ${chunk}`);
  }

  return { tag, body };
}

function isTagChunk(chunk: string): boolean {
  return chunk.startsWith("{@") && chunk.endsWith("}");
}

function splitIntoChunks(raw: string): string[] {
  const chunks: string[] = [];
  let current = "";
  let depth = 0;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (char === "{" && raw[index + 1] === "@") {
      if (depth === 0 && current !== "") {
        chunks.push(current);
        current = "";
      }
      current += "{@";
      depth += 1;
      index += 1;
      continue;
    }

    if (char === "}" && depth > 0) {
      current += "}";
      depth -= 1;
      if (depth === 0) {
        chunks.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current !== "") chunks.push(current);
  return chunks;
}

function splitByPipe(body: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of body) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (char === "|" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  parts.push(current);
  return parts;
}
