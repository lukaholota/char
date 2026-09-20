import { describe, expect, it } from "vitest";

import {
  preparePrintableMarkdown,
  renderPrintableMarkdown,
  renderPrintableUserText,
} from "@/server/pdf/printProjection";

describe("print projection", () => {
  it("renders player-written text as text, never as markup", async () => {
    const html = await renderPrintableUserText('Опис <img src=x onerror="fetch(1)"> і **жирне**');
    expect(html).not.toContain("<img");
    expect(html).toContain("&#x3C;img");
    expect(html).toContain("<strong>жирне</strong>");
  });

  it("removes every glossary payload but keeps the Ukrainian terms", () => {
    expect(
      preparePrintableMarkdown("Променева{{radiant}} й силова{{force}} шкода")
    ).toBe("Променева й силова шкода");
  });

  it("prints link text without the link — paper has nothing to click", async () => {
    const html = await renderPrintableMarkdown(
      'Вовк має <a href="/rules/conditions#condition-advantage">Перевагу</a> і [повалену](/rules/conditions#prone) ціль'
    );

    expect(html).toContain("Вовк має Перевагу і повалену ціль");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("/rules/");
  });

  it("renders markdown after applying the print projection", async () => {
    const html = await renderPrintableMarkdown("***Атака{{Attack}}.*** Текст");

    expect(html).toContain("<em><strong>Атака.</strong></em>");
    expect(html).not.toContain("Attack");
    expect(html).not.toContain("{{");
  });
});
