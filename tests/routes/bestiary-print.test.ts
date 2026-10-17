import { describe, expect, it, vi } from "vitest";

const generateCreaturesPdfBytes = vi.hoisted(() =>
  vi.fn(async () => new Uint8Array([37, 80, 68, 70]))
);

vi.mock("@/server/pdf/creaturesPdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/pdf/creaturesPdf")>()),
  generateCreaturesPdfBytes,
}));

import { GET } from "@/app/api/bestiary/print/route";
import { PdfBusyError } from "@/server/pdf/pdfJobGate";

describe("GET /api/bestiary/print", () => {
  it("повертає один PDF для валідного непорожнього вибору", async () => {
    const response = await GET(
      new Request("http://localhost/api/bestiary/print?ruleset=RULES_2014&keys=wolf")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(generateCreaturesPdfBytes).toHaveBeenCalledOnce();
  });

  it("повертає 400 для порожнього вибору", async () => {
    const response = await GET(
      new Request("http://localhost/api/bestiary/print?ruleset=RULES_2014")
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Оберіть хоча б одну істоту" });
  });

  it("повертає 400 для невідомої редакції", async () => {
    const response = await GET(
      new Request("http://localhost/api/bestiary/print?ruleset=UNKNOWN&keys=wolf")
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Невідома редакція бестіарію" });
  });

  it("повертає 404 для відсутньої істоти до запуску PDF renderer", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/bestiary/print?ruleset=RULES_2014&keys=definitely-not-a-creature"
      )
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Істоту не знайдено: definitely-not-a-creature",
    });
  });

  it("повертає 503 з поясненням, коли генератор PDF зайнятий", async () => {
    generateCreaturesPdfBytes.mockRejectedValueOnce(new PdfBusyError());
    const response = await GET(new Request("http://localhost/api/bestiary/print?ruleset=RULES_2014&keys=wolf"));

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const page = await response.text();
    expect(page).toContain(new PdfBusyError().message);
    expect(page).toContain('href="/api/bestiary/print?ruleset=RULES_2014&#38;keys=wolf"');
    expect(page).toContain('href="/bestiary"');
  });

  it("повертає сторінку з виходом до бестіарію, коли PDF упав", async () => {
    generateCreaturesPdfBytes.mockRejectedValueOnce(new Error("chromium crashed"));
    const response = await GET(new Request("http://localhost/api/bestiary/print?ruleset=RULES_2014&keys=wolf"));

    expect(response.status).toBe(500);
    const page = await response.text();
    expect(page).toContain("Не вдалося згенерувати PDF");
    expect(page).not.toContain("chromium crashed");
    expect(page).toContain('href="/bestiary"');
  });
});
