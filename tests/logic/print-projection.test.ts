import { describe, expect, it } from "vitest";

import {
  preparePrintableMarkdown,
  renderPrintableMarkdown,
} from "@/server/pdf/printProjection";

describe("print projection", () => {
  it("removes every glossary payload but keeps the Ukrainian terms", () => {
    expect(
      preparePrintableMarkdown("Променева{{radiant}} й силова{{force}} шкода")
    ).toBe("Променева й силова шкода");
  });

  it("renders markdown after applying the print projection", async () => {
    const html = await renderPrintableMarkdown("***Атака{{Attack}}.*** Текст");

    expect(html).toContain("<em><strong>Атака.</strong></em>");
    expect(html).not.toContain("Attack");
    expect(html).not.toContain("{{");
  });
});
