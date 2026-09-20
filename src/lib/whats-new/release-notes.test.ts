import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CURRENT_RELEASE_SLIDES, isWhatsNewSurface } from "./release-notes";

describe("де показується «що нового»", () => {
  it("головна обох редакцій — так", () => {
    expect(isWhatsNewSurface("/")).toBe(true);
    expect(isWhatsNewSurface("/2024")).toBe(true);
  });

  it("список персонажів і лист — так", () => {
    expect(isWhatsNewSurface("/char/home")).toBe(true);
    expect(isWhatsNewSurface("/char/1234")).toBe(true);
    expect(isWhatsNewSurface("/pers/home")).toBe(true);
  });

  it("конструктор — ні, бо перебивати створення персонажа гірше, ніж не показати", () => {
    expect(isWhatsNewSurface("/char/create")).toBe(false);
  });

  it("каталог, відкритий із пошуку, — ні", () => {
    expect(isWhatsNewSurface("/spells/1246")).toBe(false);
    expect(isWhatsNewSurface("/2024/bestiary")).toBe(false);
    expect(isWhatsNewSurface("/rules")).toBe(false);
  });
});

describe("слайди релізу", () => {
  it("ключі унікальні", () => {
    const keys = CURRENT_RELEASE_SLIDES.map((slide) => slide.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("кожен слайд має заголовок, текст і картинку", () => {
    for (const slide of CURRENT_RELEASE_SLIDES) {
      expect(slide.title.length).toBeGreaterThan(0);
      expect(slide.lines.length).toBeGreaterThan(0);
      expect(slide.image.startsWith("/images/")).toBe(true);
    }
  });

  it("картинка кожного слайда лежить у public", () => {
    for (const slide of CURRENT_RELEASE_SLIDES) {
      expect(existsSync("public" + slide.image), slide.image).toBe(true);
    }
  });
});
