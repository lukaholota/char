import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  addNoAiPrefix,
  buildHrefForNoAiMode,
  hasNoAiPrefix,
  stripNoAiPrefix,
} from "@/lib/no-ai/no-ai-route";
import { findImageProvenance, findVisibleImageSrc, isAiGeneratedImage } from "@/lib/assets/asset-provenance";
import { collectHomeCardRows, collectHomeCategories } from "@/components/home/homeCategories";

const srcDir = path.resolve(process.cwd(), "src");
const appDir = path.join(srcDir, "app");

function collectSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function toRepoPath(absolute: string): string {
  return path.relative(process.cwd(), absolute);
}

describe("Режим без ШІ — адреса", () => {
  it("розпізнає і знімає сегмент", () => {
    expect(hasNoAiPrefix("/no-ai")).toBe(true);
    expect(hasNoAiPrefix("/no-ai/2024/spells")).toBe(true);
    expect(hasNoAiPrefix("/no-air/spells")).toBe(false);
    expect(stripNoAiPrefix("/no-ai/2024/spells")).toBe("/2024/spells");
    expect(stripNoAiPrefix("/no-ai")).toBe("/");
    expect(stripNoAiPrefix("/2024/spells")).toBe("/2024/spells");
  });

  it("додає сегмент один раз", () => {
    expect(addNoAiPrefix("/")).toBe("/no-ai");
    expect(addNoAiPrefix("/spells")).toBe("/no-ai/spells");
    expect(addNoAiPrefix("/no-ai/spells")).toBe("/no-ai/spells");
  });

  it("переносить режим у внутрішнє посилання, зберігаючи запит і якір", () => {
    expect(buildHrefForNoAiMode("/2024/spells?src=PHB#fireball", true)).toBe(
      "/no-ai/2024/spells?src=PHB#fireball"
    );
    expect(buildHrefForNoAiMode("/no-ai/2024/spells?src=PHB", false)).toBe("/2024/spells?src=PHB");
  });

  it("не чіпає зовнішні адреси, ассети й службові маршрути", () => {
    for (const href of [
      "https://dnd.wizards.com",
      "//cdn.example.com/a",
      "#anchor",
      "/api/pers",
      "/images/categories/spells.webp",
      "/_next/static/chunk.js",
    ]) {
      expect(buildHrefForNoAiMode(href, true)).toBe(href);
    }
  });
});

describe("Режим без ШІ — походження зображень", () => {
  it("фільтрує лише згенероване", () => {
    expect(findImageProvenance("/images/categories/spells.webp")).toBe("ai");
    expect(findImageProvenance("/images/home/characters.webp")).toBe("drawn");
    expect(findImageProvenance("/images/races/elf.webp")).toBe("ai");
    expect(findImageProvenance("/images/classes/bard.webp")).toBe("ai");
    expect(findImageProvenance("/images/backgrounds/acolyte.webp")).toBe("ai");
    expect(findImageProvenance("/images/creatures/goblin.webp")).toBe("manual");
    expect(findImageProvenance("/images/manual/spells.webp")).toBe("manual");
    expect(findImageProvenance("/images/home-characters.webp")).toBe("drawn");
    expect(findImageProvenance("/images/logo.png")).toBe("chrome");
    expect(findImageProvenance(null)).toBe("chrome");
  });

  it("ілюстрації з мануалів і намальоване лишаються видимими", () => {
    expect(isAiGeneratedImage("/images/creatures/goblin.webp")).toBe(false);
    expect(isAiGeneratedImage("/images/home-characters.webp")).toBe(false);
    expect(isAiGeneratedImage("/images/categories/rules.webp")).toBe(true);
  });

  /// Owner's call 2026-08-28 — the two home covers stay on screen in no-AI mode.
  it("великі обкладинки головної не ховаються", () => {
    expect(isAiGeneratedImage("/images/home/characters.webp")).toBe(false);
    expect(isAiGeneratedImage("/images/home/spells.webp")).toBe(false);
    expect(isAiGeneratedImage("/images/home/bestiary.webp"), "обкладинка бестіарію — кроп плитки").toBe(true);
  });
});

/// Власник, 2026-09-02: обкладинка «Заклинань» у режимі без ШІ — не порожнеча й не та сама
/// згенерована картинка, а ілюстрація з мануалу WotC.
describe("Режим без ШІ — заміна на ілюстрацію з мануалу", () => {
  const generated = "/images/categories/spells.webp";
  const fromManual = "/images/manual/spells.webp";

  it("у звичайному режимі малює згенероване, навіть коли заміна є", () => {
    expect(findVisibleImageSrc({ src: generated, noAiSrc: fromManual, isNoAiMode: false })).toBe(generated);
  });

  it("у режимі без ШІ підставляє ілюстрацію з мануалу", () => {
    expect(findVisibleImageSrc({ src: generated, noAiSrc: fromManual, isNoAiMode: true })).toBe(fromManual);
  });

  it("без заміни поводиться як раніше — ховає згенероване, лишає намальоване", () => {
    expect(findVisibleImageSrc({ src: generated, isNoAiMode: true })).toBeNull();
    expect(findVisibleImageSrc({ src: "/images/home/spells.webp", isNoAiMode: true })).toBe("/images/home/spells.webp");
    expect(findVisibleImageSrc({ src: "/images/creatures/goblin.webp", isNoAiMode: true })).toBe("/images/creatures/goblin.webp");
  });

  it("явне походження перебиває здогад за шляхом", () => {
    expect(findVisibleImageSrc({ src: "/images/home/spells.webp", isNoAiMode: true, provenance: "ai" })).toBeNull();
  });
});

describe("Режим без ШІ — жодного обходу в коді", () => {
  const sourceFiles = collectSourceFiles(srcDir);

  it("посилання йдуть через ModeLink, інакше перший клік викидає з режиму", () => {
    const allowed = ["src/components/no-ai/ModeLink.tsx"];
    const offenders = sourceFiles
      .filter((file) => fs.readFileSync(file, "utf8").includes('from "next/link"'))
      .map(toRepoPath)
      .filter((file) => !allowed.includes(file));

    expect(offenders).toEqual([]);
  });

  it("ілюстрації йдуть через ContentImage, інакше вони невидимі для фільтра", () => {
    const allowed = [
      "src/components/no-ai/ContentImage.tsx",
      "src/lib/components/icons/Logo.tsx",
      "src/components/ui/NavExtraMenu.tsx",
    ];
    const offenders = sourceFiles
      .filter((file) => fs.readFileSync(file, "utf8").includes('from "next/image"'))
      .map(toRepoPath)
      .filter((file) => !allowed.includes(file));

    expect(offenders).toEqual([]);
  });
});

describe("Головна — картки категорій", () => {
  it("кожна картка веде в наявний маршрут обох редакцій", () => {
    for (const edition of ["2014", "2024"] as const) {
      for (const category of collectHomeCategories(edition)) {
        const routeDir = path.join(appDir, category.href.replace(/^\//, ""));
        expect(
          fs.existsSync(path.join(routeDir, "page.tsx")),
          `${category.title} (${edition}) веде в ${category.href}, а сторінки немає`
        ).toBe(true);
      }
    }
  });

  it("обкладинка кожної картки лежить на диску", () => {
    const missing = new Set<string>();
    for (const edition of ["2014", "2024"] as const) {
      const { heroes, tiles } = collectHomeCardRows(edition);
      for (const card of [...heroes, ...tiles]) {
        for (const src of [card.imageSrc, card.category.noAiImageSrc]) {
          if (!src) continue;
          const file = path.resolve(process.cwd(), "public", src.replace(/^\//, ""));
          if (!fs.existsSync(file)) missing.add(src);
        }
      }
    }

    expect([...missing]).toEqual([]);
  });
});
