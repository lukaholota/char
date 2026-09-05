import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Копія персонажа й знімок рівня пишуть новий рядок `pers` руками, поле за полем. Кожен раз,
 * коли в таблиці з'являється стовпець, обидва списки мовчки старіють: саме так копія 2024
 * персонажа падала на `ruleset` за замовчуванням і ставала персонажем 2014.
 */
const COPY_SOURCES = [
  {
    file: "src/lib/logic/pers-duplication.ts",
    what: "копія персонажа",
    /// Копія — новий персонаж іншого власника: власний ключ, час, посилання на знімок і токен
    /// доступу не переносяться навмисно.
    skipped: ["persId", "createdAt", "updatedAt", "shareToken", "parentPersId", "snapshotLevel"],
  },
  {
    file: "src/server/db/snapshots.ts",
    what: "знімок рівня",
    skipped: ["persId", "createdAt", "updatedAt", "shareToken", "folderId", "isPinned"],
  },
];

const PRIMITIVE_TYPES = new Set([
  "String",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "Boolean",
  "DateTime",
  "Json",
  "Bytes",
]);

/// Стовпець — це примітив або enum (`ruleset Ruleset`), у тому числі масив enum-ів
/// (`additionalSaveProficiencies Abilities[]`). Поле, чий тип — модель, це звʼязок:
/// одиничний (`class Class`) копіюється через `classId`, списковий — через `createMany`.
function readPersScalarFields(): string[] {
  const schema = fs.readFileSync(path.resolve(process.cwd(), "prisma/schema.prisma"), "utf-8");
  const model = schema.match(/^model Pers \{(.*?)^\}/ms);
  if (!model) throw new Error("Модель Pers не знайдена у schema.prisma");

  const enumNames = new Set([...schema.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((hit) => hit[1]));

  return model[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@") && !line.startsWith("///"))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2 && isColumnType(parts[1], enumNames))
    .map((parts) => parts[0]);
}

function isColumnType(type: string, enumNames: Set<string>): boolean {
  const base = type.replace(/[?[\]]/g, "");
  return PRIMITIVE_TYPES.has(base) || enumNames.has(base);
}

function readWrittenFields(file: string): string[] {
  const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
  const start = source.indexOf("const data = {");
  if (start === -1) throw new Error(`У ${file} немає літерала "const data = {"`);

  let depth = 0;
  let end = start;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  return [...source.slice(start, end).matchAll(/^\s{4,8}([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((hit) => hit[1]);
}

describe("Копія персонажа не губить стовпців таблиці", () => {
  const persFields = readPersScalarFields();

  it("модель Pers прочитана", () => {
    expect(persFields).toContain("ruleset");
    expect(persFields.length).toBeGreaterThan(50);
  });

  it.each(COPY_SOURCES)("$what переносить кожен стовпець", ({ file, skipped }) => {
    const written = new Set(readWrittenFields(file));
    const missing = persFields.filter((field) => !written.has(field) && !skipped.includes(field));

    expect(missing, `${file} не копіює: ${missing.join(", ")}`).toEqual([]);
  });

  it("редакція правил їде з персонажем в обидвох шляхах", () => {
    for (const { file } of COPY_SOURCES) {
      expect(readWrittenFields(file), file).toContain("ruleset");
    }
  });
});
