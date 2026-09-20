import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/// `main` в `App.tsx` — колонка з `items-center`, тож дочірній блок сторінки без `w-full` бере ширину
/// за вмістом. Заголовок із `truncate` не переноситься, і сторінка з довгою назвою ставала ширшою
/// за телефон: «Чудовий маєток Морденкайнена» — 531 px на 390.

const APP_DIR = "src/app";

function collectPageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectPageFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

function findDefaultExportRootClassName(source: string): string | null {
  const body = source.slice(source.indexOf("export default"));
  const root = body.match(/return \(\s*<div className="([^"]*)"/);
  return root ? root[1] : null;
}

function collectFullScreenPageRoots(): { file: string; className: string }[] {
  return collectPageFiles(APP_DIR)
    .map((file) => ({ file, className: findDefaultExportRootClassName(readFileSync(file, "utf8")) }))
    .filter((page): page is { file: string; className: string } =>
      page.className !== null && page.className.split(/\s+/).includes("min-h-screen")
    );
}

describe("корінь сторінки на всю висоту займає всю ширину оболонки", () => {
  it("знаходить сторінки деталей каталогів", () => {
    expect(collectFullScreenPageRoots().length).toBeGreaterThanOrEqual(16);
  });

  it("кожен такий корінь несе w-full", () => {
    const narrowRoots = collectFullScreenPageRoots()
      .filter((page) => !page.className.split(/\s+/).includes("w-full"))
      .map((page) => page.file);

    expect(narrowRoots).toEqual([]);
  });
});
