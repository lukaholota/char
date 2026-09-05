import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { failOnShrunkCatalog } from "../../scripts/lib/fail-on-shrunk-catalog";

/// Кожен каталог у `src/lib/generated/` лежить у `.gitignore` і з git не відновлюється, а
/// `generate:content` висить на `prebuild` і в обох джобах CI. Генератор без нижньої межі тому
/// не «трохи ризикований» — він знищує публічні сторінки на першому ж прогоні проти недосіяної
/// бази. Так каталог предметів уже втратив 225 записів (KR14.1), так `PADDED` втратив сторінку
/// (KR16.5), і так `generate-creatures.ts` мовчки писав порожній масив при збої підключення
/// (STATE.md, дефект №5). Цей тест не дає завести наступний такий генератор.

const SCRIPTS_DIR = join(process.cwd(), "scripts");
const GUARD_CALL = "failOnShrunkCatalog(";

/// Будівники бестіарію не ходять у базу, але пишуть найбільший каталог платформи — саме той,
/// у який колись цілився генератор із семи рядків.
const FILE_DRIVEN_BUILDERS_THAT_MUST_GUARD = ["build-creatures-2014.ts", "build-creatures-2024.ts"];

function readScript(fileName: string): string {
  return readFileSync(join(SCRIPTS_DIR, fileName), "utf-8");
}

function findScriptsWritingGeneratedCatalogs(): string[] {
  return readdirSync(SCRIPTS_DIR)
    .filter((fileName) => fileName.endsWith(".ts"))
    .filter((fileName) => {
      const source = readScript(fileName);
      return source.includes("src/lib/generated/") && source.includes("writeFileSync");
    });
}

function isDatabaseBacked(source: string): boolean {
  return source.includes("PrismaClient");
}

describe("нижня межа каталогу", () => {
  it("падає, коли джерело віддало менше за поріг", () => {
    expect(() => failOnShrunkCatalog("тест", 9, 10)).toThrowError(/9.*10/s);
  });

  it("мовчить на порозі й вище", () => {
    expect(() => failOnShrunkCatalog("тест", 10, 10)).not.toThrow();
    expect(() => failOnShrunkCatalog("тест", 11, 10)).not.toThrow();
  });

  it("несе в тексті помилки, що робити далі", () => {
    expect(() => failOnShrunkCatalog("тест", 0, 1, "Прожени сід.")).toThrowError(/Прожени сід\./);
  });
});

describe("генератори каталогів мають нижню межу", () => {
  const writers = findScriptsWritingGeneratedCatalogs();

  it("генератори взагалі знайдені", () => {
    expect(writers.length).toBeGreaterThan(8);
  });

  it("жоден генератор із бази не пише каталог без порога", () => {
    const unguarded = writers
      .filter((fileName) => isDatabaseBacked(readScript(fileName)))
      .filter((fileName) => !readScript(fileName).includes(GUARD_CALL));

    expect(unguarded).toEqual([]);
  });

  it("будівники бестіарію теж мають поріг", () => {
    const unguarded = FILE_DRIVEN_BUILDERS_THAT_MUST_GUARD.filter(
      (fileName) => !readScript(fileName).includes(GUARD_CALL)
    );

    expect(unguarded).toEqual([]);
  });

  it("жоден скрипт не ковтає збій підключення й не пише після нього", () => {
    const swallowing = writers.filter((fileName) => /catch\s*\([^)]*\)\s*\{\s*console\.warn/.test(readScript(fileName)));

    expect(swallowing).toEqual([]);
  });
});
