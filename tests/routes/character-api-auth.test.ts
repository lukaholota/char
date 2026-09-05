import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const CHARACTER_API_DIRS = ["src/app/api/character", "src/app/api/characters"];

function collectRouteFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

describe("Кожен маршрут API персонажа перевіряє доступ", () => {
  const routeFiles = CHARACTER_API_DIRS.flatMap((dir) =>
    collectRouteFiles(path.resolve(process.cwd(), dir)),
  );

  it("маршрути знайдено", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(2);
  });

  it.each(routeFiles.map((file) => path.relative(process.cwd(), file)))(
    "%s не працює без перевірки сесії",
    (relative) => {
      const source = fs.readFileSync(path.resolve(process.cwd(), relative), "utf-8");
      const guarded =
        source.includes("findCharacterAccessFailure") || source.includes('from "@/lib/auth"');

      expect(guarded, `${relative} читає або пише персонажа без перевірки доступу`).toBe(true);
    },
  );
});
