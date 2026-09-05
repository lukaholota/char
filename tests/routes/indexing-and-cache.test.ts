import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { IMAGE_OPTIMIZER_CACHE_TTL, buildStaticAssetHeaders } from "@/lib/assets/cache-policy";

const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
const NEXT_DEFAULT_IMAGE_TTL = 60 * 60 * 4;

// next.config.ts тут не імпортується: `withSentryConfig` розкручується ~15 секунд і віддає конфіг
// у формі, що залежить від завантажувача. Тому значення перевіряються в модулі політики, а те, що
// конфіг її справді підключає, — за текстом, як це вже робить no-ai-mode.test.ts.
function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function collectAppSources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectAppSources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function findCacheControl(source: string): string {
  const rule = buildStaticAssetHeaders().find((entry) => entry.source === source);
  const value = rule?.headers.find((header) => header.key === "Cache-Control")?.value;
  if (!value) throw new Error(`немає Cache-Control для ${source}`);
  return value;
}

function readMaxAge(cacheControl: string): number {
  return Number(cacheControl.match(/max-age=(\d+)/)?.[1] ?? 0);
}

describe("Р30 — статика кешується, а не перепитується щоразу", () => {
  it("ілюстрації з public/ живуть у кеші щонайменше тиждень", () => {
    const cacheControl = findCacheControl("/images/:path*");

    expect(cacheControl).toContain("public");
    expect(readMaxAge(cacheControl)).toBeGreaterThanOrEqual(WEEK_IN_SECONDS);
  });

  it("шрифти віддаються як незмінні", () => {
    expect(findCacheControl("/fonts/:path*")).toContain("immutable");
  });

  it("оптимізатор зображень тримає файл довше за свої дефолтні чотири години", () => {
    expect(IMAGE_OPTIMIZER_CACHE_TTL).toBeGreaterThan(NEXT_DEFAULT_IMAGE_TTL);
  });

  it("next.config справді підключає політику, а не оголошує її повз", () => {
    const config = readSource("next.config.ts");

    expect(config).toContain("buildStaticAssetHeaders");
    expect(config).toContain("minimumCacheTTL: IMAGE_OPTIMIZER_CACHE_TTL");
  });
});

describe("Р30 — сайт не потрапляє в пошуковий індекс", () => {
  it("коренева метадата каже noindex усьому сайту", () => {
    expect(readSource("src/app/layout.tsx")).toMatch(/robots:\s*\{[^}]*index:\s*false/);
  });

  it("жодна сторінка не вмикає індексацію назад", () => {
    const offenders = collectAppSources(path.join(process.cwd(), "src/app"))
      .filter((file) => /robots:\s*\{[^}]*index:\s*true/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("краулеру не забороняють обхід, інакше він не побачить noindex", () => {
    const rules = Array.isArray(robots().rules) ? robots().rules : [robots().rules];

    for (const rule of rules as Array<{ allow?: unknown; disallow?: unknown }>) {
      expect(rule.disallow ?? []).toEqual([]);
      expect(rule.allow).toBe("/");
    }
  });
});
