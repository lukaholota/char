/**
 * Швидкості статблока як числа. Каталог зберігає їх одним рядком — «40 фт., лазіння 30 фт.» —
 * і доки правила шукали в ньому підрядок, «Дух звіра» з трьома взаємовиключними режимами
 * вважався одночасно літаючим і плаваючим (KR24.1).
 *
 * Розбір робиться у скриптах збірки каталогів, не в рантаймі: `creatures*.json` — артефакт
 * збірки, і розбирати той самий рядок на кожен рендер немає причин.
 */

/// Ратифіковані назви режимів руху — `dictionary.json`, `movementModes`. «Копання» не
/// ратифіковане, але один запис каталогу написаний саме так, і читати його треба.
const SPEED_MODE_WORDS: { mode: SpeedMode; words: string[] }[] = [
  { mode: "fly", words: ["політ"] },
  { mode: "swim", words: ["плавання"] },
  { mode: "climb", words: ["лазіння"] },
  { mode: "burrow", words: ["риття", "копання"] },
];

type SpeedMode = "walk" | "fly" | "swim" | "climb" | "burrow";

export type CreatureSpeeds = {
  walkSpeed: number | null;
  flySpeed: number | null;
  swimSpeed: number | null;
  climbSpeed: number | null;
  burrowSpeed: number | null;
  /// Швидкість, яка існує лише за умови: обраний елемент прикликання, подоба перевертня,
  /// «або» між взаємовиключними режимами. Такий режим не кладеться як безумовний узагалі —
  /// каталог радше промовчить, ніж збреше правилам.
  hasConditionalSpeed: boolean;
};

const EMPTY_SPEEDS: CreatureSpeeds = {
  walkSpeed: null,
  flySpeed: null,
  swimSpeed: null,
  climbSpeed: null,
  burrowSpeed: null,
  hasConditionalSpeed: false,
};

type SpeedField = "walkSpeed" | "flySpeed" | "swimSpeed" | "climbSpeed" | "burrowSpeed";

const SPEED_FIELDS: Record<SpeedMode, SpeedField> = {
  walk: "walkSpeed",
  fly: "flySpeed",
  swim: "swimSpeed",
  climb: "climbSpeed",
  burrow: "burrowSpeed",
};

const FEET_VALUE = /(\d+)\s*(?:фт|фут)/;

/// Дужка, яка не звужує швидкість, а лише уточнює її: паріння, ширяння, левітація й приріст
/// від рівня чарунку. Решта дужок без власного числа — умова («тільки Повітряний»,
/// «лише в подобі сови»), і швидкість під нею безумовною не є.
const HARMLESS_NOTES = /паріння|ширяння|левітація|рівень чарунку/i;

export function parseCreatureSpeeds(speed: string): CreatureSpeeds {
  const speeds = { ...EMPTY_SPEEDS };

  for (const segment of splitSpeedSegments(speed)) {
    if (isConditionalSegment(segment)) {
      speeds.hasConditionalSpeed = true;
      continue;
    }

    if (hasVariantNote(segment)) speeds.hasConditionalSpeed = true;

    const read = readSegment(segment);
    if (read) speeds[read.field] = read.value;
  }

  return speeds;
}

/// Рядки, з яких не вийшло взяти ані числа, ані умови. Порожній результат по всьому каталогу —
/// умова приймання KR24.1, тож перевірка живе поруч із розбором, а не в тесті.
export function findUnparsedSpeedSegments(speed: string): string[] {
  return splitSpeedSegments(speed).filter(
    (segment) => !isConditionalSegment(segment) && readSegment(segment) === null
  );
}

/// Одне місце, яке каже, що сегмент дає: розбір і перевірка на нерозібране мусять питати те саме,
/// інакше гейт стереже не той розбір, що працює.
function readSegment(segment: string): { field: SpeedField; value: number } | null {
  const bare = stripQualifiers(segment);
  const mode = findSpeedMode(bare);
  const value = findFeetValue(bare);

  return mode && value !== null ? { field: SPEED_FIELDS[mode], value } : null;
}

/// Кома й крапка з комою розділяють режими, але та сама кома трапляється й усередині дужки
/// («30 фт. під час котіння, 60 фт. з гори»), тому глибина дужок рахується.
function splitSpeedSegments(speed: string): string[] {
  const segments: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of speed ?? "") {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    if (depth === 0 && (char === "," || char === ";")) {
      segments.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  segments.push(current);
  return segments.map((segment) => segment.trim()).filter(Boolean);
}

/// «Лазіння 30 фт. (Наземний) **або** плавання 30 фт. (Водний)» — режими взаємовиключні, тож
/// жоден із них не безумовний. Те саме дає дужка-умова без власного числа.
function isConditionalSegment(segment: string): boolean {
  if (/\bабо\b/i.test(segment)) return true;

  return findQualifiers(segment).some(
    (qualifier) => !HARMLESS_NOTES.test(qualifier) && !FEET_VALUE.test(qualifier)
  );
}

/// «30 фт. (40 фт. у подобі вовка)» — зовнішнє число безумовне, а дужка з власною швидкістю
/// каже, що запис має ще й іншу подобу.
function hasVariantNote(segment: string): boolean {
  return findQualifiers(segment).some(
    (qualifier) => FEET_VALUE.test(qualifier) && !HARMLESS_NOTES.test(qualifier)
  );
}

function findQualifiers(segment: string): string[] {
  return [...segment.matchAll(/\(([^()]*)\)/g)].map((match) => match[1]);
}

function stripQualifiers(segment: string): string {
  return segment.replace(/\([^()]*\)/g, " ");
}

function findFeetValue(text: string): number | null {
  const match = text.match(FEET_VALUE);
  return match ? Number(match[1]) : null;
}

/// Режим стоїть словом на початку сегмента, число — за ним; сегмент, що починається числом, це
/// базова наземна швидкість. Слово шукається вже без дужок — «40 фт. (30 фт. і плавання 30 фт. у
/// гібридній подобі)» це наземні 40, а не 40 плавання. Незнайоме слово попереду дає `null`, і
/// сегмент потрапляє в нерозібрані замість того, щоб мовчки стати наземною швидкістю.
function findSpeedMode(bare: string): SpeedMode | null {
  const lowered = bare.trim().toLowerCase();
  const named = SPEED_MODE_WORDS.find((entry) => entry.words.some((word) => lowered.startsWith(word)));
  if (named) return named.mode;

  return /^\d/.test(lowered) ? "walk" : null;
}
