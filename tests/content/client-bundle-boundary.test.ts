import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "../../src");

/// Дефект №9 у docs/STATE.md: одного імпорту значення з каталожного модуля досить, щоб у
/// клієнтський бандл поїхав увесь його JSON. `SRD_2024_ATTRIBUTION` з `rules2024Data` привіз на
/// головну 612 КіБ правил заради пʼяти рядків ліцензії; `findSourceLabel` з `bestiaryData` — 4,7 МіБ
/// істот на кожну з 1 490 сторінок бестіарію заради одного підпису; модалки заклинань і предметів
/// шукали запис по id у себе в браузері, тримаючи для цього весь каталог.
///
/// Гейт іде від кожного `"use client"` модуля тим самим графом, яким іде збірка. Каталог у графі —
/// це або справжня потреба (список, який фільтрують у браузері), або помилка. Перше живе в
/// таблиці нижче з причиною; усе інше падає.
const CLIENT_CATALOG_HOLDERS: Record<string, string> = {
  "app/spells/spells-client.tsx": "каталог заклинань фільтрується в браузері",
  "components/armor/ArmorClient.tsx": "каталог обладунків фільтрується в браузері",
  "components/feats/FeatsClient.tsx": "каталог рис фільтрується в браузері",
  "components/infusions/InfusionsClient.tsx": "каталог інфузій фільтрується в браузері",
  "components/invocations/InvocationsClient.tsx": "каталог викликів фільтрується в браузері",
  "components/weapons/WeaponsClient.tsx": "каталог зброї фільтрується в браузері",
  "components/search/OmniSearchPanel.tsx": "омні-індекс; панель вантажиться динамічно з OmniSearchDialog",
};

const HEAVY_CATALOG = /^lib\/generated\/.+\.json$/;

/// Згенеровані таблиці, які не є каталогами: крихітні й потрібні там, де немає ні сервера, ні
/// мережі. Розмір обмежено нижче, щоб сюди не проїхав каталог під виглядом таблиці.
const CLIENT_SAFE_TABLES: Record<string, string> = {
  "lib/generated/wild-magic-surge-table.json": "к100 Сплеску дикої магії для екрана помилки — error boundary не має на кого покластися",
  "lib/generated/spell-icon-sprite.json": "позиції іконок у спрайті — іконку малює браузер, сервер тут ні до чого",
};
const CLIENT_SAFE_TABLE_LIMIT_BYTES = 16 * 1024;

function isHeavyCatalog(name: string): boolean {
  return HEAVY_CATALOG.test(name) && !(name in CLIENT_SAFE_TABLES);
}

const IMPORT_CLAUSE = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)([^;]*?)from\s*["']([^"']+)["']/g;
const BARE_IMPORT = /(?:^|\n)\s*import\s*["']([^"']+)["']/g;

/// Тільки те, що доживає до бандла: `import type` і суто типові фігурні дужки збірка стирає, тож
/// `import type { CreatureData } from "@/lib/bestiaryData"` каталогу не тягне — і ребром не є.
function findValueSpecifiers(source: string): string[] {
  const specifiers: string[] = [];

  IMPORT_CLAUSE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_CLAUSE.exec(source))) {
    if (!isTypeOnlyClause(match[1])) specifiers.push(match[2]);
  }

  BARE_IMPORT.lastIndex = 0;
  while ((match = BARE_IMPORT.exec(source))) specifiers.push(match[1]);

  return specifiers;
}

function isTypeOnlyClause(clause: string): boolean {
  if (/\*\s+as/.test(clause)) return false;
  const named = clause.match(/\{([\s\S]*)\}/);
  if (!named) return false;
  if (/^\s*[\w$]+\s*,/.test(clause)) return false;
  return named[1]
    .split(",")
    .every((specifier) => !specifier.trim() || /^type\s/.test(specifier.trim()));
}

function isFile(candidate: string): boolean {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

const resolvedSpecifiers = new Map<string, string | null>();

function resolveInsideSrc(specifier: string, fromFile: string): string | null {
  const key = `${dirname(fromFile)}\u0000${specifier}`;
  const cached = resolvedSpecifiers.get(key);
  if (cached !== undefined) return cached;

  const resolved = resolveFresh(specifier, fromFile);
  resolvedSpecifiers.set(key, resolved);
  return resolved;
}

function resolveFresh(specifier: string, fromFile: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(fromFile), specifier)
      : null;
  if (!base) return null;

  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (isFile(candidate)) return candidate;
  }
  return null;
}

/// Модуль із `"use server"` на клієнт не їде — збірка лишає замість нього RPC-заглушку. Тож
/// серверна дія, яка читає каталог, бандла не важчає, і граф на ній обривається.
function isServerAction(source: string): boolean {
  return /^\s*["']use server["']/.test(source);
}

/// Гейт обходить граф від кожного клієнтського модуля, тож той самий файл трапляється сотні разів.
/// Без кешу це десятки секунд читання дерева — і широке вікно, щоб паралельна робота змінила файл
/// посеред прогону.
const parsedFiles = new Map<string, { serverAction: boolean; imports: string[] }>();

function readParsed(file: string): { serverAction: boolean; imports: string[] } {
  const cached = parsedFiles.get(file);
  if (cached) return cached;

  const source = readFileSync(file, "utf8");
  const parsed = { serverAction: isServerAction(source), imports: findValueSpecifiers(source) };
  parsedFiles.set(file, parsed);
  return parsed;
}

function collectReachableFiles(entry: string): Map<string, string> {
  const reachedVia = new Map<string, string>([[entry, entry]]);
  const queue = [entry];

  while (queue.length) {
    const file = queue.shift()!;
    if (file.endsWith(".json")) continue;

    const parsed = readParsed(file);
    if (file !== entry && parsed.serverAction) continue;

    for (const specifier of parsed.imports) {
      const resolved = resolveInsideSrc(specifier, file);
      if (!resolved || reachedVia.has(resolved)) continue;
      reachedVia.set(resolved, file);
      queue.push(resolved);
    }
  }
  return reachedVia;
}

function describeImportChain(reachedVia: Map<string, string>, target: string): string {
  const chain: string[] = [];
  let current: string | undefined = target;
  while (current && chain.length < 20) {
    chain.unshift(relative(SRC, current));
    const parent: string | undefined = reachedVia.get(current);
    if (!parent || parent === current) break;
    current = parent;
  }
  return chain.join(" → ");
}

function findClientModules(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) findClientModules(path, found);
    else if (/\.tsx?$/.test(entry.name) && /^\s*["']use client["']/.test(readFileSync(path, "utf8")))
      found.push(path);
  }
  return found;
}

describe("KR20.6 — клієнтські модулі не тягнуть каталоги в бандл", () => {
  const clientModules = findClientModules(SRC);

  it("їх узагалі видно — інакше гейт зелений через порожній список", () => {
    expect(clientModules.length).toBeGreaterThan(100);
  });

  it("жоден не дістає каталогу, крім перелічених у CLIENT_CATALOG_HOLDERS", () => {
    const offenders: string[] = [];

    for (const clientModule of clientModules) {
      const name = relative(SRC, clientModule);
      if (name in CLIENT_CATALOG_HOLDERS) continue;

      const reachedVia = collectReachableFiles(clientModule);
      for (const file of reachedVia.keys()) {
        if (isHeavyCatalog(relative(SRC, file))) offenders.push(describeImportChain(reachedVia, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it("кожен запис CLIENT_CATALOG_HOLDERS ще потрібен", () => {
    const stale = Object.keys(CLIENT_CATALOG_HOLDERS).filter((name) => {
      const reachedVia = collectReachableFiles(join(SRC, name));
      return ![...reachedVia.keys()].some((file) => isHeavyCatalog(relative(SRC, file)));
    });

    expect(stale, "ці вже не тягнуть каталог — прибери з таблиці").toEqual([]);
  });

  it("дозволені таблиці лишаються таблицями, а не каталогами", () => {
    const oversized = Object.keys(CLIENT_SAFE_TABLES).filter(
      (name) => statSync(join(SRC, name)).size > CLIENT_SAFE_TABLE_LIMIT_BYTES,
    );

    expect(oversized, "таблиця виросла до каталогу — прибери з CLIENT_SAFE_TABLES").toEqual([]);
  });
});

/// `@prisma/client` у браузері — це `index-browser.js` цілим разом із рантаймом Prisma (~95 КБ), і
/// одного значення enum-а досить, щоб він поїхав у чанк. Так його привозив `refs/translation.ts`
/// заради `Skills` на кожну сторінку каталогу. Enum-и клієнт бере з `lib/prisma-enums.ts` (KR46.2).
function hasPrismaValueImport(file: string): boolean {
  const parsed = readParsed(file);
  return !parsed.serverAction && parsed.imports.includes("@prisma/client");
}

describe("KR46.2 — клієнтські модулі не тягнуть рушій Prisma", () => {
  it("жоден не дістає імпорту значення з @prisma/client", () => {
    const chains = new Set<string>();

    for (const clientModule of findClientModules(SRC)) {
      const reachedVia = collectReachableFiles(clientModule);
      for (const file of reachedVia.keys()) {
        if (!file.endsWith(".json") && hasPrismaValueImport(file)) chains.add(describeImportChain(reachedVia, file));
      }
    }

    expect([...chains].sort()).toEqual([]);
  });
});

/// Схеми конструктора тягнуть `zod` з усіма мовними локалями — ~375 КБ JS, які телефон розбирав
/// на кожному відкритті листа заради діалогу рис, що відкривається тапом. Діалоги, яким схеми
/// потрібні, лист вантажить через `next/dynamic`, а динамічний `import()` цей граф не проходить.
const SHEET_ENTRIES = [
  "lib/components/characterSheet/CharacterSheet.tsx",
  "lib/components/characterSheet/slides/MainStatsSlide.tsx",
  "lib/components/characterSheet/slides/SkillsSlide.tsx",
  "lib/components/characterSheet/slides/CombatSlide.tsx",
  "lib/components/characterSheet/slides/MagicSlide.tsx",
  "lib/components/characterSheet/slides/FeaturesSlide.tsx",
];

describe("лист персонажа не тягне схем конструктора", () => {
  it.each(SHEET_ENTRIES)("%s не досягає lib/zod/", (entry) => {
    const reachedVia = collectReachableFiles(join(SRC, entry));
    const schemaChains = [...reachedVia.keys()]
      .filter((file) => relative(SRC, file).startsWith("lib/zod/"))
      .map((file) => describeImportChain(reachedVia, file));

    expect(schemaChains).toEqual([]);
  });
});
